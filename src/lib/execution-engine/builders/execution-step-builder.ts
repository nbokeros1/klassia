// ── Execution Step Builder (ME-13.5) ─────────────────────────────────────────
//
// Transforme un ExecutionRecipeStep en RawStep (Omit<ExecutionStep, 'status'>).
// Le statut est assigné par assignStatuses, appelé dans ExecutionPlanBuilder.

import type { ExecutionStep }           from '../types'
import type { ExecutionContext }         from '../execution-context'
import type { ExecutionRecipeStep }     from '../recipes/types'
import { getCapabilityDefinition }      from '../capabilities/capability-catalog'
import { makeStepId }                   from '../step-utils'

type RawStep = Omit<ExecutionStep, 'status'>

export function buildExecutionStep(opts: {
  recipeStep:  ExecutionRecipeStep
  planId:      string
  order:       number
  context:     ExecutionContext
}): RawStep {
  const { recipeStep, planId, order } = opts
  const def = getCapabilityDefinition(recipeStep.capability)

  if (!def) {
    throw new Error(`[ExecutionStepBuilder] capability inconnue : "${recipeStep.capability}"`)
  }

  // kind : override de la recette en priorité, sinon valeur par défaut du catalogue
  const kind = recipeStep.kind ?? def.defaultKind

  // estimatedMinutes : override si défini explicitement (null = pas d'estimation)
  const estimatedMinutes = recipeStep.estimatedMinutes !== undefined
    ? recipeStep.estimatedMinutes
    : def.defaultEstimatedMinutes

  return {
    id:                 makeStepId(planId, recipeStep.code),
    order,
    capability:         recipeStep.capability,
    kind,
    title:              recipeStep.title,
    description:        recipeStep.description,
    target:             recipeStep.target ?? null,
    requirements:       recipeStep.requirements ?? [],
    completionCriteria: recipeStep.completionCriteria ?? [],
    estimatedMinutes,
    optional:           recipeStep.optional ?? false,
  }
}
