// SPIE-07 — Strategy Comparison types
// Compare Strategy A/B/C on multiple dimensions.

import type { StrategyApproach, DifficultyLevel } from './strategy'

// ─── Strategy label ───────────────────────────────────────────────────────────

export type StrategyComparisonLabel = 'A' | 'B' | 'C'

// ─── Strategy snapshot (for comparison) ──────────────────────────────────────

export interface StrategySnapshot {
  label: StrategyComparisonLabel
  nom: string
  approche: StrategyApproach
  niveauDifficulte: DifficultyLevel
  heuresPlanifiees: number
  coveragePercent: number
  nbRisques: number
  chargeHebdoMoyenne: number   // Hours per week
  scoreQualite: number         // From StrategyValidator
  justification: string        // Why this strategy was configured
}

// ─── Comparison table row ────────────────────────────────────────────────────

export interface StrategyComparisonRow {
  dimension: string
  valeurs: Record<StrategyComparisonLabel, string | number>
  meilleur?: StrategyComparisonLabel
  higherIsBetter: boolean
}

// ─── Full comparison ──────────────────────────────────────────────────────────

export interface StrategyComparison {
  snapshots: StrategySnapshot[]
  strategyRecommandee: StrategyComparisonLabel
  raisonRecommandation: string
  tableau: StrategyComparisonRow[]
  analyseNarrative: string     // Free-text synthesis
}
