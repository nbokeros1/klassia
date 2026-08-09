import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function requireAuth() {
  const supabase = await createClient()
  // getUser() valide le JWT côté serveur (getSession() lit seulement le cookie sans validation).
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      ),
      user: null,
      session: null,
      supabase: null,
    }
  }
  // session shim pour compatibilité avec les routes qui utilisent session.user.id
  const session = { user }
  return { error: null, user, session, supabase }
}

export async function requireAdmin() {
  const { error, session, supabase } = await requireAuth()
  if (error) return { error, profil: null, supabase: null }

  const { data: profil } = await supabase!
    .from('utilisateurs')
    .select('*')
    .eq('user_id', session!.user.id)
    .single()

  if (!profil?.is_admin) {
    return {
      error: NextResponse.json(
        { error: 'Accès admin requis' },
        { status: 403 }
      ),
      profil: null,
      supabase: null,
    }
  }
  return { error: null, profil, supabase }
}

const FOUNDER_ADMIN_ROLES = ['founder', 'super_admin', 'admin'] as const
const BETA_MANAGER_ROLES  = [...FOUNDER_ADMIN_ROLES, 'beta_manager'] as const

/** Vérifie que l'appelant est founder, super_admin ou admin. */
export async function requireFounderOrAdmin() {
  const { error, session, supabase } = await requireAuth()
  if (error) return { error, profil: null, supabase: null }

  const { data: profil } = await supabase!
    .from('utilisateurs')
    .select('id, role, is_admin')
    .eq('user_id', session!.user.id)
    .single()

  const autorise =
    profil?.is_admin === true ||
    FOUNDER_ADMIN_ROLES.includes(profil?.role as (typeof FOUNDER_ADMIN_ROLES)[number])

  if (!autorise) {
    return {
      error: NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 }),
      profil: null,
      supabase: null,
    }
  }
  return { error: null, profil, supabase }
}

/** Vérifie que l'appelant est founder, super_admin, admin ou beta_manager. */
export async function requireBetaManagerOrAdmin() {
  const { error, session, supabase } = await requireAuth()
  if (error) return { error, profil: null, supabase: null }

  const { data: profil } = await supabase!
    .from('utilisateurs')
    .select('id, role, is_admin')
    .eq('user_id', session!.user.id)
    .single()

  const autorise =
    profil?.is_admin === true ||
    BETA_MANAGER_ROLES.includes(profil?.role as (typeof BETA_MANAGER_ROLES)[number])

  if (!autorise) {
    return {
      error: NextResponse.json({ error: 'Accès réservé aux gestionnaires bêta' }, { status: 403 }),
      profil: null,
      supabase: null,
    }
  }
  return { error: null, profil, supabase }
}
