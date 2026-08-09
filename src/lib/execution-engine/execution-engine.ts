// ── Execution Engine (ME-13.5) ─────────────────────────────────────────────────
//
// Transforme Mission | MissionBundle → ExecutionPlan.
// Synchrone, pur, sans appel réseau ni IA.
//
// Flux (ME-13.5) :
//   source (Mission | MissionBundle)
//     → buildExecutionContext()
//     → ExecutionRegistry.resolve()
//     → ExecutionTemplate.buildRecipe()
//     → ExecutionPlanBuilder.build()
//     → ExecutionPlan

import type { Mission }             from '../mission-engine/types'
import type { MissionBundle, MissionPlan } from '../decision-engine/types'
import type { ExecutionPlan }       from './types'
import type { ExecutionRouteRegistry }    from './execution-context'
import { buildExecutionContext, createExecutionRouteRegistry } from './execution-context'
import { ExecutionRegistry }        from './execution-registry'
import { ExecutionPlanBuilder }     from './builders/execution-plan-builder'
import { GenericTemplate }          from './templates/generic-template'

// ── Helpers internes ──────────────────────────────────────────────────────────

function isMissionBundle(source: Mission | MissionBundle): source is MissionBundle {
  return 'missions' in source && Array.isArray((source as MissionBundle).missions)
}

function isBundleLead(mission: Mission): boolean {
  return typeof mission.metadata['bundle_id'] === 'string'
}

// ── ExecutionEngine ───────────────────────────────────────────────────────────

export class ExecutionEngine {
  private readonly registry:    ExecutionRegistry
  private readonly routeReg:    ExecutionRouteRegistry
  private readonly planBuilder: ExecutionPlanBuilder

  constructor(options?: {
    registry?:      ExecutionRegistry
    routeRegistry?: ExecutionRouteRegistry
  }) {
    this.registry    = options?.registry      ?? new ExecutionRegistry()
    this.routeReg    = options?.routeRegistry ?? createExecutionRouteRegistry()
    this.planBuilder = new ExecutionPlanBuilder()
  }

  // ── createPlan ──────────────────────────────────────────────────────────────

  createPlan(source: Mission | MissionBundle): ExecutionPlan {
    const isBundle = isMissionBundle(source)

    const context = buildExecutionContext({
      mission:       isBundle ? null : source as Mission,
      bundle:        isBundle ? source as MissionBundle : null,
      routeRegistry: this.routeReg,
    })

    const template = this.registry.resolve(context)

    try {
      const recipe = template.buildRecipe(context)
      return this.planBuilder.build(recipe, context)
    } catch {
      // Fallback sûr en cas d'erreur de template ou de builder
      const recipe = new GenericTemplate().buildRecipe(context)
      return this.planBuilder.build(recipe, context)
    }
  }

  // ── createPlans ─────────────────────────────────────────────────────────────

  /**
   * Génère les plans d'exécution pour les missions visibles d'un MissionPlan.
   *
   * - primaryMission   → 1 plan (bundle si lead, mission sinon)
   * - secondaryMissions → plans pour chaque mission secondaire
   *
   * Ne génère PAS de plan pour deferredMissions, hiddenMissions,
   * completed ou dismissed.
   */
  createPlans(missionPlan: MissionPlan): {
    primary:   ExecutionPlan | null
    secondary: ExecutionPlan[]
  } {
    const primary   = missionPlan.primaryMission
      ? this.resolveAndBuild(missionPlan.primaryMission, missionPlan)
      : null

    const secondary = missionPlan.secondaryMissions.map(m =>
      this.resolveAndBuild(m, missionPlan),
    )

    return { primary, secondary }
  }

  // ── private helpers ─────────────────────────────────────────────────────────

  private resolveAndBuild(mission: Mission, missionPlan: MissionPlan): ExecutionPlan {
    if (isBundleLead(mission)) {
      const bundleId = mission.metadata['bundle_id'] as string
      const bundle   = missionPlan.bundles.find(b => b.id === bundleId)
      if (bundle) return this.createPlan(bundle)
    }
    return this.createPlan(mission)
  }
}
