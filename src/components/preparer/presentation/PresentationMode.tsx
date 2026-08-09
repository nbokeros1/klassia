'use client'

// SCAFFOLD — Mode présentation plein écran (portail). SC-02E Sprint 3.

import type { BlocPedagogique, Preparation } from '@/lib/types/workspace'

interface PresentationModeProps {
  preparation: Preparation | null
  blocs:       BlocPedagogique[]
  onExit:      () => void
}

export function PresentationMode(_props: PresentationModeProps) {
  return null
}
