'use client'

import { useMemo, useReducer, useEffect, useState, useCallback } from 'react'
import { useTeaching } from '@/contexts/enseigner/TeachingContext'
import {
  DEFAULT_FLOW_CONFIG,
  METHOD_FROM_ACTIVITY_TYPE,
  METHOD_PROFILES,
  INTERACTIVE_METHODS,
  REPLAY_COLORS,
} from '@/types/enseigner/flow-engine'
import type {
  FlowEngineConfig, FlowImbalance, FlowRecommendation,
  FlowIndicators, TeachingPaceScore, FlowReplayEvent,
  TeacherFlowProfile, PedagogicalMethod, FlowRecommendationType,
} from '@/types/enseigner/flow-engine'

// ─── Constants ────────────────────────────────────────────────────────────────

const PROFILE_KEY = 'KLASSIA_FLOW_PROFILE'
const CONFIG_KEY  = 'KLASSIA_FLOW_CONFIG'
const tick30s     = (n: number) => n + 1
let _seq = 0
const uid = () => `fi_${Date.now()}_${++_seq}`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadConfig(): FlowEngineConfig {
  if (typeof window === 'undefined') return DEFAULT_FLOW_CONFIG
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) return { ...DEFAULT_FLOW_CONFIG, ...(JSON.parse(raw) as Partial<FlowEngineConfig>) }
  } catch { /**/ }
  return DEFAULT_FLOW_CONFIG
}

function loadProfile(): TeacherFlowProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (raw) return JSON.parse(raw) as TeacherFlowProfile
  } catch { /**/ }
  return null
}

