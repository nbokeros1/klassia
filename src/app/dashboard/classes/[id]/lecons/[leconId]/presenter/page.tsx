'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useSearchParams, useRouter } from 'next/navigation'

interface Slide {
  label: string
  tag: string
  content: string
  color: string
}

function PresenterPageInner() {
  const [lecon, setLecon] = useState<any>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  // Chronomètre (compte en montant)
  const [stopwatch, setStopwatch] = useState(0)
  const [stopwatchRunning, setStopwatchRunning] = useState(false)
  // Minuterie (compte à rebours — affiché sur le TBI pour pauses/évaluations)
  const [countdown, setCountdown] = useState(0)
  const [countdownActive, setCountdownActive] = useState(false)
  const [countdownTotal, setCountdownTotal] = useState(0)
  const [countdownDone, setCountdownDone] = useState(false)
  const [showTimerPanel, setShowTimerPanel] = useState(false)
  const [customMin, setCustomMin] = useState('5')
  // TBI remote: countdown from teacher
  const [tbiCountdown, setTbiCountdown] = useState(0)
  const [tbiCountdownActive, setTbiCountdownActive] = useState(false)
  const [tbiCountdownDone, setTbiCountdownDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const supabase = createClient()
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const classeId = params.id as string
  const leconId = params.leconId as string
  const isTbi = searchParams.get('mode') === 'tbi'

  const channelRef = useRef<any>(null)
  const stopwatchRef = useRef<any>(null)
  const countdownRef = useRef<any>(null)
  const tbiCountdownRef = useRef<any>(null)
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Web Audio helpers (TBI only) ──────────────────────────────────────────
  const playBeep = (freq = 880, dur = 0.25, vol = 0.45) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(vol, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
      osc.start()
      osc.stop(ctx.currentTime + dur)
      setTimeout(() => ctx.close(), (dur + 0.15) * 1000)
    } catch {}
  }

  const startAlarm = () => {
    stopAlarm()
    playBeep(880, 0.35, 0.55)
    alarmIntervalRef.current = setInterval(() => playBeep(880, 0.35, 0.55), 700)
  }

  const stopAlarm = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current)
      alarmIntervalRef.current = null
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: lecon } = await supabase
        .from('lecons')
        .select('*, classes(nom, matiere, niveau)')
        .eq('id', leconId)
        .single()
      if (!lecon) { setLoading(false); return }
      setLecon(lecon)

      const c = lecon.contenu_json || {}
      const built: Slide[] = []

      if (c.intention) built.push({ label: 'Intention pédagogique', tag: 'INTENTION', content: c.intention, color: '#A78BFA' })
      if (c.objectifs?.length) built.push({
        label: "Objectifs d'apprentissage", tag: 'OBJECTIFS',
        content: Array.isArray(c.objectifs)
          ? '<ul style="padding-left:1.5em">' + c.objectifs.map((o: string) => `<li style="margin:8px 0">${o}</li>`).join('') + '</ul>'
          : c.objectifs,
        color: '#60A5FA',
      })
      if (c.avant_amorce) built.push({ label: 'Amorce — Mise en route', tag: 'AVANT', content: c.avant_amorce, color: '#FBC34A' })
      if (c.pendant_modelisation) built.push({ label: 'Enseignement — Modélisation', tag: 'PENDANT', content: c.pendant_modelisation, color: '#60A5FA' })
      if (c.pendant_pratique_guidee) built.push({ label: 'Pratique guidée', tag: 'PENDANT', content: c.pendant_pratique_guidee, color: '#60A5FA' })
      if (c.pendant_pratique_autonome) built.push({ label: 'Pratique autonome', tag: 'PENDANT', content: c.pendant_pratique_autonome, color: '#A78BFA' })
      if (c.apres_cloture) built.push({ label: 'Clôture', tag: 'APRÈS', content: c.apres_cloture, color: '#34D399' })
      if (c.apres_billet) built.push({ label: 'Billet de sortie', tag: 'APRÈS', content: c.apres_billet, color: '#34D399' })
      if (built.length === 0) built.push({ label: 'Leçon vide', tag: 'INFO', content: '<p>Aucun contenu. Retournez au plan de leçon pour ajouter du contenu.</p>', color: '#9CA3AF' })

      setSlides(built)
      setLoading(false)
    }
    init()
  }, [leconId])

  // Supabase Realtime channel for slide sync + countdown sync
  useEffect(() => {
    if (loading) return
    const channel = supabase.channel(`tbi-${leconId}`)
    channelRef.current = channel

    if (isTbi) {
      channel
        .on('broadcast', { event: 'slide' }, ({ payload }: any) => {
          setCurrentSlide(payload.index)
        })
        .on('broadcast', { event: 'countdown' }, ({ payload }: any) => {
          if (payload.type === 'start') {
            setTbiCountdown(payload.total)
            setTbiCountdownActive(true)
            setTbiCountdownDone(false)
          } else if (payload.type === 'tick') {
            setTbiCountdown(payload.remaining)
          } else if (payload.type === 'stop') {
            setTbiCountdownActive(false)
            setTbiCountdown(0)
            setTbiCountdownDone(false)
          } else if (payload.type === 'done') {
            setTbiCountdownActive(false)
            setTbiCountdownDone(true)
          }
        })
        .subscribe()
    } else {
      channel.subscribe()
    }

    return () => { supabase.removeChannel(channel) }
  }, [loading, leconId, isTbi])

  const goToSlide = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, index))
    setCurrentSlide(clamped)
    channelRef.current?.send({ type: 'broadcast', event: 'slide', payload: { index: clamped } })
  }, [slides.length])

  // Arrow key navigation (control mode)
  useEffect(() => {
    if (isTbi) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); goToSlide(currentSlide + 1) }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goToSlide(currentSlide - 1) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentSlide, isTbi, goToSlide])

  // Chronomètre (monte)
  useEffect(() => {
    if (stopwatchRunning) {
      stopwatchRef.current = setInterval(() => setStopwatch(t => t + 1), 1000)
    } else {
      clearInterval(stopwatchRef.current)
    }
    return () => clearInterval(stopwatchRef.current)
  }, [stopwatchRunning])

  // Minuterie locale (descend) + broadcast vers TBI
  useEffect(() => {
    if (countdownActive && countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          const next = prev - 1
          if (next <= 0) {
            setCountdownActive(false)
            setCountdownDone(true)
            channelRef.current?.send({ type: 'broadcast', event: 'countdown', payload: { type: 'done' } })
            return 0
          }
          channelRef.current?.send({ type: 'broadcast', event: 'countdown', payload: { type: 'tick', remaining: next } })
          return next
        })
      }, 1000)
    } else {
      clearInterval(countdownRef.current)
    }
    return () => clearInterval(countdownRef.current)
  }, [countdownActive])

  // Sound — TBI mode only
  useEffect(() => {
    if (!isTbi) return
    if (tbiCountdownDone) {
      startAlarm()
    } else if (!tbiCountdownActive && !tbiCountdownDone) {
      stopAlarm()
    } else if (tbiCountdownActive && tbiCountdown > 0 && tbiCountdown <= 10) {
      playBeep(660, 0.15, 0.35)
    }
  }, [tbiCountdown, tbiCountdownActive, tbiCountdownDone, isTbi])

  // Cleanup alarm on unmount
  useEffect(() => () => stopAlarm(), [])

  // TBI local countdown tick (synced from teacher's broadcast)
  useEffect(() => {
    if (tbiCountdownActive && tbiCountdown > 0) {
      tbiCountdownRef.current = setInterval(() => {
        setTbiCountdown(prev => {
          if (prev <= 1) {
            setTbiCountdownActive(false)
            setTbiCountdownDone(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(tbiCountdownRef.current)
    }
    return () => clearInterval(tbiCountdownRef.current)
  }, [tbiCountdownActive, tbiCountdown])

  const startCountdown = (totalSeconds: number) => {
    setCountdown(totalSeconds)
    setCountdownTotal(totalSeconds)
    setCountdownActive(true)
    setCountdownDone(false)
    setShowTimerPanel(false)
    channelRef.current?.send({ type: 'broadcast', event: 'countdown', payload: { type: 'start', total: totalSeconds } })
  }

  const stopCountdownFn = () => {
    setCountdownActive(false)
    setCountdown(0)
    setCountdownDone(false)
    channelRef.current?.send({ type: 'broadcast', event: 'countdown', payload: { type: 'stop' } })
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const fmtBig = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return { m: m.toString(), s: sec.toString().padStart(2, '0') }
  }

  const tbiUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/dashboard/classes/${classeId}/lecons/${leconId}/presenter?mode=tbi`
    : ''

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#050510', color: 'white', fontFamily: 'system-ui' }}>
        Chargement...
      </div>
    )
  }

  const slide = slides[currentSlide]

  // ── TBI Display (ouvrir sur le grand écran de la classe) ──────────────────────
  if (isTbi) {
    const { m: cm, s: cs } = fmtBig(tbiCountdown)
    const isAlmostDone = tbiCountdown > 0 && tbiCountdown <= 10
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#050510', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: 'white', overflow: 'hidden', position: 'relative' }}>

        {/* ── Minuterie : bande du bas quand active, plein écran quand terminée ── */}
        {tbiCountdownDone && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 50,
            background: 'rgba(239,68,68,0.95)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>⏰</div>
            <div style={{ fontSize: '72px', fontWeight: 900, letterSpacing: '-2px', color: 'white' }}>Temps écoulé !</div>
          </div>
        )}

        {tbiCountdownActive && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50,
            background: isAlmostDone ? 'rgba(220,38,38,0.93)' : 'rgba(5,5,16,0.92)',
            borderTop: `2px solid ${isAlmostDone ? 'rgba(239,68,68,0.7)' : 'rgba(167,139,250,0.3)'}`,
            padding: '14px 80px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
            transition: 'background 0.5s, border-color 0.5s',
          }}>
            <div style={{ fontSize: '18px', opacity: 0.7 }}>{isAlmostDone ? '⚠️' : '⏱'}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', lineHeight: 0.85 }}>
              <span style={{ fontSize: '160px', fontWeight: 900, letterSpacing: '-8px', color: isAlmostDone ? '#FCA5A5' : 'white', fontVariantNumeric: 'tabular-nums', transition: 'color 0.3s' }}>{cm}</span>
              <span style={{ fontSize: '100px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', paddingBottom: '14px' }}>:</span>
              <span style={{ fontSize: '160px', fontWeight: 900, letterSpacing: '-8px', color: isAlmostDone ? '#FCA5A5' : 'white', fontVariantNumeric: 'tabular-nums', transition: 'color 0.3s' }}>{cs}</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ padding: '18px 48px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.015)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '3px' }}>{lecon?.classes?.matiere} · {lecon?.classes?.niveau}</div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{lecon?.titre}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ padding: '5px 16px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, background: `${slide?.color}22`, color: slide?.color, letterSpacing: '1px' }}>{slide?.tag}</div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>{currentSlide + 1} / {slides.length}</div>
          </div>
        </div>

        {/* Slide content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 80px', overflow: 'hidden' }}>
          <div style={{ fontSize: '18px', fontWeight: 600, color: slide?.color, marginBottom: '28px', textTransform: 'uppercase' as const, letterSpacing: '1.5px' }}>
            {slide?.label}
          </div>
          <div
            style={{ fontSize: '28px', lineHeight: '1.65', color: 'rgba(255,255,255,0.9)', overflowY: 'auto' as const, maxHeight: '68vh' }}
            dangerouslySetInnerHTML={{ __html: slide?.content || '' }}
          />
        </div>

        {/* Progress bar */}
        <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ height: '100%', background: slide?.color, width: `${((currentSlide + 1) / slides.length) * 100}%`, transition: 'width 0.4s' }} />
        </div>
      </div>
    )
  }

  // ── Control Mode (tablette de l'enseignant) ────────────────────────────────────
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0A0A1A', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: 'white', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', flexShrink: 0, gap: '10px', flexWrap: 'wrap' as const }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => router.push(`/dashboard/classes/${classeId}/lecons/${leconId}`)}
            style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer' }}
          >← Retour</button>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Mode présentation · ← → pour naviguer</div>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>{lecon?.titre}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const }}>
          {/* Chronomètre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', fontFamily: 'monospace', fontSize: '15px', fontWeight: 700 }}>
            <button onClick={() => setStopwatchRunning(v => !v)} style={{ background: 'none', border: 'none', color: stopwatchRunning ? '#34D399' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '13px' }}>
              {stopwatchRunning ? '⏸' : '▶'}
            </button>
            <span style={{ color: stopwatchRunning ? '#34D399' : 'white' }}>{fmt(stopwatch)}</span>
            <button onClick={() => { setStopwatch(0); setStopwatchRunning(false) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '11px' }}>↺</button>
          </div>

          {/* Minuterie (compte à rebours pour pauses / évaluations) */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowTimerPanel(v => !v)}
              style={{
                padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                background: countdownActive ? 'rgba(239,68,68,0.2)' : countdownDone ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${countdownActive ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`,
                color: countdownActive ? '#FCA5A5' : 'rgba(255,255,255,0.8)',
                fontFamily: 'monospace',
              }}
            >{countdownActive ? `⏱ ${fmt(countdown)}` : countdownDone ? '⏰ Terminé' : '⏱ Minuterie'}</button>

            {showTimerPanel && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 100,
                background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px', padding: '16px', width: '240px',
                boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
              }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '1px', marginBottom: '12px' }}>MINUTERIE — AFFICHÉE SUR TBI</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                  {[1, 3, 5, 10, 15, 20].map(min => (
                    <button key={min} onClick={() => startCountdown(min * 60)} style={{
                      padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '13px',
                      fontWeight: 600, cursor: 'pointer',
                    }}>{min} min</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <input
                    type="number" min={1} max={120} value={customMin}
                    onChange={e => setCustomMin(e.target.value)}
                    placeholder="min"
                    style={{ flex: 1, padding: '7px 10px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '13px', outline: 'none' }}
                  />
                  <button onClick={() => startCountdown(parseInt(customMin || '5') * 60)} style={{
                    padding: '7px 12px', borderRadius: '7px', background: 'rgba(167,139,250,0.3)',
                    border: '1px solid rgba(167,139,250,0.5)', color: '#A78BFA', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  }}>Démarrer</button>
                </div>
                {countdownActive && (
                  <button onClick={stopCountdownFn} style={{
                    width: '100%', padding: '7px', borderRadius: '7px',
                    background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                    color: '#F87171', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  }}>⏹ Arrêter la minuterie</button>
                )}
              </div>
            )}
          </div>

          {/* Tableau blanc */}
          <button
            onClick={() => window.open(`/dashboard/classes/${classeId}/lecons/${leconId}/tableau`, '_blank')}
            style={{ padding: '6px 12px', background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: '8px', color: '#60A5FA', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >🖍 Tableau blanc</button>

          {/* Copy TBI URL */}
          <button
            onClick={() => { navigator.clipboard.writeText(tbiUrl); setCopied(true); setTimeout(() => setCopied(false), 2500) }}
            style={{ padding: '6px 12px', background: copied ? 'rgba(52,211,153,0.15)' : 'rgba(107,63,160,0.25)', border: `1px solid ${copied ? 'rgba(52,211,153,0.4)' : 'rgba(107,63,160,0.5)'}`, borderRadius: '8px', color: copied ? '#34D399' : '#A78BFA', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >{copied ? '✓ URL copiée !' : '📋 Lien TBI'}</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Slide list sidebar */}
        <div style={{ width: '190px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto' as const, padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.01)' }}>
          {slides.map((s, i) => (
            <button key={i} onClick={() => goToSlide(i)} style={{
              padding: '9px', textAlign: 'left' as const, width: '100%',
              background: i === currentSlide ? `${s.color}18` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${i === currentSlide ? s.color + '50' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '7px', cursor: 'pointer', transition: 'all 0.15s',
            }}>
              <div style={{ fontSize: '9px', color: s.color, fontWeight: 700, marginBottom: '3px', letterSpacing: '0.5px' }}>{s.tag}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.3' }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* Slide preview */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'auto' as const }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ padding: '4px 12px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, background: `${slide?.color}22`, color: slide?.color, letterSpacing: '1px' }}>{slide?.tag}</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: slide?.color }}>{slide?.label}</div>
          </div>
          <div
            style={{ fontSize: '15px', lineHeight: '1.75', color: 'rgba(255,255,255,0.85)', flex: 1 }}
            dangerouslySetInnerHTML={{ __html: slide?.content || '' }}
          />
        </div>
      </div>

      {/* Navigation bar */}
      <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.01)', flexShrink: 0 }}>
        <button
          onClick={() => goToSlide(currentSlide - 1)}
          disabled={currentSlide === 0}
          style={{ width: 52, height: 52, background: currentSlide === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: currentSlide === 0 ? 'rgba(255,255,255,0.2)' : 'white', fontSize: '20px', cursor: currentSlide === 0 ? 'default' : 'pointer' }}
        >←</button>
        <div style={{ textAlign: 'center' as const, minWidth: '60px' }}>
          <div style={{ fontSize: '22px', fontWeight: 700 }}>{currentSlide + 1}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>/ {slides.length}</div>
        </div>
        <button
          onClick={() => goToSlide(currentSlide + 1)}
          disabled={currentSlide === slides.length - 1}
          style={{ width: 52, height: 52, background: currentSlide === slides.length - 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: currentSlide === slides.length - 1 ? 'rgba(255,255,255,0.2)' : 'white', fontSize: '20px', cursor: currentSlide === slides.length - 1 ? 'default' : 'pointer' }}
        >→</button>
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ height: '100%', background: slide?.color, width: `${((currentSlide + 1) / slides.length) * 100}%`, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

export default function PresenterPage() {
  return (
    <Suspense>
      <PresenterPageInner />
    </Suspense>
  )
}