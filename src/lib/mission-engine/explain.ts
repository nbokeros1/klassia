import type { Mission, MissionReason } from './types'

/**
 * Construit l'explication associée à une mission.
 * ME-01 : retourne la raison déjà présente sur la mission.
 * ME-02+ : enrichissement dynamique selon le contexte.
 */
export function buildMissionExplanation(mission: Mission): MissionReason {
  return mission.reason
}
