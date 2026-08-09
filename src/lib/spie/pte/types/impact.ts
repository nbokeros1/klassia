// SPIE-06 — Time Impact types
// Measures the pedagogical impact of time deviations.

// ─── Impact type ──────────────────────────────────────────────────────────────

export type TimeImpactType =
  | 'absence_enseignant'         // Teacher absent
  | 'cours_annule'               // Class cancelled
  | 'lecon_prolongee'            // Lesson took more time than planned
  | 'activite_supplementaire'    // New activity inserted
  | 'evaluation_supplementaire'  // Extra evaluation
  | 'retard_global'              // Cumulative delay

// ─── Impact severity ──────────────────────────────────────────────────────────

export type TimeImpactSeverity = 'negligeable' | 'faible' | 'modere' | 'severe' | 'critique'

// ─── Time Impact ─────────────────────────────────────────────────────────────

export interface TimeImpact {
  id: string
  type: TimeImpactType
  severity: TimeImpactSeverity

  // Time lost or consumed
  minutesPerdues: number
  minutesDecalageCumul: number    // Running total of cumulative delay
  semainesDecalageCumul: number   // Converted to weeks (decimal)

  // What is affected
  sequencesDecalees: string[]
  evaluationsDecalees: string[]
  coverageRiskPercent: number     // % of curriculum now at risk

  // Human-readable
  titre: string
  messageEnseignant: string       // Actionable for the teacher

  calculatedAt: string
}
