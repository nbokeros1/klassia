// ── Execution Engine — Types (ME-13 / ME-13.5) ───────────────────────────────

import type { Mission, MissionType }        from '../mission-engine/types'
import type { MissionBundle, MissionPlan }  from '../decision-engine/types'
import type { ExecutionCapability }         from './capabilities/execution-capability'

export type { ExecutionCapability }

export type { MissionBundle, MissionPlan }

// ── Cible d'une étape ─────────────────────────────────────────────────────────

export type ExecutionTargetType =
  | 'route'
  | 'document'
  | 'class'
  | 'student_follow_up'
  | 'calendar_event'
  | 'mission_action'
  | 'none'

/**
 * Destination navigable associée à une étape.
 * route + query permettent au Dashboard de construire le lien exact.
 */
export interface ExecutionTarget {
  type:        ExecutionTargetType
  route:       string | null
  query:       Record<string, string>
  referenceId: string | null
}

// ── Exigences et critères ────────────────────────────────────────────────────

export interface ExecutionRequirement {
  code:      string
  label:     string
  satisfied: boolean
  blocking:  boolean
}

// ── Étape ────────────────────────────────────────────────────────────────────

export type ExecutionStepKind =
  | 'review'
  | 'select'
  | 'prepare'
  | 'create'
  | 'correct'
  | 'verify'
  | 'navigate'
  | 'confirm'
  | 'complete'

/**
 * ME-13 : pending/available/blocked utilisés.
 * completed/skipped préparés pour ME-14 (persistance d'avancement).
 */
export type ExecutionStepStatus =
  | 'pending'
  | 'available'
  | 'blocked'
  | 'completed'
  | 'skipped'

export interface ExecutionStep {
  id:                 string
  order:              number
  capability:         ExecutionCapability
  kind:               ExecutionStepKind
  title:              string
  description:        string
  status:             ExecutionStepStatus
  target:             ExecutionTarget | null
  requirements:       ExecutionRequirement[]
  completionCriteria: string[]
  estimatedMinutes:   number | null
  optional:           boolean
}

// ── Plan ─────────────────────────────────────────────────────────────────────

export interface ExecutionPlanSummary {
  totalSteps:        number
  actionableSteps:   number
  blockedSteps:      number
  estimatedMinutes:  number | null
  firstActionLabel:  string | null
}

/**
 * Plan d'exécution complet d'une mission ou d'un bundle.
 * Contient uniquement des données publiques — aucune donnée sensible.
 */
export interface ExecutionPlan {
  id:                  string
  sourceType:          'mission' | 'bundle'
  sourceId:            string
  missionType:         MissionType | 'bundle'
  title:               string
  objective:           string
  classeId:            string | null
  matiere:             string | null
  steps:               ExecutionStep[]
  summary:             ExecutionPlanSummary
  canStart:            boolean
  blockingReasons:     string[]
  targetRoute:         string | null
  createdFromVersion:  string
}

// ── Réponse combinée ──────────────────────────────────────────────────────────

/** Réponse serveur combinant le plan de missions et les plans d'exécution. */
export interface MissionExecutionResponse {
  missionPlan: MissionPlan
  execution: {
    primary:   ExecutionPlan | null
    secondary: ExecutionPlan[]
  }
}
