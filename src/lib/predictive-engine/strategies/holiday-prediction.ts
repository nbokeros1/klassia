// ── Predictive Engine — Holiday Prediction (ME-18) ────────────────────────────
//
// Prédit le besoin d'adapter la planification avant les vacances/congés.
// Fenêtre : 21 jours.

import type { Insight }        from '@/lib/insight-engine/insight-types'
import type { Recommendation } from '@/lib/recommendation-engine/recommendation-types'
import type { Prediction, PredictionStrategy, CalendarContext } from '../prediction-types'
import { PredictionBuilder }   from '../prediction-builder'
import { upcomingHolidays, daysUntil, confidenceFromUrgency } from '../predictive-calendar'

const MAX_DAYS = 21
const MIN_CONF = 30

export class HolidayPredictionStrategy implements PredictionStrategy {
  readonly predictionType = 'holiday_preparation' as const

  generate(
    teacherId:       string,
    calendar:        CalendarContext,
    _insights:       Insight[],
    _recommendations: Recommendation[],
  ): Prediction[] {
    const holidays = upcomingHolidays(calendar, MAX_DAYS)
    if (holidays.length === 0) return []

    const nextHoliday = holidays[0]!
    const daysAway    = daysUntil(nextHoliday.dateDebut, calendar.now)
    const confidence  = confidenceFromUrgency(daysAway)

    if (confidence < MIN_CONF) return []

    const prepDate = new Date(nextHoliday.dateDebut.getTime() - 5 * 86_400_000)
    const daysStr  = daysAway === 0 ? "aujourd'hui" : `dans ${daysAway} jour(s)`

    return [
      new PredictionBuilder()
        .ofType('holiday_preparation')
        .forTeacher(teacherId)
        .withConfidence(confidence)
        .onDate(prepDate)
        .withSuggestedAction(`Adapter la planification avant « ${nextHoliday.titre} » qui commence ${daysStr}.`)
        .withReason(`Une période de congé commence ${daysStr}. Il peut être utile d'ajuster l'avancement du cours.`)
        .fromCalendar([nextHoliday.id])
        .fromInsights([])
        .build(),
    ]
  }
}
