import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMaxTokens } from '@/lib/ia/get-max-tokens'
import { getFormatSection } from '@/lib/ia/build-system-prompt'

const LESSON_TYPES_ASST = ['plan_lecon', 'lecon_complete', 'fiche_lecon'] as const

// ── Helpers détection type / titre ────────────────────────────────────────────

function detecterTypeContenu(message: string): string {
  if (/quiz|questionnaire|vrai.faux|qcm/i.test(message))                return 'quiz'
  if (/évaluation|examen|test sommatif|bilan/i.test(message))           return 'evaluation'
  if (/plan de leçon|plan détaillé|plan pédago/i.test(message))         return 'plan_lecon'
  if (/\bleçon\b|cours sur|enseigner|fiche leçon/i.test(message))       return 'lecon_complete'
  if (/activité|exercice|atelier|\blab\b/i.test(message))               return 'activite'
  if (/email|courriel|parent|lettre/i.test(message))                    return 'email_parents'
  if (/curriculum|programme annuel|progression annuelle/i.test(message)) return 'curriculum'
  return 'ressource'
}

function extraireTitre(contenu: string): string {
  const match = contenu.match(/^#{1,2}\s+(.+)$/m)
  if (match) return match[1].replace(/[*`_]/g, '').trim().substring(0, 80)
  const first = contenu.split('\n').find(l => l.trim().length > 15 && !l.trim().startsWith('#'))
  return first?.trim().substring(0, 80) || ''
}

const DOSSIER_LABELS_FR: Record<string, string> = {
  plan_lecon: 'Plans de leçons', lecon_complete: 'Plans de leçons',
  quiz: 'Évaluations',           evaluation: 'Évaluations',
  activite: 'Activités',         email_parents: 'Communications',
  curriculum: 'Curriculum',      ressource: 'Ressources',
}
const DOSSIER_LABELS_EN: Record<string, string> = {
  plan_lecon: 'Lesson Plans',    lecon_complete: 'Lesson Plans',
  quiz: 'Assessments',           evaluation: 'Assessments',
  activite: 'Activities',        email_parents: 'Communications',
  curriculum: 'Curriculum',      ressource: 'Resources',
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

    const { message, contexte = {}, historique = [], langue: bodyLangue } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    const isFr = ((bodyLangue || (profil as any).langue || (profil as any).profil_ia?.langue_ia || 'fr') as string) !== 'en'

    // ── Données contextuelles ─────────────────────────────────────────────────
    const { data: classes } = await supabase
      .from('classes')
      .select('id, nom, matiere, matieres, niveau')
      .eq('enseignant_id', profil.id)
      .order('created_at', { ascending: false })
      .limit(20)

    const { data: memoire } = await supabase
      .from('studio_ia_memoire')
      .select('type, cle, contenu')
      .eq('enseignant_id', profil.id)
      .limit(10)

    // ── System prompt ─────────────────────────────────────────────────────────
    const listeClasses = (classes || [])
      .map((c: any) => `• ${c.nom} (${c.niveau || ''}, ${c.matiere || (c.matieres || []).join('/')})`)
      .join('\n') || 'Aucune classe enregistrée'

    const profilIA = (profil.profil_ia as any) || {}
    const gabarit  = (profil as any).gabarit_lecon_analyse
      ? JSON.stringify(profil.gabarit_lecon_analyse).substring(0, 400)
      : null

    const prenom = (profil as any).prenom ?? (profil as any).first_name ?? user.email?.split('@')[0] ?? ''

    const classeActive = contexte.classe_id
      ? (classes || []).find((c: any) => c.id === contexte.classe_id)
      : null

    const memoireTexte = (memoire || []).length > 0
      ? 'Ressources mémorisées : ' + (memoire || []).map((m: any) => m.cle).join(', ')
      : ''

    // Détecter le type en amont pour adapter le format du system prompt
    const typeContenu = detecterTypeContenu(message)
    const isLecon = (LESSON_TYPES_ASST as readonly string[]).includes(typeContenu)

    const introLangue = isFr
      ? `LANGUE DE TRAVAIL : Français canadien. Tu dois TOUJOURS répondre en français canadien et utiliser la terminologie pédagogique albertaine/québécoise.`
      : `WORKING LANGUAGE: Canadian English. You must ALWAYS respond in English using Alberta/Canadian pedagogical terminology.`

    const albertaLeconSection = isFr ? `

GABARIT PROVINCIAL ALBERTA — 8 SECTIONS OBLIGATOIRES (pour les leçons) :
SECTION 1 — Infos générales (RAG / RAS du programme d'études Alberta)
SECTION 2 — Avant la leçon : activation des connaissances antérieures, KWL
SECTION 3 — Pendant la leçon : situation-problème + activité collaborative + pratique guidée
SECTION 4 — Après la leçon : débreffage collectif + exit ticket
SECTION 5 — Différenciation : EAL/ÉLS, TDAH, douance, difficultés d'apprentissage
SECTION 6 — Perspective autochtone (obligatoire Alberta) : Premières Nations, Métis, Inuit — Treaty 6/7/8
SECTION 7 — Matériels : physiques, numériques, références LearnAlberta.ca
SECTION 8 — Réflexion enseignant : ce qui a fonctionné, ajustements, prochaines étapes` : `

ALBERTA PROVINCIAL TEMPLATE — 8 MANDATORY SECTIONS (for lessons):
SECTION 1 — General Info (GLO / SLO from Alberta Program of Studies)
SECTION 2 — Before the lesson: activating prior knowledge, KWL
SECTION 3 — During the lesson: problem situation + collaborative activity + guided practice
SECTION 4 — After the lesson: group debrief + exit ticket
SECTION 5 — Differentiation: ELL, ADHD, giftedness, learning disabilities
SECTION 6 — Indigenous Perspectives (required Alberta): First Nations, Métis, Inuit — Treaty 6/7/8
SECTION 7 — Materials: physical, digital, LearnAlberta.ca references
SECTION 8 — Teacher Reflection: what worked, adjustments, next steps`

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
      ? `${introLangue}

Tu es KlassIA+, l'assistant pédagogique IA le plus avancé pour les enseignants canadiens. Tu es propulsé par Claude d'Anthropic.
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

INSTRUCTIONS :
- Génère du contenu en Markdown bien formaté (titres ##, tableaux, listes, émojis)
- Pour les leçons, utilise l'approche socioconstructiviste en 7 étapes :
  1. Objectifs SMART (tableau : # | Objectif | Mesurable | Délai)
  2. Stratégie pédagogique explicite (Cône de Dale : concret → abstrait)
  3. Pédagogie active (Think-Pair-Share, Jigsaw, PBL)
  4. Situation-problème forte AVANT toute explication (paradoxe ou tension cognitive)
  5. Co-construction du savoir (carte mentale, débat, galerie de solutions)
  6. Évaluation sans biais négatif : diagnostique + formative + sommative
  7. 3 questions de rétroaction pour l'enseignant
  Progression Bruner obligatoire : Énactif → Iconique → Symbolique
- Sois concis, actionnable et chaleureux
- Anticipe les besoins de l'enseignant
${isLecon ? getFormatSection(typeContenu) : svgFormatSection}`
      : `${introLangue}

You are KlassIA+, the most advanced AI teaching assistant for Canadian educators. Powered by Claude by Anthropic.
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

INSTRUCTIONS:
- Generate well-formatted Markdown content (## headings, tables, lists, emojis)
- For lessons, use the 7-step socioconstructivist approach:
  1. SMART Objectives (table: # | Objective | Measurable | Deadline)
  2. Explicit pedagogical strategy (Dale's Cone: concrete → abstract)
  3. Active learning (Think-Pair-Share, Jigsaw, PBL)
  4. Problem situation BEFORE any explanation (paradox or cognitive tension)
  5. Co-construction of knowledge (mind map, debate, solution gallery)
  6. Bias-free assessment: diagnostic + formative + summative
  7. 3 teacher reflection questions
  Mandatory Bruner progression: Enactive → Iconic → Symbolic
- Be concise, actionable, and warm
- Anticipate the teacher's needs
${isLecon ? getFormatSection(typeContenu) : svgFormatSection}`

    // ── Construire les messages ────────────────────────────────────────────────
    const messagesIA: Anthropic.MessageParam[] = [
      ...(historique as any[])
        .filter((m: any) => m.role === 'user' || m.role === 'assistant')
        .slice(-12)
        .map((m: any) => ({
          role:    m.role as 'user' | 'assistant',
          content: typeof m.content === 'string' ? m.content : String(m.content),
        })),
      { role: 'user', content: message },
    ]

    // ── Streaming ─────────────────────────────────────────────────────────────
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const stream = await client.messages.stream({
      model:      'claude-sonnet-4-6',
      max_tokens: getMaxTokens(typeContenu),
      system:     systemPrompt,
      messages:   messagesIA,
    })

    return new Response(
      new ReadableStream({
        async start(controller) {
          const enc        = new TextEncoder()
          let fullText     = ''
          let isTruncated  = false
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              fullText += chunk.delta.text
              controller.enqueue(enc.encode(chunk.delta.text))
            }
            if (chunk.type === 'message_delta' && chunk.delta.stop_reason === 'max_tokens') {
              isTruncated = true
            }
          }
          if (isTruncated) {
            controller.enqueue(enc.encode('\n\n__TRUNCATED__'))
          }
          // Émettre suggestion de sauvegarde si contenu substantiel (document, pas réponse courte)
          const looksLikeDocument = fullText.length > 300 || /^#{1,3}\s/m.test(fullText)
          if (looksLikeDocument) {
            const typeDetecte    = typeContenu
            const titreDetecte   = extraireTitre(fullText) || message.substring(0, 60).trim()
            const labels         = isFr ? DOSSIER_LABELS_FR : DOSSIER_LABELS_EN
            const actionPayload  = JSON.stringify({
              type:            'ACTION_SUGGESTION',
              action:          'sauvegarder',
              type_contenu:    typeDetecte,
              titre:           titreDetecte,
              dossier_suggere: labels[typeDetecte] || (isFr ? 'Ressources' : 'Resources'),
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
