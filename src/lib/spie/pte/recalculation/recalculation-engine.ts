// SPIE-06 — PTE Recalculation Engine
// Cascading recalculation when real time deviates from plan.
// When a lesson runs long → sequences shift → coverage may drop.

import type {
  TimeRecalculationTrigger,
  TimeRecalculationResult,
  SequenceShift,
} from '../types/recalculation'
import type { SequenceBlock } from '../../aydte/types/twin'

let recalcCounter = 0

// ─── Recalculation Engine ─────────────────────────────────────────────────────

export class RecalculationEngine {
  // Main recalculation: given a trigger and the current sequences, compute shifts
  recalculate(
    trigger: TimeRecalculationTrigger,
    sequences: SequenceBlock[],
    totalSemaines: number,
    minutesParSemaine: number,
    curriculumOutcomesTotal: number,
    ancienCoveragePercent: number,
  ): TimeRecalculationResult {
    const startMs = Date.now()
    const avertissements: string[] = []

    if (!trigger.cascadeToAnnualPlan || trigger.minutesImpactees === 0) {
      return {
        id: `recalc_${++recalcCounter}`,
        success: true,
        trigger,
        sequencesDecalees: [],
        evaluationsDecalees: [],
        nbSequencesHorsCalendrier: 0,
        nouveauCoveragePercent: ancienCoveragePercent,
        ancienCoveragePercent,
        coverageDelta: 0,
        nouveauAvanceRetardSemaines: 0,
        avertissements: ['Aucun recalcul nécessaire — impact non cumulable.'],
        calculatedAt: new Date().toISOString(),
        durationMs: Date.now() - startMs,
      }
    }

    // How many extra weeks does this delay represent?
    const decalageSemaines = minutesParSemaine > 0
      ? trigger.minutesImpactees / minutesParSemaine
      : 0

    // Find the affected sequence and all subsequent ones
    const affectedSequenceId = trigger.elementId
    const affectedIndex = affectedSequenceId
      ? sequences.findIndex(s => s.id === affectedSequenceId)
      : sequences.findIndex(s => s.statut === 'en_cours')

    const startIndex = Math.max(0, affectedIndex)

    const sequencesDecalees: SequenceShift[] = []
    let nbHorsCalendrier = 0

    for (let i = startIndex; i < sequences.length; i++) {
      const seq = sequences[i]
      if (seq.semaineDébut === undefined) continue

      const ancienneDebut = seq.semaineDébut
      const ancienneFin = seq.semainesFin ?? ancienneDebut
      const nouvelleDebut = Math.ceil(ancienneDebut + decalageSemaines)
      const nouvelleFin = Math.ceil(ancienneFin + decalageSemaines)
      const estHorsCalendrier = nouvelleFin > totalSemaines

      if (estHorsCalendrier) nbHorsCalendrier++

      const heursPerdues = estHorsCalendrier
        ? seq.dureeEstimeeHeures * ((nouvelleFin - totalSemaines) / Math.max(1, nouvelleFin - nouvelleDebut + 1))
        : 0

      sequencesDecalees.push({
        sequenceId: seq.id,
        sequenceTitre: seq.titre,
        ancienneSemaineDebut: ancienneDebut,
        nouvelleSemaineDebut: nouvelleDebut,
        ancienneSemaineFin: ancienneFin,
        nouvelleSemaineFin: nouvelleFin,
        decalageSemaines: Math.ceil(decalageSemaines),
        heursPerdues: Math.round(heursPerdues * 10) / 10,
        estHorsCalendrier,
      })
    }

    // Recalculate coverage
    const outcomesHorsCalendrier = sequencesDecalees
      .filter(s => s.estHorsCalendrier)
      .reduce((sum, shift) => {
        const seq = sequences.find(s => s.id === shift.sequenceId)
        return sum + (seq?.outcomeIds.length ?? 0)
      }, 0)

    const nouveauCoveragePercent = curriculumOutcomesTotal > 0
      ? Math.max(0, Math.round(ancienCoveragePercent - (outcomesHorsCalendrier / curriculumOutcomesTotal) * 100))
      : ancienCoveragePercent

    if (nbHorsCalendrier > 0) {
      avertissements.push(`${nbHorsCalendrier} séquence(s) tombent en dehors du calendrier scolaire — leur contenu risque de ne pas être enseigné.`)
    }
    if (decalageSemaines > 2) {
      avertissements.push(`Décalage de ${Math.round(decalageSemaines * 10) / 10} semaine(s) — révision du plan annuel recommandée.`)
    }

    return {
      id: `recalc_${++recalcCounter}`,
      success: true,
      trigger,
      sequencesDecalees,
      evaluationsDecalees: [],    // Filled by higher-level service when evaluations are tracked
      nbSequencesHorsCalendrier: nbHorsCalendrier,
      nouveauCoveragePercent,
      ancienCoveragePercent,
      coverageDelta: nouveauCoveragePercent - ancienCoveragePercent,
      nouveauAvanceRetardSemaines: -Math.round(decalageSemaines * 10) / 10,
      avertissements,
      calculatedAt: new Date().toISOString(),
      durationMs: Date.now() - startMs,
    }
  }

  // Quick check: does this trigger require a full cascade recalculation?
  requiresCascade(trigger: TimeRecalculationTrigger): boolean {
    return trigger.cascadeToAnnualPlan && trigger.minutesImpactees >= 30
  }

  // Convert minutes impact to week delay
  minutesToWeekDelay(minutesImpact: number, minutesParSemaine: number): number {
    return minutesParSemaine > 0 ? minutesImpact / minutesParSemaine : 0
  }
}

export const recalculationEngine = new RecalculationEngine()
