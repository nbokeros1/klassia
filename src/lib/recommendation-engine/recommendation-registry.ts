// ── Recommendation Engine — Registry (ME-17) ──────────────────────────────────

import type { Insight }                      from '@/lib/insight-engine/insight-types'
import type { Recommendation, RecommendationStrategy } from './recommendation-types'

export class RecommendationRegistry {
  private strategies: RecommendationStrategy[] = []

  register(strategy: RecommendationStrategy): void {
    this.strategies.push(strategy)
  }

  getStrategies(): RecommendationStrategy[] {
    return [...this.strategies]
  }

  generate(insights: Insight[], teacherId: string): Recommendation[] {
    const results: Recommendation[] = []

    for (const strategy of this.strategies) {
      try {
        const recs = strategy.generate(insights, teacherId)
        results.push(...recs)
      } catch (err) {
        console.error('[KLASSIA][REC_REGISTRY][STRATEGY_ERROR]', {
          type: strategy.recommendationType,
          err:  String(err),
        })
      }
    }

    return results
  }
}
