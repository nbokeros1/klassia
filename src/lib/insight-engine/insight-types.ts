// ── Insight Engine — Types (ME-16) ────────────────────────────────────────────

export type InsightType =
  | 'planning_pattern'
  | 'preparation_pattern'
  | 'evaluation_pattern'
  | 'workflow_pattern'
  | 'consistency_pattern'
  | 'productivity_pattern'
  | 'interruption_pattern'
  | 'cadence_pattern'

export const INSIGHT_TYPES: readonly InsightType[] = Object.freeze([
  'planning_pattern',
  'preparation_pattern',
  'evaluation_pattern',
  'workflow_pattern',
  'consistency_pattern',
  'productivity_pattern',
  'interruption_pattern',
  'cadence_pattern',
] as const)

export const INSIGHT_ENGINE_VERSION = 'ME-16.0'

// ── Period ────────────────────────────────────────────────────────────────────

export interface InsightPeriod {
  since: string  // ISO 8601
  until: string  // ISO 8601
}

// ── Evidence ──────────────────────────────────────────────────────────────────

export interface InsightEvidence {
  eventCount: number   // événements utilisés pour l'analyse
  periodDays: number   // durée de la période en jours
  sampleSize: number   // taille de l'échantillon effectif (événements pertinents)
}

// ── Insight ───────────────────────────────────────────────────────────────────

export interface Insight {
  id:          string
  teacherId:   string
  type:        InsightType
  confidence:  number          // 0–100 (confiance statistique)
  score:       number          // 0–100 (force du pattern)
  title:       string
  description: string
  generatedAt: string          // ISO 8601
  period:      InsightPeriod
  evidence:    InsightEvidence
  version:     string
}

// ── Pattern analyzer interface ────────────────────────────────────────────────

import type { ActivityEvent } from '@/lib/activity-engine/event-types'

export interface PatternAnalyzer {
  readonly insightType: InsightType
  analyze(events: ActivityEvent[], teacherId: string, period: InsightPeriod): Insight | null
}

// ── Filters ───────────────────────────────────────────────────────────────────

export interface InsightFilters {
  type?:          InsightType
  minConfidence?: number
  limit?:         number
}
