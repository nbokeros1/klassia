// ── PIL — Student Insight Types (ME-09) ─────────────────────────────────────
//
// Types de la couche analyse élèves du PIL.
// Déterministe — aucun appel IA, aucun diagnostic clinique.
// Ces types alimentent StudentBuilder → TeacherStudentInsights.

import type {
  StudentSnapshot,
  StudentAttendanceSnapshot,
  StudentResultSnapshot,
  StudentWorkSnapshot,
} from '../../mission-engine/types'

export type { StudentSnapshot, StudentAttendanceSnapshot, StudentResultSnapshot, StudentWorkSnapshot }

/** Catégorie du signal détecté pour un élève. */
export type StudentSignalType =
  | 'repeated_absence'
  | 'repeated_lateness'
  | 'low_performance'
  | 'declining_performance'
  | 'missing_work'

/** Signal factuel lié à un élève spécifique. Sans diagnostic ni étiquette clinique. */
export interface StudentSignal {
  studentId:   string
  type:        StudentSignalType
  severity:    'low' | 'medium' | 'high'
  description: string     // ex. "3 absences dans les 30 derniers jours"
  confidence:  number     // 0–1, basé sur la quantité de données disponibles
  detectedAt:  Date
}

/** Analyse PIL pour un élève individuel. */
export interface StudentInsightAnalysis {
  studentId:            string
  displayName:          string
  signals:              StudentSignal[]
  hasHighPrioritySignal: boolean  // severity === 'high'
}

/**
 * Résumé PIL complet pour une classe.
 * Produit par StudentInsightAnalyzer.
 * Consommé par StudentBuilder pour construire TeacherStudentInsights.
 *
 * hasUsableData = false si attendance, studentResults et studentWork sont tous vides.
 * Dans ce cas, tous les counts sont 0 et aucun signal n'est généré.
 */
export interface ClassStudentSummary {
  analyses:                StudentInsightAnalysis[]
  totalStudents:           number
  signalsCount:            number
  highPrioritySignalsCount: number
  attendanceConcernCount:  number
  performanceConcernCount: number
  missingWorkConcernCount: number
  averagePerformance:      number | null
  recentAttendanceRate:    number | null
  hasUsableData:           boolean
}
