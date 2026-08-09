// ── Execution Recipe — Types (ME-13.5) ────────────────────────────────────────
//
// Une recette décrit les actions à effectuer.
// Elle ne contient pas de statut d'exécution, de résumé ni d'IDs complets.
// Le WorkflowRuntime (ME-14) consomme l'ExecutionPlan final, pas la recette.

import type { MissionType }           from '../../mission-engine/types'
import type { ExecutionCapability }   from '../capabilities/execution-capability'
import type { ExecutionStepKind }     from '../types'
import type { ExecutionTarget }       from '../types'
import type { ExecutionRequirement }  from '../types'

export const EXECUTION_RECIPE_VERSION = 'execution-recipe-v1'
export const MAX_RECIPE_STEPS = 10

export interface ExecutionRecipeStep {
  code:               string
  capability:         ExecutionCapability

  // kind override (facultatif) — si absent, le catalogue fournit defaultKind
  kind?:              ExecutionStepKind

  title:              string
  description:        string

  target?:            ExecutionTarget | null
  requirements?:      ExecutionRequirement[]
  completionCriteria?: string[]
  estimatedMinutes?:  number | null
  optional?:          boolean
}

export interface ExecutionRecipe {
  id:         string
  sourceType: 'mission' | 'bundle'
  sourceId:   string
  missionType: MissionType | 'bundle'

  title:     string
  objective: string

  classeId: string | null
  matiere:  string | null

  steps: ExecutionRecipeStep[]

  targetRoute?: string | null
  version:      string
}
