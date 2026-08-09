import type { Mission } from '../../mission-engine/types'

const URGENT_DEADLINE_THRESHOLD = 90

/**
 * Résout les conflits sémantiques entre missions.
 *
 * Conflit traité : deadline urgente (p ≥ 90) + next_lesson.
 * L'enseignant doit d'abord gérer l'urgence — la prochaine leçon passe au second plan.
 * La priorité de next_lesson est réduite de 20 points, ce qui la fera naturellement
 * glisser vers les missions secondaires ou reportées.
 */
export class ConflictRule {
  apply(missions: Mission[]): Mission[] {
    const hasUrgentDeadline = missions.some(
      m => m.type === 'deadline' && m.priority >= URGENT_DEADLINE_THRESHOLD,
    )

    if (!hasUrgentDeadline) return missions

    return missions.map(m => {
      if (m.type === 'next_lesson') {
        return { ...m, priority: Math.max(0, m.priority - 20) }
      }
      return m
    })
  }
}
