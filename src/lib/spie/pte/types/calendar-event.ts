// SPIE-06 — PTE Calendar Event types
// Runtime events that change the available teaching time.
// Prefixed PTE* to avoid collision with SPIE-01 CalendarEvent / CalendarEventType.

// ─── Event type ───────────────────────────────────────────────────────────────

export type PTEEventType =
  | 'jour_ferie'            // Statutory holiday (planned)
  | 'vacances'              // School break (planned)
  | 'examen'                // Exam period (affects teaching time)
  | 'journee_pedagogique'   // PD day — teacher only, no students
  | 'absence_enseignant'    // Teacher absent (unexpected)
  | 'cours_annule'          // Single class cancelled (any reason)
  | 'cours_prolonge'        // Class extended (positive — time gained)
  | 'activite_speciale'     // Special school event (field trip, etc.)
  | 'retard_debut'          // Class started late
  | 'fin_anticipee'         // Class ended early

// ─── Event severity ───────────────────────────────────────────────────────────

export type PTEEventSeverity = 'info' | 'faible' | 'modere' | 'severe'

// ─── Time Event ───────────────────────────────────────────────────────────────

export interface TimeEvent {
  id: string
  classeId: string
  matiereId?: string             // undefined = affects all subjects
  type: PTEEventType
  date: string                   // YYYY-MM-DD (or start date if multi-day)
  dateFin?: string               // For multi-day events (vacances, exams)
  dureeMinutesPerdues: number    // Teaching minutes lost (0 for cours_prolonge)
  dureeMinutesGagnees: number    // Teaching minutes gained (for cours_prolonge only)
  titre: string
  description?: string
  source: 'planifie' | 'runtime' // Was this expected or a surprise?
  severity: PTEEventSeverity
  impacteLesPrecedentes: boolean // Does this shift subsequent sequences?
  sequencesAffectees?: string[]
}

// ─── Calendar Delta ───────────────────────────────────────────────────────────
// The net change in available time from a batch of events

export interface CalendarDelta {
  periodeDebut: string
  periodeFin: string
  minutesPerdues: number
  minutesGagnees: number
  netMinutes: number             // minutesGagnees - minutesPerdues
  eventsAppliques: string[]      // TimeEvent IDs
  semainesTouchees: number[]
}
