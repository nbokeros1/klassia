import DashboardFloats          from '@/components/DashboardFloats'
import RealtimeNotifier         from '@/components/RealtimeNotifier'
import BanniereImpersonation    from '@/components/BanniereImpersonation'
import BetaSessionTracker       from '@/components/beta/BetaSessionTracker'
import FeedbackWidget           from '@/components/beta/FeedbackWidget'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BanniereImpersonation />
      {children}
      <DashboardFloats />
      <RealtimeNotifier />
      <BetaSessionTracker />
      <FeedbackWidget />
    </>
  )
}
