// ── PIL — Pedagogical Intelligence Layer — API publique ──────────────────────

export type {
  CurriculumUnit,
  CurriculumStructure,
  LessonInfo,
  EvaluatedUnit,
  EvaluationAnalysis,
  AssignmentStatus,
  AssignmentSnapshot,
  AssignmentAnalysis,
  FeedbackAnalysis,
  ProgressAnalysis,
} from './types'

export { CurriculumParser }    from './curriculum/curriculum-parser'
export { LessonAnalyzer }      from './lessons/lesson-analyzer'
export { EvaluationAnalyzer }  from './evaluations/evaluation-analyzer'
export { AssignmentAnalyzer }  from './assignments/assignment-analyzer'
export { FeedbackAnalyzer }    from './feedback/feedback-analyzer'
export { ProgressAnalyzer }    from './progress/progress-analyzer'
export type { ProgressAnalyzerInput } from './progress/progress-analyzer'

export {
  normaliser,
  extractLines,
  removeListPrefix,
  isSeparatorLine,
  isDateLine,
  isUrlLine,
  areSimilar,
  containsNorm,
} from './shared/text-utils'
