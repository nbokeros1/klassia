// ── Workflow Runtime — Orchestrateur (ME-14) ──────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  WorkflowInstance,
  WorkflowAction,
  WorkflowResult,
  WorkflowStepState,
  WorkflowStepStatus,
  WorkflowStatus,
  WorkflowIntegrityResult,
  WorkflowPublic,
  WorkflowProgress,
  CreateWorkflowParams,
} from './types'
import type { ExecutionPlan, ExecutionStep } from '../execution-engine/types'
import { validateExecutionPlan }             from '../execution-engine/validators/execution-plan-validator'
import { MissionStateProvider }              from '../mission-engine/providers/mission-state-provider'
import { sanitizePlanSnapshot, sanitizeNote, hydrateSnapshot } from './workflow-sanitizer'
import { calculateWorkflowProgress }         from './workflow-progress'
import {
  applyWorkflowTransition,
  evaluateWorkflowBlockingState,
  findNextActivatableStep,
  isWorkflowComplete,
  validateStepCanComplete,
  validateStepCanSkip,
  validateStepCanStart,
} from './workflow-state-machine'
import type { WorkflowRepository } from './workflow-repository'
import type { ActivityEngine }     from '../activity-engine/activity-engine'

// ── Helpers internes ──────────────────────────────────────────────────────────

function getPlanStep(plan: ExecutionPlan, stepId: string): ExecutionStep | undefined {
  return plan.steps.find(s => s.id === stepId)
}

function buildOptionalStepIds(plan: ExecutionPlan): Set<string> {
  return new Set(plan.steps.filter(s => s.optional).map(s => s.id))
}

function buildBlockingLabels(plan: ExecutionPlan): Map<string, string[]> {
  const m = new Map<string, string[]>()
  for (const step of plan.steps) {
    const blocking = step.requirements
      .filter(r => r.blocking && !r.satisfied)
      .map(r => r.label)
    if (blocking.length > 0) m.set(step.id, blocking)
  }
  return m
}

function isStepBlockedByRequirements(plan: ExecutionPlan, stepId: string): boolean {
  const step = getPlanStep(plan, stepId)
  if (!step) return false
  return step.requirements.some(r => r.blocking && !r.satisfied)
}

const now = () => new Date().toISOString()

// ── Validation d'intégrité ────────────────────────────────────────────────────

export function validateWorkflowIntegrity(instance: WorkflowInstance): WorkflowIntegrityResult {
  const errors: WorkflowIntegrityResult['errors'] = []

  const plan = hydrateSnapshot(instance.plan as unknown)
  if (!plan) {
    errors.push({ code: 'INVALID_SNAPSHOT', message: 'plan_snapshot invalide ou corrompu.' })
    return { valid: false, errors }
  }

  const planStepIds = new Set(plan.steps.map((s: ExecutionStep) => s.id))
  const stateStepIds = new Set(instance.steps.map(s => s.stepId))

  for (const stepState of instance.steps) {
    if (!planStepIds.has(stepState.stepId)) {
      errors.push({ code: 'UNKNOWN_STEP', message: `État d'étape inconnu dans le plan : ${stepState.stepId}` })
    }
  }

  for (const planStep of plan.steps) {
    if (!stateStepIds.has(planStep.id)) {
      errors.push({ code: 'MISSING_STEP_STATE', message: `Étape du plan sans état : ${planStep.id}` })
    }
  }

  // Vérifier les ordres
  const stateOrders = instance.steps.map(s => s.order).sort((a, b) => a - b)
  for (let i = 0; i < stateOrders.length; i++) {
    if (stateOrders[i] !== i + 1) {
      errors.push({ code: 'INVALID_ORDERS', message: `Ordres d'étapes non séquentiels.` })
      break
    }
  }

  // Versions
  if (plan.createdFromVersion !== instance.planVersion) {
    errors.push({
      code:    'VERSION_MISMATCH',
      message: `Version plan_snapshot (${plan.createdFromVersion}) ≠ plan_version (${instance.planVersion}).`,
    })
  }

  return { valid: errors.length === 0, errors }
}

// ── Conversion en réponse publique ────────────────────────────────────────────

