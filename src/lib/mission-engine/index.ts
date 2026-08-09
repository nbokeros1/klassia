// ── Mission Engine — API publique ───────────────────────────────────────────

// Types de base
export type {
  Mission,
  MissionReason,
  MissionStatus,
  MissionType,
  MissionPriority,
  // Snapshots
  EnseignantSnapshot,
  ClasseSnapshot,
  DocumentSnapshot,
  MessageSnapshot,
  CalendarEventSnapshot,
  // Contexte de données
  MissionDataContext,
  // Preuves
  MissionEvidence,
  MissionEvidenceSource,
  // Persistance (ME-05)
  MissionAction,
  MissionStateSnapshot,
  // Erreurs
  MissionDataErrorCode,
} from './types'

export { EMPTY_MISSION_CONTEXT } from './types'
export { MissionDataError }      from './types'

// Moteur
export { createMissionEngine }     from './engine'
export type { MissionEngine }      from './engine'
export { computeMissionPriority }  from './scoring'
export { buildMissionExplanation } from './explain'

// Providers
export { MissionDataProvider }   from './providers/mission-data'
export { DocumentsProvider }     from './providers/documents-provider'
export { PlanningProvider }      from './providers/planning-provider'
export { HistoryProvider }       from './providers/history-provider'
export { CalendarProvider }      from './providers/calendar-provider'
export { StudentProvider }       from './providers/student-provider'
export { MissionStateProvider, isMissionTransitionError } from './providers/mission-state-provider'
export type { MissionTransitionError } from './providers/mission-state-provider'

// Détecteurs (utilitaires exportés pour les tests)
export { detectNextLesson, extractSuggestedTopic } from './detectors/next-lesson'
