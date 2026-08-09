// ── Recommendation Engine — Summary (ME-17) ───────────────────────────────────

import type { Recommendation, RecommendationType, RecommendationPriority } from './recommendation-types'

export interface RecommendationSummary {
  total:             number
  byPriority:        Partial<Record<RecommendationPriority, number>>
  byType:            Partial<Record<RecommendationType, number>>
  highPriority:      Recommendation[]   // priority === HIGH
  topRecommendations: Recommendation[]  // top 3 par confidence
}

const PRIORITY_ORDER: Record<string, number> = {
  HIGH: 3, MEDIUM: 2, LOW: 1, INFORMATION: 0,
}

export function summarizeRecommendations(recs: Recommendation[]): RecommendationSummary {
  const byPriority: Partial<Record<RecommendationPriority, number>> = {}
  const byType:     Partial<Record<RecommendationType, number>>     = {}

  for (const rec of recs) {
    byPriority[rec.priority] = (byPriority[rec.priority] ?? 0) + 1
    byType[rec.type]         = (byType[rec.type]         ?? 0) + 1
  }

  const sorted = [...recs].sort((a, b) => {
    const pDiff = (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0)
    if (pDiff !== 0) return pDiff
    return b.confidence - a.confidence
  })

  return {
    total:              recs.length,
    byPriority,
    byType,
    highPriority:       recs.filter(r => r.priority === 'HIGH'),
    topRecommendations: sorted.slice(0, 3),
  }
}
