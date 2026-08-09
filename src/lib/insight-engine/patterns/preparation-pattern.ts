// ── Insight Engine — PreparationPattern + EvaluationPattern (ME-16) ──────────
//
// PreparationPattern : fréquence de création de leçons (par semaine).
// EvaluationPattern  : fréquence de création d'évaluations (par mois).

import type { ActivityEvent }   from '@/lib/activity-engine/event-types'
import type { Insight, InsightPeriod, PatternAnalyzer } from '../insight-types'
import { InsightBuilder }       from '../insight-builder'

function sampleConf(n: number, sat = 15): number {
  return Math.min(90, Math.round((n / sat) * 100))
}

function periodDaysOf(period: InsightPeriod): number {
  const since = new Date(period.since)
  const until = new Date(period.until)
  return Math.max(1, Math.round((until.getTime() - since.getTime()) / 86_400_000))
}

// ── PreparationPattern ────────────────────────────────────────────────────────

export class PreparationPattern implements PatternAnalyzer {
  readonly insightType = 'preparation_pattern' as const

  analyze(events: ActivityEvent[], teacherId: string, period: InsightPeriod): Insight | null {
    const lessons = events.filter(e => e.type === 'lesson_created')
    if (lessons.length < 2) return null

    const days       = periodDaysOf(period)
    const weeks      = Math.max(1, days / 7)
    const perWeek    = lessons.length / weeks
    const score      = Math.min(100, Math.round(perWeek * 20))   // 5/semaine → 100
    const confidence = sampleConf(lessons.length)

    if (confidence < 15) return null

    const perWeekDisplay = perWeek.toFixed(1)
    const desc = `Vous créez en moyenne ${perWeekDisplay} leçon(s) par semaine sur la période analysée.`

    return new InsightBuilder()
      .ofType('preparation_pattern')
      .forTeacher(teacherId)
      .withScore(score)
      .withConfidence(confidence)
      .withTitle('Préparation des leçons')
      .withDescription(desc)
      .forPeriod(new Date(period.since), new Date(period.until))
      .withEvidence({ eventCount: events.length, periodDays: days, sampleSize: lessons.length })
      .build()
  }
}

// ── EvaluationPattern ─────────────────────────────────────────────────────────

export class EvaluationPattern implements PatternAnalyzer {
  readonly insightType = 'evaluation_pattern' as const

  analyze(events: ActivityEvent[], teacherId: string, period: InsightPeriod): Insight | null {
    const evals = events.filter(e => e.type === 'evaluation_created')
    if (evals.length < 2) return null

    const days        = periodDaysOf(period)
    const months      = Math.max(1, days / 30)
    const perMonth    = evals.length / months
    const score       = Math.min(100, Math.round(perMonth * 25))   // 4/mois → 100
    const confidence  = sampleConf(evals.length, 10)

    if (confidence < 15) return null

    const perMonthDisplay = perMonth.toFixed(1)
    const desc = `Vous créez en moyenne ${perMonthDisplay} évaluation(s) par mois.`

    return new InsightBuilder()
      .ofType('evaluation_pattern')
      .forTeacher(teacherId)
      .withScore(score)
      .withConfidence(confidence)
      .withTitle('Fréquence des évaluations')
      .withDescription(desc)
      .forPeriod(new Date(period.since), new Date(period.until))
      .withEvidence({ eventCount: events.length, periodDays: days, sampleSize: evals.length })
      .build()
  }
}
