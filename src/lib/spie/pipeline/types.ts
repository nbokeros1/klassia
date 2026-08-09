// SPIE Pipeline types
// The pipeline orchestrates all engines from curriculum intake to teaching.

export type PipelineStageId =
  | 'intake'
  | 'ingestion'
  | 'extraction'
  | 'graph'
  | 'calendar'
  | 'annual_plan'
  | 'sequences'
  | 'lessons'
  | 'quality'
  | 'teach'
  | 'track'
  | 'reflect'

export type PipelineStatut =
  | 'not_started'
  | 'in_progress'
  | 'complete'
  | 'error'
  | 'skipped'

export interface PipelineStageState {
  stageId: PipelineStageId
  statut: PipelineStatut
  completedAt?: string
  error?: string
  progress?: number           // 0–100 for in_progress stages
  metadata?: Record<string, unknown>
}

export interface PipelineState {
  classeId: string
  curriculumId?: string
  anneeScolaire: string
  stages: Record<PipelineStageId, PipelineStageState>
  updatedAt: string
}

export interface PipelineTransition {
  from: PipelineStageId
  to: PipelineStageId
  condition?: string
}

// Valid transitions in the SPIE pipeline
export const PIPELINE_TRANSITIONS: PipelineTransition[] = [
  { from: 'intake', to: 'ingestion' },
  { from: 'intake', to: 'graph', condition: 'curriculum_already_extracted' },
  { from: 'ingestion', to: 'extraction' },
  { from: 'extraction', to: 'graph' },
  { from: 'graph', to: 'calendar' },
  { from: 'calendar', to: 'annual_plan' },
  { from: 'annual_plan', to: 'sequences' },
  { from: 'sequences', to: 'lessons' },
  { from: 'lessons', to: 'quality' },
  { from: 'quality', to: 'teach' },
  { from: 'teach', to: 'track' },
  { from: 'track', to: 'reflect' },
  { from: 'reflect', to: 'teach' },  // Cycle: reflect → teach next lesson
]
