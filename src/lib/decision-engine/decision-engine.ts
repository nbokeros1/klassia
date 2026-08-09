import type { Mission }                       from '../mission-engine/types'
import type { MissionPlan, MissionSummary }   from './types'
import { PriorityRule }                        from './rules/priority-rule'
import { DuplicateRule }                       from './rules/duplicate-rule'
import { ConflictRule }                        from './rules/conflict-rule'
import { BundleRule }                          from './rules/bundle-rule'
import { CapacityRule }                        from './rules/capacity-rule'

// ── Summary builder ───────────────────────────────────────────────────────────

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n > 1 ? pluralForm : singular}`
}

function buildSummary(plan: Omit<MissionPlan, 'summary'>): MissionSummary {
  const primaryCount   = plan.primaryMission ? 1 : 0
  const secondaryCount = plan.secondaryMissions.length
  const deferredCount  = plan.deferredMissions.length
  const hiddenCount    = plan.hiddenMissions.length
  const bundleCount    = plan.bundles.length
  const totalMissions  = primaryCount + secondaryCount + deferredCount + hiddenCount

  const parts: string[] = []
  if (primaryCount   > 0) parts.push('1 priorité absolue')
  if (secondaryCount > 0) parts.push(plural(secondaryCount, 'tâche secondaire', 'tâches secondaires'))
  if (deferredCount  > 0) parts.push(plural(deferredCount,  'reportée', 'reportées'))

  const label = parts.length > 0
    ? `Aujourd'hui : ${parts.join(', ')}`
    : "Aucune tâche pour aujourd'hui"

  return { totalMissions, primaryCount, secondaryCount, deferredCount, hiddenCount, bundleCount, label }
}

// ── Decision Engine ───────────────────────────────────────────────────────────

/**
 * Moteur d'arbitrage : transforme Mission[] en MissionPlan cohérent.
 *
 * Pipeline (ordre strict) :
 *   1. PriorityRule  — tri par priorité
 *   2. DuplicateRule — suppression des doublons (id + type)
 *   3. ConflictRule  — résolution des conflits sémantiques
 *   4. PriorityRule  — re-tri après ajustements de conflits
 *   5. BundleRule    — fusion de missions liées (evaluation + deadline)
 *   6. CapacityRule  — répartition primary / secondary / deferred / hidden
 *   7. Summary       — résumé lisible
 */
export class DecisionEngine {
  private readonly priorityRule  = new PriorityRule()
  private readonly duplicateRule = new DuplicateRule()
  private readonly conflictRule  = new ConflictRule()
  private readonly bundleRule    = new BundleRule()
  private readonly capacityRule  = new CapacityRule()

  run(missions: Mission[]): MissionPlan {
    let active = this.priorityRule.apply(missions)
    active     = this.duplicateRule.apply(active)
    active     = this.conflictRule.apply(active)
    active     = this.priorityRule.apply(active)       // re-tri après conflits

    const { missions: bundled, bundles } = this.bundleRule.apply(active)

    const partial = this.capacityRule.apply(bundled, bundles)
    const summary = buildSummary(partial)

    return { ...partial, summary }
  }
}
