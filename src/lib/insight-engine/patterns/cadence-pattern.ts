// ── Insight Engine — CadencePattern (ME-16) ───────────────────────────────────
//
// Détecte les jours de la semaine où l'enseignant est le plus actif.

import type { ActivityEvent }   from '@/lib/activity-engine/event-types'
import type { Insight, InsightPeriod, PatternAnalyzer } from '../insight-types'
import { InsightBuilder }       from '../insight-builder'

const DAYS_FR  = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MIN_EVENTS = 5

function sampleConf(n: number, sat = 20): number {
  return Math.min(95, Math.round((n / sat) * 100))
}

export class CadencePattern implements PatternAnalyzer {
  readonly insightType = 'cadence_pattern' as const

  analyze(events: ActivityEvent[], teacherId: string, period: InsightPeriod): Insight | null {
    if (events.length < MIN_EVENTS) return null

    // Count events by day of week
    const dayCounts = new Array<number>(7).fill(0)
    for (const ev of events) {
      const day = new Date(ev.occurredAt).getDay()
      dayCounts[day]++
    }

    const total = events.length
    const maxCount = Math.max(...dayCounts)
    const dominantDay = dayCounts.indexOf(maxCount)
    const share = maxCount / total
    const score = Math.round(share * 100)
    const confidence = sampleConf(total)

    if (confidence < 20) return null

    const since = new Date(period.since)
    const until = new Date(period.until)
    const periodDays = Math.max(1, Math.round((until.getTime() - since.getTime()) / 86_400_000))

    return new InsightBuilder()
      .ofType('cadence_pattern')
      .forTeacher(teacherId)
      .withScore(score)
      .withConfidence(confidence)
      .withTitle('Cadence d\'activité')
      .withDescription(`Vous êtes le plus actif le ${DAYS_FR[dominantDay]} (${score}% de votre activité hebdomadaire).`)
      .forPeriod(since, until)
      .withEvidence({ eventCount: total, periodDays, sampleSize: total })
      .build()
  }
}
