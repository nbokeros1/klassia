// ─── Mon Année — ViewModel types ───────────────────────────────────────────────
// Projection de l'état pédagogique réel pour le cockpit annuel.
// Les métriques non disponibles sont exprimées en `null` et affichées comme "—".

import type { Unite } from '@/lib/types/database'
import type { CurriculumCoverageData } from '@/lib/spie/curriculum-coverage'

export type { CurriculumCoverageData }

// ─── État d'enseignement résolu (V5) ─────────────────────────────────────────

export type LessonTeachingState = {
  isTaught: boolean
  taughtAt: string | null   // ISO date (YYYY-MM-DD)
  note: string | null
  source: 'events' | 'legacy'  // 'events' = V5 table, 'legacy' = V4 contenu_json
}

// ─── Statuts séquence ────────────────────────────────────────────────────────

export type SequenceStatut = 'a_venir' | 'en_cours' | 'terminee'

// ─── Indicateur de rythme (V4) ────────────────────────────────────────────────

export type PacingStatut = 'EN_AVANCE' | 'DANS_LE_RYTHME' | 'A_SURVEILLER' | 'EN_RETARD'

export type PacingIndicator = {
  delta: number        // teachingProgress - schoolYearElapsedPercent
  statut: PacingStatut
  label: string
  color: string
}

// ─── Métriques globales ───────────────────────────────────────────────────────

export type SchoolYearMetrics = {
  // null = donnée absente en DB, afficher "—"
  totalSequences:    number | null
  completedSequences: number | null
  totalLecons:       number | null
  preparedLecons:    number | null  // nb_lecons_generees du pack
  taughtLecons:      number | null  // lecons avec statut 'enseignee'
  totalRA:           number | null  // depuis syllabus_json.resultats_apprentissage
  coveredRA:         null           // toujours null — pas encore de tracking RA
}

// ─── Progression par séquence ────────────────────────────────────────────────

export type SequenceProgress = {
  seqIdx:       number    // 0-based index into contenu_json.unites[] (clé lessonStateMap)
  numero:       number
  titre:        string
  semaineDebut: number
  semaineFin:   number
  objectif:     string
  totalLecons:  number
  taughtLecons: number
  statut:       SequenceStatut
  progressPct:  number   // 0–100
  uniteData:    Unite
}

// ─── Tâche prioritaire ───────────────────────────────────────────────────────

export type PriorityTask = {
  type:        'preparer' | 'corriger' | 'planifier' | 'enseigner'
  label:       string
  detail:      string
  sequenceNum: number
  leconNum?:   number
}

// ─── Évaluation à venir ──────────────────────────────────────────────────────

export type UpcomingAssessment = {
  titre:       string
  contexte:    string
  dateLabel?:  string
}

// ─── ViewModel complet ───────────────────────────────────────────────────────

export type SchoolYearDashboardData = {
  metrics:               SchoolYearMetrics
  sequences:             SequenceProgress[]
  raList:                string[]
  priorityTasks:         PriorityTask[]
  upcomingAssessments:   UpcomingAssessment[]
  currentSequence:       SequenceProgress | null
  curriculumCoverage?:   CurriculumCoverageData  // V2 : présent si programme V2
  syllabusCompleteness?: number                  // V3 : score 0-100 du syllabus
  pacingIndicator?:      PacingIndicator         // V4 : rythme d'enseignement
  schoolYearElapsedPct?: number                  // V4 : % année scolaire écoulée (0–100)
  lessonStateMap?:       Record<string, LessonTeachingState>  // V5 : clé "seqIdx:leconIdx"
}
