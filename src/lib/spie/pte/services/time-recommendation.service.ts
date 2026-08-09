// SPIE-06 — Time Recommendation Service

import type { TimeRecommendation } from '../types/recommendation'
import type { TimeImpact } from '../types/impact'
import type { SequenceBlock } from '../../aydte/types/twin'
import { timeRecommendationEngine } from '../recommendations/time-recommendation-engine'

export class TimeRecommendationService {
  generate(impact: TimeImpact, sequences: SequenceBlock[], minutesParSemaine: number): TimeRecommendation[] {
    return timeRecommendationEngine.generate(impact, sequences, minutesParSemaine)
  }

  getCritical(recommendations: TimeRecommendation[]): TimeRecommendation[] {
    return recommendations.filter(r => r.priorite === 'critique')
  }

  getTopN(recommendations: TimeRecommendation[], n = 3): TimeRecommendation[] {
    return recommendations.slice(0, n)
  }

  totalMinutesRecuperables(recommendations: TimeRecommendation[]): number {
    return recommendations.reduce((sum, r) => sum + r.minutesRecuperees, 0)
  }
}

export const timeRecommendationService = new TimeRecommendationService()
