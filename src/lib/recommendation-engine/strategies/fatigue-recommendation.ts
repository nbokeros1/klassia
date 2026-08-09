// ── Recommendation Engine — WellbeingRecommendationStrategy (ME-17) ───────────
//
// Basée sur cadence_pattern : détecte une surconcentration sur le weekend
// et suggère de répartir le travail sur la semaine.

import type { Insight }              from '@/lib/insight-engine/insight-types'
import type { Recommendation, RecommendationStrategy } from '../recommendation-types'
import { RecommendationPriority }    from '../recommendation-types'
import { RecommendationBuilder }     from '../recommendation-builder'

const MIN_CONFIDENCE  = 25
const MIN_SCORE       = 60    // concentration notable sur un seul jour

const WEEKEND_MARKERS = ['dimanche', 'samedi']
const WEEKEND_DAYS    = new Set(['Dimanche', 'Samedi'])

function detectWeekend(desc: string): string | null {
  const lower = desc.toLowerCase()
  for (const marker of WEEKEND_MARKERS) {
    if (lower.includes(marker)) {
      return marker.charAt(0).toUpperCase() + marker.slice(1)
    }
  }
  return null
}

export class WellbeingRecommendationStrategy implements RecommendationStrategy {
  readonly recommendationType = 'wellbeing' as const

  generate(insights: Insight[], teacherId: string): Recommendation[] {
    const insight = insights.find(
      i => i.type === 'cadence_pattern'
        && i.confidence >= MIN_CONFIDENCE
        && i.score      >= MIN_SCORE,
    )
    if (!insight) return []

    const builder = new RecommendationBuilder()
      .ofType('wellbeing')
      .forTeacher(teacherId)
      .withConfidence(insight.confidence)
      .basedOn([insight.id])
      .expiresIn(7)

    const weekendDay = detectWeekend(insight.description)

    if (weekendDay) {
      const other = weekendDay === 'Dimanche' ? 'vendredi' : 'jeudi'
      return [builder
        .withPriority(RecommendationPriority.MEDIUM)
        .withTitle('Répartir la charge du weekend')
        .withDescription(`Répartir une partie de la préparation le ${other} pourrait réduire votre charge du ${weekendDay.toLowerCase()}.`)
        .withReason(`Votre activité pédagogique se concentre principalement le ${weekendDay} (${insight.score}% de votre activité).`)
        .build()]
    }

    // Forte concentration sur un jour de semaine → INFORMATION neutre
    return [builder
      .withPriority(RecommendationPriority.INFORMATION)
      .withTitle('Concentration de l\'activité')
      .withDescription('Vous pourriez envisager de répartir votre activité sur plusieurs jours pour une charge plus équilibrée.')
      .withReason(`${insight.score}% de votre activité se concentre sur un seul jour de la semaine.`)
      .build()]
  }
}
