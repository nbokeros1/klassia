// TQE — Teaching Quality Engine types

import type { QualityReport } from '../../types/assessment'

export interface TQEValidationInput {
  lessonId?: string
  sequenceId?: string
  annualPlanId?: string
  // Raw content if not yet persisted
  rawContent?: Record<string, unknown>
  curriculumId: string
  province: string
  matiere: string
  niveau: string
  langue: 'fr' | 'en'
}

export interface TQEValidationResult {
  report: QualityReport
  passed: boolean
  // Specific actions the teacher should take
  actionsRequises: TQEAction[]
}

export interface TQEAction {
  priorite: 'critique' | 'haute' | 'normale'
  champ: string
  message: string
  suggestion: string
}

// Thresholds for each quality dimension
export interface TQEThresholds {
  scoreMinimumPourLivrer: number    // Default: 60
  scoreMinimumAlignement: number   // Default: 80 — alignment is critical
  scoreMinimumBloom: number        // Default: 50
  scoreMinimumStructure: number    // Default: 70
}

export const DEFAULT_TQE_THRESHOLDS: TQEThresholds = {
  scoreMinimumPourLivrer: 60,
  scoreMinimumAlignement: 80,
  scoreMinimumBloom: 50,
  scoreMinimumStructure: 70,
}