function adjustThresholds(cfg: FlowEngineConfig): FlowEngineConfig {
  const f = cfg.sensibilite === 'elevee' ? 0.7 : cfg.sensibilite === 'faible' ? 1.4 : 1
  return {
    ...cfg,
    transition_seuil_min:    cfg.transition_seuil_min * f,
    explication_seuil_min:   cfg.explication_seuil_min * f,
    interaction_seuil_min:   cfg.interaction_seuil_min * f,
    passif_consecutif_seuil: Math.round(cfg.passif_consecutif_seuil * (f > 1 ? 1.2 : 0.8)),
  }
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useFlowEngine() {
  const { state } = useTeaching()
  const [tick, forceUpdate] = useReducer(tick30s, 0)
  const [config, setConfigRaw] = useState<FlowEngineConfig>(loadConfig)
  const [profile, setProfile]  = useState<TeacherFlowProfile | null>(loadProfile)
  const [dismissed, setDismissed] = useState<Set<FlowRecommendationType>>(new Set())

  const cfg = useMemo(() => adjustThresholds(config), [config])
  const isActive = state.sessionState === 'active' || state.sessionState === 'paused'
  const now = Date.now()

  // Refresh every 30s during active session
  useEffect(() => {
    if (state.sessionState !== 'active') return
    const id = setInterval(forceUpdate, 30_000)
    return () => clearInterval(id)
  }, [state.sessionState])

  // Reset dismissed recommendations when activity changes
  useEffect(() => {
    setDismissed(new Set())
  }, [state.currentIndex])

  // Persist config
  const setConfig = useCallback((patch: Partial<FlowEngineConfig>) => {
    setConfigRaw(prev => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(CONFIG_KEY, JSON.stringify(next)) } catch { /**/ }
      return next
    })
  }, [])

  // Update profile when session ends (Mission 7)
  useEffect(() => {
    if (state.sessionState !== 'done') return
    const done = state.activities.filter(a => a.etat === 'terminee' && a.duree_reelle != null)
    if (!done.length) return

    setProfile(prev => {
      const p: TeacherFlowProfile = prev ?? {
        avg_duration_by_method: {}, method_counts: {}, sessions_analyzed: 0,
        tends_short_syntheses: false, tends_long_collaboratif: false,
        preferred_methods: [], updated_at: 0,
      }
      const next = { ...p, sessions_analyzed: p.sessions_analyzed + 1 }
      done.forEach(a => {
        const method = METHOD_FROM_ACTIVITY_TYPE[a.type] ?? 'magistral'
        const prev_avg = next.avg_duration_by_method[method] ?? a.duree_prevue
        next.avg_duration_by_method[method] = Math.round(prev_avg * 0.7 + (a.duree_reelle ?? a.duree_prevue) * 0.3)
        next.method_counts[method] = (next.method_counts[method] ?? 0) + 1
      })
      next.preferred_methods = (Object.entries(next.method_counts) as [PedagogicalMethod, number][])
        .sort(([, a], [, b]) => b - a).slice(0, 3).map(([m]) => m)
      const synths = state.activities.filter(a => a.type === 'cloture' && a.duree_reelle != null)
      if (synths.length > 0) {
        const shortCount = synths.filter(a => (a.duree_reelle ?? 0) < a.duree_prevue * 0.7).length
        next.tends_short_syntheses = shortCount / synths.length > 0.5
      }
      next.updated_at = Date.now()
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)) } catch { /**/ }
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sessionState])

  // ── Activity methods map ──────────────────────────────────────────────────

  const activityMethods = useMemo<PedagogicalMethod[]>(
    () => state.activities.map(a => METHOD_FROM_ACTIVITY_TYPE[a.type] ?? 'magistral'),
    [state.activities],
  )

  const completedPairs = useMemo(
    () => state.activities.map((a, i) => ({ a, method: activityMethods[i] })).filter(({ a }) => a.etat === 'terminee'),
    [state.activities, activityMethods],
  )

  // ── Flow Indicators (Mission 1) ───────────────────────────────────────────

  const indicators = useMemo<FlowIndicators>(() => {
    const methods = completedPairs.map(p => p.method)
    const unique  = new Set(methods)
    const n       = completedPairs.length

    const variation_pedagogique = n > 0 ? Math.min(1, unique.size / Math.min(n, 5)) : 0

    let activeMs = 0, passiveMs = 0
    completedPairs.forEach(({ a, method }) => {
      const eng = METHOD_PROFILES[method].engagement
      const ms  = (a.duree_reelle ?? a.duree_prevue) * 60_000
      if (eng === 'actif')      activeMs  += ms
      else if (eng === 'passif') passiveMs += ms
      else { activeMs += ms * 0.5; passiveMs += ms * 0.5 }
    })
    const totalMs = (activeMs + passiveMs) || 1
    const temps_actif_pct  = Math.round((activeMs / totalMs) * 100)
    const temps_passif_pct = 100 - temps_actif_pct

    // Transitions from timeline
    const completedEvts = state.timeline.filter(e => e.type === 'ACTIVITY_COMPLETED')
    const startedEvts   = state.timeline.filter(e => e.type === 'ACTIVITY_STARTED')
    let totalTransMin = 0, transN = 0
    completedEvts.forEach(ce => {
      const nxt = startedEvts.find(se => se.timestamp > ce.timestamp)
      if (nxt) { totalTransMin += (nxt.timestamp - ce.timestamp) / 60_000; transN++ }
    })
    const transitions_moy_min = transN > 0 ? Math.round((totalTransMin / transN) * 10) / 10 : 0

    // Méthode dominante → équilibre
    const freq: Partial<Record<PedagogicalMethod, number>> = {}
    methods.forEach(m => { freq[m] = (freq[m] ?? 0) + 1 })
    const maxFreq = Math.max(...Object.values(freq) as number[], 1)
    const equilibre_methodes = n > 0
      ? Math.max(0, Math.round((1 - (maxFreq / n - 1 / Math.max(unique.size, 1))) * 100) / 100)
      : 0

    const engagement_estime: 'bas' | 'moyen' | 'eleve' = temps_actif_pct >= 60 ? 'eleve' : temps_actif_pct >= 35 ? 'moyen' : 'bas'

    const avgReal = n > 0 ? completedPairs.reduce((s, { a }) => s + (a.duree_reelle ?? a.duree_prevue), 0) / n : 0
    const avgPlan = state.activities.length > 0 ? state.activities.reduce((s, a) => s + a.duree_prevue, 0) / state.activities.length : 0
    const rythme: 'lent' | 'equilibre' | 'soutenu' = avgReal === 0 ? 'equilibre'
      : avgReal < avgPlan * 0.85 ? 'soutenu' : avgReal > avgPlan * 1.15 ? 'lent' : 'equilibre'

    const variety_s = variation_pedagogique
    const rhythm_s  = Math.min(1, temps_actif_pct / 60)
    const trans_s   = Math.max(0, 1 - transitions_moy_min / 10)
    const equil_s   = equilibre_methodes
    const flow_score = Math.round((variety_s * 0.30 + rhythm_s * 0.25 + trans_s * 0.25 + equil_s * 0.20) * 100)

    return { flow_score, variation_pedagogique, temps_actif_pct, temps_passif_pct, transitions_moy_min, engagement_estime, rythme, equilibre_methodes }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedPairs, state.timeline, state.activities, tick])

  // ── Imbalance detection (Mission 3) ──────────────────────────────────────

  const imbalances = useMemo<FlowImbalance[]>(() => {
    if (!config.actif || !isActive) return []
    const result: FlowImbalance[] = []

    // 1. Passives consécutives
    let passStreak = 0
    state.activities.forEach((a, i) => {
      if (a.etat !== 'terminee' && a.etat !== 'en_cours') return
      if (METHOD_PROFILES[activityMethods[i]].engagement === 'passif') {
        passStreak++
        if (passStreak >= cfg.passif_consecutif_seuil) {
          result.push({ id: uid(), type: 'passif_consecutif', detected_at: now, activite_id: a.id, severite: 'moderee', message: `${passStreak} activités passives consécutives` })
        }
      } else { passStreak = 0 }
    })

    // 2. Transitions longues
    const cevts = state.timeline.filter(e => e.type === 'ACTIVITY_COMPLETED')
    const sevts = state.timeline.filter(e => e.type === 'ACTIVITY_STARTED')
    cevts.forEach(ce => {
      const nxt = sevts.find(se => se.timestamp > ce.timestamp)
      if (!nxt) return
      const delta = (nxt.timestamp - ce.timestamp) / 60_000
      if (delta > cfg.transition_seuil_min) {
        result.push({ id: uid(), type: 'transition_longue', detected_at: ce.timestamp, activite_id: null, severite: delta > cfg.transition_seuil_min * 2 ? 'elevee' : 'moderee', message: `Transition de ${Math.round(delta)} min` })
      }
    })

    // 3. Explication continue
    const curr = state.activities[state.currentIndex]
    if (curr?.etat === 'en_cours' && curr.started_at && activityMethods[state.currentIndex] === 'magistral') {
      const elapsed = (now - curr.started_at) / 60_000
      if (elapsed > cfg.explication_seuil_min) {
        result.push({ id: uid(), type: 'explication_continue', detected_at: now, activite_id: curr.id, severite: 'elevee', message: `Explication magistrale depuis ${Math.round(elapsed)} min` })
      }
    }

    // 4. Absence d'interaction
    const startTs = state.startedAt ?? now
    let lastInteraction = startTs
    state.timeline.forEach(e => {
      if (e.type !== 'ACTIVITY_COMPLETED') return
      const act = state.activities.find(a => a.id === (e.payload.activite_id as string))
      if (!act) return
      if (INTERACTIVE_METHODS.has(METHOD_FROM_ACTIVITY_TYPE[act.type] ?? 'magistral')) {
        lastInteraction = e.timestamp
      }
    })
    const sinceInteraction = (now - lastInteraction) / 60_000
    if (sinceInteraction > cfg.interaction_seuil_min && completedPairs.length > 2) {
      result.push({ id: uid(), type: 'absence_interaction', detected_at: now, activite_id: null, severite: 'moderee', message: `Aucune interaction depuis ${Math.round(sinceInteraction)} min` })
    }

    // 5. Peu de variété
    const methods = completedPairs.map(p => p.method)
    if (completedPairs.length >= 3 && new Set(methods).size === 1) {
      result.push({ id: uid(), type: 'peu_variete', detected_at: now, activite_id: null, severite: 'faible', message: `Toutes les activités utilisent la même méthode` })
    }

    // 6. Déséquilibre de temps
    const sessDur = state.meta?.duree_prevue ?? 60
    state.activities
      .filter(a => a.duree_prevue > sessDur * cfg.temps_domination_pct)
      .forEach(a => result.push({ id: uid(), type: 'desequilibre_temps', detected_at: now, activite_id: a.id, severite: 'faible', message: `"${a.titre}" occupe >${Math.round(cfg.temps_domination_pct * 100)}% du cours` }))

    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activities, state.timeline, state.currentIndex, activityMethods, completedPairs, cfg, isActive, config.actif, tick])

  // ── Recommendations (Mission 4) ───────────────────────────────────────────

  const recommendations = useMemo<FlowRecommendation[]>(() => {
    if (!config.actif) return []
    const active = (t: FlowRecommendationType) => config.types_actifs.includes(t) && !dismissed.has(t)
    const seen   = new Set<FlowRecommendationType>()
    const push   = (r: Omit<FlowRecommendation, 'id'>) => {
      if (seen.has(r.type)) return; seen.add(r.type)
      result.push({ id: uid(), ...r })
    }
    const result: FlowRecommendation[] = []

    imbalances.forEach(imb => {
      if (imb.type === 'passif_consecutif') {
        if (active('ajouter_question'))    push({ type: 'ajouter_question',    message: 'Posez une question ouverte à la classe',          justification: imb.message, contexte: imb.type, emise_at: now })
        if (active('convertir_discussion')) push({ type: 'convertir_discussion', message: 'Transformez cette activité en discussion',           justification: imb.message, contexte: imb.type, emise_at: now })
      }
      if (imb.type === 'explication_continue') {
        if (active('pause_active'))        push({ type: 'pause_active',        message: 'Pause active : 2 min de mouvement ou réflexion',    justification: imb.message, contexte: imb.type, emise_at: now })
        if (active('travail_binome'))      push({ type: 'travail_binome',       message: 'Faites travailler les élèves en binômes',           justification: imb.message, contexte: imb.type, emise_at: now })
        if (active('reduire_explication')) push({ type: 'reduire_explication',  message: 'Raccourcissez l\'explication et passez à l\'exemple', justification: imb.message, contexte: imb.type, emise_at: now })
      }
      if (imb.type === 'absence_interaction') {
        if (active('verification_comprehension')) push({ type: 'verification_comprehension', message: 'Vérification de compréhension : question rapide',  justification: imb.message, contexte: imb.type, emise_at: now })
      }
      if (imb.type === 'peu_variete') {
        if (active('changement_methode'))  push({ type: 'changement_methode',  message: 'Introduire une nouvelle méthode pédagogique',        justification: imb.message, contexte: imb.type, emise_at: now })
      }
    })

    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imbalances, config.actif, config.types_actifs, dismissed, tick])

  const dismissRecommendation = useCallback((type: FlowRecommendationType) => {
    setDismissed(prev => new Set([...prev, type]))
  }, [])

  // ── Teaching Pace Score (Mission 5) ──────────────────────────────────────

  const paceScore = useMemo<TeachingPaceScore>(() => {
    // Respect du temps (max 30)
    let rPts = 0, rMax = 0
    completedPairs.forEach(({ a }) => {
      rMax += 3
      if (a.duree_reelle == null) return
      const d = Math.abs(a.duree_prevue - a.duree_reelle)
      rPts += d <= 1 ? 3 : d <= 3 ? 2 : d <= 5 ? 1 : 0
    })
    const respect_temps = rMax > 0 ? Math.round((rPts / rMax) * 30) : 15

    const transitions = Math.round(Math.max(0, 1 - indicators.transitions_moy_min / 8) * 20)
    const variete     = Math.round(indicators.variation_pedagogique * 25)

    const origCount = state.activities.filter(a => a.type !== 'libre').length
    const unchanged = state.activities.filter(a => a.type !== 'libre' && a.etat !== 'annulee').length
    const storyboard = origCount > 0 ? Math.round((unchanged / origCount) * 15) : 15

    const liveAdds   = state.activities.filter(a => a.type === 'libre').length
    const ignoreN    = state.activities.filter(a => a.etat === 'ignoree').length
    const adaptations = Math.min(10, liveAdds * 2 + ignoreN * 1)

    const total = Math.min(100, respect_temps + transitions + variete + storyboard + adaptations)
    const niveau: TeachingPaceScore['niveau'] = total >= 80 ? 'expert' : total >= 60 ? 'confirme' : total >= 40 ? 'en_progression' : 'debutant'
    const interpretation = total >= 80 ? 'Séance très bien orchestrée' : total >= 60 ? 'Bon rythme global' : total >= 40 ? 'Rythme en développement' : 'Plusieurs axes d\'amélioration'

    return { total, composantes: { respect_temps, transitions, variete, storyboard, adaptations }, niveau, interpretation }
  }, [completedPairs, indicators, state.activities])

  // ── Flow Replay (Mission 6) ───────────────────────────────────────────────

  const replay = useMemo<FlowReplayEvent[]>(() => {
    if (!state.startedAt) return []
    const start = state.startedAt
    const events: FlowReplayEvent[] = [{ timestamp: start, elapsed_min: 0, label: 'Début du cours', quality: 'bon', annotation: state.meta?.lecon_titre ?? 'Séance', activite_id: null }]

    state.activities.forEach(a => {
      if (a.etat !== 'terminee' || !a.ended_at) return
      const elapsed = Math.round((a.ended_at - start) / 60_000)
      const dur = a.duree_reelle ?? a.duree_prevue
      const v   = a.duree_prevue - dur
      const quality: FlowReplayEvent['quality'] = Math.abs(v) <= 1 ? 'excellent' : Math.abs(v) <= 3 ? 'bon' : v < -5 ? 'attention' : 'moyen'
      const annotation = v > 1 ? `+${Math.round(Math.abs(v))} min d'avance` : v < -1 ? `+${Math.round(Math.abs(v))} min de retard` : 'Dans les temps'
      events.push({ timestamp: a.ended_at, elapsed_min: elapsed, label: `${a.emoji} ${a.titre}`, quality, annotation, activite_id: a.id })
    })

    imbalances.forEach(imb => {
      const elapsed = Math.round((imb.detected_at - start) / 60_000)
      events.push({ timestamp: imb.detected_at, elapsed_min: elapsed, label: imb.message, quality: 'attention', annotation: '', activite_id: imb.activite_id })
    })

    return events.sort((a, b) => a.timestamp - b.timestamp)
  }, [state.activities, state.startedAt, state.meta, imbalances])

  return {
    indicators,
    imbalances,
    recommendations,
    paceScore,
    replay,
    profile,
    config,
    setConfig,
    dismissRecommendation,
    // Convenience
    topRecommendation:  recommendations[0] ?? null,
    hasImbalances:      imbalances.length > 0,
    isEngineActive:     config.actif && isActive,
    REPLAY_COLORS,
  }
}
