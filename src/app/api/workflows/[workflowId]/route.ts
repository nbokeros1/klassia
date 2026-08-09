// ── GET   /api/workflows/[workflowId]  — Lire une instance
// ── PATCH /api/workflows/[workflowId]  — Appliquer une action

import { NextRequest, NextResponse }  from 'next/server'
import { createClient }               from '@/lib/supabase/server'
import { WorkflowRuntime }            from '@/lib/workflow-runtime/workflow-runtime'
import { SupabaseWorkflowRepository } from '@/lib/workflow-runtime/workflow-repository'
import { toWorkflowPublic }           from '@/lib/workflow-runtime/workflow-runtime'
import type { WorkflowAction }        from '@/lib/workflow-runtime/types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function resolveEnseignant(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profil } = await supabase
    .from('utilisateurs')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  return (profil as { id: string } | null)?.id ?? null
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  const { workflowId } = await params

  if (!UUID_RE.test(workflowId)) {
    return NextResponse.json({ error: { code: 'INVALID_PARAM', message: 'workflowId invalide.' } }, { status: 400 })
  }

  const supabase     = await createClient()
  const enseignantId = await resolveEnseignant(supabase)

  if (!enseignantId) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié.' } }, { status: 401 })
  }

  const repository = new SupabaseWorkflowRepository({ supabase })
  const instance   = await repository.getInstance(workflowId, enseignantId)

  if (!instance) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Workflow introuvable.' } }, { status: 404 })
  }

  return NextResponse.json(toWorkflowPublic(instance))
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

const VALID_ACTION_TYPES = new Set([
  'start_workflow', 'start_step', 'complete_step', 'skip_step',
  'pause_workflow', 'resume_workflow', 'cancel_workflow',
  'reopen_step', 'refresh_blocking_state',
])

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  const { workflowId } = await params

  if (!UUID_RE.test(workflowId)) {
    return NextResponse.json({ error: { code: 'INVALID_PARAM', message: 'workflowId invalide.' } }, { status: 400 })
  }

  const supabase     = await createClient()
  const enseignantId = await resolveEnseignant(supabase)

  if (!enseignantId) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié.' } }, { status: 401 })
  }

  let body: { action?: unknown; expectedVersion?: unknown }
  try {
    body = await req.json() as typeof body
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_BODY', message: 'Corps JSON invalide.' } }, { status: 400 })
  }

  const { action: rawAction, expectedVersion: rawVersion } = body

  // Refuser les mutations de statut direct
  if (typeof rawAction === 'object' && rawAction !== null && 'status' in rawAction) {
    return NextResponse.json({
      error: { code: 'INVALID_PARAM', message: 'Le statut ne peut pas être envoyé directement. Utilisez une action.' },
    }, { status: 400 })
  }

  if (!rawAction || typeof rawAction !== 'object') {
    return NextResponse.json({ error: { code: 'INVALID_PARAM', message: 'action manquante.' } }, { status: 400 })
  }

  const action = rawAction as Record<string, unknown>

  if (typeof action['type'] !== 'string' || !VALID_ACTION_TYPES.has(action['type'])) {
    return NextResponse.json({ error: { code: 'INVALID_ACTION', message: `Type d'action inconnu : "${action['type']}".` } }, { status: 400 })
  }

  if (typeof rawVersion !== 'number') {
    return NextResponse.json({ error: { code: 'INVALID_PARAM', message: 'expectedVersion requis (number).' } }, { status: 400 })
  }

  // Valider stepId si nécessaire
  if (['start_step', 'complete_step', 'skip_step', 'reopen_step'].includes(action['type'] as string)) {
    if (typeof action['stepId'] !== 'string' || !action['stepId']) {
      return NextResponse.json({ error: { code: 'INVALID_PARAM', message: 'stepId requis.' } }, { status: 400 })
    }
  }

  // Assainir la note (ne pas la logger)
  let note: string | undefined
  if (typeof action['note'] === 'string') {
    const stripped = action['note'].replace(/<[^>]*>/g, '').trim().slice(0, 500)
    note = stripped || undefined
  }

  // Construire l'action typée
  const workflowAction = buildAction(action, note)
  if (!workflowAction) {
    return NextResponse.json({ error: { code: 'INVALID_ACTION', message: 'Action mal formée.' } }, { status: 400 })
  }

  const repository = new SupabaseWorkflowRepository({ supabase })
  const runtime    = new WorkflowRuntime({ repository, supabase })

  const result = await runtime.applyAction(workflowId, enseignantId, workflowAction, rawVersion)

  if (!result.ok) {
    const httpStatus =
      result.error.code === 'WORKFLOW_VERSION_CONFLICT'   ? 409 :
      result.error.code === 'STEP_NOT_FOUND'              ? 404 :
      result.error.code === 'WORKFLOW_ALREADY_COMPLETED'  ? 409 :
      result.error.code === 'WORKFLOW_CANCELLED'          ? 409 :
      result.error.code === 'WORKFLOW_INTEGRITY_ERROR'    ? 409 :
      400

    return NextResponse.json({ error: result.error }, { status: httpStatus })
  }

  return NextResponse.json(toWorkflowPublic(result.data))
}

function buildAction(action: Record<string, unknown>, note?: string): WorkflowAction | null {
  const type = action['type'] as string

  switch (type) {
    case 'start_workflow':        return { type: 'start_workflow' }
    case 'start_step':            return { type: 'start_step',    stepId: action['stepId'] as string }
    case 'complete_step':         return { type: 'complete_step', stepId: action['stepId'] as string, note }
    case 'skip_step':             return { type: 'skip_step',     stepId: action['stepId'] as string, note }
    case 'pause_workflow':        return { type: 'pause_workflow' }
    case 'resume_workflow':       return { type: 'resume_workflow' }
    case 'cancel_workflow':       return { type: 'cancel_workflow' }
    case 'reopen_step':           return { type: 'reopen_step',   stepId: action['stepId'] as string }
    case 'refresh_blocking_state': return { type: 'refresh_blocking_state' }
    default:                      return null
  }
}
