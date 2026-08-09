import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabase } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const serviceClient = () => createSupabase(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET() {
  // Utilisé par le tableau de bord admin pour charger les retours
  const { data, error } = await serviceClient()
    .from('beta_feedback')
    .select('id, type, titre, description, page_url, feature_note, statut, created_at, utilisateur_id')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ feedback: data })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, titre, description, page_url, feature_note } = body

    if (!type || !description?.trim()) {
      return NextResponse.json({ error: 'type et description requis' }, { status: 400 })
    }

    const VALID_TYPES = ['bug', 'idea', 'remark', 'rating']
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'type invalide' }, { status: 400 })
    }

    let utilisateur_id: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // beta_feedback.utilisateur_id référence utilisateurs(id) — UUID interne, pas auth.uid()
        const { data: profil } = await supabase
          .from('utilisateurs')
          .select('id')
          .eq('user_id', user.id)
          .single()
        utilisateur_id = profil?.id ?? null
      }
    } catch {}

    const { error } = await serviceClient()
      .from('beta_feedback')
      .insert({
        type,
        titre:       titre?.trim()       || null,
        description: description.trim(),
        page_url:    page_url            || null,
        feature_note: (type === 'rating' && feature_note >= 1 && feature_note <= 5)
          ? feature_note : null,
        utilisateur_id,
      })

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  // Mise à jour du statut d'un retour (admin seulement)
  try {
    const { id, statut } = await req.json()
    if (!id || !statut) return NextResponse.json({ error: 'id et statut requis' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profil } = await supabase
      .from('utilisateurs')
      .select('is_admin, role')
      .eq('user_id', user.id)
      .single()
    const peutModifier =
      profil?.is_admin === true ||
      ['founder', 'super_admin', 'admin', 'beta_manager'].includes(profil?.role ?? '')
    if (!peutModifier) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

    await serviceClient().from('beta_feedback').update({ statut }).eq('id', id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
