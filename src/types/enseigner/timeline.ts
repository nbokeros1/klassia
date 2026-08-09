// ─── KlassIA+ — Teaching Timeline types (SC-03C / SC-03F) ────────────────────
// Append-only event log — never UPDATE or DELETE

export type KlassEventType =
  | 'COURSE_STARTED'
  | 'COURSE_PAUSED'
  | 'COURSE_RESUMED'
  | 'COURSE_ENDED'
  | 'COURSE_PANIC'
  | 'ACTIVITY_STARTED'
  | 'ACTIVITY_COMPLETED'
  | 'ACTIVITY_PAUSED'
  | 'ACTIVITY_RESUMED'
  | 'ACTIVITY_SKIPPED'    // ignorée volontairement
  | 'ACTIVITY_REPORTED'   // reportée
  | 'ACTIVITY_CANCELLED'
  | 'ACTIVITY_MOVED'      // réordonnée
  | 'ACTIVITY_DUPLICATED'
  | 'ACTIVITY_MERGED'
  | 'ACTIVITY_ADDED'      // ajout à chaud
  | 'NOTE_ADDED'

export interface KlassEvent {
  id:         string
  type:       KlassEventType
  cours_id:   string        // lecon_id
  session_id: string        // unique par run (non pas par leçon)
  timestamp:  number        // Date.now() — server timestamp once Supabase table exists
  acteur:     'enseignant'
  payload:    Record<string, unknown>
}

export const EVENT_LABELS: Record<KlassEventType, string> = {
  COURSE_STARTED:      'Cours démarré',
  COURSE_PAUSED:       'Pause',
  COURSE_RESUMED:      'Reprise',
  COURSE_ENDED:        'Cours terminé',
  COURSE_PANIC:        'Mode imprévu',
  ACTIVITY_STARTED:    'Activité démarrée',
  ACTIVITY_COMPLETED:  'Activité terminée',
  ACTIVITY_PAUSED:     'Activité suspendue',
  ACTIVITY_RESUMED:    'Activité reprise',
  ACTIVITY_SKIPPED:    'Activité ignorée',
  ACTIVITY_REPORTED:   'Activité reportée',
  ACTIVITY_CANCELLED:  'Activité annulée',
  ACTIVITY_MOVED:      'Ordre modifié',
  ACTIVITY_DUPLICATED: 'Activité dupliquée',
  ACTIVITY_MERGED:     'Activités fusionnées',
  ACTIVITY_ADDED:      'Activité ajoutée',
  NOTE_ADDED:          'Note ajoutée',
}

export const EVENT_COLORS: Record<KlassEventType, string> = {
  COURSE_STARTED:      '#6C5CE7',
  COURSE_PAUSED:       '#F59E0B',
  COURSE_RESUMED:      '#22C55E',
  COURSE_ENDED:        '#6C5CE7',
  COURSE_PANIC:        '#EF4444',
  ACTIVITY_STARTED:    '#0EA5E9',
  ACTIVITY_COMPLETED:  '#22C55E',
  ACTIVITY_PAUSED:     '#F59E0B',
  ACTIVITY_RESUMED:    '#0EA5E9',
  ACTIVITY_SKIPPED:    '#8B97AC',
  ACTIVITY_REPORTED:   '#F59E0B',
  ACTIVITY_CANCELLED:  '#EF4444',
  ACTIVITY_MOVED:      '#8B5CF6',
  ACTIVITY_DUPLICATED: '#8B5CF6',
  ACTIVITY_MERGED:     '#8B5CF6',
  ACTIVITY_ADDED:      '#22C55E',
  NOTE_ADDED:          '#F59E0B',
}

export const EVENT_EMOJIS: Record<KlassEventType, string> = {
  COURSE_STARTED:      '▶',
  COURSE_PAUSED:       '⏸',
  COURSE_RESUMED:      '▶',
  COURSE_ENDED:        '🏁',
  COURSE_PANIC:        '⚠️',
  ACTIVITY_STARTED:    '○',
  ACTIVITY_COMPLETED:  '✓',
  ACTIVITY_PAUSED:     '⏸',
  ACTIVITY_RESUMED:    '↺',
  ACTIVITY_SKIPPED:    '⏩',
  ACTIVITY_REPORTED:   '📅',
  ACTIVITY_CANCELLED:  '✕',
  ACTIVITY_MOVED:      '↕',
  ACTIVITY_DUPLICATED: '⧉',
  ACTIVITY_MERGED:     '⊕',
  ACTIVITY_ADDED:      '+',
  NOTE_ADDED:          '📝',
}
