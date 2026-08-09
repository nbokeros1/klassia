// ── Decision Engine — Public API (ME-12) ──────────────────────────────────────
//
// Usage:
//   const missions = await createMissionEngine(ctx).run()
//   const plan     = new DecisionEngine().run(missions)

export { DecisionEngine } from './decision-engine'

export type {
  MissionBundle,
  MissionSummary,
  MissionPlan,
} from './types'

export { MAX_SECONDARY } from './types'

export { PriorityRule }  from './rules/priority-rule'
export { DuplicateRule } from './rules/duplicate-rule'
export { ConflictRule }  from './rules/conflict-rule'
export { BundleRule }    from './rules/bundle-rule'
export { CapacityRule }  from './rules/capacity-rule'
