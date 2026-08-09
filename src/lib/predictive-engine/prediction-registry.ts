// ── Predictive Engine — Registry (ME-18) ─────────────────────────────────────

import type { Insight }            from '@/lib/insight-engine/insight-types'
import type { Recommendation }     from '@/lib/recommendation-engine/recommendation-types'
import type { Prediction, PredictionStrategy, CalendarContext } from './prediction-types'

export class PredictionRegistry {
  private strategies: PredictionStrategy[] = []

  register(strategy: PredictionStrategy): void {
    this.strategies.push(strategy)
  }

  getStrategies(): PredictionStrategy[] {
    return [...this.strategies]
  }

  generate(
    teacherId:       string,
    calendar:        CalendarContext,
    insights:        Insight[],
    recommendations: Recommendation[],
  ): Prediction[] {
    const results: Prediction[] = []

    for (const strategy of this.strategies) {
      try {
        const preds = strategy.generate(teacherId, calendar, insights, recommendations)
        results.push(...preds)
      } catch (err) {
        console.error('[KLASSIA][PRED_REGISTRY][STRATEGY_ERROR]', {
          type: strategy.predictionType,
          err:  String(err),
        })
      }
    }

    return results
  }
}
