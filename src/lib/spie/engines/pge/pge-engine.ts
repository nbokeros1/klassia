// PGE — Planning Generation Engine
// Responsibility: generate all pedagogical planning content (annual plans,
// sequences, lessons, activities, quizzes) using CKG and PPE as inputs.
//
// Status: SPIE-01 — Interface and stubs only. Implementation in SPIE-04.
//
// Existing infrastructure this engine will delegate to:
//   - src/lib/ia/teacher-reasoning-engine.ts
//   - src/lib/ia/build-system-prompt.ts
//   - src/lib/ia/teacher-memory-engine.ts
//   - src/lib/ia/build-auto-context.ts
//   - src/lib/ia/get-max-tokens.ts
//   - /api/ia/generer, /api/ia/curriculum, /api/ia/assistant

import type {
  AnnualPlanGenerationRequest,
  LessonGenerationRequest,
} from '../../types/planning'
import type {
  PGEGenerationContext,
  PGEAnnualPlanResult,
  PGESequenceResult,
  PGELessonResult,
} from './types'

export interface IPGEEngine {
  // Generate a full annual plan
  generateAnnualPlan(
    request: AnnualPlanGenerationRequest,
    context: PGEGenerationContext,
  ): Promise<PGEAnnualPlanResult>

  // Generate sequences for an existing annual plan
  generateSequences(
    annualPlanId: string,
    context: PGEGenerationContext,
  ): Promise<PGESequenceResult>

  // Generate a single lesson plan
  generateLesson(
    request: LessonGenerationRequest,
    context: PGEGenerationContext,
  ): Promise<PGELessonResult>

  // Regenerate a lesson with teacher feedback
  regenerateLesson(
    lessonId: string,
    feedback: string,
    context: PGEGenerationContext,
  ): Promise<PGELessonResult>
}

export class PGEEngine implements IPGEEngine {
  async generateAnnualPlan(
    _request: AnnualPlanGenerationRequest,
    _context: PGEGenerationContext,
  ): Promise<PGEAnnualPlanResult> {
    throw new Error('PGEEngine.generateAnnualPlan — not implemented (SPIE-04)')
  }

  async generateSequences(
    _annualPlanId: string,
    _context: PGEGenerationContext,
  ): Promise<PGESequenceResult> {
    throw new Error('PGEEngine.generateSequences — not implemented (SPIE-04)')
  }

  async generateLesson(
    _request: LessonGenerationRequest,
    _context: PGEGenerationContext,
  ): Promise<PGELessonResult> {
    throw new Error('PGEEngine.generateLesson — not implemented (SPIE-04)')
  }

  async regenerateLesson(
    _lessonId: string,
    _feedback: string,
    _context: PGEGenerationContext,
  ): Promise<PGELessonResult> {
    throw new Error('PGEEngine.regenerateLesson — not implemented (SPIE-04)')
  }
}

export const pge = new PGEEngine()