export function toWorkflowPublic(instance: WorkflowInstance): WorkflowPublic {
  const optionalIds  = buildOptionalStepIds(instance.plan)
  const progress     = calculateWorkflowProgress(instance.steps, optionalIds)
  const sortedSteps  = [...instance.steps].sort((a, b) => a.order - b.order)

  const steps = sortedSteps.map(state => {
    const planStep = getPlanStep(instance.plan, state.stepId)
    const blockingLabels = (planStep?.requirements ?? [])
      .filter(r => r.blocking && !r.satisfied)
      .map(r => r.label)

    return {
      id:                 state.stepId,
      order:              state.order,
      kind:               planStep?.kind ?? 'review',
      title:              planStep?.title ?? state.stepId,
      description:        planStep?.description ?? '',
      status:             state.status,
      target:             planStep?.target ?? null,
      completionCriteria: planStep?.completionCriteria ?? [],
      estimatedMinutes:   planStep?.estimatedMinutes ?? null,
      optional:           planStep?.optional ?? false,
      blockingLabels,
    }
  })

  const { status } = instance

  return {
    id:              instance.id,
    missionKey:      instance.missionKey,
    executionPlanId: instance.executionPlanId,
    status,
    title:           instance.plan.title,
    objective:       instance.plan.objective,
    missionType:     instance.missionType,
    classeId:        instance.plan.classeId,
    matiere:         instance.plan.matiere,
    currentStepId:   instance.currentStepId,
    progress,
    steps,
    canPause:        status === 'in_progress',
    canResume:       status === 'paused' || status === 'blocked',
    canCancel:       status !== 'completed' && status !== 'cancelled',
    version:         instance.version,
    updatedAt:       instance.updatedAt.toISOString(),
  }
}

// ── WorkflowRuntime ───────────────────────────────────────────────────────────

export class WorkflowRuntime {
  private repository:    WorkflowRepository
  private missionState:  MissionStateProvider
  private activityEngine?: ActivityEngine

  constructor({
    repository,
    supabase,
    activityEngine,
  }: {
    repository:      WorkflowRepository
    supabase:        SupabaseClient
    activityEngine?: ActivityEngine
  }) {
    this.repository    = repository
    this.missionState  = new MissionStateProvider({ supabase })
    this.activityEngine = activityEngine
  }

  // ── Création d'instance ─────────────────────────────────────────────────────

  async createInstance(params: CreateWorkflowParams): Promise<WorkflowResult<WorkflowInstance>> {
    const { enseignantId, missionId, missionKey, executionPlan } = params

    // 1. Valider le plan
    const planValidation = validateExecutionPlan(executionPlan)
    if (!planValidation.valid) {
      return {
        ok: false,
        error: {
          code:    'INVALID_EXECUTION_PLAN',
          message: `Plan invalide : ${planValidation.errors.join('; ')}`,
        },
      }
    }

    // 2. Assainir le snapshot
    let planSnapshot: Record<string, unknown>
    try {
      planSnapshot = sanitizePlanSnapshot(executionPlan)
    } catch (e) {
      return {
        ok: false,
        error: {
          code:    'INVALID_EXECUTION_PLAN',
          message: 'Plan snapshot contient des données interdites.',
        },
      }
    }

    // 3. Vérifier l'absence d'instance existante (idempotence)
    const existing = await this.repository.getInstanceByExecutionPlanId(
      executionPlan.id,
      enseignantId,
    )
    if (existing) {
      return { ok: true, data: existing }
    }

    // 4. Calculer les statuts initiaux des étapes
    const initialSteps = executionPlan.steps.map(step => {
      let statut: WorkflowStepStatus
      const isBlocked = step.requirements.some(r => r.blocking && !r.satisfied)
      if (isBlocked) {
        statut = 'blocked'
      } else if (step.status === 'available') {
        statut = 'available'
      } else {
        statut = 'pending'
      }
      return { stepId: step.id, stepOrder: step.order, statut }
    })

    // 5. Créer l'instance avec ses états d'étapes
    const instance = await this.repository.createInstance({
      enseignantId,
      missionId,
      missionKey,
      executionPlanId: executionPlan.id,
      sourceType:      executionPlan.sourceType,
      sourceId:        executionPlan.sourceId,
      missionType:     executionPlan.missionType,
      planVersion:     executionPlan.createdFromVersion,
      planSnapshot,
      initialSteps,
    })

    if (!instance) {
      // Conflit unique → retourner l'existant
      const conflict = await this.repository.getInstanceByExecutionPlanId(executionPlan.id, enseignantId)
      if (conflict) return { ok: true, data: conflict }
      return {
        ok: false,
        error: { code: 'INVALID_EXECUTION_PLAN', message: 'Échec de création de l\'instance.' },
      }
    }

    return { ok: true, data: instance }
  }

