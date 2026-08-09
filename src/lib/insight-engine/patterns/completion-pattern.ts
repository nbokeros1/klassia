// ── Insight Engine — CompletionPattern + ProductivityPattern (ME-16) ──────────
//
// CompletionPattern  : taux de complétion des workflows.
// ProductivityPattern: volume d'événements par semaine.

import type { ActivityEvent }   from '@/lib/activity-engine/event-types'
import type { Insight, InsightPeriod, PatternAnalyzer } from '../insight-types'
import { InsightBuilder }       from '../insight-builder'

function sampleConf(n: number, sat = 10): number {
  return Math.min(90, Math.round((n / sat) * 100))
}

function periodDaysOf(period: InsightPeriod): number {
  const since = new Date(period.since)
  const until = new Date(period.until)
  return Math.max(1, Math.round((until.getTime() - since.getTime()) / 86_400_000))
}

// ── CompletionPattern (workflow_pattern) ──────────────────────────────────────

export class CompletionPattern implements PatternAnalyzer {
  readonly insightType = 'workflow_pattern' as const

  analyze(events: ActivityEvent[], teacherId: string, period: InsightPeriod): Insight | null {
    const started   = events.filter(e => e.type === 'workflow_started').length
    const completed = events.filter(e => e.type === 'workflow_completed').length

    if (started < 2) return null

    const rate       = completed / started
    const score      = Math.round(rate * 100)
    const confidence = sampleConf(started)

    if (confidence < 15) return null

    const days = periodDaysOf(period)
    const desc = `Vous terminez ${score}% de vos plans de travail commencés (${completed}/${started}).`

    return new InsightBuilder()
      .ofType('workflow_pattern')
      .forTeacher(teacherId)
      .withScore(score)
      .withConfidence(confidence)
      .withTitle('Complétion des plans')
      .withDescription(desc)
      .forPeriod(new Date(period.since), new Date(period.until))
      .withEvidence({ eventCount: events.length, periodDays: days, sampleSize: started })
      .build()
  }
}

// ── ProductivityPattern (productivity_pattern) ────────────────────────────────

export class ProductivityPattern implements PatternAnalyzer {
  readonly insightType = 'productivity_pattern' as const

  analyze(events: ActivityEvent[], teacherId: string, period: InsightPeriod): Insight | null {
    if (events.length < 3) return null

    const days       = periodDaysOf(period)
    const weeks      = Math.max(1, days / 7)
    const perWeek    = events.length / weeks
    const score      = Math.min(100, Math.round(perWeek * 5))   // 20 actions/sem → 100
    const confidence = sampleConf(Math.floor(weeks), 6)

    if (confidence < 15) return null

    const perWeekDisplay = perWeek.toFixed(1)
    const desc = `Vous effectuez en moyenne ${perWeekDisplay} action(s) par semaine sur la période.`

    return new InsightBuilder()
      .ofType('productivity_pattern')
      .forTeacher(teacherId)
      .withScore(score)
      .withConfidence(confidence)
      .withTitle('Volume d\'activité')
      .withDescription(desc)
      .forPeriod(new Date(period.since), new Date(period.until))
      .withEvidence({ eventCount: events.length, periodDays: days, sampleSize: events.length })
      .build()
  }
}
