'use client'

import { useContext } from 'react'
import { WorkspaceContext } from '@/contexts/preparer/WorkspaceContext'
import type { WorkspaceState, WorkspaceAction } from '@/lib/types/workspace'

// Accès au contexte racine du workspace.
// À utiliser par tout composant enfant — ne pas consommer WorkspaceContext directement.
export function useWorkspace(): {
  state:    WorkspaceState
  dispatch: React.Dispatch<WorkspaceAction>
} {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}
