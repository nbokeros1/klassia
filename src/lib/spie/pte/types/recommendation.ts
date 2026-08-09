// SPIE-06 — Time Recommendation types
// RÈGLE ABSOLUE : jamais d'auto-application. Toujours expliquer.

// ─── Recommendation type ──────────────────────────────────────────────────────

export type TimeRecommendationType =
  | 'supprimer'        // Remove content (outcome or sequence)
  | 'deplacer'         // Move content to a different slot
  | 'fusionner'        // Merge two sequences
  | 'reduire'          // Reduce the duration of content
  | 'etaler'           // Spread content over more time
  | 'recuperer'        // Add a makeup session

// ─── Time Recommendation ─────────────────────────────────────────────────────

export interface TimeRecommendation {
  id: string
  type: TimeRecommendationType
  priorite: 'critique' | 'haute' | 'normale' | 'faible'

  // What to do — always explained
  titre: string
  explication: string          // WHY this is recommended
  commentApplique: string      // HOW to apply it (step-by-step in plain French)
  impactAttendu: string        // What this achieves (minutes saved, risks resolved)

  // What is targeted
  sequencesCibles?: string[]
  slotsCibles?: string[]

  // Estimated savings
  minutesRecuperees: number
  coverageRecuperee?: number   // % of curriculum coverage recovered

  // Risk(s) this addresses
  impactsAdresses: string[]    // TimeImpact IDs

  autoApplicable: false        // TOUJOURS false — jamais auto-appliqué
}
