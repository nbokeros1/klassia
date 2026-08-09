'use client'

// STUB — SC-02E implémentera la logique Supabase complète.
// Ce hook isole le CRUD sur la préparation (titre, statut, paramètres).
// La logique actuelle reste dans PreparerPageInner jusqu'à la migration.

import type { Preparation, StatutPreparation } from '@/lib/types/workspace'

export interface UsePreparationReturn {
  preparation:    Preparation | null
  loading:        boolean
  error:          string | null
  updateTitle:    (title: string) => Promise<void>
  updateStatus:   (status: StatutPreparation) => Promise<void>
  updateSettings: (settings: Partial<Pick<Preparation, 'dureeMinutes' | 'objectif' | 'methode' | 'gabarit'>>) => Promise<void>
}

export function usePreparation(_preparationId: string): UsePreparationReturn {
  // STUB — retourne des valeurs neutres pour permettre le typage sans implémentation.
  // Remplacer par la vraie logique Supabase dans SC-02E.
  return {
    preparation:    null,
    loading:        false,
    error:          null,
    updateTitle:    async () => {},
    updateStatus:   async () => {},
    updateSettings: async () => {},
  }
}
