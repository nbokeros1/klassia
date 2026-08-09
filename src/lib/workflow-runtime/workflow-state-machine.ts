// ── Workflow Runtime — Machine à états (ME-14) ────────────────────────────────

import type {
  WorkflowStatus,
  WorkflowStepStatus,
  WorkflowError,
  WorkflowResult,
  WorkflowInstance,
  WorkflowStepState,
} from './types'

// ── Transitions de workflow ───────────────────────────────────────────────────

type WorkflowTransitionAction =
  | 'start'
  | 'pause'
  | 'resume'
  | 'complete'
  | 'cancel'
  | 'block'
  | 'unblock'

const WORKFLOW_TRANSITIONS: Record<WorkflowStatus, Partial<Record<WorkflowTransitionAction, WorkflowStatus>>> = {
  not_started: { start: 'in_progress', cancel: 'cancelled' },
  in_progress: { pause: 'paused',      complete: 'completed', cancel: 'cancelled', block: 'blocked' },
  paused:      { resume: 'in_progress', cancel: 'cancelled' },
  blocked:     { resume: 'in_progress', cancel: 'cancelled' },
  completed:   {},
  cancelled:   {},
}

export function applyWorkflowTransition(
  current: WorkflowStatus,
  action:  WorkflowTransitionAction,
): WorkflowResult<WorkflowStatus> {
  if (current === 'completed') {
    return { ok: false, error: { code: 'WORKFLOW_ALREADY_COMPLETED', message: 'Le workflow est déjà terminé.' } }
  }
  if (current === 'cancelled') {
    return { ok: false, error: { code: 'WORKFLOW_CANCELLED', message: 'Le workflow est annulé.' } }
  }

  const next = WORKFLOW_TRANSITIONS[current]?.[action]
  if (!next) {
    return {
      ok: false,
      error: {
        code:    'INVALID_WORKFLOW_TRANSITION',
        message: `Transition "${action}" invalide depuis le statut "${current}".`,
      },
    }
  }

  return { ok: true, data: next }
}

export function isWorkflowActive(status: WorkflowStatus): boolean {
  return status === 'in_progress' || status === 'paused' || status === 'blocked'
}

export function canWorkflowReceiveAction(status: WorkflowStatus): boolean {
  return status !== 'completed' && status !== 'cancelled'
}

// ── Transitions d'étape ───────────────────────────────────────────────────────

type StepTransitionAction =
  | 'activate'
  | 'start'
  | 'complete'
  | 'skip'
  | 'block'
  | 'unblock'
  | 'reopen'

const STEP_TRANSITIONS: Record<WorkflowStepStatus, Partial<Record<StepTransitionAction, WorkflowStepStatus>>> = {
  pending:     { activate: 'available', block: 'blocked' },
  available:   { start: 'in_progress', complete: 'completed', skip: 'skipped', block: 'blocked' },
  in_progress: { complete: 'completed', block: 'blocked', unblock: 'available' },
  blocked:     { unblock: 'available' },
  completed:   { reopen: 'available' },
  skipped:     { reopen: 'available' },
}

export function applyStepTransition(
  current: WorkflowStepStatus,
  action:  StepTransitionAction,
): WorkflowResult<WorkflowStepStatus> {
  const next = STEP_TRANSITIONS[current]?.[action]

  if (!next) {
    return {
      ok: false,
      error: {
        code:    'INVALID_WORKFLOW_TRANSITION',
        message: `Transition étape "${action}" invalide depuis "${current}".`,
      },
    }
  }

  return { ok: true, data: next }
}

// ── Règles métier des étapes ──────────────────────────────────────────────────

export function validateStepCanStart(
  step: WorkflowStepState,
  allSteps: WorkflowStepState[],
): WorkflowError | null {
  if (step.status === 'blocked') {
    return { code: 'WORKFLOW_BLOCKED', message: `L'étape ${step.stepId} est bloquée.` }
  }
  if (step.status === 'pending') {
    return {
      code:    'STEP_NOT_AVAILABLE',
      message: `L'étape ${step.stepId} n'est pas encore disponible (pending).`,
    }
  }
  if (step.status !== 'available' && step.status !== 'in_progress') {
    return {
      code:    'STEP_NOT_AVAILABLE',
      message: `L'étape ${step.stepId} a le statut "${step.status}" — impossible de la démarrer.`,
    }
  }

  // Une seule étape in_progress à la fois
  const alreadyInProgress = allSteps.find(s => s.stepId !== step.stepId && s.status === 'in_progress')
  if (alreadyInProgress) {
    return {
      code:    'PREVIOUS_STEP_INCOMPLETE',
      message: `L'étape ${alreadyInProgress.stepId} est déjà en cours — une seule étape active à la fois.`,
    }
  }

  return null
}

