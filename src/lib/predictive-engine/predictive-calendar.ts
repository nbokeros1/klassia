// ── Predictive Engine — Calendar Utilities (ME-18) ───────────────────────────
//
// Fonctions pures pour analyser CalendarContext sans accès Supabase.
// Toutes les fonctions sont synchrones et déterministes.

import type { CalendarEventSnapshot, CalendarDeadlineSnapshot } from '@/lib/pedagogy/calendar/types'
import type { CalendarContext } from './prediction-types'

// ── Utilitaires temporels ─────────────────────────────────────────────────────

export function daysUntil(date: Date, now: Date): number {
  return Math.floor((date.getTime() - now.getTime()) / 86_400_000)
}

// ── Filtres sur les événements ────────────────────────────────────────────────

export function eventsWithinDays(
  events: CalendarEventSnapshot[],
  maxDays: number,
  now: Date,
): CalendarEventSnapshot[] {
  return events.filter(e => {
    const days = daysUntil(e.dateDebut, now)
    return days >= 0 && days <= maxDays
  })
}

export function deadlinesWithinDays(
  deadlines: CalendarDeadlineSnapshot[],
  maxDays: number,
): CalendarDeadlineSnapshot[] {
  return deadlines.filter(d => d.urgencyDays >= 0 && d.urgencyDays <= maxDays)
}

export function upcomingEvaluationDeadlines(
  ctx: CalendarContext,
  maxDays: number,
): CalendarDeadlineSnapshot[] {
  return ctx.deadlines
    .filter(d => d.type === 'evaluation' && d.urgencyDays >= 0 && d.urgencyDays <= maxDays)
    .sort((a, b) => a.urgencyDays - b.urgencyDays)
}

export function upcomingLessons(
  ctx: CalendarContext,
  maxDays: number,
): CalendarEventSnapshot[] {
  return eventsWithinDays(
    ctx.events.filter(e => e.type === 'lecon'),
    maxDays,
    ctx.now,
  ).sort((a, b) => a.dateDebut.getTime() - b.dateDebut.getTime())
}

export function upcomingHolidays(
  ctx: CalendarContext,
  maxDays: number,
): CalendarEventSnapshot[] {
  return eventsWithinDays(
    ctx.events.filter(e => e.type === 'conge' || e.type === 'ferie'),
    maxDays,
    ctx.now,
  ).sort((a, b) => a.dateDebut.getTime() - b.dateDebut.getTime())
}

export function upcomingAssignmentDeadlines(
  ctx: CalendarContext,
  maxDays: number,
): CalendarDeadlineSnapshot[] {
  return ctx.deadlines
    .filter(d => d.urgencyDays >= 0 && d.urgencyDays <= maxDays)
    .sort((a, b) => a.urgencyDays - b.urgencyDays)
}

// ── Détection de période d'examens ────────────────────────────────────────────

export function hasExamPeriod(
  ctx: CalendarContext,
  windowDays: number,
  minCount: number,
): boolean {
  const evaluations = ctx.deadlines.filter(
    d => d.type === 'evaluation' && d.urgencyDays >= 0 && d.urgencyDays <= windowDays,
  )
  return evaluations.length >= minCount
}

// ── Détection de fin de semestre ──────────────────────────────────────────────

const SEMESTER_END_KEYWORDS = ['fin', 'bilan', 'bulletin', 'résultats', 'remise']

export function hasSemesterEnd(
  ctx: CalendarContext,
  maxDays: number,
): CalendarEventSnapshot | undefined {
  const candidates = eventsWithinDays(
    ctx.events.filter(e =>
      e.type === 'calendrier_scolaire' || e.type === 'evenement'
    ),
    maxDays,
    ctx.now,
  )

  return candidates.find(e => {
    const titre = e.titre.toLowerCase()
    return SEMESTER_END_KEYWORDS.some(kw => titre.includes(kw))
  })
}

// ── Calcul de confidence basé sur l'urgence ───────────────────────────────────

export function confidenceFromUrgency(daysAway: number): number {
  if (daysAway <= 1) return 95
  if (daysAway <= 3) return 85
  if (daysAway <= 5) return 75
  if (daysAway <= 7) return 65
  if (daysAway <= 10) return 55
  if (daysAway <= 14) return 45
  return 35
}
