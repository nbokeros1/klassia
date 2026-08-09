// ── Workflow Runtime — Types (ME-14) ──────────────────────────────────────────

import type { ExecutionPlan, ExecutionTarget } from '../execution-engine/types'
import type { MissionType }                    from '../mission-engine/types'

export type { ExecutionPlan }

// ── Statuts ───────────────────────────────────────────────────────────────────

export type WorkflowStatus =
  | 'not_started'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'blocked'

export type WorkflowStepStatus =
  | 'pending'
  | 'available'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'blocked'

// ── Instance et étape ────────────────────────────────────────────────────────

export interface WorkflowInstance {
  id:               string
  enseignantId:     string
  missionId:        string | null
  missionKey:       string
  executionPlanId:  string
  sourceType:       'mission' | 'bundle'
  sourceId:         string
  missionType:      MissionType | 'bundle'
  status:           WorkflowStatus
  planVersion:      string
  plan:             ExecutionPlan
  steps:            WorkflowStepState[]
  currentStepId:    string | null
  progressPercent:  number
  startedAt:        Date | null
  pausedAt:         Date | null
  completedAt:      Date | null
  cancelledAt:      Date | null
  version:          number
  createdAt:        Date
  updatedAt:        Date
}

export interface WorkflowStepState {
  id:                  string
  workflowInstanceId:  string
  stepId:              string
  order:               number
  status:              WorkflowStepStatus
  startedAt:           Date | null
  completedAt:         Date | null
  skippedAt:           Date | null
  completionNote:      string | null
}

// ── Actions du client ─────────────────────────────────────────────────────────

export type WorkflowAction =
  | { type: 'start_workflow' }
  | { type: 'start_step';      stepId: string }
  | { type: 'complete_step';   stepId: string; note?: string }
  | { type: 'skip_step';       stepId: string; note?: string }
  | { type: 'pause_workflow' }
  | { type: 'resume_workflow' }
  | { type: 'cancel_workflow'; reason?: string }
  | { type: 'reopen_step';     stepId: string }
  | { type: 'refresh_blocking_state' }

// ── Codes d'erreur ────────────────────────────────────────────────────────────

export type WorkflowErrorCode =
  | 'WORKFLOW_ALREADY_COMPLETED'
  | 'WORKFLOW_CANCELLED'
  | 'INVALID_WORKFLOW_TRANSITION'
  | 'WORKFLOW_BLOCKED'
  | 'STEP_NOT_AVAILABLE'
  | 'STEP_NOT_OPTIONAL'
  | 'STEP_NOT_FOUND'
  | 'PREVIOUS_STEP_INCOMPLETE'
  | 'STEP_ALREADY_COMPLETED'
  | 'WORKFLOW_NOT_ACTIVE'
  | 'WORKFLOW_VERSION_CONFLICT'
  | 'WORKFLOW_INTEGRITY_ERROR'
  | 'INSTANCE_ALREADY_EXISTS'
  | 'INVALID_EXECUTION_PLAN'

export interface WorkflowError {
  code:    WorkflowErrorCode
  message: string
}

export type WorkflowResult<T> =
  | { ok: true;  data:  T }
  | { ok: false; error: WorkflowError }

// ── Progression ───────────────────────────────────────────────────────────────

export interface WorkflowProgress {
  percent:                number
  completedRequiredSteps: number
  totalRequiredSteps:     number
  completedOptionalSteps: number
  skippedOptionalSteps:   number
  remainingRequiredSteps: number
}

// ── Intégrité ─────────────────────────────────────────────────────────────────

export interface WorkflowIntegrityError {
  code:    string
  message: string
}

export interface WorkflowIntegrityResult {
  valid:  boolean
  errors: WorkflowIntegrityError[]
}

// ── Réponse publique ──────────────────────────────────────────────────────────

export interface WorkflowStepPublic {
  id:                 string
  order:              number
  kind:               string
  title:              string
  description:        string
  status:             WorkflowStepStatus
  target:             ExecutionTarget | null
  completionCriteria: string[]
  estimatedMinutes:   number | null
  optional:           boolean
  blockingLabels:     string[]
}

export interface WorkflowPublic {
  id:              string
  missionKey:      string
  executionPlanId: string
  status:          WorkflowStatus
  title:           string
  objective:       string
  missionType:     MissionType | 'bundle'
  classeId:        string | null
  matiere:         string | null
  currentStepId:   string | null
  progress:        WorkflowProgress
  steps:           WorkflowStepPublic[]
  canPause:        boolean
  canResume:       boolean
  canCancel:       boolean
  version:         number
  updatedAt:       string
}

export interface WorkflowSummary {
  exists:          boolean
  workflowId:      string | null
  executionPlanId: string
  status:          WorkflowStatus | null
  progressPercent: number | null
  currentStepId:   string | null
}

// ── Paramètres de création ────────────────────────────────────────────────────

export interface CreateWorkflowParams {
  enseignantId:   string
  missionId:      string | null
  missionKey:     string
  executionPlan:  ExecutionPlan
}
