// SPIE-05 — Risk types
// Risks detected by the PedagogicalRiskEngine.

// ─── Risk level ───────────────────────────────────────────────────────────────

export type RiskLevel = 'info' | 'avertissement' | 'majeur' | 'critique'

// ─── Risk type ────────────────────────────────────────────────────────────────

export type RiskType =
  | 'programme_irrealisable'    // Curriculum impossible to complete in time
  | 'temps_insuffisant'         // Not enough time for a specific sequence
  | 'trop_devaluations'         // Too many evaluations in a short period
  | 'retard_critique'           // Critical pacing delay
  | 'surcharge_hebdomadaire'    // Too much content per week
  | 'sequence_trop_longue'      // One sequence exceeds the safe maximum
  | 'couverture_insuffisante'   // Coverage < target threshold
  | 'sequence_trop_courte'      // Sequence too short to cover its outcomes
  | 'aucune_marge'              // No buffer time remaining

// ─── Simulation Risk ──────────────────────────────────────────────────────────

export interface SimulationRisk {
  id: string
  type: RiskType
  niveau: RiskLevel

  // Context
  titre: string
  description: string

  // Which sequences / outcomes are affected
  sequencesAffectees?: string[]
  semainesAffectees?: number[]

  // Quantitative data
  valeurActuelle?: number         // e.g. hours needed
  valeurMaximale?: number         // e.g. hours available
  unite?: string                  // 'heures' | 'semaines' | '%' | 'évaluations'

  // Is this risk blocking? (irrealisable → MUST fix before proceeding)
  bloquant: boolean
}
