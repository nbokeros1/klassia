// SPIE-06 — Academic Clock Service

import type { AcademicClock, ClockSnapshot } from '../types/clock'
import type { AcademicTime } from '../types/academic-time'
import type { SequenceBlock } from '../../aydte/types/twin'
import { academicClockBuilder } from '../clock/academic-clock'

export class AcademicClockService {
  build(params: {
    classeId: string
    matiereId: string
    enseignantId: string
    academicYear: string
    academicTime: AcademicTime
    sequences: SequenceBlock[]
    outcomesTotal: number
    historique?: ClockSnapshot[]
  }): AcademicClock {
    return academicClockBuilder.build(params)
  }

  // Refresh the clock (add a new snapshot)
  refresh(clock: AcademicClock, academicTime: AcademicTime, sequences: SequenceBlock[], outcomesTotal: number): AcademicClock {
    return academicClockBuilder.build({
      classeId: clock.classeId,
      matiereId: clock.matiereId,
      enseignantId: clock.enseignantId,
      academicYear: clock.academicYear,
      academicTime,
      sequences,
      outcomesTotal,
      historique: clock.historique,
    })
  }

  isOnTrack(clock: AcademicClock): boolean {
    return clock.snapshot.statut === 'en_avance' || clock.snapshot.statut === 'dans_les_temps'
  }

  isAtRisk(clock: AcademicClock): boolean {
    return clock.snapshot.statut === 'retard_modere' || clock.snapshot.statut === 'retard_critique'
  }

  hasActiveAlertes(clock: AcademicClock): boolean {
    return clock.alertes.length > 0
  }
}

export const academicClockService = new AcademicClockService()
