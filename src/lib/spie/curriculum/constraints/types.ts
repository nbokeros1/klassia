// SPIE-02 — Constraint Engine types
// Models all constraints in a curriculum: temporal, prerequisite, co-requisite, sequential.

// ─── Constraint types ─────────────────────────────────────────────────────────

export type ConstraintType =
  | 'temps_minimum'        // Minimum hours/weeks for an outcome
  | 'temps_maximum'        // Maximum hours/weeks
  | 'temps_recommande'     // Recommended hours/weeks
  | 'prerequis'            // Outcome B requires Outcome A
  | 'corequis'             // Outcome A and B should be taught together
  | 'sequence'             // Outcome A must precede Outcome B
  | 'grouper'              // Outcomes should be grouped in the same unit
  | 'evaluer_avant'        // Must evaluate before proceeding
  | 'rapport_couverture'   // Minimum coverage ratio (e.g. 80% of outcomes)

export type ConstraintUnit = 'minutes' | 'heures' | 'jours' | 'semaines' | 'cours' | 'pourcentage'

export interface Constraint {
  id: string
  type: ConstraintType
  description: string
  obligatoire: boolean
  // The outcome/concept this constraint applies to
  sujetId: string
  sujetLabel?: string
  // For time constraints
  valeur?: number
  unite?: ConstraintUnit
  // For prerequisite/co-requisite constraints
  prealablesIds?: string[]
  // For grouping constraints
  groupeIds?: string[]
  // Source (extracted from curriculum, or inferred)
  source: 'curriculum' | 'infere' | 'manuel'
  province?: string
}

// ─── Constraint set ───────────────────────────────────────────────────────────

export interface ConstraintSet {
  id: string
  curriculumId: string
  province?: string
  matiere?: string
  niveaux?: string[]
  constraints: Constraint[]
  createdAt: string
}

// ─── Violation ───────────────────────────────────────────────────────────────

export type ViolationSeverity = 'critique' | 'majeur' | 'mineur' | 'avertissement'

export interface ConstraintViolation {
  constraintId: string
  constraintType: ConstraintType
  severity: ViolationSeverity
  message: string
  sujetId: string
  details?: Record<string, unknown>
}

// ─── Validation result ────────────────────────────────────────────────────────

export interface ConstraintValidationResult {
  valid: boolean
  violations: ConstraintViolation[]
  warnings: string[]
  score: number              // 0–100: how well the plan satisfies constraints
}

// ─── Pacing model (planning use) ─────────────────────────────────────────────
// How much time is available and needed for each outcome.

export interface OutcomePacing {
  outcomeId: string
  outcomeCode?: string
  outcomeTitre: string
  tempsEstimeMinutes: number
  tempsMinimumMinutes?: number
  tempsMaximumMinutes?: number
  semaines?: number
  prealablesIds: string[]
  priorite: 'haute' | 'normale' | 'basse'
}

export interface CurriculumPacingModel {
  curriculumId: string
  province?: string
  matiere?: string
  niveaux?: string[]
  totalHeuresEstimees: number
  totalSemainesRequises: number
  outcomes: OutcomePacing[]
  contraintes: ConstraintSet
}
