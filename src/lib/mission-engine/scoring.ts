import type { Mission, MissionPriority } from './types'

/**
 * Calcule la priorité finale d'une mission.
 * Si la mission porte déjà une priorité, elle est conservée telle quelle.
 * Sinon la priorité par défaut est 50 (neutre).
 */
export function computeMissionPriority(mission: Partial<Mission>): MissionPriority {
  return mission.priority ?? 50
}
