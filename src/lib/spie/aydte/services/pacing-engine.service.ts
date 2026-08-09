// SPIE-04 — Pacing Engine Service
// Provides high-level pacing operations on a twin.

import type { AnnualPacingModel, PacingAdjustment, PacingImpact } from '../types/pacing'
import type { AcademicYearTwin } from '../types/twin'
import type { SchoolCalendar } from '../types/calendar'
import { pacingEngine } from '../pacing/pacing-engine'

export class PacingEngineService {
  buildModel(twin: AcademicYearTwin, calendar: SchoolCalendar): AnnualPacingModel {
    return pacingEngine.buildPacingModel(
      twin.id,
      twin.academicYear,
      twin.sequences,
      calendar,
      twin.minutesParSemaine,
    )
  }

  simulateAdjustment(
    adjustment: PacingAdjustment,
    twin: AcademicYearTwin,
  ): PacingImpact {
    return pacingEngine.simulateAdjustment(
      adjustment,
      twin.sequences,
      twin.totalMinutesDisponibles,
      twin.minutesParSemaine,
    )
  }

  getStatusLabel(twin: AcademicYearTwin, calendar: SchoolCalendar): string {
    const model = this.buildModel(twin, calendar)
    const labels: Record<string, string> = {
      en_avance: 'En avance sur le programme',
      dans_les_temps: 'Dans les temps',
      leger_retard: 'Léger retard',
      retard_modere: 'Retard modéré',
      retard_critique: 'Retard critique',
    }
    return labels[model.statutGlobal] ?? 'Statut inconnu'
  }
}

export const pacingEngineService = new PacingEngineService()
