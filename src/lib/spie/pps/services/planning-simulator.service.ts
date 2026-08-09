// SPIE-05 — Planning Simulator Service
// Entry point for triggering a simulation from application code.

import type { SimulationInput, PedagogicalSimulation } from '../types/simulation'
import type { AcademicYearTwin } from '../../aydte/types/twin'
import { planningSimulator } from '../simulator/planning-simulator'

export class PlanningSimulatorService {
  // Simulate from a full AcademicYearTwin
  simulateFromTwin(
    twin: AcademicYearTwin,
    minutesRestantes: number,
    semainesRestantes: number,
    curriculumOutcomesTotal: number,
  ): PedagogicalSimulation {
    const input: SimulationInput = {
      twinId: twin.id,
      enseignantId: twin.enseignantId,
      classeId: twin.classeId,
      academicYear: twin.academicYear,
      sequences: twin.sequences,
      totalSemaines: twin.totalSemaines,
      minutesParSemaine: twin.minutesParSemaine,
      semainesRestantes,
      minutesRestantes,
      curriculumOutcomesTotal,
    }
    return planningSimulator.simulate(input)
  }

  simulate(input: SimulationInput): PedagogicalSimulation {
    return planningSimulator.simulate(input)
  }

  // Can the teacher proceed to generation?
  canProceedToGeneration(simulation: PedagogicalSimulation): boolean {
    return simulation.statut !== 'irrealisable'
  }

  // Should a warning be shown before generation?
  hasWarnings(simulation: PedagogicalSimulation): boolean {
    return simulation.statut === 'realisable_risques' || simulation.statut === 'difficile'
  }
}

export const planningSimulatorService = new PlanningSimulatorService()
