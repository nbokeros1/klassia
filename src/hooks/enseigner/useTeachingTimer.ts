'use client'

import { useEffect, useReducer } from 'react'
import type { SessionState } from '@/types/enseigner'

// useReducer trick: forces a re-render without storing derived values
const tick = (n: number) => n + 1

// ─── Session-level timer (elapsed since course start) ─────────────────────────

interface SessionTimerOpts {
  startedAt:     number | null
  pausedAt:      number | null
  totalPauseMs:  number
  sessionState:  SessionState
  duréePrévueMin: number
}

export interface SessionTimerResult {
  elapsed:    string   // "MM:SS" or "HH:MM:SS"
  elapsedMs:  number
  percent:    number   // 0–100 vs durée prévue
  color:      'green' | 'amber' | 'red'
}

export function useSessionTimer(opts: SessionTimerOpts): SessionTimerResult {
  const [, forceUpdate] = useReducer(tick, 0)

  const isRunning = opts.sessionState === 'active'

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(forceUpdate, 1000)
    return () => clearInterval(id)
  }, [isRunning])

  const elapsedMs = (() => {
    if (!opts.startedAt) return 0
    const now = opts.pausedAt ?? Date.now()
    return Math.max(0, now - opts.startedAt - opts.totalPauseMs)
  })()

  const totalS = Math.floor(elapsedMs / 1000)
  const h = Math.floor(totalS / 3600)
  const m = Math.floor((totalS % 3600) / 60)
  const s = totalS % 60

  const elapsed = h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  const duréeMs = opts.duréePrévueMin * 60 * 1000
  const percent = duréeMs > 0 ? Math.min(100, Math.round((elapsedMs / duréeMs) * 100)) : 0
  const color: 'green' | 'amber' | 'red' =
    percent >= 95 ? 'red' : percent >= 75 ? 'amber' : 'green'

  return { elapsed, elapsedMs, percent, color }
}

// ─── Activity-level section timer ─────────────────────────────────────────────

export interface SectionTimerResult {
  elapsed:   string
  elapsedMs: number
  percent:   number   // 0–120 (can go over 100%)
  isOver:    boolean
  color:     'green' | 'amber' | 'red'
}

export function useSectionTimer(
  startedAt: number | null,
  duréePrévueMin: number,
  isActive: boolean,
): SectionTimerResult {
  const [, forceUpdate] = useReducer(tick, 0)

  useEffect(() => {
    if (!isActive || !startedAt) return
    const id = setInterval(forceUpdate, 1000)
    return () => clearInterval(id)
  }, [isActive, startedAt])

  const elapsedMs = startedAt ? Math.max(0, Date.now() - startedAt) : 0
  const totalS = Math.floor(elapsedMs / 1000)
  const m = Math.floor(totalS / 60)
  const s = totalS % 60
  const elapsed = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  const duréeMs = duréePrévueMin * 60 * 1000
  const percent = duréeMs > 0 ? Math.min(120, Math.round((elapsedMs / duréeMs) * 100)) : 0
  const isOver = percent >= 100
  const color: 'green' | 'amber' | 'red' =
    percent >= 115 ? 'red' : percent >= 100 ? 'amber' : 'green'

  return { elapsed, elapsedMs, percent, isOver, color }
}

// ─── Countdown timer widget ────────────────────────────────────────────────────

export interface CountdownTimerResult {
  display:    string  // "MM:SS"
  remainMs:   number
  isOver:     boolean
  percent:    number  // 100→0
  color:      'green' | 'amber' | 'red'
}

export function useCountdownTimer(
  startedAt:  number | null,
  targetMin:  number,
  isRunning:  boolean,
): CountdownTimerResult {
  const [, forceUpdate] = useReducer(tick, 0)

  useEffect(() => {
    if (!isRunning || !startedAt) return
    const id = setInterval(forceUpdate, 500)
    return () => clearInterval(id)
  }, [isRunning, startedAt])

  const totalMs = targetMin * 60 * 1000
  const elapsedMs = startedAt ? Math.max(0, Date.now() - startedAt) : 0
  const remainMs = Math.max(0, totalMs - elapsedMs)
  const totalS = Math.ceil(remainMs / 1000)
  const m = Math.floor(totalS / 60)
  const s = totalS % 60
  const display = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  const percent = totalMs > 0 ? Math.round((remainMs / totalMs) * 100) : 0
  const isOver = remainMs === 0
  const color: 'green' | 'amber' | 'red' =
    percent <= 10 ? 'red' : percent <= 25 ? 'amber' : 'green'

  return { display, remainMs, isOver, percent, color }
}
