import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAnonClient } from '@/lib/supabase/server'
import { createClient }                     from '@supabase/supabase-js'

const FOUNDER_ROLES = ['founder', 'super_admin']

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function getCallerProfile(): Promise<{ id: string; email: string | null; role: string; is_admin: boolean } | null> {
  const supabase = await createAnonClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from('utilisateurs').select('id, role, is_admin').eq('user_id', user.id).single()
  if (!data) return null

  const authorized = FOUNDER_ROLES.includes(data.role) || data.is_admin === true
  if (!authorized) return null

  return { id: data.id, email: user.email ?? null, role: data.role, is_admin: data.is_admin }
}

// GET — list audit trail
export async function GET(req: NextRequest) {
  const caller = await getCallerProfile()
  if (!caller) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const url      = new URL(req.url)
  const categorie= url.searchParams.get('categorie')
  const action   = url.searchParams.get('action')
  const limit    = Math.min(Number(url.searchParams.get('limit') ?? '200'), 500)
  const offset   = Number(url.searchParams.get('offset') ?? '0')

  const admin = serviceClient()
  let query = admin.from('audit_trail').select('*')

  if (categorie) query = query.eq('categorie', categorie)
  if (action)    query = query.ilike('action', `%${action}%`)

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — write audit event
export async function POST(req: NextRequest) {
  const caller = await getCallerProfile()
  if (!caller) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const body = await req.json()
  const { action, categorie, cible_id, cible_type, details } = body

  if (!action || !categorie) return NextResponse.json({ error: 'action et categorie requis' }, { status: 400 })

  const VALID_CATS = ['auth','user','role','ia','beta','system','impersonation','data','admin','feedback']
  if (!VALID_CATS.includes(categorie)) return NextResponse.json({ error: 'categorie invalide' }, { status: 400 })

  const admin = serviceClient()
  const { error } = await admin.from('audit_trail').insert({
    acteur_id:    caller.id,
    acteur_email: caller.email,
    action,
    categorie,
    cible_id:     cible_id   ?? null,
    cible_type:   cible_type ?? null,
    details:      details    ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
