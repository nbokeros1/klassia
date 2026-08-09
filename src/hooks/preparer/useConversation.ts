'use client'

// STUB — SC-02E extraira createOrUpdateConversation et handleLoadConversation
// depuis PreparerPageInner. Le pattern conversationIdRef (useRef, pas useState)
// doit être préservé pour éviter les race conditions.

import type { ChatMessage } from '@/lib/types/workspace'
import type { ConversationIA, ConversationIAResume } from '@/lib/types/database'

export interface UseConversationReturn {
  conversations:     ConversationIAResume[]
  activeConvId:      string | null
  refreshKey:        number
  loadingConversation: boolean
  loadConversation:  (conv: ConversationIAResume) => Promise<ConversationIA | null>
  upsertConversation: (msgs: ChatMessage[], typeContenu?: string, titre?: string) => Promise<void>
}

export function useConversation(_preparationId?: string): UseConversationReturn {
  // STUB
  return {
    conversations:      [],
    activeConvId:       null,
    refreshKey:         0,
    loadingConversation: false,
    loadConversation:   async () => null,
    upsertConversation: async () => {},
  }
}
