'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import LoadingScreen from '@/components/LoadingScreen'

export default function QuizLivePage() {
  const { profil, loading } = useAuth()
  const router   = useRouter()
  const supabase = createClient()

  const [nbQuiz,      setNbQuiz]      = useState(0)
  const [recentQuiz,  setRecentQuiz]  = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!profil) return
    ;(async () => {
      const { count } = await supabase.from('quiz').select('*', { count: 'exact', head: true }).eq('enseignant_id', profil.id)
      const { data }  = await supabase.from('quiz').select('id,titre,created_at').eq('enseignant_id', profil.id).order('created_at', { ascending: false }).limit(3)
      setNbQuiz(count || 0)
      setRecentQuiz(data || [])
      setDataLoading(false)
    })()
  }, [profil])

  if (loading || dataLoading) return <LoadingScreen />

  const isFr      = (profil as any)?.langue_interface !== 'en'
  const initiales = `${profil?.prenom?.[0] || ''}${profil?.nom?.[0] || ''}`.toUpperCase() || '?'
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'linear-gradient(160deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
      <Sidebar profil={profil} activeHref="/dashboard/outils" onLogout={handleLogout} />

      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar notifCount={0} initiales={initiales} isFr={isFr} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: 640 }}>
          <button onClick={() => router.push('/dashboard/outils')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 24, fontFamily: 'inherit' }}>
            ← Outils enseignant
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🎮</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Quiz live</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Quiz interactifs en temps réel avec tableau de scores.</div>
            </div>
          </div>

          {/* KPI */}
          <div style={{ background: 'rgba(255,255,255,0.9)', border: '1.5px solid rgba(108,92,231,0.1)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎯</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--violet, #6C5CE7)', fontVariantNumeric: 'tabular-nums' }}>{nbQuiz}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>quiz créé{nbQuiz > 1 ? 's' : ''}</div>
            </div>
          </div>

          {/* Quiz récents */}
          {recentQuiz.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(108,92,231,0.08)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Quiz récents</div>
              {recentQuiz.map((q, i) => (
                <div key={q.id} onClick={() => router.push(`/dashboard/outils/quiz/${q.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < recentQuiz.length - 1 ? '1px solid rgba(108,92,231,0.06)' : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <span style={{ fontSize: 16 }}>🎮</span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{q.titre}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>→</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => router.push('/dashboard/outils/quiz')}
              style={{ flex: 1, padding: '13px 18px', borderRadius: 12, background: 'linear-gradient(135deg, #6C5CE7, #5B4BD4)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              🎮 {nbQuiz === 0 ? 'Créer mon premier quiz' : 'Gérer mes quiz'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
