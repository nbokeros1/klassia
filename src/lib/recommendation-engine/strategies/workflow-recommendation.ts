// ── Recommendation Engine — WorkflowRecommendationStrategy (ME-17) ────────────
//
// Basée sur workflow_pattern (taux de complétion) et interruption_pattern (abandons).

import type { Insight }              from '@/lib/insight-engine/insight-types'
import type { Recommendation, RecommendationStrategy } from '../recommendation-types'
import { RecommendationPriority }    from '../recommendation-types'
import { RecommendationBuilder }     from '../recommendation-builder'

const MIN_CONFIDENCE = 25

export class WorkflowRecommendationStrategy implements RecommendationStrategy {
  readonly recommendationType = 'workflow' as const

  generate(insights: Insight[], teacherId: string): Recommendation[] {
    const interruptionInsight = insights.find(
      i => i.type === 'interruption_pattern' && i.confidence >= MIN_CONFIDENCE,
    )
    const workflowInsight = insights.find(
      i => i.type === 'workflow_pattern' && i.confidence >= MIN_CONFIDENCE,
    )

    if (!interruptionInsight && !workflowInsight) return []

    const basedOnIds = [interruptionInsight?.id, workflowInsight?.id].filter(Boolean) as string[]
    const confidence = Math.round(
      basedOnIds.reduce((sum, id) => {
        const ins = insights.find(i => i.id === id)
        return sum + (ins?.confidence ?? 0)
      }, 0) / basedOnIds.length,
    )

    const builder = new RecommendationBuilder()
      .ofType('workflow')
      .forTeacher(teacherId)
      .withConfidence(confidence)
      .basedOn(basedOnIds)
      .expiresIn(7)

    // Taux d'abandon élevé → HIGH
    if (interruptionInsight && interruptionInsight.score > 40) {
      return [builder
        .withPriority(RecommendationPriority.HIGH)
        .withTitle('Réduire les interruptions')
        .withDescription('Essayez de découper vos préparations en sessions plus courtes et ciblées pour réduire le taux d\'abandon.')
        .withReason(`Vous abandonnez ${interruptionInsight.score}% de vos plans de travail commencés.`)
        .build()]
    }

    // Faible complétion → MEDIUM
    if (workflowInsight && workflowInsight.score < 60) {
      return [builder
        .withPriority(RecommendationPriority.MEDIUM)
        .withTitle('Compléter les plans commencés')
        .withDescription('Essayez de terminer les plans de travail que vous commencez — chaque plan mené à terme consolide la progression.')
        .withReason(`Vous terminez ${workflowInsight.score}% de vos plans de travail commencés.`)
        .build()]
    }

    // Bonne complétion → INFORMATION
    const refInsight = workflowInsight ?? interruptionInsight!
    return [builder
      .withPriority(RecommendationPriority.INFORMATION)
      .withTitle('Bonne complétion des plans')
      .withDescription('Vous pourriez continuer à mener vos plans de travail à terme — c\'est un indicateur de progression régulière.')
      .withReason(`Vous terminez ${workflowInsight?.score ?? 100 - (interruptionInsight?.score ?? 0)}% de vos plans commencés.`)
      .basedOn([refInsight.id])
      .build()]
  }
}
