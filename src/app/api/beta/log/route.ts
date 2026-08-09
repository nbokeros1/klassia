import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabase } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const serviceClient = () => createSupabase(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { level, tag, message, data, page_url } = body

    if (!level || !message) {
      return NextResponse.json({ error: 'level et message requis' }, { status: 400 })
    }

    // Récupérer l'utilisateur depuis la session (optionnel — les logs anonymes sont aussi acceptés)
    let utilisateur_id: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // beta_logs.utilisateur_id référence utilisateurs(id) — UUID interne, pas auth.uid()
        const { data: profil } = await supabase
          .from('utilisateurs')
          .select('id')
          .eq('user_id', user.id)
          .single()
        utilisateur_id = profil?.id ?? null
      }
    } catch {}

    await serviceClient()
      .from('beta_logs')
      .insert({ level, tag: tag ?? '[KLASSIA]', message, data: data ?? null, page_url, utilisateur_id })

    return NextResponse.json({ ok: true })
  } catch {
    // Le logger ne doit jamais retourner d'erreur visible — ça casserait l'app
    return NextResponse.json({ ok: true })
  }
}
