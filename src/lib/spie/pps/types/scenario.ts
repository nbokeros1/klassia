// SPIE-05 — Scenario types
// Scenarios allow comparing A/B/C alternatives before committing to a plan.

import type { SequenceBlock } from '../../aydte/types/twin'
import type { SimulationStatus } from './simulation'

// ─── Scenario ─────────────────────────────────────────────────────────────────

export type ScenarioLabel = 'A' | 'B' | 'C'

export interface Scenario {
  id: string
  label: ScenarioLabel
  nom: string                    // e.g. "Plan original", "Plan compressé", "Plan priorisé"
  description: string

  // Modified sequences (relative to the reference plan)
  sequences: SequenceBlock[]

  // Simulation summary (computed)
  statut: SimulationStatus
  scoreViabilite: number         // 0–100
  totalHeuresPlanifiees: number
  coveragePercent: number
  nbRisques: number
  nbRisquesCritiques: number

  // What was changed to create this scenario
  modificationsApportees: string[]

  // Tradeoffs
  avantages: string[]
  inconvenients: string[]
}

// ─── Scenario comparison ──────────────────────────────────────────────────────

export interface ScenarioComparison {
  scenarios: Scenario[]
  scenarioRecommande: ScenarioLabel
  raisonRecommandation: string

  // Comparison table (field by field)
  tableau: Array<{
    champ: string
    valeurs: Record<ScenarioLabel, string | number>
    meilleur?: ScenarioLabel
  }>
}
