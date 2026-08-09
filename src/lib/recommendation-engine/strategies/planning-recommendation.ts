// ── Recommendation Engine — PlanningRecommendationStrategy (ME-17) ────────────
//
// PlanningRecommendationStrategy  : basée sur planning_pattern
// PreparationRecommendationStrategy : basée sur preparation_pattern

import type { Insight }              from '@/lib/insight-engine/insight-types'
import type { Recommendation, RecommendationStrategy } from '../recommendation-types'
import { RecommendationPriority }    from '../recommendation-types'
import { RecommendationBuilder }     from '../recommendation-builder'

const MIN_CONFIDENCE = 25

// ── PlanningRecommendationStrategy ────────────────────────────────────────────

export class PlanningRecommendationStrategy implements RecommendationStrategy {
  readonly recommendationType = 'planning' as const

  generate(insights: Insight[], teacherId: string): Recommendation[] {
    const insight = insights.find(
      i => i.type === 'planning_pattern' && i.confidence >= MIN_CONFIDENCE,
    )
    if (!insight) return []

    const isStrong = insight.score >= 50

    const builder = new RecommendationBuilder()
      .ofType('planning')
      .forTeacher(teacherId)
      .withConfidence(insight.confidence)
      .basedOn([insight.id])
      .expiresIn(7)

    if (isStrong) {
      return [builder
        .withPriority(RecommendationPriority.INFORMATION)
        .withTitle('Planification efficace')
        .withDescription('Vous pourriez continuer à préparer vos cours en début de semaine — c\'est une excellente habitude.')
        .withReason(`${insight.score}% de vos leçons sont créées en début de semaine (lun.–mer.).`)
        .build()]
    }

    return [builder
      .withPriority(RecommendationPriority.MEDIUM)
      .withTitle('Planifier plus tôt dans la semaine')
      .withDescription('Essayez de créer vos leçons en début de semaine (lun.–mer.) pour réduire la charge en fin de semaine.')
      .withReason(`Seulement ${insight.score}% de vos leçons sont créées en début de semaine.`)
      .build()]
  }
}

// ── PreparationRecommendationStrategy ─────────────────────────────────────────

export class PreparationRecommendationStrategy implements RecommendationStrategy {
  readonly recommendationType = 'preparation' as const

  generate(insights: Insight[], teacherId: string): Recommendation[] {
    const insight = insights.find(
      i => i.type === 'preparation_pattern' && i.confidence >= MIN_CONFIDENCE,
    )
    if (!insight) return []

    const isStrong = insight.score >= 40

    const builder = new RecommendationBuilder()
      .ofType('preparation')
      .forTeacher(teacherId)
      .withConfidence(insight.confidence)
      .basedOn([insight.id])
      .expiresIn(7)

    if (isStrong) {
      return [builder
        .withPriority(RecommendationPriority.INFORMATION)
        .withTitle('Bonne fréquence de préparation')
        .withDescription('Vous pourriez maintenir cette fréquence de création de leçons — elle indique une routine pédagogique établie.')
        .withReason('Votre fréquence de création de leçons est satisfaisante.')
        .build()]
    }

    return [builder
      .withPriority(RecommendationPriority.MEDIUM)
      .withTitle('Augmenter la fréquence de préparation')
      .withDescription('Il peut être utile d\'établir une routine de préparation hebdomadaire pour éviter la surcharge ponctuelle.')
      .withReason('Votre fréquence actuelle de création de leçons est faible sur la période analysée.')
      .build()]
  }
}
