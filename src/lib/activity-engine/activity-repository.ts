// ── Activity Engine — Repository (ME-15) ──────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActivityEvent, ActivityType, ActivitySource } from './event-types'
import type { TimelineEntry, TimelineParams }               from './activity-summary'

// ── Interface ─────────────────────────────────────────────────────────────────

export interface ActivityRepository {
  save(event: ActivityEvent): Promise<void>
  getTimeline(teacherId: string, params?: TimelineParams): Promise<TimelineEntry[]>
  getCounts(teacherId: string, since: Date): Promise<Record<string, number>>
}

// ── Row → Model ───────────────────────────────────────────────────────────────

const EVENT_COLS = [
  'id', 'type', 'entity_type', 'entity_id',
  'class_id', 'subject', 'occurred_at', 'source', 'metadata',
].join(',')

function rowToTimeline(row: Record<string, unknown>): TimelineEntry {
  return {
    id:         row['id']          as string,
    type:       row['type']        as ActivityType,
    occurredAt: row['occurred_at'] as string,
    classId:    (row['class_id']   as string | null) ?? null,
    subject:    (row['subject']    as string | null) ?? null,
    entityId:   row['entity_id']   as string,
    entityType: row['entity_type'] as string,
    source:     row['source']      as ActivitySource,
    metadata:   (row['metadata']   as Record<string, unknown>) ?? {},
  }
}

// ── SupabaseActivityRepository ────────────────────────────────────────────────

export class SupabaseActivityRepository implements ActivityRepository {
  constructor(private supabase: SupabaseClient) {}

  async save(event: ActivityEvent): Promise<void> {
    const { error } = await this.supabase
      .from('activity_events')
      .insert({
        id:          event.id,
        teacher_id:  event.teacherId,
        type:        event.type,
        entity_type: event.entityType,
        entity_id:   event.entityId,
        class_id:    event.classId,
        subject:     event.subject,
        occurred_at: event.occurredAt,
        metadata:    event.metadata,
        source:      event.source,
        version:     event.version,
      })

    if (error) {
      console.error('[KLASSIA][ACTIVITY_REPO][SAVE_ERROR]', {
        type:     event.type,
        entityId: event.entityId,
        error:    error.message,
      })
    }
  }

  async getTimeline(teacherId: string, params: TimelineParams = {}): Promise<TimelineEntry[]> {
    const { limit = 50, classId, subject, type, since, until } = params

    let query = this.supabase
      .from('activity_events')
      .select(EVENT_COLS)
      .eq('teacher_id', teacherId)
      .order('occurred_at', { ascending: false })
      .limit(Math.min(Math.max(1, limit), 200))

    if (classId) query = query.eq('class_id', classId)
    if (subject) query = query.eq('subject',  subject)
    if (type)    query = query.eq('type',     type)
    if (since)   query = query.gte('occurred_at', since.toISOString())
    if (until)   query = query.lte('occurred_at', until.toISOString())

    const { data, error } = await query

    if (error || !data) return []
    return (data as unknown as Record<string, unknown>[]).map(rowToTimeline)
  }

  async getCounts(teacherId: string, since: Date): Promise<Record<string, number>> {
    const { data, error } = await this.supabase
      .from('activity_events')
      .select('type')
      .eq('teacher_id', teacherId)
      .gte('occurred_at', since.toISOString())

    if (error || !data) return {}

    const counts: Record<string, number> = {}
    for (const row of data as { type: string }[]) {
      counts[row.type] = (counts[row.type] ?? 0) + 1
    }
    return counts
  }
}
