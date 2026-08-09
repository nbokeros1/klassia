// SPIE-02 — Constraint Engine Service

import type { ConstraintSet, ConstraintValidationResult, CurriculumPacingModel } from '../constraints/types'
import type { CurriculumExtractionRaw } from '../extraction/types'
import type { NormalizedOutcome } from '../extraction/types'
import { constraintEngine } from '../constraints/constraint-engine'

export class ConstraintEngineService {
  extractConstraints(
    raw: CurriculumExtractionRaw,
    outcomes: NormalizedOutcome[],
  ): ConstraintSet {
    return constraintEngine.extractConstraints(raw, outcomes)
  }

  validate(
    plannedOrder: string[],
    constraints: ConstraintSet,
  ): ConstraintValidationResult {
    return constraintEngine.validate(plannedOrder, constraints)
  }

  buildPacingModel(
    outcomes: NormalizedOutcome[],
    constraints: ConstraintSet,
    minutesPerWeek?: number,
  ): CurriculumPacingModel {
    return constraintEngine.buildPacingModel(outcomes, constraints, minutesPerWeek)
  }
}

export const constraintEngineService = new ConstraintEngineService()
