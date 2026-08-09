// ── Recommendation Engine — ConsistencyRecommendationStrategy (ME-17) ─────────
//
// Basée sur consistency_pattern (régularité semaine à semaine).

import type { Insight }              from '@/lib/insight-engine/insight-types'
import type { Recommendation, RecommendationStrategy } from '../recommendation-types'
import { RecommendationPriority }    from '../recommendation-types'
import { RecommendationBuilder }     from '../recommendation-builder'

const MIN_CONFIDENCE = 25

export class ConsistencyRecommendationStrategy implements RecommendationStrategy {
  readonly recommendationType = 'consistency' as const

  generate(insights: Insight[], teacherId: string): Recommendation[] {
    const insight = insights.find(
      i => i.type === 'consistency_pattern' && i.confidence >= MIN_CONFIDENCE,
    )
    if (!insight) return []

    const builder = new RecommendationBuilder()
      .ofType('consistency')
      .forTeacher(teacherId)
      .withConfidence(insight.confidence)
      .basedOn([insight.id])
      .expiresIn(7)

    if (insight.score < 40) {
      return [builder
        .withPriority(RecommendationPriority.HIGH)
        .withTitle('Établir une routine hebdomadaire')
        .withDescription('Essayez d\'établir une routine hebdomadaire de préparation — la régularité réduit la charge cognitive et les imprévus.')
        .withReason('Votre activité pédagogique est irrégulière d\'une semaine à l\'autre.')
        .build()]
    }

    if (insight.score < 70) {
      return [builder
        .withPriority(RecommendationPriority.MEDIUM)
        .withTitle('Améliorer la régularité')
        .withDescription('Vous pourriez améliorer votre régularité en réservant des créneaux fixes chaque semaine pour la préparation.')
        .withReason('Votre régularité est modérée sur la période analysée.')
        .build()]
    }

    return [builder
      .withPriority(RecommendationPriority.INFORMATION)
      .withTitle('Excellente régularité')
      .withDescription('Vous pourriez maintenir cette régularité — elle favorise une charge de travail stable et prévisible.')
      .withReason('Votre activité pédagogique est régulière d\'une semaine à l\'autre.')
      .build()]
  }
}
