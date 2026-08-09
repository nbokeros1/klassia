import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { CopilotTeachingContext } from '@/types/enseigner/copilot'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Mission 1 — Build contextualized system prompt
function buildSystemPrompt(ctx: CopilotTeachingContext): string {
  const imbalanceSection = ctx.active_imbalances.length > 0
    ? `\nDÉSÉQUILIBRES DÉTECTÉS : ${ctx.active_imbalances.join(' · ')}`
    : ''

  const profileSection = ctx.preferred_methods.length > 0
    ? `\nMÉTHODES PRÉFÉRÉES DE L'ENSEIGNANT : ${ctx.preferred_methods.join(', ')}`
    : ''

  return `Tu es KlassIA Copilot, un assistant pédagogique dédié aux enseignants en salle de classe.

CONTEXTE DU COURS EN COURS :
• Leçon : ${ctx.lecon_titre}
• Classe : ${ctx.classe} · Matière : ${ctx.matiere}
• Date : ${ctx.date}
• Activité courante : ${ctx.current_activity_titre} (${ctx.current_activity_type}, ${ctx.current_activity_duree_prevue} min prévues)
• Objectif : ${ctx.current_activity_objectif || 'Non spécifié'}
• Avancement : ${ctx.activities_done}/${ctx.activities_total} activités terminées
• Temps écoulé : ${ctx.elapsed_min} min · Temps restant estimé : ${ctx.remaining_min} min
• Fin estimée : ${ctx.estimated_end}
• Score de fluidité : ${ctx.flow_score}/100 · Engagement estimé : ${ctx.engagement_estime}
• Variance temporelle : ${ctx.variance_cumulative > 0 ? `+${ctx.variance_cumulative}` : ctx.variance_cumulative} min${imbalanceSection}${profileSection}

NOTES DE SÉANCE : ${ctx.notes_summary.length > 0 ? ctx.notes_summary.join(' | ') : 'Aucune'}

RÈGLES ABSOLUES :
1. Toutes tes réponses doivent utiliser le contexte pédagogique ci-dessus.
2. Réponses courtes (2-3 phrases maximum) sauf si l'enseignant demande explicitement plus de détails.
3. Tu proposes et suggères — tu ne décides jamais à la place de l'enseignant.
4. Tu n'inventes jamais de faits pédagogiques non justifiés par le contexte.
5. Tu utilises le vouvoiement.
6. Aucune réponse générique déconnectée du cours en cours.
7. Chaque suggestion doit être directement applicable maintenant, en classe.`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
      teachingContext: CopilotTeachingContext
    }

    const { messages, teachingContext } = body
    if (!messages?.length) {
      return new Response('Messages manquants', { status: 400 })
    }

    const systemPrompt = buildSystemPrompt(teachingContext)

    const encoder = new TextEncoder()
    const stream  = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.create({
            model:      'claude-haiku-4-5-20251001', // fast for in-class use
            max_tokens: 512,                          // short responses by default
            system:     systemPrompt,
            messages,
            stream:     true,
          })

          for await (const event of response) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
        } catch (err) {
          controller.error(err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('[KLASSIA][COPILOT] Error:', err)
    return new Response('Erreur interne', { status: 500 })
  }
}
