// ── Execution Engine — Public API (ME-13.5) ───────────────────────────────────
//
// Usage server-side :
//   const plans = new ExecutionEngine().createPlans(missionPlan)
//   const plan  = new ExecutionEngine().createPlan(mission)

export { ExecutionEngine }            from './execution-engine'
export { ExecutionRegistry }          from './execution-registry'
export type { ExecutionTemplate }     from './execution-registry'
export {
  createExecutionRouteRegistry,
}                                     from './execution-context'
export type {
  ExecutionRouteRegistry,
  ExecutionContext,
}                                     from './execution-context'
export { validateExecutionPlan }      from './validators/execution-plan-validator'
export type {
  ExecutionPlanValidation,
}                                     from './validators/execution-plan-validator'

export type {
  ExecutionTargetType,
  ExecutionStepKind,
  ExecutionStepStatus,
  ExecutionTarget,
  ExecutionRequirement,
  ExecutionStep,
  ExecutionPlanSummary,
  ExecutionPlan,
  ExecutionCapability,
  MissionExecutionResponse,
}                                     from './types'

// ── ME-13.5 : Capabilities ────────────────────────────────────────────────────

export type { ExecutionCapabilityDefinition } from './capabilities/capability-catalog'
export {
  EXECUTION_CAPABILITY_CATALOG,
  getCapabilityDefinition,
  getAllCapabilityDefinitions,
}                                     from './capabilities/capability-catalog'

// ── ME-13.5 : Recipes ─────────────────────────────────────────────────────────

export type {
  ExecutionRecipe,
  ExecutionRecipeStep,
}                                     from './recipes/types'
export {
  EXECUTION_RECIPE_VERSION,
}                                     from './recipes/types'
export { validateExecutionRecipe }    from './recipes/recipe-validator'
export type {
  ExecutionRecipeValidation,
}                                     from './recipes/recipe-validator'

// ── ME-13.5 : Builders ────────────────────────────────────────────────────────

export { ExecutionPlanBuilder }       from './builders/execution-plan-builder'
