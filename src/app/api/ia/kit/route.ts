import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const ctx = `
Sujet : ${sujet}
Niveau : ${niveau || 'non spécifié'}
Matière : ${matiere || 'non spécifiée'}
Durée typique : ${duree || 75} minutes
Style pédagogique : ${profil.profil_ia?.style_peda || 'explicite'}
`.trim()

  // ── Helper : generate one item ────────────────────────────────────────────────
  const gen = async (prompt: string, max = 2000): Promise<string> => {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: max,
      messages: [{ role: 'user', content: prompt }],
    })
    return (msg.content[0] as any).text || ''
  }

  // ── 6 éléments en parallèle ───────────────────────────────────────────────────
  const [plan, lecon, activite, quizRaw, devoir, corrige] = await Promise.all([

    // 1. Plan de leçon
    gen(`${ctx}\n\nGénère un plan de leçon structuré AVANT/PENDANT/APRÈS pour ce sujet en ${isFr ? 'français' : 'anglais'}. Format HTML.`, 1800),

    // 2. Leçon complète (5 étapes Bruner)
    gen(`${ctx}\n\nGénère une leçon complète selon les 5 étapes de Bruner : Engagement, Exploration, Explication, Élaboration, Évaluation. Inclure activités et exemples. Format HTML.`, 3000),

    // 3. Activité de groupe
    gen(`${ctx}\n\nGénère une activité de groupe collaborative (3-4 étapes, matériel, rôles, consignes, variantes de différenciation). Format HTML.`, 1500),

    // 4. Quiz 10 questions JSON
    gen(`${ctx}\n\nGénère un quiz de 10 questions à choix multiples (4 options chacune) avec le corrigé. Réponds UNIQUEMENT en JSON valide dans ce format: {"questions":[{"question":"...","options":["A","B","C","D"],"reponse_correcte":0,"explication":"..."}]}`, 2000),

    // 5. Devoir différencié
    gen(`${ctx}\n\nGénère un devoir différencié avec 3 niveaux : Base, Intermédiaire, Enrichissement. Chaque niveau adapté à différents besoins. Format HTML.`, 1500),

    // 6. Corrigé complet
    gen(`${ctx}\n\nGénère un corrigé complet et détaillé pour l'enseignant(e), incluant les réponses attendues, les indicateurs de réussite et les suggestions de rétroaction. Format HTML.`, 1500),
  ])

  // ── Parse quiz JSON ───────────────────────────────────────────────────────────
  let quizJson: any = null
  try {
    const jsonMatch = quizRaw.match(/\{[\s\S]*\}/)
    if (jsonMatch) quizJson = JSON.parse(jsonMatch[0])
  } catch {
    quizJson = null
  }

  // ── Sauvegardes automatiques ──────────────────────────────────────────────────
  let quizId: string | null = null
  let activiteId: string | null = null

  // Sauvegarder le quiz
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

  // Sauvegarder l'activité
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

  // ── BLOC 13 — Tâche auto après kit complet ────────────────────────────────────
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

  // ── Réponse ───────────────────────────────────────────────────────────────────
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
