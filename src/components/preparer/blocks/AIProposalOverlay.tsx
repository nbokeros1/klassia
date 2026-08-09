'use client'

// SCAFFOLD — Overlay de proposition IA sur un bloc. SC-02E.

import type { AIProposal } from '@/lib/types/workspace'

interface AIProposalOverlayProps {
  proposal:      AIProposal
  onAccept:      () => void
  onModify:      (content: string) => void
  onRegenerate:  () => void
  onReject:      () => void
}

export function AIProposalOverlay(_props: AIProposalOverlayProps) {
  return null
}
