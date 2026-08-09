// ── Workflow Runtime — Repository (ME-14) ─────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  WorkflowInstance,
  WorkflowStepState,
  WorkflowStatus,
  WorkflowStepStatus,
  WorkflowSummary,
} from './types'
import { hydrateSnapshot } from './workflow-sanitizer'

// ── Interface du repository ───────────────────────────────────────────────────

export interface WorkflowRepository {
  createInstance(params: {
    enseignantId:    string
    missionId:       string | null
    missionKey:      string
    executionPlanId: string
    sourceType:      'mission' | 'bundle'
    sourceId:        string
    missionType:     string
    planVersion:     string
    planSnapshot:    Record<string, unknown>
    initialSteps:    Array<{
      stepId:    string
      stepOrder: number
      statut:    WorkflowStepStatus
    }>
  }): Promise<WorkflowInstance | null>

  getInstance(id: string, enseignantId: string): Promise<WorkflowInstance | null>

  getInstanceByExecutionPlanId(
    executionPlanId: string,
    enseignantId:    string,
  ): Promise<WorkflowInstance | null>

  listActiveInstances(enseignantId: string, limit?: number): Promise<WorkflowInstance[]>

  getWorkflowSummaries(
    enseignantId:     string,
    executionPlanIds: string[],
  ): Promise<Map<string, WorkflowSummary>>

  updateInstance(params: {
    id:             string
    enseignantId:   string
    expectedVersion: number
    updates: {
      statut?:          WorkflowStatus
      currentStepId?:   string | null
      progressPercent?: number
      startedAt?:       string | null
      pausedAt?:        string | null
      completedAt?:     string | null
      cancelledAt?:     string | null
    }
  }): Promise<WorkflowInstance | null>

  updateStepState(params: {
    workflowInstanceId: string
    enseignantId:       string
    stepId:             string
    updates: {
      statut?:          WorkflowStepStatus
      startedAt?:       string | null
      completedAt?:     string | null
      skippedAt?:       string | null
      completionNote?:  string | null
    }
  }): Promise<WorkflowStepState | null>

  updateManyStepStates(params: Array<{
    workflowInstanceId: string
    enseignantId:       string
    stepId:             string
    updates: {
      statut: WorkflowStepStatus
    }
  }>): Promise<void>
}

// ── Hydratation des lignes DB ─────────────────────────────────────────────────

function rowToInstance(row: Record<string, unknown>, steps: WorkflowStepState[]): WorkflowInstance | null {
  const plan = hydrateSnapshot(row['plan_snapshot'])
  if (!plan) return null

  return {
    id:              row['id'] as string,
    enseignantId:    row['enseignant_id'] as string,
    missionId:       (row['mission_id'] as string | null) ?? null,
    missionKey:      row['mission_key'] as string,
    executionPlanId: row['execution_plan_id'] as string,
    sourceType:      row['source_type'] as 'mission' | 'bundle',
    sourceId:        row['source_id'] as string,
    missionType:     row['mission_type'] as WorkflowInstance['missionType'],
    status:          row['statut'] as WorkflowStatus,
    planVersion:     row['plan_version'] as string,
    plan,
    steps,
    currentStepId:   (row['current_step_id'] as string | null) ?? null,
    progressPercent: row['progress_percent'] as number,
    version:         row['version'] as number,
    startedAt:       row['started_at']   ? new Date(row['started_at'] as string) : null,
    pausedAt:        row['paused_at']    ? new Date(row['paused_at'] as string)  : null,
    completedAt:     row['completed_at'] ? new Date(row['completed_at'] as string) : null,
    cancelledAt:     row['cancelled_at'] ? new Date(row['cancelled_at'] as string) : null,
    createdAt:       new Date(row['created_at'] as string),
    updatedAt:       new Date(row['updated_at'] as string),
  }
}

function rowToStepState(row: Record<string, unknown>): WorkflowStepState {
  return {
    id:                 row['id'] as string,
    workflowInstanceId: row['workflow_instance_id'] as string,
    stepId:             row['step_id'] as string,
    order:              row['step_order'] as number,
    status:             row['statut'] as WorkflowStepStatus,
    startedAt:          row['started_at']   ? new Date(row['started_at'] as string)   : null,
    completedAt:        row['completed_at'] ? new Date(row['completed_at'] as string) : null,
    skippedAt:          row['skipped_at']   ? new Date(row['skipped_at'] as string)   : null,
    completionNote:     (row['completion_note'] as string | null) ?? null,
  }
}

