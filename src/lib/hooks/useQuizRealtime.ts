'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types événements standardisés ────────────────────────────────────────────

export type QuizEvent =
  | { event: 'question_start';   payload: QuestionStartPayload }
  | { event: 'question_end';     payload: QuestionEndPayload }
  | { event: 'scores_update';    payload: ScoresUpdatePayload }
  | { event: 'revision_start';   payload: RevisionStartPayload }
  | { event: 'quiz_end';         payload: QuizEndPayload }

export type QuestionStartPayload = {
  question_id:     string
  ordre:           number
  total:           number
  duree_secondes:  number
  type:            'qcm' | 'vrai_faux' | 'reponse_courte'
  enonce:          string
  options:         string[]
}

export type QuestionEndPayload = {
  question_id:   string
  bonne_reponse: string
  stats:         Record<string, number>  // { 'option A': 4, 'Vrai': 12, ... }
}

export type ScoresUpdatePayload = {
  classement: Array<{ pseudo: string; avatar: string; score: number; rang: number }>
}

export type RevisionStartPayload = {
  questions: QuestionStartPayload[]
}

export type QuizEndPayload = {
  classement_final: Array<{ pseudo: string; avatar: string; score: number; rang: number }>
  badges:           Record<string, string>   // { participant_id: badge_type }
  recompense?:      string
}

type Callback<T = any> = (payload: T) => void

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useQuizRealtime(sessionId: string, role: 'host' | 'player' = 'player') {
  const supabase   = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const listeners  = useRef<Record<string, Callback[]>>({})

  useEffect(() => {
    if (!sessionId) return

    const channel = supabase
      .channel(`quiz-${sessionId}`)
      .on('broadcast', { event: '*' }, ({ event, payload }: { event: string; payload: any }) => {
        ;(listeners.current[event] || []).forEach(fn => fn(payload))
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
      listeners.current = {}
    }
  }, [sessionId])

  /** Émettre un événement (host seulement) */
  const broadcast = useCallback(async (event: string, payload: any) => {
    if (role !== 'host' || !channelRef.current) return
    await channelRef.current.send({ type: 'broadcast', event, payload })
  }, [role])

  /** S'abonner à un événement — retourne une fonction de désabonnement */
  const on = useCallback(<T = any>(event: string, cb: Callback<T>): (() => void) => {
    if (!listeners.current[event]) listeners.current[event] = []
    listeners.current[event].push(cb as Callback)
    return () => {
      listeners.current[event] = (listeners.current[event] || []).filter(fn => fn !== (cb as Callback))
    }
  }, [])

  return { broadcast, on }
}
