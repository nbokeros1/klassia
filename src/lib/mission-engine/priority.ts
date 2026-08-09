// ── Mission Engine — Centralized Priority Calculation (ME-11) ─────────────────
//
// Calcule la priorité finale d'une mission en appliquant successivement :
//   1. La pondération du mode stratégique (strategy.modeWeights)
//   2. Les ajustements temporels calendrier (strategy.temporal + pressureLevel)
//   3. Clamp [0, 100]
//
// Remplace la séquence computeMissionPriority → applyStrategyWeights dans l'engine.

import type { MissionType } from './types'
import type { TeachingStrategy } from '../teaching-strategy/types'

// Ajustements calendrier selon le type de pression et le type de mission
const CALENDAR_WEIGHTS_URGENT_EVAL: Partial<Record<MissionType, number>> = {
  evaluation:  +12,
  next_lesson: -5,
  work:        -3,
}

const CALENDAR_WEIGHTS_URGENT_SUBMISSION: Partial<Record<MissionType, number>> = {
  work:        +10,
  next_lesson: -5,
}

const CALENDAR_WEIGHTS_UPCOMING_BREAK: Partial<Record<MissionType, number>> = {
  evaluation:  +5,
  next_lesson: +3,
}

export interface MissionPriorityInput {
  basePriority: number
  missionType:  MissionType
  strategy:     TeachingStrategy
}

/**
 * Calcule la priorité finale d'une mission.
 *
 * Ordre d'application :
 *   1. basePriority (défini par le détecteur)
 *   2. strategy.modeWeights[missionType] (ajustement mode pédagogique)
 *   3. ajustements temporels calendrier (urgentEval, urgentSubmission, break)
 *   4. clamp [0, 100]
 */
export function calculateMissionPriority({
  basePriority,
  missionType,
  strategy,
}: MissionPriorityInput): number {
  let priority = basePriority

  // Pondération mode stratégique
  const modeBonus = strategy.modeWeights[missionType] ?? 0
  priority += modeBonus

  // Pondération calendrier
  if (strategy.temporal) {
    const { urgentEvalDeadlineCount, urgentSubmissionCount, nearestBreakDays } = strategy.temporal

    if (urgentEvalDeadlineCount > 0) {
      priority += CALENDAR_WEIGHTS_URGENT_EVAL[missionType] ?? 0
    }
    if (urgentSubmissionCount > 0) {
      priority += CALENDAR_WEIGHTS_URGENT_SUBMISSION[missionType] ?? 0
    }
    if (nearestBreakDays !== null && nearestBreakDays <= 7) {
      priority += CALENDAR_WEIGHTS_UPCOMING_BREAK[missionType] ?? 0
    }
  }

  return Math.max(0, Math.min(100, priority))
}
