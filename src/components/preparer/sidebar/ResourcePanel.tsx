'use client'

// SCAFFOLD — Panneau Ressources (wrappera KlassIAFilePicker). SC-02E.

import type { Ressource } from '@/lib/types/workspace'

interface ResourcePanelProps {
  fichiers:   Ressource[]
  classeId:   string | null
  onAdd:      (f: Ressource) => void
  onRemove:   (id: string) => void
}

export function ResourcePanel(_props: ResourcePanelProps) {
  return null
}
