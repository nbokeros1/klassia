import type { ReactNode } from 'react'

// Workspace autonome — pas de sidebar globale (même pattern que Préparer)
export default function EnseignerWorkspaceLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
