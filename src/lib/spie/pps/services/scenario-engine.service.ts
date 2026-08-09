// SPIE-05 — Scenario Engine Service

import type { SimulationInput } from '../types/simulation'
import type { ScenarioComparison } from '../types/scenario'
import { scenarioEngine } from '../scenarios/scenario-engine'

export class ScenarioEngineService {
  buildComparison(input: SimulationInput): ScenarioComparison {
    return scenarioEngine.buildComparison(input)
  }

  getRecommended(comparison: ScenarioComparison) {
    return comparison.scenarios.find(s => s.label === comparison.scenarioRecommande)
  }
}

export const scenarioEngineService = new ScenarioEngineService()
