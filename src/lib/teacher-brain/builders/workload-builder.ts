// ── Teacher Brain — WorkloadBuilder (ME-08) ───────────────────────────────────
//
// Construit TeacherWorkload à partir des travaux.
// Orchestration : AssignmentAnalyzer + FeedbackAnalyzer.
// Déterministe — aucun appel IA, aucun réseau.

import type { TeacherWorkload } from '../types'
import type { DocumentSnapshot } from '../../mission-engine/types'
import { AssignmentAnalyzer } from '../../pedagogy/assignments/assignment-analyzer'
import { FeedbackAnalyzer }   from '../../pedagogy/feedback/feedback-analyzer'

// Estimation du temps de correction par travail (en minutes)
const CORRECTION_MINUTES_PER_ASSIGNMENT = 15

export class WorkloadBuilder {
  private assignmentAnalyzer: AssignmentAnalyzer
  private feedbackAnalyzer:   FeedbackAnalyzer

  constructor() {
    this.assignmentAnalyzer = new AssignmentAnalyzer()
    this.feedbackAnalyzer   = new FeedbackAnalyzer()
  }

  build(travaux: DocumentSnapshot[], dateCourante: Date): TeacherWorkload {
    const assignmentAnalysis = this.assignmentAnalyzer.analyze(travaux, dateCourante)
    const feedbackAnalysis   = this.feedbackAnalyzer.analyze(assignmentAnalysis.assignments)

    const {
      pendingAssignments,
      overdueAssignments,
      ungradedAssignments,
    } = assignmentAnalysis

    return {
      pendingWork:                  pendingAssignments.length,
      overdueWork:                  overdueAssignments.length,
      feedbackBacklog:              feedbackAnalysis.assignmentsWithoutFeedback.length,
      estimatedCorrectionMinutes:   ungradedAssignments.length * CORRECTION_MINUTES_PER_ASSIGNMENT,

      pendingAssignments,
      overdueAssignments,
      ungradedAssignments,
      assignmentsWithoutFeedback:   feedbackAnalysis.assignmentsWithoutFeedback,
    }
  }
}
