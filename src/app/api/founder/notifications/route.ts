import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

const ALLOWED_ROLES   = ['founder', 'super_admin', 'admin']
const VALID_TYPES     = ['signup','bug','ia_error','ia_cost','backup_fail','deploy','feedback','system']
const VALID_PRIORITES = ['info','warning','critical']

async function getCallerRole(): Promise<string | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('utilisateurs').select('role, is_admin').eq('user_id', user.id).single()
  if (!data) return null
  if (ALLOWED_ROLES.includes(data.role) || data.is_admin) return data.role
  return null
}

export async function GET(req: Request) {
  const role = await getCallerRole()
  if (!role) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const unread_only = searchParams.get('unread_only') === 'true'
  const limit       = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const admin = serviceClient()
  let q = admin.from('founder_notifications').select('*').order('created_at', { ascending: false }).limit(limit)
  if (unread_only) q = q.eq('lu', false)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: Request) {
  const role = await getCallerRole()
  if (!role) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  const admin = serviceClient()
  const { data, error } = await admin.from('founder_notifications').update({ lu: body.lu ?? true }).eq('id', body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const role = await getCallerRole()
  if (!role) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  const body = await req.json()
  if (!body.titre || !body.type) return NextResponse.json({ error: 'titre et type requis' }, { status: 400 })
  if (!VALID_TYPES.includes(body.type)) return NextResponse.json({ error: `type invalide` }, { status: 400 })
  if (body.priorite && !VALID_PRIORITES.includes(body.priorite)) return NextResponse.json({ error: `priorite invalide` }, { status: 400 })
  const admin = serviceClient()
  const { data, error } = await admin.from('founder_notifications').insert({
    type:         body.type,
    titre:        body.titre,
    message:      body.message ?? null,
    priorite:     body.priorite ?? 'info',
    lu:           false,
    produit_slug: body.produit_slug ?? null,
    lien:         body.lien ?? null,
    data:         body.data ?? null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
