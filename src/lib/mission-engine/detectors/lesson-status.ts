// ── Mission Engine — Détecteur : Statut des leçons (BETA-07) ────────────────
//
// Génère des missions basées sur les statuts des leçons existantes :
//   - brouillon  → finaliser les brouillons non terminés
//   - a_revoir   → réviser les leçons marquées à revoir
//
// Source : classroom.leconsParStatut (chargé depuis la table lecons).

import type { Mission, MissionEvidence } from '../types'
import type { TeacherSituation }         from '../../teacher-brain/types'

export async function detectLessonStatus(situation: TeacherSituation): Promise<Mission[]> {
  const { classe, matiere, enseignant, classroom, today } = situation

  if (!classe || !matiere) return []

  const enseignantId  = enseignant?.id ?? classe.id
  const classeId      = classe.id
  const statuts       = classroom.leconsParStatut
  const matiereKey    = matiere.toLowerCase().replace(/\s+/g, '_')
  const missions: Mission[] = []

  // ── Brouillons non finalisés ─────────────────────────────────────────────
  const nbBrouillons = statuts['brouillon'] ?? 0
  if (nbBrouillons > 0) {
    const evidence: MissionEvidence[] = [
      {
        source: 'derniere_lecon',
        label:  `${nbBrouillons} brouillon${nbBrouillons > 1 ? 's' : ''} en attente de finalisation`,
      },
    ]

    missions.push({
      id:          `lesson_draft:${enseignantId}:${classeId}:${matiereKey}`,
      type:        'unfinished_document',
      title:       nbBrouillons === 1
                     ? `Finaliser le brouillon de leçon — ${matiere}`
                     : `Finaliser ${nbBrouillons} brouillons — ${matiere}`,
      description: nbBrouillons === 1
                     ? `Une leçon en brouillon attend d'être finalisée dans ${classe.nom}. Ouvrez-la dans ScorgIA pour la compléter.`
                     : `${nbBrouillons} leçons en brouillon dans ${classe.nom} n'ont pas encore été finalisées.`,
      priority:    60,
      status:      'proposed',
      reason: {
        code:        'lessons_in_draft',
        label:       'Brouillons non finalisés',
        description: `${nbBrouillons} leçon${nbBrouillons > 1 ? 's' : ''} en statut brouillon.`,
      },
      createdAt: today,
      metadata:  { action: 'finalize_draft', matiere, classe_id: classeId, count: nbBrouillons },
      evidence,
    })
  }

  // ── Leçons à revoir ──────────────────────────────────────────────────────
  const nbARevoir = statuts['a_revoir'] ?? 0
  if (nbARevoir > 0) {
    const evidence: MissionEvidence[] = [
      {
        source: 'derniere_lecon',
        label:  `${nbARevoir} leçon${nbARevoir > 1 ? 's' : ''} marquée${nbARevoir > 1 ? 's' : ''} à revoir`,
      },
    ]

    missions.push({
      id:          `lesson_review:${enseignantId}:${classeId}:${matiereKey}`,
      type:        'work',
      title:       nbARevoir === 1
                     ? `Réviser la leçon marquée — ${matiere}`
                     : `Réviser ${nbARevoir} leçons — ${matiere}`,
      description: nbARevoir === 1
                     ? `Une leçon dans ${classe.nom} a été marquée « À revoir ». Améliorez-la avec l'aide de ScorgIA.`
                     : `${nbARevoir} leçons dans ${classe.nom} ont été marquées « À revoir » et attendent une révision.`,
      priority:    70,
      status:      'proposed',
      reason: {
        code:        'lessons_to_review',
        label:       'Leçons à réviser',
        description: `${nbARevoir} leçon${nbARevoir > 1 ? 's' : ''} marquée${nbARevoir > 1 ? 's' : ''} à revoir.`,
      },
      createdAt: today,
      metadata:  { action: 'review_lesson', matiere, classe_id: classeId, count: nbARevoir },
      evidence,
    })
  }

  return missions
}
