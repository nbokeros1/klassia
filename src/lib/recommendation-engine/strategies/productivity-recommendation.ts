// ── Recommendation Engine — ProductivityRecommendationStrategy (ME-17) ────────
//
// Basée sur productivity_pattern (volume d'actions par semaine).

import type { Insight }              from '@/lib/insight-engine/insight-types'
import type { Recommendation, RecommendationStrategy } from '../recommendation-types'
import { RecommendationPriority }    from '../recommendation-types'
import { RecommendationBuilder }     from '../recommendation-builder'

const MIN_CONFIDENCE = 25

export class ProductivityRecommendationStrategy implements RecommendationStrategy {
  readonly recommendationType = 'productivity' as const

  generate(insights: Insight[], teacherId: string): Recommendation[] {
    const insight = insights.find(
      i => i.type === 'productivity_pattern' && i.confidence >= MIN_CONFIDENCE,
    )
    if (!insight) return []

    const builder = new RecommendationBuilder()
      .ofType('productivity')
      .forTeacher(teacherId)
      .withConfidence(insight.confidence)
      .basedOn([insight.id])
      .expiresIn(7)

    if (insight.score < 30) {
      return [builder
        .withPriority(RecommendationPriority.MEDIUM)
        .withTitle('Identifier des créneaux de préparation')
        .withDescription('Il peut être utile d\'identifier des moments dédiés dans votre semaine pour les tâches pédagogiques.')
        .withReason('Le volume d\'activité pédagogique est faible sur la période analysée.')
        .build()]
    }

    return [builder
      .withPriority(RecommendationPriority.INFORMATION)
      .withTitle('Bon volume d\'activité')
      .withDescription('Vous pourriez continuer à maintenir ce volume d\'activité pédagogique.')
      .withReason('Votre volume d\'activité pédagogique hebdomadaire est satisfaisant.')
      .build()]
  }
}
