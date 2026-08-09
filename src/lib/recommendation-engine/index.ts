// ── Recommendation Engine — Public API (ME-17) ────────────────────────────────

export type {
  RecommendationType, Recommendation, RecommendationFilters, RecommendationStrategy,
} from './recommendation-types'
export {
  RECOMMENDATION_TYPES, RECOMMENDATION_PRIORITIES,
  RecommendationPriority, RECOMMENDATION_ENGINE_VERSION,
} from './recommendation-types'

export { RecommendationBuilder }     from './recommendation-builder'
export { validateRecommendation }    from './recommendation-validator'
export type { RecommendationValidationResult } from './recommendation-validator'

export { RecommendationRegistry }    from './recommendation-registry'
export { RecommendationEngine, createRecommendationEngine } from './recommendation-engine'
export type { RecommendationRepository } from './recommendation-repository'
export { SupabaseRecommendationRepository } from './recommendation-repository'

export { summarizeRecommendations }  from './summary'
export type { RecommendationSummary } from './summary'

export { PlanningRecommendationStrategy, PreparationRecommendationStrategy } from './strategies/planning-recommendation'
export { WorkflowRecommendationStrategy }    from './strategies/workflow-recommendation'
export { EvaluationRecommendationStrategy }  from './strategies/evaluation-recommendation'
export { ConsistencyRecommendationStrategy } from './strategies/consistency-recommendation'
export { ProductivityRecommendationStrategy } from './strategies/productivity-recommendation'
export { WellbeingRecommendationStrategy }   from './strategies/fatigue-recommendation'
