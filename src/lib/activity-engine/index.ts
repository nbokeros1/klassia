// ── Activity Engine — Index (ME-15) ───────────────────────────────────────────

export type { ActivityType, ActivityEvent }    from './event-types'
export { ActivitySource, ACTIVITY_TYPES, ACTIVITY_ENGINE_VERSION } from './event-types'

export { ActivityBus }                         from './event-bus'
export type { ActivityEventHandler }           from './event-bus'

export { ActivityRegistry }                    from './event-registry'
export type { RegistryHandler }                from './event-registry'

export { EventDispatcher }                     from './event-dispatcher'

export { validateActivityEvent }               from './activity-validator'
export type { ActivityValidationResult }       from './activity-validator'

export { sanitizeMetadata, buildEventId }      from './activity-sanitizer'

export type { ActivityRepository }             from './activity-repository'
export { SupabaseActivityRepository }          from './activity-repository'

export type {
  TimelineParams,
  TimelineEntry,
  ActivityCounts,
  ActivitySummary,
}                                              from './activity-summary'
export { countsFromRecord, startOf }           from './activity-summary'

export {
  ActivityEngine,
  createActivityEngine,
  WorkflowHandler,
  MissionHandler,
  LessonHandler,
  EvaluationHandler,
  DocumentHandler,
  CalendarHandler,
}                                              from './activity-engine'
