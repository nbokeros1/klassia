import DashboardFloats          from '@/components/DashboardFloats'
import RealtimeNotifier         from '@/components/RealtimeNotifier'
import BanniereImpersonation    from '@/components/BanniereImpersonation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BanniereImpersonation />
      {children}
      <DashboardFloats />
      <RealtimeNotifier />
    </>
  )
}
