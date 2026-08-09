// SPIE-04 — Versioning types
// Every change to the AcademicYearTwin creates a version.

// ─── Change types ─────────────────────────────────────────────────────────────

export type ChangeType =
  | 'creation'                  // Twin first created
  | 'sequence_ajoutee'          // New sequence added
  | 'sequence_modifiee'         // Sequence updated
  | 'sequence_supprimee'        // Sequence removed
  | 'sequence_reordonnee'       // Sequences reordered
  | 'statut_sequence_change'    // Sequence status changed (e.g. planifiee → en_cours)
  | 'lecon_ajoutee'             // Lesson added to a sequence
  | 'lecon_modifiee'            // Lesson modified
  | 'calendrier_modifie'        // Calendar updated
  | 'curriculum_change'         // Underlying curriculum changed
  | 'progression_update'        // Progression updated (lesson marked done)
  | 'restauration'              // Restored from a previous version

// ─── Version ─────────────────────────────────────────────────────────────────

export interface TwinVersion {
  id: string
  twinId: string
  version: number
  changeType: ChangeType
  auteur: string             // enseignantId
  date: string               // ISO timestamp
  motif?: string             // Why this change was made
  // What changed (diff — stored as JSON for now)
  diff: VersionDiff
  // Snapshot of the twin at this version
  snapshot: TwinSnapshot
}

export interface VersionDiff {
  // Fields that changed at the top level
  champsModifies: string[]
  // Sequences that were added/modified/removed
  sequencesAjoutees?: string[]
  sequencesModifiees?: string[]
  sequencesSupprimees?: string[]
  // Summary for display
  resume: string
}

export interface TwinSnapshot {
  // Compact representation of the twin state at this version
  statut: string
  nbSequences: number
  nbLecons: number
  coveragePercent: number
  pacingScore: number
  totalHeuresPlanifiees: number
}

// ─── Version history ──────────────────────────────────────────────────────────

export interface TwinVersionHistory {
  twinId: string
  currentVersion: number
  versions: TwinVersion[]
  // Quick access
  firstVersion?: TwinVersion
  lastVersion?: TwinVersion
}

// ─── Version query ────────────────────────────────────────────────────────────

export interface VersionQuery {
  twinId: string
  fromVersion?: number
  toVersion?: number
  changeType?: ChangeType
  limit?: number
}
