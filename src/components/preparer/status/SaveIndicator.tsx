'use client'

// SCAFFOLD — Indicateur de sauvegarde dans l'en-tête. SC-02E.
// 4 états : idle | saving | saved | error.

import type { SavingStatus } from '@/lib/types/workspace'

interface SaveIndicatorProps {
  status:       SavingStatus
  lastSaved:    Date | null
  onForceSave?: () => void
}

export function SaveIndicator(_props: SaveIndicatorProps) {
  return null
}
