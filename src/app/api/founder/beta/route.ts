import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAnonClient } from '@/lib/supabase/server'
import { createClient }                     from '@supabase/supabase-js'

const FOUNDER_ROLES = ['founder', 'super_admin', 'admin', 'beta_manager']

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function verifyAccess(): Promise<string | null> {
  const supabase = await createAnonClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from('utilisateurs').select('id, role, is_admin').eq('user_id', user.id).single()
  if (!data) return null

  const ok = FOUNDER_ROLES.includes(data.role) || data.is_admin === true
  return ok ? data.id : null
}

// GET — list invitations
export async function GET(req: NextRequest) {
  const callerId = await verifyAccess()
  if (!callerId) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const url    = new URL(req.url)
  const statut = url.searchParams.get('statut')
  const limit  = Math.min(Number(url.searchParams.get('limit') ?? '200'), 500)

  const admin = serviceClient()
  let query = admin.from('beta_invitations').select('*').order('created_at', { ascending: false }).limit(limit)
  if (statut) query = query.eq('statut', statut)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — create invitation
export async function POST(req: NextRequest) {
  const callerId = await verifyAccess()
  if (!callerId) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const body = await req.json()
  const { email, notes, expire_in } = body

  if (!email) return NextResponse.json({ error: 'email requis' }, { status: 400 })

  const expireDays = Number(expire_in ?? 30)
  const expireAt   = new Date(Date.now() + expireDays * 86400000).toISOString()

  const admin = serviceClient()
  const { data, error } = await admin.from('beta_invitations').insert({
    email:       email.trim().toLowerCase(),
    notes:       notes ?? null,
    expire_at:   expireAt,
    statut:      'en_attente',
    created_by:  callerId,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit
  void Promise.resolve(admin.from('audit_trail').insert({
    acteur_id:   callerId,
    action:      'beta.invitation.create',
    categorie:   'beta',
    cible_id:    data.id,
    cible_type:  'beta_invitation',
    details:     { email, expire_in: expireDays },
  })).catch(() => {})

  return NextResponse.json(data)
}

// PATCH — update statut
export async function PATCH(req: NextRequest) {
  const callerId = await verifyAccess()
  if (!callerId) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const body = await req.json()
  const { id, statut } = body

  if (!id || !statut) return NextResponse.json({ error: 'id et statut requis' }, { status: 400 })

  const VALID = ['en_attente','envoyee','acceptee','expiree','annulee']
  if (!VALID.includes(statut)) return NextResponse.json({ error: 'statut invalide' }, { status: 400 })

  const admin = serviceClient()

  const update: Record<string, unknown> = { statut }
  if (statut === 'envoyee') update.sent_at = new Date().toISOString()
  if (statut === 'acceptee')update.activated_at = new Date().toISOString()

  const { error } = await admin.from('beta_invitations').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  void Promise.resolve(admin.from('audit_trail').insert({
    acteur_id:   callerId,
    action:      `beta.invitation.${statut}`,
    categorie:   'beta',
    cible_id:    id,
    cible_type:  'beta_invitation',
    details:     { statut },
  })).catch(() => {})

  return NextResponse.json({ ok: true })
}
