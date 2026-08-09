'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FounderSidebar from '@/components/founder/FounderSidebar'
import './founder.css'

export default function FounderLayout({ children }: { children: React.ReactNode }) {
  const router  = useRouter()
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profil } = await supabase
        .from('utilisateurs')
        .select('role, is_admin')
        .eq('user_id', user.id)
        .single()

      const isAuthorized =
        profil?.role === 'founder'     ||
        profil?.role === 'super_admin' ||
        profil?.is_admin === true

      if (!isAuthorized) { router.replace('/dashboard'); return }
      setOk(true)
    }
    check()
  }, [router])

  if (!ok) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0D1117', color: 'rgba(255,255,255,0.25)',
        fontSize: 13, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}>
        Vérification des droits…
      </div>
    )
  }

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
