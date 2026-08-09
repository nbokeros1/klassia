// ── Workflow Runtime — client helpers (browser-safe)
//
// Toutes les fonctions appellent les API routes ME-14. Ne jamais importer
// de code server-only (supabase/server, workflow-repository, etc.) depuis ici.

import type { WorkflowPublic, WorkflowSummary, WorkflowAction } from './types'

// ── Types de réponse API ──────────────────────────────────────────────────────

interface WorkflowListResponse {
  workflows: WorkflowPublic[]
}

interface WorkflowActionResponse {
  ok:     boolean
  data?:  WorkflowPublic
  error?: { code: string; message: string }
  status?: number
}

// ── fetchWorkflow ─────────────────────────────────────────────────────────────

export async function fetchWorkflow(workflowId: string): Promise<WorkflowPublic | null> {
  const res = await fetch(`/api/workflows/${encodeURIComponent(workflowId)}`, {
    cache: 'no-store',
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`[WORKFLOW_CLIENT] HTTP ${res.status}`)
  return res.json() as Promise<WorkflowPublic>
}

// ── fetchWorkflowSummary ──────────────────────────────────────────────────────
//
// Retourne un WorkflowSummary pour un ExecutionPlan donné.
// Retourne { exists: false } si aucun workflow n'existe pour ce plan.

export async function fetchWorkflowSummary(
  executionPlanId: string,
): Promise<WorkflowSummary> {
  const qs  = new URLSearchParams({ execution_plan_id: executionPlanId })
  const res = await fetch(`/api/workflows?${qs.toString()}`, { cache: 'no-store' })

  if (!res.ok) {
    return { exists: false, workflowId: null, executionPlanId, status: null, progressPercent: null, currentStepId: null }
  }

  const body = await res.json() as WorkflowListResponse
  const wf   = body.workflows?.[0]

  if (!wf) {
    return { exists: false, workflowId: null, executionPlanId, status: null, progressPercent: null, currentStepId: null }
  }

  return {
    exists:          true,
    workflowId:      wf.id,
    executionPlanId,
    status:          wf.status,
    progressPercent: wf.progress.percent,
    currentStepId:   wf.currentStepId,
  }
}

// ── sendWorkflowAction ────────────────────────────────────────────────────────

export async function sendWorkflowAction(
  workflowId:      string,
  action:          WorkflowAction,
  expectedVersion: number,
  note?:           string,
): Promise<WorkflowActionResponse> {
  const res = await fetch(`/api/workflows/${encodeURIComponent(workflowId)}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action, expectedVersion, note }),
  })

  const body = await res.json() as WorkflowPublic & { error?: { code: string; message: string } }

  if (!res.ok) {
    return { ok: false, error: body.error ?? { code: 'UNKNOWN', message: 'Erreur inconnue' }, status: res.status }
  }

  return { ok: true, data: body as WorkflowPublic }
}
