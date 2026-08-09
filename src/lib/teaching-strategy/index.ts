// ── Teaching Strategy Engine — API publique (ME-10 / ME-11) ──────────────────

export type {
  TeachingMode,
  TeachingPressureLevel,
  TemporalStrategyContext,
  TeachingStrategy,
  TeachingStrategyReason,
  RecommendedAction,
  StrategySignal,
  StrategyContribution,
} from './types'

export {
  TEACHING_MODE_PRIORITY,
  TEACHING_MODE_BASE_PRIORITY,
  MODE_PRIORITY_ADJUSTMENTS,
} from './types'

export { TeachingStrategyEngine, applyStrategyWeights } from './strategy-engine'
export { ProgressStrategyBuilder }  from './builders/progress-strategy'
export { WorkloadStrategyBuilder }  from './builders/workload-strategy'
export { StudentStrategyBuilder }   from './builders/student-strategy'
export { CalendarStrategyBuilder }  from './builders/calendar-strategy'
