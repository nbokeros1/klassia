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

const ALLOWED_ROLES = ['founder', 'super_admin']
const VALID_STATUTS = ['success', 'failed', 'rollback', 'in_progress']
const VALID_ENVS    = ['dev', 'staging', 'production']

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
  const produit_slug  = searchParams.get('produit_slug')
  const environnement = searchParams.get('environnement')
  const limit         = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const admin = serviceClient()
  let q = admin.from('founder_deployments').select('*').order('created_at', { ascending: false }).limit(limit)
  if (produit_slug)  q = q.eq('produit_slug', produit_slug)
  if (environnement) q = q.eq('environnement', environnement)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const role = await getCallerRole()
  if (!role) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  const body = await req.json()
  if (!body.version || !body.produit_slug) return NextResponse.json({ error: 'version et produit_slug requis' }, { status: 400 })
  if (body.statut && !VALID_STATUTS.includes(body.statut)) return NextResponse.json({ error: `statut invalide` }, { status: 400 })
  if (body.environnement && !VALID_ENVS.includes(body.environnement)) return NextResponse.json({ error: `environnement invalide` }, { status: 400 })
  const admin = serviceClient()
  const { data, error } = await admin.from('founder_deployments').insert({
    version:       body.version,
    produit_slug:  body.produit_slug,
    environnement: body.environnement ?? 'production',
    statut:        body.statut ?? 'success',
    deploye_par:   body.deploye_par ?? null,
    notes:         body.notes ?? null,
    commit_sha:    body.commit_sha ?? null,
    branche:       body.branche ?? null,
    migration_id:  body.migration_id ?? null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
