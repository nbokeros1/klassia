// ── Insight Engine — ConsistencyPattern (ME-16) ────────────────────────────────
//
// Mesure la régularité de l'activité : plus le coefficient de variation est bas,
// plus l'enseignant a une cadence régulière.

import type { ActivityEvent }   from '@/lib/activity-engine/event-types'
import type { Insight, InsightPeriod, PatternAnalyzer } from '../insight-types'
import { InsightBuilder }       from '../insight-builder'

const MIN_WEEKS = 3

function periodDaysOf(period: InsightPeriod): number {
  const since = new Date(period.since)
  const until = new Date(period.until)
  return Math.max(1, Math.round((until.getTime() - since.getTime()) / 86_400_000))
}

function weekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())  // recule au dimanche
  return d.toISOString().slice(0, 10)
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

export class ConsistencyPattern implements PatternAnalyzer {
  readonly insightType = 'consistency_pattern' as const

  analyze(events: ActivityEvent[], teacherId: string, period: InsightPeriod): Insight | null {
    if (events.length < 3) return null

    // Group events by ISO week start
    const byWeek = new Map<string, number>()
    for (const ev of events) {
      const key = weekKey(new Date(ev.occurredAt))
      byWeek.set(key, (byWeek.get(key) ?? 0) + 1)
    }

    if (byWeek.size < MIN_WEEKS) return null

    const counts = [...byWeek.values()]
    const mean   = counts.reduce((a, b) => a + b, 0) / counts.length
    const cv     = mean > 0 ? stddev(counts) / mean : 1

    // Low CV → high score (regular) — high CV → low score (irregular)
    const score      = Math.max(0, Math.round(100 - cv * 120))
    const confidence = Math.min(90, Math.round((byWeek.size / 8) * 100))
    const days       = periodDaysOf(period)

    if (confidence < 15) return null

    const label = score >= 70 ? 'régulière' : score >= 40 ? 'modérément régulière' : 'irrégulière'
    const desc  = `Votre activité est ${label} sur la période (${byWeek.size} semaines analysées).`

    return new InsightBuilder()
      .ofType('consistency_pattern')
      .forTeacher(teacherId)
      .withScore(score)
      .withConfidence(confidence)
      .withTitle('Régularité')
      .withDescription(desc)
      .forPeriod(new Date(period.since), new Date(period.until))
      .withEvidence({ eventCount: events.length, periodDays: days, sampleSize: byWeek.size })
      .build()
  }
}