  // ── Application d'actions ───────────────────────────────────────────────────

  async applyAction(
    workflowId:      string,
    enseignantId:    string,
    action:          WorkflowAction,
    expectedVersion: number,
  ): Promise<WorkflowResult<WorkflowInstance>> {
    // Charger et valider l'intégrité
    const instance = await this.repository.getInstance(workflowId, enseignantId)
    if (!instance) {
      return { ok: false, error: { code: 'STEP_NOT_FOUND', message: 'Instance introuvable.' } }
    }

    // Contrôle de version
    if (instance.version !== expectedVersion) {
      return {
        ok: false,
        error: { code: 'WORKFLOW_VERSION_CONFLICT', message: `Version conflictuelle (attendu ${expectedVersion}, actuel ${instance.version}).` },
      }
    }

    // Intégrité
    const integrity = validateWorkflowIntegrity(instance)
    if (!integrity.valid) {
      console.error('[KLASSIA][WORKFLOW_RUNTIME][INTEGRITY_ERROR]', {
        workflowId,
        errors: integrity.errors.map(e => e.code),
      })
      return { ok: false, error: { code: 'WORKFLOW_INTEGRITY_ERROR', message: 'Intégrité du workflow compromise.' } }
    }

    switch (action.type) {
      case 'start_workflow':    return this._startWorkflow(instance, enseignantId)
      case 'start_step':        return this._startStep(instance, enseignantId, action.stepId)
      case 'complete_step':     return this._completeStep(instance, enseignantId, action.stepId, action.note)
      case 'skip_step':         return this._skipStep(instance, enseignantId, action.stepId, action.note)
      case 'pause_workflow':    return this._pauseWorkflow(instance, enseignantId)
      case 'resume_workflow':   return this._resumeWorkflow(instance, enseignantId)
      case 'cancel_workflow':   return this._cancelWorkflow(instance, enseignantId)
      case 'reopen_step':       return this._reopenStep(instance, enseignantId, action.stepId)
      case 'refresh_blocking_state': return this._refreshBlockingState(instance, enseignantId)
      default: {
        const _: never = action
        return { ok: false, error: { code: 'INVALID_WORKFLOW_TRANSITION', message: 'Action inconnue.' } }
      }
    }
  }

  // ── start_workflow ──────────────────────────────────────────────────────────

  private async _startWorkflow(instance: WorkflowInstance, enseignantId: string): Promise<WorkflowResult<WorkflowInstance>> {
    // Idempotence
    if (instance.status === 'in_progress') return { ok: true, data: instance }

    const transition = applyWorkflowTransition(instance.status, 'start')
    if (!transition.ok) return transition

    const firstAvailable = instance.steps.find(s => s.status === 'available')

    const updated = await this.repository.updateInstance({
      id: instance.id, enseignantId,
      expectedVersion: instance.version,
      updates: {
        statut:        'in_progress',
        startedAt:     instance.startedAt ? undefined : now(),
        currentStepId: firstAvailable?.stepId ?? null,
      },
    })

    if (!updated) {
      return { ok: false, error: { code: 'WORKFLOW_VERSION_CONFLICT', message: 'Conflit de version au démarrage.' } }
    }

    // Synchroniser la mission
    await this._syncMissionStart(instance, enseignantId)

    this.activityEngine?.workflow.onStarted(
      instance.id,
      instance.plan.classeId ?? null,
      instance.plan.matiere  ?? null,
      instance.missionType,
    )

    return { ok: true, data: updated }
  }

  // ── start_step ──────────────────────────────────────────────────────────────

