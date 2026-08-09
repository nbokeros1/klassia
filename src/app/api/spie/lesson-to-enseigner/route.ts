// ─── SPIE-BETA-03 M12 — Transfert leçon détaillée → Enseigner ────────────────
// POST { fichier_id }
// Crée ou met à jour un enregistrement lecon dans la table lecons.
// Retourne { lecon_id } pour rediriger vers /dashboard/gerer/enseigner/[id]
//
// RÈGLES :
// - RLS : seul l'enseignant propriétaire peut transférer sa leçon
// - Ne jamais afficher "Powered by Claude"
// - Le corrigé n'est pas transféré vers Enseigner (mode élèves)

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { requireEntitlement }    from '@/lib/spie-access'
import type { DetailedLesson }   from '@/lib/types/detailed-lesson'
import type { ContenuLecon }     from '@/lib/types/database'

// ─── phasesToContenuLecon ─────────────────────────────────────────────────────
// Convertit DetailedLesson.phases en ContenuLecon (format Enseigner)

function phasesToContenuLecon(lecon: DetailedLesson): ContenuLecon {
  const avant   = lecon.phases?.find(p => p.phase === 'avant')
  const pendant = lecon.phases?.find(p => p.phase === 'pendant')
  const apres   = lecon.phases?.find(p => p.phase === 'apres')

  const joinElements = (phase: typeof avant) =>
    phase?.elements?.map(e => `<p><strong>${e.titre}</strong></p><p>${e.contenu}</p>`).join('\n') ?? ''

  const contenu: ContenuLecon = {
    intention:  lecon.objectifs?.[0]?.enonce ?? lecon.titre,
    objectifs:  lecon.objectifs?.map(o => o.enonce) ?? [],
    materiel:   lecon.preparation?.materiel ?? [],
    criteres:   lecon.objectifs?.map(o => o.critere_reussite).filter(Boolean) ?? [],

    avant_amorce: joinElements(avant),
    avant_duree:  avant?.duree_minutes ? String(avant.duree_minutes) : undefined,

    pendant_modelisation:       pendant?.elements?.[0] ? `<p>${pendant.elements[0].contenu}</p>` : undefined,
    pendant_pratique_guidee:    pendant?.elements?.[1] ? `<p>${pendant.elements[1].contenu}</p>` : undefined,
    pendant_pratique_autonome:  pendant?.elements?.[2] ? `<p>${pendant.elements[2].contenu}</p>` : undefined,
    pendant_duree:              pendant?.duree_minutes ? String(pendant.duree_minutes) : undefined,

    apres_cloture: joinElements(apres),
    apres_billet:  apres?.elements?.[0]?.contenu ? `<p>${apres.elements[0].contenu}</p>` : undefined,

    differentiation_universelle: lecon.differentiation?.find(d => d.type === 'adaptation')?.description,
    differentiation_ciblee:      lecon.differentiation?.find(d => d.type === 'soutien')?.description,
    differentiation_specialisee: lecon.differentiation?.find(d => d.type === 'enrichissement')?.extension,

    notes_enseignant: lecon.reflexion?.notes_enseignant,
  }

  return contenu
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { error: authError, user } = await requireAuth()
  if (authError || !user) return authError ?? NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.fichier_id) return NextResponse.json({ error: 'fichier_id requis' }, { status: 400 })

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Charger le profil + vérifier entitlement
  const { data: profil } = await supabase
    .from('utilisateurs').select('id, forfait, is_admin')
    .eq('user_id', user.id).single()
  if (!profil) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

  const denied = requireEntitlement('send_to_enseigner', profil.forfait, profil.is_admin)
  if (denied) return denied

  // Charger le fichier lecon_detaillee
  const { data: fichier } = await supabase
    .from('fichiers_dossier')
    .select('id, contenu_json, dossier_id, enseignant_id, titre, teaching_pack_id')
    .eq('id', body.fichier_id)
    .eq('enseignant_id', profil.id) // vérification propriétaire
    .single()

  if (!fichier?.contenu_json) {
    return NextResponse.json({ error: 'Leçon détaillée introuvable' }, { status: 404 })
  }

  const lecon = fichier.contenu_json as DetailedLesson
  const contenuLecon = phasesToContenuLecon(lecon)

  // Vérifier si une leçon Enseigner existe déjà pour ce fichier
  const { data: leconExistante } = await supabase
    .from('lecons')
    .select('id')
    .eq('detailed_lesson_id', fichier.id)
    .eq('enseignant_id', profil.id)
    .single()

  let leconId: string

  if (leconExistante) {
    // Mettre à jour la leçon existante
    await supabase.from('lecons').update({
      titre:       lecon.titre,
      sujet:       lecon.matiere,
      duree_minutes: lecon.duree_minutes,
      contenu_json: contenuLecon,
      updated_at:  new Date().toISOString(),
    }).eq('id', leconExistante.id)
    leconId = leconExistante.id
  } else {
    // Trouver la classe_id depuis le teaching_pack
    let classeId: string | null = null
    if (fichier.teaching_pack_id) {
      const { data: tp } = await supabase
        .from('teaching_packs').select('classe_id').eq('id', fichier.teaching_pack_id).single()
      classeId = tp?.classe_id ?? null
    }

    const { data: nouvLecon, error: leconErr } = await supabase
      .from('lecons').insert({
        enseignant_id:           profil.id,
        classe_id:               classeId,
        titre:                   lecon.titre,
        sujet:                   lecon.matiere,
        niveau:                  lecon.niveau,
        duree_minutes:           lecon.duree_minutes,
        statut:                  'brouillon',
        langue:                  lecon.langue ?? 'fr',
        contenu_json:            contenuLecon,
        detailed_lesson_id:      fichier.id,
        source_teaching_pack_id: fichier.teaching_pack_id ?? null,
      }).select('id').single()

    if (leconErr || !nouvLecon) {
      console.error('[lesson-to-enseigner] insert error:', leconErr)
      return NextResponse.json({ error: 'Erreur création leçon' }, { status: 500 })
    }
    leconId = nouvLecon.id
  }

  return NextResponse.json({ lecon_id: leconId })
}
