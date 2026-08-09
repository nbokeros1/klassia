// SPIE — Planning domain objects
// AnnualPlan → SequencePlan → LessonPlan → LessonActivity
//
// These are the DOMAIN MODEL objects. They map to (but are distinct from)
// the database persistence types in src/lib/types/database.ts:
//   AnnualPlan → ProgrammeAnnuel
//   SequencePlan → Unite (within ContenuProgramme)
//   LessonPlan → Lecon + ContenuLecon
//
// The SPIE domain model is richer and province-agnostic.
// The persistence layer in database.ts handles storage.

import type { StatutLecon } from '@/lib/types/database'
import type { BloomLevel } from './outcomes'

// ─── Differentiation Plan ──────────────────────────────────────────────────────
// Province-agnostic differentiation model (maps to UCS, UDL, PEI, etc.)

export interface DifferentiationPlan {
  // Universal / Tier 1 (all students)
  universel?: string
  // Targeted / Tier 2 (some students)
  cible?: string
  // Specialized / Tier 3 (individual students, IEP)
  specialise?: string
  // Additional notes (accommodements, modifications, PEI)
  notes?: string
  // Student groups targeted
  groupesCibles?: string[]
}

// ─── Evaluation Plan ───────────────────────────────────────────────────────────

export interface EvaluationPlan {
  formative?: string              // During-learning assessment
  sommative?: string              // End-of-learning assessment
  criteres?: string[]             // Success criteria / criteria
  outilsEvaluation?: string[]    // Tools used: rubric, checklist, etc.
  billetSortie?: string          // Exit ticket
}

// ─── Lesson Activity ───────────────────────────────────────────────────────────

export type ActivityPhase = 'avant' | 'pendant' | 'apres'
export type ActivityType =
  | 'amorce' | 'modelisation' | 'pratique_guidee' | 'pratique_autonome'
  | 'jeu' | 'discussion' | 'evaluation' | 'synthese' | 'devoir'
  | 'projet' | 'laboratoire' | 'lecture' | 'autre'

export interface LessonActivity {
  id: string
  lessonId: string
  phase: ActivityPhase
  type: ActivityType
  titre: string
  description: string
  duree_minutes?: number
  materiel?: string[]
  consignes?: string[]
  outcomesSpecifiquesIds?: string[]
  differentation?: DifferentiationPlan
  ordreAffichage: number
}

// ─── Lesson Plan ───────────────────────────────────────────────────────────────
// The full lesson plan, tied to a province template and curriculum outcomes.

export type LessonGenerationSource = 'ia' | 'manuel' | 'import' | 'gabarit'

export interface LessonPlanHeader {
  nomEnseignant?: string
  niveau: string
  matiere: string
  duree_minutes: number
  numero?: number                   // Lesson number in the sequence
  titre: string
  datePrevu?: string                // ISO date
  langue: 'fr' | 'en'
}

export interface LessonPlanContent {
  intention?: string                // Pedagogical intention / learning intention
  // Provincial outcome codes
  rag?: string                      // Alberta/SK: Résultat Apprentissage Général
  ras?: string                      // Alberta/SK: Résultat Apprentissage Spécifique
  rat?: string                      // SK: Résultat Apprentissage Transdisciplinaire
  attentes_curriculum?: string      // Ontario: Overall/Specific Expectations
  competences_disciplinaires?: string[] // Quebec: CD
  competences_transversales?: string[]  // Quebec: CT
  big_ideas?: string                // BC: Big Ideas
  // Outcome IDs in the knowledge graph
  outcomesSpecifiquesIds?: string[]
  // Language integration
  integrationLangue?: {
    vocabulaire?: string
    oral?: string
    ecrit?: string
    visuel?: string
  }
  // Evaluation
  evaluation?: EvaluationPlan
  // Indigenous perspective
  perspectiveAutochtone?: string
  // Differentiation
  differentiation?: DifferentiationPlan
  // The 3 phases
  avant?: {
    duree_minutes?: number
    amorce?: string
    connexion?: string               // Prior knowledge activation
    materiel?: string[]
  }
  pendant?: {
    duree_minutes?: number
    modelisation?: string
    pratique_guidee?: string
    pratique_autonome?: string
    materiel?: string[]
  }
  apres?: {
    duree_minutes?: number
    retour?: string
    billetSortie?: string
    materiel?: string[]
  }
  // Activities (structured)
  activites?: LessonActivity[]
  // Resources
  ressources?: string[]
  notesEnseignant?: string
  // SVG schemas generated
  schemasSvg?: string[]
}

