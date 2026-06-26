import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── Helper : récupère l'admin authentifié côté serveur ────────────────────────

async function getAdminOrNull(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: admin } = await supabase
    .from('utilisateurs')
    .select('id, is_admin, type_compte')
    .eq('user_id', user.id)
    .single()

  if (!admin) return null
  if (admin.is_admin !== true && admin.type_compte !== 'admin') return null
  return admin as { id: string; is_admin: boolean; type_compte: string }
}

// ── POST — démarrer une impersonation ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const admin    = await getAdminOrNull(supabase)
    if (!admin) {
      return NextResponse.json({ error: 'Accès refusé — compte admin requis' }, { status: 403 })
    }

    let body: any
    try { body = await req.json() }
    catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

    const { enseignant_id, raison } = body
    if (!enseignant_id) {
      return NextResponse.json({ error: 'enseignant_id requis' }, { status: 400 })
    }

    // Vérifier que la cible existe et n'est pas elle-même un admin
    const { data: cible } = await supabase
      .from('utilisateurs')
      .select('id, is_admin, type_compte')
      .eq('id', enseignant_id)
      .single()

    if (!cible) {
      return NextResponse.json({ error: 'Enseignant introuvable' }, { status: 404 })
    }
    if (cible.is_admin === true || cible.type_compte === 'admin') {
      return NextResponse.json(
        { error: 'Impossible d\'impersonner un autre compte admin' },
        { status: 403 },
      )
    }

    // Insérer la session d'impersonation (traçabilité complète)
    const { data: session, error: insertError } = await supabase
      .from('sessions_impersonation')
      .insert({
        admin_id:      admin.id,
        enseignant_id,
        raison:        raison ?? null,
      })
      .select('id')
      .single()

    if (insertError || !session) {
      console.error('[impersonation POST] insert error:', insertError)
      return NextResponse.json({ error: 'Erreur lors de la création de session' }, { status: 500 })
    }

    return NextResponse.json({ session_id: session.id })

  } catch (err: any) {
    console.error('[impersonation POST] error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── DELETE — terminer une impersonation ───────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const supabase   = await createClient()
    const admin      = await getAdminOrNull(supabase)
    if (!admin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const sessionId = req.nextUrl.searchParams.get('session_id')
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id requis' }, { status: 400 })
    }

    // Vérifier que la session appartient bien à CET admin
    const { data: session } = await supabase
      .from('sessions_impersonation')
      .select('id, admin_id, fin_session')
      .eq('id', sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
    }
    if (session.admin_id !== admin.id) {
      return NextResponse.json(
        { error: 'Accès refusé — cette session ne vous appartient pas' },
        { status: 403 },
      )
    }

    const { error: updateError } = await supabase
      .from('sessions_impersonation')
      .update({ fin_session: new Date().toISOString() })
      .eq('id', sessionId)

    if (updateError) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })

  } catch (err: any) {
    console.error('[impersonation DELETE] error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
