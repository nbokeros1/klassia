'use client'

import { useMemo, useReducer, useEffect } from 'react'
import { useTeaching } from '@/contexts/enseigner/TeachingContext'
import type {
  ActivityTiming, SessionTiming, TimeAlert, TimeSuggestion,
  TimeStats, AlertSeverity, SuggestionType,
} from '@/types/enseigner/time-intelligence'

// ─── Force re-render every 10s for live estimates ────────────────────────────
const tick10s = (n: number) => n + 1

let _alertSeq = 0
function alertId(): string { return `alert_${Date.now()}_${++_alertSeq}` }
let _suggSeq  = 0
function suggId(): string { return `sugg_${Date.now()}_${++_suggSeq}` }

// ─── Core hook ────────────────────────────────────────────────────────────────

export function useTimeIntelligence() {
  const { state } = useTeaching()
  const [tick, forceUpdate] = useReducer(tick10s, 0)

  // Update every 10s while active
  useEffect(() => {
    if (state.sessionState !== 'active') return
    const id = setInterval(forceUpdate, 10_000)
    return () => clearInterval(id)
  }, [state.sessionState])

  const now = Date.now()

  // ── 1. Activity timings ───────────────────────────────────────────────────
  const activityTimings = useMemo<ActivityTiming[]>(() => {
    return state.activities.map(a => {
      const inProgress = a.etat === 'en_cours'
      const elapsed_ms = inProgress && a.started_at
        ? Math.max(0, now - a.started_at - (a.etat === 'en_cours' && state.sessionState === 'paused' ? 0 : 0))
        : 0
      const elapsed_min  = elapsed_ms / 60000
      const duree_reelle = a.duree_reelle != null ? a.duree_reelle
        : a.etat === 'terminee' && a.started_at && a.ended_at
          ? Math.round((a.ended_at - a.started_at) / 60000)
          : inProgress ? Math.round(elapsed_min) : 0
      return {
        activite_id:    a.id,
        activite_titre: a.titre,
        duree_prevue:   a.duree_prevue,
        duree_reelle,
        variance:       a.etat === 'terminee' ? Math.round(a.duree_prevue - duree_reelle) : 0,
        started_at:     a.started_at,
        ended_at:       a.ended_at,
        en_cours:       inProgress,
        elapsed_min,
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activities, state.sessionState, tick])

  // ── 2. Session timing ─────────────────────────────────────────────────────
  const sessionTiming = useMemo<SessionTiming>(() => {
    const duree_prevue_totale = state.meta?.duree_prevue ?? 60
    const duree_pause_totale  = state.totalPauseMs / 60000

    let duree_reelle_live = 0
    if (state.startedAt) {
      const rawMs = (state.sessionState === 'active' ? now : (state.pausedAt ?? now))
        - state.startedAt - state.totalPauseMs
      duree_reelle_live = Math.max(0, rawMs / 60000)
    }

    const variance_cumulative = activityTimings
      .filter(a => a.duree_reelle > 0 && !a.en_cours)
      .reduce((acc, a) => acc + a.variance, 0)

    // Remaining planned minutes for un-started activities
    const remaining_planned = state.activities
      .filter(a => a.etat === 'prevue' || a.etat === 'prete' || a.etat === 'en_cours')
      .reduce((sum, a) => sum + a.duree_prevue, 0)

    const heure_fin_prevue = state.startedAt
      ? state.startedAt + duree_prevue_totale * 60_000 + state.totalPauseMs
      : now + duree_prevue_totale * 60_000

    // Adjusted estimate: current elapsed + remaining planned (without accumulated delay)
    const estimated_remaining_ms = remaining_planned * 60_000
    const heure_fin_estimee = now + estimated_remaining_ms

    const percent_complete = duree_prevue_totale > 0
      ? Math.min(100, Math.round((duree_reelle_live / duree_prevue_totale) * 100))
      : 0

    return {
      duree_prevue_totale,
      duree_reelle_live: Math.round(duree_reelle_live * 10) / 10,
      duree_pause_totale: Math.round(duree_pause_totale * 10) / 10,
      variance_cumulative: Math.round(variance_cumulative * 10) / 10,
      heure_fin_prevue,
      heure_fin_estimee,
      heure_fin_ideale: heure_fin_prevue,
      percent_complete,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityTimings, state.startedAt, state.totalPauseMs, state.pausedAt, state.sessionState, state.meta, tick])

  // ── 3. Alerts ─────────────────────────────────────────────────────────────
  const alerts = useMemo<TimeAlert[]>(() => {
    const result: TimeAlert[] = []

    // Current activity over time
    const current = activityTimings[state.currentIndex]
    if (current?.en_cours && current.elapsed_min > 0) {
      const overMin = current.elapsed_min - current.duree_prevue
      if (overMin >= 10) {
        result.push({ id: alertId(), severity: 'critique', dismissed: false, emise_at: now,
          message: `${current.activite_titre} dépasse de ${Math.round(overMin)} min`,
          context: 'Retard critique sur l\'activité courante',
        })
      } else if (overMin >= 5) {
        result.push({ id: alertId(), severity: 'importante', dismissed: false, emise_at: now,
          message: `${current.activite_titre} dépasse de ${Math.round(overMin)} min`,
          context: 'Activité en dépassement important',
        })
      } else if (overMin >= 2) {
        result.push({ id: alertId(), severity: 'moyenne', dismissed: false, emise_at: now,
          message: `${current.activite_titre} dépasse de ${Math.round(overMin)} min`,
          context: 'Léger dépassement',
        })
      } else if (overMin >= -1 && current.duree_prevue > 0) {
        result.push({ id: alertId(), severity: 'douce', dismissed: false, emise_at: now,
          message: `${current.activite_titre} arrive à son terme`,
          context: `Durée prévue : ${current.duree_prevue} min`,
        })
      }
    }

    // Session global delay
    const { variance_cumulative } = sessionTiming
    if (variance_cumulative < -10) {
      result.push({ id: alertId(), severity: 'critique', dismissed: false, emise_at: now,
        message: `${Math.abs(Math.round(variance_cumulative))} min de retard accumulé`,
        context: 'Risque de ne pas terminer à temps',
      })
    } else if (variance_cumulative < -5) {
      result.push({ id: alertId(), severity: 'importante', dismissed: false, emise_at: now,
        message: `${Math.abs(Math.round(variance_cumulative))} min de retard cumulé`,
        context: 'Ajustements recommandés',
      })
    }

    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityTimings, sessionTiming, state.currentIndex, tick])

  // ── 4. Suggestions ────────────────────────────────────────────────────────
  const suggestions = useMemo<TimeSuggestion[]>(() => {
    const result: TimeSuggestion[] = []
    const { variance_cumulative } = sessionTiming
    const remaining = state.activities.filter(
      a => a.etat !== 'terminee' && a.etat !== 'annulee' && a.etat !== 'ignoree' && a.etat !== 'reportee'
    )

    if (variance_cumulative < -5 && remaining.length > 1) {
      result.push({
        id: suggId(), type: 'skip_next', activite_id: remaining[1]?.id ?? null, emise_at: now,
        message: 'Envisager d\'ignorer l\'activité suivante',
        justification: `Retard de ${Math.abs(Math.round(variance_cumulative))} min. Ça permet de récupérer du temps.`,
      })
    }

    if (variance_cumulative < -3 && remaining.length > 2) {
      result.push({
        id: suggId(), type: 'accelerate', activite_id: null, emise_at: now,
        message: 'Accélérer le rythme de l\'activité courante',
        justification: 'Léger retard — raccourcir sans sauter.',
      })
    }

    if (variance_cumulative > 5) {
      result.push({
        id: suggId(), type: 'bonus_review', activite_id: null, emise_at: now,
        message: 'Vous avez de l\'avance — revue bonus possible',
        justification: `Avance de ${Math.round(variance_cumulative)} min.`,
      })
    }

    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionTiming, state.activities, tick])

  // ── 5. Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo<TimeStats>(() => {
    const completed = activityTimings.filter(a => a.duree_reelle > 0 && !a.en_cours)
    const byType: Record<string, number[]> = {}

    state.activities.forEach((act, i) => {
      const t = activityTimings[i]
      if (t && t.duree_reelle > 0 && !t.en_cours) {
        if (!byType[act.type]) byType[act.type] = []
        byType[act.type].push(t.duree_reelle)
      }
    })

    const temps_moyen_par_type = Object.fromEntries(
      Object.entries(byType).map(([k, vals]) => [k, Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)])
    )

    const ecart_moyen_global = completed.length
      ? completed.reduce((s, a) => s + Math.abs(a.duree_prevue - a.duree_reelle), 0) / completed.length
      : 0

    const taux_respect = completed.length
      ? completed.filter(a => Math.abs(a.duree_prevue - a.duree_reelle) <= 2).length / completed.length
      : 0

    const temps_vraiment_enseigne = completed.reduce((s, a) => s + a.duree_reelle, 0)

    const overruns = completed.filter(a => a.duree_reelle > a.duree_prevue)
    const temps_perdu = overruns.reduce((s, a) => s + (a.duree_reelle - a.duree_prevue), 0)

    return {
      temps_moyen_par_type,
      ecart_moyen_global: Math.round(ecart_moyen_global * 10) / 10,
      taux_respect_durees: Math.round(taux_respect * 100) / 100,
      temps_vraiment_enseigne: Math.round(temps_vraiment_enseigne),
      temps_perdu: Math.round(temps_perdu),
    }
  }, [activityTimings, state.activities])

  // ── 6. Estimated end time (formatted) ────────────────────────────────────
  const estimatedEndDisplay = useMemo(() => {
    const ts = sessionTiming.heure_fin_estimee
    const d  = new Date(ts)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }, [sessionTiming.heure_fin_estimee])

  return {
    activityTimings,
    sessionTiming,
    alerts,
    suggestions,
    stats,
    estimatedEndDisplay,
    // Convenience
    hasAlerts:       alerts.length > 0,
    criticalAlerts:  alerts.filter(a => a.severity === 'critique'),
    topSuggestion:   suggestions[0] ?? null,
    isOnTime:        Math.abs(sessionTiming.variance_cumulative) <= 2,
    isAhead:         sessionTiming.variance_cumulative > 2,
    isBehind:        sessionTiming.variance_cumulative < -2,
  }
}
