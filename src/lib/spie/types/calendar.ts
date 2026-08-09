// SPIE — Academic Calendar domain objects
// Used by LCE to constrain and calibrate the Annual Plan.

// ─── Calendar Event ───────────────────────────────────────────────────────────

export type CalendarEventType =
  | 'ferie'             // Statutory holiday
  | 'pedagogique'       // PD day (no students)
  | 'exam_provincial'   // Provincial exam period
  | 'remise_bulletins'  // Report cards
  | 'conge_scolaire'    // School break (March break, Christmas, etc.)
  | 'evenement_ecole'   // School event
  | 'debut_trimestre'   // Trimester start
  | 'fin_trimestre'     // Trimester end
  | 'autre'

export interface CalendarEvent {
  id: string
  calendarId: string
  type: CalendarEventType
  titre: string
  description?: string
  dateDebut: string             // ISO date
  dateFin?: string              // ISO date (same as dateDebut for single days)
  // Does this event reduce available teaching days?
  impactEneignement: boolean
  // How many teaching days are lost?
  joursPerdu: number
  classeIds?: string[]          // null = all classes
  affecteEleves: boolean
  affecteEnseignants: boolean
}

// ─── School Term ──────────────────────────────────────────────────────────────

export type TermType = 'trimestre' | 'semestre' | 'quadrimestre' | 'annuel'

export interface SchoolTerm {
  id: string
  calendarId: string
  nom: string                   // "Trimestre 1", "Semestre A", etc.
  type: TermType
  ordre: number                 // 1, 2, 3
  dateDebut: string
  dateFin: string
  joursCours: number            // Available teaching days in this term
  semainesCours: number         // Available teaching weeks
}

// ─── Academic Calendar ────────────────────────────────────────────────────────
// The full calendar for a school year, used by LCE to plan accurately.

export interface AcademicCalendarMeta {
  totalJoursCours: number       // Total teaching days in the year
  totalSemainesCours: number    // Total teaching weeks
  joursFeries: number           // Total statutory holidays
  joursPedagogiques: number     // Total PD days
}

export interface AcademicCalendar {
  id: string
  provinceCode: string
  authorityId?: string          // null = provincial default
  anneeScolaire: string         // "2026-2027"
  langue: 'fr' | 'en'
  dateDebutAnnee: string        // ISO date (first day of school)
  dateFinAnnee: string          // ISO date (last day of school)
  termes: SchoolTerm[]
  evenements: CalendarEvent[]
  meta: AcademicCalendarMeta
  // Has the teacher customized this calendar?
  personnalise: boolean
  enseignantId?: string
  classeIds?: string[]
  statut: 'actif' | 'archive'
  createdAt: string
  updatedAt: string
}

// ─── Week Availability ────────────────────────────────────────────────────────
// Used by PGE to distribute sequences across available weeks.

export interface WeekAvailability {
  semaine: number               // Week number in the school year
  dateDebut: string
  dateFin: string
  joursDisponibles: number      // 0–5
  estDisponible: boolean        // false if less than 2 days available
  terme?: string                // Which term this week belongs to
  evenements?: string[]         // Event IDs this week
}
