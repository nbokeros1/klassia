// ── Predictive Engine — Public API (ME-18) ───────────────────────────────────

export type {
  PredictionType, Prediction, PredictionStrategy, PredictionFilters, CalendarContext,
} from './prediction-types'
export {
  PREDICTION_TYPES, PREDICTIVE_ENGINE_VERSION,
} from './prediction-types'

export { PredictionBuilder }          from './prediction-builder'
export { validatePrediction }         from './prediction-validator'
export type { PredictionValidationResult } from './prediction-validator'

export { PredictionRegistry }         from './prediction-registry'
export { PredictiveEngine, createPredictiveEngine } from './predictive-engine'
export type { PredictionRepository }  from './prediction-repository'
export { SupabasePredictionRepository } from './prediction-repository'

export { predictionsToMissions, predictionToMission, createPredictionProvider } from './prediction-mission-bridge'
export type { PredictionProvider }    from './prediction-mission-bridge'

// Calendar utils
export {
  daysUntil, eventsWithinDays, deadlinesWithinDays,
  upcomingEvaluationDeadlines, upcomingLessons, upcomingHolidays,
  hasExamPeriod, hasSemesterEnd, confidenceFromUrgency,
} from './predictive-calendar'

// Insight utils
export {
  getInsightsByType, averageConfidence, maxConfidence,
  hasLowPlanningScore, hasHighInterruption, hasLowConsistency,
  insightConfidenceBoost,
} from './predictive-insights'

// Strategies
export { EvaluationPredictionStrategy }  from './strategies/evaluation-prediction'
export { LessonPredictionStrategy }      from './strategies/lesson-prediction'
export { DeadlinePredictionStrategy }    from './strategies/deadline-prediction'
export { HolidayPredictionStrategy }     from './strategies/holiday-prediction'
export { ExamPeriodPredictionStrategy }  from './strategies/exam-period-prediction'
export { SemesterEndPredictionStrategy, GradingPeriodPredictionStrategy } from './strategies/semester-end-prediction'
