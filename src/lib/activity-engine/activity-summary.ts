// ── Activity Engine — Summary & Timeline (ME-15) ──────────────────────────────

import type { ActivityType, ActivitySource } from './event-types'

// ── Timeline ──────────────────────────────────────────────────────────────────

export interface TimelineParams {
  limit?:   number
  classId?: string
  subject?: string
  type?:    ActivityType
  since?:   Date
  until?:   Date
}

export interface TimelineEntry {
  id:         string
  type:       ActivityType
  occurredAt: string
  classId:    string | null
  subject:    string | null
  entityId:   string
  entityType: string
  source:     ActivitySource
  metadata:   Record<string, unknown>
}

// ── Summary ───────────────────────────────────────────────────────────────────

export interface ActivityCounts {
  lessons:     number
  evaluations: number
  documents:   number
  workflows:   number
  total:       number
}

export interface ActivitySummary {
  today: ActivityCounts
  week:  ActivityCounts
  month: ActivityCounts
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LESSON_TYPES     = new Set<ActivityType>(['lesson_created',    'lesson_updated',    'lesson_deleted'])
const EVALUATION_TYPES = new Set<ActivityType>(['evaluation_created', 'evaluation_updated', 'evaluation_deleted'])
const DOCUMENT_TYPES   = new Set<ActivityType>(['document_uploaded',  'document_deleted',  'document_moved'])
const WORKFLOW_TYPES   = new Set<ActivityType>([
  'workflow_started', 'workflow_completed', 'workflow_cancelled',
  'workflow_paused',  'workflow_resumed',
])

export function countsFromRecord(record: Record<string, number>): ActivityCounts {
  let lessons = 0, evaluations = 0, documents = 0, workflows = 0, total = 0

  for (const [type, count] of Object.entries(record)) {
    total += count
    if (LESSON_TYPES.has(type as ActivityType))     lessons     += count
    if (EVALUATION_TYPES.has(type as ActivityType)) evaluations += count
    if (DOCUMENT_TYPES.has(type as ActivityType))   documents   += count
    if (WORKFLOW_TYPES.has(type as ActivityType))   workflows   += count
  }

  return { lessons, evaluations, documents, workflows, total }
}

export function startOf(unit: 'day' | 'week' | 'month', from = new Date()): Date {
  const d = new Date(from)
  if (unit === 'day') {
    d.setHours(0, 0, 0, 0)
  } else if (unit === 'week') {
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
  } else {
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
  }
  return d
}
