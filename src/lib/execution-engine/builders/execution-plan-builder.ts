// ── Execution Plan Builder (ME-13.5) ─────────────────────────────────────────
//
// Pipeline : ExecutionRecipe → ExecutionPlan
//
// 1. validateExecutionRecipe
// 2. transformer RecipeSteps → RawSteps (via buildExecutionStep)
// 3. assignStatuses → blocked / available / pending
// 4. buildExecutionPlanSummary
// 5. calculer canStart / blockingReasons / targetRoute
// 6. validateExecutionPlan
// 7. retourner ExecutionPlan

import type { ExecutionPlan }          from '../types'
import type { ExecutionContext }        from '../execution-context'
import type { ExecutionRecipe }        from '../recipes/types'
import { validateExecutionRecipe }     from '../recipes/recipe-validator'
import { buildExecutionStep }          from './execution-step-builder'
import { buildExecutionPlanSummary }   from './execution-summary-builder'
import { validateExecutionPlan }       from '../validators/execution-plan-validator'
import {
  assignStatuses,
  computeBlockingReasons,
  EXECUTION_VERSION,
}                                       from '../step-utils'
import { GenericTemplate }             from '../templates/generic-template'

export class ExecutionPlanBuilder {

  build(recipe: ExecutionRecipe, context: ExecutionContext): ExecutionPlan {
    const recipeVal = validateExecutionRecipe(recipe)
    if (!recipeVal.valid) {
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(
          `[ExecutionPlanBuilder] Recette invalide (${recipe.id}) : ${recipeVal.errors.join(' | ')}`,
        )
      }
      return this._buildFallback(context)
    }
    return this._convert(recipe, context, true)
  }

  private _convert(
    recipe:         ExecutionRecipe,
    context:        ExecutionContext,
    validateResult: boolean,
  ): ExecutionPlan {
    const rawSteps = recipe.steps.map((rs, i) =>
      buildExecutionStep({ recipeStep: rs, planId: recipe.id, order: i + 1, context }),
    )
    const steps   = assignStatuses(rawSteps)
    const summary = buildExecutionPlanSummary(steps)

    const plan: ExecutionPlan = {
      id:                 recipe.id,
      sourceType:         recipe.sourceType,
      sourceId:           recipe.sourceId,
      missionType:        recipe.missionType,
      title:              recipe.title,
      objective:          recipe.objective,
      classeId:           recipe.classeId,
      matiere:            recipe.matiere,
      steps,
      summary,
      canStart:           steps.some(s => s.status === 'available'),
      blockingReasons:    computeBlockingReasons(steps),
      targetRoute:        recipe.targetRoute ?? null,
      createdFromVersion: EXECUTION_VERSION,
    }

    if (validateResult) {
      const planVal = validateExecutionPlan(plan)
      if (!planVal.valid) {
        if (process.env.NODE_ENV !== 'production') {
          throw new Error(
            `[ExecutionPlanBuilder] Plan invalide (${plan.id}) : ${planVal.errors.join(' | ')}`,
          )
        }
        return this._buildFallback(context)
      }
    }

    return plan
  }

  // Fallback garanti : GenericTemplate produit toujours une recette valide
  private _buildFallback(context: ExecutionContext): ExecutionPlan {
    const recipe = new GenericTemplate().buildRecipe(context)
    return this._convert(recipe, context, false)
  }
}
