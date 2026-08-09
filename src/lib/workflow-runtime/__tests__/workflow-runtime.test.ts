// ── Tests : WorkflowRuntime (ME-14) ───────────────────────────────────────────
//
// Tests unitaires du runtime via un repository en mémoire (mock).
// Aucune connexion Supabase requise.
//
// Exécution : npx tsx src/lib/workflow-runtime/__tests__/workflow-runtime.test.ts

import assert from 'node:assert/strict'

import { WorkflowRuntime, validateWorkflowIntegrity, toWorkflowPublic } from '../workflow-runtime'
import { calculateWorkflowProgress } from '../workflow-progress'
import { sanitizePlanSnapshot, sanitizeNote, hydrateSnapshot } from '../workflow-sanitizer'
import type {
  WorkflowInstance,
  WorkflowStepState,
  WorkflowStepStatus,
  WorkflowStatus,
  WorkflowSummary,
} from '../types'
import type { WorkflowRepository }  from '../workflow-repository'
import type { ExecutionPlan }        from '../../execution-engine/types'
import type { SupabaseClient }       from '@supabase/supabase-js'

// ── Mock ExecutionPlan ────────────────────────────────────────────────────────

function makePlan(overrides: Partial<ExecutionPlan> = {}): ExecutionPlan {
  const steps = overrides.steps ?? [
    {
      id: 'execution:test:step:s1', order: 1,
      capability: 'navigate_to_prepare', kind: 'navigate',
      title: 'Ouvrir Préparer', description: 'Accédez à Préparer.',
      status: 'available',
      target: { type: 'route', route: '/dashboard/gerer/preparer', query: {}, referenceId: null },
      requirements: [],
      completionCriteria: ['Préparer ouvert'],
      estimatedMinutes: 2, optional: false,
    },
    {
      id: 'execution:test:step:s2', order: 2,
      capability: 'create_lesson', kind: 'prepare',
      title: 'Préparer la leçon', description: 'Créez votre leçon.',
      status: 'pending',
      target: null,
      requirements: [],
      completionCriteria: ['Leçon créée'],
      estimatedMinutes: 15, optional: false,
    },
    {
      id: 'execution:test:step:s3', order: 3,
      capability: 'confirm_completion', kind: 'confirm',
      title: 'Confirmer', description: 'Validez.',
      status: 'pending',
      target: null,
      requirements: [],
      completionCriteria: ['Confirmé'],
      estimatedMinutes: 1, optional: true,
    },
  ]

  return {
    id:                 'execution:test',
    sourceType:         'mission',
    sourceId:           'test',
    missionType:        'next_lesson',
    title:              'Préparer la prochaine leçon',
    objective:          'Préparer efficacement la leçon suivante.',
    classeId:           'cls-001',
    matiere:            'Mathématiques',
    steps,
    summary: {
      totalSteps: steps.length, actionableSteps: steps.length,
      blockedSteps: 0, estimatedMinutes: 18, firstActionLabel: steps[0]?.title ?? null,
    },
    canStart:            true,
    blockingReasons:     [],
    targetRoute:         '/dashboard/gerer/preparer',
    createdFromVersion:  'ME-13.5',
    ...overrides,
  }
}

// ── Mock Repository ───────────────────────────────────────────────────────────

class MockWorkflowRepository implements WorkflowRepository {
  private instances = new Map<string, WorkflowInstance>()
  private nextId = 1

