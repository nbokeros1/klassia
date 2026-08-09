// ── Mission Engine (ME-08 / ME-09 / ME-10 / ME-11) ───────────────────────────
//
// Flux :
//   MissionDataContext
//     → TeacherBrain.buildSituation()          (TeacherSituation)
//     → TeachingStrategyEngine.buildStrategy() (TeachingStrategy)
//     → Détecteurs en parallèle                (missions brutes)
//     → calculateMissionPriority()             (priorité centralisée)
//     → tri final
//
// Les détecteurs ne reçoivent plus MissionDataContext directement (ME-08).
// ME-11 : detectDeadline reçoit aussi strategy pour arbitrage temporel.

import { calculateMissionPriority }    from './priority'
import type { Mission, MissionDataContext } from './types'
import { EMPTY_MISSION_CONTEXT }       from './types'
import { TeacherBrain }                from '../teacher-brain/teacher-brain'
import { TeachingStrategyEngine }      from '../teaching-strategy/strategy-engine'
import { detectNextLesson }            from './detectors/next-lesson'
import { detectEvaluation }            from './detectors/evaluation'
import { detectWork }                  from './detectors/work'
import { detectUnfinished }            from './detectors/unfinished'
import { detectConversation }          from './detectors/conversation'
import { detectStudentFollowUp }       from './detectors/student-follow-up'
import { detectDeadline }              from './detectors/deadline'
import { detectLessonStatus }          from './detectors/lesson-status'

export interface MissionEngine {
  run: () => Promise<Mission[]>
}

/**
 * Crée une instance du Mission Engine.
 *
 * @param context - Contexte de données chargé par MissionDataProvider
 */
export function createMissionEngine(context: MissionDataContext = EMPTY_MISSION_CONTEXT): MissionEngine {
  return {
    async run(): Promise<Mission[]> {
      // ── 1. Couche cognitive ──────────────────────────────────────────────
      const brain     = new TeacherBrain()
      const situation = brain.buildSituation(context)

      // ── 2. Couche stratégique ────────────────────────────────────────────
      const strategyEngine = new TeachingStrategyEngine()
      const strategy       = strategyEngine.buildStrategy(situation)

      // ── 3. Détecteurs en parallèle ───────────────────────────────────────
      const [
        fromNextLesson,
        fromEvaluation,
        fromWork,
        fromUnfinished,
        fromConversation,
        fromStudentFollowUp,
        fromDeadline,
        fromLessonStatus,
      ] = await Promise.all([
        detectNextLesson(situation),
        detectEvaluation(situation),
        detectWork(situation),
        detectUnfinished(situation),
        detectConversation(situation),
        detectStudentFollowUp(situation),
        detectDeadline(situation, strategy),
        detectLessonStatus(situation),
      ])

      const raw: Mission[] = [
        ...fromNextLesson,
        ...fromEvaluation,
        ...fromWork,
        ...fromUnfinished,
        ...fromConversation,
        ...fromStudentFollowUp,
        ...fromDeadline,
        ...fromLessonStatus,
      ]

      // ── 4. Priorité centralisée (mode + calendrier) ───────────────────────
      const scored = raw.map(m => ({
        ...m,
        priority: calculateMissionPriority({
          basePriority: m.priority,
          missionType:  m.type,
          strategy,
        }),
      }))

      // ── 5. Tri final ──────────────────────────────────────────────────────
      return scored.sort((a, b) => b.priority - a.priority)
    },
  }
}
