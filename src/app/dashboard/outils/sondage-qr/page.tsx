'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import LoadingScreen from '@/components/LoadingScreen'

export default function SondageQRPage() {
  const { profil, loading } = useAuth()
  const router   = useRouter()
  const supabase = createClient()

  const [activeSondages, setActiveSondages] = useState(0)
  const [dataLoading,    setDataLoading]    = useState(true)

  useEffect(() => {
    if (!profil) return
    ;(async () => {
      const { data } = await supabase.from('sondages').select('id').eq('enseignant_id', profil.id).eq('statut', 'ouvert')
      setActiveSondages((data || []).length)
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
            <div style={{ width: 52, height: 52, borderRadius: 16, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📲</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Sondage QR</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Sondages instantanés via QR code pour vos élèves.</div>
            </div>
          </div>

          {/* Statut */}
          {activeSondages > 0 && (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#10B981', fontWeight: 600 }}>
              <span style={{ fontSize: 18 }}>📡</span>
              {activeSondages} sondage{activeSondages > 1 ? 's' : ''} actif{activeSondages > 1 ? 's' : ''} en ce moment
            </div>
          )}

          {/* Cards info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
            {[
              { icon: '📝', title: 'Créer', desc: 'Créez un sondage avec vos questions personnalisées' },
              { icon: '📱', title: 'QR Code', desc: 'Affichez le QR code pour que les élèves répondent depuis leur téléphone' },
              { icon: '📊', title: 'Résultats', desc: 'Visualisez les réponses en temps réel sur votre écran' },
              { icon: '💾', title: 'Historique', desc: 'Retrouvez tous vos sondages passés et leurs résultats' },
            ].map((c, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 14, padding: '16px 16px' }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{c.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{c.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.desc}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push('/dashboard/sondage')}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 14,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff', border: 'none', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
            }}
          >
            📲 Ouvrir les sondages
          </button>
        </div>
      </div>
    </div>
  )
}
