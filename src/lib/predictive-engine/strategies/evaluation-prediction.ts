// ── Predictive Engine — Evaluation Prediction (ME-18) ────────────────────────
//
// Détecte les évaluations calendrier imminentes et prédit le besoin de préparation.
// Fenêtre : 14 jours.
// Confiance dégressive selon l'urgence.

import type { Insight }        from '@/lib/insight-engine/insight-types'
import type { Recommendation } from '@/lib/recommendation-engine/recommendation-types'
import type { Prediction, PredictionStrategy, CalendarContext } from '../prediction-types'
import { PredictionBuilder }   from '../prediction-builder'
import { upcomingEvaluationDeadlines, confidenceFromUrgency } from '../predictive-calendar'
import { insightConfidenceBoost } from '../predictive-insights'

const MAX_DAYS  = 14
const MIN_CONF  = 30
const PREP_DAYS = 3   // prédire la préparation N jours avant l'évaluation

export class EvaluationPredictionStrategy implements PredictionStrategy {
  readonly predictionType = 'evaluation_preparation' as const

  generate(
    teacherId:       string,
    calendar:        CalendarContext,
    insights:        Insight[],
    _recommendations: Recommendation[],
  ): Prediction[] {
    const evaluations = upcomingEvaluationDeadlines(calendar, MAX_DAYS)
    if (evaluations.length === 0) return []

    const boost = insightConfidenceBoost(insights, 'evaluation_pattern')

    return evaluations.slice(0, 3).map(ev => {
      const daysAway  = ev.urgencyDays
      const prepDate  = new Date(ev.date.getTime() - PREP_DAYS * 86_400_000)
      const confidence = Math.min(100, confidenceFromUrgency(daysAway) + boost)

      if (confidence < MIN_CONF) return null

      const daysStr = daysAway === 0 ? "aujourd'hui" : `dans ${daysAway} jour(s)`

      return new PredictionBuilder()
        .ofType('evaluation_preparation')
        .forTeacher(teacherId)
        .withConfidence(confidence)
        .onDate(prepDate)
        .withSuggestedAction(`Préparer l'évaluation « ${ev.titre} » prévue ${daysStr}.`)
        .withReason(`Une évaluation est prévue ${daysStr} selon le calendrier scolaire.`)
        .fromCalendar([ev.id])
        .fromInsights([])
        .build()
    }).filter((p): p is Prediction => p !== null)
  }
}
