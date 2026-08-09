// ── Mission Engine — Détecteur : Suivi Élèves (ME-09) ────────────────────────
//
// 6 cas métier (cascade — seul le premier cas applicable retourne une mission) :
//
//   Cas 0 : pas de données utilisables OU confidence < 0.50  → []
//   Cas 1 : signaux haute priorité                           → p=92
//   Cas 2 : travaux manquants                                → p=87
//   Cas 3 : préoccupations de présence                       → p=84
//   Cas 4 : préoccupations de performance                    → p=83
//   Cas 5 : aucun signal                                     → []
//
// CONFIDENTIALITÉ : les noms d'élèves n'apparaissent PAS dans les missions.
// Les IDs sont inclus dans metadata pour un éventuel affichage interne sécurisé.

import type { Mission, MissionEvidence } from '../types'
import type { TeacherSituation } from '../../teacher-brain/types'
import { normaliser } from '../../pedagogy/shared/text-utils'

const STUDENT_CONFIDENCE_THRESHOLD = 0.50

function buildMissionId(
  type:         string,
  classeId:     string,
  matiere:      string,
  suffix?:      string,
): string {
  const matiereNorm = normaliser(matiere).replace(/ /g, '_')
  return suffix
    ? `${type}:${classeId}:${matiereNorm}:${suffix}`
    : `${type}:${classeId}:${matiereNorm}`
}

