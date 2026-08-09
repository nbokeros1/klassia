// SPIE-03 — PCE Context Sources
// Each source is independent and optional. The PCE fuses them into a single PedagogicalContext.
// All sources are province-agnostic.

import type { CurriculumGraph } from '../../curriculum/graph/types'
import type { CurriculumPacingModel } from '../../curriculum/constraints/types'
import type { NormalizedOutcome } from '../../curriculum/extraction/types'
import type { AcademicCalendar } from '../../types/calendar'

// ─── Individual context sources ───────────────────────────────────────────────

// Source 1 — Curriculum
export interface CurriculumContextSource {
  sourceType: 'curriculum'
  curriculumId: string
  province?: string
  matiere?: string
  niveaux?: string[]
  graph?: CurriculumGraph
  pacingModel?: CurriculumPacingModel
  outcomes?: NormalizedOutcome[]
  // How much of the curriculum has been covered (0–100%)
  coveragePercent?: number
  // Loaded at: ISO string
  loadedAt: string
}

// Source 2 — Calendar (school year + class schedule)
export interface CalendarContextSource {
  sourceType: 'calendar'
  calendar: AcademicCalendar
  // Available teaching sessions between now and end of year
  sessionsRestantes: number
  minutesRestantes: number
  prochaineSession?: {
    date: string
    dureeMinutes: number
  }
  loadedAt: string
}

// Source 3 — Teaching Progression
// What has actually been taught this year
export interface ProgressionContextSource {
  sourceType: 'progression'
  // Outcomes taught (by outcome ID)
  outcomesEnseignes: string[]
  // Outcomes skipped
  outcomesIgnores: string[]
  // Outcomes marked as "needs review"
  outcomesARenforcer: string[]
  // Outcomes planned but not yet taught
  outcomesRestants: string[]
  // Estimate of overall progression rate (ahead/behind)
  avanceRetardSemaines: number   // negative = behind, positive = ahead
  loadedAt: string
}

// Source 4 — Teaching History
// Recent lessons and their outcomes
export interface HistoriqueContextSource {
  sourceType: 'historique'
  dernieresLecons: HistoriqueLecon[]
  derniersQuiz: HistoriqueQuiz[]
  derniereEvaluation?: string     // ISO date
  loadedAt: string
}

export interface HistoriqueLecon {
  leconId: string
  titre: string
  date: string
  dureeMinutes: number
  outcomesCouverts: string[]
  // Teacher's own assessment of the lesson
  niveauEngagement?: 'faible' | 'moyen' | 'eleve'
  commentaire?: string
}

export interface HistoriqueQuiz {
  quizId: string
  titre: string
  date: string
  scoresMoyen?: number           // Class average 0–100
  outcomesEvalues: string[]
}

// Source 5 — Teacher Profile
export interface TeacherProfileContextSource {
  sourceType: 'teacher_profile'
  enseignantId: string
  langue: 'fr' | 'en'
  province?: string
  matieresPrincipales?: string[]
  // IA profile (from profil-ia page)
  styleEnseignement?: string
  preferencesDifferentiation?: string[]
  // Usage stats
  nbLeconsGenerees?: number
  forfait?: 'gratuit' | 'pro' | 'pro_plus' | 'institution'
  loadedAt: string
}

// Source 6 — Class Profile
export interface ClassProfileContextSource {
  sourceType: 'class_profile'
  classeId: string
  classeNom: string
  nbEleves: number
  niveauClasse?: string
  // Needs and differentiation context
  besoinsSpeciaux?: number      // number of students with IEPs
  anglophones?: number
  francophones?: number
  // Average engagement level (from recent lessons)
  engagementMoyen?: 'faible' | 'moyen' | 'eleve'
  loadedAt: string
}

// Source 7 — Available Resources
export interface ResourcesContextSource {
  sourceType: 'resources'
  // Document IDs from the class library that are relevant to the current context
  documentsRelevants: string[]
  // Available tools (quiz, sondage, etc.)
  outilsDisponibles: ('quiz' | 'sondage' | 'tablette' | 'labo' | 'projecteur')[]
  loadedAt: string
}

// Source 8 — Environmental Constraints
export interface ConstraintesContextSource {
  sourceType: 'contraintes'
  // Available time for next lesson
  tempsDisponibleMinutes?: number
  // Physical constraints
  locaux?: string
  materielDisponible?: string[]
  // Administrative constraints (report card deadlines, etc.)
  prochaineEcheance?: string   // ISO date
  descriptionEcheance?: string
  loadedAt: string
}

// Source 9 — Provincial Standards
export interface StandardsContextSource {
  sourceType: 'standards'
  province?: string
  standardsIds?: string[]         // Professional standard IDs for TQS validation
  loadedAt: string
}

// ─── Union type ────────────────────────────────────────────────────────────────

export type ContextSource =
  | CurriculumContextSource
  | CalendarContextSource
  | ProgressionContextSource
  | HistoriqueContextSource
  | TeacherProfileContextSource
  | ClassProfileContextSource
  | ResourcesContextSource
  | ConstraintesContextSource
  | StandardsContextSource

export type ContextSourceType = ContextSource['sourceType']

// ─── Context Sources Map ─────────────────────────────────────────────────────

export interface ContextSourcesMap {
  curriculum?: CurriculumContextSource
  calendar?: CalendarContextSource
  progression?: ProgressionContextSource
  historique?: HistoriqueContextSource
  teacher_profile?: TeacherProfileContextSource
  class_profile?: ClassProfileContextSource
  resources?: ResourcesContextSource
  contraintes?: ConstraintesContextSource
  standards?: StandardsContextSource
}