const INSTANCE_COLS = [
  'id', 'enseignant_id', 'mission_id', 'mission_key',
  'execution_plan_id', 'source_type', 'source_id', 'mission_type',
  'statut', 'plan_version', 'plan_snapshot', 'current_step_id',
  'progress_percent', 'version',
  'started_at', 'paused_at', 'completed_at', 'cancelled_at',
  'created_at', 'updated_at',
].join(', ')

const STEP_COLS = [
  'id', 'workflow_instance_id', 'step_id', 'step_order',
  'statut', 'started_at', 'completed_at', 'skipped_at',
  'completion_note',
].join(', ')

// ── Implémentation Supabase ───────────────────────────────────────────────────

export class SupabaseWorkflowRepository implements WorkflowRepository {
  private supabase: SupabaseClient

  constructor({ supabase }: { supabase: SupabaseClient }) {
    this.supabase = supabase
  }

  async createInstance(params: Parameters<WorkflowRepository['createInstance']>[0]): Promise<WorkflowInstance | null> {
    const {
      enseignantId, missionId, missionKey, executionPlanId,
      sourceType, sourceId, missionType, planVersion,
      planSnapshot, initialSteps,
    } = params

    const { data: instanceRow, error: instanceError } = await this.supabase
      .from('workflow_instances')
      .insert({
        enseignant_id:    enseignantId,
        mission_id:       missionId,
        mission_key:      missionKey,
        execution_plan_id: executionPlanId,
        source_type:      sourceType,
        source_id:        sourceId,
        mission_type:     missionType,
        statut:           'not_started',
        plan_version:     planVersion,
        plan_snapshot:    planSnapshot,
        progress_percent: 0,
        version:          1,
      })
      .select(INSTANCE_COLS)
      .single()

    if (instanceError || !instanceRow) {
      console.error('[KLASSIA][WORKFLOW_RUNTIME][CREATE_ERROR]', {
        error: instanceError?.message,
        code:  instanceError?.code,
      })
      return null
    }

    const workflowId = (instanceRow as unknown as Record<string, unknown>)['id'] as string

    const stepRows = initialSteps.map(s => ({
      workflow_instance_id: workflowId,
      step_id:              s.stepId,
      step_order:           s.stepOrder,
      statut:               s.statut,
    }))

    const { error: stepsError } = await this.supabase
      .from('workflow_step_states')
      .insert(stepRows)

    if (stepsError) {
      console.error('[KLASSIA][WORKFLOW_RUNTIME][CREATE_STEPS_ERROR]', {
        workflowId,
        error: stepsError.message,
      })
      return null
    }

    const steps = await this._loadSteps(workflowId)
    return rowToInstance(instanceRow as unknown as Record<string, unknown>, steps)
  }

  async getInstance(id: string, enseignantId: string): Promise<WorkflowInstance | null> {
    const { data, error } = await this.supabase
      .from('workflow_instances')
      .select(INSTANCE_COLS)
      .eq('id', id)
      .eq('enseignant_id', enseignantId)
      .maybeSingle()

    if (error || !data) return null

    const steps = await this._loadSteps(id)
    return rowToInstance(data as unknown as Record<string, unknown>, steps)
  }

  async getInstanceByExecutionPlanId(executionPlanId: string, enseignantId: string): Promise<WorkflowInstance | null> {
    const { data, error } = await this.supabase
      .from('workflow_instances')
      .select(INSTANCE_COLS)
      .eq('execution_plan_id', executionPlanId)
      .eq('enseignant_id', enseignantId)
      .maybeSingle()

    if (error || !data) return null

    const row = data as unknown as Record<string, unknown>
    const id  = row['id'] as string
    const steps = await this._loadSteps(id)
    return rowToInstance(row, steps)
  }

  async listActiveInstances(enseignantId: string, limit = 20): Promise<WorkflowInstance[]> {
    const { data, error } = await this.supabase
      .from('workflow_instances')
      .select(INSTANCE_COLS)
      .eq('enseignant_id', enseignantId)
      .in('statut', ['not_started', 'in_progress', 'paused', 'blocked'])
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error || !data) return []

    const rows = data as unknown as Record<string, unknown>[]
    const instances = await Promise.all(rows.map(async row => {
      const steps = await this._loadSteps(row['id'] as string)
      return rowToInstance(row, steps)
    }))