export async function detectStudentFollowUp(
  situation: TeacherSituation,
): Promise<Mission[]> {
  const { classe, matiere, today, students } = situation

  // ── Cas 0 : données insuffisantes ─────────────────────────────────────────
  if (!classe || !matiere)             return []
  if (!students.hasUsableData)         return []
  if (students.confidence < STUDENT_CONFIDENCE_THRESHOLD) return []
  if (students.totalStudents === 0)    return []

  const classeId = classe.id
  const classeNom = classe.nom

  // ── Cas 1 : signaux haute priorité (p=92) ─────────────────────────────────
  if (students.highPrioritySignalsCount > 0) {
    const id = buildMissionId('student_follow_up', classeId, matiere, 'high_priority')

    const evidence: MissionEvidence[] = [
      {
        source: 'attendance',
        label:  `${students.highPrioritySignalsCount} signal(s) de haute priorité détecté(s)`,
        valeur: String(students.highPrioritySignalsCount),
      },
    ]

    if (students.attendanceConcernCount > 0) {
      evidence.push({
        source: 'attendance',
        label:  `${students.attendanceConcernCount} élève(s) avec des préoccupations de présence`,
        valeur: String(students.attendanceConcernCount),
      })
    }
    if (students.performanceConcernCount > 0) {
      evidence.push({
        source: 'student_results',
        label:  `${students.performanceConcernCount} élève(s) avec des préoccupations de performance`,
        valeur: String(students.performanceConcernCount),
      })
    }

    return [{
      id,
      type:        'student_follow_up',
      title:       `Suivi prioritaire — ${classeNom}`,
      description: `${students.highPrioritySignalsCount} élève(s) de ${classeNom} présentent des signaux nécessitant un suivi immédiat.`,
      priority:    92,
      status:      'proposed',
      reason: {
        code:        'student_high_priority',
        label:       'Signaux élèves prioritaires',
        description: `ScorgIA a détecté ${students.highPrioritySignalsCount} signal(s) de haute priorité pour ${classeNom}.`,
      },
      createdAt: today,
      metadata: {
        matiere,
        classe_id:              classeId,
        high_priority_count:    students.highPrioritySignalsCount,
        signals_count:          students.signalsCount,
        attendance_concern:     students.attendanceConcernCount,
        performance_concern:    students.performanceConcernCount,
        missing_work_concern:   students.missingWorkConcernCount,
        priority_student_ids:   students.priorityStudents.map(s => s.studentId),
      },
      evidence,
    }]
  }

  // ── Cas 2 : travaux manquants (p=87) ──────────────────────────────────────
  if (students.missingWorkConcernCount > 0) {
    const id = buildMissionId('student_follow_up', classeId, matiere, 'missing_work')

    return [{
      id,
      type:        'student_follow_up',
      title:       `Travaux non remis — ${classeNom}`,
      description: `${students.missingWorkConcernCount} élève(s) de ${classeNom} ont des travaux non remis ou en retard.`,
      priority:    87,
      status:      'proposed',
      reason: {
        code:        'student_missing_work',
        label:       'Travaux non remis',
        description: `${students.missingWorkConcernCount} élève(s) de ${classeNom} n'ont pas remis les travaux demandés.`,
      },
      createdAt: today,
      metadata: {
        matiere,
        classe_id:             classeId,
        missing_work_count:    students.missingWorkConcernCount,
        signals_count:         students.signalsCount,
        priority_student_ids:  students.priorityStudents
          .filter(s => s.reasons.some(r => r.type === 'missing_work'))
          .map(s => s.studentId),
      },
      evidence: [{
        source: 'student_work',
        label:  `${students.missingWorkConcernCount} élève(s) avec des travaux non remis`,
        valeur: String(students.missingWorkConcernCount),
      }],
    }]
  }

  // ── Cas 3 : préoccupations de présence (p=84) ─────────────────────────────
  if (students.attendanceConcernCount > 0) {
    const id = buildMissionId('student_follow_up', classeId, matiere, 'attendance')

    return [{
      id,
      type:        'student_follow_up',
      title:       `Présence à surveiller — ${classeNom}`,
      description: `${students.attendanceConcernCount} élève(s) de ${classeNom} ont des absences ou retards répétés.`,
      priority:    84,
      status:      'proposed',
      reason: {
        code:        'student_attendance',
        label:       'Absences répétées',
        description: `${students.attendanceConcernCount} élève(s) de ${classeNom} montrent un pattern d'absentéisme ou de retards.`,
      },
      createdAt: today,
      metadata: {
        matiere,
        classe_id:             classeId,
        attendance_count:      students.attendanceConcernCount,
        recent_attendance_rate: students.recentAttendanceRate,
        priority_student_ids:  students.priorityStudents
          .filter(s => s.reasons.some(r => r.type === 'repeated_absence' || r.type === 'repeated_lateness'))
          .map(s => s.studentId),
      },
      evidence: [{
        source: 'attendance',
        label:  `${students.attendanceConcernCount} élève(s) avec absences ou retards répétés`,
        valeur: String(students.attendanceConcernCount),
      }],
    }]
  }

  // ── Cas 4 : préoccupations de performance (p=83) ──────────────────────────
  if (students.performanceConcernCount > 0) {
    const id = buildMissionId('student_follow_up', classeId, matiere, 'performance')

    return [{
      id,
      type:        'student_follow_up',
      title:       `Performance à accompagner — ${classeNom}`,
      description: `${students.performanceConcernCount} élève(s) de ${classeNom} présentent des résultats nécessitant un suivi.`,
      priority:    83,
      status:      'proposed',
      reason: {
        code:        'student_performance',
        label:       'Résultats à accompagner',
        description: `${students.performanceConcernCount} élève(s) de ${classeNom} ont des résultats en deçà du seuil attendu ou en déclin.`,
      },
      createdAt: today,
      metadata: {
        matiere,
        classe_id:             classeId,
        performance_count:     students.performanceConcernCount,
        average_performance:   students.averagePerformance,
        priority_student_ids:  students.priorityStudents
          .filter(s => s.reasons.some(r => r.type === 'low_performance' || r.type === 'declining_performance'))
          .map(s => s.studentId),
      },
      evidence: [{
        source: 'student_results',
        label:  `${students.performanceConcernCount} élève(s) avec des résultats à accompagner`,
        valeur: String(students.performanceConcernCount),
      }],
    }]
  }

  // ── Cas 5 : aucun signal ──────────────────────────────────────────────────
  return []
}
