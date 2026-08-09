// ── Teacher Brain — API publique (ME-08 / ME-09 / ME-11) ─────────────────────

export type {
  TeacherProgress,
  TeacherWorkload,
  TeacherClassroom,
  TeacherStudentInsights,
  TeacherStudentPriority,
  TeacherStudentPriorityReason,
  TeacherCalendar,
  TeacherSituationReferences,
  TeacherSituation,
} from './types'

export { TeacherBrain, CONFIDENCE_THRESHOLD_SUGGEST } from './teacher-brain'
export { ProgressBuilder }  from './builders/progress-builder'
export { WorkloadBuilder }  from './builders/workload-builder'
export { ClassroomBuilder } from './builders/classroom-builder'
export { StudentBuilder }   from './builders/student-builder'
export { CalendarBuilder }  from './builders/calendar-builder'
