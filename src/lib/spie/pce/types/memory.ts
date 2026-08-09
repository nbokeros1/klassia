// SPIE-03 — PCE Context Memory
// Tracks the pedagogical state of a class over the year.

// ─── Memory entry ─────────────────────────────────────────────────────────────

export type MemoryEntryStatus =
  | 'enseigne'          // Taught and validated
  | 'enseigne_partiel'  // Taught but not fully covered
  | 'saute'             // Intentionally skipped
  | 'a_renforcer'       // Taught but needs review
  | 'en_retard'         // Not yet taught but past the planned date
  | 'planifie'          // Planned for a future session
  | 'non_planifie'      // In curriculum but not yet planned

export interface MemoryEntry {
  id: string
  outcomeId: string
  outcomeCode?: string
  outcomeTitre: string
  status: MemoryEntryStatus
  // When was this status last updated
  dateStatut: string
  // When was this outcome taught (if applicable)
  dateEnseignement?: string
  leconId?: string
  leconTitre?: string
  // Teacher notes
  commentaire?: string
  // Performance indicators
  scoresMoyen?: number         // 0–100 if assessed
  tauxEngagement?: number      // 0–100 if observed
}

// ─── Context Memory ──────────────────────────────────────────────────────────

export interface ContextMemory {
  classeId: string
  matiereId?: string
  academicYear: string         // e.g. '2025-2026'
  entries: MemoryEntry[]
  // Quick access views
  enseignes: string[]          // outcomeIds with status 'enseigne'
  aRenforcer: string[]         // outcomeIds needing review
  enRetard: string[]           // outcomeIds past their planned date
  sautes: string[]             // intentionally skipped
  restants: string[]           // not yet taught
  // Computed stats
  stats: ContextMemoryStats
  updatedAt: string
}

export interface ContextMemoryStats {
  total: number
  enseigne: number
  enseignePartiel: number
  aRenforcer: number
  saute: number
  enRetard: number
  planifie: number
  nonPlanifie: number
  // Progress 0–100%
  progressPercent: number
  // Are we on track with the planned pace?
  onTrack: boolean
  avanceRetardSemaines: number   // negative = behind
}

// ─── Memory event (for history/audit) ────────────────────────────────────────

export type MemoryEventType =
  | 'outcome_enseigne'
  | 'outcome_saute'
  | 'outcome_a_renforcer'
  | 'lecon_terminee'
  | 'evaluation_completee'
  | 'rythme_modifie'
  | 'curriculum_change'

export interface MemoryEvent {
  id: string
  type: MemoryEventType
  outcomeId?: string
  leconId?: string
  date: string
  auteur: string
  details?: Record<string, unknown>
}
