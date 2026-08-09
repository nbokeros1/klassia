'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Version } from '@/lib/types/workspace'

// Contexte versions — Sprint 3.
// La table `versions` n'existe pas encore — ce contexte est un STUB.

interface VersionContextValue {
  versions:       Version[]
  currentVersion: Version | null
}

export const VersionContext = createContext<VersionContextValue | null>(null)

export function VersionProvider({
  children,
  value,
}: {
  children: ReactNode
  value:    VersionContextValue
}) {
  return (
    <VersionContext.Provider value={value}>
      {children}
    </VersionContext.Provider>
  )
}

export function useVersionContext(): VersionContextValue {
  const ctx = useContext(VersionContext)
  if (!ctx) throw new Error('useVersionContext must be used inside VersionProvider')
  return ctx
}