export interface LessonPlan {
  id: string
  sequenceId?: string
  annualPlanId?: string
  classeId: string
  enseignantId: string
  // Persistence link to database.ts Lecon
  leconId?: string
  header: LessonPlanHeader
  content: LessonPlanContent
  // Curriculum alignment
  curriculumId?: string
  // Template used
  templateId: string              // 'alberta' | 'ontario' | 'quebec' | ...
  // Quality
  qualityScore?: number           // 0–100, set by TQE
  qualityReportId?: string
  // Status
  statut: StatutLecon
  generePar: LessonGenerationSource
  version: number
  bloomLevels?: BloomLevel[]      // Bloom levels covered in this lesson
  createdAt: string
  updatedAt: string
}

// ─── Sequence Plan ─────────────────────────────────────────────────────────────
// A thematic sequence of lessons covering a set of learning outcomes.

export type SequenceStatut = 'brouillon' | 'planifiee' | 'en_cours' | 'complete' | 'archivee'

export interface SequencePlan {
  id: string
  annualPlanId: string
  classeId: string
  enseignantId: string
  // Persistence link to database.ts Unite
  uniteIndex?: number
  titre: string
  description?: string
  theme?: string
  ordre: number                   // Sequence number in the annual plan
  duree_semaines: number
  dateDebut?: string
  dateFin?: string
  // Curriculum coverage
  curriculumId?: string
  outcomesGenerauxIds: string[]
  outcomesSpecifiquesIds: string[]
  competencesIds?: string[]
  bigIdeesIds?: string[]
  // Lessons in this sequence (ordered)
  lessonPlans: LessonPlan[]
  // Summative evaluation planned at end of sequence
  evaluationSommativePrevue?: string
  statut: SequenceStatut
  version: number
  createdAt: string
  updatedAt: string
}

// ─── Annual Plan ───────────────────────────────────────────────────────────────
// The full-year pedagogical plan for one class.

export type AnnualPlanStatut = 'brouillon' | 'actif' | 'archive'

export interface AnnualPlanMeta {
  nbSemaines: number
  nbLecons: number
  nbEvaluationsSommatives: number
  coveragePercent: number         // % of curriculum outcomes covered
  langue: 'fr' | 'en'
}

export interface AnnualPlan {
  id: string
  classeId: string
  enseignantId: string
  // Persistence link to database.ts ProgrammeAnnuel
  programmeAnnuelId?: string
  titre: string
  anneeScolaire: string           // e.g. "2026-2027"
  curriculumId: string
  templateId: string
  calendrierId?: string           // AcademicCalendar ID
  sequences: SequencePlan[]
  meta: AnnualPlanMeta
  statut: AnnualPlanStatut
  genereParIA: boolean
  version: number
  notes?: string
  createdAt: string
  updatedAt: string
}

// ─── Plan Generation Request ───────────────────────────────────────────────────
// Parameters sent to PGE to trigger plan generation

export interface AnnualPlanGenerationRequest {
  classeId: string
  curriculumId: string
  matiere: string
  niveau: string
  anneeScolaire: string
  langue: 'fr' | 'en'
  nbSemaines?: number             // Override calendar default
  prioritesEnseignant?: string    // Free text about teaching priorities
  contraintesCalendrier?: string  // Free text about calendar constraints
}

export interface LessonGenerationRequest {
  sequenceId: string
  outcomesSpecifiquesIds: string[]
  duree_minutes?: number
  numero?: number
  contexte?: string               // Context from previous lessons
  profilIA?: Record<string, unknown>
}
