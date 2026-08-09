// ── Teaching Strategy — CalendarStrategyBuilder (ME-11) ──────────────────────
//
// Analyse TeacherCalendar et retourne le signal stratégique approprié.
// Déterministe — aucun appel IA, aucun réseau.
//
// Conditions de déclenchement :
//   ASSESSMENT_PHASE : échéance d'évaluation urgente (≤ urgentDeadlineDays)
//   END_OF_UNIT      : congé/relâche imminent (≤ breakWindowDays)

import type { TeacherCalendar } from '../../teacher-brain/types'
import type { StrategySignal } from '../types'

const URGENT_EVAL_DAYS = 3
const BREAK_WINDOW     = 7

export class CalendarStrategyBuilder {
  analyze(calendar: TeacherCalendar): StrategySignal | null {
    if (!calendar.hasUsableData) return null

    // ASSESSMENT_PHASE : évaluation imminente
    if (
      calendar.urgentEvalDeadlineCount > 0 &&
      calendar.nearestDeadlineDays !== null &&
      calendar.nearestDeadlineDays <= URGENT_EVAL_DAYS
    ) {
      return {
        mode: 'ASSESSMENT_PHASE',
        reason: {
          code:        'urgent_evaluation_deadline',
          description: `${calendar.urgentEvalDeadlineCount} évaluation(s) dans ≤ ${calendar.nearestDeadlineDays} jour(s) — priorité aux évaluations.`,
          source:      'calendar',
        },
      }
    }

    // END_OF_UNIT : relâche ou congé imminent → clore les unités en cours
    if (
      calendar.nearestBreakDays !== null &&
      calendar.nearestBreakDays <= BREAK_WINDOW
    ) {
      return {
        mode: 'END_OF_UNIT',
        reason: {
          code:        'upcoming_break',
          description: `Congé/relâche dans ${calendar.nearestBreakDays} jour(s) — clôturer l'unité en cours.`,
          source:      'calendar',
        },
      }
    }

    return null
  }
}
