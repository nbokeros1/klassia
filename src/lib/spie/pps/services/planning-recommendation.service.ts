// SPIE-05 — Planning Recommendation Service

import type { SimulationRisk } from '../types/risk'
import type { SimulationRecommendation } from '../types/recommendation'
import type { SimulationInput } from '../types/simulation'
import { planningRecommendationEngine } from '../recommendations/planning-recommendation-engine'

export class PlanningRecommendationService {
  generate(risks: SimulationRisk[], input: SimulationInput): SimulationRecommendation[] {
    return planningRecommendationEngine.generate(risks, input)
  }

  getCritical(recommendations: SimulationRecommendation[]): SimulationRecommendation[] {
    return recommendations.filter(r => r.priorite === 'critique')
  }

  getTopN(recommendations: SimulationRecommendation[], n = 3): SimulationRecommendation[] {
    return recommendations.slice(0, n)
  }
}

export const planningRecommendationService = new PlanningRecommendationService()
