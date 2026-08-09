// ── Activity Engine — Orchestrateur + Handlers (ME-15) ────────────────────────
//
// Publie des événements métier normalisés.
// Ne crée aucune mission, ne prend aucune décision, ne modifie aucune priorité.

import type { SupabaseClient }                               from '@supabase/supabase-js'
import type { ActivityEvent, ActivityType }                  from './event-types'
import { ActivitySource, ACTIVITY_ENGINE_VERSION }           from './event-types'
import { ActivityBus }                                       from './event-bus'
import { ActivityRegistry }                                  from './event-registry'
import { EventDispatcher }                                   from './event-dispatcher'
import { SupabaseActivityRepository }                        from './activity-repository'
import type { ActivityRepository }                           from './activity-repository'
import { validateActivityEvent }                             from './activity-validator'
import { sanitizeMetadata, buildEventId }                    from './activity-sanitizer'
import {
  countsFromRecord, startOf,
  type ActivitySummary, type TimelineEntry, type TimelineParams,
} from './activity-summary'

// ── Base Handler ──────────────────────────────────────────────────────────────

abstract class BaseHandler {
  constructor(
    protected bus:       ActivityBus,
    protected teacherId: string,
  ) {}

  protected emit(
    type:       ActivityType,
    entityId:   string,
    entityType: string,
    classId:    string | null,
    subject:    string | null,
    metadata:   Record<string, unknown> = {},
    source:     ActivitySource = ActivitySource.SYSTEM,
  ): void {
    const event: ActivityEvent = {
      id:         buildEventId(),
      type,
      occurredAt: new Date().toISOString(),
      teacherId:  this.teacherId,
      classId,
      subject,
      entityId,
      entityType,
      metadata:   sanitizeMetadata(metadata),
      source,
      version:    ACTIVITY_ENGINE_VERSION,
    }
    this.bus.publish(event)
  }
}

// ── WorkflowHandler ───────────────────────────────────────────────────────────

export class WorkflowHandler extends BaseHandler {
  onStarted(workflowId: string, classId: string | null, subject: string | null, missionType?: string): void {
    this.emit('workflow_started', workflowId, 'workflow', classId, subject,
      missionType ? { missionType } : {}, ActivitySource.WORKFLOW)
  }

  onPaused(workflowId: string, classId: string | null, subject: string | null): void {
    this.emit('workflow_paused', workflowId, 'workflow', classId, subject, {}, ActivitySource.WORKFLOW)
  }

  onResumed(workflowId: string, classId: string | null, subject: string | null): void {
    this.emit('workflow_resumed', workflowId, 'workflow', classId, subject, {}, ActivitySource.WORKFLOW)
  }

  onCompleted(workflowId: string, classId: string | null, subject: string | null, progressPercent: number): void {
    this.emit('workflow_completed', workflowId, 'workflow', classId, subject,
      { progressPercent }, ActivitySource.WORKFLOW)
  }

  onCancelled(workflowId: string, classId: string | null, subject: string | null): void {
    this.emit('workflow_cancelled', workflowId, 'workflow', classId, subject, {}, ActivitySource.WORKFLOW)
  }

  onStepStarted(workflowId: string, stepId: string, classId: string | null, subject: string | null): void {
    this.emit('workflow_step_started', workflowId, 'workflow', classId, subject,
      { stepId }, ActivitySource.WORKFLOW)
  }

  onStepCompleted(workflowId: string, stepId: string, classId: string | null, subject: string | null, percent: number): void {
    this.emit('workflow_step_completed', workflowId, 'workflow', classId, subject,
      { stepId, percent }, ActivitySource.WORKFLOW)
  }

  onStepSkipped(workflowId: string, stepId: string, classId: string | null, subject: string | null): void {
    this.emit('workflow_step_skipped', workflowId, 'workflow', classId, subject,
      { stepId }, ActivitySource.WORKFLOW)
  }
}

// ── MissionHandler ────────────────────────────────────────────────────────────

export class MissionHandler extends BaseHandler {
  onCompleted(missionId: string, classId: string | null, subject: string | null, missionType?: string): void {
    this.emit('mission_completed', missionId, 'mission', classId, subject,
      missionType ? { missionType } : {}, ActivitySource.SYSTEM)
  }

  onRestored(missionId: string, classId: string | null, subject: string | null): void {
    this.emit('mission_restored', missionId, 'mission', classId, subject, {}, ActivitySource.SYSTEM)
  }
}

// ── LessonHandler ─────────────────────────────────────────────────────────────

export class LessonHandler extends BaseHandler {
  onCreated(lessonId: string, classId: string | null, subject: string | null, meta: Record<string, unknown> = {}): void {
    this.emit('lesson_created', lessonId, 'lesson', classId, subject, meta, ActivitySource.USER)
  }

  onUpdated(lessonId: string, classId: string | null, subject: string | null): void {
    this.emit('lesson_updated', lessonId, 'lesson', classId, subject, {}, ActivitySource.USER)
  }

  onDeleted(lessonId: string, classId: string | null, subject: string | null): void {
    this.emit('lesson_deleted', lessonId, 'lesson', classId, subject, {}, ActivitySource.USER)
  }
}

// ── EvaluationHandler ─────────────────────────────────────────────────────────

