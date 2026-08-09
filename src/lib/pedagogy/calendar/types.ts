// ── Calendar Intelligence — Types (ME-11) ─────────────────────────────────────
//
// Types canoniques du calendrier scolaire.
// Définis ici (pedagogy) — importés par mission-engine/types.ts.
//
// Garanties :
//   - Aucun import React, Supabase, LLM
//   - Déterministe et synchrone

// ── Types d'événements ────────────────────────────────────────────────────────

/** Types reconnus dans la table evenements_calendrier. */
export type CalendarEventType =
  | 'lecon'
  | 'evaluation'
  | 'devoir'
  | 'reunion_parents'
  | 'evenement'
  | 'rappel'
  | 'ferie'
  | 'calendrier_scolaire'
  | 'sortie'
  | 'reunion'
  | 'conge'
  | 'autre'

/** Portée d'un événement calendrier. */
export type CalendarEventScope = 'class' | 'school' | 'regional' | 'national'

// ── Snapshots ─────────────────────────────────────────────────────────────────

/**
 * Événement calendrier normalisé.
 * Remplace l'ancien CalendarEventSnapshot (ME-01) qui n'avait que id, titre, date, type.
 */
export interface CalendarEventSnapshot {
  id:         string
  titre:      string
  dateDebut:  Date
  dateFin:    Date | null
  heureDebut: string | null
  heureFin:   string | null
  type:       CalendarEventType
  scope:      CalendarEventScope
  classeId:   string | null
  matiere:    string | null
  couleur:    string | null
}

/**
 * Échéance extraite d'un événement calendrier (evaluation ou devoir).
 * urgencyDays = 0 → aujourd'hui, < 0 → passé, > 0 → futur.
 */
export interface CalendarDeadlineSnapshot {
  id:          string
  titre:       string
  date:        Date
  type:        'evaluation' | 'devoir' | 'autre'
  urgencyDays: number
  classeId:    string | null
  matiere:     string | null
}
