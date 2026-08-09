// SPIE-06 — Academic Time Service

import type { AcademicTime, AcademicTimeSummary, TimeSlot, TimeSlotStatus } from '../types/academic-time'
import type { TimeEvent } from '../types/calendar-event'
import { academicTimeBuilder, type AcademicTimeInput } from '../time/academic-time-builder'
import { pteCalendarEngine } from '../calendar/pte-calendar-engine'

export class AcademicTimeService {
  // Build a fresh AcademicTime model
  build(input: AcademicTimeInput, events: TimeEvent[] = []): AcademicTime {
    const perdu = pteCalendarEngine.totalMinutesPerdus(events)
    return academicTimeBuilder.build({ ...input, eventMinutesPerdus: perdu })
  }

  summarize(time: AcademicTime): AcademicTimeSummary {
    return academicTimeBuilder.summarize(time)
  }

  // Record that a class period happened
  recordSlot(
    time: AcademicTime,
    slotId: string,
    statut: TimeSlotStatus,
    dureeMinutesReelles?: number,
  ): AcademicTime {
    const updatedSemaines = time.semaines.map(week => ({
      ...week,
      slots: week.slots.map(slot => {
        if (slot.id !== slotId) return slot
        const reelles = dureeMinutesReelles ?? slot.dureeMinutesPlanifiees
        return {
          ...slot,
          statut,
          dureeMinutesReelles: reelles,
          minutesPerdues: statut === 'annule' ? slot.dureeMinutesPlanifiees : 0,
          minutesGagnees: statut === 'prolonge' ? Math.max(0, reelles - slot.dureeMinutesPlanifiees) : 0,
        }
      }),
    }))

    return { ...time, semaines: updatedSemaines, updatedAt: new Date().toISOString() }
  }

  // Get the time budget status label for display
  getStatusLabel(time: AcademicTime): string {
    const labels: Record<string, string> = {
      en_avance: 'En avance',
      dans_les_temps: 'Dans les temps',
      leger_retard: 'Léger retard',
      retard_modere: 'Retard modéré',
      retard_critique: 'Retard critique',
    }
    const avanceRetardSemaines = time.minutesParSemaine > 0
      ? time.avanceRetardMinutes / time.minutesParSemaine
      : 0
    const status = avanceRetardSemaines > 1 ? 'en_avance'
      : avanceRetardSemaines >= -1 ? 'dans_les_temps'
      : avanceRetardSemaines >= -2 ? 'leger_retard'
      : avanceRetardSemaines >= -4 ? 'retard_modere'
      : 'retard_critique'
    return labels[status] ?? 'Inconnu'
  }
}

export const academicTimeService = new AcademicTimeService()
