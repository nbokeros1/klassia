// SPIE-07 — Pedagogical Strategy Engine (PSE)
// Exports all PSE types, engines, and services.

// Types
export * from './types'

// Engines
export { StrategyBuilder, strategyBuilder } from './builder/strategy-builder'
export type { StrategyBuilderInput, StrategyBuilderOutput } from './builder/strategy-builder'
export { StrategyValidator, strategyValidator } from './validation/strategy-validator'
export type { StrategyValidatorInput } from './validation/strategy-validator'
export { StrategyComparisonEngine, strategyComparisonEngine } from './comparison/strategy-comparison-engine'
export type { ComparisonEngineInput } from './comparison/strategy-comparison-engine'
export { StrategyRecommendationEngine, strategyRecommendationEngine } from './recommendations/strategy-recommendation-engine'
export type { RecommendationEngineInput } from './recommendations/strategy-recommendation-engine'
export { PedagogicalDecisionTreeBuilder, pedagogicalDecisionTreeBuilder } from './decision-tree/pedagogical-decision-tree'
export type { DecisionTreeInput } from './decision-tree/pedagogical-decision-tree'

// Services
export { StrategyBuilderService, strategyBuilderService } from './services/strategy-builder.service'
export { StrategyValidatorService, strategyValidatorService } from './services/strategy-validator.service'
export { StrategyComparisonService, strategyComparisonService } from './services/strategy-comparison.service'
export { StrategyRecommendationService, strategyRecommendationService } from './services/strategy-recommendation.service'
export { DecisionTreeService, decisionTreeService } from './services/decision-tree.service'
