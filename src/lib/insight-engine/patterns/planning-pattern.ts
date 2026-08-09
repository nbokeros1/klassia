// ── Insight Engine — PlanningPattern (ME-16) ──────────────────────────────────
//
// Détecte si l'enseignant prépare ses leçons en début de semaine (lundi–mercredi).

import type { ActivityEvent }   from '@/lib/activity-engine/event-types'
import type { Insight, InsightPeriod, PatternAnalyzer } from '../insight-types'
import { InsightBuilder }       from '../insight-builder'

const MIN_LESSONS = 3
// Days 1 (Mon), 2 (Tue), 3 (Wed) = "early week"
const EARLY_DAYS  = new Set([1, 2, 3])

function sampleConf(n: number, sat = 15): number {
  return Math.min(90, Math.round((n / sat) * 100))
}

export class PlanningPattern implements PatternAnalyzer {
  readonly insightType = 'planning_pattern' as const

  analyze(events: ActivityEvent[], teacherId: string, period: InsightPeriod): Insight | null {
    const lessons = events.filter(e => e.type === 'lesson_created')
    if (lessons.length < MIN_LESSONS) return null

    const earlyCount = lessons.filter(e => EARLY_DAYS.has(new Date(e.occurredAt).getDay())).length
    const score      = Math.round((earlyCount / lessons.length) * 100)
    const confidence = sampleConf(lessons.length)

    if (confidence < 20) return null

    const since = new Date(period.since)
    const until = new Date(period.until)
    const periodDays = Math.max(1, Math.round((until.getTime() - since.getTime()) / 86_400_000))

    const desc = score >= 60
      ? `Vous préparez ${score}% de vos leçons en début de semaine (lun.–mer.) — une bonne avance.`
      : `Vous préparez ${score}% de vos leçons en début de semaine. La majorité est créée en fin de semaine.`

    return new InsightBuilder()
      .ofType('planning_pattern')
      .forTeacher(teacherId)
      .withScore(score)
      .withConfidence(confidence)
      .withTitle('Planification à l\'avance')
      .withDescription(desc)
      .forPeriod(since, until)
      .withEvidence({ eventCount: events.length, periodDays, sampleSize: lessons.length })
      .build()
  }
}
