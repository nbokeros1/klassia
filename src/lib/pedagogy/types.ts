// ── PIL — Types pédagogiques ─────────────────────────────────────────────────
//
// Types de sortie de chaque analyseur du Pedagogical Intelligence Layer.
// Aucun import React, aucune dépendance Supabase.

// ── Curriculum ────────────────────────────────────────────────────────────────

/**
 * Unité pédagogique extraite du programme annuel ou du curriculum.
 * Une "unité" correspond à un thème, un chapitre, ou un sujet de leçon.
 */
export interface CurriculumUnit {
  id:            string    // identifiant local stable (ex : "unit_0")
  title:         string    // titre brut extrait du document
  order:         number    // ordre d'apparition dans le document
  themes:        string[]  // sous-thèmes détectés (best-effort)
  competencies:  string[]  // compétences mentionnées (best-effort)
}

/**
 * Structure complète extraite du document curriculaire.
 */
export interface CurriculumStructure {
  units:       CurriculumUnit[]
  totalTopics: number
  rawLines:    string[]
}

// ── Leçons ────────────────────────────────────────────────────────────────────

/**
 * Informations extraites d'un document-leçon.
 */
export interface LessonInfo {
  id:      string
  nom:     string
  subject: string | null   // sujet principal
  chapter: string | null   // chapitre correspondant dans le curriculum
  notions: string[]        // notions identifiées
  date:    Date | null
}

// ── Évaluations ───────────────────────────────────────────────────────────────

/**
 * Unité pour laquelle au moins une évaluation a été trouvée.
 */
export interface EvaluatedUnit {
  unitTitle:        string
  evaluationCount:  number
  lastEvaluatedAt:  Date | null
}

/**
 * Analyse complète de l'état des évaluations.
 */
export interface EvaluationAnalysis {
  evaluatedUnits:     EvaluatedUnit[]
  unevaluatedUnits:   string[]   // titres d'unités couvertes mais jamais évaluées
  lastEvaluationDate: Date | null
  totalEvaluations:   number
}

// ── Travaux / Assignments ─────────────────────────────────────────────────────

/** Statut d'un travail donné aux élèves. */
export type AssignmentStatus = 'pending' | 'overdue' | 'graded'

/**
 * Snapshot enrichi d'un travail (devoir, exercice, projet).
 * Dérivé d'un DocumentSnapshot avec état inféré.
 */
export interface AssignmentSnapshot {
  id:           string
  nom:          string
  matiere:      string | null
  createdAt:    Date
  dueDate:      Date | null    // extrait de metadata?.dueDate, ou null
  gradedAt:     Date | null    // extrait de metadata?.gradedAt, ou null
  isGraded:     boolean        // metadata?.isGraded || gradedAt !== null
  hasFeedback:  boolean        // metadata?.hasFeedback || feedback keywords in texteExtrait
  status:       AssignmentStatus
}

/**
 * Résultat de l'analyse des travaux.
 */
export interface AssignmentAnalysis {
  assignments:        AssignmentSnapshot[]
  pendingAssignments: AssignmentSnapshot[]   // pas encore corrigés, pas en retard
  overdueAssignments: AssignmentSnapshot[]   // dépassement de la date limite
  ungradedAssignments: AssignmentSnapshot[]  // pendingAssignments + overdueAssignments
}

// ── Rétroaction / Feedback ────────────────────────────────────────────────────

/**
 * Résultat de l'analyse de la rétroaction donnée aux élèves.
 */
export interface FeedbackAnalysis {
  assignmentsWithoutFeedback: AssignmentSnapshot[]  // corrigés mais sans commentaire
  incompleteCorrections:      AssignmentSnapshot[]  // partiellement corrigés
  totalChecked:               number
  hasPendingFeedback:         boolean
}

// ── Progression ───────────────────────────────────────────────────────────────

/**
 * Analyse de la progression pédagogique.
 * Sortie principale du ProgressAnalyzer.
 *
 * confidence : 0–1
 *   - 0.9 : programme annuel + plusieurs leçons → analyse fiable
 *   - 0.6 : programme annuel mais peu de leçons → estimation
 *   - 0.3 : aucun programme → faible confiance
 */
export interface ProgressAnalysis {
  currentLesson:       string | null   // dernière leçon enseignée
  nextLesson:          string | null   // prochain sujet dans le programme
  completedLessons:    string[]        // noms des leçons créées
  completedEvaluations: string[]       // noms des évaluations créées
  progressPercent:     number | null   // % d'avancement (null si incalculable)
  confidence:          number          // 0–1
}
