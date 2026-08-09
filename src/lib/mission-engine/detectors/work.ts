// ── Mission Engine — Détecteur : Travaux (ME-07, refactorisé ME-08) ──────────
//
// 4 cas métier (priorité décroissante) :
//   Cas 1 : travaux en attente de correction      → Corriger les travaux       (p=88)
//   Cas 2 : uniquement des travaux en retard      → Traiter les devoirs         (p=86)
//   Cas 3 : corrections terminées, pas de feedback → Ajouter une rétroaction   (p=75)
//   Cas 4 : aucun problème                        → []
//
// ME-08 : reçoit TeacherSituation — plus d'appels directs au PIL.

import type { Mission, MissionEvidence } from '../types'
import type { TeacherSituation } from '../../teacher-brain/types'
import { normaliser } from '../../pedagogy/shared/text-utils'

function buildMissionId(
  prefix:       string,
  enseignantId: string,
  classeId:     string,
  matiere:      string,
): string {
  const matiereNorm = normaliser(matiere).replace(/ /g, '_')
  return `${prefix}:${enseignantId}:${classeId}:${matiereNorm}`
}

export async function detectWork(situation: TeacherSituation): Promise<Mission[]> {
  const { classe, matiere, enseignant, today } = situation
  const { workload, classroom } = situation

  if (!classe || !matiere) return []
  if (classroom.assignmentsCount === 0) return []

  const enseignantId = enseignant?.id ?? classe.id
  const classeId     = classe.id

  const {
    pendingAssignments,
    overdueAssignments,
    ungradedAssignments,
    assignmentsWithoutFeedback,
  } = workload

  // ── Cas 1 : travaux en attente de correction (priorité 88) ────────────────
  if (pendingAssignments.length > 0) {
    const totalUngraded = ungradedAssignments.length
    const id = buildMissionId('work_ungraded', enseignantId, classeId, matiere)

    const evidence: MissionEvidence[] = [
      {
        source: 'assignment',
        label:  `${totalUngraded} travail(aux) non corrigé(s)`,
        valeur: String(totalUngraded),
      },
    ]
    if (overdueAssignments.length > 0) {
      evidence.push({
        source: 'assignment',
        label:  `dont ${overdueAssignments.length} en retard`,
        valeur: String(overdueAssignments.length),
      })
    }

    return [{
      id,
      type:        'work',
      title:       `Corriger les travaux — ${matiere}`,
      description: `${totalUngraded} travail(aux) de ${classe.nom} attendent d'être corrigé(s).`,
      priority:    88,
      status:      'proposed',
      reason: {
        code:        'work_ungraded',
        label:       'Travaux non corrigés',
        description: `ScorgIA a détecté ${totalUngraded} travail(aux) non corrigé(s) pour ${classe.nom} en ${matiere}.`,
      },
      createdAt: today,
      metadata: {
        action:          'grade_assignments',
        matiere,
        classe_id:       classeId,
        assignmentCount: totalUngraded,
        overdueCount:    overdueAssignments.length,
        feedbackCount:   assignmentsWithoutFeedback.length,
      },
      evidence,
    }]
  }

  // ── Cas 2 : uniquement overdue (priorité 86) ──────────────────────────────
  if (overdueAssignments.length > 0) {
    const id = buildMissionId('work_overdue', enseignantId, classeId, matiere)

    const evidence: MissionEvidence[] = [
      {
        source:     'assignment',
        label:      `${overdueAssignments.length} travail(aux) en retard`,
        valeur:     String(overdueAssignments.length),
        documentId: overdueAssignments[0].id,
      },
    ]

    return [{
      id,
      type:        'work',
      title:       `Traiter les devoirs en attente — ${matiere}`,
      description: `${overdueAssignments.length} devoir(s) de ${classe.nom} dépasse(nt) la date limite sans avoir été traité(s).`,
      priority:    86,
      status:      'proposed',
      reason: {
        code:        'work_overdue',
        label:       'Travaux en retard',
        description: `${overdueAssignments.length} travail(aux) de ${classe.nom} dépasse(nt) la date limite prévue.`,
      },
      createdAt: today,
      metadata: {
        action:          'process_overdue',
        matiere,
        classe_id:       classeId,
        assignmentCount: overdueAssignments.length,
        overdueCount:    overdueAssignments.length,
        feedbackCount:   0,
      },
      evidence,
    }]
  }

  // ── Cas 3 : corrections terminées, pas de rétroaction (priorité 75) ───────
  if (workload.feedbackBacklog > 0) {
    const count = workload.feedbackBacklog
    const id = buildMissionId('work_feedback', enseignantId, classeId, matiere)

    const evidence: MissionEvidence[] = [
      {
        source: 'feedback',
        label:  `${count} travail(aux) corrigé(s) sans rétroaction`,
        valeur: String(count),
      },
      {
        source: 'progression',
        label:  `${classroom.assignmentsCount} travail(aux) analysé(s) au total`,
        valeur: String(classroom.assignmentsCount),
      },
    ]

    return [{
      id,
      type:        'work',
      title:       `Ajouter une rétroaction aux élèves — ${matiere}`,
      description: `${count} travail(aux) de ${classe.nom} ont été corrigé(s) mais les élèves n'ont pas encore reçu de commentaires.`,
      priority:    75,
      status:      'proposed',
      reason: {
        code:        'work_feedback_missing',
        label:       'Rétroaction manquante',
        description: `${count} travail(aux) corrigé(s) n'ont pas encore reçu de rétroaction. La rétroaction améliore la progression des élèves.`,
      },
      createdAt: today,
      metadata: {
        action:          'add_feedback',
        matiere,
        classe_id:       classeId,
        assignmentCount: count,
        overdueCount:    0,
        feedbackCount:   count,
      },
      evidence,
    }]
  }

  return []
}
