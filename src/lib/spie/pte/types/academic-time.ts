// SPIE-06 — Academic Time model
// AcademicTime is the main time accounting object for a subject/class/year.
// Time is the teacher's primary resource — ScorgIA tracks it at every granularity.

// ─── Granularity ──────────────────────────────────────────────────────────────

export type TimeGranularity = 'annee' | 'trimestre' | 'mois' | 'semaine' | 'jour' | 'cours'

// ─── Time Budget ──────────────────────────────────────────────────────────────
// Used at every level (year, trimester, month, week)

export interface TimeBudget {
  totalMinutes: number          // Planned teaching minutes
  consommeMinutes: number       // Actually used
  perduMinutes: number          // Lost (absences, cancellations)
  restantMinutes: number        // totalMinutes - consommeMinutes - perduMinutes
  tamponMinutes: number         // Safety margin reserved (typically 10% of total)
  tauxConsommation: number      // consommeMinutes / totalMinutes × 100
  tauxPerte: number             // perduMinutes / totalMinutes × 100
}

// ─── TimeSlot ─────────────────────────────────────────────────────────────────
// A single teaching period (une période de cours)

export type TimeSlotStatus =
  | 'planifie'     // Planned but not yet happened
  | 'realise'      // Taught as planned
  | 'prolonge'     // Ran longer than planned
  | 'raccourci'    // Ended early
  | 'annule'       // Cancelled
  | 'reporte'      // Moved to another date

export interface TimeSlot {
  id: string
  date: string                  // YYYY-MM-DD
  heureDebut?: string           // HH:mm
  heureFin?: string
  dureeMinutesPlanifiees: number
  dureeMinutesReelles?: number  // Filled after the class
  statut: TimeSlotStatus
  sequenceId?: string
  leconId?: string
  minutesPerdues: number        // dureeMinutesPlanifiees - dureeMinutesReelles (if cancelled/short)
  minutesGagnees: number        // If prolonged
  notes?: string
}

// ─── Week time ────────────────────────────────────────────────────────────────

export interface WeekTime {
  weekNumber: number            // 1-based in school year
  startDate: string
  endDate: string
  budget: TimeBudget
  slots: TimeSlot[]
}

// ─── Month time ───────────────────────────────────────────────────────────────

export interface MonthTime {
  mois: number                  // 1–12
  annee: number
  label: string                 // 'Septembre 2025'
  budget: TimeBudget
}

// ─── Trimester time ───────────────────────────────────────────────────────────

export interface TrimesterTime {
  trimestre: number             // 1, 2, or 3
  startDate: string
  endDate: string
  label: string                 // 'Trimestre 1'
  budget: TimeBudget
}

// ─── AcademicTime (main model) ────────────────────────────────────────────────

export interface AcademicTime {
  id: string
  classeId: string
  matiereId: string
  enseignantId: string
  academicYear: string          // '2025-2026'
  minutesParSemaine: number

  // Annual budget (top-level aggregate)
  annee: TimeBudget

  // Hierarchical breakdown
  trimestres: TrimesterTime[]
  mois: MonthTime[]
  semaines: WeekTime[]

  // Real-time state
  periodeActuelle?: TimeSlot

  // Derived metrics
  avanceRetardMinutes: number   // >0 = ahead, <0 = behind
  pacingRatio: number           // realConsomme / plannedConsomme (1.0 = on track)

  updatedAt: string
}

// ─── AcademicTime summary ─────────────────────────────────────────────────────

export interface AcademicTimeSummary {
  classeId: string
  matiereId: string
  academicYear: string
  totalMinutesBudget: number
  minutesConsommees: number
  minutesPerdues: number
  minutesRestantes: number
  minutesTampon: number
  tauxConsommation: number
  tauxPerte: number
  avanceRetardMinutes: number
  avanceRetardSemaines: number
}
