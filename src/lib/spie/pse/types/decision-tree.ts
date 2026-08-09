// SPIE-07 — Pedagogical Decision Tree types
// All decisions made during strategy building must be traceable.

// ─── Decision node ────────────────────────────────────────────────────────────

export type StrategyDecisionType =
  | 'choix_approche'         // Which pedagogical approach?
  | 'niveau_difficulte'      // Which difficulty level?
  | 'ordre_sequences'        // What order for sequences?
  | 'planification_evals'    // How many evaluations?
  | 'differentiation'        // Should we differentiate?
  | 'gestion_temps'          // How to handle time constraints?
  | 'gestion_risques'        // Which risks to mitigate?

export interface StrategyDecisionNode {
  id: string
  type: StrategyDecisionType
  question: string            // The decision question
  facteursConsideres: string[] // Inputs that influenced this decision
  reponse: string             // The decision taken
  rationale: string           // Why this decision
  score: number               // Confidence 0–100
  timestamp: string
}

// ─── Decision trace ───────────────────────────────────────────────────────────

export interface StrategyDecisionTrace {
  strategyId: string
  decisions: StrategyDecisionNode[]
  conclusion: string           // Summary of all decisions
  factorsGlobaux: string[]     // Top-level factors that shaped the strategy
}

// ─── Full decision tree ───────────────────────────────────────────────────────

export interface PedagogicalDecisionTree {
  id: string
  strategyId: string
  classeId: string
  enseignantId: string
  trace: StrategyDecisionTrace
  // Readable summary
  resumeDecisions: string[]   // One line per decision
  createdAt: string
}
