'use client'

// SCAFFOLD — Panneau Historique (remplacera le sidebar fixe HistoriquePreparer). SC-02E.
// La logique fetch sera extraite dans useConversation.

import type { ConversationIAResume } from '@/lib/types/database'

interface HistoryPanelProps {
  conversations:      ConversationIAResume[]
  activeConvId:       string | null
  onSelectConversation: (conv: ConversationIAResume) => void
  loading?:           boolean
}

export function HistoryPanel(_props: HistoryPanelProps) {
  return null
}