export class EvaluationHandler extends BaseHandler {
  onCreated(evaluationId: string, classId: string | null, subject: string | null, meta: Record<string, unknown> = {}): void {
    this.emit('evaluation_created', evaluationId, 'evaluation', classId, subject, meta, ActivitySource.USER)
  }

  onUpdated(evaluationId: string, classId: string | null, subject: string | null): void {
    this.emit('evaluation_updated', evaluationId, 'evaluation', classId, subject, {}, ActivitySource.USER)
  }

  onDeleted(evaluationId: string, classId: string | null, subject: string | null): void {
    this.emit('evaluation_deleted', evaluationId, 'evaluation', classId, subject, {}, ActivitySource.USER)
  }
}

// ── DocumentHandler ───────────────────────────────────────────────────────────

export class DocumentHandler extends BaseHandler {
  onUploaded(documentId: string, classId: string | null, subject: string | null, meta: Record<string, unknown> = {}): void {
    this.emit('document_uploaded', documentId, 'document', classId, subject, meta, ActivitySource.USER)
  }

  onDeleted(documentId: string, classId: string | null, subject: string | null): void {
    this.emit('document_deleted', documentId, 'document', classId, subject, {}, ActivitySource.USER)
  }

  onMoved(documentId: string, classId: string | null, subject: string | null, meta: Record<string, unknown> = {}): void {
    this.emit('document_moved', documentId, 'document', classId, subject, meta, ActivitySource.USER)
  }
}

// ── CalendarHandler ───────────────────────────────────────────────────────────

export class CalendarHandler extends BaseHandler {
  onCreated(eventId: string, classId: string | null, subject: string | null, meta: Record<string, unknown> = {}): void {
    this.emit('calendar_event_created', eventId, 'calendar_event', classId, subject, meta, ActivitySource.USER)
  }

  onUpdated(eventId: string, classId: string | null, subject: string | null): void {
    this.emit('calendar_event_updated', eventId, 'calendar_event', classId, subject, {}, ActivitySource.USER)
  }

  onDeleted(eventId: string, classId: string | null, subject: string | null): void {
    this.emit('calendar_event_deleted', eventId, 'calendar_event', classId, subject, {}, ActivitySource.USER)
  }
}

// ── ActivityEngine ────────────────────────────────────────────────────────────

export class ActivityEngine {
  readonly bus:        ActivityBus
  readonly registry:   ActivityRegistry
  readonly dispatcher: EventDispatcher
  private  repository: ActivityRepository

  // Handlers de domaine
  readonly workflow:    WorkflowHandler
  readonly mission:     MissionHandler
  readonly lesson:      LessonHandler
  readonly evaluation:  EvaluationHandler
  readonly document:    DocumentHandler
  readonly calendar:    CalendarHandler

  constructor(supabase: SupabaseClient, private teacherId: string) {
    this.bus        = new ActivityBus()
    this.registry   = new ActivityRegistry()
    this.dispatcher = new EventDispatcher(this.registry)
    this.repository = new SupabaseActivityRepository(supabase)

    // Le handler de persistance est enregistré dans le registry pour tous les types.
    // Le bus route chaque événement vers le dispatcher → registry → persistance.
    this.registry.register('*', (event) => {
      this.repository.save(event).catch(err => {
        console.error('[KLASSIA][ACTIVITY_ENGINE][PERSIST_ERROR]', {
          type: event.type,
          err:  String(err),
        })
      })
    })

    // Brancher le bus sur le dispatcher
    this.bus.subscribe('*', (event) => {
      this.dispatcher.dispatch(event)
    })

    // Initialiser les handlers de domaine
    this.workflow   = new WorkflowHandler(this.bus, teacherId)
    this.mission    = new MissionHandler(this.bus, teacherId)
    this.lesson     = new LessonHandler(this.bus, teacherId)
    this.evaluation = new EvaluationHandler(this.bus, teacherId)
    this.document   = new DocumentHandler(this.bus, teacherId)
    this.calendar   = new CalendarHandler(this.bus, teacherId)
  }

  // ── publish — point d'entrée générique validé ─────────────────────────────

  publish(event: ActivityEvent): void {
    const validation = validateActivityEvent(event)
    if (!validation.valid) {
      console.error('[KLASSIA][ACTIVITY_ENGINE][VALIDATION_ERROR]', {
        errors: validation.errors,
        type:   (event as Partial<ActivityEvent>).type,
      })
      return
    }
    this.bus.publish(event)
  }

  // ── Requêtes ──────────────────────────────────────────────────────────────

  async getTimeline(params?: TimelineParams): Promise<TimelineEntry[]> {
    return this.repository.getTimeline(this.teacherId, params)
  }

  async getSummary(): Promise<ActivitySummary> {
    const now   = new Date()
    const today = startOf('day',   now)
    const week  = startOf('week',  now)
    const month = startOf('month', now)

    const [todayCounts, weekCounts, monthCounts] = await Promise.all([
      this.repository.getCounts(this.teacherId, today),
      this.repository.getCounts(this.teacherId, week),
      this.repository.getCounts(this.teacherId, month),
    ])

    return {
      today: countsFromRecord(todayCounts),
      week:  countsFromRecord(weekCounts),
      month: countsFromRecord(monthCounts),
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createActivityEngine(supabase: SupabaseClient, teacherId: string): ActivityEngine {
  return new ActivityEngine(supabase, teacherId)
}