  async createInstance(params: Parameters<WorkflowRepository['createInstance']>[0]): Promise<WorkflowInstance | null> {
    const id = `wf-${this.nextId++}`
    const plan = hydrateSnapshot(params.planSnapshot)!

    const steps: WorkflowStepState[] = params.initialSteps.map(s => ({
      id:                 `step-state-${s.stepId}`,
      workflowInstanceId: id,
      stepId:             s.stepId,
      order:              s.stepOrder,
      status:             s.statut,
      startedAt:   null, completedAt: null, skippedAt: null, completionNote: null,
    }))

    const firstAvailable = steps.find(s => s.status === 'available')

    const instance: WorkflowInstance = {
      id,
      enseignantId:    params.enseignantId,
      missionId:       params.missionId,
      missionKey:      params.missionKey,
      executionPlanId: params.executionPlanId,
      sourceType:      params.sourceType,
      sourceId:        params.sourceId,
      missionType:     params.missionType as WorkflowInstance['missionType'],
      status:          'not_started',
      planVersion:     params.planVersion,
      plan,
      steps,
      currentStepId:   firstAvailable?.stepId ?? null,
      progressPercent: 0,
      version:         1,
      startedAt:   null, pausedAt: null, completedAt: null, cancelledAt: null,
      createdAt:   new Date(), updatedAt: new Date(),
    }
    this.instances.set(id, instance)
    return instance
  }

  async getInstance(id: string, enseignantId: string): Promise<WorkflowInstance | null> {
    const inst = this.instances.get(id)
    if (!inst || inst.enseignantId !== enseignantId) return null
    return { ...inst, steps: inst.steps.map(s => ({ ...s })) }
  }

  async getInstanceByExecutionPlanId(executionPlanId: string, enseignantId: string): Promise<WorkflowInstance | null> {
    for (const inst of this.instances.values()) {
      if (inst.executionPlanId === executionPlanId && inst.enseignantId === enseignantId) {
        return { ...inst, steps: inst.steps.map(s => ({ ...s })) }
      }
    }
    return null
  }

  async listActiveInstances(enseignantId: string): Promise<WorkflowInstance[]> {
    return [...this.instances.values()].filter(i =>
      i.enseignantId === enseignantId &&
      ['not_started', 'in_progress', 'paused', 'blocked'].includes(i.status),
    )
  }

  async getWorkflowSummaries(_enseignantId: string, _ids: string[]): Promise<Map<string, WorkflowSummary>> {
    return new Map()
  }

  async updateInstance(params: Parameters<WorkflowRepository['updateInstance']>[0]): Promise<WorkflowInstance | null> {
    const inst = this.instances.get(params.id)
    if (!inst) return null
    if (inst.version !== params.expectedVersion) return null  // version conflict

    const updates = params.updates
    if (updates.statut          !== undefined) (inst as WorkflowInstance & { status: WorkflowStatus }).status = updates.statut as WorkflowStatus
    if (updates.currentStepId   !== undefined) inst.currentStepId = updates.currentStepId
    if (updates.progressPercent !== undefined) inst.progressPercent = updates.progressPercent
    if (updates.startedAt       !== undefined) inst.startedAt    = updates.startedAt   ? new Date(updates.startedAt) : null
    if (updates.pausedAt        !== undefined) inst.pausedAt     = updates.pausedAt    ? new Date(updates.pausedAt)  : null
    if (updates.completedAt     !== undefined) inst.completedAt  = updates.completedAt ? new Date(updates.completedAt) : null
    if (updates.cancelledAt     !== undefined) inst.cancelledAt  = updates.cancelledAt ? new Date(updates.cancelledAt) : null
    inst.version = params.expectedVersion + 1
    inst.updatedAt = new Date()
    return { ...inst, steps: inst.steps.map(s => ({ ...s })) }
  }

  async updateStepState(params: Parameters<WorkflowRepository['updateStepState']>[0]): Promise<WorkflowStepState | null> {
    const inst = this.instances.get(params.workflowInstanceId)
    if (!inst) return null
    const step = inst.steps.find(s => s.stepId === params.stepId)
    if (!step) return null

    const u = params.updates
    if (u.statut         !== undefined) step.status      = u.statut as WorkflowStepStatus
    if (u.startedAt      !== undefined) step.startedAt   = u.startedAt   ? new Date(u.startedAt)   : null
    if (u.completedAt    !== undefined) step.completedAt = u.completedAt ? new Date(u.completedAt) : null
    if (u.skippedAt      !== undefined) step.skippedAt   = u.skippedAt   ? new Date(u.skippedAt)   : null
    if (u.completionNote !== undefined) step.completionNote = u.completionNote
    return { ...step }
  }

