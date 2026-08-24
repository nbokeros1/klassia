import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { recordBetaEvent, type BetaEventType, type BetaFeature } from '@/lib/analytics/beta-events'
import { createAdminClient } from '@/lib/supabase/admin'

// Client-side event endpoint — called from browser via fetch
// Only records events for role='beta' users to avoid noise from admin/founder accounts

export async function POST(request: Request) {
  const { error: authError, user } = await requireAuth()
  if (authError || !user) return authError ?? NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  let body: { event_type?: string; feature?: string; metadata?: Record<string, unknown>; page_url?: string; session_id?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }) }

  if (!body.event_type || !body.feature) {
    return NextResponse.json({ error: 'event_type et feature sont requis' }, { status: 400 })
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
