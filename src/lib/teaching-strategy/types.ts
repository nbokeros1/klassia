// ── Teaching Strategy Engine — Types (ME-10 / ME-11) ─────────────────────────
//
// Couche stratégique entre TeacherBrain et Mission Engine.
// TeachingStrategyEngine analyse TeacherSituation et produit une TeachingStrategy.
// Le Mission Engine applique la pondération de priorité issue de la stratégie
// sur les missions brutes retournées par les détecteurs.
//
// Hiérarchie des modes (plus haute = plus prioritaire en cas de conflit) :
//   REMEDIATION (6) > REDUCE_BACKLOG (5) > END_OF_UNIT (4)
//   > ASSESSMENT_PHASE (3) > ACCELERATE_PROGRESS (2) > NORMAL_PROGRESS (1)

import type { MissionType } from '../mission-engine/types'

// ── Mode pédagogique ──────────────────────────────────────────────────────────

export type TeachingMode =
  | 'NORMAL_PROGRESS'
  | 'ACCELERATE_PROGRESS'
  | 'REMEDIATION'
  | 'REDUCE_BACKLOG'
  | 'ASSESSMENT_PHASE'
  | 'END_OF_UNIT'

/** Poids de priorité relatif de chaque mode (pour résolution de conflits). */
export const TEACHING_MODE_PRIORITY: Record<TeachingMode, number> = {
  REMEDIATION:         6,
  REDUCE_BACKLOG:      5,
  END_OF_UNIT:         4,
  ASSESSMENT_PHASE:    3,
  ACCELERATE_PROGRESS: 2,
  NORMAL_PROGRESS:     1,
}

/** Urgence de la stratégie elle-même (0-100), indépendante des missions. */
export const TEACHING_MODE_BASE_PRIORITY: Record<TeachingMode, number> = {
  REMEDIATION:         90,
  REDUCE_BACKLOG:      80,
  END_OF_UNIT:         65,
  ASSESSMENT_PHASE:    70,
  ACCELERATE_PROGRESS: 60,
  NORMAL_PROGRESS:     50,
}

// ── Pondération par mode ──────────────────────────────────────────────────────

/**
 * Ajustements de priorité des missions selon le mode actif.
 * Valeur positive = mission plus urgente. Valeur négative = moins urgente.
 * Clampé à [0, 100] lors de l'application.
 */
export const MODE_PRIORITY_ADJUSTMENTS: Record<TeachingMode, Partial<Record<MissionType, number>>> = {
  NORMAL_PROGRESS: {},

  ACCELERATE_PROGRESS: {
    next_lesson: +10,
    evaluation:  +5,
    work:        -5,
  },

  REMEDIATION: {
    student_follow_up: +15,
    evaluation:        -10,
  },

  REDUCE_BACKLOG: {
    work:        +15,
    next_lesson: -15,
  },

  ASSESSMENT_PHASE: {
    evaluation: +20,
  },

  END_OF_UNIT: {
    evaluation:  +10,
    next_lesson: -5,
  },
}

// ── TeachingStrategy ──────────────────────────────────────────────────────────

// ── Pression temporelle (ME-11) ───────────────────────────────────────────────

/** Niveau de pression temporelle lié au calendrier. */
export type TeachingPressureLevel = 'low' | 'normal' | 'high' | 'urgent'

/** Contexte temporel issu de l'analyse du calendrier. */
export interface TemporalStrategyContext {
  nearestDeadlineDays:     number | null
  nearestBreakDays:        number | null
  urgentDeadlineCount:     number
  urgentEvalDeadlineCount: number
  urgentSubmissionCount:   number
}

// ── Stratégie ─────────────────────────────────────────────────────────────────

/** Justification d'un signal stratégique. */
export interface TeachingStrategyReason {
  code:        string
  description: string
  source:      'progress' | 'workload' | 'students' | 'calendar'
}

// ── Arbitrage (ME-11) ─────────────────────────────────────────────────────────

/**
 * Contribution pondérée d'un builder à l'arbitrage stratégique.
 * weightedScore = score * confidence — le score le plus élevé remporte.
 * Ordre de départage stable : REMEDIATION > ASSESSMENT_PHASE > REDUCE_BACKLOG
 *   > END_OF_UNIT > ACCELERATE_PROGRESS > NORMAL_PROGRESS
 */
export interface StrategyContribution {
  mode:          TeachingMode
  score:         number
  confidence:    number
  weightedScore: number
  reason:        TeachingStrategyReason
}

/** Action recommandée associée au mode actif. */
export interface RecommendedAction {
  missionType:  MissionType
  rationale:    string
  priorityBonus: number
}

/**
 * Stratégie pédagogique consolidée.
 * Produite par TeachingStrategyEngine à partir de TeacherSituation.
 * Consommée par le Mission Engine pour ajuster les priorités des missions.
 *
 * priority (0-100) : urgence globale de la stratégie (pas des missions individuelles).
 * confidence       : héritée de TeacherSituation.confidence.
 * modeWeights      : deltas à appliquer sur les priorités brutes des missions.
 * pressureLevel    : niveau de pression temporelle calendrier (ME-11, optionnel).
 * temporal         : contexte temporel détaillé (ME-11, optionnel).
 */
export interface TeachingStrategy {
  mode:               TeachingMode
  priority:           number
  confidence:         number
  reasons:            TeachingStrategyReason[]
  recommendedActions: RecommendedAction[]
  modeWeights:        Partial<Record<MissionType, number>>
  pressureLevel?:     TeachingPressureLevel
  temporal?:          TemporalStrategyContext
}

// ── Signal interne ────────────────────────────────────────────────────────────

/** Signal retourné par chaque builder — consommé uniquement par TeachingStrategyEngine. */
export interface StrategySignal {
  mode:   TeachingMode
  reason: TeachingStrategyReason
}