  private async _startStep(instance: WorkflowInstance, enseignantId: string, stepId: string): Promise<WorkflowResult<WorkflowInstance>> {
    if (instance.status !== 'in_progress') {
      return { ok: false, error: { code: 'WORKFLOW_NOT_ACTIVE', message: 'Le workflow n\'est pas actif.' } }
    }

    const stepState = instance.steps.find(s => s.stepId === stepId)
    if (!stepState) {
      return { ok: false, error: { code: 'STEP_NOT_FOUND', message: `Étape ${stepId} introuvable.` } }
    }

    // Idempotence
    if (stepState.status === 'in_progress') return { ok: true, data: instance }

    const validationError = validateStepCanStart(stepState, instance.steps)
    if (validationError) return { ok: false, error: validationError }

    await this.repository.updateStepState({
      workflowInstanceId: instance.id, enseignantId, stepId,
      updates: {
        statut:    'in_progress',
        startedAt: stepState.startedAt ? undefined : now(),
      },
    })

    const updated = await this.repository.updateInstance({
      id: instance.id, enseignantId,
      expectedVersion: instance.version,
      updates: { currentStepId: stepId },
    })

    if (!updated) {
      return { ok: false, error: { code: 'WORKFLOW_VERSION_CONFLICT', message: 'Conflit de version.' } }
    }

    this.activityEngine?.workflow.onStepStarted(
      instance.id, stepId,
      instance.plan.classeId ?? null,
      instance.plan.matiere  ?? null,
    )

    return { ok: true, data: updated }
  }

  // ── complete_step ───────────────────────────────────────────────────────────

  private async _completeStep(
    instance:    WorkflowInstance,
    enseignantId: string,
    stepId:      string,
    rawNote?:    string,
  ): Promise<WorkflowResult<WorkflowInstance>> {
    if (instance.status !== 'in_progress') {
      return { ok: false, error: { code: 'WORKFLOW_NOT_ACTIVE', message: 'Le workflow n\'est pas actif.' } }
    }

    const stepState = instance.steps.find(s => s.stepId === stepId)
    if (!stepState) {
      return { ok: false, error: { code: 'STEP_NOT_FOUND', message: `Étape ${stepId} introuvable.` } }
    }

    // Idempotence
    if (stepState.status === 'completed') return { ok: true, data: instance }

    const validationError = validateStepCanComplete(stepState)
    if (validationError) return { ok: false, error: validationError }

    const note = sanitizeNote(rawNote)
    const completedAt = now()

    await this.repository.updateStepState({
      workflowInstanceId: instance.id, enseignantId, stepId,
      updates: { statut: 'completed', completedAt, completionNote: note },
    })

    // Mettre à jour les états de steps dans la copie locale pour recalcul
    const updatedSteps = instance.steps.map(s =>
      s.stepId === stepId ? { ...s, status: 'completed' as WorkflowStepStatus, completedAt: new Date(completedAt) } : s,
    )

    const optionalIds    = buildOptionalStepIds(instance.plan)
    const blockingLabels = buildBlockingLabels(instance.plan)
    const progress       = calculateWorkflowProgress(updatedSteps, optionalIds)
    const workflowDone   = isWorkflowComplete(updatedSteps, optionalIds)

    if (workflowDone) {
      return this._finalizeWorkflow(instance, enseignantId, updatedSteps, progress)
    }

    // Activer la prochaine étape
    const nextStep = findNextActivatableStep(updatedSteps, (sid) => isStepBlockedByRequirements(instance.plan, sid))
    if (nextStep) {
      await this.repository.updateStepState({
        workflowInstanceId: instance.id, enseignantId, stepId: nextStep.stepId,
        updates: { statut: 'available' },
      })
    }

    // Évaluer l'état bloqué
    const allUpdatedSteps = nextStep
      ? updatedSteps.map(s => s.stepId === nextStep.stepId ? { ...s, status: 'available' as WorkflowStepStatus } : s)
      : updatedSteps

    const blockingState = evaluateWorkflowBlockingState(allUpdatedSteps, optionalIds, blockingLabels)
    const newWorkflowStatus: WorkflowStatus = blockingState.blocked ? 'blocked' : 'in_progress'

    const updated = await this.repository.updateInstance({
      id: instance.id, enseignantId,
      expectedVersion: instance.version,
      updates: {
        statut:          newWorkflowStatus,
        currentStepId:   nextStep?.stepId ?? null,
        progressPercent: progress.percent,
      },
    })

    if (!updated) {
      return { ok: false, error: { code: 'WORKFLOW_VERSION_CONFLICT', message: 'Conflit de version.' } }
    }

    this.activityEngine?.workflow.onStepCompleted(
      instance.id, stepId,
      instance.plan.classeId ?? null,
      instance.plan.matiere  ?? null,
      progress.percent,
    )

    return { ok: true, data: updated }
  }

