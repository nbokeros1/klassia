// ── Recommendation Engine — EvaluationRecommendationStrategy (ME-17) ──────────
//
// Basée sur evaluation_pattern (fréquence des évaluations).

import type { Insight }              from '@/lib/insight-engine/insight-types'
import type { Recommendation, RecommendationStrategy } from '../recommendation-types'
import { RecommendationPriority }    from '../recommendation-types'
import { RecommendationBuilder }     from '../recommendation-builder'

const MIN_CONFIDENCE = 25

export class EvaluationRecommendationStrategy implements RecommendationStrategy {
  readonly recommendationType = 'evaluation' as const

  generate(insights: Insight[], teacherId: string): Recommendation[] {
    const insight = insights.find(
      i => i.type === 'evaluation_pattern' && i.confidence >= MIN_CONFIDENCE,
    )
    if (!insight) return []

    const builder = new RecommendationBuilder()
      .ofType('evaluation')
      .forTeacher(teacherId)
      .withConfidence(insight.confidence)
      .basedOn([insight.id])
      .expiresIn(7)

    if (insight.score < 40) {
      return [builder
        .withPriority(RecommendationPriority.MEDIUM)
        .withTitle('Préparer les évaluations à l\'avance')
        .withDescription('Il peut être utile d\'augmenter la fréquence de préparation de vos évaluations pour éviter la précipitation.')
        .withReason('La fréquence de création d\'évaluations est faible sur la période analysée.')
        .build()]
    }

    return [builder
      .withPriority(RecommendationPriority.INFORMATION)
      .withTitle('Bonne fréquence d\'évaluations')
      .withDescription('Vous pourriez maintenir cette cadence de préparation des évaluations.')
      .withReason('Vous préparez vos évaluations à un rythme satisfaisant.')
      .build()]
  }
}
