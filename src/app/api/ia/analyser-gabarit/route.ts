import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { getMaxTokens } from '@/lib/ia/get-max-tokens'

export async function POST(request: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 })

  const { contenu_texte } = await request.json()
  if (!contenu_texte?.trim()) {
    return NextResponse.json({ error: 'Contenu requis' }, { status: 400 })
  }

  try {
    const client = new Anthropic({ apiKey })

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: getMaxTokens('analyser_gabarit'),
      messages: [{
        role: 'user',
        content: `Analyse ce gabarit de leçon et décris sa structure pédagogique.
Retourne UNIQUEMENT un JSON valide (sans aucun texte avant ou après) dans ce format exact :
{
  "sections": ["liste des sections dans l'ordre tel qu'elles apparaissent"],
  "style": "style pédagogique apparent (ex: explicite, socioconstructiviste, par projet...)",
  "vocabulaire": ["5 à 10 termes ou expressions clés récurrents dans ce gabarit"],
  "structure_resume": "résumé en 2-3 phrases décrivant la logique globale du gabarit"
}

Gabarit à analyser :
${contenu_texte.slice(0, 6000)}`,
      }],
    })

    const text = (msg.content[0] as any).text || '{}'
    let analyse: Record<string, any> = {}
    try {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) analyse = JSON.parse(match[0])
    } catch {
      analyse = {
        sections:          [],
        style:             'non détecté',
        vocabulaire:       [],
        structure_resume:  text.slice(0, 300),
      }
    }

    return NextResponse.json({ analyse })

  } catch (err: any) {
    return NextResponse.json({
      analyse: {
        sections:         [],
        style:            'non analysé',
        vocabulaire:      [],
        structure_resume: 'Analyse indisponible — votre gabarit reste enregistré.',
      },
    })
  }
}
