// ── Insight Engine — Public API (ME-16) ───────────────────────────────────────

export type {
  InsightType, Insight, InsightPeriod, InsightEvidence,
  PatternAnalyzer, InsightFilters,
} from './insight-types'
export { INSIGHT_TYPES, INSIGHT_ENGINE_VERSION } from './insight-types'

export { InsightBuilder }         from './insight-builder'
export { validateInsight }        from './insight-validator'
export type { InsightValidationResult } from './insight-validator'

export { InsightRegistry }        from './insight-registry'
export { InsightEngine, createInsightEngine } from './insight-engine'
export type { InsightRepository } from './insight-repository'
export { SupabaseInsightRepository } from './insight-repository'

export { summarizeInsights }      from './summary'
export type { InsightSummary }    from './summary'

export { CadencePattern }         from './patterns/cadence-pattern'
export { PlanningPattern }        from './patterns/planning-pattern'
export { PreparationPattern, EvaluationPattern } from './patterns/preparation-pattern'
export { CompletionPattern, ProductivityPattern } from './patterns/completion-pattern'
export { ConsistencyPattern }     from './patterns/consistency-pattern'
export { InterruptionPattern }    from './patterns/interruption-pattern'
