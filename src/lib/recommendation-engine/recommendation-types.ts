// ── Recommendation Engine — Types (ME-17) ────────────────────────────────────

import type { Insight } from '@/lib/insight-engine/insight-types'

// ── Types et priorités ────────────────────────────────────────────────────────

export type RecommendationType =
  | 'planning'
  | 'workflow'
  | 'evaluation'
  | 'preparation'
  | 'consistency'
  | 'productivity'
  | 'wellbeing'

export const RECOMMENDATION_TYPES: readonly RecommendationType[] = Object.freeze([
  'planning', 'workflow', 'evaluation', 'preparation',
  'consistency', 'productivity', 'wellbeing',
] as const)

export enum RecommendationPriority {
  HIGH        = 'HIGH',
  MEDIUM      = 'MEDIUM',
  LOW         = 'LOW',
  INFORMATION = 'INFORMATION',
}

export const RECOMMENDATION_PRIORITIES: readonly RecommendationPriority[] = Object.freeze([
  RecommendationPriority.HIGH,
  RecommendationPriority.MEDIUM,
  RecommendationPriority.LOW,
  RecommendationPriority.INFORMATION,
])

export const RECOMMENDATION_ENGINE_VERSION = 'ME-17.0'

// ── Recommendation ────────────────────────────────────────────────────────────

export interface Recommendation {
  id:              string
  teacherId:       string
  type:            RecommendationType
  priority:        RecommendationPriority
  title:           string
  description:     string          // "Essayez de...", "Vous pourriez...", "Il peut être utile de..."
  reason:          string          // observation factuelle qui justifie la suggestion
  basedOnInsights: string[]        // IDs des insights source — au moins 1 requis
  confidence:      number          // 0–100 (héritée des insights)
  createdAt:       string          // ISO 8601
  expiresAt:       string          // ISO 8601
  version:         string
}

// ── Strategy interface ────────────────────────────────────────────────────────

export interface RecommendationStrategy {
  readonly recommendationType: RecommendationType
  generate(insights: Insight[], teacherId: string): Recommendation[]
}

// ── Filters ───────────────────────────────────────────────────────────────────

export interface RecommendationFilters {
  priority?: RecommendationPriority
  type?:     RecommendationType
  limit?:    number
}
