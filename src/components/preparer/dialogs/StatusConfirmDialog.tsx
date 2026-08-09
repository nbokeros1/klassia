'use client'

// SCAFFOLD — Modal de confirmation de changement de statut (Terminée). SC-02E.

import type { StatutPreparation } from '@/lib/types/workspace'

interface StatusConfirmDialogProps {
  open:      boolean
  newStatus: StatutPreparation
  onConfirm: () => void
  onClose:   () => void
}

export function StatusConfirmDialog(_props: StatusConfirmDialogProps) {
  return null
}
