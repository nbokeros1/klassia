// ── Predictive Engine — Deadline Prediction (ME-18) ──────────────────────────
//
// Prédit les besoins liés aux échéances administratives (devoirs, remises).
// Fenêtre : 21 jours. Ne duplique pas les évaluations (gérées par EvaluationPrediction).

import type { Insight }        from '@/lib/insight-engine/insight-types'
import type { Recommendation } from '@/lib/recommendation-engine/recommendation-types'
import type { Prediction, PredictionStrategy, CalendarContext } from '../prediction-types'
import { PredictionBuilder }   from '../prediction-builder'
import { confidenceFromUrgency } from '../predictive-calendar'

const MAX_DAYS = 21
const MIN_CONF = 25

export class DeadlinePredictionStrategy implements PredictionStrategy {
  readonly predictionType = 'administrative_deadline' as const

  generate(
    teacherId:       string,
    calendar:        CalendarContext,
    _insights:       Insight[],
    _recommendations: Recommendation[],
  ): Prediction[] {
    const deadlines = calendar.deadlines
      .filter(d => d.type !== 'evaluation' && d.urgencyDays >= 0 && d.urgencyDays <= MAX_DAYS)
      .sort((a, b) => a.urgencyDays - b.urgencyDays)

    if (deadlines.length === 0) return []

    return deadlines.slice(0, 2).map(dl => {
      const confidence = confidenceFromUrgency(dl.urgencyDays)
      if (confidence < MIN_CONF) return null

      const daysStr  = dl.urgencyDays === 0 ? "aujourd'hui" : `dans ${dl.urgencyDays} jour(s)`
      const prepDate = new Date(dl.date.getTime() - 2 * 86_400_000)

      const typeLabel = dl.type === 'devoir' ? 'remise de travail' : 'échéance'

      return new PredictionBuilder()
        .ofType('administrative_deadline')
        .forTeacher(teacherId)
        .withConfidence(confidence)
        .onDate(prepDate)
        .withSuggestedAction(`Préparer la ${typeLabel} « ${dl.titre} » prévue ${daysStr}.`)
        .withReason(`Une ${typeLabel} est prévue ${daysStr} selon le calendrier.`)
        .fromCalendar([dl.id])
        .fromInsights([])
        .build()
    }).filter((p): p is Prediction => p !== null)
  }
}
