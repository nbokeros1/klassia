import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return {
      error: NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      ),
      session: null,
      supabase: null,
    }
  }
  return { error: null, session, supabase }
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
