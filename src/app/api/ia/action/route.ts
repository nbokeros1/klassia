import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DOSSIER_PAR_TYPE_CONTENU } from '@/lib/constants/mapping-dossiers'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

// Map type_contenu → type_fichier autorisé par le CHECK de fichiers_dossier (migration 012)
const TYPE_VERS_FICHIER: Record<string, string> = {
  evaluation:    'evaluation_sommative',
  email_parents: 'communication',
  plan_sequence: 'plan_sequence',
  corrige:       'corrige',
  activite:      'activite',
}

// Types de contenu qui doivent créer une entrée dans la table lecons
const TYPE_VERS_LECON: Record<string, 'lecon_complete' | 'plan_lecon'> = {
  lecon_complete:   'lecon_complete',
  lecon_developpee: 'lecon_complete',
  plan_lecon:       'plan_lecon',
  fiche_lecon:      'plan_lecon',
  activite:         'plan_lecon',
}

// ── Extraction ContenuLecon depuis Markdown (Architecture D — BETA-02B) ─────
// Claude Haiku extrait les champs structurés depuis son propre Markdown gabarit.
// En cas d'échec, fallback sur l'ancien comportement { intention: markdown_brut }.
const PROMPT_EXTRACTION_CONTENU_LECON = `Extrait les sections pédagogiques de ce Markdown et retourne UNIQUEMENT un objet JSON valide. Aucun texte avant ou après. Pas de backticks.

Schéma attendu :
{
  "intention": "intention pédagogique",
  "rag": "résultats généraux d'apprentissage",
  "ras": "résultats d'apprentissage spécifiques",
  "integration_langue": { "vocabulaire": "", "oral": "", "ecrit": "", "visuel": "" },
  "evaluation_formative": "support concret de la trace",
  "perspective_autochtone": "intégration FNMI ou vide",
  "differentiation_universelle": "",
  "differentiation_ciblee": "",
  "differentiation_specialisee": "",
  "avant_amorce": "contenu complet phase AVANT",
  "avant_duree": "chiffre seulement ex: 10",
  "pendant_modelisation": "enseignement explicite",
  "pendant_pratique_guidee": "pratique avec l'enseignant",
  "pendant_pratique_autonome": "pratique autonome",
  "pendant_duree": "chiffre seulement ex: 45",
  "apres_cloture": "retour sur les apprentissages",
  "apres_billet": "billet de sortie ou évaluation",
  "apres_duree": "chiffre seulement ex: 15",
  "materiel": []
}

Règles : champ vide ("") si absent. "materiel" est un tableau de strings.
Conserve les détails pédagogiques complets des phases AVANT/PENDANT/APRÈS.`

