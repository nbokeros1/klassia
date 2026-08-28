import Anthropic from '@anthropic-ai/sdk'
import mammoth from 'mammoth'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 120
import { getMaxTokens } from '@/lib/ia/get-max-tokens'
import { getFormatSection, PLATEFORME_CONTEXT } from '@/lib/ia/build-system-prompt'
import { construireSectionsSkills } from '@/lib/ia/skills-pedagogiques'
import { DOSSIER_PAR_TYPE_CONTENU } from '@/lib/constants/mapping-dossiers'
import { buildDocumentContext, type DocContextInput } from '@/lib/ia/build-document-context'
import { buildAutoContext, type AutoContextDoc } from '@/lib/ia/build-auto-context'

// ── Types ──────────────────────────────────────────────────────────────────────
interface FichierJoint {
  nom:            string
  type_mime:      string
  contenu_base64: string
}

interface FichierKlassiaRef {
  fichier_id: string
  source:     'klassia'
}

interface FichierIgnore {
  fichier_id: string
  raison:     'indexation_en_attente' | 'extraction_echouee' | 'non_supporte' | 'introuvable'
}

interface FichierUtilise {
  fichier_id: string
  nom:        string
}

// UUID v4 (format standard)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Tag émis en tête du flux pour transmettre les métadonnées documentaires
export const KLASSIA_CTX_TAG = '__KLASSIA_CTX__'

const LESSON_TYPES_ASST = ['plan_lecon', 'lecon_complete', 'fiche_lecon'] as const

// ── Helpers détection type / titre ────────────────────────────────────────────

