import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Map type_contenu → type dossier système (doit correspondre aux types réellement
// créés par le trigger creer_dossiers_classe, cf. migration 010)
const TYPE_VERS_DOSSIER: Record<string, string> = {
  plan_lecon:     'plans_lecons',
  lecon_complete: 'plans_lecons',
  quiz:           'evaluations_sommatives',
  evaluation:     'evaluations_sommatives',
  activite:       'ressources',
  email_parents:  'parents',
  curriculum:     'curriculum',
  ressource:      'ressources',
}

// Map type_contenu → type_fichier autorisé par le CHECK de fichiers_dossier (migration 010/012)
const TYPE_VERS_FICHIER: Record<string, string> = {
  evaluation:    'evaluation_sommative',
  email_parents: 'communication',
}

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

  if (!profil) {
    return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
  }

  let body: any
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  const { action, classe_id, dossier_id, type_contenu, titre, contenu } = body

  if (action !== 'sauvegarder') {
    return NextResponse.json({ error: 'Action non supportée' }, { status: 400 })
  }

  let targetDossierId = dossier_id || null

  // Si pas de dossier fourni, chercher le dossier système approprié
  if (!targetDossierId && classe_id) {
    const typeD = TYPE_VERS_DOSSIER[type_contenu] || 'ressources'
    const { data: dossier } = await supabase
      .from('dossiers_systeme')
      .select('id')
      .eq('classe_id', classe_id)
      .eq('type', typeD)
      .maybeSingle()
    if (dossier) targetDossierId = dossier.id
  }

  // Insérer dans fichiers_dossier
  const { data: fichier, error: errFichier } = await supabase
    .from('fichiers_dossier')
    .insert({
      dossier_id:       targetDossierId,
      classe_id:        classe_id || null,
      enseignant_id:    profil.id,
      nom:              titre || 'Document IA',
      nom_auto:         titre || 'Document IA',
      type_fichier:     TYPE_VERS_FICHIER[type_contenu] || type_contenu || 'ressource',
      contenu_html:     contenu || '',
      statut:           'brouillon',
      indexe_studio_ia: true,
    })
    .select('id')
    .single()

  if (errFichier) {
    return NextResponse.json({ error: errFichier.message }, { status: 500 })
  }

  // Indexer dans studio_ia_memoire (non bloquant)
  supabase
    .from('studio_ia_memoire')
    .insert({
      enseignant_id: profil.id,
      classe_id:     classe_id || null,
      type:          type_contenu || 'ressource',
      titre:         titre || 'Document IA',
      contenu_texte: (contenu || '').substring(0, 2000),
      est_actif:     true,
    })
    .then()

  return NextResponse.json({
    succes:     true,
    fichier_id: fichier?.id,
    dossier_id: targetDossierId,
    message:    `"${titre}" sauvegardé avec succès.`,
  })
}
