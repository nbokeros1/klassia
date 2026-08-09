'use client'

// STUB — SC-02E extraira la logique SSE de PreparerPageInner.
// IMPORTANT : le protocole __KLASSIA_CTX__ / __ACTION__ doit rester intact.
// Voir SC-02C M4 pour la spécification complète.

import type { ChatMessage, AIStatus, AIProposal, SendMessageParams } from '@/lib/types/workspace'

export interface UseAIAssistantReturn {
  messages:      ChatMessage[]
  isStreaming:   boolean
  aiStatus:      AIStatus
  sendMessage:   (params: SendMessageParams) => Promise<void>
  cancelStream:  () => void
  clearHistory:  () => void
  activeProposal: AIProposal | null
}

export function useAIAssistant(): UseAIAssistantReturn {
  // STUB
  return {
    messages:       [],
    isStreaming:    false,
    aiStatus:       'idle',
    sendMessage:    async () => {},
    cancelStream:   () => {},
    clearHistory:   () => {},
    activeProposal: null,
  }
}
