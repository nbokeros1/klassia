'use client'

// SCAFFOLD — Panneau Versions (comparaison côte à côte). SC-02E Sprint 3.

import type { Version } from '@/lib/types/workspace'

interface VersionPanelProps {
  versions:        Version[]
  currentVersion:  Version | null
  onView:          (id: string) => void
  onCompare:       (idA: string, idB: string) => void
  onRestore:       (id: string) => void
  onCreateVersion: () => void
}

export function VersionPanel(_props: VersionPanelProps) {
  return null
}
