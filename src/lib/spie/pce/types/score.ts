// SPIE-03 — PCE Context Score
// Measures the completeness and quality of each context source.

import type { ContextSourceType } from './sources'

// ─── Per-source score ─────────────────────────────────────────────────────────

export type SourceScoreLevel = 'excellent' | 'bon' | 'incomplet' | 'absent' | 'stale'

export interface SourceScore {
  sourceType: ContextSourceType
  score: number                  // 0–100
  level: SourceScoreLevel
  manquants: string[]            // Which fields/items are missing
  avertissements: string[]
  // Is the source stale? (loaded too long ago or curriculum has changed)
  stale: boolean
  loadedAt?: string
}

// ─── Global context score ─────────────────────────────────────────────────────

export interface ContextScore {
  // Weighted average of all sources (0–100)
  global: number
  // Per-source scores
  sources: Record<ContextSourceType, SourceScore>
  // The minimum score to allow generation
  readyForGeneration: boolean
  // Sources that are mandatory but missing
  sourcesMandataires: ContextSourceType[]
  sourcesMandatairesMissing: ContextSourceType[]
  // Rich assessment
  qualite: 'excellent' | 'bon' | 'minimal' | 'insuffisant'
  recommandations: string[]
  calculatedAt: string
}

// ─── Source weights (how important is each source for generation) ─────────────

export const SOURCE_WEIGHTS: Record<ContextSourceType, number> = {
  curriculum: 0.30,          // Critical — most important
  calendar: 0.15,            // Important for timing
  progression: 0.20,         // Important for continuity
  historique: 0.15,          // Valuable context
  teacher_profile: 0.10,     // Nice to have
  class_profile: 0.05,       // Nice to have
  resources: 0.03,           // Optional
  contraintes: 0.02,         // Optional
  standards: 0.00,           // Background — doesn't affect score directly
}

// ─── Mandatory sources ────────────────────────────────────────────────────────
// These sources MUST be present for generation. Without them, generation is blocked.

export const MANDATORY_SOURCES: ContextSourceType[] = ['curriculum']

// ─── Stale threshold (ms) ────────────────────────────────────────────────────
// Sources loaded more than this long ago are considered stale.

export const STALE_THRESHOLD_MS: Record<ContextSourceType, number> = {
  curriculum: 7 * 24 * 60 * 60 * 1000,    // 7 days — curriculum rarely changes
  calendar: 24 * 60 * 60 * 1000,           // 1 day
  progression: 4 * 60 * 60 * 1000,         // 4 hours
  historique: 4 * 60 * 60 * 1000,          // 4 hours
  teacher_profile: 30 * 24 * 60 * 60 * 1000, // 30 days
  class_profile: 7 * 24 * 60 * 60 * 1000, // 7 days
  resources: 24 * 60 * 60 * 1000,          // 1 day
  contraintes: 24 * 60 * 60 * 1000,        // 1 day
  standards: 30 * 24 * 60 * 60 * 1000,    // 30 days
}
