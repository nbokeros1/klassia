import type { Mission, MissionType } from '../../mission-engine/types'
import type { MissionBundle }         from '../types'

export interface BundleRuleResult {
  missions: Mission[]
  bundles:  MissionBundle[]
}

// Paires fusionnables : type_évaluation + 'deadline'
// La deadline ici est la mission de type 'deadline' produite par detectDeadline.
const EVAL_TYPES = new Set<MissionType>(['evaluation', 'create_evaluation'])

/**
 * Fusionne les missions liées en bundles cohérents.
 *
 * Règle principale : evaluation (ou create_evaluation) + deadline → bundle.
 * La mission "lead" remplace les deux dans la liste active.
 * Les missions originales sont conservées dans bundle.missions (jamais supprimées).
 */
export class BundleRule {
  apply(missions: Mission[]): BundleRuleResult {
    const bundles:    MissionBundle[] = []
    const bundledIds  = new Set<string>()

    const evalMission    = missions.find(m => EVAL_TYPES.has(m.type))
    const deadlineMission = missions.find(m => m.type === 'deadline')

    if (evalMission && deadlineMission) {
      const priority = Math.max(evalMission.priority, deadlineMission.priority)
      const bundle: MissionBundle = {
        id:          `bundle:${evalMission.id}:${deadlineMission.id}`,
        title:       "Préparer et planifier l'évaluation",
        description: `${evalMission.title} — ${deadlineMission.title}`,
        missions:    [evalMission, deadlineMission],
        primaryType: evalMission.type,
        priority,
      }
      bundles.push(bundle)
      bundledIds.add(evalMission.id)
      bundledIds.add(deadlineMission.id)
    }

    // Missions restantes (hors bundlées)
    const remaining = missions.filter(m => !bundledIds.has(m.id))

    // Créer une mission "lead" pour chaque bundle (copie modifiée de la mission la plus prioritaire)
    const leads: Mission[] = bundles.map(b => {
      const top = b.missions.reduce((best, m) => (m.priority > best.priority ? m : best))
      return {
        ...top,
        id:          b.id,
        title:       b.title,
        description: b.description,
        priority:    b.priority,
        metadata:    { ...top.metadata, bundle_id: b.id },
      }
    })

    const merged = [...leads, ...remaining].sort((a, b) => b.priority - a.priority)
    return { missions: merged, bundles }
  }
}
