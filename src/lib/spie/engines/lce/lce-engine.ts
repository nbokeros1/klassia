// LCE — Learning Continuity Engine
// Responsibility: ensure pedagogical coherence across the full school year.
// Detects gaps, monitors pacing, and suggests plan adjustments.
//
// Status: SPIE-01 — Interface and stubs only. Implementation in SPIE-06.
//
// Existing infrastructure this engine will delegate to:
//   - src/lib/teacher-brain/teacher-brain.ts
//   - src/lib/workflow-runtime/workflow-runtime.ts
//   - src/lib/mission-engine/ (Mission Engine)
//   - Tables: missions_enseignant, workflow_instances, evenements_calendrier

import type { LCEContinuityCheck, LCEContinuityReport } from './types'
import type { AcademicCalendar, WeekAvailability } from '../../types/calendar'

export interface ILCEEngine {
  // Check continuity and generate a continuity report
  checkContinuity(check: LCEContinuityCheck): Promise<LCEContinuityReport>

  // Get available weeks for planning (calendar-aware)
  getWeekAvailability(
    calendarId: string,
    fromDate: string,
    toDate: string,
  ): Promise<WeekAvailability[]>

  // Update the annual plan after a lesson is taught
  onLessonTaught(lessonId: string, classeId: string): Promise<void>

  // Recalibrate the annual plan after a calendar change
  recalibrateAnnualPlan(annualPlanId: string): Promise<void>
}

export class LCEEngine implements ILCEEngine {
  async checkContinuity(_check: LCEContinuityCheck): Promise<LCEContinuityReport> {
    throw new Error('LCEEngine.checkContinuity — not implemented (SPIE-06)')
  }

  async getWeekAvailability(
    _calendarId: string,
    _fromDate: string,
    _toDate: string,
  ): Promise<WeekAvailability[]> {
    throw new Error('LCEEngine.getWeekAvailability — not implemented (SPIE-06)')
  }

  async onLessonTaught(_lessonId: string, _classeId: string): Promise<void> {
    throw new Error('LCEEngine.onLessonTaught — not implemented (SPIE-06)')
  }

  async recalibrateAnnualPlan(_annualPlanId: string): Promise<void> {
    throw new Error('LCEEngine.recalibrateAnnualPlan — not implemented (SPIE-06)')
  }
}

export const lce = new LCEEngine()
