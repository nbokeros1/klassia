import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordBetaEvent } from '@/lib/analytics/beta-events'

export async function POST(request: Request) {
  const { error: authError, user } = await requireAuth()
  if (authError || !user) return authError ?? NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  let body: {
    type?: string
    titre?: string | null
    description?: string
    page_url?: string | null
  }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }) }

  const ALLOWED_TYPES = ['bug', 'idea', 'remark', 'rating', 'blocked', 'confused', 'positive']
  if (!body.type || !ALLOWED_TYPES.includes(body.type)) {
    return NextResponse.json({ error: 'Type de feedback invalide' }, { status: 400 })
  }

  if (!body.description?.trim()) {
    return NextResponse.json({ error: 'La description est requise' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: profil } = await db
    .from('utilisateurs')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profil) return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 })

  const { error: insertError } = await db.from('beta_feedback').insert({
    utilisateur_id: profil.id,
    type:           body.type,
    titre:          body.titre?.trim().substring(0, 120) || null,
    description:    body.description.trim().substring(0, 4000),
    page_url:       body.page_url?.substring(0, 255) || null,
    statut:         'nouveau',
  })

  if (insertError) {
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement du feedback' }, { status: 500 })
  }

  // Record analytics event (non-blocking — must not fail the response)
  await recordBetaEvent({
    utilisateur_id: profil.id,
    event_type: 'feedback_submitted',
    feature: 'feedback',
    metadata: { feedback_type: body.type },
    page_url: body.page_url ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
