// ── Predictive Engine — Types (ME-18) ────────────────────────────────────────

import type { CalendarEventSnapshot, CalendarDeadlineSnapshot } from '@/lib/pedagogy/calendar/types'
import type { Insight }                from '@/lib/insight-engine/insight-types'
import type { Recommendation }         from '@/lib/recommendation-engine/recommendation-types'

// ── Types de prédiction ───────────────────────────────────────────────────────

export type PredictionType =
  | 'lesson_preparation'
  | 'evaluation_preparation'
  | 'grading_period'
  | 'holiday_preparation'
  | 'semester_transition'
  | 'exam_period'
  | 'administrative_deadline'

export const PREDICTION_TYPES: readonly PredictionType[] = Object.freeze([
  'lesson_preparation',
  'evaluation_preparation',
  'grading_period',
  'holiday_preparation',
  'semester_transition',
  'exam_period',
  'administrative_deadline',
] as const)

export const PREDICTIVE_ENGINE_VERSION = 'ME-18.0'

// ── Prediction ────────────────────────────────────────────────────────────────

export interface Prediction {
  id:              string
  teacherId:       string
  type:            PredictionType
  confidence:      number          // 0–100
  predictedDate:   string          // ISO 8601 — date à laquelle le besoin est prévu
  suggestedAction: string          // action concrète recommandée
  reason:          string          // observation factuelle
  sourceInsights:  string[]        // IDs des insights utilisés (peut être vide)
  sourceCalendar:  string[]        // IDs des événements calendrier utilisés (peut être vide)
  version:         string
}

// ── Contexte calendrier ───────────────────────────────────────────────────────

export interface CalendarContext {
  events:    CalendarEventSnapshot[]
  deadlines: CalendarDeadlineSnapshot[]
  now:       Date
}

// ── Interface stratégie ───────────────────────────────────────────────────────

export interface PredictionStrategy {
  readonly predictionType: PredictionType
  generate(
    teacherId:       string,
    calendar:        CalendarContext,
    insights:        Insight[],
    recommendations: Recommendation[],
  ): Prediction[]
}

// ── Filtres ───────────────────────────────────────────────────────────────────

export interface PredictionFilters {
  type?:          PredictionType
  minConfidence?: number
  limit?:         number
  fromDate?:      string
  toDate?:        string
}
