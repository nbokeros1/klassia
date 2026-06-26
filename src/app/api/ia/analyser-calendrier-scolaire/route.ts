import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EvenementCalendrierScolaire {
  date:        string
  description: string
}

export interface PlageCalendrierScolaire {
  debut:       string
  fin:         string
  description: string
}

export interface ResultatCalendrierScolaire {
  journees_pedagogiques: EvenementCalendrierScolaire[]
  semaines_relache:      PlageCalendrierScolaire[]
  dates_bulletins:       EvenementCalendrierScolaire[]
  autres_evenements:     EvenementCalendrierScolaire[]
  apercu_texte:          string
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const PROMPT_CALENDRIER = `Analyse ce calendrier scolaire officiel et extrais toutes les dates importantes.

Retourne UNIQUEMENT le JSON valide ci-dessous, sans texte avant ni après :
{
  "journees_pedagogiques": [
    { "date": "2025-10-17", "description": "Journée pédagogique — formation enseignants" }
  ],
  "semaines_relache": [
    { "debut": "2026-02-16", "fin": "2026-02-20", "description": "Semaine de relâche" }
  ],
  "dates_bulletins": [
    { "date": "2025-11-21", "description": "Remise du bulletin — 1er trimestre" }
  ],
  "autres_evenements": [
    { "date": "2025-09-02", "description": "Rentrée scolaire" }
  ],
  "apercu_texte": "Résumé en 1-2 phrases du calendrier détecté"
}

Normalise toutes les dates en format YYYY-MM-DD.
Pour les plages de dates (semaines de relâche, vacances), utilise le format debut/fin.
Si une information n'est pas disponible, retourne un tableau vide [].`

// ─── Route POST ───────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Clé API Anthropic manquante' }, { status: 500 })

  let body: any
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  const { texte, image_base64, media_type, pdf_base64 } = body

  if (!texte && !image_base64 && !pdf_base64) {
    return NextResponse.json({ error: 'Fournissez un texte, une image ou un PDF.' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey })

  try {
    let contenu: Anthropic.MessageParam['content']

    if (image_base64) {
      const type = (media_type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      contenu = [
        { type: 'image', source: { type: 'base64', media_type: type, data: image_base64 } },
        { type: 'text', text: PROMPT_CALENDRIER },
      ]
    } else if (pdf_base64) {
      contenu = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf_base64 } } as any,
        { type: 'text', text: PROMPT_CALENDRIER },
      ]
    } else {
      contenu = `${PROMPT_CALENDRIER}\n\nCalendrier à analyser :\n${String(texte).substring(0, 8000)}`
    }

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 2048,
      messages: [{ role: 'user', content: contenu }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: "Impossible d'extraire le JSON.", brut: raw.substring(0, 500) }, { status: 422 })
    }

    const parsed = JSON.parse(jsonMatch[0])

    const resultat: ResultatCalendrierScolaire = {
      journees_pedagogiques: (parsed.journees_pedagogiques || []).filter((e: any) => e.date),
      semaines_relache:      (parsed.semaines_relache || []).filter((e: any) => e.debut && e.fin),
      dates_bulletins:       (parsed.dates_bulletins || []).filter((e: any) => e.date),
      autres_evenements:     (parsed.autres_evenements || []).filter((e: any) => e.date),
      apercu_texte:          parsed.apercu_texte || 'Calendrier scolaire analysé.',
    }

    return NextResponse.json(resultat)

  } catch (err: any) {
    console.error('analyser-calendrier-scolaire:', err)
    if (err instanceof SyntaxError) return NextResponse.json({ error: 'Réponse IA non parseable.' }, { status: 422 })
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
