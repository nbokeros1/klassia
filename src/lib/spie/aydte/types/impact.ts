// SPIE-04 — Impact Engine types
// Models the cascading effects of changes to the AcademicYearTwin.
// If a sequence changes → which lessons change? Which quizzes? Which evaluations?

// ─── Affected items ───────────────────────────────────────────────────────────

export interface AffectedItem {
  id: string
  type: 'sequence' | 'lecon' | 'quiz' | 'evaluation' | 'competence' | 'outcome'
  titre?: string
  raison: string             // Why was this item affected?
  actionRequise: ImpactAction
}

export type ImpactAction =
  | 'recalculer'            // Content needs recalculation
  | 'verifier'              // Teacher should review
  | 'regenerer'             // Should be regenerated
  | 'supprimer'             // Should be removed
  | 'aucune'                // No action needed

// ─── Impact Analysis ─────────────────────────────────────────────────────────

export interface ImpactAnalysis {
  id: string
  twinId: string
  // What triggered this analysis?
  declencheur: {
    type: 'sequence_modifiee' | 'calendrier_modifie' | 'curriculum_change' | 'progression_update'
    elementId?: string
    description: string
  }
  // Everything affected by this change
  affecte: AffectedItem[]
  // Summary
  nbLeconsTouchees: number
  nbQuizTouches: number
  nbEvaluationsTouchees: number
  nbCompetencesTouchees: number
  // Severity
  severite: 'mineure' | 'moderee' | 'majeure' | 'critique'
  // Can this be auto-fixed or does the teacher need to act?
  autoFixable: boolean
  // Recommended actions
  recommandations: string[]
  calculatedAt: string
}

// ─── Recalculation request ────────────────────────────────────────────────────

export type RecalculationScope =
  | 'deadlines'        // Just recalculate dates/deadlines
  | 'sequences'        // Recalculate sequence ordering/timing
  | 'lessons'          // Recalculate lesson content references
  | 'quizzes'          // Recalculate quiz alignment
  | 'evaluations'      // Recalculate evaluation planning
  | 'full'             // Recalculate everything

export interface RecalculationRequest {
  twinId: string
  scope: RecalculationScope
  reason: string
  triggeredBy?: string   // Element ID that triggered the recalculation
}

export interface RecalculationResult {
  twinId: string
  scope: RecalculationScope
  success: boolean
  changesApplied: string[]
  warnings: string[]
  durationMs: number
}
