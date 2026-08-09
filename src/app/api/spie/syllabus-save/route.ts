import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/api-auth'
import type { PackSyllabus } from '@/lib/types/teaching-pack'

// ─── POST /api/spie/syllabus-save ────────────────────────────────────────────
// Corps : { teaching_pack_id, programme_annuel_id, syllabus: PackSyllabus }
// Sauvegarde le syllabus édité + crée une version dans pack_versions.
// RÈGLE : Les modifications manuelles ne sont jamais écrasées silencieusement.

export async function POST(request: Request) {
  const { error: authError, user } = await requireAuth()
  if (authError || !user) return authError ?? NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body?.teaching_pack_id || !body?.syllabus) {
    return NextResponse.json({ error: 'teaching_pack_id et syllabus requis' }, { status: 400 })
  }

  const { teaching_pack_id, programme_annuel_id, syllabus } = body as {
    teaching_pack_id: string
    programme_annuel_id?: string
    syllabus: PackSyllabus
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Vérifier que le pack appartient à cet enseignant
  const { data: profil } = await supabase
    .from('utilisateurs').select('id').eq('user_id', user.id).single()
  if (!profil) return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 })

  const { data: pack } = await supabase
    .from('teaching_packs')
    .select('id, programme_annuel_id, contenu_json, version_numero')
    .eq('id', teaching_pack_id)
    .eq('enseignant_id', profil.id)
    .single()
  if (!pack) return NextResponse.json({ error: 'Pack non trouvé' }, { status: 404 })

  const progId = programme_annuel_id ?? pack.programme_annuel_id
  if (!progId) return NextResponse.json({ error: 'Aucun programme annuel associé' }, { status: 400 })

  // Récupérer la version actuelle du syllabus pour la conserver en historique
  const { data: progActuel } = await supabase
    .from('programme_annuel')
    .select('syllabus_json, version_numero')
    .eq('id', progId)
    .single()

  const ancienVersion = progActuel?.version_numero ?? 1

  // Créer une version de l'ancien syllabus AVANT d'écraser
  if (progActuel?.syllabus_json) {
    await supabase.from('pack_versions').insert({
      teaching_pack_id,
      document_type:  'syllabus',
      version_numero: ancienVersion,
      contenu_json:   progActuel.syllabus_json,
      modifie_par:    'utilisateur',
      notes:          'Version précédente avant modification manuelle',
      enseignant_id:  profil.id,
    })
  }

  // Ajouter created_at + version
  const syllabusToSave: PackSyllabus = {
    ...syllabus,
    created_at: syllabus.created_at ?? new Date().toISOString(),
    version:    String(ancienVersion + 1),
  }

  // Mettre à jour programme_annuel.syllabus_json
  await supabase
    .from('programme_annuel')
    .update({
      syllabus_json:  syllabusToSave,
      modifie_par:    'utilisateur',
      version_numero: ancienVersion + 1,
    })
    .eq('id', progId)

  // Mettre à jour teaching_packs.contenu_json.syllabus
  const contenuActuel = (pack.contenu_json ?? {}) as Record<string, unknown>
  await supabase
    .from('teaching_packs')
    .update({
      contenu_json:      { ...contenuActuel, syllabus: syllabusToSave },
      derniere_modif_par:'utilisateur',
      version_numero:    (pack.version_numero ?? 1) + 1,
    })
    .eq('id', teaching_pack_id)

  return NextResponse.json({ success: true, version: ancienVersion + 1 })
}
