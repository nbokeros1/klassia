// SPIE-07 — Strategy Recommendation types
// PSE's own recommendation layer — distinct from PPS SimulationRecommendation
// and PTE TimeRecommendation.

import type { StrategyApproach } from './strategy'

// ─── Alternative strategy ────────────────────────────────────────────────────

export interface StrategyAlternative {
  nom: string
  approche: StrategyApproach
  pourquoiNonRecommandee: string
  avantageRelatif?: string      // What this alternative does better
  inconvenient?: string
}

// ─── Strategy Recommendation ─────────────────────────────────────────────────

export interface StrategyRecommendation {
  id: string
  strategyId: string

  // Why this strategy?
  pourquoi: string              // Clear, teacher-facing explanation
  avantages: string[]           // Concrete benefits
  risques: string[]             // Honest risks

  // Alternatives considered
  alternatives: StrategyAlternative[]

  // Overall score
  scoreGlobal: number           // 0–100
  niveauConfiance: 'eleve' | 'moyen' | 'faible'

  generatedAt: string
}
