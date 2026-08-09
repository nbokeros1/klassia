'use client'

// SCAFFOLD — Onglet Suggestions du panneau IA. SC-02E.

import type { AISuggestion } from '@/lib/types/workspace'

interface AISuggestionsTabProps {
  suggestions: AISuggestion[]
  onAccept:    (id: string) => void
  onDismiss:   (id: string) => void
}

export function AISuggestionsTab(_props: AISuggestionsTabProps) {
  return null
}
