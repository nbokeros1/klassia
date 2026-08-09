'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import LoadingScreen from '@/components/LoadingScreen'
import type { ForfaitType } from '@/lib/types/database'
import { useForfait } from '@/lib/hooks/useForfait'

const PODIUM_DEMO = [
  { place: '🥇', name: 'Emma L.',  pts: 980, color: '#F59E0B' },
  { place: '🥈', name: 'Liam T.',  pts: 865, color: '#94A3B8' },
  { place: '🥉', name: 'Sofia M.', pts: 740, color: '#CD7C3C' },
  { place: '4',  name: 'Noah R.',  pts: 720, color: 'var(--text-muted)' },
  { place: '5',  name: 'Mia K.',   pts: 695, color: 'var(--text-muted)' },
]

export default function PodiumQuizPage() {
  const { profil, loading } = useAuth()
  const { peutUtiliser }    = useForfait((profil?.forfait || 'gratuit') as ForfaitType)
  const router   = useRouter()
  const supabase = createClient()

  if (loading) return <LoadingScreen />

  const isFr      = (profil as any)?.langue_interface !== 'en'
  const initiales = `${profil?.prenom?.[0] || ''}${profil?.nom?.[0] || ''}`.toUpperCase() || '?'
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
  const isProPlus     = peutUtiliser('quiz_live')

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
            <div style={{ width: 52, height: 52, borderRadius: 16, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🏆</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Podium Quiz</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet, #6C5CE7)', background: '#EDE9FE', padding: '2px 8px', borderRadius: 99 }}>Pro+</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Classement gamifié en direct après un Quiz live.</div>
            </div>
          </div>

          {/* Podium démo */}
          <div style={{ background: 'rgba(255,255,255,0.9)', border: `1.5px solid rgba(245,158,11,0.2)`, borderRadius: 18, padding: '24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
            {!isProPlus && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(4px)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                <div style={{ fontSize: 40 }}>🔒</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Fonctionnalité Pro+</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 280 }}>Le Podium Quiz est disponible avec le forfait Pro+ ou Institution.</div>
                <button onClick={() => router.push('/dashboard/forfaits')}
                  style={{ padding: '11px 28px', borderRadius: 12, background: 'var(--violet, #6C5CE7)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Voir les forfaits
                </button>
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 16 }}>Classement en direct</div>

            {PODIUM_DEMO.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < PODIUM_DEMO.length - 1 ? '1px solid rgba(245,158,11,0.08)' : 'none' }}>
                <div style={{ width: 28, textAlign: 'center', fontSize: i < 3 ? 20 : 13, color: p.color, fontWeight: 700 }}>{p.place}</div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: p.color, fontVariantNumeric: 'tabular-nums' }}>{p.pts} pts</div>
              </div>
            ))}
          </div>

          {!isProPlus && (
            <button onClick={() => router.push('/dashboard/forfaits')}
              style={{ width: '100%', padding: '13px 20px', borderRadius: 12, background: 'linear-gradient(135deg, #6C5CE7, #5B4BD4)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(108,92,231,0.3)' }}>
              Passer à Pro+ pour débloquer le Podium Quiz
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
