'use client'

import { usePathname } from 'next/navigation'
import OutilsFlottant    from './OutilsFlottant'
import AssistantFlottant from './AssistantFlottant'

export default function DashboardFloats() {
  const pathname = usePathname()
  if (pathname?.startsWith('/dashboard/gerer/preparer')) return null
  return (
    <>
      <OutilsFlottant />
      <AssistantFlottant />
    </>
  )
}
