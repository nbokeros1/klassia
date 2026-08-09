// ─── SPIE-BETA-03 M13 — Transfert quiz DetailedLesson → table quiz ────────────
// POST { fichier_id }
// Crée un quiz + les questions dans les tables quiz/questions_quiz.
// Retourne { quiz_id } pour rediriger vers /dashboard/outils/quiz/[id]
//
// RÈGLES :
// - RLS : seul l'enseignant propriétaire peut créer un quiz depuis sa leçon
// - Ne jamais afficher "Powered by Claude"

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { requireEntitlement }    from '@/lib/spie-access'
import type { DetailedLesson }   from '@/lib/types/detailed-lesson'

export async function POST(req: NextRequest) {
  const { error: authError, user } = await requireAuth()
  if (authError || !user) return authError ?? NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.fichier_id) return NextResponse.json({ error: 'fichier_id requis' }, { status: 400 })

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: profil } = await supabase
    .from('utilisateurs').select('id, forfait, is_admin')
    .eq('user_id', user.id).single()
  if (!profil) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

  const denied = requireEntitlement('create_quiz_from_lesson', profil.forfait, profil.is_admin)
  if (denied) return denied

  // Charger le fichier lecon_detaillee
  const { data: fichier } = await supabase
    .from('fichiers_dossier')
    .select('id, contenu_json, enseignant_id, teaching_pack_id')
    .eq('id', body.fichier_id)
    .eq('enseignant_id', profil.id)
    .single()

  if (!fichier?.contenu_json) {
    return NextResponse.json({ error: 'Leçon détaillée introuvable' }, { status: 404 })
  }

  const lecon = fichier.contenu_json as DetailedLesson

  if (!lecon.quiz?.questions?.length) {
    return NextResponse.json({ error: 'Cette leçon ne contient pas de quiz' }, { status: 400 })
  }

  // Trouver la classe_id depuis le teaching_pack
  let classeId: string | null = null
  if (fichier.teaching_pack_id) {
    const { data: tp } = await supabase
      .from('teaching_packs').select('classe_id').eq('id', fichier.teaching_pack_id).single()
    classeId = tp?.classe_id ?? null
  }

  // Créer le quiz
  const { data: newQuiz, error: quizErr } = await supabase
    .from('quiz').insert({
      enseignant_id:  profil.id,
      classe_id:      classeId,
      titre:          lecon.quiz.titre ?? `Quiz — ${lecon.titre}`,
      statut:         'brouillon',
      mode:           'equipe',
      mode_revision:  false,
      afficher_explication: true,
      source:         'ia',
      langue:         lecon.langue ?? 'fr',
    }).select('id').single()

  if (quizErr || !newQuiz) {
    console.error('[lesson-to-quiz] quiz insert error:', quizErr)
    return NextResponse.json({ error: 'Erreur création quiz' }, { status: 500 })
  }

  // Insérer les questions
  const qRows = lecon.quiz.questions.map((q, i) => ({
    quiz_id:        newQuiz.id,
    ordre:          q.ordre ?? i + 1,
    type:           q.type,
    enonce:         q.enonce,
    options:        q.options ?? null,
    bonne_reponse:  String(q.bonne_reponse),
    explication:    q.explication ?? null,
    ras_lie:        q.ras_lie ?? null,
    points:         q.points ?? 1000,
    duree_secondes: q.duree_secondes ?? 20,
  }))

  if (qRows.length) {
    const { error: qErr } = await supabase.from('questions_quiz').insert(qRows)
    if (qErr) {
      console.error('[lesson-to-quiz] questions insert error:', qErr)
      // Nettoyer le quiz orphelin
      await supabase.from('quiz').delete().eq('id', newQuiz.id)
      return NextResponse.json({ error: 'Erreur insertion questions' }, { status: 500 })
    }
  }

  return NextResponse.json({ quiz_id: newQuiz.id })
}
