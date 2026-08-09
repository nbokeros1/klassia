import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAnonClient } from '@/lib/supabase/server'
import { createClient }                     from '@supabase/supabase-js'

const FOUNDER_ROLES = ['founder', 'super_admin']

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function verifyFounder(): Promise<string | null> {
  const supabase = await createAnonClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from('utilisateurs').select('role, is_admin').eq('user_id', user.id).single()
  if (!data) return null

  const authorized = FOUNDER_ROLES.includes(data.role) || data.is_admin === true
  return authorized ? user.id : null
}

// GET — list all users
export async function GET(req: NextRequest) {
  const callerId = await verifyFounder()
  if (!callerId) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const url    = new URL(req.url)
  const role   = url.searchParams.get('role')
  const forfait= url.searchParams.get('forfait')
  const actif  = url.searchParams.get('actif')

  const admin = serviceClient()
  let query = admin.from('utilisateurs').select('id, user_id, prenom, nom, email, province, forfait, role, est_actif, created_at, derniere_connexion')

  if (role)   query = query.eq('role',    role)
  if (forfait)query = query.eq('forfait', forfait)
  if (actif !== null) query = query.eq('est_actif', actif === 'true')

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — update role / forfait / status
export async function PATCH(req: NextRequest) {
  const callerId = await verifyFounder()
  if (!callerId) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const body = await req.json()
  const { id, ...fields } = body

  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const ALLOWED = ['role', 'forfait', 'est_actif', 'prenom', 'nom']
  const update: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in fields) update[key] = fields[key]
  }

  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })

  const admin = serviceClient()
  const { error } = await admin.from('utilisateurs').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit
  void Promise.resolve(admin.from('audit_trail').insert({
    acteur_id:   callerId,
    action:      'user.update',
    categorie:   'user',
    cible_id:    id,
    cible_type:  'utilisateur',
    details:     update,
  })).catch(() => {})

  return NextResponse.json({ ok: true })
}

// DELETE — remove user
export async function DELETE(req: NextRequest) {
  const callerId = await verifyFounder()
  if (!callerId) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const url = new URL(req.url)
  const id  = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const admin = serviceClient()

  // Prevent deleting the founder
  const { data: target } = await admin.from('utilisateurs').select('role, user_id').eq('id', id).single()
  if (target?.role === 'founder') return NextResponse.json({ error: 'Impossible de supprimer le fondateur' }, { status: 403 })

  // Audit before deleting
  void Promise.resolve(admin.from('audit_trail').insert({
    acteur_id:  callerId,
    action:     'user.delete',
    categorie:  'user',
    cible_id:   id,
    cible_type: 'utilisateur',
    details:    { user_id: target?.user_id },
  })).catch(() => {})

  const { error } = await admin.from('utilisateurs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
