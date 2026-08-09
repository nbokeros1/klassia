// SPIE-04 — Pacing Engine types
// Models the pace of instruction: estimated vs real time, advance/delay, margins.

// ─── Pace status ─────────────────────────────────────────────────────────────

export type PaceStatus =
  | 'en_avance'          // More than 1 week ahead of schedule
  | 'dans_les_temps'     // Within ±1 week of schedule
  | 'leger_retard'       // 1–2 weeks behind
  | 'retard_modere'      // 2–4 weeks behind
  | 'retard_critique'    // More than 4 weeks behind

// ─── Sequence pacing ─────────────────────────────────────────────────────────

export interface SequencePacing {
  sequenceId: string
  sequenceTitre: string
  // Planned timeline
  semainePrevueDébut: number
  semainePrevueFin: number
  heuresPrevues: number
  // Actual timeline (filled as year progresses)
  semaineReelleDébut?: number
  semaineReelleFin?: number
  heuresReelles?: number
  // Status
  statut: 'non_commencee' | 'en_cours' | 'terminee' | 'en_retard'
  avanceRetardSemaines: number   // negative = behind
  // Buffer time (slack after this sequence before the next)
  bufferSemaines: number
}

// ─── Annual pacing model ──────────────────────────────────────────────────────

export interface AnnualPacingModel {
  twinId: string
  academicYear: string
  // Current week (auto-calculated)
  semaineActuelle: number
  semainesRestantes: number
  minutesRestantes: number
  // Per-sequence pacing
  sequences: SequencePacing[]
  // Global status
  statutGlobal: PaceStatus
  avanceRetardSemainesGlobal: number
  // Coverage: how much curriculum can we realistically cover by year end?
  coverageAttenduePercent: number
  coverageActuellePercent: number
  // Buffer (spare time remaining in the year)
  bufferSemainesRestant: number
  // Recommendations
  recommandations: string[]
  calculatedAt: string
}

// ─── Pacing adjustment ────────────────────────────────────────────────────────
// When the teacher needs to change the pacing

export type AdjustmentType =
  | 'compresser'          // Compress sequences to save time
  | 'etendre'             // Extend sequences (more time available)
  | 'reordonner'          // Reorder sequences
  | 'supprimer'           // Remove a sequence (skip content)
  | 'fusionner'           // Merge two sequences
  | 'ajouter'             // Add a new sequence

export interface PacingAdjustment {
  type: AdjustmentType
  sequenceIds: string[]
  raison: string
  impact: PacingImpact
}

export interface PacingImpact {
  heuresSauvegardees: number
  coverageChangement: number     // +/- percent
  sequencesAffectees: string[]
  avertissements: string[]
}
