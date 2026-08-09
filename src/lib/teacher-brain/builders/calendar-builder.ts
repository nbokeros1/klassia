// ── Teacher Brain — CalendarBuilder (ME-11) ───────────────────────────────────
//
// Convertit CalendarAnalysis → TeacherCalendar.
// Déterministe — aucun appel réseau.

import type { CalendarAnalysis } from '../../pedagogy/calendar/calendar-analyzer'
import type { TeacherCalendar } from '../types'

export class CalendarBuilder {
  build(analysis: CalendarAnalysis): TeacherCalendar {
    return {
      hasUsableData:           analysis.hasUsableData,
      upcomingDeadlines:       analysis.upcomingDeadlines,
      upcomingBreaks:          analysis.upcomingBreaks,
      urgentDeadlineCount:     analysis.urgentDeadlineCount,
      urgentEvalDeadlineCount: analysis.urgentEvalDeadlineCount,
      urgentSubmissionCount:   analysis.urgentSubmissionCount,
      nearestDeadlineDays:     analysis.nearestDeadlineDays,
      nearestBreakDays:        analysis.nearestBreakDays,
      confidence:              analysis.confidence,
    }
  }
}
