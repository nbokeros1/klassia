'use client'

// SCAFFOLD — Onglet Générer du panneau IA. SC-02E.

import type { BlocPedagogique, SendMessageParams } from '@/lib/types/workspace'

interface AIGenerateTabProps {
  blocs:        BlocPedagogique[]
  isGenerating: boolean
  onGenerate:   (params: SendMessageParams) => void
}

export function AIGenerateTab(_props: AIGenerateTabProps) {
  return null
}
