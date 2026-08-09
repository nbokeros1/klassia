// ── POST /api/workflows   — Créer une instance de workflow
// ── GET  /api/workflows   — Lister les workflows actifs

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { validateExecutionPlan }     from '@/lib/execution-engine/validators/execution-plan-validator'
import { WorkflowRuntime }           from '@/lib/workflow-runtime/workflow-runtime'
import { SupabaseWorkflowRepository } from '@/lib/workflow-runtime/workflow-repository'
import { toWorkflowPublic }          from '@/lib/workflow-runtime/workflow-runtime'
import type { WorkflowAction }       from '@/lib/workflow-runtime/types'
import type { ExecutionPlan }        from '@/lib/execution-engine/types'

// ── Auth helper ───────────────────────────────────────────────────────────────

async function resolveEnseignant(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const { data: profil } = await supabase
    .from('utilisateurs')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  return (profil as { id: string } | null)?.id ?? null
}

// ── POST /api/workflows ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase     = await createClient()
  const enseignantId = await resolveEnseignant(supabase)

  if (!enseignantId) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié.' } }, { status: 401 })
  }

  let body: { missionKey?: unknown; executionPlan?: unknown }
  try {
    body = await req.json() as typeof body
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_BODY', message: 'Corps JSON invalide.' } }, { status: 400 })
  }

  const { missionKey, executionPlan } = body

  if (typeof missionKey !== 'string' || !missionKey.trim()) {
    return NextResponse.json({ error: { code: 'INVALID_PARAM', message: 'missionKey manquant.' } }, { status: 400 })
  }
  if (!executionPlan || typeof executionPlan !== 'object') {
    return NextResponse.json({ error: { code: 'INVALID_PARAM', message: 'executionPlan manquant.' } }, { status: 400 })
  }

  // Valider le plan (ne pas faire confiance au client)
  const plan = executionPlan as ExecutionPlan
  const planValidation = validateExecutionPlan(plan)
  if (!planValidation.valid) {
    return NextResponse.json({
      error: { code: 'INVALID_EXECUTION_PLAN', message: `Plan invalide : ${planValidation.errors.join('; ')}` },
    }, { status: 400 })
  }

  // Vérifier que la mission appartient à l'enseignant
  const { data: missionRow } = await supabase
    .from('missions_enseignant')
    .select('id')
    .eq('enseignant_id', enseignantId)
    .eq('mission_key', missionKey)
    .maybeSingle()

  const missionId = (missionRow as { id: string } | null)?.id ?? null

  const repository = new SupabaseWorkflowRepository({ supabase })
  const runtime    = new WorkflowRuntime({ repository, supabase })

  const result = await runtime.createInstance({
    enseignantId,
    missionId,
    missionKey,
    executionPlan: plan,
  })

  if (!result.ok) {
    const status = result.error.code === 'INVALID_EXECUTION_PLAN' ? 400 : 500
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json(toWorkflowPublic(result.data), { status: 201 })
}

// ── GET /api/workflows ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase     = await createClient()
  const enseignantId = await resolveEnseignant(supabase)

  if (!enseignantId) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié.' } }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const status       = searchParams.get('status')
  const missionKey   = searchParams.get('mission_key')
  const planId       = searchParams.get('execution_plan_id')
  const limitParam   = parseInt(searchParams.get('limit') ?? '20', 10)
  const limit        = isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 50)

  const repository = new SupabaseWorkflowRepository({ supabase })

  // Si execution_plan_id précis → retourner un seul résultat
  if (planId) {
    const instance = await repository.getInstanceByExecutionPlanId(planId, enseignantId)
    if (!instance) return NextResponse.json({ workflows: [] })
    return NextResponse.json({ workflows: [toWorkflowPublic(instance)] })
  }

  const instances = await repository.listActiveInstances(enseignantId, limit)

  let filtered = instances
  if (status) filtered = filtered.filter(i => i.status === status)
  if (missionKey) filtered = filtered.filter(i => i.missionKey === missionKey)

  return NextResponse.json({ workflows: filtered.map(toWorkflowPublic) })
}
