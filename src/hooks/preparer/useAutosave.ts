'use client'

// STUB — SC-02E implémentera le debounce + retry + Supabase.
// La logique de sauvegarde actuelle reste dans PreparerPageInner jusqu'à la migration.

import type { SavingStatus, BlocPedagogique } from '@/lib/types/workspace'

export interface UseAutosaveReturn {
  status:       SavingStatus
  lastSaved:    Date | null
  errorMessage: string | null
  forceSave:    () => Promise<void>
}

export function useAutosave(
  _preparationId: string,
  _blocs: BlocPedagogique[],
): UseAutosaveReturn {
  // STUB
  return {
    status:       'idle',
    lastSaved:    null,
    errorMessage: null,
    forceSave:    async () => {},
  }
}
