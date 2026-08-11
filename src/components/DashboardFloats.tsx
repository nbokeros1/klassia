'use client'

import { usePathname } from 'next/navigation'
import AssistantFlottant from './AssistantFlottant'
import FeedbackWidget    from './feedback/FeedbackWidget'
import BetaTour          from './onboarding/BetaTour'
import CommandBar        from './ui/CommandBar'

export default function DashboardFloats() {
  const pathname = usePathname()
  const isPreparer = pathname?.startsWith('/dashboard/gerer/preparer')
  return (
    <>
      {/* DS 2.0 — Command Bar global (Ctrl+K) — actif sur toutes les pages */}
      <CommandBar />
      {!isPreparer && <AssistantFlottant />}
      {!isPreparer && <FeedbackWidget />}
      <BetaTour />
    </>
  )
}
