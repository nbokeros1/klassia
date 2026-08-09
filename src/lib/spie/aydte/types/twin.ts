// SPIE-04 — Academic Year Digital Twin (AYDTE)
// The annual plan is NOT a document. It is a living object.
// Every modification can partially recalculate deadlines, sequences, lessons,
// activities, and evaluations — without rebuilding the entire year.

import type { PedagogicalContext } from '../../pce/types/context'
import type { NormalizedOutcome } from '../../curriculum/extraction/types'
import type { CurriculumPacingModel } from '../../curriculum/constraints/types'

// ─── Academic Year State ───────────────────────────────────────────────────────

export type AcademicYearStatus =
  | 'initialise'       // Just created
  | 'en_planification' // Teacher is planning
  | 'actif'            // School year in progress
  | 'suspendu'         // Temporarily paused (summer, etc.)
  | 'termine'          // Year completed

// ─── Sequence Block ───────────────────────────────────────────────────────────
// A thematic grouping of outcomes (a "unit of instruction")

export interface SequenceBlock {
  id: string
  titre: string
  description?: string
  outcomeIds: string[]        // Normalized outcome IDs from the curriculum
  semaineDébut?: number       // Week number in the school year (1-based)
  semainesFin?: number
  dureeEstimeeHeures: number
  dureeReelleHeures?: number  // Filled as the year progresses
  statut: 'planifiee' | 'en_cours' | 'terminee' | 'reportee'
  ordre: number
  // Links to generated lesson plans (by Lecon.id in the DB)
  leconIds: string[]
  // Links to generated quizzes
  quizIds: string[]
  // Impact flags (set when recalculation is needed)
  needsRecalculation: boolean
}

// ─── Annual Plan Node ─────────────────────────────────────────────────────────
// A "slot" in the annual calendar that links a sequence to a specific week range

export interface AnnualPlanNode {
  id: string
  sequenceId: string
  semaine: number             // Target week
  dureeMinutes: number        // Available time in this week
  confirme: boolean           // Teacher has confirmed this placement
  contraintes?: string[]      // Any constraint violations for this placement
}

// ─── AcademicYearTwin ─────────────────────────────────────────────────────────
// The living object representing a complete school year

export interface AcademicYearTwin {
  id: string

  // ── Identity ────────────────────────────────────────────────────────────────
  enseignantId: string
  classeId: string
  matiereId: string
  province?: string
  niveaux?: string[]
  academicYear: string          // '2025-2026'
  langue: 'fr' | 'en'

  // ── Curriculum link ──────────────────────────────────────────────────────────
  curriculumId: string
  outcomesTotal: number
  pacingModel?: CurriculumPacingModel

  // ── Calendar ─────────────────────────────────────────────────────────────────
  calendarId?: string
  totalSemaines: number         // School year total weeks (e.g. 38)
  totalMinutesDisponibles: number
  minutesParSemaine: number     // Average minutes/week for this subject

  // ── Sequences (the core of the annual plan) ──────────────────────────────────
  sequences: SequenceBlock[]

  // ── Calendar nodes (week allocations) ────────────────────────────────────────
  nodes: AnnualPlanNode[]

  // ── State ────────────────────────────────────────────────────────────────────
  statut: AcademicYearStatus
  coveragePercent: number        // % of curriculum outcomes covered
  pacingScore: number            // 0–100 — how well the pacing matches the year

  // ── Version control ───────────────────────────────────────────────────────────
  currentVersion: number
  lastModifiedAt: string
  createdAt: string

  // ── Context snapshot ─────────────────────────────────────────────────────────
  // The PedagogicalContext used to build this twin (snapshot, not live)
  contextSnapshot?: {
    contextId: string
    builtAt: string
    scoreGlobal: number
  }
}

// ─── Twin summary (for list views) ───────────────────────────────────────────

export interface AcademicYearTwinSummary {
  id: string
  classeId: string
  classeNom?: string
  matiereId: string
  academicYear: string
  statut: AcademicYearStatus
  coveragePercent: number
  nbSequences: number
  nbLecons: number
  currentVersion: number
  lastModifiedAt: string
}
