import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import type { OfficialCurriculum } from '@/lib/types/teaching-pack'

// ─── Curriculums officiels validés par ScorgIA ────────────────────────────────
// RÈGLE : Ne jamais afficher un faux curriculum officiel.
// N'ajouter une entrée ici que lorsqu'un curriculum est réellement validé.
// Pour la bêta, aucun curriculum officiel n'est encore intégré dans la plateforme.
// Les gabarits ScorgIA Alberta (plan annuel, séquence, leçon) existent, mais
// l'ingestion du Programme of Studies complet n'est pas encore implémentée.

const OFFICIAL_CURRICULA: OfficialCurriculum[] = [
  // Exemple de format — à activer lors de la validation réelle :
  // {
  //   id: 'alberta-math-gr5-fr-2023',
  //   province: 'alberta',
  //   matiere: 'Mathématiques',
  //   niveau: '5e année',
  //   langue: 'fr',
  //   version: '2023',
  //   date: '2023-09-01',
  //   source: 'Alberta Education — Programme d\'études',
  //   statut_validation: 'valide',
  //   description: 'Programme de mathématiques 5e année — Alberta Education 2023',
  // },
]

export async function GET(request: Request) {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const province = searchParams.get('province')?.toLowerCase()
  const matiere  = searchParams.get('matiere')
  const niveau   = searchParams.get('niveau')
  const langue   = searchParams.get('langue')

  let results = OFFICIAL_CURRICULA.filter(c => c.statut_validation === 'valide')

  if (province) results = results.filter(c => c.province === province)
  if (matiere)  results = results.filter(c => c.matiere.toLowerCase().includes(matiere.toLowerCase()))
  if (niveau)   results = results.filter(c => c.niveau.toLowerCase().includes(niveau.toLowerCase()))
  if (langue)   results = results.filter(c => c.langue === langue)

  return NextResponse.json({
    success: true,
    curricula: results,
    // Message honnête lorsqu'aucun curriculum n'est disponible
    message_si_vide: "Aucun curriculum officiel ScorgIA n'est encore disponible pour cette combinaison. Téléversez votre document pour continuer.",
  })
}
