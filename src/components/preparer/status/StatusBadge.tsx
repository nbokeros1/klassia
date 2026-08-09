'use client'

// SCAFFOLD — Badge de statut réutilisable (Brouillon/En cours/Prête/Terminée). SC-02E.

import type { StatutPreparation } from '@/lib/types/workspace'

interface StatusBadgeProps {
  statut:   StatutPreparation
  size?:    'sm' | 'md'
  onClick?: () => void
}

export function StatusBadge(_props: StatusBadgeProps) {
  return null
}
