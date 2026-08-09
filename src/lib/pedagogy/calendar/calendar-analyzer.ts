// ── Calendar Analyzer (ME-11) ─────────────────────────────────────────────────
//
// Analyse les événements et échéances calendrier — déterministe, aucun appel LLM.
// Entrées : CalendarEventSnapshot[], CalendarDeadlineSnapshot[], today: Date
// Sortie  : CalendarAnalysis

import type { CalendarEventSnapshot, CalendarDeadlineSnapshot } from './types'
import {
  DEFAULT_CALENDAR_INTELLIGENCE_CONFIG,
  type CalendarIntelligenceConfig,
} from './calendar-intelligence-config'

export interface CalendarAnalysis {
  hasUsableData:           boolean
  totalEvents:             number
  upcomingDeadlines:       CalendarDeadlineSnapshot[]
  upcomingBreaks:          CalendarEventSnapshot[]
  urgentDeadlineCount:     number
  urgentEvalDeadlineCount: number
  urgentSubmissionCount:   number
  nearestDeadlineDays:     number | null
  nearestBreakDays:        number | null
  confidence:              number
}

const BREAK_TYPES = new Set(['conge', 'ferie', 'calendrier_scolaire'])

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime()
  return Math.floor(ms / 86_400_000)
}

export class CalendarAnalyzer {
  private config: CalendarIntelligenceConfig

  constructor(config: Partial<CalendarIntelligenceConfig> = {}) {
    this.config = { ...DEFAULT_CALENDAR_INTELLIGENCE_CONFIG, ...config }
  }

  analyze(
    events: CalendarEventSnapshot[],
    deadlines: CalendarDeadlineSnapshot[],
    today: Date,
  ): CalendarAnalysis {
    const hasUsableData = events.length > 0 || deadlines.length > 0

    if (!hasUsableData) {
      return {
        hasUsableData:           false,
        totalEvents:             0,
        upcomingDeadlines:       [],
        upcomingBreaks:          [],
        urgentDeadlineCount:     0,
        urgentEvalDeadlineCount: 0,
        urgentSubmissionCount:   0,
        nearestDeadlineDays:     null,
        nearestBreakDays:        null,
        confidence:              0.0,
      }
    }

    // Échéances à venir (urgencyDays >= 0)
    const upcomingDeadlines = deadlines
      .filter(d => d.urgencyDays >= 0)
      .sort((a, b) => a.urgencyDays - b.urgencyDays)

    // Échéances urgentes (dans ≤ urgentDeadlineDays)
    const urgentDeadlines = upcomingDeadlines.filter(
      d => d.urgencyDays <= this.config.urgentDeadlineDays,
    )
    const urgentEvalDeadlineCount = urgentDeadlines.filter(d => d.type === 'evaluation').length
    const urgentSubmissionCount   = urgentDeadlines.filter(d => d.type === 'devoir').length
    const urgentDeadlineCount     = urgentDeadlines.length

    // Congés et fériés dans la fenêtre breakWindowDays
    const upcomingBreaks = events.filter(e => {
      if (!BREAK_TYPES.has(e.type)) return false
      const daysAway = daysBetween(today, e.dateDebut)
      return daysAway >= 0 && daysAway <= this.config.breakWindowDays
    }).sort((a, b) => a.dateDebut.getTime() - b.dateDebut.getTime())

    const nearestDeadlineDays = upcomingDeadlines.length > 0
      ? upcomingDeadlines[0].urgencyDays
      : null

    const nearestBreakDays = upcomingBreaks.length > 0
      ? daysBetween(today, upcomingBreaks[0].dateDebut)
      : null

    // Confiance : présence de données qualifiées
    let confidence: number
    if (urgentDeadlineCount > 0) {
      confidence = 0.9
    } else if (upcomingDeadlines.length > 0) {
      confidence = 0.8
    } else if (events.length > 0) {
      confidence = 0.5
    } else {
      confidence = 0.0
    }

    return {
      hasUsableData:           true,
      totalEvents:             events.length,
      upcomingDeadlines,
      upcomingBreaks,
      urgentDeadlineCount,
      urgentEvalDeadlineCount,
      urgentSubmissionCount,
      nearestDeadlineDays,
      nearestBreakDays,
      confidence,
    }
  }
}
