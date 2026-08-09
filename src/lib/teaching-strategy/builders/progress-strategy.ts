// ── Teaching Strategy — ProgressStrategyBuilder (ME-10) ──────────────────────
//
// Analyse TeacherProgress et retourne le mode stratégique approprié.
// Déterministe — aucun appel IA, aucun réseau.

import type { TeacherProgress } from '../../teacher-brain/types'
import type { StrategySignal } from '../types'

// Nombre de leçons depuis la dernière éval pour déclencher ASSESSMENT_PHASE
const ASSESSMENT_LESSON_THRESHOLD = 5

// Pourcentage de progression pour déclencher ACCELERATE_PROGRESS
const ACCELERATE_PROGRESS_THRESHOLD = 80

export class ProgressStrategyBuilder {
  analyze(progress: TeacherProgress): StrategySignal | null {
    // END_OF_UNIT : unité couverte mais pas encore évaluée
    // (Condition : des évaluations ont déjà été créées → on sait qu'on évalue par unité)
    if (progress.unevaluatedUnits.length > 0 && progress.totalEvaluations > 0) {
      const unit = progress.unevaluatedUnits[0]
      return {
        mode: 'END_OF_UNIT',
        reason: {
          code:        'unit_without_evaluation',
          description: `L'unité « ${unit} » est terminée mais n'a pas encore été évaluée.`,
          source:      'progress',
        },
      }
    }

    // ASSESSMENT_PHASE : beaucoup de leçons depuis la dernière évaluation
    if (progress.lessonsAfterLastEval >= ASSESSMENT_LESSON_THRESHOLD) {
      return {
        mode: 'ASSESSMENT_PHASE',
        reason: {
          code:        'lessons_without_evaluation',
          description: `${progress.lessonsAfterLastEval} leçons ont été préparées depuis la dernière évaluation.`,
          source:      'progress',
        },
      }
    }

    // ACCELERATE_PROGRESS : programme avancé (fin d'année approche)
    if (
      progress.progressPercent !== null &&
      progress.progressPercent > ACCELERATE_PROGRESS_THRESHOLD
    ) {
      return {
        mode: 'ACCELERATE_PROGRESS',
        reason: {
          code:        'high_progress_percent',
          description: `La progression est à ${progress.progressPercent} % du programme annuel.`,
          source:      'progress',
        },
      }
    }

    return null
  }
}
