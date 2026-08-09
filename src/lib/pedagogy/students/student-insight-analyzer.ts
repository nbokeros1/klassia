// ── PIL — Student Insight Analyzer (ME-09) ───────────────────────────────────
//
// Analyse déterministe des données élèves.
// Aucun appel IA. Aucun diagnostic clinique. Aucun import React/Supabase.
//
// Principes :
//   - Descriptions factuelles uniquement ("3 absences en 30 jours")
//   - Pas d'étiquettes : "risque de décrochage", "trouble d'apprentissage", etc.
//   - La sévérité reflète l'écart par rapport au seuil, pas un jugement de valeur
//   - Si aucune donnée de présence/résultats/travaux → ClassStudentSummary vide

import type {
  StudentSnapshot,
  StudentAttendanceSnapshot,
  StudentResultSnapshot,
  StudentWorkSnapshot,
  StudentSignal,
  StudentInsightAnalysis,
  ClassStudentSummary,
} from './types'
import {
  DEFAULT_STUDENT_INSIGHT_CONFIG,
  type StudentInsightConfig,
} from './student-insight-config'

export class StudentInsightAnalyzer {
  private cfg: StudentInsightConfig

  constructor(config: Partial<StudentInsightConfig> = {}) {
    this.cfg = { ...DEFAULT_STUDENT_INSIGHT_CONFIG, ...config }
  }

