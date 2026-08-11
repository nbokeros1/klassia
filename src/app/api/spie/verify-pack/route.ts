// SPIE-PERSISTENCE-01 — Teaching Pack Completeness Verification
// Mission 14 : verifyTeachingPackCompleteness
// Mission 18 : Founder diagnostic endpoint

import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/api-auth'
import { getBetaEntitlement } from '@/lib/entitlements'
import { verifyTeachingPackCompleteness } from '@/lib/spie/build-pipeline'

export async function POST(request: Request) {
  const { error: authError, user } = await requireAuth()
  if (authError || !user) return authError ?? NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { pack_id, classe_id } = await request.json().catch(() => ({}))
  if (!pack_id || !classe_id) {
    return NextResponse.json({ error: 'pack_id et classe_id requis' }, { status: 400 })
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: profil } = await supabase
    .from('utilisateurs').select('id, forfait, is_admin')
    .eq('user_id', user.id).single()

  if (!profil) return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 })

  // Vérifier que l'enseignant possède ce pack (ou est admin)
  const { data: packRow } = await supabase
    .from('teaching_packs')
    .select('id, statut, classe_id, contenu_json')
    .eq('id', pack_id).single()

  if (!packRow) return NextResponse.json({ error: 'Pack introuvable' }, { status: 404 })

  const isOwner = packRow.classe_id === classe_id
  if (!isOwner && !profil.is_admin) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const entitlement = getBetaEntitlement(profil.forfait ?? 'gratuit')
  const completeness = await verifyTeachingPackCompleteness(supabase, pack_id, classe_id, entitlement)

  // Lire aussi le build_state pour l'historique
  const buildState = (packRow.contenu_json as { build_state?: unknown } | null)?.build_state

  return NextResponse.json({
    pack_id,
    classe_id,
    statut_pack:     packRow.statut,
    complete:        completeness.complete,
    missingElements: completeness.missingElements,
    status:          completeness.status,
    counts:          completeness.counts,
    build_state:     buildState ?? null,
    verified_at:     new Date().toISOString(),
  })
}
