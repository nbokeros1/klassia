// ── PIL — FeedbackAnalyzer ───────────────────────────────────────────────────
//
// Détermine l'état de la rétroaction enseignant à partir de AssignmentSnapshot[].
// Déterministe — aucun appel IA, aucun réseau, aucun Supabase.
// Indépendant du Dashboard.

import type { AssignmentSnapshot, FeedbackAnalysis } from '../types'

export class FeedbackAnalyzer {
  /**
   * Analyse la rétroaction donnée sur les travaux corrigés.
   *
   * - `assignmentsWithoutFeedback` : corrigés (isGraded) mais sans rétroaction
   * - `incompleteCorrections`      : non corrigés mais anciens (≥ 7 jours sans statut)
   * - `hasPendingFeedback`         : vrai si au moins un travail corrigé sans rétroaction
   */
  analyze(assignments: AssignmentSnapshot[]): FeedbackAnalysis {
    const totalChecked = assignments.length

    // Travaux corrigés sans aucune rétroaction
    const assignmentsWithoutFeedback = assignments.filter(
      a => a.isGraded && !a.hasFeedback,
    )

    // Corrections incomplètes : non corrigés depuis plus de 7 jours
    const INCOMPLETE_THRESHOLD_MS = 7 * 86_400_000
    const now = Date.now()
    const incompleteCorrections = assignments.filter(
      a => !a.isGraded && (now - a.createdAt.getTime()) > INCOMPLETE_THRESHOLD_MS,
    )

    return {
      assignmentsWithoutFeedback,
      incompleteCorrections,
      totalChecked,
      hasPendingFeedback: assignmentsWithoutFeedback.length > 0,
    }
  }
}
