import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api-auth'
import { sanitizeEleveDifferenciationContext } from '@/lib/pedagogy/privacy/student-ai-context'

export const maxDuration = 120
import { getMaxTokens } from '@/lib/ia/get-max-tokens'
import { buildSystemPrompt } from '@/lib/ia/build-system-prompt'
import { construireSectionsSkills } from '@/lib/ia/skills-pedagogiques'
import { peutGenererContenu, LIMITES_FORFAIT } from '@/lib/hooks/useForfait'
import type { ForfaitType } from '@/lib/types/database'

export async function POST(request: Request) {
  // P0-01 — authentication required before any AI call
  const { error: authError, user } = await requireAuth()
  if (authError || !user) {
    return authError ?? NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

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
    const { data: qProfil } = await supabaseQuota
      .from('utilisateurs')
      .select('id, forfait, is_admin, generations_ia_total_a_vie, generations_ia_mois_courant, derniere_reinit_quota')
      .eq('user_id', user.id)
      .single()
    profilQuota = qProfil
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
      const { data: userProfilMem } = await supabaseMem
        .from('utilisateurs').select('id, province').eq('user_id', user.id).single()
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
    } catch { /* non-bloquant */ }

    // ── Différenciation (P0-02 — sanitisé : sans notes_enseignant, sans termes médicaux) ──
    const elevesABesoins: import('@/lib/pedagogy/privacy/student-ai-context').EleveProfilSanitise[] =
      (profils_eleves || [])
        .filter((e: any) => e.profil_type !== 'standard')
        .map(sanitizeEleveDifferenciationContext)
    const differenciationSection = elevesABesoins.length > 0
      ? (isFr
          ? `\n\nÉlèves à besoins particuliers :\n${
              elevesABesoins.map((e) =>
                `- ${e.profil_type_safe}${e.besoins_safe.length ? ': ' + e.besoins_safe.join(', ') : ''}`
              ).join('\n')
            }\nGénère deux versions séparées par :\n=== VERSION DIFFÉRENCIÉE ===`
          : `\n\nStudents with special needs:\n${elevesABesoins.map((e) => e.profil_type_safe).join(', ')}\nGenerate two versions separated by:\n=== VERSION DIFFÉRENCIÉE ===`)
      : ''

    // ── Intro langue ─────────────────────────────────────────────────────────
    const introLangue = isFr
      ? `LANGUE DE TRAVAIL : Français canadien. Tu dois TOUJOURS répondre en français canadien et utiliser la terminologie pédagogique albertaine/québécoise.`
      : `WORKING LANGUAGE: Canadian English. You must ALWAYS respond in English using Alberta/Canadian pedagogical terminology.`

    // ── System prompt ─────────────────────────────────────────────────────────
    const LESSON_TYPES = ['lecon_complete', 'fiche_lecon', 'plan_lecon', 'plan_sequence', 'activite_groupe']
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

    // Override de format — doit être EN DERNIER pour écraser les emojis de construireSectionsSkills
    const formatOverride = LESSON_TYPES.includes(type_contenu || '') ? (isFr ? `

⚠️ PRIORITÉ ABSOLUE — FORMAT FINAL (écrase toute autre instruction) :
• Utilise UNIQUEMENT la structure 7 blocs en tableaux Markdown définie ci-dessus (AVANT / PENDANT / APRÈS).
• AUCUN emoji dans ta réponse — ni dans les en-têtes, ni dans les cellules, nulle part.
• AUCUNE section hors gabarit (pas de "Réflexion", pas de "Section 5", pas de titre standalone, pas de liste hors tableaux).
• AUCUN schéma SVG.
• Les compétences et perspectives listées ci-dessus sont un CONTEXTE de contenu : intègre leur SUBSTANCE dans les cellules du gabarit — ne les recopie jamais comme sections séparées.` : `

⚠️ ABSOLUTE PRIORITY — FINAL FORMAT (overrides all previous instructions):
• Use ONLY the 7-block Markdown table structure defined above (BEFORE / DURING / AFTER).
• NO emojis anywhere — not in headers, not in cells.
• NO sections outside the template.
• NO inline SVG.
• Competencies and perspectives listed above are CONTENT CONTEXT only: integrate their substance into the template cells.`) : ''

    const systemPrompt =
      introLangue + '\n\n' +
      buildSystemPrompt(type_contenu, profil_ia, profil_ia?.gabarit_lecon_analyse) +
      differenciationSection +
      memoireSection +
      sectionsSkills +
      formatOverride

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
        const { data: userProfil } = await supabaseServer
          .from('utilisateurs').select('id').eq('user_id', user.id).single()
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
