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
  const statut = searchParams.get('statut')
  const admin = serviceClient()
  let q = admin.from('founder_products').select('*').order('ordre')
  if (statut) q = q.eq('statut', statut)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const role = await getCallerRole()
  if (!role) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  const body = await req.json()
  if (!body.nom || !body.slug) return NextResponse.json({ error: 'nom et slug requis' }, { status: 400 })
  const admin = serviceClient()
  const { data, error } = await admin.from('founder_products').insert({
    nom:          body.nom,
    slug:         body.slug,
    description:  body.description ?? null,
    statut:       body.statut ?? 'dev',
    version:      body.version ?? '0.0.1',
    environnement:body.environnement ?? 'dev',
    responsable:  body.responsable ?? null,
    logo_emoji:   body.logo_emoji ?? '📦',
    couleur:      body.couleur ?? '#6B7280',
    ordre:        body.ordre ?? 99,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
