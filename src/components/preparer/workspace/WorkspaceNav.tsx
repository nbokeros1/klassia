'use client'

// SCAFFOLD — SC-02E implémentera la navigation verticale gauche.
// Actuellement : ne rend rien — navigation existante dans PreparerPageInner reste active.

import type { WorkspaceNavSection } from '@/lib/types/workspace'

interface WorkspaceNavProps {
  activeSection:   WorkspaceNavSection['id'] | null
  expanded:        boolean
  onSectionChange: (section: WorkspaceNavSection['id']) => void
  badges?:         Partial<Record<WorkspaceNavSection['id'], number>>
}

export function WorkspaceNav(_props: WorkspaceNavProps) {
  return null
}
