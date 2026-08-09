// PGE — Planning Generation Engine types

import type { AnnualPlan, SequencePlan, LessonPlan, AnnualPlanGenerationRequest, LessonGenerationRequest } from '../../types/planning'
import type { QualityReport } from '../../types/assessment'

export interface PGEGenerationContext {
  classeId: string
  curriculumId: string
  matiere: string
  niveau: string
  langue: 'fr' | 'en'
  province: string
  profilIA?: Record<string, unknown>
  templateId: string
  promptAdaptations?: Record<string, unknown>
}

export interface PGEAnnualPlanResult {
  annualPlan: AnnualPlan
  warnings: string[]
  durationMs: number
}

export interface PGESequenceResult {
  sequences: SequencePlan[]
  warnings: string[]
  durationMs: number
}

export interface PGELessonResult {
  lesson: LessonPlan
  qualityReport?: QualityReport
  warnings: string[]
  durationMs: number
}

export type PGEGenerationType =
  | 'plan_annuel'
  | 'plan_sequence'
  | 'plan_lecon'
  | 'lecon_complete'
  | 'fiche_lecon'
  | 'activite'
  | 'quiz'
  | 'evaluation'
  | 'differentiation'
