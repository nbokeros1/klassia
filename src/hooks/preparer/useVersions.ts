'use client'

// STUB — Sprint 3. La table `versions` n'existe pas encore en base.
// Ce hook sera activé une fois la migration Supabase effectuée.

import type { Version, VersionDiff } from '@/lib/types/workspace'

export interface UseVersionsReturn {
  versions:        Version[]
  currentVersion:  Version | null
  loading:         boolean
  createVersion:   (label?: string) => Promise<Version | null>
  restoreVersion:  (versionId: string) => Promise<void>
  compareVersions: (idA: string, idB: string) => VersionDiff | null
}

export function useVersions(_preparationId: string): UseVersionsReturn {
  // STUB
  return {
    versions:        [],
    currentVersion:  null,
    loading:         false,
    createVersion:   async () => null,
    restoreVersion:  async () => {},
    compareVersions: () => null,
  }
}