async function extraireContenuLecon(markdown: string): Promise<Record<string, unknown>> {
  const fallback = { intention: markdown }
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || markdown.length < 80) return fallback
  try {
    const client = new Anthropic({ apiKey })
    const md = markdown.length > 6000 ? markdown.substring(0, 6000) : markdown
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system:     PROMPT_EXTRACTION_CONTENU_LECON,
      messages:   [{ role: 'user', content: md }],
    })
    const texte   = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const jsonBrut = texte.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const contenu  = JSON.parse(jsonBrut)
    if (contenu && (contenu.avant_amorce || contenu.pendant_modelisation || contenu.intention)) {
      return contenu
    }
    return fallback
  } catch (e: any) {
    console.warn('[action/route] Extraction ContenuLecon échouée (non bloquant):', e?.message)
    return fallback
  }
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

  // ── Déduplication : éviter les doublons dans les 10 dernières minutes ─────
  if (titre && classe_id) {
    const dixMinutesAvant = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: existing } = await supabase
      .from('fichiers_dossier')
      .select('id, lecon_id')
      .eq('enseignant_id', profil.id)
      .eq('nom', titre)
      .eq('classe_id', classe_id)
      .gte('created_at', dixMinutesAvant)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existing?.id) {
      // Récupérer contenu_json de la leçon liée si elle existe
      let contenuJsonExistant: Record<string, unknown> | null = null
      if (existing.lecon_id) {
        const { data: leconExist } = await supabase
          .from('lecons')
          .select('contenu_json')
          .eq('id', existing.lecon_id)
          .single()
        contenuJsonExistant = leconExist?.contenu_json ?? null
      }
      return NextResponse.json({
        succes:        true,
        fichier_id:    existing.id,
        lecon_id:      existing.lecon_id ?? null,
        dossier_id:    dossier_id || null,
        message:       `"${titre}" déjà sauvegardé (doublon ignoré).`,
        indexation_ok: true,
        deduplique:    true,
        contenu_json:  contenuJsonExistant,
      })
    }
  }

  let targetDossierId = dossier_id || null

  // Si pas de dossier fourni, chercher par nom (source unique : DOSSIER_PAR_TYPE_CONTENU)
  if (!targetDossierId && classe_id) {
    const nomDossier = DOSSIER_PAR_TYPE_CONTENU[type_contenu]
    if (!nomDossier) {
      // Type non reconnu → pas d'auto-sauvegarde (ARCHITECTURE.md §3 + §4)
      return NextResponse.json({ skipped: true, message: 'Type non reconnu — sauvegarde manuelle requise' })
    }
    // .limit(1) au lieu de .maybeSingle() pour éviter PGRST116 si duplicata (multi-matière ou migrations superposées)
    const { data: dossiers, error: errDossier } = await supabase
      .from('dossiers_systeme')
      .select('id')
      .eq('classe_id', classe_id)
      .eq('nom', nomDossier)
      .order('created_at', { ascending: true })
      .limit(1)
    if (errDossier) {
      console.error('[action/route] Recherche dossier échouée:', errDossier.message)
    }
    const dossierTrouve = dossiers?.[0]
    if (dossierTrouve) {
      targetDossierId = dossierTrouve.id
    } else {
      // Dossier attendu non trouvé — ne pas insérer avec dossier_id=null (fichier orphelin)
      console.warn(`[action/route] Dossier '${nomDossier}' introuvable pour classe ${classe_id} — auto-sauvegarde ignorée. Vérifiez migration 020.`)
      return NextResponse.json({ skipped: true, message: `Dossier '${nomDossier}' introuvable — appliquez la migration 020 en SQL Editor.` })
    }
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

  // Indexer dans fichiers_indexation — texte HTML directement disponible
  // Awaité pour inclure indexation_ok dans la réponse ; ne bloque pas la sauvegarde documentaire
  let indexationOk = false
  if (fichier?.id) {
    const { error: errIdx } = await supabase
      .from('fichiers_indexation')
      .upsert({
        fichier_id:         fichier.id,
        enseignant_id:      profil.id,
        mime_type:          'text/markdown',
        statut:             'indexe',
        texte_extrait:      contenu || '',
        version_extracteur: 'html-direct-1.0',
        processed_at:       new Date().toISOString(),
      }, { onConflict: 'fichier_id' })
    if (errIdx) {
      console.error('[KLASSIA][DOCUMENTS][INDEXATION_GENERATED]', errIdx.message)
    } else {
      indexationOk = true
    }
  }

  // Indexer dans studio_ia_memoire (non bloquant) — colonnes réelles : cle, contenu (JSONB)
  // upsert pour gérer les régénérations du même document (index unique enseignant_id+cle+type)
  supabase
    .from('studio_ia_memoire')
    .upsert(
      {
        enseignant_id: profil.id,
        classe_id:     classe_id || null,
        type:          type_contenu || 'ressource',
        cle:           titre || 'Document IA',
        contenu:       { contenu_texte: (contenu || '').substring(0, 4000) },
      },
      { onConflict: 'enseignant_id,cle,type' }
    )
    .then(
      () => {},
      (err: any) => console.error('[studio_ia_memoire upsert échec]', err?.message ?? err?.code ?? err)
    )

  // ── Bridge Préparer → Leçon ──────────────────────────────────────────────────
  let leconId: string | null = null
  let contenuJsonPourReponse: Record<string, unknown> | null = null
  const typeDocument = TYPE_VERS_LECON[type_contenu]

  if (typeDocument && classe_id && fichier?.id) {
    try {
      const { count: nbLecons } = await supabase
        .from('lecons')
        .select('id', { count: 'exact', head: true })
        .eq('classe_id', classe_id)

      // Extraction ContenuLecon structuré depuis le Markdown (Architecture D)
      const contenuJsonExtrait = await extraireContenuLecon(contenu || '')
      contenuJsonPourReponse = contenuJsonExtrait

      const { data: nouvelleLecon, error: errLecon } = await supabase
        .from('lecons')
        .insert({
          classe_id,
          enseignant_id:  profil.id,
          titre:          titre || 'Leçon sans titre',
          numero:         (nbLecons ?? 0) + 1,
          statut:         'prete',
          type_document:  typeDocument,
          duree_minutes:  75,
          contenu_json:   contenuJsonExtrait,
        })
        .select('id')
        .single()

      if (!errLecon && nouvelleLecon?.id) {
        leconId = nouvelleLecon.id
        await supabase
          .from('fichiers_dossier')
          .update({ lecon_id: leconId })
          .eq('id', fichier.id)
      } else if (errLecon) {
        console.warn('[action/route] Création leçon échouée (non bloquant):', errLecon.message)
      }
    } catch (e: any) {
      console.warn('[action/route] Bridge leçon — exception non bloquante:', e?.message ?? e)
    }
  }

  return NextResponse.json({
    succes:        true,
    fichier_id:    fichier?.id,
    lecon_id:      leconId,
    dossier_id:    targetDossierId,
    message:       `"${titre}" sauvegardé avec succès.`,
    indexation_ok: indexationOk,
    contenu_json:  contenuJsonPourReponse,
  })
}
