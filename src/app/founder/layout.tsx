import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FounderSidebar from '@/components/founder/FounderSidebar'
import './founder.css'

const FOUNDER_ROLES = ['founder', 'super_admin'] as const
type FounderRole = typeof FOUNDER_ROLES[number]

export default async function FounderLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('utilisateurs')
    .select('role, is_admin')
    .eq('user_id', user.id)
    .single()

  const isAuthorized =
    profil?.is_admin === true ||
    FOUNDER_ROLES.includes(profil?.role as FounderRole)

  if (!isAuthorized) redirect('/dashboard')

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#0B1120',
      color: '#F1F5F9',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    }}>
      <FounderSidebar />
      <div style={{ flex: 1, overflowY: 'auto', background: '#0B1120' }}>
        {children}
      </div>
    </div>
  )
}
