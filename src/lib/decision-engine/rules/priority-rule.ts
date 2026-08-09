import type { Mission } from '../../mission-engine/types'

/** Trie les missions par priorité décroissante. Toujours la première règle appliquée. */
export class PriorityRule {
  apply(missions: Mission[]): Mission[] {
    return [...missions].sort((a, b) => b.priority - a.priority)
  }
}
