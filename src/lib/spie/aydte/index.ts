// SPIE-04 — AYDTE barrel export
// Academic Year Digital Twin Engine

// Types
export * from './types/twin'
export * from './types/calendar'
export * from './types/pacing'
export * from './types/versioning'
export * from './types/impact'
export * from './types/planning'

// Engines
export { calendarEngine, CalendarEngine } from './calendar/calendar-engine'
export { pacingEngine, PacingEngine } from './pacing/pacing-engine'
export { annualPlanningEngine, AnnualPlanningEngine } from './planning/annual-planning-engine'
export { versionHistoryManager, VersionHistoryManager } from './versioning/version-history'
export { impactEngine, ImpactEngine } from './impact/impact-engine'

// Services
export { academicYearService, AcademicYearService } from './services/academic-year.service'
export { calendarEngineService, CalendarEngineService } from './services/calendar-engine.service'
export { pacingEngineService, PacingEngineService } from './services/pacing-engine.service'
export { annualPlanningService, AnnualPlanningService } from './services/annual-planning.service'
export { impactAnalysisService, ImpactAnalysisService } from './services/impact-analysis.service'
export { versionHistoryService, VersionHistoryService } from './services/version-history.service'
