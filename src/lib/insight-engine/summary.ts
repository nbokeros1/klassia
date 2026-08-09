// ── Insight Engine — Summary (ME-16) ──────────────────────────────────────────

import type { Insight, InsightType } from './insight-types'

export interface InsightSummary {
  total:         number
  byType:        Partial<Record<InsightType, number>>
  highConfidence: Insight[]   // confidence >= 70
  topInsights:   Insight[]    // top 5 par confidence
}

export function summarizeInsights(insights: Insight[]): InsightSummary {
  const byType: Partial<Record<InsightType, number>> = {}

  for (const insight of insights) {
    byType[insight.type] = (byType[insight.type] ?? 0) + 1
  }

  const sorted = [...insights].sort((a, b) => b.confidence - a.confidence)

  return {
    total:          insights.length,
    byType,
    highConfidence: insights.filter(i => i.confidence >= 70),
    topInsights:    sorted.slice(0, 5),
  }
}
