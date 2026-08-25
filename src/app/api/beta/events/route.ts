import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { recordBetaEvent, type BetaEventType, type BetaFeature } from '@/lib/analytics/beta-events'
import { createAdminClient } from '@/lib/supabase/admin'

// Mirrors migration 047 FINAL DB constraint — runtime validation before DB write
const ALLOWED_EVENT_TYPES: readonly string[] = [
  'dashboard_entered', 'build_year_started', 'build_year_completed',
  'class_created', 'ai_generation_started', 'ai_generation_completed',
  'mon_annee_opened', 'prepare_opened', 'return_visit',
  'feedback_submitted', 'onboarding_step_completed', 'onboarding_completed',
]

const ALLOWED_FEATURES: readonly string[] = [
  'dashboard', 'build_year', 'classes', 'ai_studio',
  'mon_annee', 'prepare', 'onboarding', 'feedback',
]

export async function POST(request: Request) {
  const { error: authError, user } = await requireAuth()
  if (authError || !user) return authError ?? NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  let body: { event_type?: string; feature?: string; metadata?: Record<string, unknown>; page_url?: string; session_id?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }) }

  if (!body.event_type || !ALLOWED_EVENT_TYPES.includes(body.event_type)) {
    return NextResponse.json({ error: 'event_type invalide ou non autorisé' }, { status: 400 })
  }

  if (!body.feature || !ALLOWED_FEATURES.includes(body.feature)) {
    return NextResponse.json({ error: 'feature invalide ou non autorisée' }, { status: 400 })
  }

  // Resolve utilisateur_id
  const db = createAdminClient()
  const { data: profil } = await db
    .from('utilisateurs')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profil) return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 })

  await recordBetaEvent({
    utilisateur_id: profil.id,
    event_type: body.event_type as BetaEventType,
    feature: body.feature as BetaFeature,
    metadata: body.metadata,
    page_url: body.page_url,
    session_id: body.session_id,
  })

  return NextResponse.json({ ok: true })
}
