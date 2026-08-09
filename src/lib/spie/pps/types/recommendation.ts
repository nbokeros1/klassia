// SPIE-05 — Recommendation types
// Recommendations produced by the PlanningRecommendationEngine.
// RULE: recommendations PROPOSE changes — they NEVER auto-apply them.

// ─── Recommendation type ─────────────────────────────────────────────────────

export type RecommendationType =
  | 'compresser_sequence'       // Reduce duration of a sequence
  | 'supprimer_sequence'        // Remove a sequence (skip outcomes)
  | 'fusionner_sequences'       // Merge two sequences into one
  | 'reordonner_sequences'      // Change sequence order
  | 'reduire_contenu'           // Reduce content (fewer outcomes per sequence)
  | 'prioriser_outcomes'        // Prioritize essential outcomes
  | 'etaler_evaluations'        // Spread evaluations across more time
  | 'ajouter_session'           // Add a teaching session
  | 'reduire_evaluations'       // Reduce number of evaluations

// ─── Impact estimate ─────────────────────────────────────────────────────────

export interface RecommendationImpact {
  heuresSauvegardees?: number
  coverageChangement?: number    // % change in coverage
  risquesResolus?: string[]      // Risk IDs this recommendation resolves
}

// ─── Simulation Recommendation ───────────────────────────────────────────────

export interface SimulationRecommendation {
  id: string
  type: RecommendationType
  priorite: 'critique' | 'haute' | 'normale' | 'faible'

  titre: string
  description: string

  // Which sequences this recommendation targets
  sequencesCibles?: string[]

  // Expected impact if applied
  impactEstime: RecommendationImpact

  // Risk(s) this recommendation addresses
  risquesAdresses: string[]

  // Can this be applied automatically?
  autoApplicable: false  // ALWAYS false in SPIE-05 — never auto-apply
}