  // ── skip_step ───────────────────────────────────────────────────────────────

  private async _skipStep(
    instance:    WorkflowInstance,
    enseignantId: string,
    stepId:      string,
    rawNote?:    string,
  ): Promise<WorkflowResult<WorkflowInstance>> {
    const planStep   = getPlanStep(instance.plan, stepId)
    const isOptional = planStep?.optional ?? false

    // Autoriser le skip d'une étape optionnelle sur un workflow completed (nettoyage post-complétion).
    if (instance.status !== 'in_progress' && !(instance.status === 'completed' && isOptional)) {
      return { ok: false, error: { code: 'WORKFLOW_NOT_ACTIVE', message: 'Le workflow n\'est pas actif.' } }
    }

    const stepState = instance.steps.find(s => s.stepId === stepId)
    if (!stepState) {
      return { ok: false, error: { code: 'STEP_NOT_FOUND', message: `Étape ${stepId} introuvable.` } }
    }

    // Idempotence
    if (stepState.status === 'skipped') return { ok: true, data: instance }

    const validationError = validateStepCanSkip(stepState, isOptional)
    if (validationError) return { ok: false, error: validationError }

    const note     = sanitizeNote(rawNote)
    const skippedAt = now()

    await this.repository.updateStepState({
      workflowInstanceId: instance.id, enseignantId, stepId,
      updates: { statut: 'skipped', skippedAt, completionNote: note },
    })

    const updatedSteps = instance.steps.map(s =>
      s.stepId === stepId ? { ...s, status: 'skipped' as WorkflowStepStatus, skippedAt: new Date(skippedAt) } : s,
    )

    const optionalIds    = buildOptionalStepIds(instance.plan)
    const blockingLabels = buildBlockingLabels(instance.plan)
    const progress       = calculateWorkflowProgress(updatedSteps, optionalIds)
    const workflowDone   = isWorkflowComplete(updatedSteps, optionalIds)

    if (workflowDone) {
      return this._finalizeWorkflow(instance, enseignantId, updatedSteps, progress)
    }

    const nextStep = findNextActivatableStep(updatedSteps, (sid) => isStepBlockedByRequirements(instance.plan, sid))
    if (nextStep) {
      await this.repository.updateStepState({
        workflowInstanceId: instance.id, enseignantId, stepId: nextStep.stepId,
        updates: { statut: 'available' },
      })
    }

    const allUpdatedSteps = nextStep
      ? updatedSteps.map(s => s.stepId === nextStep.stepId ? { ...s, status: 'available' as WorkflowStepStatus } : s)
      : updatedSteps

    const blockingState = evaluateWorkflowBlockingState(allUpdatedSteps, optionalIds, blockingLabels)
    const newStatus: WorkflowStatus = blockingState.blocked ? 'blocked' : 'in_progress'

    const updated = await this.repository.updateInstance({
      id: instance.id, enseignantId,
      expectedVersion: instance.version,
      updates: {
        statut:          newStatus,
        currentStepId:   nextStep?.stepId ?? null,
        progressPercent: progress.percent,
      },
    })

    if (!updated) {
      return { ok: false, error: { code: 'WORKFLOW_VERSION_CONFLICT', message: 'Conflit de version.' } }
    }

    this.activityEngine?.workflow.onStepSkipped(
      instance.id, stepId,
      instance.plan.classeId ?? null,
      instance.plan.matiere  ?? null,
    )

    return { ok: true, data: updated }
  }

  // ── pause_workflow ──────────────────────────────────────────────────────────

  private async _pauseWorkflow(instance: WorkflowInstance, enseignantId: string): Promise<WorkflowResult<WorkflowInstance>> {
    // Idempotence
    if (instance.status === 'paused') return { ok: true, data: instance }

    const transition = applyWorkflowTransition(instance.status, 'pause')
    if (!transition.ok) return transition

    const updated = await this.repository.updateInstance({
      id: instance.id, enseignantId,
      expectedVersion: instance.version,
      updates: { statut: 'paused', pausedAt: now() },
    })

    if (!updated) {
      return { ok: false, error: { code: 'WORKFLOW_VERSION_CONFLICT', message: 'Conflit de version.' } }
    }

    this.activityEngine?.workflow.onPaused(
      instance.id,
      instance.plan.classeId ?? null,
      instance.plan.matiere  ?? null,
    )

    return { ok: true, data: updated }
  }

