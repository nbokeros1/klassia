// SPIE-06 — PTE Calendar Engine
// Manages runtime events that change available teaching time.
// Separate from SPIE-04 CalendarEngine (which builds the plan).
// PTE CalendarEngine tracks what actually happened vs what was planned.

import type { TimeEvent, PTEEventType, CalendarDelta } from '../types/calendar-event'

let eventIdCounter = 0
function makeEventId(): string { return `pte_ev_${++eventIdCounter}` }

// ─── Event impact rules ───────────────────────────────────────────────────────

// Minutes lost for each event type (defaults — always overridable)
const DEFAULT_MINUTES_PERDUS: Record<PTEEventType, number> = {
  jour_ferie: 60,              // Full class period
  vacances: 0,                  // Handled at week level, not per-event
  examen: 60,
  journee_pedagogique: 60,
  absence_enseignant: 60,
  cours_annule: 60,
  cours_prolonge: 0,            // Gains time, not lost
  activite_speciale: 30,
  retard_debut: 15,
  fin_anticipee: 15,
}

// ─── PTE Calendar Engine ──────────────────────────────────────────────────────

export class PTECalendarEngine {
  // Create a new runtime event
  createEvent(params: {
    classeId: string
    matiereId?: string
    type: PTEEventType
    date: string
    dureeMinutesPerdues?: number
    dureeMinutesGagnees?: number
    titre?: string
    description?: string
    source?: 'planifie' | 'runtime'
  }): TimeEvent {
    const perdu = params.dureeMinutesPerdues ?? DEFAULT_MINUTES_PERDUS[params.type]
    const gagne = params.dureeMinutesGagnees ?? (params.type === 'cours_prolonge' ? 30 : 0)

    const titre = params.titre ?? this.defaultTitle(params.type)

    return {
      id: makeEventId(),
      classeId: params.classeId,
      matiereId: params.matiereId,
      type: params.type,
      date: params.date,
      dureeMinutesPerdues: perdu,
      dureeMinutesGagnees: gagne,
      titre,
      description: params.description,
      source: params.source ?? 'runtime',
      severity: this.computeSeverity(perdu),
      impacteLesPrecedentes: perdu >= 60,   // Full period → cascade impact
      sequencesAffectees: [],
    }
  }

  // Apply a batch of events to compute the net delta on a time range
  computeDelta(events: TimeEvent[], from: string, to: string): CalendarDelta {
    const inRange = events.filter(e => e.date >= from && e.date <= to)
    const minutesPerdues = inRange.reduce((sum, e) => sum + e.dureeMinutesPerdues, 0)
    const minutesGagnees = inRange.reduce((sum, e) => sum + e.dureeMinutesGagnees, 0)

    const semainesSet = new Set<number>()
    for (const e of inRange) {
      const dayOfYear = Math.floor((new Date(e.date).getTime() - new Date(from).getTime()) / 86400000)
      semainesSet.add(Math.floor(dayOfYear / 7) + 1)
    }

    return {
      periodeDebut: from,
      periodeFin: to,
      minutesPerdues,
      minutesGagnees,
      netMinutes: minutesGagnees - minutesPerdues,
      eventsAppliques: inRange.map(e => e.id),
      semainesTouchees: [...semainesSet].sort((a, b) => a - b),
    }
  }

  // Get events that have a cascade impact
  getImpactingEvents(events: TimeEvent[]): TimeEvent[] {
    return events.filter(e => e.impacteLesPrecedentes)
  }

  // Total minutes lost across all events
  totalMinutesPerdus(events: TimeEvent[]): number {
    return events.reduce((sum, e) => sum + e.dureeMinutesPerdues, 0)
  }

  // Total minutes gained
  totalMinutesGagnes(events: TimeEvent[]): number {
    return events.reduce((sum, e) => sum + e.dureeMinutesGagnees, 0)
  }

  private computeSeverity(minutesPerdus: number) {
    if (minutesPerdus === 0) return 'info' as const
    if (minutesPerdus < 30) return 'faible' as const
    if (minutesPerdus < 90) return 'modere' as const
    return 'severe' as const
  }

  private defaultTitle(type: PTEEventType): string {
    const titles: Record<PTEEventType, string> = {
      jour_ferie: 'Jour férié',
      vacances: 'Vacances scolaires',
      examen: 'Période d\'examen',
      journee_pedagogique: 'Journée pédagogique',
      absence_enseignant: 'Absence de l\'enseignant',
      cours_annule: 'Cours annulé',
      cours_prolonge: 'Cours prolongé',
      activite_speciale: 'Activité spéciale',
      retard_debut: 'Début de cours en retard',
      fin_anticipee: 'Fin de cours anticipée',
    }
    return titles[type]
  }
}

export const pteCalendarEngine = new PTECalendarEngine()
