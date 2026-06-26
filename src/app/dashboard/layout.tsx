import OutilsFlottant          from '@/components/OutilsFlottant'
import AssistantFlottant        from '@/components/AssistantFlottant'
import RealtimeNotifier         from '@/components/RealtimeNotifier'
import BanniereImpersonation    from '@/components/BanniereImpersonation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BanniereImpersonation />
      {children}
      <OutilsFlottant />
      <AssistantFlottant />
      <RealtimeNotifier />
    </>
  )
}