  async updateManyStepStates(params: Parameters<WorkflowRepository['updateManyStepStates']>[0]): Promise<void> {
    for (const p of params) {
      const inst = this.instances.get(p.workflowInstanceId)
      if (!inst) continue
      const step = inst.steps.find(s => s.stepId === p.stepId)
      if (step) step.status = p.updates.statut as WorkflowStepStatus
    }
  }
}

// Mock Supabase (machine d'état mission no-op dans les tests)
const mockSupabase = {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
  auth: { getUser: async () => ({ data: { user: null }, error: null }) },
} as unknown as SupabaseClient

function makeRuntime() {
  const repository = new MockWorkflowRepository()
  const runtime    = new WorkflowRuntime({ repository, supabase: mockSupabase })
  return { repository, runtime }
}

// ── Tests ─────────────────════════════════════════════════════════════════════
async function runTests() {

  // ── RT01 : createInstance ─────────────────────────────────────────────────
  {
    const { runtime } = makeRuntime()
    const plan = makePlan()
    const r = await runtime.createInstance({
      enseignantId: 'ens-1', missionId: null, missionKey: 'mk:test', executionPlan: plan,
    })
    assert.ok(r.ok,                           'RT01 — ok')
    assert.equal(r.ok && r.data.status, 'not_started', 'RT01 — statut not_started')
    assert.equal(r.ok && r.data.steps.length, 3, 'RT01 — 3 états d\'étapes créés')
    console.log('✓ RT01 — createInstance')
  }

  // ── RT02 : validation du plan invalide → INVALID_EXECUTION_PLAN ──────────
  {
    const { runtime } = makeRuntime()
    const badPlan = makePlan({ id: '' })
    const r = await runtime.createInstance({
      enseignantId: 'ens-1', missionId: null, missionKey: 'mk:test', executionPlan: badPlan,
    })
    assert.ok(!r.ok,                          'RT02 — !ok')
    assert.equal(!r.ok && r.error.code, 'INVALID_EXECUTION_PLAN', 'RT02 — code correct')
    console.log('✓ RT02 — plan invalide → INVALID_EXECUTION_PLAN')
  }

  // ── RT03 : snapshot assaini (pas de données sensibles) ───────────────────
  {
    const plan = makePlan()
    const snapshot = sanitizePlanSnapshot(plan)
    assert.ok(!JSON.stringify(snapshot).includes('texteExtrait'), 'RT03 — pas de texteExtrait')
    assert.ok(!JSON.stringify(snapshot).includes('storage_path'), 'RT03 — pas de storage_path')
    assert.equal(typeof (snapshot as { id: string })['id'], 'string', 'RT03 — id présent')
    console.log('✓ RT03 — snapshot assaini')
  }

  // ── RT04 : instance existante retournée (idempotence) ────────────────────
  {
    const { runtime } = makeRuntime()
    const plan = makePlan()
    const r1 = await runtime.createInstance({ enseignantId: 'ens-1', missionId: null, missionKey: 'mk:test', executionPlan: plan })
    const r2 = await runtime.createInstance({ enseignantId: 'ens-1', missionId: null, missionKey: 'mk:test', executionPlan: plan })
    assert.ok(r1.ok && r2.ok,                 'RT04 — deux créations ok')
    assert.equal(r1.ok && r1.data.id, r2.ok && r2.data.id, 'RT04 — même id (idempotence)')
    console.log('✓ RT04 — instance existante retournée (idempotence)')
  }

  // ── RT05 : première étape available à la création ─────────────────────────
  {
    const { runtime } = makeRuntime()
    const plan = makePlan()
    const r = await runtime.createInstance({ enseignantId: 'ens-1', missionId: null, missionKey: 'mk:test', executionPlan: plan })
    assert.ok(r.ok,                           'RT05 — ok')
    const firstStep = r.ok && r.data.steps.find(s => s.order === 1)
    assert.equal(firstStep && firstStep.status, 'available', 'RT05 — première étape available')
    console.log('✓ RT05 — première étape available à la création')
  }

  // ── RT06 : start_workflow ─────────────────────────────────────────────────
  {
    const { runtime } = makeRuntime()
    const plan = makePlan()
    const created = await runtime.createInstance({ enseignantId: 'ens-1', missionId: null, missionKey: 'mk:test', executionPlan: plan })
    assert.ok(created.ok)
    const r = await runtime.applyAction(created.ok && created.data.id || '', 'ens-1',
      { type: 'start_workflow' }, 1)
    assert.ok(r.ok,                           'RT06 — ok')
    assert.equal(r.ok && r.data.status, 'in_progress', 'RT06 — → in_progress')
    console.log('✓ RT06 — start_workflow')
  }

  // ── RT07 : start_step ────────────────────────────────────────────────────
  {
    const { runtime } = makeRuntime()
    const plan = makePlan()
    const created  = await runtime.createInstance({ enseignantId: 'ens-1', missionId: null, missionKey: 'mk', executionPlan: plan })
    assert.ok(created.ok)
    const wfId = created.ok && created.data.id || ''
    await runtime.applyAction(wfId, 'ens-1', { type: 'start_workflow' }, 1)
    const r = await runtime.applyAction(wfId, 'ens-1',
      { type: 'start_step', stepId: 'execution:test:step:s1' }, 2)
    assert.ok(r.ok,                           'RT07 — ok')
    const step = r.ok && r.data.steps.find(s => s.stepId === 'execution:test:step:s1')
    assert.equal(step && step.status, 'in_progress', 'RT07 — étape in_progress')
    console.log('✓ RT07 — start_step')
  }

  // ── RT08 : complete_step → suivante available ─────────────────────────────
  {
    const { runtime } = makeRuntime()
    const plan = makePlan()
    const created  = await runtime.createInstance({ enseignantId: 'ens-1', missionId: null, missionKey: 'mk', executionPlan: plan })
    assert.ok(created.ok)
    const wfId = created.ok && created.data.id || ''
    await runtime.applyAction(wfId, 'ens-1', { type: 'start_workflow' }, 1)
    const r = await runtime.applyAction(wfId, 'ens-1',
      { type: 'complete_step', stepId: 'execution:test:step:s1', note: 'Fait.' }, 2)
    assert.ok(r.ok,                           'RT08 — ok')
    const s1 = r.ok && r.data.steps.find(s => s.stepId === 'execution:test:step:s1')
    const s2 = r.ok && r.data.steps.find(s => s.stepId === 'execution:test:step:s2')
    assert.equal(s1 && s1.status, 'completed', 'RT08 — s1 completed')
    assert.equal(s2 && s2.status, 'available', 'RT08 — s2 available')
    console.log('✓ RT08 — complete_step → suivante available')
  }

  // ── RT09 : skip_step — étape optionnelle ─────────────────────────────────
  {
    const { runtime } = makeRuntime()
    const plan = makePlan()
    const created  = await runtime.createInstance({ enseignantId: 'ens-1', missionId: null, missionKey: 'mk', executionPlan: plan })
    assert.ok(created.ok)
    const wfId = created.ok && created.data.id || ''
    await runtime.applyAction(wfId, 'ens-1', { type: 'start_workflow' }, 1)
    // Compléter s1 pour rendre s2 available
    await runtime.applyAction(wfId, 'ens-1', { type: 'complete_step', stepId: 'execution:test:step:s1' }, 2)
    // Compléter s2
    await runtime.applyAction(wfId, 'ens-1', { type: 'complete_step', stepId: 'execution:test:step:s2' }, 3)
    // Skip s3 (optionnelle)
    const r = await runtime.applyAction(wfId, 'ens-1',
      { type: 'skip_step', stepId: 'execution:test:step:s3' }, 4)
    assert.ok(r.ok,                           'RT09 — ok')
    const s3 = r.ok && r.data.steps.find(s => s.stepId === 'execution:test:step:s3')
    assert.equal(s3 && s3.status, 'skipped',  'RT09 — s3 skipped')
    // Le workflow doit être completed car s1 et s2 (obligatoires) sont completed
    assert.equal(r.ok && r.data.status, 'completed', 'RT09 — workflow completed')
    console.log('✓ RT09 — skip_step étape optionnelle → workflow completed')
  }

  // ── RT10 : skip_step — étape obligatoire → STEP_NOT_OPTIONAL ─────────────
  {
    const { runtime } = makeRuntime()
    const plan = makePlan()
    const created  = await runtime.createInstance({ enseignantId: 'ens-1', missionId: null, missionKey: 'mk', executionPlan: plan })
    assert.ok(created.ok)
    const wfId = created.ok && created.data.id || ''
    await runtime.applyAction(wfId, 'ens-1', { type: 'start_workflow' }, 1)
    const r = await runtime.applyAction(wfId, 'ens-1',
      { type: 'skip_step', stepId: 'execution:test:step:s1' }, 2)  // s1 est obligatoire
    assert.ok(!r.ok,                          'RT10 — !ok')
    assert.equal(!r.ok && r.error.code, 'STEP_NOT_OPTIONAL', 'RT10 — STEP_NOT_OPTIONAL')
    console.log('✓ RT10 — skip étape obligatoire → STEP_NOT_OPTIONAL')
  }

  // ── RT11 : pause_workflow ─────────────────────────────────────────────────
  {
    const { runtime } = makeRuntime()
    const plan = makePlan()
    const created  = await runtime.createInstance({ enseignantId: 'ens-1', missionId: null, missionKey: 'mk', executionPlan: plan })
    assert.ok(created.ok)
    const wfId = created.ok && created.data.id || ''
    await runtime.applyAction(wfId, 'ens-1', { type: 'start_workflow' }, 1)
    const r = await runtime.applyAction(wfId, 'ens-1', { type: 'pause_workflow' }, 2)
    assert.ok(r.ok,                           'RT11 — ok')
    assert.equal(r.ok && r.data.status, 'paused', 'RT11 — → paused')
    console.log('✓ RT11 — pause_workflow')
  }

  // ── RT12 : resume_workflow ────────────────────────────────────────────────
  {
    const { runtime } = makeRuntime()
    const plan = makePlan()
    const created  = await runtime.createInstance({ enseignantId: 'ens-1', missionId: null, missionKey: 'mk', executionPlan: plan })
    assert.ok(created.ok)
    const wfId = created.ok && created.data.id || ''
    await runtime.applyAction(wfId, 'ens-1', { type: 'start_workflow' }, 1)
    await runtime.applyAction(wfId, 'ens-1', { type: 'pause_workflow' }, 2)
    const r = await runtime.applyAction(wfId, 'ens-1', { type: 'resume_workflow' }, 3)
    assert.ok(r.ok,                           'RT12 — ok')
    assert.equal(r.ok && r.data.status, 'in_progress', 'RT12 — → in_progress')
    console.log('✓ RT12 — resume_workflow')
  }

  // ── RT13 : cancel_workflow ────────────────────────────────────────────────
  {
    const { runtime } = makeRuntime()
    const plan = makePlan()
    const created  = await runtime.createInstance({ enseignantId: 'ens-1', missionId: null, missionKey: 'mk', executionPlan: plan })
    assert.ok(created.ok)
    const wfId = created.ok && created.data.id || ''
    await runtime.applyAction(wfId, 'ens-1', { type: 'start_workflow' }, 1)
    const r = await runtime.applyAction(wfId, 'ens-1', { type: 'cancel_workflow' }, 2)
    assert.ok(r.ok,                           'RT13 — ok')
    assert.equal(r.ok && r.data.status, 'cancelled', 'RT13 — → cancelled')
    console.log('✓ RT13 — cancel_workflow')
  }

  // ── RT14 : completion automatique — dernière étape obligatoire ────────────
  {
    const { runtime } = makeRuntime()
    // Plan avec seulement 1 étape obligatoire
    const plan = makePlan({
      steps: [{
        id: 'execution:test:step:only', order: 1,
        capability: 'generic_action', kind: 'prepare',
        title: 'Seule étape', description: 'La seule.',
        status: 'available',
        target: null, requirements: [],
        completionCriteria: ['Fait'],
        estimatedMinutes: 5, optional: false,
      }],
    })
    const created  = await runtime.createInstance({ enseignantId: 'ens-1', missionId: null, missionKey: 'mk', executionPlan: plan })
    assert.ok(created.ok)
    const wfId = created.ok && created.data.id || ''
    await runtime.applyAction(wfId, 'ens-1', { type: 'start_workflow' }, 1)
    const r = await runtime.applyAction(wfId, 'ens-1',
      { type: 'complete_step', stepId: 'execution:test:step:only' }, 2)
    assert.ok(r.ok,                           'RT14 — ok')
    assert.equal(r.ok && r.data.status, 'completed', 'RT14 — workflow completed')
    assert.equal(r.ok && r.data.progressPercent, 100, 'RT14 — 100 %')
    console.log('✓ RT14 — dernière étape obligatoire → workflow completed')
  }

  // ── RT15 : conflit de version ─────────────────────────────────────────────
  {
    const { runtime } = makeRuntime()
    const plan = makePlan()
    const created  = await runtime.createInstance({ enseignantId: 'ens-1', missionId: null, missionKey: 'mk', executionPlan: plan })
    assert.ok(created.ok)
    const wfId = created.ok && created.data.id || ''
    // Version 1 → attendu 99 → conflit
    const r = await runtime.applyAction(wfId, 'ens-1', { type: 'start_workflow' }, 99)
    assert.ok(!r.ok,                          'RT15 — !ok')
    assert.equal(!r.ok && r.error.code, 'WORKFLOW_VERSION_CONFLICT', 'RT15 — code correct')
    console.log('✓ RT15 — conflit de version → WORKFLOW_VERSION_CONFLICT')
  }

  // ── RT16 : intégrité valide ───────────────────────────────────────────────
  {
    const { runtime } = makeRuntime()
    const plan = makePlan()
    const created  = await runtime.createInstance({ enseignantId: 'ens-1', missionId: null, missionKey: 'mk', executionPlan: plan })
    assert.ok(created.ok)
    const instance = created.ok && created.data
    const result = validateWorkflowIntegrity(instance as WorkflowInstance)
    assert.ok(result.valid,                   'RT16 — intégrité valide')
    console.log('✓ RT16 — intégrité valide sur instance fraîche')
  }

  // ── RT17 : intégrité invalide — étape inconnue ───────────────────────────
  {
    const plan = makePlan()
    const instance: WorkflowInstance = {
      id: 'wf-bad', enseignantId: 'ens-1', missionId: null, missionKey: 'mk',
      executionPlanId: plan.id, sourceType: 'mission', sourceId: 'test',
      missionType: 'next_lesson', status: 'not_started',
      planVersion: plan.createdFromVersion, plan,
      steps: [
        { id: 's1', workflowInstanceId: 'wf-bad', stepId: 'UNKNOWN_STEP_ID', order: 1,
          status: 'pending', startedAt: null, completedAt: null, skippedAt: null, completionNote: null },
      ],
      currentStepId: null, progressPercent: 0, version: 1,
      startedAt: null, pausedAt: null, completedAt: null, cancelledAt: null,
      createdAt: new Date(), updatedAt: new Date(),
    }
    const result = validateWorkflowIntegrity(instance)
    assert.ok(!result.valid,                  'RT17 — invalide')
    assert.ok(result.errors.length > 0,       'RT17 — erreurs présentes')
    console.log('✓ RT17 — intégrité invalide — étape inconnue détectée')
  }

  // ── RT18 : toWorkflowPublic — ne contient pas enseignantId ───────────────
  {
    const { runtime } = makeRuntime()
    const plan = makePlan()
    const created  = await runtime.createInstance({ enseignantId: 'ens-secret', missionId: null, missionKey: 'mk', executionPlan: plan })
    assert.ok(created.ok)
    const pub = toWorkflowPublic(created.ok && created.data as WorkflowInstance)
    const json = JSON.stringify(pub)
    assert.ok(!json.includes('ens-secret'),   'RT18 — enseignantId absent de la réponse publique')
    assert.ok(!json.includes('enseignantId'), 'RT18 — champ enseignantId absent')
    console.log('✓ RT18 — toWorkflowPublic — enseignantId absent')
  }

  // ── RT19 : sanitizeNote — supprime HTML et tronque ────────────────────────
  {
    const note = sanitizeNote('<b>Note</b> avec <script>alert(1)</script>' + 'x'.repeat(600))
    assert.ok(note !== null,                  'RT19 — note non nulle')
    assert.ok(!note!.includes('<'),           'RT19 — pas de HTML')
    assert.ok(note!.length <= 500,            'RT19 — ≤ 500 chars')
    console.log('✓ RT19 — sanitizeNote supprime HTML et tronque')
  }

  // ── RT20 : idempotence — double start_workflow ────────────────────────────
  {
    const { runtime } = makeRuntime()
    const plan = makePlan()
    const created  = await runtime.createInstance({ enseignantId: 'ens-1', missionId: null, missionKey: 'mk', executionPlan: plan })
    assert.ok(created.ok)
    const wfId = created.ok && created.data.id || ''
    const r1 = await runtime.applyAction(wfId, 'ens-1', { type: 'start_workflow' }, 1)
    assert.ok(r1.ok)
    const r2 = await runtime.applyAction(wfId, 'ens-1', { type: 'start_workflow' }, r1.ok && r1.data.version || 1)
    assert.ok(r2.ok,                          'RT20 — ok (idempotent)')
    assert.equal(r2.ok && r2.data.status, 'in_progress', 'RT20 — toujours in_progress')
    console.log('✓ RT20 — double start_workflow idempotent')
  }

  // ── RT21 : reopen_step ────────────────────────────────────────────────────
  {
    const { runtime } = makeRuntime()
    const plan = makePlan()
    const created  = await runtime.createInstance({ enseignantId: 'ens-1', missionId: null, missionKey: 'mk', executionPlan: plan })
    assert.ok(created.ok)
    const wfId = created.ok && created.data.id || ''
    await runtime.applyAction(wfId, 'ens-1', { type: 'start_workflow' }, 1)
    await runtime.applyAction(wfId, 'ens-1', { type: 'complete_step', stepId: 'execution:test:step:s1' }, 2)
    // s2 est now available
    const r = await runtime.applyAction(wfId, 'ens-1',
      { type: 'reopen_step', stepId: 'execution:test:step:s1' }, 3)
    assert.ok(r.ok,                           'RT21 — ok')
    const s1 = r.ok && r.data.steps.find(s => s.stepId === 'execution:test:step:s1')
    assert.equal(s1 && s1.status, 'available', 'RT21 — s1 réouvert')
    console.log('✓ RT21 — reopen_step réouvre une étape completed')
  }

  // ── RT22 : ExecutionPlan d'origine non muté ────────────────────────────────
  {
    const { runtime } = makeRuntime()
    const plan = makePlan()
    const originalStepStatus = plan.steps[0].status
    const created  = await runtime.createInstance({ enseignantId: 'ens-1', missionId: null, missionKey: 'mk', executionPlan: plan })
    assert.ok(created.ok)
    await runtime.applyAction(created.ok && created.data.id || '', 'ens-1', { type: 'start_workflow' }, 1)
    // Le plan original ne doit pas avoir été muté
    assert.equal(plan.steps[0].status, originalStepStatus, 'RT22 — plan original non muté')
    console.log('✓ RT22 — ExecutionPlan d\'origine non muté')
  }

  console.log('\n✅ Tous les tests WorkflowRuntime (ME-14) passent.')
}

runTests().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
