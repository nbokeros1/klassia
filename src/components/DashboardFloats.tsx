'use client'

import { usePathname } from 'next/navigation'
import AssistantFlottant from './AssistantFlottant'
import FeedbackWidget    from './feedback/FeedbackWidget'
import BetaTour          from './onboarding/BetaTour'

export default function DashboardFloats() {
  const pathname = usePathname()
  if (pathname?.startsWith('/dashboard/gerer/preparer')) return null
  return (
    <>
      <AssistantFlottant />
      <FeedbackWidget />
      <BetaTour />
    </>
  )
}
