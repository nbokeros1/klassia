// SPIE-06 — PTE barrel export
// Pedagogical Time Engine

// Types
export * from './types/academic-time'
export * from './types/calendar-event'
export * from './types/recalculation'
export * from './types/impact'
export * from './types/recommendation'
export * from './types/clock'

// Engines
export { academicTimeBuilder, AcademicTimeBuilder } from './time/academic-time-builder'
export type { AcademicTimeInput } from './time/academic-time-builder'
export { pteCalendarEngine, PTECalendarEngine } from './calendar/pte-calendar-engine'
export { recalculationEngine, RecalculationEngine } from './recalculation/recalculation-engine'
export { timeImpactEngine, TimeImpactEngine } from './impact/time-impact-engine'
export { timeRecommendationEngine, TimeRecommendationEngine } from './recommendations/time-recommendation-engine'
export { academicClockBuilder, AcademicClockBuilder } from './clock/academic-clock'

// Services
export { academicTimeService, AcademicTimeService } from './services/academic-time.service'
export { pteCalendarService, PTECalendarService } from './services/pte-calendar.service'
export { recalculationService, RecalculationService } from './services/recalculation.service'
export { timeImpactService, TimeImpactService } from './services/time-impact.service'
export { timeRecommendationService, TimeRecommendationService } from './services/time-recommendation.service'
export { academicClockService, AcademicClockService } from './services/academic-clock.service'