function detecterTypeContenu(message: string): string {
  // Du plus spécifique au plus général — ordre critique
  if (/plan de leçon|plan détaillé|plan pédago|plan.{0,20}leçon/i.test(message))       return 'plan_lecon'
  // séquence testée avant leçon pour ne pas absorber "séquence de leçons"
  if (/séquence|sequence.{0,15}(leçon|apprentissage|cours|d.apprentissage)/i.test(message)) return 'plan_sequence'
  // corrigé / correction testés avant évaluation
  if (/corrigé|corrige|correction|clé.{0,10}réponse|réponses.{0,10}attendues/i.test(message)) return 'corrige'
  // "quiz" testé avant "évaluation" pour que "quiz diagnostique" reste 'quiz'
  if (/quiz|questionnaire|vrai[- ]faux|qcm/i.test(message))                            return 'quiz'
  // "diagnostique" seul → évaluation (activité diagnostique, test diagnostique)
  if (/évaluation|examen|test sommatif|bilan|diagnostique/i.test(message))             return 'evaluation'
  if (/\bleçon\b|cours sur|enseigner|fiche leçon/i.test(message))                      return 'lecon_complete'
  if (/activité|exercice|atelier|\blab\b/i.test(message))                              return 'activite'
  if (/email|courriel|parent|lettre/i.test(message))                                   return 'email_parents'
  if (/plan annuel|séquences? de l'année/i.test(message))                              return 'plan_annuel'
  if (/curriculum|programme annuel|progression annuelle/i.test(message))               return 'curriculum'
  return 'autre'  // type non reconnu → pas d'auto-sauvegarde (ARCHITECTURE.md §3)
}

function extraireTitre(contenu: string): string {
  const MAX = 72
  const truncate = (t: string) => {
    if (t.length <= MAX) return t
    const cut = t.substring(0, MAX).replace(/\s\S*$/, '').trim()
    return cut + '…'
  }
  const clean = (s: string) => s.replace(/^#+\s*/, '').replace(/[*`_]/g, '').trim()

  // 1. Titre Markdown explicite (# ou ##) — priorité absolue
  const heading = contenu.match(/^#{1,2}\s+(.+)$/m)
  if (heading) return truncate(clean(heading[1]))

  const lines = contenu.split('\n')

  // 2. Ligne contenant un mot-clé pédagogique (sans # mais clairement un titre de document)
  const PEDA = /plan de leçon|plan d['e]|fiche de leçon|leçon \d|séquence|évaluation sommative|quiz|curriculum|plan annuel|activité|atelier/i
  const pedaLine = lines.find(l => {
    const s = l.trim()
    return s.length > 5 && !s.startsWith('|') && PEDA.test(s)
  })
  if (pedaLine) return truncate(clean(pedaLine))

  // 3. Première ligne propre — excluant les phrases d'intro conversationnelles et les emoji
  const CONVERS = /^(je vais|voici|bonjour|bonne question|je veux|je vais cr|cher|chère|salut|super|génial|parfait|excellent|bien sûr|c'est parti|voilà|d'accord|avec plaisir|absolument|pour cette|dans ce|comme tu)/i
  const EMOJI   = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/u
  const cleanLine = lines.find(l => {
    const s = l.trim()
    return s.length > 15
      && !s.startsWith('#')
      && !s.startsWith('|')
      && !CONVERS.test(s)
      && !EMOJI.test(s)
  })
  return cleanLine ? truncate(clean(cleanLine)) : ''
}


export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // ── Auth via getUser (vérifié côté serveur) ───────────────────────────────
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: profil } = await supabase
      .from('utilisateurs')
      .select('id, prenom, nom, province, langue, profil_ia, gabarit_lecon_analyse')
      .eq('user_id', user.id)
      .single()

    if (!profil) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    let body: any
    try { body = await req.json() }
    catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

    const { message, contexte = {}, historique = [], langue: bodyLangue, fichiers_joints, type_contenu: typeContenuExplicite, fichiers_klassia: fichiersKlassiaRaw } = body
    const fjArr: FichierJoint[] = Array.isArray(fichiers_joints) ? fichiers_joints.slice(0, 3) : []

    if (!message?.trim() && fjArr.length === 0) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    // ── Valider fichiers_klassia ──────────────────────────────────────────────
    // Seuls les UUIDs valides avec source='klassia' sont acceptés, dédupliqués, max 5
    const dedupedIds: string[] = []
    if (Array.isArray(fichiersKlassiaRaw)) {
      const seen = new Set<string>()
      for (const ref of fichiersKlassiaRaw as FichierKlassiaRef[]) {
        if (
          ref?.source === 'klassia' &&
          typeof ref?.fichier_id === 'string' &&
          UUID_RE.test(ref.fichier_id) &&
          !seen.has(ref.fichier_id)
        ) {
          seen.add(ref.fichier_id)
          dedupedIds.push(ref.fichier_id)
          if (dedupedIds.length >= 5) break
        }
      }
    }

    const isFr = ((bodyLangue || (profil as any).langue || (profil as any).profil_ia?.langue_ia || 'fr') as string) !== 'en'

    // ── Données contextuelles ─────────────────────────────────────────────────
    const { data: classes } = await supabase
      .from('classes')
      .select('id, nom, matiere, matieres, niveau')
      .eq('enseignant_id', profil.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Détecter la classe active et le type de contenu dès maintenant
    // (nécessaire pour buildAutoContext qui s'exécute après le bloc DCE-04)
    const classeActive = (contexte.classe_id
      ? (classes || []).find((c: any) => c.id === contexte.classe_id)
      : null) as any

    const typeContenu = (typeof typeContenuExplicite === 'string' && typeContenuExplicite)
      ? typeContenuExplicite
      : detecterTypeContenu(message)
    const isLecon = (LESSON_TYPES_ASST as readonly string[]).includes(typeContenu)

    // Récupérer les documents de la mémoire IA — colonnes réelles : cle, contenu (JSONB), type, classe_id
    // Requête unique : docs de la classe active OU globaux (classe_id IS NULL).
    // Ne pas filtrer par classe_id strictement — un document peut avoir été indexé
    // avec un classe_id différent de l'attendu, ou comme document global.
    const memoireFilter = contexte.classe_id
      ? `classe_id.eq.${contexte.classe_id},classe_id.is.null`
      : undefined

    let memoireBaseQuery = supabase
      .from('studio_ia_memoire')
      .select('type, cle, contenu, classe_id')
      .eq('enseignant_id', profil.id)
      .order('created_at', { ascending: false })
      .limit(12)

    if (memoireFilter) {
      memoireBaseQuery = memoireBaseQuery.or(memoireFilter)
    }

    const { data: memoireRaw } = await memoireBaseQuery

    // Trier en mémoire : docs de la classe active en premier, globaux ensuite
    const memoire = (memoireRaw || []).sort((a: any, b: any) => {
      const aIsClasse = a.classe_id === contexte.classe_id ? 0 : 1
      const bIsClasse = b.classe_id === contexte.classe_id ? 0 : 1
      return aIsClasse - bIsClasse
    })

    // ── Chargement et vérification des fichiers KlassIA (DCE-04) ─────────────
    const docsValides: DocContextInput[] = []
    const fichiersIgnores: FichierIgnore[]  = []
    const fichiersUtilises: FichierUtilise[] = []

    if (dedupedIds.length > 0) {
      const classeIdCtx = typeof contexte.classe_id === 'string' ? contexte.classe_id : undefined

      // Batch 1 — fichiers_dossier (enseignant_id vérifié en query + RLS)
      const { data: fichiersData } = await supabase
        .from('fichiers_dossier')
        .select('id, nom, type_fichier, classe_id, enseignant_id, dossier_id')
        .in('id', dedupedIds)
        .eq('enseignant_id', profil.id)

      const fichierMap = new Map((fichiersData || []).map((f: any) => [f.id as string, f]))

      // Batch 2 — fichiers_indexation pour les IDs trouvés
      const idsFoundInDB = (fichiersData || []).map((f: any) => f.id as string)
      const { data: idxData } = idsFoundInDB.length > 0
        ? await supabase
            .from('fichiers_indexation')
            .select('fichier_id, statut, texte_extrait')
            .in('fichier_id', idsFoundInDB)
        : { data: [] }

      const idxMap = new Map((idxData || []).map((i: any) => [i.fichier_id as string, i]))

      // Batch 3 — dossiers_systeme pour les noms
      const dossierIds = [...new Set((fichiersData || []).map((f: any) => f.dossier_id as string).filter(Boolean))]
      const { data: dossiersData } = dossierIds.length > 0
        ? await supabase
            .from('dossiers_systeme')
            .select('id, nom, matiere')
            .in('id', dossierIds)
        : { data: [] }

      const dossierMap = new Map((dossiersData || []).map((d: any) => [d.id as string, d]))

      for (const fichier_id of dedupedIds) {
        const fichier = fichierMap.get(fichier_id) as any

        if (!fichier) {
          fichiersIgnores.push({ fichier_id, raison: 'introuvable' })
          continue
        }

        // Vérification applicative classe_id (restriction supplémentaire hors RLS)
        if (classeIdCtx && fichier.classe_id !== classeIdCtx) {
          console.warn('[KLASSIA][DCE04] rejet classe_id mismatch', fichier_id)
          fichiersIgnores.push({ fichier_id, raison: 'introuvable' })
          continue
        }

        const idx = idxMap.get(fichier_id) as any

        if (!idx) {
          fichiersIgnores.push({ fichier_id, raison: 'introuvable' })
          continue
        }

        if (idx.statut !== 'indexe' || !idx.texte_extrait) {
          const raison: FichierIgnore['raison'] =
            idx.statut === 'en_attente' || idx.statut === 'traitement' ? 'indexation_en_attente' :
            idx.statut === 'echec'                                      ? 'extraction_echouee'   :
            idx.statut === 'non_supporte'                               ? 'non_supporte'         :
            'extraction_echouee'
          fichiersIgnores.push({ fichier_id, raison })
          continue
        }

        const dossier   = dossierMap.get(fichier.dossier_id) as any
        const classeDoc = (classes || []).find((c: any) => c.id === fichier.classe_id) as any

        docsValides.push({
          fichier_id,
          nom:           fichier.nom || '',
          type_fichier:  fichier.type_fichier || '',
          classe_nom:    classeDoc?.nom || '',
          matiere:       dossier?.matiere || classeDoc?.matiere || null,
          dossier_nom:   dossier?.nom || '',
          texte_extrait: idx.texte_extrait,
        })
      }
    }

    // ── Contexte automatique DCE-05 ──────────────────────────────────────────
    const autoCtxResult = await buildAutoContext({
      supabase,
      enseignantId: profil.id,
      classeId:     typeof contexte.classe_id === 'string' ? contexte.classe_id : undefined,
      matiere:      (typeof contexte.matiere === 'string' ? contexte.matiere : null)
                    || classeActive?.matiere || null,
      matieres:     (classeActive?.matieres as string[] | undefined) || [],
      classeNom:    classeActive?.nom || '',
      typeContenu,
      excludeIds:   docsValides.map(d => d.fichier_id),
    })

    // Fusionner : docs manuels (priorité 1) + docs automatiques (priorité 2)
    const allDocs = [...docsValides, ...autoCtxResult.docs]

    // Budget combiné : ~10 000 tokens = 40 000 chars
    // Les docs manuels passent en premier → ils consomment leur budget en priorité.
    // Les docs auto reçoivent l'espace restant jusqu'au plafond global.
    const { bloc: docContextBloc, docs_utilises } = buildDocumentContext(allDocs, { maxCharsTotal: 40_000 })

    // Résoudre les fichiers finalement utilisés (après troncature éventuelle)
    const autoDocsUtilises: AutoContextDoc[] = []
    for (const d of docsValides) {
      if (docs_utilises.includes(d.fichier_id)) {
        fichiersUtilises.push({ fichier_id: d.fichier_id, nom: d.nom })
      } else {
        fichiersIgnores.push({ fichier_id: d.fichier_id, raison: 'extraction_echouee' })
      }
    }
    for (const d of autoCtxResult.docs) {
      if (docs_utilises.includes(d.fichier_id)) {
        autoDocsUtilises.push({ fichier_id: d.fichier_id, nom: d.nom, type_fichier: d.type_fichier })
      }
    }

    // ── System prompt ─────────────────────────────────────────────────────────
    const listeClasses = (classes || [])
      .map((c: any) => `• ${c.nom} (${c.niveau || ''}, ${c.matiere || (c.matieres || []).join('/')})`)
      .join('\n') || 'Aucune classe enregistrée'

    const profilIA = (profil.profil_ia as any) || {}
    const gabarit  = (profil as any).gabarit_lecon_analyse
      ? JSON.stringify(profil.gabarit_lecon_analyse).substring(0, 400)
      : null

    const prenom = (profil as any).prenom ?? (profil as any).first_name ?? user.email?.split('@')[0] ?? ''

    // studio_ia_memoire contient les mêmes docs que fichiers_indexation (action/route.ts
    // écrit dans les deux à chaque sauvegarde). Supprimer si DCE fournit déjà du contexte
    // documentaire pour éviter la double injection du même contenu.
    const memoireTexte = (memoire.length > 0 && allDocs.length === 0)
      ? 'Documents sauvegardés :\n' + memoire.map((m: any) => {
          const nom = m.cle || 'Document'
          const txt = ((m.contenu as any)?.contenu_texte || '') as string
          return `— ${nom}${txt ? '\n' + txt.substring(0, 1500) : ''}`
        }).join('\n\n')
      : ''

    // ── Bloc documentaire DCE-04 + DCE-05 ────────────────────────────────────
    const totalDocsCtx = fichiersUtilises.length + autoDocsUtilises.length
    const docContextSection = docContextBloc
      ? (isFr
          ? `\nCONTEXTE DOCUMENTAIRE ScorgIA (${totalDocsCtx} document${totalDocsCtx > 1 ? 's' : ''}) :
Ces documents ont été associés à cette session dans ScorgIA. Règles d'utilisation OBLIGATOIRES :
- Appuie tes réponses PRIORITAIREMENT sur le contenu de ces documents.
- Cite le nom du document concerné lorsque tu t'en inspires ("selon le document X").
- Ne prétends JAMAIS avoir consulté un document absent de ce contexte.
- Si deux documents se contredisent, signale-le explicitement à l'enseignant.
- Ne modifie pas, n'invente pas et ne complète pas le contenu des documents.

${docContextBloc}`
          : `\nScorgIA DOCUMENTARY CONTEXT (${totalDocsCtx} document${totalDocsCtx > 1 ? 's' : ''}) :
These documents are associated with this session in ScorgIA. MANDATORY usage rules:
- Base your responses PRIMARILY on the content of these documents.
- Cite the document name when drawing from it ("according to document X").
- NEVER claim to have consulted a document absent from this context.
- If two documents contradict each other, explicitly flag this for the teacher.
- Do not modify, invent, or supplement the content of the documents.

${docContextBloc}`)
      : ''

    const introLangue = isFr
      ? `LANGUE DE TRAVAIL : Français canadien. Tu dois TOUJOURS répondre en français canadien et utiliser la terminologie pédagogique albertaine/québécoise.`
      : `WORKING LANGUAGE: Canadian English. You must ALWAYS respond in English using Alberta/Canadian pedagogical terminology.`

    // ── Instructions format SVG (ajoutées SANS toucher au contenu pédagogique) ──
    const svgFormatSection = isFr ? `

FORMAT STRUCTURÉ — LEÇONS COMPLÈTES :
Quand tu génères une leçon complète (leçon, plan de leçon, fiche), structure TOUJOURS le contenu en sections Markdown claires :

# Titre de la leçon
## Objectifs d'apprentissage
## Matériel nécessaire
## Déroulement
### Mise en situation (X minutes)
### Développement (X minutes)
### Activité pratique (X minutes)
### Synthèse / Évaluation (X minutes)
## Différenciation pédagogique (si applicable)
## Notes pour l'enseignant

Utilise des listes à puces pour les étapes, des citations (>) pour les exemples concrets à donner aux élèves, et du **gras** pour les concepts-clés à retenir.

SCHÉMAS SVG INTÉGRÉS (uniquement quand pertinent) :
Quand le sujet implique une notion visuelle, spatiale, temporelle ou quantitative (cycle naturel, ligne du temps, fonction mathématique, structure géométrique, processus en étapes), insère un schéma SVG dans ta réponse avec ce format exact :

\`\`\`svg-schema
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <!-- contenu SVG pédagogique ici — labels lisibles, couleurs sobres -->
</svg>
\`\`\`

N'utilise ce bloc que quand un schéma apporte une vraie valeur pédagogique — pas à chaque leçon. Une leçon de grammaire n'en a probablement pas besoin ; une leçon sur le cycle de l'eau ou une fonction quadratique en a clairement besoin.` : `

STRUCTURED FORMAT — COMPLETE LESSONS:
When generating a complete lesson (lesson, lesson plan, fact sheet), ALWAYS structure the content in clear Markdown sections:

# Lesson Title
## Learning Objectives
## Materials Needed
## Lesson Flow
### Hook / Prior Knowledge (X minutes)
### Development (X minutes)
### Guided Practice (X minutes)
### Closure / Assessment (X minutes)
## Differentiation (if applicable)
## Teacher Notes

Use bullet points for steps, blockquotes (>) for examples to give students, and **bold** for key concepts.

INLINE SVG DIAGRAMS (only when relevant):
When the topic involves a visual, spatial, temporal, or quantitative concept (natural cycle, timeline, math function, geometry, anatomy, step-by-step process), insert an SVG diagram:

\`\`\`svg-schema
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <!-- pedagogical SVG content here — readable labels, clean colors -->
</svg>
\`\`\`

Only use this block when a diagram adds real educational value — not for every lesson. A grammar lesson probably doesn't need one; a lesson on the water cycle or quadratic functions clearly does.`

    const systemPrompt = isFr
      ? `${PLATEFORME_CONTEXT}

${introLangue}

Tu es ScorgIA, l'assistant pédagogique IA le plus avancé pour les enseignants canadiens.
Tu as une personnalité chaleureuse, proactive et bienveillante. Tu appelles l'enseignant par son prénom "${prenom}".

CONTEXTE ENSEIGNANT :
Nom : ${prenom} ${profil.nom}
Province : ${(profil as any).province || 'Canada'}
Style pédagogique : ${profilIA.style_peda || 'Non précisé'}
${gabarit ? `Gabarit personnel : ${gabarit}` : ''}

CLASSES :
${listeClasses}

CONTEXTE ACTUEL :
Page : ${contexte.page_courante || 'Dashboard'}
Classe active : ${classeActive ? `${classeActive.nom} (${classeActive.matiere || ''})` : 'Aucune sélectionnée'}
${memoireTexte}
${docContextSection}

INSTRUCTIONS :
- Pour les plans de leçon et leçons : respecte STRICTEMENT le gabarit 7 blocs ci-dessous. Document 2-3 pages maximum. Écriture dense : puces courtes, quelques répliques entre guillemets — jamais de paragraphes explicatifs ni de script intégral.
- Principes pédagogiques à intégrer dans le contenu du gabarit :
  • Situation-problème forte (tension cognitive ou paradoxe) dans le bloc AVANT — jamais de contenu d'enseignement nouveau dans ce bloc
  • Pédagogie active dans le bloc PENDANT : Think-Pair-Share, Jigsaw, PBL ou équivalent
  • Progression naturelle du concret vers l'abstrait : Modélisation → Pratique guidée → Pratique autonome
  • Chaque activité doit découler d'un RAS déclaré — aucune activité sans lien avec un RAS
  • L'évaluation précise toujours le support concret de la trace (billet de sortie, fiche, oral, etc.) — jamais "l'élève démontre" sans dire comment
  • Communiquer l'intention pédagogique explicitement AUX ÉLÈVES dans le bloc AVANT
  • Toute question ouverte posée aux élèves : préciser entre parenthèses le type de réponse attendu ou le RAS visé
- Pour les autres contenus (quiz, email, activité) : contenu concis et directement utilisable
- Sois chaleureux, anticipe les besoins de l'enseignant
${isLecon ? getFormatSection(typeContenu) : svgFormatSection}
${isLecon ? construireSectionsSkills((profil as any).province, typeContenu, true) : ''}
${isLecon ? `
⚠️ PRIORITÉ ABSOLUE — FORMAT FINAL (écrase toute autre instruction) :
• Utilise UNIQUEMENT la structure 7 blocs en tableaux Markdown définie ci-dessus (AVANT / PENDANT / APRÈS).
• AUCUN emoji dans ta réponse — ni dans les en-têtes, ni dans les cellules.
• AUCUNE section hors gabarit (pas de "Réflexion", pas de titre standalone, pas de liste en dehors des tableaux).
• AUCUN schéma SVG dans ce document.
• Les compétences et perspectives autochtones listées ci-dessus sont un CONTEXTE de contenu : intègre leur SUBSTANCE dans les cellules du gabarit — ne les recopie jamais comme sections ou blocs séparés.` : ''}`
      : `${PLATEFORME_CONTEXT}

${introLangue}

You are ScorgIA, the most advanced AI teaching assistant for Canadian educators.
You have a warm, proactive, and supportive personality. You address the teacher by their first name "${prenom}".

TEACHER CONTEXT:
Name: ${prenom} ${profil.nom}
Province: ${(profil as any).province || 'Canada'}
Teaching style: ${profilIA.style_peda || 'Not specified'}
${gabarit ? `Personal template: ${gabarit}` : ''}

CLASSES:
${listeClasses}

CURRENT CONTEXT:
Page: ${contexte.page_courante || 'Dashboard'}
Active class: ${classeActive ? `${classeActive.nom} (${classeActive.matiere || ''})` : 'None selected'}
${memoireTexte}
${docContextSection}

INSTRUCTIONS:
- For lesson plans and full lessons: follow STRICTLY the 7-bloc template below. Max 2-3 pages. Dense writing: short bullets, a few direct quotes — no explanatory paragraphs, no full scripts.
- Pedagogical principles to embed in the content:
  • Strong problem situation (cognitive tension or paradox) in the BEFORE block — never new teaching content here
  • Active learning in the DURING block: Think-Pair-Share, Jigsaw, PBL or equivalent
  • Natural progression from concrete to abstract: Modelling → Guided practice → Independent practice
  • Every activity must stem from a declared SLO — never add an activity without a SLO link
  • Assessment always specifies the concrete evidence tool (exit ticket, written sheet, oral presentation, etc.) — never "student demonstrates" without naming how
  • Communicate the learning intention explicitly TO STUDENTS in the BEFORE block
  • Open questions to students: specify in parentheses the expected response type or targeted SLO
- For other content types (quiz, email, activity): concise, directly usable content
- Be warm, anticipate the teacher's needs
${isLecon ? getFormatSection(typeContenu) : svgFormatSection}
${isLecon ? construireSectionsSkills((profil as any).province, typeContenu, false) : ''}
${isLecon ? `
⚠️ ABSOLUTE PRIORITY — FINAL FORMAT (overrides all other instructions):
• Use ONLY the 7-bloc Markdown table structure defined above (BEFORE / DURING / AFTER).
• NO emojis anywhere in your response — not in headers, not in cells.
• NO sections outside the template, no standalone titles, no lists outside tables.
• NO SVG diagrams in this document.
• The skills and Indigenous perspectives listed above are CONTENT CONTEXT: embed their substance inside the template cells — never copy them as separate sections or blocks.` : ''}`

    // ── Construire le contenu du dernier message (multimodal si fichiers joints) ──
    let userContent: Anthropic.MessageParam['content']

    if (fjArr.length > 0) {
      const blocks: any[] = []

      for (const f of fjArr) {
        if (!f.contenu_base64) continue

        if (f.type_mime?.startsWith('image/')) {
          const mediaType = (
            ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.type_mime)
              ? f.type_mime : 'image/jpeg'
          ) as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
          blocks.push({
            type:   'image',
            source: { type: 'base64', media_type: mediaType, data: f.contenu_base64 },
          })

        } else if (f.type_mime === 'application/pdf') {
          blocks.push({
            type:   'document',
            source: { type: 'base64', media_type: 'application/pdf', data: f.contenu_base64 },
          } as any)

        } else {
          // DOCX / DOC — extraction texte via mammoth
          const isDocx =
            f.type_mime?.includes('wordprocessingml') ||
            f.type_mime === 'application/msword'
          if (isDocx) {
            try {
              const buf = Buffer.from(f.contenu_base64, 'base64')
              const { value: texte } = await mammoth.extractRawText({ buffer: buf })
              blocks.push({
                type: 'text',
                text: texte
                  ? `[Contenu du fichier Word "${f.nom}"] :\n${texte.substring(0, 8000)}`
                  : `[Fichier Word joint : "${f.nom}" — contenu vide]`,
              })
            } catch {
              blocks.push({
                type: 'text',
                text: `[Fichier Word joint : "${f.nom}" — extraction impossible]`,
              })
            }
          } else {
            blocks.push({ type: 'text', text: `[Fichier joint : "${f.nom}" (${f.type_mime})]` })
          }
        }
      }

      if (message?.trim()) {
        blocks.push({ type: 'text', text: message })
      }

      userContent = blocks
    } else {
      userContent = message
    }

    // ── Construire les messages ────────────────────────────────────────────────
    const messagesIA: Anthropic.MessageParam[] = [
      ...(historique as any[])
        .filter((m: any) => m.role === 'user' || m.role === 'assistant')
        .slice(-12)
        .map((m: any) => ({
          role:    m.role as 'user' | 'assistant',
          content: typeof m.content === 'string' ? m.content : String(m.content),
        })),
      { role: 'user', content: userContent },
    ]

    // ── Streaming avec continuation automatique (ARCHITECTURE.md §6) ─────────
    // Max 3 relances côté serveur si Claude s'arrête sur max_tokens.
    // Le client ne voit jamais de troncature : il reçoit le texte complet
    // en un seul flux continu.
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('[assistant] ANTHROPIC_API_KEY manquant — configurer dans Vercel > Environment Variables > Production')
      const safeMsg = isFr
        ? 'ScorgIA n\'a pas pu générer ce contenu pour le moment. Réessayez dans quelques instants. Si le problème persiste, utilisez le bouton Feedback.'
        : 'ScorgIA could not generate content at this time. Please retry in a moment. If the issue persists, use the Feedback button.'
      return new Response(safeMsg, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    }
    const client = new Anthropic({ apiKey })

    // Métadonnées à transmettre au client (fichiers utilisés / ignorés)
    const ctxMeta = {
      fichiers_utilises:      fichiersUtilises,
      fichiers_ignores:       fichiersIgnores,
      fichiers_auto_utilises: autoDocsUtilises,
      mission:                autoCtxResult.mission,
      budget_consomme_chars:  docContextBloc.length,
    }

    return new Response(
      new ReadableStream({
        async start(controller) {
          const enc       = new TextEncoder()
          let   fullText  = ''
          const historyIA = [...messagesIA]
          const MAX_PASSES = 3

          // Émettre les métadonnées en tête de flux (uniquement si des fichiers KlassIA étaient demandés)
          if (dedupedIds.length > 0) {
            controller.enqueue(enc.encode(`${KLASSIA_CTX_TAG}${JSON.stringify(ctxMeta)}\n`))
          }

          for (let pass = 0; pass <= MAX_PASSES; pass++) {
            let passText  = ''
            let truncated = false

            try {
              const passStream = await client.messages.stream({
                model:      'claude-sonnet-4-6',
                max_tokens: getMaxTokens(typeContenu),
                system:     systemPrompt,
                messages:   historyIA,
              })
              for await (const chunk of passStream) {
                if (
                  chunk.type === 'content_block_delta' &&
                  chunk.delta.type === 'text_delta'
                ) {
                  passText += chunk.delta.text
                  controller.enqueue(enc.encode(chunk.delta.text))
                }
                if (chunk.type === 'message_delta' && chunk.delta.stop_reason === 'max_tokens') {
                  truncated = true
                }
              }
            } catch (err: any) {
              console.error('[assistant] erreur génération IA (pass', pass, '):', err?.status, err?.message ?? err)
              const errMsg = isFr
                ? 'ScorgIA n\'a pas pu générer ce contenu pour le moment. Réessayez dans quelques instants. Si le problème persiste, utilisez le bouton Feedback.'
                : 'ScorgIA could not generate content at this time. Please retry in a moment. If the issue persists, use the Feedback button.'
              controller.enqueue(enc.encode(errMsg))
              break
            }

            fullText += passText

            if (!truncated || pass >= MAX_PASSES) break

            // Préparer la relance : l'IA reçoit son propre texte + instruction de continuation
            historyIA.push({ role: 'assistant', content: fullText })
            historyIA.push({
              role:    'user',
              content: isFr
                ? "Continue exactement où tu t'es arrêté, sans répéter ce qui a déjà été écrit, sans réintroduire de titre ou d'en-tête déjà présent."
                : "Continue exactly where you left off, without repeating what was already written, without reintroducing titles or headers already present.",
            })
          }

          // Émettre suggestion d'action pour tout document structuré (≥2 lignes de tableau Markdown)
          // typeIsKnown contrôle uniquement la sauvegarde auto dans action/route.ts (return skipped:true),
          // pas l'affichage des boutons Word/Imprimer/Sauvegarder côté client.
          const tableRows = (fullText.match(/^\|.+\|.*$/gm) || []).length
          const isLessonType = ['plan_lecon', 'lecon_complete', 'fiche_lecon'].includes(typeContenu)
          // Pour les leçons, exiger AVANT/PENDANT/APRÈS — évite les sauvegardes sur des clarifications
          const hasLessonStructure = !isLessonType || /\bAVANT\b|\bPENDANT\b|\bAPRÈS\b/i.test(fullText)
          const looksLikeDocument  = tableRows >= 2 && fullText.length > 300 && hasLessonStructure

          if (looksLikeDocument) {
            const titreDetecte  = extraireTitre(fullText) || message.substring(0, 60).trim()
            const actionPayload = JSON.stringify({
              type:            'ACTION_SUGGESTION',
              action:          'sauvegarder',
              type_contenu:    typeContenu,
              titre:           titreDetecte,
              dossier_suggere: DOSSIER_PAR_TYPE_CONTENU[typeContenu],
              contenu:         fullText,
            })
            controller.enqueue(enc.encode('\n\n__ACTION__' + actionPayload))
          }

          controller.close()
        },
      }),
      {
        headers: {
          'Content-Type':           'text/plain; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
          'Transfer-Encoding':      'chunked',
        },
      },
    )

  } catch (err: any) {
    console.error('[assistant] error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
