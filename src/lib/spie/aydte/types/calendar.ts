// SPIE-04 — Calendar Engine types
// Models the school calendar: weeks, days, teaching sessions, breaks, holidays.
// Province-agnostic architecture. Provincial calendars are data, not code.

// ─── Day types ────────────────────────────────────────────────────────────────

export type DayType =
  | 'cours'               // Normal school day with teaching
  | 'journee_ped'         // Pedagogical day (no students)
  | 'conge'               // School holiday
  | 'ferie'               // Statutory holiday
  | 'examen'              // Exam period
  | 'sortie'              // Field trip
  | 'interruption'        // Interruption (e.g., weather)
  | 'weekend'

// ─── Teaching session ─────────────────────────────────────────────────────────
// A single teaching period (e.g. one 60-min period on a given day)

export interface TeachingSession {
  id: string
  date: string                    // ISO date 'YYYY-MM-DD'
  dureeMinutes: number
  sequenceId?: string             // Which sequence this session is allocated to
  confirme: boolean
  notes?: string
}

// ─── Calendar Day ─────────────────────────────────────────────────────────────

export interface CalendarDay {
  date: string                    // 'YYYY-MM-DD'
  type: DayType
  // Teaching sessions on this day (for this subject)
  sessions: TeachingSession[]
  // Notes (e.g. "conférence de parents")
  notes?: string
}

// ─── Calendar Week ────────────────────────────────────────────────────────────

export interface CalendarWeek {
  weekNumber: number              // 1-based week in the school year
  startDate: string              // Monday date
  endDate: string                // Friday date
  days: CalendarDay[]
  // Total available teaching minutes this week
  minutesDisponibles: number
  // Is this week part of the school year?
  actif: boolean
  // Term/semester
  termeId?: string
}

// ─── School Term ──────────────────────────────────────────────────────────────
// Named TwinTerm to avoid collision with SPIE-01 SchoolTerm / TermType

export type TwinTermType = 'semestre' | 'trimestre' | 'quadrimestre' | 'annee'

export interface TwinSchoolTerm {
  id: string
  type: TwinTermType
  nom: string                    // 'Semestre 1', 'Trimestre 2', etc.
  startDate: string
  endDate: string
  weekNumbers: number[]          // Which weeks belong to this term
  minutesTotal: number
}

// ─── School Calendar ──────────────────────────────────────────────────────────

export interface SchoolCalendar {
  id: string
  classeId?: string
  province?: string
  academicYear: string          // '2025-2026'
  startDate: string             // First day of school
  endDate: string               // Last day of school
  termes: TwinSchoolTerm[]
  semaines: CalendarWeek[]
  // Statutory holidays and breaks
  joursConge: string[]          // ISO dates
  // Subject-specific settings
  sujetMinutesParSemaine?: Record<string, number>  // { math: 200, science: 150 }
  createdAt: string
  updatedAt: string
}

// ─── Calendar stats ───────────────────────────────────────────────────────────

export interface CalendarStats {
  totalSemaines: number
  semainesActives: number
  totalMinutesDisponibles: number
  minutesParSemaineEnMoyenne: number
  sessionsTotales: number
  prochaineSemaine?: number
  semainesRestantes: number
  minutesRestantes: number
}
