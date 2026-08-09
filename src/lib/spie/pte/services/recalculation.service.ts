// SPIE-06 — Recalculation Service

import type { TimeRecalculationTrigger, TimeRecalculationResult, TimeRecalculationTriggerType } from '../types/recalculation'
import type { SequenceBlock } from '../../aydte/types/twin'
import { recalculationEngine } from '../recalculation/recalculation-engine'

export class RecalculationService {
  // Recalculate after a lesson ran longer than planned
  onLeconProlongee(
    extraMinutes: number,
    leconId: string,
    leconTitre: string,
    sequences: SequenceBlock[],
    totalSemaines: number,
    minutesParSemaine: number,
    ancienCoveragePercent: number,
    outcomesTotal: number,
  ): TimeRecalculationResult {
    const trigger: TimeRecalculationTrigger = {
      type: 'lecon_prolongee',
      elementId: leconId,
      elementTitre: leconTitre,
      minutesImpactees: extraMinutes,
      date: new Date().toISOString().split('T')[0],
      cascadeToAnnualPlan: extraMinutes >= 30,
    }
    return recalculationEngine.recalculate(trigger, sequences, totalSemaines, minutesParSemaine, outcomesTotal, ancienCoveragePercent)
  }

  // Recalculate after a class was cancelled
  onCoursAnnule(
    minutesPerdues: number,
    sequences: SequenceBlock[],
    totalSemaines: number,
    minutesParSemaine: number,
    ancienCoveragePercent: number,
    outcomesTotal: number,
  ): TimeRecalculationResult {
    const trigger: TimeRecalculationTrigger = {
      type: 'cours_annule',
      minutesImpactees: minutesPerdues,
      date: new Date().toISOString().split('T')[0],
      cascadeToAnnualPlan: minutesPerdues >= 60,
    }
    return recalculationEngine.recalculate(trigger, sequences, totalSemaines, minutesParSemaine, outcomesTotal, ancienCoveragePercent)
  }

  // Recalculate after a generic trigger
  recalculate(
    type: TimeRecalculationTriggerType,
    minutesImpactees: number,
    sequences: SequenceBlock[],
    totalSemaines: number,
    minutesParSemaine: number,
    ancienCoveragePercent: number,
    outcomesTotal: number,
    elementId?: string,
  ): TimeRecalculationResult {
    const trigger: TimeRecalculationTrigger = {
      type,
      elementId,
      minutesImpactees,
      date: new Date().toISOString().split('T')[0],
      cascadeToAnnualPlan: minutesImpactees >= 30,
    }
    return recalculationEngine.recalculate(trigger, sequences, totalSemaines, minutesParSemaine, outcomesTotal, ancienCoveragePercent)
  }

  requiresCascade(result: TimeRecalculationResult): boolean {
    return result.sequencesDecalees.length > 0
  }

  hasOutOfBoundsSequences(result: TimeRecalculationResult): boolean {
    return result.nbSequencesHorsCalendrier > 0
  }
}

export const recalculationService = new RecalculationService()
