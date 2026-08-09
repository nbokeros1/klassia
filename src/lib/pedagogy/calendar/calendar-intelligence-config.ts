// ── Calendar Intelligence — Config (ME-11) ────────────────────────────────────

export interface CalendarIntelligenceConfig {
  /** Fenêtre de chargement des événements à venir (jours). */
  eventWindowDays: number
  /** Seuil d'urgence absolue : échéance dans ≤ N jours. */
  urgentDeadlineDays: number
  /** Seuil d'échéance proche : dans ≤ N jours. */
  upcomingDeadlineDays: number
  /** Seuil de congé proche : congé dans ≤ N jours. */
  breakWindowDays: number
}

export const DEFAULT_CALENDAR_INTELLIGENCE_CONFIG: CalendarIntelligenceConfig = {
  eventWindowDays:      45,
  urgentDeadlineDays:   3,
  upcomingDeadlineDays: 7,
  breakWindowDays:      7,
}
