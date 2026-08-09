// SPIE-07 — Strategy Validation types
// StrategyValidator checks the quality and coherence of a PedagogicalStrategy.

// ─── Validation dimensions ────────────────────────────────────────────────────

export type StrategyValidationDimensionName =
  | 'coherence'             // Internal consistency (approach ↔ difficulty ↔ time)
  | 'couverture_curriculum' // All required outcomes are covered
  | 'equilibre'             // Content is balanced across trimesters
  | 'gestion_temps'         // Time constraints are respected
  | 'competences'           // Bloom taxonomy progression is appropriate
  | 'evaluations'           // Evaluation frequency and balance are sound
  | 'contraintes'           // Hard constraints from curriculum are satisfied

export type ValidationStatut = 'ok' | 'attention' | 'probleme'

// ─── Dimension result ─────────────────────────────────────────────────────────

export interface StrategyValidationDimension {
  nom: StrategyValidationDimensionName
  score: number             // 0–100
  statut: ValidationStatut
  details: string           // Human-readable explanation
  valeurMesuree?: number    // What was actually measured
  valeurAttendue?: number   // What was expected
}

// ─── Validation report ────────────────────────────────────────────────────────

export interface StrategyValidationReport {
  id: string
  strategyId: string
  scoreGlobal: number           // 0–100 (weighted average of dimensions)
  validePourGeneration: boolean // scoreGlobal >= 60 AND no blocking issues

  dimensions: StrategyValidationDimension[]
  avertissements: string[]      // Non-blocking issues
  bloqueurs: string[]           // Issues that prevent generation

  validatedAt: string
  durationMs: number
}
