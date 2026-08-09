// ── Insight Engine — InterruptionPattern (ME-16) ──────────────────────────────
//
// Mesure le taux d'abandon des plans de travail (workflow_cancelled / workflow_started).

import type { ActivityEvent }   from '@/lib/activity-engine/event-types'
import type { Insight, InsightPeriod, PatternAnalyzer } from '../insight-types'
import { InsightBuilder }       from '../insight-builder'

function sampleConf(n: number, sat = 8): number {
  return Math.min(85, Math.round((n / sat) * 100))
}

function periodDaysOf(period: InsightPeriod): number {
  const since = new Date(period.since)
  const until = new Date(period.until)
  return Math.max(1, Math.round((until.getTime() - since.getTime()) / 86_400_000))
}

export class InterruptionPattern implements PatternAnalyzer {
  readonly insightType = 'interruption_pattern' as const

  analyze(events: ActivityEvent[], teacherId: string, period: InsightPeriod): Insight | null {
    const started   = events.filter(e => e.type === 'workflow_started').length
    const cancelled = events.filter(e => e.type === 'workflow_cancelled').length

    if (started < 2) return null

    const abandonRate = cancelled / started
    const score       = Math.round(abandonRate * 100)
    const confidence  = sampleConf(started)

    if (confidence < 15) return null

    const days = periodDaysOf(period)

    const desc = score === 0
      ? `Vous n'avez annulé aucun plan de travail sur la période — bonne persévérance.`
      : `Vous avez abandonné ${score}% de vos plans de travail (${cancelled}/${started}).`

    return new InsightBuilder()
      .ofType('interruption_pattern')
      .forTeacher(teacherId)
      .withScore(score)
      .withConfidence(confidence)
      .withTitle('Taux d\'interruption')
      .withDescription(desc)
      .forPeriod(new Date(period.since), new Date(period.until))
      .withEvidence({ eventCount: events.length, periodDays: days, sampleSize: started })
      .build()
  }
}
