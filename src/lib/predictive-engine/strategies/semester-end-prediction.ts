// ── Predictive Engine — Semester End Prediction (ME-18) ───────────────────────
//
// Deux prédictions en un fichier :
// - SemesterTransitionStrategy : événements scolaires de type "fin/bilan/bulletin"
// - GradingPeriodStrategy      : période de notation (beaucoup de devoirs dans 21 jours)

import type { Insight }        from '@/lib/insight-engine/insight-types'
import type { Recommendation } from '@/lib/recommendation-engine/recommendation-types'
import type { Prediction, PredictionStrategy, CalendarContext } from '../prediction-types'
import { PredictionBuilder }   from '../prediction-builder'
import { hasSemesterEnd, daysUntil, confidenceFromUrgency } from '../predictive-calendar'

// ── Semester Transition ───────────────────────────────────────────────────────

const SEMESTER_WINDOW = 21

export class SemesterEndPredictionStrategy implements PredictionStrategy {
  readonly predictionType = 'semester_transition' as const

  generate(
    teacherId:       string,
    calendar:        CalendarContext,
    _insights:       Insight[],
    _recommendations: Recommendation[],
  ): Prediction[] {
    const event = hasSemesterEnd(calendar, SEMESTER_WINDOW)
    if (!event) return []

    const daysAway   = daysUntil(event.dateDebut, calendar.now)
    const confidence = confidenceFromUrgency(daysAway)
    if (confidence < 30) return []

    const prepDate = new Date(event.dateDebut.getTime() - 7 * 86_400_000)
    const daysStr  = daysAway === 0 ? "aujourd'hui" : `dans ${daysAway} jour(s)`

    return [
      new PredictionBuilder()
        .ofType('semester_transition')
        .forTeacher(teacherId)
        .withConfidence(confidence)
        .onDate(prepDate)
        .withSuggestedAction(`Préparer la transition de fin d'étape pour « ${event.titre} » ${daysStr}.`)
        .withReason(`L'événement scolaire « ${event.titre} » approche ${daysStr} — fin de semestre probable.`)
        .fromCalendar([event.id])
        .fromInsights([])
        .build(),
    ]
  }
}

// ── Grading Period ────────────────────────────────────────────────────────────

const GRADING_WINDOW   = 21
const GRADING_MIN_DEVOIRS = 3

export class GradingPeriodPredictionStrategy implements PredictionStrategy {
  readonly predictionType = 'grading_period' as const

  generate(
    teacherId:       string,
    calendar:        CalendarContext,
    insights:        Insight[],
    _recommendations: Recommendation[],
  ): Prediction[] {
    const devoirsAVenir = calendar.deadlines
      .filter(d => d.type === 'devoir' && d.urgencyDays >= 0 && d.urgencyDays <= GRADING_WINDOW)
      .sort((a, b) => a.urgencyDays - b.urgencyDays)

    if (devoirsAVenir.length < GRADING_MIN_DEVOIRS) return []

    const earliest  = devoirsAVenir[0]!
    const count     = devoirsAVenir.length

    const wfInsight = insights.find(i => i.type === 'workflow_pattern' && i.confidence >= 30)
    const boost     = wfInsight ? 8 : 0
    const confidence = Math.min(100, 45 + Math.min(count * 5, 20) + boost)

    const prepDate = new Date(earliest.date.getTime() - 3 * 86_400_000)

    return [
      new PredictionBuilder()
        .ofType('grading_period')
        .forTeacher(teacherId)
        .withConfidence(confidence)
        .onDate(prepDate)
        .withSuggestedAction(`Organiser la correction : ${count} remise(s) de travaux prévue(s) dans les ${GRADING_WINDOW} prochains jours.`)
        .withReason(`${count} remises de travaux sont à prévoir dans les ${GRADING_WINDOW} prochains jours.`)
        .fromCalendar(devoirsAVenir.map(d => d.id))
        .fromInsights(wfInsight ? [wfInsight.id] : [])
        .build(),
    ]
  }
}
