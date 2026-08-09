import type { Mission } from '../../mission-engine/types'

/**
 * Supprime les missions dupliquées.
 *
 * Deux niveaux de déduplication :
 *  1. Même `id` → ne garder que la première occurrence (tri priorité déjà appliqué).
 *  2. Même `type` → ne garder que la mission de plus haute priorité par type.
 *
 * Rationale: chaque détecteur produit au plus 1 mission (cascade). Deux missions
 * de même type ne peuvent apparaître que si plusieurs sources productrices
 * coexistent ou si le moteur est appelé plusieurs fois — ce qui ne doit pas
 * affecter le plan affiché.
 */
export class DuplicateRule {
  apply(missions: Mission[]): Mission[] {
    // Pass 1 : déduplication par id (premier = highest priority, car tri déjà appliqué)
    const seenIds  = new Set<string>()
    const uniqueId = missions.filter(m => {
      if (seenIds.has(m.id)) return false
      seenIds.add(m.id)
      return true
    })

    // Pass 2 : déduplication par type (même logique — premier = highest priority)
    const seenTypes = new Set<string>()
    return uniqueId.filter(m => {
      if (seenTypes.has(m.type)) return false
      seenTypes.add(m.type)
      return true
    })
  }
}
