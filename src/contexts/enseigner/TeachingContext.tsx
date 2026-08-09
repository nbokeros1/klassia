'use client'

import {
  createContext, useContext, useReducer, useCallback, useRef, useEffect,
  type ReactNode,
} from 'react'
import type {
  TeachingActivity, TeachingSessionMeta, QuickNote,
  IASuggestion, SessionState, ActivityState,
} from '@/types/enseigner'
import type { KlassEvent, KlassEventType } from '@/types/enseigner/timeline'
import {
  reorderActivities, duplicateActivity, mergeActivities, createLiveActivity,
  moveUp, moveDown,
} from '@/utils/enseigner/storyboard.utils'

// ─── Event factory ────────────────────────────────────────────────────────────

function mkEvent(
  type: KlassEventType,
  cours_id: string,
  session_id: string,
  payload: Record<string, unknown> = {},
): KlassEvent {
  return {
    id:         `ev_${Date.now()}_${type}`,
    type,
    cours_id,
    session_id,
    timestamp:  Date.now(),
    acteur:     'enseignant',
    payload,
  }
}

function newSessionId(): string {
  return `sid_${Date.now().toString(36)}`
}

// ─── State ────────────────────────────────────────────────────────────────────

export interface TeachingState {
  meta:          TeachingSessionMeta | null
  activities:    TeachingActivity[]
  currentIndex:  number
  sessionState:  SessionState
  startedAt:     number | null
  pausedAt:      number | null
  totalPauseMs:  number
  notes:         QuickNote[]
  suggestion:    IASuggestion | null
  timeline:      KlassEvent[]
  session_id:    string | null
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'INIT';            meta: TeachingSessionMeta; activities: TeachingActivity[] }
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'BEGIN_END' }
  | { type: 'CANCEL_END' }
  | { type: 'CONFIRM_END' }
  | { type: 'NAVIGATE';        index: number }
  | { type: 'ACTIVITY_COMPLETE'; id: string }
  | { type: 'ACTIVITY_REPORT'; id: string }
  | { type: 'ACTIVITY_CANCEL'; id: string }
  | { type: 'ACTIVITY_IGNORE'; id: string }
  | { type: 'ACTIVITY_REORDER'; fromIndex: number; toIndex: number }
  | { type: 'ACTIVITY_MOVE_UP';   index: number }
  | { type: 'ACTIVITY_MOVE_DOWN'; index: number }
  | { type: 'ACTIVITY_DUPLICATE'; index: number }
  | { type: 'ACTIVITY_MERGE';   indexA: number; indexB: number }
  | { type: 'ACTIVITY_ADD_LIVE'; titre: string; dureeMin: number; objectif: string; contenu: string; insertAfterIndex: number }
  | { type: 'ADD_NOTE';        note: QuickNote }
  | { type: 'DELETE_NOTE';     id: string }
  | { type: 'SET_SUGGESTION';  suggestion: IASuggestion | null }
  | { type: 'DISMISS_SUGGESTION' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INITIAL: TeachingState = {
  meta: null, activities: [], currentIndex: 0,
  sessionState: 'idle', startedAt: null, pausedAt: null,
  totalPauseMs: 0, notes: [], suggestion: null,
  timeline: [], session_id: null,
}

const SKIP_STATES = new Set<ActivityState>(['terminee', 'annulee', 'reportee', 'ignoree'])

function markNextPrete(activities: TeachingActivity[], currentIdx: number): TeachingActivity[] {
  return activities.map((a, i) =>
    i === currentIdx + 1 && a.etat === 'prevue'
      ? { ...a, etat: 'prete' as ActivityState }
      : a
  )
}

function nextActiveIdx(activities: TeachingActivity[], afterIdx: number, fallback: number): number {
  const i = activities.findIndex((a, idx) => idx > afterIdx && !SKIP_STATES.has(a.etat))
  return i >= 0 ? i : fallback
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: TeachingState, action: Action): TeachingState {
  const cId = state.meta?.lecon_id ?? 'unknown'
  const sId = state.session_id     ?? 'unknown'
  const ev  = (t: KlassEventType, p: Record<string, unknown> = {}) => mkEvent(t, cId, sId, p)

  switch (action.type) {

    // ─── Init ────────────────────────────────────────────────────────────────
    case 'INIT':
      return { ...INITIAL, meta: action.meta, activities: action.activities, session_id: newSessionId() }

    // ─── Course lifecycle ─────────────────────────────────────────────────────
    case 'START': {
      const now = Date.now()
      const sid = state.session_id ?? newSessionId()
      const activities = state.activities.map((a, i) => ({
        ...a,
        etat:       (i === 0 ? 'en_cours' : i === 1 ? 'prete' : 'prevue') as ActivityState,
        started_at: i === 0 ? now : null,
      }))
      const first = activities[0]
      const events: KlassEvent[] = [
        mkEvent('COURSE_STARTED', cId, sid, {
          lecon_titre:  state.meta?.lecon_titre,
          duree_prevue: state.meta?.duree_prevue,
        }),
      ]
      if (first) events.push(mkEvent('ACTIVITY_STARTED', cId, sid, {
        activite_id:   first.id,
        activite_titre: first.titre,
        duree_prevue:  first.duree_prevue,
      }))
      return {
        ...state,
        sessionState: 'active', startedAt: now, session_id: sid,
        activities, currentIndex: 0,
        timeline: [...state.timeline, ...events],
      }
    }

    case 'PAUSE':
      return {
        ...state,
        sessionState: 'paused', pausedAt: Date.now(),
        timeline: [...state.timeline, ev('COURSE_PAUSED')],
      }

    case 'RESUME': {
      const pauseMs = state.pausedAt ? Date.now() - state.pausedAt : 0
      return {
        ...state,
        sessionState: 'active', pausedAt: null,
        totalPauseMs: state.totalPauseMs + pauseMs,
        timeline: [...state.timeline, ev('COURSE_RESUMED', { pause_ms: pauseMs })],
      }
    }

    case 'BEGIN_END':
      return { ...state, sessionState: 'closing' }

    case 'CANCEL_END':
      return { ...state, sessionState: state.startedAt ? 'active' : 'idle' }

    case 'CONFIRM_END': {
      const terminees = state.activities.filter(a => a.etat === 'terminee').length
      return {
        ...state,
        sessionState: 'done',
        timeline: [...state.timeline, ev('COURSE_ENDED', {
          total_ms:  state.startedAt ? Date.now() - state.startedAt - state.totalPauseMs : 0,
          terminees,
          total:     state.activities.length,
          notes:     state.notes.length,
        })],
      }
    }

    // ─── Navigation ──────────────────────────────────────────────────────────
    case 'NAVIGATE': {
      const idx = Math.max(0, Math.min(action.index, state.activities.length - 1))
      const now = Date.now()
      let didStart = false
      const activities = state.activities.map((a, i) => {
        if (i !== idx) return a
        if (a.etat === 'prevue' || a.etat === 'prete') {
          didStart = true
          return { ...a, etat: 'en_cours' as ActivityState, started_at: now }
        }
        return a
      })
      const finalActivities = markNextPrete(activities, idx)
      const newAct = finalActivities[idx]
      return {
        ...state,
        currentIndex: idx,
        activities: finalActivities,
        timeline: didStart && newAct
          ? [...state.timeline, ev('ACTIVITY_STARTED', {
              activite_id:    newAct.id,
              activite_titre: newAct.titre,
              duree_prevue:   newAct.duree_prevue,
            })]
          : state.timeline,
      }
    }

    // ─── Activity transitions ─────────────────────────────────────────────────
    case 'ACTIVITY_COMPLETE': {
      const now = Date.now()
      const idx = state.activities.findIndex(a => a.id === action.id)
      if (idx < 0) return state
      const act        = state.activities[idx]
      const dureeReelle = act.started_at
        ? Math.round((now - act.started_at) / 60000)
        : null

      const after = state.activities.map((a, i) => {
        if (a.id === action.id) return { ...a, etat: 'terminee' as ActivityState, ended_at: now, duree_reelle: dureeReelle }
        if (i === idx + 1 && a.etat === 'prevue') return { ...a, etat: 'prete' as ActivityState }
        return a
      })

      const newCurrent   = nextActiveIdx(after, idx, state.currentIndex)
      const finalActivities = after.map((a, i) => {
        if (i === newCurrent && (a.etat === 'prete' || a.etat === 'prevue')) {
          return { ...a, etat: 'en_cours' as ActivityState, started_at: now }
        }
        return a
      })

      const events: KlassEvent[] = [ev('ACTIVITY_COMPLETED', {
        activite_id:    act.id,
        activite_titre: act.titre,
        duree_prevue:   act.duree_prevue,
        duree_reelle:   dureeReelle,
        variance_min:   dureeReelle != null ? dureeReelle - act.duree_prevue : null,
      })]
      if (newCurrent !== state.currentIndex) {
        const nextAct = finalActivities[newCurrent]
        if (nextAct) events.push(ev('ACTIVITY_STARTED', {
          activite_id:    nextAct.id,
          activite_titre: nextAct.titre,
          duree_prevue:   nextAct.duree_prevue,
        }))
      }

      return {
        ...state,
        activities: finalActivities,
        currentIndex: newCurrent,
        timeline: [...state.timeline, ...events],
      }
    }

    case 'ACTIVITY_REPORT': {
      const act = state.activities.find(a => a.id === action.id)
      return {
        ...state,
        activities: state.activities.map(a => a.id === action.id ? { ...a, etat: 'reportee' as ActivityState } : a),
        timeline: [...state.timeline, ev('ACTIVITY_REPORTED', { activite_id: action.id, activite_titre: act?.titre })],
      }
    }

    case 'ACTIVITY_CANCEL': {
      const act = state.activities.find(a => a.id === action.id)
      return {
        ...state,
        activities: state.activities.map(a => a.id === action.id ? { ...a, etat: 'annulee' as ActivityState } : a),
        timeline: [...state.timeline, ev('ACTIVITY_CANCELLED', { activite_id: action.id, activite_titre: act?.titre })],
      }
    }

    case 'ACTIVITY_IGNORE': {
      const act = state.activities.find(a => a.id === action.id)
      return {
        ...state,
        activities: state.activities.map(a => a.id === action.id ? { ...a, etat: 'ignoree' as ActivityState } : a),
        timeline: [...state.timeline, ev('ACTIVITY_SKIPPED', { activite_id: action.id, activite_titre: act?.titre })],
      }
    }

    // ─── Storyboard mutations ─────────────────────────────────────────────────
    case 'ACTIVITY_REORDER':
      return {
        ...state,
        activities: reorderActivities(state.activities, action.fromIndex, action.toIndex),
        timeline: [...state.timeline, ev('ACTIVITY_MOVED', { from: action.fromIndex, to: action.toIndex })],
      }

    case 'ACTIVITY_MOVE_UP': {
      const a = moveUp(state.activities, action.index)
      return { ...state, activities: a, timeline: [...state.timeline, ev('ACTIVITY_MOVED', { from: action.index, to: action.index - 1 })] }
    }

    case 'ACTIVITY_MOVE_DOWN': {
      const a = moveDown(state.activities, action.index)
      return { ...state, activities: a, timeline: [...state.timeline, ev('ACTIVITY_MOVED', { from: action.index, to: action.index + 1 })] }
    }

    case 'ACTIVITY_DUPLICATE': {
      const src = state.activities[action.index]
      const { activities, newId } = duplicateActivity(state.activities, action.index)
      return {
        ...state, activities,
        timeline: [...state.timeline, ev('ACTIVITY_DUPLICATED', { source_id: src?.id, new_id: newId })],
      }
    }

    case 'ACTIVITY_MERGE': {
      const actA = state.activities[action.indexA]
      const actB = state.activities[action.indexB]
      return {
        ...state,
        activities: mergeActivities(state.activities, action.indexA, action.indexB),
        timeline: [...state.timeline, ev('ACTIVITY_MERGED', { a: actA?.titre, b: actB?.titre })],
      }
    }

    case 'ACTIVITY_ADD_LIVE': {
      const leconId = state.meta?.lecon_id ?? 'live'
      const { activities, newId } = createLiveActivity(
        leconId, action.titre, action.dureeMin, action.objectif, action.contenu,
        action.insertAfterIndex, state.activities,
      )
      return {
        ...state, activities,
        timeline: [...state.timeline, ev('ACTIVITY_ADDED', { new_id: newId, titre: action.titre, duree_prevue: action.dureeMin })],
      }
    }

    // ─── Notes ───────────────────────────────────────────────────────────────
    case 'ADD_NOTE':
      return {
        ...state,
        notes: [...state.notes, action.note],
        timeline: [...state.timeline, ev('NOTE_ADDED', { tag: action.note.tag, priorite: action.note.priorite })],
      }

    case 'DELETE_NOTE':
      return { ...state, notes: state.notes.filter(n => n.id !== action.id) }

    // ─── IA ──────────────────────────────────────────────────────────────────
    case 'SET_SUGGESTION':
      return { ...state, suggestion: action.suggestion }

    case 'DISMISS_SUGGESTION':
      return { ...state, suggestion: null }

    default:
      return state
  }
}

// ─── Context interface ────────────────────────────────────────────────────────

export interface TeachingContextValue {
  state:             TeachingState
  initSession:       (meta: TeachingSessionMeta, activities: TeachingActivity[]) => void
  startCourse:       () => void
  pauseCourse:       () => void
  resumeCourse:      () => void
  beginEnd:          () => void
  cancelEnd:         () => void
  confirmEnd:        () => void
  navigateTo:        (index: number) => void
  nextActivity:      () => void
  prevActivity:      () => void
  completeActivity:  (id: string) => void
  reportActivity:    (id: string) => void
  cancelActivity:    (id: string) => void
  ignoreActivity:    (id: string) => void
  reorderActivity:   (fromIdx: number, toIdx: number) => void
  moveActivityUp:    (index: number) => void
  moveActivityDown:  (index: number) => void
  duplicateActivity: (index: number) => void
  mergeActivities:   (indexA: number, indexB: number) => void
  addLiveActivity:   (titre: string, dureeMin: number, objectif: string, contenu: string, insertAfterIndex: number) => void
  addNote:           (note: Omit<QuickNote, 'id' | 'timestamp'>) => void
  deleteNote:        (id: string) => void
  dismissSuggestion: () => void
}

const TeachingContext = createContext<TeachingContextValue | null>(null)

export function useTeaching() {
  const ctx = useContext(TeachingContext)
  if (!ctx) throw new Error('useTeaching must be inside TeachingProvider')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TeachingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const noteSeq = useRef(0)

  // Persist timeline to localStorage
  useEffect(() => {
    if (!state.session_id || !state.meta?.lecon_id || state.timeline.length === 0) return
    const key = `KLASSIA_TL_${state.meta.lecon_id}_${state.session_id}`
    try { localStorage.setItem(key, JSON.stringify(state.timeline)) } catch { /* quota */ }
  }, [state.timeline, state.session_id, state.meta?.lecon_id])

  const initSession      = useCallback((meta: TeachingSessionMeta, activities: TeachingActivity[]) =>
    dispatch({ type: 'INIT', meta, activities }), [])
  const startCourse      = useCallback(() => dispatch({ type: 'START' }),           [])
  const pauseCourse      = useCallback(() => dispatch({ type: 'PAUSE' }),           [])
  const resumeCourse     = useCallback(() => dispatch({ type: 'RESUME' }),          [])
  const beginEnd         = useCallback(() => dispatch({ type: 'BEGIN_END' }),       [])
  const cancelEnd        = useCallback(() => dispatch({ type: 'CANCEL_END' }),      [])
  const confirmEnd       = useCallback(() => dispatch({ type: 'CONFIRM_END' }),     [])
  const completeActivity = useCallback((id: string) => dispatch({ type: 'ACTIVITY_COMPLETE', id }), [])
  const reportActivity   = useCallback((id: string) => dispatch({ type: 'ACTIVITY_REPORT',  id }), [])
  const cancelActivity   = useCallback((id: string) => dispatch({ type: 'ACTIVITY_CANCEL',  id }), [])
  const ignoreActivity   = useCallback((id: string) => dispatch({ type: 'ACTIVITY_IGNORE',  id }), [])
  const dismissSuggestion = useCallback(() => dispatch({ type: 'DISMISS_SUGGESTION' }), [])
  const deleteNote       = useCallback((id: string) => dispatch({ type: 'DELETE_NOTE', id }), [])
  const moveActivityUp   = useCallback((index: number) => dispatch({ type: 'ACTIVITY_MOVE_UP',   index }), [])
  const moveActivityDown = useCallback((index: number) => dispatch({ type: 'ACTIVITY_MOVE_DOWN', index }), [])
  const duplicateActivityCb = useCallback((index: number) => dispatch({ type: 'ACTIVITY_DUPLICATE', index }), [])
  const mergeActivitiesCb   = useCallback((indexA: number, indexB: number) =>
    dispatch({ type: 'ACTIVITY_MERGE', indexA, indexB }), [])
  const navigateTo = useCallback((index: number) => dispatch({ type: 'NAVIGATE', index }), [])
  const nextActivity = useCallback(() =>
    dispatch({ type: 'NAVIGATE', index: state.currentIndex + 1 }), [state.currentIndex])
  const prevActivity = useCallback(() =>
    dispatch({ type: 'NAVIGATE', index: state.currentIndex - 1 }), [state.currentIndex])
  const reorderActivity = useCallback((fromIdx: number, toIdx: number) =>
    dispatch({ type: 'ACTIVITY_REORDER', fromIndex: fromIdx, toIndex: toIdx }), [])
  const addLiveActivity = useCallback((
    titre: string, dureeMin: number, objectif: string, contenu: string, insertAfterIndex: number,
  ) => dispatch({ type: 'ACTIVITY_ADD_LIVE', titre, dureeMin, objectif, contenu, insertAfterIndex }), [])

  const addNote = useCallback((note: Omit<QuickNote, 'id' | 'timestamp'>) => {
    dispatch({
      type: 'ADD_NOTE',
      note: { ...note, id: `note_${Date.now()}_${++noteSeq.current}`, timestamp: Date.now() },
    })
  }, [])

  return (
    <TeachingContext.Provider value={{
      state,
      initSession, startCourse, pauseCourse, resumeCourse,
      beginEnd, cancelEnd, confirmEnd,
      navigateTo, nextActivity, prevActivity,
      completeActivity, reportActivity, cancelActivity, ignoreActivity,
      reorderActivity, moveActivityUp, moveActivityDown,
      duplicateActivity: duplicateActivityCb,
      mergeActivities:   mergeActivitiesCb,
      addLiveActivity, addNote, deleteNote, dismissSuggestion,
    }}>
      {children}
    </TeachingContext.Provider>
  )
}
