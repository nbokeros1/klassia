'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { ChatMessage, AIStatus, AIProposal } from '@/lib/types/workspace'

// Contexte IA : messages de session, statut, propositions actives.
// Séparé de WorkspaceContext pour éviter des re-renders sur tous les composants
// quand un token IA arrive (les tokens arrivent très fréquemment).

interface AssistantContextValue {
  messages:       ChatMessage[]
  isStreaming:    boolean
  aiStatus:       AIStatus
  activeProposal: AIProposal | null
}

export const AssistantContext = createContext<AssistantContextValue | null>(null)

export function AssistantProvider({
  children,
  value,
}: {
  children: ReactNode
  value:    AssistantContextValue
}) {
  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  )
}

export function useAssistantContext(): AssistantContextValue {
  const ctx = useContext(AssistantContext)
  if (!ctx) throw new Error('useAssistantContext must be used inside AssistantProvider')
  return ctx
}
