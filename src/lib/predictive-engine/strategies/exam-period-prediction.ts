// ── Predictive Engine — Exam Period Prediction (ME-18) ────────────────────────
//
// Détecte une concentration d'évaluations dans une fenêtre de 14 jours (≥ 3).
// Prédit le besoin d'une gestion de période d'examens.

import type { Insight }        from '@/lib/insight-engine/insight-types'
import type { Recommendation } from '@/lib/recommendation-engine/recommendation-types'
import type { Prediction, PredictionStrategy, CalendarContext } from '../prediction-types'
import { PredictionBuilder }   from '../prediction-builder'
import { hasExamPeriod }       from '../predictive-calendar'

const WINDOW_DAYS = 14
const MIN_COUNT   = 3
const MIN_CONF    = 40

export class ExamPeriodPredictionStrategy implements PredictionStrategy {
  readonly predictionType = 'exam_period' as const

  generate(
    teacherId:       string,
    calendar:        CalendarContext,
    insights:        Insight[],
    _recommendations: Recommendation[],
  ): Prediction[] {
    if (!hasExamPeriod(calendar, WINDOW_DAYS, MIN_COUNT)) return []

    const evaluations = calendar.deadlines
      .filter(d => d.type === 'evaluation' && d.urgencyDays >= 0 && d.urgencyDays <= WINDOW_DAYS)
      .sort((a, b) => a.urgencyDays - b.urgencyDays)

    const earliest    = evaluations[0]!
    const count       = evaluations.length

    // Boost de confiance si l'enseignant a déjà un pattern d'évaluation enregistré
    const evalInsight = insights.find(i => i.type === 'evaluation_pattern' && i.confidence >= 30)
    const boost       = evalInsight ? 10 : 0
    const confidence  = Math.min(100, MIN_CONF + Math.min(count * 5, 25) + boost)

    const prepDate = new Date(earliest.date.getTime() - 5 * 86_400_000)

    return [
      new PredictionBuilder()
        .ofType('exam_period')
        .forTeacher(teacherId)
        .withConfidence(confidence)
        .onDate(prepDate)
        .withSuggestedAction(`Organiser la période d'examens : ${count} évaluation(s) dans les ${WINDOW_DAYS} prochains jours.`)
        .withReason(`${count} évaluations sont prévues dans les ${WINDOW_DAYS} prochains jours — une période d'examens approche.`)
        .fromCalendar(evaluations.map(e => e.id))
        .fromInsights(evalInsight ? [evalInsight.id] : [])
        .build(),
    ]
  }
}