  // ── resume_workflow ─────────────────────────────────────────────────────────

  private async _resumeWorkflow(instance: WorkflowInstance, enseignantId: string): Promise<WorkflowResult<WorkflowInstance>> {
    // Idempotence
    if (instance.status === 'in_progress') return { ok: true, data: instance }

    const transition = applyWorkflowTransition(instance.status, 'resume')
    if (!transition.ok) return transition

    // Retrouver l'étape courante ou la première available
    const current = instance.currentStepId
      ? instance.steps.find(s => s.stepId === instance.currentStepId)
      : null
    const available = instance.steps.find(s => s.status === 'available' || s.status === 'in_progress')

    const currentStepId = (current ?? available)?.stepId ?? null

    const updated = await this.repository.updateInstance({
      id: instance.id, enseignantId,
      expectedVersion: instance.version,
      updates: { statut: 'in_progress', currentStepId },
    })

    if (!updated) {
      return { ok: false, error: { code: 'WORKFLOW_VERSION_CONFLICT', message: 'Conflit de version.' } }
    }

    this.activityEngine?.workflow.onResumed(
      instance.id,
      instance.plan.classeId ?? null,
      instance.plan.matiere  ?? null,
    )

    return { ok: true, data: updated }
  }

  // ── cancel_workflow ─────────────────────────────────────────────────────────

  private async _cancelWorkflow(instance: WorkflowInstance, enseignantId: string): Promise<WorkflowResult<WorkflowInstance>> {
    // Idempotence
    if (instance.status === 'cancelled') return { ok: true, data: instance }

    const transition = applyWorkflowTransition(instance.status, 'cancel')
    if (!transition.ok) return transition

    const updated = await this.repository.updateInstance({
      id: instance.id, enseignantId,
      expectedVersion: instance.version,
      updates: { statut: 'cancelled', cancelledAt: now() },
    })

    if (!updated) {
      return { ok: false, error: { code: 'WORKFLOW_VERSION_CONFLICT', message: 'Conflit de version.' } }
    }

    // Mission inchangée : la machine ME-05 n'a pas de transition in_progress → accepted.
    // L'enseignant gère la mission indépendamment via /api/missions/[key].

    this.activityEngine?.workflow.onCancelled(
      instance.id,
      instance.plan.classeId ?? null,
      instance.plan.matiere  ?? null,
    )

    return { ok: true, data: updated }
  }

  // ── reopen_step ─────────────────────────────────────────────────────────────

  private async _reopenStep(instance: WorkflowInstance, enseignantId: string, stepId: string): Promise<WorkflowResult<WorkflowInstance>> {
    if (instance.status !== 'in_progress') {
      return { ok: false, error: { code: 'WORKFLOW_NOT_ACTIVE', message: 'Le workflow n\'est pas actif.' } }
    }

    const stepState = instance.steps.find(s => s.stepId === stepId)
    if (!stepState) {
      return { ok: false, error: { code: 'STEP_NOT_FOUND', message: `Étape ${stepId} introuvable.` } }
    }

    if (stepState.status !== 'completed' && stepState.status !== 'skipped') {
      return { ok: false, error: { code: 'STEP_NOT_AVAILABLE', message: `L'étape ${stepId} ne peut pas être réouverte (statut: ${stepState.status}).` } }
    }

    // Réouvrir l'étape et les suivantes dont le statut a pu être affecté
    const sorted = [...instance.steps].sort((a, b) => a.order - b.order)
    const reopenIdx = sorted.findIndex(s => s.stepId === stepId)

    const toReset = sorted.slice(reopenIdx + 1).filter(
      s => s.status === 'pending' || s.status === 'available' || s.status === 'completed' || s.status === 'skipped',
    )

    await this.repository.updateStepState({
      workflowInstanceId: instance.id, enseignantId, stepId,
      updates: { statut: 'available', completedAt: null, skippedAt: null, completionNote: null },
    })

    if (toReset.length > 0) {
      await this.repository.updateManyStepStates(
        toReset.map(s => ({
          workflowInstanceId: instance.id,
          enseignantId,
          stepId: s.stepId,
          updates: { statut: 'pending' as WorkflowStepStatus },
        })),
      )
    }

    const optionalIds = buildOptionalStepIds(instance.plan)
    const allUpdated = sorted.map((s, i) => {
      if (s.stepId === stepId) return { ...s, status: 'available' as WorkflowStepStatus }
      if (i > reopenIdx && toReset.some(r => r.stepId === s.stepId)) return { ...s, status: 'pending' as WorkflowStepStatus }
      return s
    })
    const progress = calculateWorkflowProgress(allUpdated, optionalIds)

    const updated = await this.repository.updateInstance({
      id: instance.id, enseignantId,
      expectedVersion: instance.version,
      updates: {
        statut:          'in_progress',
        currentStepId:   stepId,
        progressPercent: progress.percent,
      },
    })

    if (!updated) {
      return { ok: false, error: { code: 'WORKFLOW_VERSION_CONFLICT', message: 'Conflit de version.' } }
    }

    return { ok: true, data: updated }
  }

