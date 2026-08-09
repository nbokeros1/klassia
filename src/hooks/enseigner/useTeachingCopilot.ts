'use client'

import { useState, useCallback, useRef } from 'react'
import { useTeaching } from '@/contexts/enseigner/TeachingContext'
import { useFlowEngine } from './useFlowEngine'
import { useTimeIntelligence } from './useTimeIntelligence'
import { QUICK_ACTIONS } from '@/types/enseigner/copilot'
import type {
  CopilotMessage, CopilotTeachingContext, CopilotSessionMemory, QuickActionType,
} from '@/types/enseigner/copilot'

let _msgSeq = 0
const msgId = () => `msg_${Date.now()}_${++_msgSeq}`

// ─── Context assembly (Mission 1 & 9 — synchronization) ──────────────────────

function buildContext(
  state: ReturnType<typeof useTeaching>['state'],
  flow: ReturnType<typeof useFlowEngine>,
  time: ReturnType<typeof useTimeIntelligence>,
): CopilotTeachingContext {
  const current = state.activities[state.currentIndex]
  const done    = state.activities.filter(a => a.etat === 'terminee').length
  const elapsedMs = state.startedAt
    ? Math.max(0, Date.now() - state.startedAt - state.totalPauseMs) : 0

  return {
    lecon_titre:    state.meta?.lecon_titre   ?? 'Séance',
    classe:         state.meta?.classe_nom    ?? '',
    matiere:        state.meta?.matiere       ?? '',
    niveau:         '',
    date:           state.meta?.date          ?? '',
    current_activity_titre:      current?.titre     ?? '',
    current_activity_objectif:   current?.objectif  ?? '',
    current_activity_type:       current?.type      ?? '',
    current_activity_duree_prevue: current?.duree_prevue ?? 0,
    elapsed_min:   Math.round(elapsedMs / 60_000),
    remaining_min: Math.max(0, (state.meta?.duree_prevue ?? 60) - Math.round(elapsedMs / 60_000)),
    activities_done:  done,
    activities_total: state.activities.length,
    flow_score:       flow.indicators.flow_score,
    engagement_estime: flow.indicators.engagement_estime,
    active_imbalances: flow.imbalances.map(i => i.message),
    variance_cumulative: time.sessionTiming.variance_cumulative,
    estimated_end: time.estimatedEndDisplay,
    notes_summary: state.notes.slice(0, 5).map(n => n.texte),
    preferred_methods: flow.profile?.preferred_methods ?? [],
  }
}

// Fill a quick action template with context
function fillTemplate(template: string, ctx: CopilotTeachingContext): string {
  return template
    .replace('{titre}',  ctx.current_activity_titre  || ctx.lecon_titre)
    .replace('{objectif}', ctx.current_activity_objectif || ctx.lecon_titre)
    .replace('{matiere}',  ctx.matiere)
    .replace('{classe}',   ctx.classe)
    .replace('{duree}',    String(ctx.current_activity_duree_prevue || 5))
    .replace('{niveau}',   ctx.niveau || ctx.classe)
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useTeachingCopilot() {
  const { state } = useTeaching()
  const flow = useFlowEngine()
  const time = useTimeIntelligence()

  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [isStreaming, setIsStreaming]   = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Assemble context (synchronization with all engines — Mission 9)
  const getContext = useCallback(
    () => buildContext(state, flow, time),
    [state, flow, time],
  )

  // ── Send a message (text or quick action) ────────────────────────────────

  const sendMessage = useCallback(async (
    text: string,
    opts?: { quick_action?: QuickActionType; is_suggestion?: boolean }
  ) => {
    if (isStreaming) return
    setError(null)

    const ctx = getContext()

    const userMsg: CopilotMessage = {
      id: msgId(), role: 'user', content: text, timestamp: Date.now(),
      quick_action: opts?.quick_action, is_suggestion: false, sources_used: [],
    }

    const updatedHistory = [...messages, userMsg]
    setMessages(updatedHistory)

    // API messages format
    const apiMessages = updatedHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    setIsStreaming(true)
    setStreamingText('')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/ia/teaching-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, teachingContext: ctx }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error(`Erreur ${res.status}`)
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        full += chunk
        setStreamingText(full)
      }

      const assistantMsg: CopilotMessage = {
        id: msgId(), role: 'assistant', content: full, timestamp: Date.now(),
        is_suggestion: true, // Mission 8: always tag as suggestion
        sources_used: [],
        category: opts?.quick_action
          ? QUICK_ACTIONS.find(a => a.type === opts.quick_action)?.category
          : undefined,
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError('Impossible de contacter le copilote.')
      }
    } finally {
      setIsStreaming(false)
      setStreamingText('')
      abortRef.current = null
    }
  }, [messages, isStreaming, getContext])

  // ── Quick action (Mission 3) ──────────────────────────────────────────────

  const quickAction = useCallback((type: QuickActionType) => {
    const action = QUICK_ACTIONS.find(a => a.type === type)
    if (!action) return
    const ctx  = getContext()
    const text = fillTemplate(action.promptTemplate, ctx)
    sendMessage(text, { quick_action: type })
  }, [getContext, sendMessage])

  // ── Stop streaming ────────────────────────────────────────────────────────

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  // ── Clear session memory (Mission 5) ─────────────────────────────────────

  const clearMemory = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  // ── Export session memory ─────────────────────────────────────────────────

  const sessionMemory: CopilotSessionMemory = {
    messages,
    quick_actions_used: messages.filter(m => m.quick_action).map(m => m.quick_action!),
    session_id: state.session_id ?? 'unknown',
    started_at: state.startedAt ?? Date.now(),
  }

  return {
    messages,
    streamingText,
    isStreaming,
    error,
    context: getContext(),
    sessionMemory,
    sendMessage,
    quickAction,
    stopStreaming,
    clearMemory,
  }
}
