import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMaxTokens } from '@/lib/ia/get-max-tokens'

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Clé API Anthropic manquante' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profil } = await supabase
    .from('utilisateurs').select('id, forfait, profil_ia').eq('user_id', session.user.id).single()

  if (!profil || !['pro_plus', 'institution'].includes(profil.forfait || '')) {
    return NextResponse.json({ error: 'Fonctionnalité Pro+ requise' }, { status: 403 })
  }

  const body = await request.json()
  const { lecon_id, sujet, niveau, matiere, duree, langue } = body

  if (!sujet) return NextResponse.json({ error: 'Sujet requis' }, { status: 400 })

  const client = new Anthropic({ apiKey })
  const isFr   = (langue || 'fr') !== 'en'

  const ctx = isFr
    ? `Sujet : ${sujet}\nNiveau : ${niveau || 'non spécifié'}\nMatière : ${matiere || 'non spécifiée'}\nDurée : ${duree || 75} min\nStyle : ${(profil.profil_ia as any)?.style_peda || 'explicite'}`
    : `Subject: ${sujet}\nLevel: ${niveau || 'unspecified'}\nSubject area: ${matiere || 'unspecified'}\nDuration: ${duree || 75} min`

  // Helper : génère un élément simple
  const gen = async (prompt: string, maxTokens: number): Promise<string> => {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    })
    return (msg.content[0] as any).text || ''
  }

  // ── Vague 1 : Plan seul (les autres en dépendent) ─────────────────────────
  const plan = await gen(
    isFr
      ? `${ctx}\n\nGénère un plan de leçon structuré AVANT/PENDANT/APRÈS. Format HTML avec sections claires.`
      : `${ctx}\n\nGenerate a structured lesson plan BEFORE/DURING/AFTER. HTML format.`,
    getMaxTokens('plan_lecon')
  )

  // ── Vague 2 : Éléments dépendants du plan, en parallèle ───────────────────
  const planCtx = isFr
    ? `${ctx}\n\nPlan de leçon de référence :\n${plan.replace(/<[^>]+>/g, ' ').substring(0, 800)}`
    : `${ctx}\n\nReference lesson plan:\n${plan.replace(/<[^>]+>/g, ' ').substring(0, 800)}`

  const [lecon, activite, quizRaw, devoir] = await Promise.all([

    // Leçon complète basée sur le plan
    gen(
      isFr
        ? `${planCtx}\n\nGénère une leçon complète selon les 5 étapes de Bruner : Engagement, Exploration, Explication, Élaboration, Évaluation. Activités et exemples inclus. Format HTML.`
        : `${planCtx}\n\nGenerate a complete lesson using Bruner's 5E model. Include activities and examples. HTML format.`,
      getMaxTokens('lecon_complete')
    ),

    // Activité de groupe
    gen(
      isFr
        ? `${planCtx}\n\nGénère une activité de groupe collaborative (3-4 étapes, matériel, rôles, consignes, différenciation). Format HTML.`
        : `${planCtx}\n\nGenerate a collaborative group activity (steps, materials, roles, instructions). HTML format.`,
      getMaxTokens('activite_groupe')
    ),

    // Quiz JSON
    gen(
      isFr
        ? `${planCtx}\n\nGénère un quiz de 10 questions à choix multiples (4 options) avec corrigé. Réponds UNIQUEMENT en JSON valide :\n{"questions":[{"question":"...","options":["A","B","C","D"],"reponse_correcte":0,"explication":"..."}]}`
        : `${planCtx}\n\nGenerate a 10-question multiple-choice quiz with answer key. Reply ONLY in valid JSON: {"questions":[{"question":"...","options":["A","B","C","D"],"reponse_correcte":0,"explication":"..."}]}`,
      getMaxTokens('quiz')
    ),

    // Devoir différencié
    gen(
      isFr
        ? `${planCtx}\n\nGénère un devoir différencié (3 niveaux : Base, Intermédiaire, Enrichissement). Format HTML.`
        : `${planCtx}\n\nGenerate a differentiated homework (3 levels: Basic, Intermediate, Enrichment). HTML format.`,
      getMaxTokens('devoir')
    ),
  ])

  // ── Vague 3 : Corrigé basé sur quiz + devoir ──────────────────────────────
  const corrige = await gen(
    isFr
      ? `${ctx}\n\nGénère un corrigé complet pour l'enseignant(e), incluant réponses attendues, indicateurs de réussite et suggestions de rétroaction. Basé sur ce devoir :\n${devoir.replace(/<[^>]+>/g, ' ').substring(0, 600)}\n\nFormat HTML.`
      : `${ctx}\n\nGenerate a complete answer key with expected answers, success indicators, and feedback suggestions. HTML format.`,
    getMaxTokens('evaluation')
  )

  // ── Parse quiz JSON ────────────────────────────────────────────────────────
  let quizJson: any = null
  try {
    const jsonMatch = quizRaw.match(/\{[\s\S]*\}/)
    if (jsonMatch) quizJson = JSON.parse(jsonMatch[0])
  } catch {
    quizJson = null
  }

  // ── Sauvegardes automatiques ───────────────────────────────────────────────
  let quizId: string | null = null
  let activiteId: string | null = null

  if (quizJson?.questions?.length) {
    const { data: newQuiz } = await supabase.from('quiz').insert({
      enseignant_id: profil.id,
      lecon_id:      lecon_id || null,
      titre:         `Quiz — ${sujet}`,
      questions:     quizJson.questions,
      langue:        langue || 'fr',
    }).select('id').single()
    quizId = newQuiz?.id || null
  }

  try {
    const { data: newActivite } = await supabase.from('activites').insert({
      enseignant_id: profil.id,
      lecon_id:      lecon_id || null,
      titre:         `Activité — ${sujet}`,
      contenu_html:  activite,
      type:          'groupe',
      langue:        langue || 'fr',
    }).select('id').single()
    activiteId = newActivite?.id || null
  } catch {
    activiteId = null
  }

  // ── BLOC 13 — Tâche auto après kit complet ────────────────────────────────
  try {
    const nbEleves   = (body.nb_eleves as number) || (profil.profil_ia as any)?.groupes_typiques || 25
    const datePrevue = body.date_prevue as string | undefined
    const dateEcheance = datePrevue
      ? new Date(new Date(datePrevue).getTime() - 86400000).toISOString().split('T')[0]
      : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    await supabase.from('taches_enseignant').insert({
      enseignant_id: profil.id,
      titre:         `Imprimer ${nbEleves} exemplaires : ${sujet}`,
      type:          'imprimer',
      date_echeance: dateEcheance,
      auto_generee:  true,
      est_complete:  false,
    } as any)
  } catch { /* non-bloquant */ }

  // ── Réponse ───────────────────────────────────────────────────────────────
  return NextResponse.json({
    kit_id:          `kit_${Date.now()}`,
    lecon_id:        lecon_id || null,
    elements: {
      plan,
      lecon,
      activite,
      quiz: quizJson,
      quiz_html: quizRaw,
      devoir,
      corrige,
    },
    ids: {
      quiz_id:     quizId,
      activite_id: activiteId,
    },
    sauvegarde_auto: true,
  })
}
