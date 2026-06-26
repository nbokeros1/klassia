import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoursDetecte {
  jour:        string
  heure_debut: string
  heure_fin:   string
  salle?:      string
  recurrence:  'hebdomadaire'
}

interface ClasseDetectee {
  nom:        string
  matiere:    string
  niveau:     string
  nb_eleves:  number
  cours:      CoursDetecte[]
}

interface ResultatAnalyse {
  classes_detectees: ClasseDetectee[]
  nb_cours_semaine:  number
  apercu_texte:      string
}

// ─── Prompt d'extraction ──────────────────────────────────────────────────────

const PROMPT_EXTRACTION = `Analyse cet emploi du temps et extrait toutes les informations sous forme JSON.

Retourne UNIQUEMENT le JSON valide ci-dessous, sans texte avant ni après :
{
  "classes": [
    {
      "nom": "nom de la classe ou du groupe",
      "matiere": "matière enseignée",
      "niveau": "niveau scolaire (ex: 4e année, Secondaire 3, Grade 7)",
      "nb_eleves": 0,
      "cours": [
        {
          "jour": "Lundi",
          "heure_debut": "08:30",
          "heure_fin": "09:30",
          "salle": "A-101",
          "recurrence": "hebdomadaire"
        }
      ]
    }
  ],
  "apercu_texte": "résumé en 1-2 phrases de l'emploi du temps détecté"
}

Si une information n'est pas disponible, utilise une chaîne vide "" ou 0 pour les nombres.
Normalise les noms de jours en français : Lundi, Mardi, Mercredi, Jeudi, Vendredi, Samedi.
Format des heures : HH:MM (24h).`

// ─── Route POST ───────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Clé API Anthropic manquante' }, { status: 500 })

  let body: any
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }) }

  const { texte, image_base64, media_type, pdf_base64 } = body

  if (!texte && !image_base64 && !pdf_base64) {
    return NextResponse.json(
      { error: 'Fournissez un texte, une image (image_base64) ou un PDF (pdf_base64).' },
      { status: 400 },
    )
  }

  const client = new Anthropic({ apiKey })

  try {
    let contenu: Anthropic.MessageParam['content']

    // ── Mode Vision (image) ──────────────────────────────────────────────────
    if (image_base64) {
      const type = (media_type || 'image/jpeg') as
        | 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      contenu = [
        {
          type:   'image',
          source: { type: 'base64', media_type: type, data: image_base64 },
        },
        { type: 'text', text: PROMPT_EXTRACTION },
      ]
    }

    // ── Mode PDF ─────────────────────────────────────────────────────────────
    else if (pdf_base64) {
      contenu = [
        {
          type:   'document',
          source: { type: 'base64', media_type: 'application/pdf', data: pdf_base64 },
        } as any,
        { type: 'text', text: PROMPT_EXTRACTION },
      ]
    }

    // ── Mode texte libre ─────────────────────────────────────────────────────
    else {
      contenu = `${PROMPT_EXTRACTION}\n\nEmploi du temps à analyser :\n${String(texte).substring(0, 8000)}`
    }

    const msg = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2048,
      messages:   [{ role: 'user', content: contenu }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''

    // Extraire le JSON de la réponse (Claude peut ajouter du texte parasite)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Impossible d'extraire le JSON de la réponse IA.", brut: raw.substring(0, 500) },
        { status: 422 },
      )
    }

    const parsed = JSON.parse(jsonMatch[0])
    const classes: ClasseDetectee[] = (parsed.classes || []).map((c: any) => ({
      nom:       c.nom       || '',
      matiere:   c.matiere   || '',
      niveau:    c.niveau    || '',
      nb_eleves: Number(c.nb_eleves) || 0,
      cours:     (c.cours || []).map((cr: any) => ({
        jour:        cr.jour        || '',
        heure_debut: cr.heure_debut || '',
        heure_fin:   cr.heure_fin   || '',
        salle:       cr.salle       || '',
        recurrence:  'hebdomadaire' as const,
      })),
    }))

    const nb_cours_semaine = classes.reduce((sum, c) => sum + c.cours.length, 0)

    const resultat: ResultatAnalyse = {
      classes_detectees: classes,
      nb_cours_semaine,
      apercu_texte:      parsed.apercu_texte || `${classes.length} classe(s) détectée(s), ${nb_cours_semaine} cours par semaine.`,
    }

    return NextResponse.json(resultat)

  } catch (err: any) {
    console.error('analyser-emploi-du-temps:', err)
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Réponse IA non parseable en JSON.' }, { status: 422 })
    }
    return NextResponse.json(
      { error: err.message || 'Erreur serveur' },
      { status: 500 },
    )
  }
}