  analyze(
    students:      StudentSnapshot[],
    attendance:    StudentAttendanceSnapshot[],
    results:       StudentResultSnapshot[],
    work:          StudentWorkSnapshot[],
    now:           Date = new Date(),
  ): ClassStudentSummary {
    const hasUsableData =
      attendance.length > 0 || results.length > 0 || work.length > 0

    if (students.length === 0 || !hasUsableData) {
      return {
        analyses:                 [],
        totalStudents:            students.length,
        signalsCount:             0,
        highPrioritySignalsCount: 0,
        attendanceConcernCount:   0,
        performanceConcernCount:  0,
        missingWorkConcernCount:  0,
        averagePerformance:       null,
        recentAttendanceRate:     null,
        hasUsableData,
      }
    }

    const windowStart = new Date(now)
    windowStart.setDate(windowStart.getDate() - this.cfg.attendanceWindowDays)

    // Index par studentId pour accès rapide
    const attendanceByStudent = this.groupBy(attendance, r => r.studentId)
    const resultsByStudent    = this.groupBy(results,    r => r.studentId)
    const workByStudent       = this.groupBy(work,       r => r.studentId)

    const analyses: StudentInsightAnalysis[] = []

    for (const student of students) {
      const signals: StudentSignal[] = []

      const studentAttendance = attendanceByStudent.get(student.id) ?? []
      const studentResults    = resultsByStudent.get(student.id) ?? []
      const studentWork       = workByStudent.get(student.id) ?? []

      // ── Présences ──────────────────────────────────────────────────────────
      const recentAttendance = studentAttendance.filter(
        r => r.date >= windowStart,
      )

      const absenceCount  = recentAttendance.filter(r => r.status === 'absent').length
      const latenessCount = recentAttendance.filter(r => r.status === 'late').length

      if (absenceCount >= this.cfg.repeatedAbsenceThreshold) {
        const severity = absenceCount >= this.cfg.repeatedAbsenceThreshold * 2
          ? 'high'
          : absenceCount >= Math.ceil(this.cfg.repeatedAbsenceThreshold * 1.5)
            ? 'medium'
            : 'low'
        signals.push({
          studentId:   student.id,
          type:        'repeated_absence',
          severity,
          description: `${absenceCount} absence(s) dans les ${this.cfg.attendanceWindowDays} derniers jours`,
          confidence:  recentAttendance.length > 0 ? 0.8 : 0.4,
          detectedAt:  now,
        })
      }

      if (latenessCount >= this.cfg.repeatedLatenessThreshold) {
        const severity = latenessCount >= this.cfg.repeatedLatenessThreshold * 2
          ? 'high'
          : latenessCount >= Math.ceil(this.cfg.repeatedLatenessThreshold * 1.5)
            ? 'medium'
            : 'low'
        signals.push({
          studentId:   student.id,
          type:        'repeated_lateness',
          severity,
          description: `${latenessCount} retard(s) dans les ${this.cfg.attendanceWindowDays} derniers jours`,
          confidence:  recentAttendance.length > 0 ? 0.8 : 0.4,
          detectedAt:  now,
        })
      }

      // ── Résultats ──────────────────────────────────────────────────────────
      const gradedResults = studentResults.filter(r => r.percentage !== null)

      if (gradedResults.length >= this.cfg.lowPerformanceMinimumResults) {
        const avg = gradedResults.reduce((sum, r) => sum + r.percentage!, 0) / gradedResults.length

        if (avg < this.cfg.lowPerformanceThreshold) {
          const gap = this.cfg.lowPerformanceThreshold - avg
          const severity = gap >= 20 ? 'high' : gap >= 10 ? 'medium' : 'low'
          signals.push({
            studentId:   student.id,
            type:        'low_performance',
            severity,
            description: `Moyenne de ${Math.round(avg)} % sur ${gradedResults.length} évaluation(s)`,
            confidence:  Math.min(0.9, 0.5 + gradedResults.length * 0.1),
            detectedAt:  now,
          })
        }

        // Déclin : résultats récents < résultats antérieurs
        if (gradedResults.length >= this.cfg.decliningPerformanceMinimumResults) {
          const sorted = [...gradedResults].sort((a, b) => {
            const ta = (a.gradedAt ?? a.submittedAt ?? new Date(0)).getTime()
            const tb = (b.gradedAt ?? b.submittedAt ?? new Date(0)).getTime()
            return ta - tb
          })
          const half   = Math.floor(sorted.length / 2)
          const older  = sorted.slice(0, half)
          const recent = sorted.slice(half)
          const avgOlder  = older.reduce((s, r) => s + r.percentage!, 0) / older.length
          const avgRecent = recent.reduce((s, r) => s + r.percentage!, 0) / recent.length
          const drop = avgOlder - avgRecent

          if (drop >= 10) {
            const severity = drop >= 20 ? 'high' : drop >= 15 ? 'medium' : 'low'
            signals.push({
              studentId:   student.id,
              type:        'declining_performance',
              severity,
              description: `Baisse de ${Math.round(drop)} point(s) entre les évaluations récentes et antérieures`,
              confidence:  Math.min(0.9, 0.5 + sorted.length * 0.1),
              detectedAt:  now,
            })
          }
        }
      }

      // ── Travaux ────────────────────────────────────────────────────────────
      const missingWork = studentWork.filter(
        w => w.status === 'missing' || w.status === 'late',
      )

      if (missingWork.length >= this.cfg.missingWorkThreshold) {
        const severity = missingWork.length >= this.cfg.missingWorkThreshold * 2
          ? 'high'
          : missingWork.length >= Math.ceil(this.cfg.missingWorkThreshold * 1.5)
            ? 'medium'
            : 'low'
        signals.push({
          studentId:   student.id,
          type:        'missing_work',
          severity,
          description: `${missingWork.length} travail/travaux non remis`,
          confidence:  studentWork.length > 0 ? 0.9 : 0.5,
          detectedAt:  now,
        })
      }

      if (signals.length > 0) {
        analyses.push({
          studentId:             student.id,
          displayName:           student.displayName,
          signals,
          hasHighPrioritySignal: signals.some(s => s.severity === 'high'),
        })
      }
    }

    // ── Agrégats classe ────────────────────────────────────────────────────
    const allSignals          = analyses.flatMap(a => a.signals)
    const signalsCount        = allSignals.length
    const highPriorityCount   = allSignals.filter(s => s.severity === 'high').length
    const attendanceConcerns  = analyses.filter(a =>
      a.signals.some(s => s.type === 'repeated_absence' || s.type === 'repeated_lateness'),
    ).length
    const performanceConcerns = analyses.filter(a =>
      a.signals.some(s => s.type === 'low_performance' || s.type === 'declining_performance'),
    ).length
    const missingWorkConcerns = analyses.filter(a =>
      a.signals.some(s => s.type === 'missing_work'),
    ).length

    // Moyenne de performance globale (tous élèves, toutes évaluations)
    const allPercentages = results.filter(r => r.percentage !== null).map(r => r.percentage!)
    const averagePerformance = allPercentages.length > 0
      ? Math.round(allPercentages.reduce((s, p) => s + p, 0) / allPercentages.length)
      : null

    // Taux de présence récent (fenêtre active)
    const recentAllAttendance = attendance.filter(r => r.date >= windowStart)
    const presentCount = recentAllAttendance.filter(
      r => r.status === 'present' || r.status === 'late',
    ).length
    const recentAttendanceRate = recentAllAttendance.length > 0
      ? Math.round((presentCount / recentAllAttendance.length) * 100)
      : null

    return {
      analyses,
      totalStudents:            students.length,
      signalsCount,
      highPrioritySignalsCount: highPriorityCount,
      attendanceConcernCount:   attendanceConcerns,
      performanceConcernCount:  performanceConcerns,
      missingWorkConcernCount:  missingWorkConcerns,
      averagePerformance,
      recentAttendanceRate,
      hasUsableData,
    }
  }

  private groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
    const map = new Map<string, T[]>()
    for (const item of items) {
      const k = key(item)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(item)
    }
    return map
  }
}
