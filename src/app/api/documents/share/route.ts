import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID }   from 'crypto'

// POST /api/documents/share — toggle partage_actif on a fichier_dossier
// Body: { fichier_id: string, activer: boolean }
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data: profil } = await supabase
    .from('utilisateurs')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!profil) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  const { fichier_id, activer } = body
  if (!fichier_id) return NextResponse.json({ error: 'fichier_id requis' }, { status: 400 })

  // Verify ownership
  const { data: fichier } = await supabase
    .from('fichiers_dossier')
    .select('id, lien_partage, partage_actif')
    .eq('id', fichier_id)
    .eq('enseignant_id', profil.id)
    .single()
  if (!fichier) return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })

  const newLien    = fichier.lien_partage || randomUUID()
  const newActiver = activer !== false ? true : false

  const { error: updateErr } = await supabase
    .from('fichiers_dossier')
    .update({ lien_partage: newLien, partage_actif: newActiver, updated_at: new Date().toISOString() })
    .eq('id', fichier_id)
    .eq('enseignant_id', profil.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, lien_partage: newLien, partage_actif: newActiver })
}
