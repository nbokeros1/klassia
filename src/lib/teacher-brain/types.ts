// ── Teacher Brain — Types (ME-08/ME-09/ME-11) ─────────────────────────────────
//
// Vue consolidée de la situation pédagogique d'un enseignant.
// Construite par TeacherBrain.buildSituation() à partir de MissionDataContext.
// Distribuée aux détecteurs du Mission Engine — ceux-ci n'appellent plus le PIL.
//
// IMPORTANT — frontière stricte (ME-09) :
//   TeacherSituation ne contient PAS les documents bruts.
//   Les détecteurs ne doivent pas accéder à des textes, HTML ou métadonnées documentaires.
//   Les références minimales (IDs, noms) sont dans TeacherSituationReferences.

import type { EnseignantSnapshot, ClasseSnapshot } from '../mission-engine/types'
import type { AssignmentSnapshot } from '../pedagogy/types'
import type { StudentSignalType } from '../pedagogy/students/types'
import type { CalendarEventSnapshot, CalendarDeadlineSnapshot } from '../mission-engine/types'

export type { StudentSignalType }

// ── Progress ──────────────────────────────────────────────────────────────────

/**
 * État de la progression pédagogique pour une classe/matière.
 * Construit par ProgressBuilder.
 */
export interface TeacherProgress {
  currentLesson:         string | null
  nextLesson:            string | null
  completedLessons:      string[]
  completedEvaluations:  string[]

  progressPercent:       number | null
  completedUnits:        string[]
  remainingUnits:        string[]

  totalEvaluations:      number
  evaluationCoverage:    number | null
  unevaluatedUnits:      string[]
  lastEvaluationDate:    Date | null
  lessonsAfterLastEval:  number

  hasProgramme:          boolean
  suggestedTopic:        string | null
  // IDs pour evidence (proviennent de TeacherSituationReferences)
  programmeAnnuelId:     string | null
  derniereLeconId:       string | null
  derniereLeconNom:      string | null
}

// ── Workload ──────────────────────────────────────────────────────────────────

/**
 * Charge de travail (corrections, retours) pour une classe/matière.
 * Construit par WorkloadBuilder.
 */
export interface TeacherWorkload {
  pendingWork:                  number
  overdueWork:                  number
  feedbackBacklog:              number
  estimatedCorrectionMinutes:   number

  pendingAssignments:           AssignmentSnapshot[]
  overdueAssignments:           AssignmentSnapshot[]
  ungradedAssignments:          AssignmentSnapshot[]
  assignmentsWithoutFeedback:   AssignmentSnapshot[]
}

// ── Classroom ─────────────────────────────────────────────────────────────────

/**
 * État général de la classe (compteurs, activité).
 * Construit par ClassroomBuilder.
 */
export interface TeacherClassroom {
  lessonsCount:      number
  evaluationsCount:  number
  assignmentsCount:  number
  recentActivity:    Date | null
  leconsParStatut:   Record<string, number>
}

// ── Student Insights ──────────────────────────────────────────────────────────

export interface TeacherStudentPriorityReason {
  type:        StudentSignalType
  severity:    'low' | 'medium' | 'high'
  description: string            // factuel uniquement, sans diagnostic
  confidence:  number
}

/** Élève avec au moins un signal actif. Limité à 5 par situation. */
export interface TeacherStudentPriority {
  studentId:   string
  displayName: string
  reasons:     TeacherStudentPriorityReason[]
}

/**
 * Insights élèves consolidés.
 * Construit par StudentBuilder.
 *
 * hasUsableData = false si aucune donnée de présence/résultats/travaux n'est disponible.
 * Dans ce cas, aucun détecteur ne doit générer de mission de suivi.
 */
export interface TeacherStudentInsights {
  totalStudents:              number
  signalsCount:               number
  highPrioritySignalsCount:   number
  attendanceConcernCount:     number
  performanceConcernCount:    number
  missingWorkConcernCount:    number
  averagePerformance:         number | null
  recentAttendanceRate:       number | null
  priorityStudents:           TeacherStudentPriority[]  // max 5
  confidence:                 number
  hasUsableData:              boolean
}

// ── Calendar ──────────────────────────────────────────────────────────────────

/**
 * Vue consolidée du calendrier scolaire pour une classe.
 * Construite par CalendarBuilder à partir de CalendarAnalysis.
 *
 * hasUsableData = false si aucun événement ni échéance n'est disponible.
 */
export interface TeacherCalendar {
  hasUsableData:           boolean
  upcomingDeadlines:       CalendarDeadlineSnapshot[]
  upcomingBreaks:          CalendarEventSnapshot[]
  urgentDeadlineCount:     number
  urgentEvalDeadlineCount: number
  urgentSubmissionCount:   number
  nearestDeadlineDays:     number | null
  nearestBreakDays:        number | null
  confidence:              number
}

// ── References ────────────────────────────────────────────────────────────────

/**
 * Références minimales vers les documents source.
 * Permet aux détecteurs de construire des evidence sans accéder aux documents bruts.
 */
export interface TeacherSituationReferences {
  programmeAnnuelId:     string | null
  curriculumId:          string | null
  latestLessonId:        string | null
  latestLessonName:      string | null
  latestEvaluationId:    string | null
  latestEvaluationName:  string | null
}

// ── TeacherSituation ─────────────────────────────────────────────────────────

/**
 * Vue consolidée de la situation pédagogique.
 * Entrée unique de tous les détecteurs du Mission Engine.
 *
 * FRONTIÈRE STRICTE : pas de documents bruts, pas de texteExtrait,
 * pas de contenuHtml, pas de conversationIA dans cet objet.
 *
 * confidence (0–1) :
 *   ≥ 0.9 : programme + plusieurs leçons → analyse fiable
 *   0.7   : programme + 1 leçon          → estimation correcte
 *   0.6   : programme seul               → structure connue
 *   0.4   : leçons sans programme        → analyse partielle
 *   0.3   : aucune donnée fiable         → pas de suggestion précise
 *
 * Règle : confidence < 0.40 → les détecteurs n'émettent pas de sujet précis.
 * Règle : students.hasUsableData = false → pas de mission student_follow_up.
 * Règle : students.confidence < 0.50 → pas de mission student_follow_up.
 */
export interface TeacherSituation {
  enseignant:  EnseignantSnapshot | null
  classe:      ClasseSnapshot | null
  matiere:     string | null
  today:       Date

  progress:    TeacherProgress
  workload:    TeacherWorkload
  classroom:   TeacherClassroom
  students:    TeacherStudentInsights
  calendar:    TeacherCalendar           // added ME-11

  references:  TeacherSituationReferences
  confidence:  number
}
