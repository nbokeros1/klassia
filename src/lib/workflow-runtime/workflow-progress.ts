// ── Workflow Runtime — Calcul de progression (ME-14) ──────────────────────────

import type { WorkflowProgress } from './types'
import type { WorkflowStepState } from './types'

/**
 * Calcule la progression d'un workflow.
 *
 * Règle :
 *   - denominateur = nombre d'étapes obligatoires uniquement ;
 *   - numérateur   = étapes obligatoires completed ;
 *   - les étapes optionnelles sont suivies séparément (ne bloquent pas 100 %).
 *
 * Ainsi : 100 % signifie que toutes les étapes obligatoires sont terminées.
 */
export function calculateWorkflowProgress(
  steps:           WorkflowStepState[],
  optionalStepIds: Set<string>,
): WorkflowProgress {
  const required = steps.filter(s => !optionalStepIds.has(s.stepId))
  const optional = steps.filter(s =>  optionalStepIds.has(s.stepId))

  const totalRequired     = required.length
  const completedRequired = required.filter(s => s.status === 'completed').length

  const completedOptional = optional.filter(s => s.status === 'completed').length
  const skippedOptional   = optional.filter(s => s.status === 'skipped').length

  const remainingRequired = totalRequired - completedRequired

  const percent = totalRequired === 0
    ? 0
    : Math.min(100, Math.max(0, Math.round((completedRequired / totalRequired) * 100)))

  return {
    percent,
    completedRequiredSteps: completedRequired,
    totalRequiredSteps:     totalRequired,
    completedOptionalSteps: completedOptional,
    skippedOptionalSteps:   skippedOptional,
    remainingRequiredSteps: remainingRequired,
  }
}
