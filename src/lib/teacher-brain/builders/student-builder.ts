// ── Teacher Brain — StudentBuilder (ME-09) ────────────────────────────────────
//
// Construit TeacherStudentInsights à partir de ClassStudentSummary (PIL).
// Limite les priorityStudents à 5 (les plus sévères en premier).
// Déterministe — aucun appel IA, aucun réseau.

import type { TeacherStudentInsights, TeacherStudentPriority } from '../types'
import type { ClassStudentSummary, StudentInsightAnalysis } from '../../pedagogy/students/types'

// Poids de sévérité pour le tri des élèves prioritaires
const SEVERITY_WEIGHT = { high: 3, medium: 2, low: 1 } as const

const MAX_PRIORITY_STUDENTS = 5

export class StudentBuilder {
  build(summary: ClassStudentSummary): TeacherStudentInsights {
    const confidence = this.computeConfidence(summary)

    const priorityStudents: TeacherStudentPriority[] = this.selectTopStudents(
      summary.analyses,
    )

    return {
      totalStudents:              summary.totalStudents,
      signalsCount:               summary.signalsCount,
      highPrioritySignalsCount:   summary.highPrioritySignalsCount,
      attendanceConcernCount:     summary.attendanceConcernCount,
      performanceConcernCount:    summary.performanceConcernCount,
      missingWorkConcernCount:    summary.missingWorkConcernCount,
      averagePerformance:         summary.averagePerformance,
      recentAttendanceRate:       summary.recentAttendanceRate,
      priorityStudents,
      confidence,
      hasUsableData:              summary.hasUsableData,
    }
  }

  private selectTopStudents(
    analyses: StudentInsightAnalysis[],
  ): TeacherStudentPriority[] {
    // Trier par score de sévérité décroissant
    const scored = analyses.map(a => ({
      analysis: a,
      score: a.signals.reduce(
        (total, s) => total + SEVERITY_WEIGHT[s.severity],
        0,
      ),
    }))

    scored.sort((a, b) => b.score - a.score)

    return scored.slice(0, MAX_PRIORITY_STUDENTS).map(({ analysis }) => ({
      studentId:   analysis.studentId,
      displayName: analysis.displayName,
      reasons:     analysis.signals.map(s => ({
        type:        s.type,
        severity:    s.severity,
        description: s.description,
        confidence:  s.confidence,
      })),
    }))
  }

  private computeConfidence(summary: ClassStudentSummary): number {
    if (summary.totalStudents === 0)   return 0.0
    if (!summary.hasUsableData)        return 0.3

    // Présence de données → confiance selon la richesse
    const hasAttendance   = summary.recentAttendanceRate !== null
    const hasPerformance  = summary.averagePerformance !== null
    const hasMissingWork  = summary.missingWorkConcernCount >= 0

    const dataTypes = [hasAttendance, hasPerformance, hasMissingWork].filter(Boolean).length

    if (dataTypes >= 3) return 0.9
    if (dataTypes >= 2) return 0.7
    return 0.6
  }
}
