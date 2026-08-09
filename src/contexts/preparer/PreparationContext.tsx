'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Preparation } from '@/lib/types/workspace'

// Contexte léger exposant la préparation active.
// Alimenté par WorkspaceProvider — les composants qui n'ont besoin que de la
// préparation (pas du dispatch) consomment ce contexte plus simple.

interface PreparationContextValue {
  preparation: Preparation | null
}

export const PreparationContext = createContext<PreparationContextValue | null>(null)

export function PreparationProvider({
  children,
  preparation,
}: {
  children:    ReactNode
  preparation: Preparation | null
}) {
  return (
    <PreparationContext.Provider value={{ preparation }}>
      {children}
    </PreparationContext.Provider>
  )
}

export function usePreparationContext(): PreparationContextValue {
  const ctx = useContext(PreparationContext)
  if (!ctx) throw new Error('usePreparationContext must be used inside PreparationProvider')
  return ctx
}
