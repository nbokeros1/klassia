// ── Recipe Builder Helpers (ME-13.5) ─────────────────────────────────────────
//
// Helpers factorisés pour les RecipeSteps récurrents entre templates.
// Utilisés par au moins 2 templates chacun.
// Retournent des ExecutionRecipeStep, pas des ExecutionStep finaux.

import type { ExecutionRecipeStep }   from './types'
import type { ExecutionTarget }       from '../types'
import type { ExecutionRequirement }  from '../types'
import { reqPrepare, reqClass }       from '../step-utils'

// ── navigate_to_prepare ───────────────────────────────────────────────────────
// Utilisé par : next-lesson, evaluation, deadline, bundle, generic

export function createNavigateToPrepareStep(
  route: string | null,
  query:  Record<string, string>,
  overrides?: Partial<Pick<ExecutionRecipeStep, 'title' | 'description' | 'completionCriteria'>>,
): ExecutionRecipeStep {
  return {
    code:               'open_preparer',
    capability:         'navigate_to_prepare',
    title:              overrides?.title       ?? 'Ouvrir Préparer',
    description:        overrides?.description ?? 'Accédez à ScorgIA Préparer avec la classe et la matière présélectionnées.',
    target:             { type: 'route', route, query, referenceId: null },
    requirements:       [reqPrepare(route)],
    completionCriteria: overrides?.completionCriteria ?? ['La page Préparer est ouverte', 'La classe et la matière sont sélectionnées'],
    estimatedMinutes:   2,
  }
}

// ── verify_document ───────────────────────────────────────────────────────────
// Utilisé par : next-lesson (CAS A/B/C), evaluation, bundle

export function createVerifyDocumentStep(
  code:  string,
  title: string,
  description: string,
  completionCriteria: string[],
  estimatedMinutes = 3,
): ExecutionRecipeStep {
  return {
    code,
    capability:         'verify_document',
    title,
    description,
    target:             null,
    requirements:       [],
    completionCriteria,
    estimatedMinutes,
  }
}

// ── confirm_completion ────────────────────────────────────────────────────────
// Utilisé par : tous les templates

export function createConfirmationStep(
  code:  string,
  title: string,
  description: string,
  completionCriteria: string[],
): ExecutionRecipeStep {
  return {
    code,
    capability:         'confirm_completion',
    title,
    description,
    target:             null,
    requirements:       [],
    completionCriteria,
    estimatedMinutes:   1,
    optional:           false,
  }
}

// ── navigate_to_class ─────────────────────────────────────────────────────────
// Utilisé par : work, bundle, deadline

export function createNavigateToClassStep(
  code:       string,
  title:      string,
  description: string,
  route:      string | null,
  classeId:   string | null,
  completionCriteria: string[],
  requirements: ExecutionRequirement[] = [],
  estimatedMinutes = 2,
): ExecutionRecipeStep {
  const target: ExecutionTarget | null = route
    ? { type: 'class', route, query: {}, referenceId: classeId }
    : null
  return {
    code,
    capability:         'navigate_to_class',
    title,
    description,
    target,
    requirements:       requirements.length > 0 ? requirements : [reqClass(classeId)],
    completionCriteria,
    estimatedMinutes,
  }
}

// ── review_annual_plan ────────────────────────────────────────────────────────
// Utilisé par : next-lesson CAS B/C, deadline break

export function createReviewAnnualPlanStep(
  code:  string,
  title: string,
  description: string,
  completionCriteria: string[],
  kind?: ExecutionRecipeStep['kind'],
): ExecutionRecipeStep {
  return {
    code,
    capability:         'review_annual_plan',
    kind,
    title,
    description,
    target:             null,
    requirements:       [],
    completionCriteria,
    estimatedMinutes:   5,
  }
}
