import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

// Identique au prompt dans action/route.ts — extraction ContenuLecon depuis Markdown
const PROMPT_EXTRACTION = `Extrait les sections pédagogiques de ce Markdown et retourne UNIQUEMENT un objet JSON valide. Aucun texte avant ou après. Pas de backticks.

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

async function extraireContenuLecon(markdown: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || markdown.length < 80) return null
  try {
    const client = new Anthropic({ apiKey })
    const md = markdown.length > 6000 ? markdown.substring(0, 6000) : markdown
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system:     PROMPT_EXTRACTION,
      messages:   [{ role: 'user', content: md }],
    })
    const texte    = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const jsonBrut = texte.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const contenu  = JSON.parse(jsonBrut)
    if (contenu && (contenu.avant_amorce || contenu.pendant_modelisation || contenu.intention)) {
      return contenu
    }
    return null
  } catch {
    return null
  }
}

// POST /api/documents/update — modifier le contenu d'un fichier_dossier existant
// Body: { fichier_id: string, contenu: string }
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
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  const { fichier_id, contenu } = body
  if (!fichier_id || typeof contenu !== 'string') {
    return NextResponse.json({ error: 'fichier_id et contenu requis' }, { status: 400 })
  }

  // Vérifier propriété et récupérer lecon_id
  const { data: fichier } = await supabase
    .from('fichiers_dossier')
    .select('id, lecon_id')
    .eq('id', fichier_id)
    .eq('enseignant_id', profil.id)
    .single()
  if (!fichier) return NextResponse.json({ error: 'Fichier introuvable ou accès refusé' }, { status: 404 })

  // Mettre à jour contenu_html
  const { error: updateErr } = await supabase
    .from('fichiers_dossier')
    .update({ contenu_html: contenu, updated_at: new Date().toISOString() })
    .eq('id', fichier_id)
    .eq('enseignant_id', profil.id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Re-extraire contenu_json si une leçon est liée (Architecture D)
  let contenuJson: Record<string, unknown> | null = null
  if (fichier.lecon_id) {
    contenuJson = await extraireContenuLecon(contenu)
    if (contenuJson) {
      const { error: leconErr } = await supabase
        .from('lecons')
        .update({ contenu_json: contenuJson, updated_at: new Date().toISOString() })
        .eq('id', fichier.lecon_id)
        .eq('enseignant_id', profil.id)
      if (leconErr) {
        console.warn('[update/route] Mise à jour contenu_json échouée (non bloquant):', leconErr.message)
      }
    }
  }

  return NextResponse.json({ ok: true, contenu_json: contenuJson })
}
