import OutilsFlottant from '@/components/OutilsFlottant'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <OutilsFlottant />
    </>
  )
}
