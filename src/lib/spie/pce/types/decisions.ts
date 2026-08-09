// SPIE-03 — PCE Decision Engine types
// The Decision Engine answers pedagogical questions based on the PedagogicalContext.

// ─── Decision types ───────────────────────────────────────────────────────────

export type DecisionType =
  | 'prochaine_lecon'          // What should the next lesson be about?
  | 'peut_progresser'          // Can we move to the next topic?
  | 'besoin_revision'          // Does the class need to review something?
  | 'ralentir'                 // Should we slow down the pace?
  | 'accelerer'                // Can we speed up?
  | 'proposer_activite'        // Suggest a specific activity type
  | 'differencier'             // Suggest differentiation strategies
  | 'alerter_retard'           // Alert that we're behind schedule
  | 'curriculum_coverage'      // What's our current curriculum coverage?
  | 'prochaine_evaluation'     // Is it time for an assessment?

// ─── Decision query ───────────────────────────────────────────────────────────

export interface DecisionQuery {
  type: DecisionType
  // Optional specific context
  outcomeId?: string
  classeId?: string
  targetDate?: string         // ISO — plan ahead to this date
}

// ─── Decision result ──────────────────────────────────────────────────────────

export type DecisionConfidence = 'haute' | 'moyenne' | 'faible'

export interface DecisionResult {
  type: DecisionType
  decision: boolean | string | null
  // Human-readable justification
  justification: string
  // Specific recommendations derived from the decision
  recommandations: string[]
  confidence: DecisionConfidence
  // Supporting data used to make the decision
  donneesAppui: Record<string, unknown>
}

// ─── Multi-decision report ────────────────────────────────────────────────────

export interface DecisionReport {
  classeId?: string
  matiereId?: string
  decisions: DecisionResult[]
  // Overall pedagogical health score (0–100)
  santePedagogique: number
  alertes: DecisionAlert[]
  calculatedAt: string
}

export type AlerteSeverite = 'critique' | 'majeur' | 'info'

export interface DecisionAlert {
  type: DecisionType | 'general'
  severite: AlerteSeverite
  message: string
  action?: string
}
