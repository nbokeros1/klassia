import type { Mission }      from '../../mission-engine/types'
import type { MissionBundle } from '../types'
import { MAX_SECONDARY }      from '../types'

export interface CapacityResult {
  primaryMission:    Mission | null
  secondaryMissions: Mission[]
  deferredMissions:  Mission[]
  hiddenMissions:    Mission[]
  bundles:           MissionBundle[]
}

/**
 * Répartit les missions selon la capacité cognitive de l'enseignant.
 *
 * Schéma :
 *   - hiddenMissions  : completed / dismissed (jamais supprimées de la DB)
 *   - primaryMission  : 1 seule (mission la plus prioritaire visible)
 *   - secondaryMissions : MAX_SECONDARY (3)
 *   - deferredMissions : tout le reste
 */
export class CapacityRule {
  apply(missions: Mission[], bundles: MissionBundle[] = []): CapacityResult {
    const hidden  = missions.filter(m => m.status === 'completed' || m.status === 'dismissed')
    const visible = missions.filter(m => m.status !== 'completed' && m.status !== 'dismissed')

    const primary   = visible[0] ?? null
    const secondary = visible.slice(1, 1 + MAX_SECONDARY)
    const deferred  = visible.slice(1 + MAX_SECONDARY)

    return {
      primaryMission:    primary,
      secondaryMissions: secondary,
      deferredMissions:  deferred,
      hiddenMissions:    hidden,
      bundles,
    }
  }
}
