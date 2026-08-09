// ── Document Context Engine — Route d'extraction (DCE-02) ────────────────────
//
// POST /api/documents/indexer
// Payload : { fichier_id: string }
//
// Flux :
//   1. Auth + profil enseignant
//   2. Charger fichiers_dossier (propriété enseignant vérifiée)
//   3. Vérifier storage_path, mime_type, ligne fichiers_indexation
//   4. Passer statut → traitement
//   5. Télécharger depuis bucket Storage via storage_path
//   6. Extraire le texte (extraire-texte.ts)
//   7. Mettre à jour fichiers_indexation (indexe ou echec/non_supporte)
//
// Idempotent : une réindexation écrase texte_extrait et version_extracteur.
// Sécurité : enseignant_id vérifié en query + RLS Supabase.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extraireTexte, FormatNonSupporte } from '@/lib/documents/extraire-texte'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // ── 1. Authentification ─────────────────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // ── 2. Profil enseignant ────────────────────────────────────────────────────
  const { data: profil } = await supabase
    .from('utilisateurs')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!profil) {
    return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
  }

  // ── 3. Payload ──────────────────────────────────────────────────────────────
  let body: any
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  const { fichier_id } = body
  if (!fichier_id || typeof fichier_id !== 'string') {
    return NextResponse.json({ error: 'fichier_id requis' }, { status: 400 })
  }

  // ── 4. Charger fichiers_dossier — propriété enseignant vérifiée en query ───
  const { data: fichier, error: errFichier } = await supabase
    .from('fichiers_dossier')
    .select('id, nom, storage_path, mime_type, enseignant_id')
    .eq('id', fichier_id)
    .eq('enseignant_id', profil.id)
    .single()

  if (errFichier || !fichier) {
    return NextResponse.json(
      { error: 'Document introuvable ou accès refusé' },
      { status: 404 },
    )
  }

  if (!fichier.storage_path) {
    return NextResponse.json(
      { error: 'Ce document ne possède pas de chemin de stockage — il ne peut pas être extrait.' },
      { status: 422 },
    )
  }

  // ── 5. Vérifier que la ligne fichiers_indexation existe ────────────────────
  const { data: idxRow } = await supabase
    .from('fichiers_indexation')
    .select('id, statut')
    .eq('fichier_id', fichier_id)
    .single()

  if (!idxRow) {
    return NextResponse.json(
      { error: 'Ligne d\'indexation absente — initialisation DCE-01 requise.' },
      { status: 422 },
    )
  }

  // ── 6. Passer en traitement ─────────────────────────────────────────────────
  await supabase
    .from('fichiers_indexation')
    .update({ statut: 'traitement', erreur: null })
    .eq('fichier_id', fichier_id)

  // ── 7. Télécharger depuis Storage (storage_path, jamais url_storage) ───────
  const { data: blob, error: downloadErr } = await supabase.storage
    .from('ressources')
    .download(fichier.storage_path)

  if (downloadErr || !blob) {
    const msg = `Erreur téléchargement Storage : ${downloadErr?.message ?? 'blob vide'}`
    console.error('[KLASSIA][DOCUMENTS][EXTRACTION]', fichier_id, msg)
    await supabase.from('fichiers_indexation').update({
      statut:       'echec',
      erreur:       msg,
      processed_at: new Date().toISOString(),
    }).eq('fichier_id', fichier_id)
    return NextResponse.json(
      { error: 'Impossible de télécharger le fichier depuis le stockage.' },
      { status: 502 },
    )
  }

  // Conversion Blob → Buffer (Node.js)
  let buffer: Buffer
  try {
    buffer = Buffer.from(await blob.arrayBuffer())
  } catch (e: any) {
    const msg = `Conversion buffer échouée : ${e?.message}`
    console.error('[KLASSIA][DOCUMENTS][EXTRACTION]', fichier_id, msg)
    await supabase.from('fichiers_indexation').update({
      statut:       'echec',
      erreur:       msg,
      processed_at: new Date().toISOString(),
    }).eq('fichier_id', fichier_id)
    return NextResponse.json({ error: 'Erreur de traitement du fichier.' }, { status: 500 })
  }

  // ── 8. Extraire le texte ────────────────────────────────────────────────────
  const mimeType = fichier.mime_type || ''
  const nomFichier = fichier.nom || ''

  try {
    const resultat = await extraireTexte(buffer, mimeType, nomFichier)

    // ── 9. Succès — mettre à jour fichiers_indexation ───────────────────────
    await supabase.from('fichiers_indexation').update({
      statut:             'indexe',
      texte_extrait:      resultat.texte,
      nb_pages:           resultat.nb_pages    ?? null,
      nb_slides:          resultat.nb_slides   ?? null,
      nb_feuilles:        resultat.nb_feuilles ?? null,
      version_extracteur: resultat.version_extracteur,
      erreur:             null,
      processed_at:       new Date().toISOString(),
    }).eq('fichier_id', fichier_id)

    return NextResponse.json({
      succes:     true,
      fichier_id,
      nb_pages:   resultat.nb_pages ?? null,
      message:    'Extraction réussie.',
    })

  } catch (e: any) {
    const estNonSupporte = e instanceof FormatNonSupporte
    const statut         = estNonSupporte ? 'non_supporte' : 'echec'
    const erreur         = e?.message ?? 'Extraction échouée'

    console.error('[KLASSIA][DOCUMENTS][EXTRACTION]', fichier_id, erreur)

    await supabase.from('fichiers_indexation').update({
      statut,
      erreur,
      processed_at: new Date().toISOString(),
    }).eq('fichier_id', fichier_id)

    const messageUtilisateur = estNonSupporte
      ? 'Ce format de fichier n\'est pas encore pris en charge pour l\'extraction de contenu.'
      : erreur.includes('OCR')
        ? erreur
        : 'L\'extraction du contenu a échoué. Le fichier est conservé mais son texte n\'est pas disponible pour l\'IA.'

    return NextResponse.json(
      { error: messageUtilisateur, statut, fichier_id },
      { status: estNonSupporte ? 415 : 422 },
    )
  }
}
