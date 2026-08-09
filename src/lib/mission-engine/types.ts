// ── Mission Engine — Types ──────────────────────────────────────────────────

import type {
  CalendarEventSnapshot,
  CalendarDeadlineSnapshot,
} from '../pedagogy/calendar/types'

export type {
  CalendarEventType,
  CalendarEventScope,
  CalendarEventSnapshot,
  CalendarDeadlineSnapshot,
} from '../pedagogy/calendar/types'

/** Progression du cycle de vie d'une mission. */
export type MissionStatus =
  | 'proposed'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'dismissed'

/** Score de priorité : 0 (faible) → 100 (critique). */
export type MissionPriority = number

/** Catégorie sémantique d'une mission. */
export type MissionType =
  | 'next_lesson'
  | 'evaluation'
  | 'create_evaluation'
  | 'work'
  | 'student_follow_up'
  | 'resume_generation'
  | 'unfinished_document'
  | 'deadline'

/** Source d'une preuve ayant motivé une mission. */
export type MissionEvidenceSource =
  | 'programme_annuel'
  | 'derniere_lecon'
  | 'evaluation'
  | 'curriculum'
  | 'conversation'
  | 'calendrier'
  | 'calendar'
  | 'deadline'
  | 'school_schedule'
  | 'assignment'
  | 'feedback'
  | 'progression'
  | 'attendance'
  | 'student_results'
  | 'student_work'
  | 'system'

/** Preuve utilisée par un détecteur pour justifier la mission générée. */
export interface MissionEvidence {
  source:      MissionEvidenceSource
  documentId?: string
  label:       string
  valeur?:     string
}

/** Explication lisible de pourquoi une mission a été générée. */
export interface MissionReason {
  code:        string
  label:       string
  description: string
}

/** Mission retournée par le Mission Engine. */
export interface Mission {
  id:          string
  type:        MissionType
  title:       string
  description: string
  priority:    MissionPriority
  status:      MissionStatus
  reason:      MissionReason
  createdAt:   Date
  metadata:    Record<string, unknown>
  evidence?:   MissionEvidence[]
}

// ── Snapshots de données métier ─────────────────────────────────────────────

/** Informations essentielles sur l'enseignant pour la prise de décision. */
export interface EnseignantSnapshot {
  id:       string
  prenom:   string
  nom:      string
  province: string | null
  langue:   string
}

/** Informations essentielles sur la classe active. */
export interface ClasseSnapshot {
  id:       string
  nom:      string
  niveau:   string | null
  matiere:  string | null
  matieres: string[]
}

/** Document pédagogique chargé depuis la bibliothèque (fichiers_dossier). */
export interface DocumentSnapshot {
  id:           string
  nom:          string
  type_fichier: string
  texteExtrait: string | null
  createdAt:    Date
  // Champs enrichis (ME-02b+)
  dossierType?: string
  matiere?:     string | null
  contenuHtml?: string | null
  metadata?:    Record<string, unknown>
}

/** Message d'une conversation IA (Préparer ou autre). */
export interface MessageSnapshot {
  role:      'user' | 'assistant'
  content:   string
  createdAt: Date | null
}

// CalendarEventSnapshot and CalendarDeadlineSnapshot are re-exported above
// from src/lib/pedagogy/calendar/types.ts (ME-11)

// ── Snapshots élèves ─────────────────────────────────────────────────────────

/** Profil minimal d'un élève (depuis la table `eleves`). */
export interface StudentSnapshot {
  id:          string
  firstName:   string | null
  lastName:    string | null
  displayName: string           // `${prenom} ${nom}` ou fallback
  classeId:    string
  active:      boolean
  profilType?: string           // 'standard' | 'difficulte' | 'avance' | 'pei' | 'autre'
  besoins?:    string[]
}

/** Enregistrement de présence d'un élève. */
export interface StudentAttendanceSnapshot {
  studentId: string
  date:      Date
  status:    'present' | 'absent' | 'late' | 'excused' | 'unknown'
}

