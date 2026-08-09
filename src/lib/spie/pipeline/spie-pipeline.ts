// SPIE Pipeline Orchestrator
// Manages the state machine for the full curriculum → teaching pipeline.
//
// Status: SPIE-01 — Interface and stubs only. Implementation in SPIE-02+.

import type {
  PipelineState,
  PipelineStageId,
  PipelineStageState,
  PipelineStatut,
} from './types'

export interface ISPIEPipeline {
  // Initialize a new pipeline for a class
  initialize(classeId: string, anneeScolaire: string): PipelineState

  // Get the current pipeline state for a class
  getState(classeId: string): Promise<PipelineState | null>

  // Advance the pipeline to the next stage
  advance(classeId: string, stageId: PipelineStageId): Promise<PipelineState>

  // Update a stage's status
  updateStage(
    classeId: string,
    stageId: PipelineStageId,
    update: Partial<PipelineStageState>,
  ): Promise<PipelineState>

  // Check if a stage is available (all preconditions met)
  canAdvanceTo(state: PipelineState, stageId: PipelineStageId): boolean
}

export class SPIEPipeline implements ISPIEPipeline {
  initialize(classeId: string, anneeScolaire: string): PipelineState {
    const now = new Date().toISOString()
    const stageIds: PipelineStageId[] = [
      'intake', 'ingestion', 'extraction', 'graph', 'calendar',
      'annual_plan', 'sequences', 'lessons', 'quality', 'teach', 'track', 'reflect',
    ]
    const stages = Object.fromEntries(
      stageIds.map(id => [id, { stageId: id, statut: 'not_started' as PipelineStatut }]),
    ) as Record<PipelineStageId, PipelineStageState>

    return { classeId, anneeScolaire, stages, updatedAt: now }
  }

  async getState(_classeId: string): Promise<PipelineState | null> {
    throw new Error('SPIEPipeline.getState — not implemented (SPIE-02)')
  }

  async advance(_classeId: string, _stageId: PipelineStageId): Promise<PipelineState> {
    throw new Error('SPIEPipeline.advance — not implemented (SPIE-02)')
  }

  async updateStage(
    _classeId: string,
    _stageId: PipelineStageId,
    _update: Partial<PipelineStageState>,
  ): Promise<PipelineState> {
    throw new Error('SPIEPipeline.updateStage — not implemented (SPIE-02)')
  }

  canAdvanceTo(state: PipelineState, stageId: PipelineStageId): boolean {
    // SPIE-01: basic implementation — check that all preconditions are complete
    const stageOrder: PipelineStageId[] = [
      'intake', 'ingestion', 'extraction', 'graph', 'calendar',
      'annual_plan', 'sequences', 'lessons', 'quality', 'teach', 'track', 'reflect',
    ]
    const idx = stageOrder.indexOf(stageId)
    if (idx <= 0) return true
    // For 'graph' stage, allow skipping 'ingestion'+'extraction' if curriculum already extracted
    if (stageId === 'graph') {
      return (
        state.stages['intake'].statut === 'complete' ||
        state.stages['extraction'].statut === 'complete'
      )
    }
    const prevStage = stageOrder[idx - 1]
    return state.stages[prevStage].statut === 'complete'
  }
}

export const spiePipeline = new SPIEPipeline()
