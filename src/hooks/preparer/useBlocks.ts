'use client'

// STUB — SC-02E implémentera la logique complète.
// Toutes les opérations sur les blocs pédagogiques passent par ce hook.
// La logique actuelle reste dans PreparerPageInner jusqu'à la migration.

import type { BlocPedagogique, Phase } from '@/lib/types/workspace'

export interface UseBlocksReturn {
  blocs:          BlocPedagogique[]
  blocsParPhase:  Record<Phase, BlocPedagogique[]>
  progression:    number   // 0–100, pourcentage de blocs non vides
  dureeEstimee:   number   // somme des durées en minutes
  updateBloc:     (id: string, patch: Partial<Pick<BlocPedagogique, 'contenu' | 'dureeMinutes' | 'nom'>>) => void
  reorderBloc:    (phase: Phase, from: number, to: number) => void
  duplicateBloc:  (id: string) => void
  deleteBloc:     (id: string) => void
  addBloc:        (phase: Phase, after?: string) => void
}

export function useBlocks(): UseBlocksReturn {
  // STUB
  return {
    blocs:         [],
    blocsParPhase: { avant: [], pendant: [], apres: [] },
    progression:   0,
    dureeEstimee:  0,
    updateBloc:    () => {},
    reorderBloc:   () => {},
    duplicateBloc: () => {},
    deleteBloc:    () => {},
    addBloc:       () => {},
  }
}