  // ── refresh_blocking_state ──────────────────────────────────────────────────

  private async _refreshBlockingState(instance: WorkflowInstance, enseignantId: string): Promise<WorkflowResult<WorkflowInstance>> {
    const optionalIds    = buildOptionalStepIds(instance.plan)
    const blockingLabels = buildBlockingLabels(instance.plan)
    const blockingState  = evaluateWorkflowBlockingState(instance.steps, optionalIds, blockingLabels)

    const newStatus: WorkflowStatus = blockingState.blocked ? 'blocked' : 'in_progress'

    if (newStatus === instance.status) return { ok: true, data: instance }

    const updated = await this.repository.updateInstance({
      id: instance.id, enseignantId,
      expectedVersion: instance.version,
      updates: { statut: newStatus },
    })

    if (!updated) {
      return { ok: false, error: { code: 'WORKFLOW_VERSION_CONFLICT', message: 'Conflit de version.' } }
    }

    return { ok: true, data: updated }
  }

  // ── Finalisation du workflow ────────────────────────────────────────────────

  private async _finalizeWorkflow(
    instance:     WorkflowInstance,
    enseignantId: string,
    steps:        WorkflowStepState[],
    progress:     WorkflowProgress,
  ): Promise<WorkflowResult<WorkflowInstance>> {
    const completedAt = now()

    const updated = await this.repository.updateInstance({
      id: instance.id, enseignantId,
      expectedVersion: instance.version,
      updates: {
        statut:          'completed',
        completedAt,
        currentStepId:   null,
        progressPercent: 100,
      },
    })

    if (!updated) {
      return { ok: false, error: { code: 'WORKFLOW_VERSION_CONFLICT', message: 'Conflit de version à la complétion.' } }
    }

    // Synchroniser la mission
    await this._syncMissionComplete(instance, enseignantId)

    this.activityEngine?.workflow.onCompleted(
      instance.id,
      instance.plan.classeId ?? null,
      instance.plan.matiere  ?? null,
      100,
    )

    return { ok: true, data: updated }
  }

  // ── Synchronisation mission ─────────────────────────────────────────────────

  private async _syncMissionStart(instance: WorkflowInstance, enseignantId: string): Promise<void> {
    try {
      await this.missionState.applyAction({
        enseignantId,
        missionKey: instance.missionKey,
        action:     'start',
      })
    } catch (e) {
      // Non bloquant — l'état mission peut déjà être in_progress (idempotence)
      console.warn('[KLASSIA][WORKFLOW_RUNTIME][MISSION_SYNC_START_WARN]', {
        workflowId: instance.id,
        missionKey: instance.missionKey,
      })
    }
  }

  private async _syncMissionComplete(instance: WorkflowInstance, enseignantId: string): Promise<void> {
    try {
      await this.missionState.applyAction({
        enseignantId,
        missionKey: instance.missionKey,
        action:     'complete',
      })
    } catch (e) {
      console.warn('[KLASSIA][WORKFLOW_RUNTIME][MISSION_SYNC_COMPLETE_WARN]', {
        workflowId: instance.id,
        missionKey: instance.missionKey,
      })
    }
  }
}
