// SPIE-07 — StrategyRecommendationService
// Generates and formats the strategy recommendation for teacher-facing display.

import { strategyRecommendationEngine, type RecommendationEngineInput } from '../recommendations/strategy-recommendation-engine'
import type { StrategyRecommendation } from '../types/recommendation'
import type { PedagogicalStrategy } from '../types/strategy'
import type { StrategyValidationReport } from '../types/validation'
import type { StrategyComparison } from '../types/comparison'

export class StrategyRecommendationService {
  /** Generate a full recommendation. */
  generate(
    strategy: PedagogicalStrategy,
    validationReport: StrategyValidationReport,
    comparison?: StrategyComparison,
  ): StrategyRecommendation {
    const input: RecommendationEngineInput = { strategy, validationReport, comparison }
    return strategyRecommendationEngine.generate(input)
  }

  /** One-sentence confidence summary for UI display. */
  confidenceSummary(recommendation: StrategyRecommendation): string {
    const labelMap = { eleve: 'Élevée', moyen: 'Moyenne', faible: 'Faible' }
    return `Confiance ${labelMap[recommendation.niveauConfiance]} — score ${recommendation.scoreGlobal}/100`
  }

  /** Formatted list of advantages for display. */
  formatAvantages(recommendation: StrategyRecommendation): string {
    return recommendation.avantages.map((a, i) => `${i + 1}. ${a}`).join('\n')
  }

  /** Formatted list of risks for display. */
  formatRisques(recommendation: StrategyRecommendation): string {
    return recommendation.risques.map((r, i) => `${i + 1}. ${r}`).join('\n')
  }
}

export const strategyRecommendationService = new StrategyRecommendationService()
