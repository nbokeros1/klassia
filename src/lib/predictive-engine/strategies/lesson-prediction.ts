// ── Predictive Engine — Lesson Prediction (ME-18) ─────────────────────────────
//
// Prédit le besoin de préparer une leçon prévue dans les 5 prochains jours.
// Booste la confiance si un insight planning_pattern indique un faible score.

import type { Insight }        from '@/lib/insight-engine/insight-types'
import type { Recommendation } from '@/lib/recommendation-engine/recommendation-types'
import type { Prediction, PredictionStrategy, CalendarContext } from '../prediction-types'
import { PredictionBuilder }   from '../prediction-builder'
import { upcomingLessons, daysUntil, confidenceFromUrgency } from '../predictive-calendar'
import { insightConfidenceBoost } from '../predictive-insights'

const MAX_DAYS = 5
const MIN_CONF = 30

export class LessonPredictionStrategy implements PredictionStrategy {
  readonly predictionType = 'lesson_preparation' as const

  generate(
    teacherId:       string,
    calendar:        CalendarContext,
    insights:        Insight[],
    _recommendations: Recommendation[],
  ): Prediction[] {
    const lessons = upcomingLessons(calendar, MAX_DAYS)
    if (lessons.length === 0) return []

    const boost = insightConfidenceBoost(insights, 'planning_pattern')

    return lessons.slice(0, 2).map(lesson => {
      const daysAway   = daysUntil(lesson.dateDebut, calendar.now)
      const confidence = Math.min(100, confidenceFromUrgency(daysAway) + boost)

      if (confidence < MIN_CONF) return null

      const prepDate  = new Date(lesson.dateDebut.getTime() - 86_400_000)
      const daysStr   = daysAway === 0 ? "aujourd'hui" : `dans ${daysAway} jour(s)`

      return new PredictionBuilder()
        .ofType('lesson_preparation')
        .forTeacher(teacherId)
        .withConfidence(confidence)
        .onDate(prepDate)
        .withSuggestedAction(`Préparer la leçon « ${lesson.titre} » prévue ${daysStr}.`)
        .withReason(`Une leçon est planifiée au calendrier ${daysStr}.`)
        .fromCalendar([lesson.id])
        .fromInsights([])
        .build()
    }).filter((p): p is Prediction => p !== null)
  }
}
