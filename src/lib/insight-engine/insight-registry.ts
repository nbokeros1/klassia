// ── Insight Engine — Registry (ME-16) ─────────────────────────────────────────

import type { ActivityEvent }               from '@/lib/activity-engine/event-types'
import type { Insight, InsightPeriod, PatternAnalyzer } from './insight-types'

export class InsightRegistry {
  private analyzers: PatternAnalyzer[] = []

  register(analyzer: PatternAnalyzer): void {
    this.analyzers.push(analyzer)
  }

  getAnalyzers(): PatternAnalyzer[] {
    return [...this.analyzers]
  }

  // Runs all registered patterns and returns non-null results.
  analyze(events: ActivityEvent[], teacherId: string, period: InsightPeriod): Insight[] {
    const results: Insight[] = []
    for (const analyzer of this.analyzers) {
      try {
        const insight = analyzer.analyze(events, teacherId, period)
        if (insight !== null) results.push(insight)
      } catch (err) {
        console.error('[KLASSIA][INSIGHT_REGISTRY][PATTERN_ERROR]', {
          type: analyzer.insightType,
          err:  String(err),
        })
      }
    }
    return results
  }
}
