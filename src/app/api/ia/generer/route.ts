import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMaxTokens } from '@/lib/ia/get-max-tokens'
import { buildSystemPrompt } from '@/lib/ia/build-system-prompt'
import { construireSectionsSkills } from '@/lib/ia/skills-pedagogiques'
import { peutGenererContenu, LIMITES_FORFAIT } from '@/lib/hooks/useForfait'
import type { ForfaitType } from '@/lib/types/database'

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { contenu: '⚠️ Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY dans votre fichier .env.local.' },
      { status: 200 }
    )
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ contenu: '⚠️ Corps de requête invalide.' }, { status: 400 })
  }

  const {
    type_contenu, sujet, duree, instructions,
    adapter_besoins, contexte, langue,
    profil_ia,
    profils_eleves,
    streaming: modeStreaming = false,
  } = body

  // ── Vérification quota AVANT tout appel Claude ────────────────────────────
  let profilQuota: any = null
  try {
    const supabaseQuota = await createClient()
    const { data: { session: qSession } } = await supabaseQuota.auth.getSession()
    if (qSession) {
      const { data: qProfil } = await supabaseQuota
        .from('utilisateurs')
        .select('id, forfait, is_admin, generations_ia_total_a_vie, generations_ia_mois_courant, derniere_reinit_quota')
        .eq('user_id', qSession.user.id)
        .single()
      profilQuota = qProfil
    }
  } catch { /* non-bloquant si erreur réseau */ }

  if (profilQuota) {
    const { autorise, raison } = peutGenererContenu(profilQuota)
    if (!autorise) {
      return NextResponse.json(
        { erreur_quota: true, raison, forfait: profilQuota.forfait || 'gratuit' },
        { status: 403 },
      )
    }
  }

  try {
    const client = new Anthropic({ apiKey })
    const isFr = (langue || profil_ia?.langue_ia || 'fr') !== 'en'

    // ── Mémoire personnalisée + province ─────────────────────────────────────
    let memoireSection = ''
    let provinceEnseignant: string | null = null
    try {
      const supabaseMem = await createClient()
      const { data: { session: memSession } } = await supabaseMem.auth.getSession()
      if (memSession) {
        const { data: userProfilMem } = await supabaseMem
          .from('utilisateurs').select('id, province').eq('user_id', memSession.user.id).single()
        if (userProfilMem?.id) {
          provinceEnseignant = (userProfilMem as any).province ?? null
          const { data: memoires } = await supabaseMem
            .from('studio_ia_memoire').select('cle,type')
            .eq('enseignant_id', userProfilMem.id)
            .order('updated_at', { ascending: false }).limit(8)
          if (memoires && memoires.length > 0) {
            const memo = memoires.map((m: any) => `[${m.type}] ${m.cle}`).join(' · ')
            memoireSection = isFr
              ? `\n\nContexte enseignant : ${memo}`
              : `\n\nTeacher context: ${memo}`
          }
        }
      }
    } catch { /* non-bloquant */ }

    // ── Différenciation ───────────────────────────────────────────────────────
    const elevesABesoins = (profils_eleves || []).filter((e: any) => e.profil_type !== 'standard')
    const differenciationSection = elevesABesoins.length > 0
      ? (isFr
          ? `\n\nÉlèves à besoins particuliers :\n${
              elevesABesoins.map((e: any) =>
                `- ${e.profil_type}${e.besoins?.length ? ': ' + e.besoins.join(', ') : ''}${e.notes_enseignant ? ' — ' + e.notes_enseignant : ''}`
              ).join('\n')
            }\nGénère deux versions séparées par :\n=== VERSION DIFFÉRENCIÉE ===`
          : `\n\nStudents with special needs:\n${elevesABesoins.map((e: any) => e.profil_type).join(', ')}\nGenerate two versions separated by:\n=== VERSION DIFFÉRENCIÉE ===`)
      : ''

    // ── Intro langue ─────────────────────────────────────────────────────────
    const introLangue = isFr
      ? `LANGUE DE TRAVAIL : Français canadien. Tu dois TOUJOURS répondre en français canadien et utiliser la terminologie pédagogique albertaine/québécoise.`
      : `WORKING LANGUAGE: Canadian English. You must ALWAYS respond in English using Alberta/Canadian pedagogical terminology.`

    // ── Gabarit provincial Alberta (leçons uniquement) ────────────────────
    const LESSON_TYPES = ['lecon_complete', 'fiche_lecon', 'plan_lecon', 'plan_sequence', 'activite_groupe']
    const albertaSection = LESSON_TYPES.includes(type_contenu || '') ? (isFr ? `

GABARIT PROVINCIAL ALBERTA — 8 SECTIONS OBLIGATOIRES :
Ce gabarit est obligatoire pour toutes les leçons destinées aux enseignants de l'Alberta.

SECTION 1 — Informations générales
• Matière | Niveau scolaire | Durée | Date prévue
• RAG (Résultats d'apprentissage généraux) : objectifs du programme d'études de l'Alberta
• RAS (Résultats d'apprentissage spécifiques) : objectifs mesurables et observables pour cette leçon

SECTION 2 — Avant la leçon (Mise en contexte et activation)
• Activation des connaissances antérieures (sondage diagnostique, KWL, question-amorce)
• Matériels et ressources requises
• Préparation de l'espace d'apprentissage

SECTION 3 — Pendant la leçon (Apprentissage actif)
• Introduction / Situation-problème ou tension cognitive
• Développement : enseignement explicite + activité collaborative (Jigsaw, Think-Pair-Share, PBL)
• Pratique guidée → pratique autonome (Énactif → Iconique → Symbolique)

SECTION 4 — Après la leçon (Consolidation et clôture)
• Retour en groupe collectif (Qu'avons-nous appris ? En quoi est-ce important ? Et maintenant ?)
• Exit ticket / billet de sortie / question de fermeture

SECTION 5 — Différenciation et adaptation
• Soutien pour les élèves en difficulté (étayage, simplification, regroupement flexible)
• Enrichissement pour les élèves avancés (extension, approfondissement)
• Adaptations : EAL/ÉLS, TDAH, douance, difficultés d'apprentissage

SECTION 6 — Perspective autochtone (obligatoire — Programme d'études de l'Alberta)
• Connexion avec les savoirs, traditions ou perspectives des Premières Nations, Métis et Inuit
• Territoire Treaty concerné (Treaty 6, 7 ou 8)
• Ressource recommandée : Alberta Education FNMI Learning Resources

SECTION 7 — Matériels et ressources
• Matériels physiques / numériques / manipulatifs
• Références au programme d'études de l'Alberta (lien ou section précise)
• Sites recommandés : LearnAlberta.ca, ERLC.ca

SECTION 8 — Réflexion de l'enseignant (à compléter après la leçon)
1. Ce qui a bien fonctionné et pourquoi
2. Ce qui doit être ajusté ou supprimé
3. Prochaines étapes pour les élèves qui ont besoin d'un soutien supplémentaire` : `

ALBERTA PROVINCIAL TEMPLATE — 8 MANDATORY SECTIONS:
This template is mandatory for all lessons for Alberta teachers.

SECTION 1 — General Information
• Subject | Grade Level | Duration | Planned Date
• GLO (General Learning Outcomes): Alberta Program of Studies objectives
• SLO (Specific Learning Outcomes): measurable, observable objectives for this lesson

SECTION 2 — Before the Lesson (Setting the Stage & Activation)
• Activating prior knowledge (diagnostic survey, KWL chart, hook question)
• Required materials and resources
• Learning environment preparation

SECTION 3 — During the Lesson (Active Learning)
• Introduction / Problem situation or cognitive tension
• Development: explicit instruction + collaborative activity (Jigsaw, Think-Pair-Share, PBL)
• Guided practice → independent practice (Enactive → Iconic → Symbolic)

SECTION 4 — After the Lesson (Consolidation & Closure)
• Whole-group debrief (What did we learn? Why does it matter? What's next?)
• Exit ticket / closing question

SECTION 5 — Differentiation and Adaptation
• Support for struggling students (scaffolding, simplification, flexible grouping)
• Enrichment for advanced students (extension, deepening)
• Adaptations: ELL, ADHD, giftedness, learning disabilities

SECTION 6 — Indigenous Perspectives (required — Alberta Program of Studies)
• Connection to First Nations, Métis, and Inuit knowledge, traditions, or perspectives
• Treaty territory (Treaty 6, 7, or 8)
• Recommended resource: Alberta Education FNMI Learning Resources

SECTION 7 — Materials and Resources
• Physical / digital / manipulative materials
• Alberta Program of Studies references (link or specific section)
• Recommended sites: LearnAlberta.ca, ERLC.ca

SECTION 8 — Teacher Reflection (to be completed after the lesson)
1. What worked well and why
2. What needs to be adjusted or removed
3. Next steps for students who need additional support`) : ''

    // ── Marqueurs pédagogiques BienEnseigner (leçons uniquement) ─────────────
    const bepSection = LESSON_TYPES.includes(type_contenu || '') ? (isFr ? `

MARQUEURS BIENENSEIGNER — INSTRUCTION DE FORMATAGE UNIQUEMENT :
Pour cette leçon, insère exactement ces 5 commentaires HTML, chacun sur sa propre ligne au DÉBUT de la section pédagogique correspondante. Ne modifie ni la structure ni le contenu pédagogique.

<!-- bep-step:1:Objectifs SMART -->
(placer avant les RAG/RAS et les intentions d'apprentissage — Section 1)

<!-- bep-step:2:Amorce -->
(placer avant la mise en contexte et l'activation des connaissances — Section 2)

<!-- bep-step:3:Présentation progressive -->
(placer avant l'enseignement explicite et la modélisation — Section 3 début)

<!-- bep-step:4:Pratique -->
(placer avant la pratique guidée et autonome — Section 3 suite)

<!-- bep-step:5:Clôture -->
(placer avant le retour collectif et l'exit ticket — Section 4)

Ces marqueurs sont invisibles dans le rendu final et ne doivent PAS modifier le contenu pédagogique.` : `

BIENENSEIGNER MARKERS — FORMATTING INSTRUCTION ONLY:
For this lesson, insert exactly these 5 HTML comment markers, each on its own line AT THE START of the corresponding pedagogical section. Do not alter structure or pedagogical content.

<!-- bep-step:1:Objectives SMART -->
(place before GLO/SLO and learning intentions — Section 1)

<!-- bep-step:2:Hook -->
(place before context setting and prior knowledge activation — Section 2)

<!-- bep-step:3:Progressive Presentation -->
(place before explicit instruction and modelling — Section 3 start)

<!-- bep-step:4:Practice -->
(place before guided and independent practice — Section 3 continued)

<!-- bep-step:5:Closure -->
(place before whole-group debrief and exit ticket — Section 4)

These markers are invisible in the final render and must NOT alter pedagogical structure or content.`) : ''

    // ── System prompt ─────────────────────────────────────────────────────────
    const sectionsSkillsRaw = construireSectionsSkills(provinceEnseignant, type_contenu, isFr)

    // Enveloppe d'intégration : indiquer à l'IA où placer les skills (jamais en sections séparées)
    const sectionsSkills = sectionsSkillsRaw && LESSON_TYPES.includes(type_contenu || '')
      ? (isFr
        ? `\n\nINSTRUCTION D'INTÉGRATION DES RÉFÉRENTIELS (ci-dessous) :
• PERSPECTIVE AUTOCHTONE → intégrer UNIQUEMENT dans la section ## Autochtone — ne crée PAS de section H2 supplémentaire.
• COMPÉTENCES TRANSVERSALES → distribuer dans ## RAG, ## RAS et ## Différenciation — ne crée PAS de section H2 supplémentaire ni de tableau additionnel.
RÈGLE ABSOLUE : aucun contenu culturel spécifique à une nation particulière.${sectionsSkillsRaw}`
        : `\n\nFRAMEWORK INTEGRATION INSTRUCTION (content below):
• INDIGENOUS PERSPECTIVES → integrate ONLY into ## Autochtone — do NOT create an extra H2 section.
• CROSS-CURRICULAR COMPETENCIES → distribute into ## RAG, ## RAS and ## Différenciation — do NOT create extra sections or tables.
ABSOLUTE RULE: never generate cultural content specific to any particular nation.${sectionsSkillsRaw}`)
      : sectionsSkillsRaw

    const systemPrompt =
      introLangue + '\n\n' +
      buildSystemPrompt(type_contenu, profil_ia, profil_ia?.gabarit_lecon_analyse) +
      differenciationSection +
      memoireSection +
      albertaSection +
      bepSection +
      sectionsSkills

    // ── User prompt ───────────────────────────────────────────────────────────
    const classeCtx = contexte?.classe
      ? (isFr
          ? `Matière : ${contexte.classe.matiere || '—'} · Niveau : ${contexte.classe.niveau || '—'} · Élèves : ${contexte.classe.nombre_eleves || profil_ia?.groupes_typiques || '—'}`
          : `Subject: ${contexte.classe.matiere || '—'} · Level: ${contexte.classe.niveau || '—'} · Students: ${contexte.classe.nombre_eleves || '—'}`)
      : ''

    const dureeEffective = duree || profil_ia?.duree_typique || 75
    const ressourcesListe: string[] = body.ressources_context || []
    const planJson = body.plan_json ? JSON.stringify(body.plan_json, null, 2) : null

    const userPromptParts = instructions
      ? [`${instructions}`, `Sujet : ${sujet}`, classeCtx].filter(Boolean)
      : isFr
        ? [
            `Génère du contenu pédagogique (${type_contenu}) sur : "${sujet}".`,
            classeCtx,
            `Durée : ${dureeEffective} min`,
            adapter_besoins ? 'Inclure adaptations (dyslexie, TDAH, allophone).' : '',
            planJson ? `Plan à suivre :\n${planJson}` : '',
            ressourcesListe.length > 0 ? `Ressources à intégrer :\n${ressourcesListe.join('\n')}` : '',
            'Génère un contenu complet, structuré et directement utilisable.',
          ].filter(Boolean)
        : [
            `Generate "${type_contenu}" about: "${sujet}".`,
            classeCtx,
            `Duration: ${dureeEffective} min`,
            'Generate complete, structured, ready-to-use content.',
          ].filter(Boolean)

    const userPrompt = userPromptParts.join('\n\n')
    const maxTokens  = getMaxTokens(type_contenu)

    // ── Helper post-génération (BLOC 13) ─────────────────────────────────────
    const creerTacheAuto = async (texte: string) => {
      if (!['lecon_complete', 'fiche_lecon'].includes(type_contenu || '')) return
      if (texte.startsWith('⚠')) return
      try {
        const supabaseServer = await createClient()
        const { data: { session } } = await supabaseServer.auth.getSession()
        if (!session) return
        const { data: userProfil } = await supabaseServer
          .from('utilisateurs').select('id').eq('user_id', session.user.id).single()
        if (!userProfil?.id) return
        const datePrevue = body.date_prevue as string | undefined
        const dateEcheance = datePrevue
          ? new Date(new Date(datePrevue).getTime() - 86400000).toISOString().split('T')[0]
          : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
        await supabaseServer.from('taches_enseignant').insert({
          enseignant_id: userProfil.id,
          titre:         `Réviser la leçon : ${sujet}`,
          type:          'preparer_lecon',
          date_echeance: dateEcheance,
          auto_generee:  true,
          est_complete:  false,
        } as any)
      } catch { /* non-bloquant */ }
    }

    // ════════════════════════════════════════════════════════════════
    // MODE STREAMING
    // ════════════════════════════════════════════════════════════════
    if (modeStreaming) {
      const stream = await client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })

      return new Response(
        new ReadableStream({
          async start(controller) {
            let fullText = ''
            for await (const chunk of stream) {
              if (
                chunk.type === 'content_block_delta' &&
                chunk.delta.type === 'text_delta'
              ) {
                const text = chunk.delta.text
                fullText += text
                controller.enqueue(new TextEncoder().encode(text))
              }
            }
            controller.close()
            await creerTacheAuto(fullText)
          }
        }),
        {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'X-Content-Type-Options': 'nosniff',
          }
        }
      )
    }

    // ════════════════════════════════════════════════════════════════
    // MODE JSON (rétrocompatible — défaut)
    // ════════════════════════════════════════════════════════════════
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = message.content[0].type === 'text'
      ? message.content[0].text
      : 'Erreur lors de la génération'

    // Parser le marqueur de différenciation
    const SEPARATOR = '=== VERSION DIFFÉRENCIÉE ==='
    let version_normale = raw
    let version_differenciee: string | null = null
    if (raw.includes(SEPARATOR)) {
      const parts = raw.split(SEPARATOR)
      version_normale = parts[0].trim()
      version_differenciee = parts[1]?.trim() || null
    }

    await creerTacheAuto(raw)

    // ── Incrémenter le compteur de générations (seulement si succès réel) ──
    if (profilQuota?.id && !raw.startsWith('⚠')) {
      try {
        const supabaseCount = await createClient()
        const forfait = (profilQuota.forfait || 'gratuit') as ForfaitType
        const limites = LIMITES_FORFAIT[forfait]

        if (limites.generations_quota_type === 'a_vie') {
          await supabaseCount.from('utilisateurs')
            .update({ generations_ia_total_a_vie: (profilQuota.generations_ia_total_a_vie ?? 0) + 1 })
            .eq('id', profilQuota.id)
        } else if (limites.generations_quota_type === 'mensuel') {
          const derniereReinit   = profilQuota.derniere_reinit_quota
            ? new Date(profilQuota.derniere_reinit_quota)
            : new Date(0)
          const joursEcoules = (Date.now() - derniereReinit.getTime()) / (1000 * 60 * 60 * 24)
          const updates: Record<string, any> = {
            generations_ia_mois_courant: joursEcoules >= 30
              ? 1
              : (profilQuota.generations_ia_mois_courant ?? 0) + 1,
          }
          if (joursEcoules >= 30) updates.derniere_reinit_quota = new Date().toISOString()
          await supabaseCount.from('utilisateurs').update(updates).eq('id', profilQuota.id)
        }
      } catch { /* non-bloquant */ }
    }

    return NextResponse.json({ contenu: raw, version_normale, version_differenciee })

  } catch (error: any) {
    console.error('Erreur API Anthropic:', error)
    const msg = error?.status === 401
      ? 'Clé API invalide. Vérifiez ANTHROPIC_API_KEY dans .env.local.'
      : error?.status === 429
      ? 'Limite de taux atteinte. Réessayez dans un instant.'
      : error?.message || 'Erreur serveur'
    return NextResponse.json({ contenu: `⚠️ ${msg}` }, { status: 200 })
  }
}
