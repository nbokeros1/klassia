// ── Teaching Strategy Engine (ME-10 / ME-11) ──────────────────────────────────
//
// Analyse TeacherSituation et produit une TeachingStrategy.
// Appelé par le Mission Engine APRÈS TeacherBrain.buildSituation().
//
// Garanties :
//   - Déterministe et synchrone
//   - Aucun appel IA / réseau
//   - Aucun import React

import type { TeacherSituation } from '../teacher-brain/types'
import type {
  TeachingStrategy,
  TeachingMode,
  TeachingPressureLevel,
  TemporalStrategyContext,
  StrategySignal,
  StrategyContribution,
  RecommendedAction,
} from './types'
import {
  TEACHING_MODE_PRIORITY,
  TEACHING_MODE_BASE_PRIORITY,
  MODE_PRIORITY_ADJUSTMENTS,
} from './types'
import { ProgressStrategyBuilder }  from './builders/progress-strategy'
import { WorkloadStrategyBuilder }  from './builders/workload-strategy'
import { StudentStrategyBuilder }   from './builders/student-strategy'
import { CalendarStrategyBuilder }  from './builders/calendar-strategy'
import type { Mission, MissionType } from '../mission-engine/types'

// Descriptions des actions recommandées par mode
const MODE_RECOMMENDED_ACTIONS: Record<TeachingMode, RecommendedAction[]> = {
  NORMAL_PROGRESS: [
    { missionType: 'next_lesson',   rationale: 'Progression régulière du curriculum',       priorityBonus: 0 },
  ],
  ACCELERATE_PROGRESS: [
    { missionType: 'next_lesson',   rationale: 'Accélérer la couverture du programme',      priorityBonus: +10 },
    { missionType: 'evaluation',    rationale: 'Valider la progression rapide',              priorityBonus: +5 },
  ],
  REMEDIATION: [
    { missionType: 'student_follow_up', rationale: 'Suivi renforcé des élèves en difficulté', priorityBonus: +15 },
    { missionType: 'evaluation',        rationale: 'Reporter les nouvelles évaluations',       priorityBonus: -10 },
  ],
  REDUCE_BACKLOG: [
    { missionType: 'work',        rationale: 'Réduire l\'accumulation de travaux',     priorityBonus: +15 },
    { missionType: 'next_lesson', rationale: 'Ralentir les nouvelles préparations',    priorityBonus: -15 },
  ],
  ASSESSMENT_PHASE: [
    { missionType: 'evaluation', rationale: 'Phase d\'évaluation prioritaire', priorityBonus: +20 },
  ],
  END_OF_UNIT: [
    { missionType: 'evaluation',  rationale: 'Évaluer l\'unité terminée',      priorityBonus: +10 },
    { missionType: 'next_lesson', rationale: 'Reporter la prochaine leçon',    priorityBonus: -5 },
  ],
}

/** Ordre de départage stable pour StrategyContribution (ME-11). */
const CONTRIBUTION_TIEBREAK: Record<TeachingMode, number> = {
  REMEDIATION:         6,
  ASSESSMENT_PHASE:    5,
  REDUCE_BACKLOG:      4,
  END_OF_UNIT:         3,
  ACCELERATE_PROGRESS: 2,
  NORMAL_PROGRESS:     1,
}

function signalToContribution(signal: StrategySignal, confidence: number): StrategyContribution {
  const score         = TEACHING_MODE_PRIORITY[signal.mode] / 6   // normalise à (0, 1]
  const weightedScore = score * confidence
  return { mode: signal.mode, score, confidence, weightedScore, reason: signal.reason }
}

function computePressureLevel(
  calendar: TeacherSituation['calendar'],
): TeachingPressureLevel {
  if (!calendar.hasUsableData) return 'low'
  if (calendar.urgentDeadlineCount > 0 && (calendar.nearestDeadlineDays ?? 999) <= 3) return 'urgent'
  if ((calendar.nearestDeadlineDays ?? 999) <= 7) return 'high'
  if (calendar.nearestBreakDays !== null || calendar.upcomingDeadlines.length > 0) return 'normal'
  return 'low'
}

export class TeachingStrategyEngine {
  private progressBuilder:  ProgressStrategyBuilder
  private workloadBuilder:  WorkloadStrategyBuilder
  private studentBuilder:   StudentStrategyBuilder
  private calendarBuilder:  CalendarStrategyBuilder

  constructor() {
    this.progressBuilder  = new ProgressStrategyBuilder()
    this.workloadBuilder  = new WorkloadStrategyBuilder()
    this.studentBuilder   = new StudentStrategyBuilder()
    this.calendarBuilder  = new CalendarStrategyBuilder()
  }

  /**
   * Analyse la situation pédagogique et détermine la stratégie optimale.
   *
   * Arbitrage ME-11 : chaque signal est converti en StrategyContribution
   * avec weightedScore = (TEACHING_MODE_PRIORITY / 6) * situation.confidence.
   * Le mode au weightedScore le plus élevé est sélectionné.
   * Tous les signals sont conservés dans `reasons` pour traçabilité.
   */
  buildStrategy(situation: TeacherSituation): TeachingStrategy {
    const rawSignals: StrategySignal[] = [
      this.progressBuilder.analyze(situation.progress),
      this.workloadBuilder.analyze(situation.workload),
      this.studentBuilder.analyze(situation.students),
      this.calendarBuilder.analyze(situation.calendar),
    ].filter((s): s is StrategySignal => s !== null)

    const contributions = rawSignals.map(s =>
      signalToContribution(s, situation.confidence),
    )

    // Sélectionner le mode gagnant par weightedScore, puis tie-break stable
    const primaryMode: TeachingMode = contributions.length > 0
      ? contributions.reduce((best, c) => {
          if (c.weightedScore > best.weightedScore) return c
          if (c.weightedScore === best.weightedScore) {
            return CONTRIBUTION_TIEBREAK[c.mode] > CONTRIBUTION_TIEBREAK[best.mode] ? c : best
          }
          return best
        }, contributions[0]).mode
      : 'NORMAL_PROGRESS'

    const pressureLevel = computePressureLevel(situation.calendar)

    const temporal: TemporalStrategyContext = {
      nearestDeadlineDays:     situation.calendar.nearestDeadlineDays,
      nearestBreakDays:        situation.calendar.nearestBreakDays,
      urgentDeadlineCount:     situation.calendar.urgentDeadlineCount,
      urgentEvalDeadlineCount: situation.calendar.urgentEvalDeadlineCount,
      urgentSubmissionCount:   situation.calendar.urgentSubmissionCount,
    }

    return {
      mode:               primaryMode,
      priority:           TEACHING_MODE_BASE_PRIORITY[primaryMode],
      confidence:         situation.confidence,
      reasons:            contributions.map(c => c.reason),
      recommendedActions: MODE_RECOMMENDED_ACTIONS[primaryMode],
      modeWeights:        MODE_PRIORITY_ADJUSTMENTS[primaryMode],
      pressureLevel,
      temporal,
    }
  }
}

/**
 * Applique la pondération de la stratégie sur les missions brutes.
 * Clampé à [0, 100].
 *
 * Appelé par le Mission Engine après collecte des missions des détecteurs.
 */
export function applyStrategyWeights(
  missions: Mission[],
  strategy: TeachingStrategy,
): Mission[] {
  const weights = strategy.modeWeights
  return missions.map(m => {
    const bonus = weights[m.type] ?? 0
    if (bonus === 0) return m
    return {
      ...m,
      priority: Math.max(0, Math.min(100, m.priority + bonus)),
    }
  })
}