/** Résultat d'une évaluation pour un élève. */
export interface StudentResultSnapshot {
  studentId:    string
  evaluationId: string
  score:        number | null
  maxScore:     number | null
  percentage:   number | null
  submittedAt:  Date | null
  gradedAt:     Date | null
}

/** Statut du travail d'un élève (devoir/exercice). */
export interface StudentWorkSnapshot {
  studentId:    string
  assignmentId: string
  status:       'assigned' | 'submitted' | 'late' | 'missing' | 'graded' | 'unknown'
  dueDate:      Date | null
  submittedAt:  Date | null
  gradedAt:     Date | null
}

// ── Contexte de données du Mission Engine ────────────────────────────────────

/**
 * Contexte de données chargé par MissionDataProvider et transmis au moteur.
 * Les détecteurs reçoivent ce contexte sans jamais interroger Supabase directement.
 */
export interface MissionDataContext {
  enseignant:           EnseignantSnapshot | null
  classe:               ClasseSnapshot | null
  matiere:              string | null
  programmeAnnuel:      DocumentSnapshot | null
  curriculum:           DocumentSnapshot | null
  dernieresLecons:      DocumentSnapshot[]
  dernieresEvaluations: DocumentSnapshot[]
  ressources:           DocumentSnapshot[]
  travaux:              DocumentSnapshot[]
  // Données élèves (ME-09)
  students:             StudentSnapshot[]
  attendance:           StudentAttendanceSnapshot[]
  studentResults:       StudentResultSnapshot[]
  studentWork:          StudentWorkSnapshot[]
  conversationIA:       MessageSnapshot[]
  dateCourante:         Date
  // Données calendrier (ME-11 — remplace upcomingEvents)
  calendarEvents:       CalendarEventSnapshot[]
  calendarDeadlines:    CalendarDeadlineSnapshot[]
  // Compteurs de leçons par statut (BETA-07) — source : table lecons
  leconsParStatut?:     Record<string, number>
}

/** Valeur par défaut — moteur utilisable sans provider (tests, instanciation directe). */
export const EMPTY_MISSION_CONTEXT: MissionDataContext = {
  enseignant:           null,
  classe:               null,
  matiere:              null,
  programmeAnnuel:      null,
  curriculum:           null,
  dernieresLecons:      [],
  dernieresEvaluations: [],
  ressources:           [],
  travaux:              [],
  students:             [],
  attendance:           [],
  studentResults:       [],
  studentWork:          [],
  conversationIA:       [],
  dateCourante:         new Date(),
  calendarEvents:       [],
  calendarDeadlines:    [],
  leconsParStatut:      {},
}

// ── Persistance d'état utilisateur (ME-05) ──────────────────────────────────

/** Action que l'enseignant peut déclencher sur une mission. */
export type MissionAction =
  | 'accept'
  | 'start'
  | 'complete'
  | 'dismiss'
  | 'restore'

/**
 * Snapshot de l'état persisté d'une mission dans `missions_enseignant`.
 * Ne contient aucun contenu documentaire.
 */
export interface MissionStateSnapshot {
  missionKey:  string
  status:      MissionStatus
  acceptedAt:  Date | null
  startedAt:   Date | null
  completedAt: Date | null
  dismissedAt: Date | null
  updatedAt:   Date
}

// ── Erreurs de la couche données ────────────────────────────────────────────

export type MissionDataErrorCode =
  | 'ENSEIGNANT_NOT_FOUND'
  | 'CLASSE_NOT_FOUND'
  | 'CLASSE_FORBIDDEN'
  | 'INVALID_CONTEXT'

export class MissionDataError extends Error {
  public readonly code: MissionDataErrorCode

  constructor(code: MissionDataErrorCode, message: string) {
    super(message)
    this.name = 'MissionDataError'
    this.code = code
  }
}
