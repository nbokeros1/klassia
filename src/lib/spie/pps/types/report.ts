// SPIE-05 — Simulation Report
// Complete report produced at the end of a simulation cycle.

import type { PedagogicalSimulation } from './simulation'
import type { ScenarioComparison } from './scenario'

export interface SimulationReport {
  id: string
  twinId?: string
  enseignantId: string
  classeId: string
  academicYear: string

  // The simulation that triggered this report
  simulation: PedagogicalSimulation

  // Scenario comparison (if multiple scenarios were run)
  scenarioComparison?: ScenarioComparison

  // Final verdict for the teacher
  verdict: string          // One sentence
  nextSteps: string[]      // Ordered list of recommended next actions

  // Should generation be blocked?
  bloquerGeneration: boolean
  raisonBlocage?: string

  generatedAt: string
}
