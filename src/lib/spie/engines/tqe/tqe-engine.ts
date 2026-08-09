// TQE — Teaching Quality Engine
// Responsibility: validate that generated content meets pedagogical quality
// standards before it is delivered to the teacher.
//
// Status: SPIE-01 — Interface and stubs only. Implementation in SPIE-05.
//
// Existing infrastructure this engine will delegate to:
//   - src/lib/pedagogy/lessons/lesson-analyzer.ts
//   - src/lib/pedagogy/evaluations/evaluation-analyzer.ts
//   - skill: audit-sortie-ia

import type { TQEValidationInput, TQEValidationResult } from './types'

export interface ITQEEngine {
  // Validate a lesson, sequence, or annual plan
  validate(input: TQEValidationInput): Promise<TQEValidationResult>

  // Quick check (synchronous, less thorough) for real-time feedback
  quickCheck(content: Record<string, unknown>, province: string): {
    score: number
    criticalIssues: string[]
  }
}

export class TQEEngine implements ITQEEngine {
  async validate(_input: TQEValidationInput): Promise<TQEValidationResult> {
    throw new Error('TQEEngine.validate — not implemented (SPIE-05)')
  }

  quickCheck(_content: Record<string, unknown>, _province: string): {
    score: number
    criticalIssues: string[]
  } {
    throw new Error('TQEEngine.quickCheck — not implemented (SPIE-05)')
  }
}

export const tqe = new TQEEngine()
