// SPIE-06 — AcademicClock types
// The clock tells us where the class really is at any given moment.

// ─── Clock status ─────────────────────────────────────────────────────────────

export type ClockStatus =
  | 'en_avance'          // > 1 week ahead
  | 'dans_les_temps'     // ±1 week of plan
  | 'leger_retard'       // 1–2 weeks behind
  | 'retard_modere'      // 2–4 weeks behind
  | 'retard_critique'    // > 4 weeks behind — immediate action required

// ─── Clock Snapshot ───────────────────────────────────────────────────────────
// A point-in-time reading of where the class is

export interface ClockSnapshot {
  capturedAt: string            // ISO timestamp

  // Position in school year
  weekNumber: number
  semainesRestantes: number
  joursRestants: number

  // Time account
  minutesConsommees: number
  minutesPerdues: number
  minutesRestantes: number
  minutesTampon: number

  // Curriculum progress
  sequenceEnCours?: string      // Current sequence ID
  sequenceEnCoursTitre?: string
  outcomesCouverts: number
  outcomesTotal: number
  coveragePercent: number

  // Advance / delay
  avanceRetardMinutes: number   // positive = ahead
  avanceRetardSemaines: number  // converted (decimal)
  statut: ClockStatus

  // Running trend (computed from last 3 snapshots)
  tendancePace: 'amelioration' | 'stable' | 'degradation' | 'insuffisant_donnees'
}

// ─── Academic Clock ───────────────────────────────────────────────────────────
// The live clock object — updated each time a class period is recorded

export interface AcademicClock {
  id: string
  classeId: string
  matiereId: string
  enseignantId: string
  academicYear: string

  // Current snapshot (most recent)
  snapshot: ClockSnapshot

  // History (up to last 10 snapshots for trend analysis)
  historique: ClockSnapshot[]

  // Messages for the teacher
  alertes: string[]
  messageActuel: string          // One-line status for the UI
}
