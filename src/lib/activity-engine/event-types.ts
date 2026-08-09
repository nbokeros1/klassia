// ── Activity Engine — Types d'événements (ME-15) ──────────────────────────────

export type ActivityType =
  | 'lesson_created'
  | 'lesson_updated'
  | 'lesson_deleted'
  | 'evaluation_created'
  | 'evaluation_updated'
  | 'evaluation_deleted'
  | 'document_uploaded'
  | 'document_deleted'
  | 'document_moved'
  | 'calendar_event_created'
  | 'calendar_event_updated'
  | 'calendar_event_deleted'
  | 'assignment_corrected'
  | 'feedback_added'
  | 'workflow_started'
  | 'workflow_paused'
  | 'workflow_resumed'
  | 'workflow_completed'
  | 'workflow_cancelled'
  | 'workflow_step_started'
  | 'workflow_step_completed'
  | 'workflow_step_skipped'
  | 'mission_completed'
  | 'mission_restored'
  | 'ia_conversation_started'
  | 'ia_document_generated'

export const ACTIVITY_TYPES: readonly ActivityType[] = Object.freeze([
  'lesson_created',          'lesson_updated',          'lesson_deleted',
  'evaluation_created',      'evaluation_updated',      'evaluation_deleted',
  'document_uploaded',       'document_deleted',        'document_moved',
  'calendar_event_created',  'calendar_event_updated',  'calendar_event_deleted',
  'assignment_corrected',    'feedback_added',
  'workflow_started',        'workflow_paused',         'workflow_resumed',
  'workflow_completed',      'workflow_cancelled',
  'workflow_step_started',   'workflow_step_completed', 'workflow_step_skipped',
  'mission_completed',       'mission_restored',
  'ia_conversation_started', 'ia_document_generated',
] as const)

export enum ActivitySource {
  USER     = 'USER',
  SYSTEM   = 'SYSTEM',
  WORKFLOW = 'WORKFLOW',
  API      = 'API',
  IMPORT   = 'IMPORT',
}

export interface ActivityEvent {
  id:         string
  type:       ActivityType
  occurredAt: string           // ISO 8601
  teacherId:  string
  classId:    string | null
  subject:    string | null
  entityId:   string
  entityType: string
  metadata:   Record<string, unknown>
  source:     ActivitySource
  version:    string
}

export const ACTIVITY_ENGINE_VERSION = 'ME-15.0'