    return instances.filter((i): i is WorkflowInstance => i !== null)
  }

  async getWorkflowSummaries(enseignantId: string, executionPlanIds: string[]): Promise<Map<string, WorkflowSummary>> {
    if (executionPlanIds.length === 0) return new Map()

    const { data, error } = await this.supabase
      .from('workflow_instances')
      .select('execution_plan_id, id, statut, progress_percent, current_step_id')
      .eq('enseignant_id', enseignantId)
      .in('execution_plan_id', executionPlanIds)

    const map = new Map<string, WorkflowSummary>()

    if (error || !data) return map

    for (const row of (data as Record<string, unknown>[])) {
      const planId = row['execution_plan_id'] as string
      map.set(planId, {
        exists:          true,
        workflowId:      row['id'] as string,
        executionPlanId: planId,
        status:          row['statut'] as WorkflowStatus,
        progressPercent: row['progress_percent'] as number,
        currentStepId:   (row['current_step_id'] as string | null) ?? null,
      })
    }

    return map
  }

  async updateInstance(params: Parameters<WorkflowRepository['updateInstance']>[0]): Promise<WorkflowInstance | null> {
    const { id, enseignantId, expectedVersion, updates } = params

    const dbUpdates: Record<string, unknown> = {}
    if (updates.statut          !== undefined) dbUpdates['statut']           = updates.statut
    if (updates.currentStepId   !== undefined) dbUpdates['current_step_id']  = updates.currentStepId
    if (updates.progressPercent !== undefined) dbUpdates['progress_percent']  = updates.progressPercent
    if (updates.startedAt       !== undefined) dbUpdates['started_at']        = updates.startedAt
    if (updates.pausedAt        !== undefined) dbUpdates['paused_at']         = updates.pausedAt
    if (updates.completedAt     !== undefined) dbUpdates['completed_at']      = updates.completedAt
    if (updates.cancelledAt     !== undefined) dbUpdates['cancelled_at']      = updates.cancelledAt

    dbUpdates['version'] = expectedVersion + 1

    const { data, error } = await this.supabase
      .from('workflow_instances')
      .update(dbUpdates)
      .eq('id', id)
      .eq('enseignant_id', enseignantId)
      .eq('version', expectedVersion)
      .select(INSTANCE_COLS)
      .maybeSingle()

    if (error) {
      console.error('[KLASSIA][WORKFLOW_RUNTIME][UPDATE_ERROR]', { id, error: error.message })
      return null
    }
    if (!data) return null  // version conflict

    const steps = await this._loadSteps(id)
    return rowToInstance(data as unknown as Record<string, unknown>, steps)
  }

  async updateStepState(params: Parameters<WorkflowRepository['updateStepState']>[0]): Promise<WorkflowStepState | null> {
    const { workflowInstanceId, stepId, updates } = params

    const dbUpdates: Record<string, unknown> = {}
    if (updates.statut         !== undefined) dbUpdates['statut']          = updates.statut
    if (updates.startedAt      !== undefined) dbUpdates['started_at']      = updates.startedAt
    if (updates.completedAt    !== undefined) dbUpdates['completed_at']    = updates.completedAt
    if (updates.skippedAt      !== undefined) dbUpdates['skipped_at']      = updates.skippedAt
    if (updates.completionNote !== undefined) dbUpdates['completion_note'] = updates.completionNote

    const { data, error } = await this.supabase
      .from('workflow_step_states')
      .update(dbUpdates)
      .eq('workflow_instance_id', workflowInstanceId)
      .eq('step_id', stepId)
      .select(STEP_COLS)
      .maybeSingle()

    if (error || !data) {
      console.error('[KLASSIA][WORKFLOW_RUNTIME][STEP_UPDATE_ERROR]', { workflowInstanceId, stepId, error: error?.message })
      return null
    }

    return rowToStepState(data as unknown as Record<string, unknown>)
  }

  async updateManyStepStates(params: Parameters<WorkflowRepository['updateManyStepStates']>[0]): Promise<void> {
    await Promise.all(params.map(p =>
      this.supabase
        .from('workflow_step_states')
        .update({ statut: p.updates.statut })
        .eq('workflow_instance_id', p.workflowInstanceId)
        .eq('step_id', p.stepId),
    ))
  }

  private async _loadSteps(workflowId: string): Promise<WorkflowStepState[]> {
    const { data, error } = await this.supabase
      .from('workflow_step_states')
      .select(STEP_COLS)
      .eq('workflow_instance_id', workflowId)
      .order('step_order')

    if (error || !data) return []

    return (data as unknown as Record<string, unknown>[]).map(rowToStepState)
  }
}
