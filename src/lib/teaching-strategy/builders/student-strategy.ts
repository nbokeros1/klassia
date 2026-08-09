// ── Teaching Strategy — StudentStrategyBuilder (ME-10) ───────────────────────
//
// Analyse TeacherStudentInsights et retourne le mode stratégique approprié.
// Déterministe — aucun appel IA, aucun réseau.
//
// Conditions de déclenchement REMEDIATION :
//   - hasUsableData = true ET signaux haute priorité présents
//   - hasUsableData = true ET ≥ 3 élèves avec performance préoccupante

import type { TeacherStudentInsights } from '../../teacher-brain/types'
import type { StrategySignal } from '../types'

const PERFORMANCE_CONCERN_THRESHOLD = 3

export class StudentStrategyBuilder {
  analyze(students: TeacherStudentInsights): StrategySignal | null {
    if (!students.hasUsableData || students.totalStudents === 0) return null

    // REMEDIATION : signaux élèves haute priorité
    if (students.highPrioritySignalsCount > 0) {
      return {
        mode: 'REMEDIATION',
        reason: {
          code:        'high_priority_student_signals',
          description: `${students.highPrioritySignalsCount} élève(s) présentent des signaux de haute priorité nécessitant une intervention.`,
          source:      'students',
        },
      }
    }

    // REMEDIATION : plusieurs élèves avec des résultats préoccupants
    if (students.performanceConcernCount >= PERFORMANCE_CONCERN_THRESHOLD) {
      return {
        mode: 'REMEDIATION',
        reason: {
          code:        'performance_concerns',
          description: `${students.performanceConcernCount} élèves ont des résultats nécessitant un suivi renforcé.`,
          source:      'students',
        },
      }
    }

    return null
  }
}
