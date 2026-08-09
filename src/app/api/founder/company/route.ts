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

export async function GET() {
  const role = await getCallerRole()
  if (!role) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  const admin = serviceClient()
  const { data, error } = await admin.from('company_info').select('*').single()
  if (error) return NextResponse.json(null, { status: 200 })
  return NextResponse.json(data)
}

const EDITABLE_FIELDS = [
  'nom', 'numero_entreprise', 'adresse', 'ville', 'province',
  'code_postal', 'pays', 'site_web', 'email_contact', 'domaines',
  'github_org', 'aws_region', 'supabase_project', 'stripe_mode',
  'anthropic_org', 'openai_org',
]

export async function PATCH(req: Request) {
  const role = await getCallerRole()
  if (!role) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  const body = await req.json()
  const updates: Record<string, unknown> = {}
  for (const key of EDITABLE_FIELDS) {
    if (key in body) updates[key] = body[key]
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Aucun champ valide' }, { status: 400 })
  const admin = serviceClient()
  const { data, error } = await admin.from('company_info').update(updates).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
