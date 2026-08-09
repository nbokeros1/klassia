'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import LoadingScreen from '@/components/LoadingScreen'

const PRESETS = [5, 10, 15, 20, 25, 30]
const PHASES  = [
  { label: 'AVANT',   duration: 5,  color: '#60A5FA' },
  { label: 'PENDANT', duration: 20, color: '#34D399' },
  { label: 'APRÈS',   duration: 10, color: '#A78BFA' },
]

function fmtTime(secs: number) {
  return `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`
}

export default function TimerPage() {
  const { profil, loading } = useAuth()
  const router   = useRouter()
  const supabase = createClient()

  const [timerSecs,    setTimerSecs]    = useState(0)
  const [timerTotal,   setTimerTotal]   = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerPaused,  setTimerPaused]  = useState(false)
  const [phaseMode,    setPhaseMode]    = useState(false)
  const [phaseIndex,   setPhaseIndex]   = useState(0)
  const [fullscreen,   setFullscreen]   = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!timerRunning || timerPaused || timerSecs <= 0) return
    timerRef.current = setInterval(() => {
      setTimerSecs(prev => {
        if (prev <= 1) {
          setTimerRunning(false)
          setPhaseIndex(pi => {
            if (phaseMode && pi < PHASES.length - 1) {
              const next = PHASES[pi + 1]
              setTimeout(() => { setTimerSecs(next.duration * 60); setTimerTotal(next.duration * 60); setTimerRunning(true) }, 800)
              return pi + 1
            }
            return pi
          })
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerRunning, timerPaused, phaseMode])

  const start = useCallback((mins: number) => {
    const secs = mins * 60
    setTimerSecs(secs); setTimerTotal(secs)
    setTimerRunning(true); setTimerPaused(false); setPhaseMode(false)
  }, [])

  const startPhase = () => {
    setPhaseMode(true); setPhaseIndex(0)
    const secs = PHASES[0].duration * 60
    setTimerSecs(secs); setTimerTotal(secs)
    setTimerRunning(true); setTimerPaused(false)
  }

  const stop = () => { setTimerRunning(false); setTimerPaused(false); setTimerSecs(0); setTimerTotal(0); setPhaseMode(false); setPhaseIndex(0) }

  const progress   = timerTotal > 0 ? timerSecs / timerTotal : 0
  const phaseColor = phaseMode ? (PHASES[phaseIndex]?.color || '#A78BFA') : 'var(--violet, #6C5CE7)'
  const expired    = timerTotal > 0 && timerSecs === 0

  if (loading) return <LoadingScreen />

  const isFr      = (profil as any)?.langue_interface !== 'en'
  const initiales = `${profil?.prenom?.[0] || ''}${profil?.nom?.[0] || ''}`.toUpperCase() || '?'
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  const btnStyle = (active: boolean, color = 'var(--violet, #6C5CE7)'): React.CSSProperties => ({
    padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', border: 'none',
    background: active ? color : 'rgba(108,92,231,0.08)',
    color: active ? '#fff' : 'var(--text-secondary)',
  })

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'linear-gradient(160deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
      <Sidebar profil={profil} activeHref="/dashboard/outils" onLogout={handleLogout} />

      {/* Plein écran */}
      {fullscreen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,40,0.97)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
          {phaseMode && timerSecs > 0 && (
            <div style={{ fontSize: 11, fontWeight: 700, color: phaseColor, letterSpacing: '.12em', textTransform: 'uppercase' }}>
              Phase {phaseIndex + 1}/{PHASES.length} — {PHASES[phaseIndex]?.label}
            </div>
          )}
          <div style={{ fontSize: 110, fontWeight: 800, color: expired ? '#EF4444' : phaseColor, fontVariantNumeric: 'tabular-nums', letterSpacing: -4 }}>
            {fmtTime(timerSecs)}
          </div>
          {timerTotal > 0 && (
            <div style={{ width: 400, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress * 100}%`, background: phaseColor, borderRadius: 3, transition: 'width 1s linear' }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            {PRESETS.map(m => (
              <button key={m} onClick={() => start(m)} style={{ padding: '8px 18px', background: timerTotal === m * 60 ? phaseColor : 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, color: timerTotal === m * 60 ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                {m} min
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setTimerPaused(p => !p)} style={{ padding: '11px 28px', background: phaseColor, border: 'none', borderRadius: 11, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {timerPaused ? '▶ Reprendre' : '⏸ Pause'}
            </button>
            <button onClick={stop} style={{ padding: '11px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 11, color: '#fff', fontSize: 14, cursor: 'pointer' }}>
              ⏹ Arrêter
            </button>
            <button onClick={() => setFullscreen(false)} style={{ padding: '11px 20px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 11, color: '#EF4444', fontSize: 14, cursor: 'pointer' }}>
              ✕ Quitter
            </button>
          </div>
        </div>
      )}

      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar notifCount={0} initiales={initiales} isFr={isFr} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: 680 }}>

          {/* Back */}
          <button onClick={() => router.push('/dashboard/outils')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 24, fontFamily: 'inherit' }}>
            ← Outils enseignant
          </button>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>⏱️</div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Timer</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Minuteur par phases pour structurer votre leçon.</div>
              </div>
            </div>
          </div>

          {/* Affichage temps */}
          <div style={{ background: 'rgba(255,255,255,0.9)', border: '1.5px solid rgba(108,92,231,0.1)', borderRadius: 20, padding: '32px 28px', textAlign: 'center', marginBottom: 20, boxShadow: '0 4px 20px rgba(108,92,231,0.08)' }}>
            {phaseMode && timerSecs > 0 && (
              <div style={{ fontSize: 11, fontWeight: 700, color: phaseColor, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                Phase {phaseIndex + 1}/{PHASES.length} — {PHASES[phaseIndex]?.label}
              </div>
            )}
            <div style={{ fontSize: timerTotal > 0 ? 72 : 52, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: -2, color: expired ? '#EF4444' : timerTotal > 0 ? phaseColor : 'var(--text-muted)', transition: 'color 0.3s' }}>
              {fmtTime(timerSecs)}
            </div>
            {timerTotal > 0 && (
              <div style={{ height: 6, background: 'rgba(108,92,231,0.1)', borderRadius: 99, margin: '16px 0 8px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress * 100}%`, background: `linear-gradient(90deg, ${phaseColor}, ${phaseColor}cc)`, borderRadius: 99, transition: 'width 1s linear' }} />
              </div>
            )}
            {expired && <div style={{ fontSize: 13, color: '#EF4444', fontWeight: 700, marginTop: 8 }}>⏰ Temps écoulé !</div>}

            {/* Contrôles */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
              {timerTotal > 0 ? (
                <>
                  <button onClick={() => setTimerPaused(p => !p)} style={{ ...btnStyle(true), background: phaseColor }}>
                    {timerPaused ? '▶ Reprendre' : '⏸ Pause'}
                  </button>
                  <button onClick={stop} style={{ padding: '9px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ⏹ Arrêter
                  </button>
                  <button onClick={() => setFullscreen(true)} style={{ padding: '9px 14px', background: 'rgba(108,92,231,0.06)', border: '1px solid rgba(108,92,231,0.14)', borderRadius: 10, color: 'var(--violet)', fontSize: 13, cursor: 'pointer' }} title="Plein écran">
                    ⛶
                  </button>
                </>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Choisissez une durée ci-dessous</div>
              )}
            </div>
          </div>

          {/* Presets */}
          <div style={{ background: 'rgba(255,255,255,0.9)', border: '1.5px solid rgba(108,92,231,0.08)', borderRadius: 16, padding: '20px 22px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Durée</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESETS.map(m => (
                <button key={m} onClick={() => start(m)}
                  style={{
                    padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    border: `1.5px solid ${timerTotal === m * 60 && !phaseMode ? 'var(--violet, #6C5CE7)' : 'rgba(108,92,231,0.15)'}`,
                    background: timerTotal === m * 60 && !phaseMode ? '#EDE9FE' : 'rgba(255,255,255,0.7)',
                    color: timerTotal === m * 60 && !phaseMode ? 'var(--violet, #6C5CE7)' : 'var(--text-secondary)',
                  }}>
                  {m} min
                </button>
              ))}
            </div>
          </div>

          {/* Mode phases */}
          <button onClick={startPhase} style={{
            width: '100%', padding: '14px 18px', borderRadius: 14,
            border: `1.5px dashed ${phaseMode ? '#A78BFA' : 'rgba(167,139,250,0.4)'}`,
            background: phaseMode ? 'rgba(167,139,250,0.08)' : 'transparent',
            color: '#8B5CF6', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 16 }}>✦</span>
            <div style={{ textAlign: 'left' }}>
              <div>Mode phases automatiques</div>
              <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.7, marginTop: 1 }}>AVANT (5 min) → PENDANT (20 min) → APRÈS (10 min)</div>
            </div>
          </button>

        </div>
      </div>
    </div>
  )
}
