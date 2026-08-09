// ── Execution Engine — Step Utilities (internal, ME-13) ──────────────────────
//
// Utilitaires partagés entre les templates.
// Non exportés depuis index.ts.

import type {
  ExecutionStep,
  ExecutionPlanSummary,
  ExecutionRequirement,
  ExecutionStepStatus,
} from './types'

export const MAX_PLAN_STEPS = 10
export const EXECUTION_VERSION = 'ME-13.5'

// ── Query params ──────────────────────────────────────────────────────────────

/**
 * Liste blanche des paramètres autorisés dans les URLs de navigation.
 * Ne jamais copier automatiquement toute la metadata d'une mission.
 */
const ALLOWED_QUERY_KEYS = new Set([
  'classe_id', 'matiere', 'mission_key', 'event_id', 'document_id',
  'mode', 'source', 'type', 'sujet', 'conversation',
])

export function buildQuery(
  params: Record<string, string | null | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (ALLOWED_QUERY_KEYS.has(k) && typeof v === 'string' && v.trim() !== '') {
      result[k] = v
    }
  }
  return result
}

// ── IDs déterministes ─────────────────────────────────────────────────────────

export function makePlanId(sourceId: string): string {
  return `execution:${sourceId}`
}

export function makeStepId(planId: string, stepCode: string): string {
  return `${planId}:step:${stepCode}`
}

// ── Statuts ───────────────────────────────────────────────────────────────────

type RawStep = Omit<ExecutionStep, 'status'>

/**
 * Assigne les statuts pending/available/blocked à la liste ordonnée d'étapes.
 *
 * Règles :
 *  - une étape est `blocked` si au moins un requirement blocking non satisfait ;
 *  - la première étape non bloquée reçoit `available` ;
 *  - les autres étapes non bloquées reçoivent `pending`.
 */
export function assignStatuses(steps: RawStep[]): ExecutionStep[] {
  let foundAvailable = false
  return steps.map(step => {
    const isBlocked = step.requirements.some(
      (r: ExecutionRequirement) => r.blocking && !r.satisfied,
    )
    let status: ExecutionStepStatus
    if (isBlocked) {
      status = 'blocked'
    } else if (!foundAvailable) {
      foundAvailable = true
      status = 'available'
    } else {
      status = 'pending'
    }
    return { ...step, status }
  })
}

// ── Summary ───────────────────────────────────────────────────────────────────

function sumMinutes(steps: ExecutionStep[]): number | null {
  const known = steps.map(s => s.estimatedMinutes).filter((m): m is number => m != null)
  return known.length > 0 ? known.reduce((a, b) => a + b, 0) : null
}

export function buildPlanSummary(steps: ExecutionStep[]): ExecutionPlanSummary {
  const firstAvailable = steps.find(s => s.status === 'available')
  return {
    totalSteps:       steps.length,
    actionableSteps:  steps.filter(s => s.status === 'available' || s.status === 'pending').length,
    blockedSteps:     steps.filter(s => s.status === 'blocked').length,
    estimatedMinutes: sumMinutes(steps),
    firstActionLabel: firstAvailable?.title ?? null,
  }
}

// ── Blocages ──────────────────────────────────────────────────────────────────

export function computeBlockingReasons(steps: ExecutionStep[]): string[] {
  const reasons = new Set<string>()
  for (const step of steps) {
    if (step.status === 'blocked') {
      for (const r of step.requirements) {
        if (r.blocking && !r.satisfied) reasons.add(r.label)
      }
    }
  }
  return [...reasons]
}

// ── Requirements communs ──────────────────────────────────────────────────────

export function reqClass(classeId: string | null): ExecutionRequirement {
  return {
    code:      'class_required',
    label:     'Une classe doit être sélectionnée.',
    satisfied: !!classeId,
    blocking:  true,
  }
}

export function reqSubject(matiere: string | null): ExecutionRequirement {
  return {
    code:      'subject_required',
    label:     'Une matière doit être sélectionnée.',
    satisfied: !!matiere,
    blocking:  true,
  }
}

export function reqPrepare(prepareRoute: string | null): ExecutionRequirement {
  return {
    code:      'prepare_route_available',
    label:     'La page Préparer doit être disponible.',
    satisfied: !!prepareRoute,
    blocking:  true,
  }
}
