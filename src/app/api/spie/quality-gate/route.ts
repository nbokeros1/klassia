import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/api-auth'

export const maxDuration = 60
import {
  verifierPlanAnnuel,
  verifierSyllabus,
  verifierSequence,
  verifierPlanLecon,
} from '@/lib/teaching-quality-gate'
import type { ContenuProgramme, Unite, LeconProgramme } from '@/lib/types/database'
import type { PackSyllabus } from '@/lib/types/teaching-pack'

// ─── POST /api/spie/quality-gate ─────────────────────────────────────────────
// Corps : { teaching_pack_id: string, document_type?: string, document_id?: string }
// Retourne le rapport QualityGateResultat pour le document demandé.

export async function POST(request: Request) {
  const { error: authError, user } = await requireAuth()
  if (authError || !user) return authError ?? NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body?.teaching_pack_id) {
    return NextResponse.json({ error: 'teaching_pack_id requis' }, { status: 400 })
  }

  const { teaching_pack_id, document_type = 'plan_annuel' } = body

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Vérifier accès au pack (RLS not enforced with service role — vérification manuelle)
  const { data: profil } = await supabase
    .from('utilisateurs')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!profil) return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 })

  const { data: pack } = await supabase
    .from('teaching_packs')
    .select('*, programme_annuel_id')
    .eq('id', teaching_pack_id)
    .eq('enseignant_id', profil.id)
    .single()

  if (!pack) return NextResponse.json({ error: 'Pack introuvable ou accès non autorisé' }, { status: 404 })

  let resultat = null

  if (document_type === 'plan_annuel' && pack.programme_annuel_id) {
    const { data: prog } = await supabase
      .from('programme_annuel')
      .select('contenu_json, nb_semaines, calendrier_json')
      .eq('id', pack.programme_annuel_id)
      .single()

    if (prog?.contenu_json) {
      const contenu = prog.contenu_json as ContenuProgramme
      const nbSem = prog.nb_semaines ?? 36
      resultat = verifierPlanAnnuel(contenu, { nbSemainesDisponibles: nbSem })
    }

  } else if (document_type === 'syllabus') {
    const { data: prog } = await supabase
      .from('programme_annuel')
      .select('syllabus_json')
      .eq('id', pack.programme_annuel_id)
      .single()

    const syllabus = prog?.syllabus_json as PackSyllabus | null
    if (syllabus) {
      resultat = verifierSyllabus(syllabus)
    }

  } else if (document_type === 'sequence' && body.sequence_index !== undefined) {
    const { data: prog } = await supabase
      .from('programme_annuel')
      .select('contenu_json')
      .eq('id', pack.programme_annuel_id)
      .single()

    const contenu = prog?.contenu_json as ContenuProgramme | null
    const unite = contenu?.unites?.[body.sequence_index] as Unite | undefined
    if (unite) {
      resultat = verifierSequence(unite)
    }

  } else if (document_type === 'plan_lecon' && body.document_id) {
    const { data: fichier } = await supabase
      .from('fichiers_dossier')
      .select('contenu_html, nom, type_fichier')
      .eq('id', body.document_id)
      .eq('classe_id', pack.classe_id)
      .single()

    if (fichier) {
      const leconShim = {
        numero: 1,
        titre:  fichier.nom,
        sujet:  fichier.nom,
        duree_minutes: 60,
        type: 'developpement' as const,
        contenu_markdown: fichier.contenu_html,
        lecon_id: body.document_id,
      }
      resultat = verifierPlanLecon(leconShim)
    }
  }

  if (!resultat) {
    return NextResponse.json({ error: 'Document introuvable ou type non supporté' }, { status: 404 })
  }

  // Sauvegarder le rapport dans teaching_packs.qualite_json (optionnel, si plan_annuel)
  if (document_type === 'plan_annuel') {
    await supabase
      .from('teaching_packs')
      .update({ qualite_json: resultat })
      .eq('id', teaching_pack_id)
  }

  return NextResponse.json({ success: true, resultat })
}
