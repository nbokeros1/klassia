import type { Mission } from '../types'
import type { TeacherSituation } from '../../teacher-brain/types'

/**
 * Détecte les documents générés mais non finalisés.
 * ME-02 : architecture uniquement — logique métier à implémenter dans un sprint futur.
 */
export async function detectUnfinished(_situation: TeacherSituation): Promise<Mission[]> {
  return []
}
