'use client'

import { useParams } from 'next/navigation'
import SchoolYearWorkspaceShell from '@/components/mon-annee/workspace/SchoolYearWorkspaceShell'

export default function WorkspacePage() {
  const { classeId } = useParams<{ classeId: string }>()
  return <SchoolYearWorkspaceShell initialClasseId={classeId} />
}
