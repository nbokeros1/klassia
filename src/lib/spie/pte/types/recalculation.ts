// SPIE-06 — PTE Recalculation types
// Prefixed Time* to avoid collision with SPIE-04 RecalculationRequest/Result.

// ─── Trigger types ────────────────────────────────────────────────────────────

export type TimeRecalculationTriggerType =
  | 'lecon_prolongee'          // Lesson took longer than planned
  | 'lecon_raccourcie'         // Lesson shorter than planned
  | 'cours_annule'             // Class cancelled
  | 'absence_enseignant'       // Teacher absent
  | 'evaluation_ajoutee'       // Extra evaluation added
  | 'activite_ajoutee'         // Extra activity inserted
  | 'sequence_modifiee'        // Sequence duration changed
  | 'calendrier_modifie'       // School calendar changed

// ─── Recalculation trigger ────────────────────────────────────────────────────

export interface TimeRecalculationTrigger {
  type: TimeRecalculationTriggerType
  elementId?: string            // Which lesson/sequence/event
  elementTitre?: string
  minutesImpactees: number      // How many minutes were gained or lost
  date: string                  // When the event occurred
  cascadeToAnnualPlan: boolean  // Should this shift the entire plan?
}

// ─── Sequence shift ───────────────────────────────────────────────────────────

export interface SequenceShift {
  sequenceId: string
  sequenceTitre: string
  ancienneSemaineDebut?: number
  nouvelleSemaineDebut?: number
  ancienneSemaineFin?: number
  nouvelleSemaineFin?: number
  decalageSemaines: number      // Positive = shifted later
  heursPerdues: number          // How many hours of this sequence are now at risk
  estHorsCalendrier: boolean    // Falls outside the school year
}

// ─── Recalculation result ─────────────────────────────────────────────────────

export interface TimeRecalculationResult {
  id: string
  success: boolean
  trigger: TimeRecalculationTrigger

  // What changed
  sequencesDecalees: SequenceShift[]
  evaluationsDecalees: string[]        // Evaluation IDs now shifted
  nbSequencesHorsCalendrier: number    // Sequences that no longer fit

  // New coverage projection
  nouveauCoveragePercent: number
  ancienCoveragePercent: number
  coverageDelta: number                // positive = improved, negative = worsened

  // New pacing
  nouveauAvanceRetardSemaines: number

  avertissements: string[]
  calculatedAt: string
  durationMs: number
}