export function validateStepCanComplete(step: WorkflowStepState): WorkflowError | null {
  if (step.status === 'completed') {
    return { code: 'STEP_ALREADY_COMPLETED', message: `L'étape ${step.stepId} est déjà terminée.` }
  }
  if (step.status === 'skipped') {
    return { code: 'STEP_ALREADY_COMPLETED', message: `L'étape ${step.stepId} a été ignorée.` }
  }
  if (step.status === 'blocked') {
    return { code: 'WORKFLOW_BLOCKED', message: `L'étape ${step.stepId} est bloquée.` }
  }
  if (step.status === 'pending') {
    return { code: 'STEP_NOT_AVAILABLE', message: `L'étape ${step.stepId} n'est pas encore disponible.` }
  }
  return null
}

export function validateStepCanSkip(step: WorkflowStepState, isOptional: boolean): WorkflowError | null {
  if (!isOptional) {
    return {
      code:    'STEP_NOT_OPTIONAL',
      message: `L'étape ${step.stepId} est obligatoire — impossible de l'ignorer.`,
    }
  }
  if (step.status === 'completed') {
    return { code: 'STEP_ALREADY_COMPLETED', message: `L'étape ${step.stepId} est déjà terminée.` }
  }
  if (step.status === 'skipped') {
    return { code: 'STEP_ALREADY_COMPLETED', message: `L'étape ${step.stepId} est déjà ignorée.` }
  }
  return null
}

// ── Activation de l'étape suivante ────────────────────────────────────────────

/**
 * Identifie la prochaine étape à activer après qu'une étape soit completed/skipped.
 * Retourne null si aucune étape suivante n'est disponible.
 */
export function findNextActivatableStep(
  steps: WorkflowStepState[],
  planStepsIsBlocked: (stepId: string) => boolean,
): WorkflowStepState | null {
  const sorted = [...steps].sort((a, b) => a.order - b.order)

  for (const step of sorted) {
    if (step.status === 'pending') {
      if (planStepsIsBlocked(step.stepId)) {
        return null
      }
      return step
    }
  }

  return null
}

// ── État bloqué du workflow ────────────────────────────────────────────────────

export interface WorkflowBlockingState {
  blocked:         boolean
  blockingStepIds: string[]
  reasons:         string[]
}

/**
 * Évalue si le workflow est dans un état bloqué.
 * Un workflow est bloqué si aucune étape n'est available ou in_progress,
 * et qu'au moins une étape obligatoire non satisfaite est blocked.
 */
export function evaluateWorkflowBlockingState(
  steps:           WorkflowStepState[],
  optionalStepIds: Set<string>,
  blockingLabels:  Map<string, string[]>,
): WorkflowBlockingState {
  const hasAvailableOrInProgress = steps.some(
    s => s.status === 'available' || s.status === 'in_progress',
  )

  if (hasAvailableOrInProgress) {
    return { blocked: false, blockingStepIds: [], reasons: [] }
  }

  const blockedRequired = steps.filter(
    s => s.status === 'blocked' && !optionalStepIds.has(s.stepId),
  )

  if (blockedRequired.length === 0) {
    return { blocked: false, blockingStepIds: [], reasons: [] }
  }

  const blockingStepIds = blockedRequired.map(s => s.stepId)
  const reasons = blockedRequired.flatMap(s => blockingLabels.get(s.stepId) ?? [])

  return { blocked: true, blockingStepIds, reasons }
}

// ── Vérification de complétion du workflow ────────────────────────────────────

/**
 * Retourne true si toutes les étapes obligatoires sont completed.
 * Les étapes optionnelles n'affectent pas cette vérification.
 */
export function isWorkflowComplete(
  steps:           WorkflowStepState[],
  optionalStepIds: Set<string>,
): boolean {
  return steps
    .filter(s => !optionalStepIds.has(s.stepId))
    .every(s => s.status === 'completed')
}
