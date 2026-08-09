// SPIE-04 — Annual Planning Engine types
// The planning engine takes PCE context + curriculum + calendar constraints
// and produces a structured annual plan (sequences + timeline).

import type { NormalizedOutcome } from '../../curriculum/extraction/types'
import type { CurriculumPacingModel } from '../../curriculum/constraints/types'
import type { SequenceBlock, AnnualPlanNode } from './twin'

// ─── Planning input ───────────────────────────────────────────────────────────

export interface AnnualPlanningInput {
  // Required
  curriculumId: string
  province?: string
  matiere: string
  niveaux: string[]
  classeId: string
  enseignantId: string
  academicYear: string
  langue: 'fr' | 'en'

  // Calendar constraints
  totalSemaines: number          // School year total weeks
  minutesParSemaine: number      // Available minutes/week for this subject

  // Curriculum data
  outcomes: NormalizedOutcome[]
  pacingModel: CurriculumPacingModel

  // Teacher preferences
  maxOutcomesParSequence?: number   // Default: 5
  minHeuresParSequence?: number     // Default: 3
  maxHeuresParSequence?: number     // Default: 15
  bufferPercent?: number            // Buffer time % (default: 10%)

  // Context from PCE
  pedagogicalContext?: {
    contextId: string
    progressPercent: number
    outcomesDejaEnseignes: string[]
  }
}

// ─── Planning output ──────────────────────────────────────────────────────────

export interface AnnualPlanningOutput {
  success: boolean
  error?: string

  // Generated sequences
  sequences: SequenceBlock[]
  // Calendar allocation
  nodes: AnnualPlanNode[]

  // Coverage statistics
  stats: {
    nbSequences: number
    nbOutcomesCouvers: number
    nbOutcomesTotal: number
    coveragePercent: number
    totalHeuresPlanifiees: number
    totalSemaines: number
    heuresDisponibles: number
    heuresBuffer: number
    pacingScore: number
  }

  // Warnings and issues
  avertissements: string[]
  sequencesNonPlanifiees: string[]   // Outcomes that couldn't fit in the year

  durationMs: number
}

// ─── Planning algorithm config ────────────────────────────────────────────────

export interface PlanningAlgorithmConfig {
  // How to group outcomes into sequences
  groupingStrategy: 'prerequis_first' | 'thematic' | 'bloom_progression' | 'chronological'
  // Whether to respect the pacing model's time estimates
  respectPacingModel: boolean
  // Whether to leave buffer weeks between sequences
  addBufferWeeks: boolean
  // Maximum number of outcomes per sequence (for manageable units)
  maxOutcomesPerSequence: number
}

export const DEFAULT_PLANNING_CONFIG: PlanningAlgorithmConfig = {
  groupingStrategy: 'prerequis_first',
  respectPacingModel: true,
  addBufferWeeks: true,
  maxOutcomesPerSequence: 6,
}
