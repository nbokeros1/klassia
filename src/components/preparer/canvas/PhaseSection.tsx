'use client'

// SCAFFOLD — SC-02E implémentera les sections AVANT / PENDANT / APRÈS.

import type { BlocPedagogique, Phase } from '@/lib/types/workspace'

interface PhaseSectionProps {
  phase:        Phase
  blocs:        BlocPedagogique[]
  totalMinutes: number
}

export function PhaseSection(_props: PhaseSectionProps) {
  return null
}
