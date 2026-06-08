import { createClient } from '@/lib/supabase/client'

// Vérifie si un quiz existe pour la leçon, et si oui, crée une tâche "Quiz prêt à diffuser"
export async function creerTacheQuizPret(
  enseignantId: string,
  leconTitre:   string,
  leconId:      string,
  datePrevue?:  string,
) {
  const supabase = createClient()

  const { data: quiz } = await supabase
    .from('quiz').select('id').eq('lecon_id', leconId).limit(1)
  if (!quiz?.length) return

  const date = datePrevue
    ? new Date(datePrevue).toISOString().split('T')[0]
    : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  await supabase.from('taches_enseignant').insert({
    enseignant_id: enseignantId,
    titre:         `Quiz prêt à diffuser : ${leconTitre}`,
    type:          'rappel',
    date_echeance: date,
    auto_generee:  true,
    est_complete:  false,
  } as any)
}
