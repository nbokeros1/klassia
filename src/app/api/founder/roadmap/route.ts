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

const ALLOWED_ROLES = ['founder', 'super_admin', 'admin']

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
  const statut       = searchParams.get('statut')
  const produit_slug = searchParams.get('produit_slug')
  const limit        = Math.min(parseInt(searchParams.get('limit') ?? '200'), 500)
  const admin = serviceClient()
  let q = admin.from('founder_roadmap').select('*').order('ordre').limit(limit)
  if (statut)       q = q.eq('statut', statut)
  if (produit_slug) q = q.eq('produit_slug', produit_slug)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const role = await getCallerRole()
  if (!role) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  const body = await req.json()
  if (!body.titre) return NextResponse.json({ error: 'titre requis' }, { status: 400 })
  const admin = serviceClient()
  const { data, error } = await admin.from('founder_roadmap').insert({
    titre:         body.titre,
    description:   body.description ?? null,
    statut:        body.statut ?? 'backlog',
    priorite:      body.priorite ?? 'medium',
    produit_slug:  body.produit_slug ?? 'scorgia',
    version_cible: body.version_cible || null,
    sprint:        body.sprint || null,
    tags:          body.tags ?? null,
    ordre:         body.ordre ?? 99,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: Request) {
  const role = await getCallerRole()
  if (!role) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  const ALLOWED = ['titre', 'description', 'statut', 'priorite', 'produit_slug', 'version_cible', 'sprint', 'tags', 'ordre']
  const updates: Record<string, unknown> = {}
  for (const k of ALLOWED) { if (k in body) updates[k] = body[k] }
  const admin = serviceClient()
  const { data, error } = await admin.from('founder_roadmap').update(updates).eq('id', body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const role = await getCallerRole()
  if (!role) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  const admin = serviceClient()
  const { error } = await admin.from('founder_roadmap').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
