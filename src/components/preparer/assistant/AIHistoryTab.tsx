'use client'

// SCAFFOLD — Onglet Historique du panneau IA. SC-02E.
// Réutilise MarkdownMessage existant pour le rendu.

import type { ChatMessage } from '@/lib/types/workspace'

interface AIHistoryTabProps {
  messages:  ChatMessage[]
  onClear:   () => void
}

export function AIHistoryTab(_props: AIHistoryTabProps) {
  return null
}
