// ── Mission Engine — Calendar Provider (ME-11) ──────────────────────────────
//
// Charge les événements et échéances depuis evenements_calendrier.
// La sécurité est assurée par RLS (enseignant_id = auth.uid()).
//
// loadEvents   : events in [today, today+windowDays], owned by enseignantId,
//                belonging to classeId OR school-wide (classe_id IS NULL)
// loadDeadlines: derived from events of type 'evaluation' | 'devoir' | 'autre'

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CalendarEventSnapshot,
  CalendarDeadlineSnapshot,
  CalendarEventType,
  CalendarEventScope,
} from '../types'
import { DEFAULT_CALENDAR_INTELLIGENCE_CONFIG } from '../../pedagogy/calendar/calendar-intelligence-config'

interface CalendarProviderDeps {
  supabase: SupabaseClient
}

function toDateObj(raw: string | null): Date | null {
  return raw ? new Date(raw) : null
}

function toTimeStr(raw: string | null): string | null {
  if (!raw) return null
  return raw.slice(0, 5)
}

function toDays(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000)
}

function deadlineType(evtType: string): 'evaluation' | 'devoir' | 'autre' {
  if (evtType === 'evaluation') return 'evaluation'
  if (evtType === 'devoir')     return 'devoir'
  return 'autre'
}

function inferScope(row: { classe_id: string | null }): CalendarEventScope {
  return row.classe_id ? 'class' : 'school'
}

export class CalendarProvider {
  private supabase: SupabaseClient

  constructor({ supabase }: CalendarProviderDeps) {
    this.supabase = supabase
  }

  /**
   * Charge les événements calendrier de l'enseignant dans la fenêtre à venir.
   * Sécurité : RLS garantit que seuls les événements de l'enseignant sont retournés.
   */
  async loadEvents(
    enseignantId: string,
    classeId:     string,
    _matiere:     string | null,
    windowDays    = DEFAULT_CALENDAR_INTELLIGENCE_CONFIG.eventWindowDays,
  ): Promise<CalendarEventSnapshot[]> {
    const today   = new Date()
    const todayIso = today.toISOString().split('T')[0]
    const endDate  = new Date(today)
    endDate.setDate(today.getDate() + windowDays)
    const endIso = endDate.toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('evenements_calendrier')
      .select('id, titre, date_debut, date_fin, heure_debut, heure_fin, type, couleur, classe_id')
      .eq('enseignant_id', enseignantId)
      .gte('date_debut', todayIso)
      .lte('date_debut', endIso)
      .order('date_debut')

    if (error || !data) return []

    return data
      .filter((row: { classe_id: string | null }) =>
        row.classe_id === null || row.classe_id === classeId,
      )
      .map((row: {
        id: string
        titre: string
        date_debut: string
        date_fin: string | null
        heure_debut: string | null
        heure_fin: string | null
        type: string
        couleur: string | null
        classe_id: string | null
      }): CalendarEventSnapshot => ({
        id:         row.id,
        titre:      row.titre,
        dateDebut:  new Date(row.date_debut + 'T00:00:00'),
        dateFin:    row.date_fin ? new Date(row.date_fin + 'T00:00:00') : null,
        heureDebut: toTimeStr(row.heure_debut),
        heureFin:   toTimeStr(row.heure_fin),
        type:       row.type as CalendarEventType,
        scope:      inferScope(row),
        classeId:   row.classe_id,
        matiere:    null,
        couleur:    row.couleur,
      }))
  }

  /**
   * Dérive les échéances depuis les événements de type evaluation/devoir.
   * urgencyDays = 0 → aujourd'hui, > 0 → futur, < 0 → passé.
   */
  async loadDeadlines(
    enseignantId: string,
    classeId:     string,
    matiere:      string | null,
    today         = new Date(),
    windowDays    = DEFAULT_CALENDAR_INTELLIGENCE_CONFIG.eventWindowDays,
  ): Promise<CalendarDeadlineSnapshot[]> {
    const events = await this.loadEvents(enseignantId, classeId, matiere, windowDays)

    return events
      .filter(e => e.type === 'evaluation' || e.type === 'devoir' || e.type === 'autre')
      .map((e): CalendarDeadlineSnapshot => ({
        id:          e.id,
        titre:       e.titre,
        date:        e.dateDebut,
        type:        deadlineType(e.type as string),
        urgencyDays: toDays(today, e.dateDebut),
        classeId:    e.classeId,
        matiere:     e.matiere,
      }))
  }
}
