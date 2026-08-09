'use client'

// STUB — Wrappera la sélection KlassIAFilePicker → fichiers_klassia refs.
// La logique fichiersKlassia actuelle reste dans PreparerPageInner.

import type { Ressource } from '@/lib/types/workspace'

export interface UseResourcesReturn {
  fichiers:      Ressource[]
  count:         number
  addFichier:    (f: Ressource) => void
  removeFichier: (id: string) => void
  clearAll:      () => void
}

export function useResources(_preparationId?: string): UseResourcesReturn {
  // STUB
  return {
    fichiers:      [],
    count:         0,
    addFichier:    () => {},
    removeFichier: () => {},
    clearAll:      () => {},
  }
}
