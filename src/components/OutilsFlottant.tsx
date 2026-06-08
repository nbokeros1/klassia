'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ForfaitType } from '@/lib/types/database'

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const PRESETS = [5, 10, 15, 20, 30, 45]
const PHASES = [
  { label: 'AVANT',   duration: 5,  color: '#60A5FA' },
  { label: 'PENDANT', duration: 20, color: '#34D399' },
  { label: 'APRÈS',   duration: 10, color: '#A78BFA' },
]
const CANVAS_COLORS = ['#FFFFFF', '#F87171', '#FBC34A', '#34D399', '#60A5FA', '#A78BFA', '#000000']
const NUAGE_COLORS  = ['#A78BFA', '#60A5FA', '#34D399', '#FBC34A', '#F472B6', '#FB923C', '#F87171']

export default function OutilsFlottant() {
  const router   = useRouter()
  const supabase = createClient()

  // Auth / forfait
  const [forfait, setForfait] = useState<ForfaitType>('gratuit')
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: p } = await supabase.from('utilisateurs').select('forfait').eq('user_id', session.user.id).single()
      if (p?.forfait) setForfait(p.forfait as ForfaitType)
    }
    init()
  }, [])

  const isProPlus = forfait === 'pro_plus' || forfait === 'institution'

  // Panel state
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'grid' | 'timer' | 'tableau' | 'nuage'>('grid')

  // Timer (persists when panel closes)
  const [timerSecs,    setTimerSecs]    = useState(0)
  const [timerTotal,   setTimerTotal]   = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerPaused,  setTimerPaused]  = useState(false)
  const [phaseMode,    setPhaseMode]    = useState(false)
  const [phaseIndex,   setPhaseIndex]   = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!timerRunning || timerPaused || timerSecs <= 0) return
    timerRef.current = setInterval(() => {
      setTimerSecs(prev => {
        if (prev <= 1) {
          setTimerRunning(false)
          // Auto-advance phases
          setPhaseIndex(pi => {
            if (phaseMode && pi < PHASES.length - 1) {
              const next = PHASES[pi + 1]
              const secs = next.duration * 60
              setTimeout(() => {
                setTimerSecs(secs)
                setTimerTotal(secs)
                setTimerRunning(true)
              }, 800)
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

  const startTimer = (mins: number) => {
    const secs = mins * 60
    setTimerSecs(secs)
    setTimerTotal(secs)
    setTimerRunning(true)
    setTimerPaused(false)
    setPhaseMode(false)
  }

  const stopTimer = () => {
    setTimerRunning(false)
    setTimerPaused(false)
    setTimerSecs(0)
    setTimerTotal(0)
    setPhaseMode(false)
    setPhaseIndex(0)
  }

  const togglePause = () => setTimerPaused(p => !p)

  const startPhaseMode = () => {
    setPhaseMode(true)
    setPhaseIndex(0)
    const secs = PHASES[0].duration * 60
    setTimerSecs(secs)
    setTimerTotal(secs)
    setTimerRunning(true)
    setTimerPaused(false)
  }

  const progress    = timerTotal > 0 ? timerSecs / timerTotal : 0
  const badgeLabel  = timerRunning && !timerPaused && timerSecs > 0 ? fmtTime(timerSecs) : null
  const phaseColor  = phaseMode ? (PHASES[phaseIndex]?.color || '#A78BFA') : '#A78BFA'

  // Canvas (tableau blanc)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const canvasReady = useRef(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawColor, setDrawColor] = useState('#FFFFFF')
  const [lineWidth, setLineWidth] = useState(3)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (view !== 'tableau' || !canvasRef.current || canvasReady.current) return
    const canvas = canvasRef.current
    const parent = canvas.parentElement
    if (!parent) return
    canvas.width  = parent.clientWidth  || 316
    canvas.height = parent.clientHeight || 320
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#1A1A2E'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    canvasReady.current = true
  }, [view])

  useEffect(() => { if (view !== 'tableau') canvasReady.current = false }, [view])

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    lastPos.current = getPos(e)
  }

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = drawColor
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
  }, [isDrawing, drawColor, lineWidth])

  const handleMouseUp = () => { setIsDrawing(false); lastPos.current = null }

  const clearCanvas = () => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')!
    ctx.fillStyle = '#1A1A2E'
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  // Nuage de mots
  const [nuageMots,      setNuageMots]      = useState('')
  const [nuageGenerated, setNuageGenerated] = useState<{ word: string; size: number; color: string }[]>([])

  const genererNuage = () => {
    const words = nuageMots.split(/[,\n;]+/).map(w => w.trim()).filter(Boolean)
    const gen   = words.map((word, i) => ({
      word,
      size:  Math.floor(Math.random() * 22) + 11,
      color: NUAGE_COLORS[i % NUAGE_COLORS.length],
    }))
    gen.sort(() => Math.random() - 0.5)
    setNuageGenerated(gen)
  }

  const tools = [
    { icon: '⏱️', label: 'Minuterie',   action: () => setView('timer'),                                    locked: false      },
    { icon: '📲', label: 'Sondage',     action: () => { router.push('/dashboard/sondage'); setOpen(false) }, locked: false      },
    { icon: '🎮', label: 'Quiz Live',   action: () => { router.push('/dashboard/studio-ia'); setOpen(false) }, locked: !isProPlus },
    { icon: '📺', label: 'TBI',         action: () => { router.push('/dashboard/gerer/enseigner'); setOpen(false) }, locked: false },
    { icon: '✏️', label: 'Tableau',     action: () => setView('tableau'),                                  locked: false      },
    { icon: '☁️', label: 'Nuage',       action: () => setView('nuage'),                                    locked: false      },
  ]

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);    opacity: 0.6 }
          70%  { transform: scale(1.4);  opacity: 0   }
          100% { transform: scale(1.4);  opacity: 0   }
        }
        .outils-panel-enter {
          animation: panelUp 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        @keyframes panelUp {
          from { opacity:0; transform:translateY(14px) scale(0.97) }
          to   { opacity:1; transform:translateY(0)    scale(1)    }
        }
        .tool-btn {
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:5px; padding:13px 8px 10px; border-radius:12px;
          border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04);
          cursor:pointer; transition:all 0.15s; font-family:inherit;
        }
        .tool-btn:hover:not(:disabled) { background:rgba(255,255,255,0.09); border-color:rgba(167,139,250,0.3); }
        .tool-btn:disabled { opacity:0.45; cursor:not-allowed; }
        .preset-btn {
          padding:5px 11px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);
          background:rgba(255,255,255,0.04); color:var(--text-2); font-size:12px;
          cursor:pointer; transition:all 0.15s; font-family:inherit; font-weight:600;
        }
        .preset-btn:hover { background:rgba(167,139,250,0.15); border-color:rgba(167,139,250,0.4); color:#A78BFA; }
        .preset-btn.active { background:rgba(167,139,250,0.2); border-color:#A78BFA; color:#A78BFA; }
        .timer-ctrl {
          width:42px; height:42px; border-radius:10px; border:1px solid rgba(255,255,255,0.1);
          background:rgba(255,255,255,0.05); cursor:pointer; font-size:18px;
          display:flex; align-items:center; justify-content:center; transition:all 0.15s; font-family:inherit;
        }
        .timer-ctrl:hover { background:rgba(255,255,255,0.1); }
        .timer-ctrl.stop:hover { background:rgba(248,113,113,0.15); border-color:rgba(248,113,113,0.4); }
      `}</style>

      {/* Panel */}
      {open && (
        <div className="outils-panel-enter" style={{
          position: 'fixed', bottom: 96, right: 24,
          width: 320, background: '#0D1B2E',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 18,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          zIndex: 900,
          overflow: 'hidden',
          maxHeight: 'calc(100vh - 120px)',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 11px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {view !== 'grid' && (
                <button onClick={() => setView('grid')} style={{ background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', fontSize: 15, padding: '0 4px 0 0', fontFamily: 'inherit' }}>←</button>
              )}
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                {view === 'timer'   ? '⏱️ Minuterie'
                 : view === 'tableau' ? '✏️ Tableau Blanc'
                 : view === 'nuage'   ? '☁️ Nuage de mots'
                 : '🛠️ Outils du prof'}
              </span>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', fontSize: 18, lineHeight: 1, fontFamily: 'inherit', padding: 2 }}>×</button>
          </div>

          {/* ── Grille d'outils ── */}
          {view === 'grid' && (
            <div style={{ padding: '14px 14px 16px', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {tools.map(tool => (
                  <button key={tool.label} className="tool-btn" disabled={tool.locked} onClick={() => tool.action()} title={tool.locked ? 'Fonctionnalité Pro+' : undefined}>
                    <span style={{ fontSize: 20 }}>{tool.icon}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 700 }}>{tool.label}</span>
                    {tool.locked && <span style={{ fontSize: 9, color: '#A78BFA', fontWeight: 700 }}>🔒 Pro+</span>}
                  </button>
                ))}
              </div>

              {badgeLabel && (
                <div style={{ marginTop: 12, padding: '7px 12px', background: 'rgba(107,63,160,0.15)', borderRadius: 8, border: '1px solid rgba(167,139,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: '#A78BFA', fontWeight: 600 }}>⏱️ Timer actif — {badgeLabel}</span>
                  <button onClick={() => setView('timer')} style={{ fontSize: 10, color: '#A78BFA', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>Gérer</button>
                </div>
              )}

              <button onClick={() => { router.push('/dashboard/outils'); setOpen(false) }}
                style={{ marginTop: 10, width: '100%', padding: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, color: 'var(--text-4)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
                Tous les outils →
              </button>
            </div>
          )}

          {/* ── Minuterie ── */}
          {view === 'timer' && (
            <div style={{ padding: '18px 16px 20px', overflowY: 'auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <div style={{
                  fontSize: 54, fontWeight: 800, letterSpacing: '-2px',
                  color: timerSecs < 60 && timerSecs > 0 && timerRunning ? '#EF4444'
                       : timerRunning && !timerPaused ? phaseColor
                       : timerSecs === 0 && timerTotal > 0 ? '#34D399'
                       : 'var(--text-1)',
                  fontVariantNumeric: 'tabular-nums',
                  transition: 'color 0.3s',
                }}>
                  {fmtTime(timerSecs)}
                </div>
                {phaseMode && timerSecs > 0 && (
                  <div style={{ fontSize: 10, color: phaseColor, fontWeight: 700, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Phase {phaseIndex + 1}/{PHASES.length} — {PHASES[phaseIndex]?.label}
                  </div>
                )}
                {timerTotal > 0 && (
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, margin: '10px 0 0', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      background: `linear-gradient(90deg, ${phaseColor}cc, ${phaseColor})`,
                      width: `${progress * 100}%`,
                      transition: 'width 1s linear',
                    }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18 }}>
                {!timerRunning && timerSecs === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-4)' }}>Choisissez une durée</div>
                ) : (
                  <>
                    <button className="timer-ctrl" onClick={togglePause} title={timerPaused ? 'Reprendre' : 'Pause'}>{timerPaused ? '▶' : '⏸'}</button>
                    <button className="timer-ctrl stop" onClick={stopTimer} title="Arrêter">⏹</button>
                    <button className="timer-ctrl" onClick={() => window.open('/dashboard/outils', '_blank')} title="Plein écran" style={{ fontSize: 14 }}>⛶</button>
                  </>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 7 }}>Durée</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PRESETS.map(min => (
                    <button key={min} className={`preset-btn${timerTotal === min * 60 && !phaseMode ? ' active' : ''}`} onClick={() => startTimer(min)}>{min} min</button>
                  ))}
                </div>
              </div>

              <button onClick={startPhaseMode} style={{
                width: '100%', padding: '9px 12px', borderRadius: 9,
                border: `1px dashed ${phaseMode ? phaseColor : 'rgba(167,139,250,0.35)'}`,
                background: phaseMode ? 'rgba(167,139,250,0.1)' : 'transparent',
                color: '#A78BFA', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', textAlign: 'left',
              }}>
                ✦ Mode phases : AVANT (5min) → PENDANT (20min) → APRÈS (10min)
              </button>
            </div>
          )}

          {/* ── Tableau Blanc ── */}
          {view === 'tableau' && (
            <>
              <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {CANVAS_COLORS.map(c => (
                    <div key={c} onClick={() => setDrawColor(c)} style={{ width: 15, height: 15, borderRadius: '50%', background: c, cursor: 'pointer', border: drawColor === c ? '2px solid #A78BFA' : '2px solid transparent', boxSizing: 'border-box' }} />
                  ))}
                </div>
                <select value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))}
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-2)', fontSize: 10, borderRadius: 4, padding: '2px 4px', fontFamily: 'inherit' }}>
                  <option value={2}>Fin</option>
                  <option value={4}>Moyen</option>
                  <option value={8}>Épais</option>
                  <option value={14}>Large</option>
                </select>
                <button onClick={clearCanvas} style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171', borderRadius: 5, padding: '2px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>Effacer</button>
              </div>
              <div style={{ flex: 1, position: 'relative', minHeight: 320 }}>
                <canvas ref={canvasRef} style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
                  onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} />
              </div>
            </>
          )}

          {/* ── Nuage de mots ── */}
          {view === 'nuage' && (
            <div style={{ padding: '14px 16px 16px', overflowY: 'auto' }}>
              <textarea value={nuageMots} onChange={e => setNuageMots(e.target.value)}
                placeholder="Mots clés séparés par virgules, points-virgules ou sauts de ligne..."
                rows={4}
                style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text-1)', fontSize: 12, resize: 'none', marginBottom: 8, boxSizing: 'border-box', fontFamily: 'inherit' }} />
              <button onClick={genererNuage} disabled={!nuageMots.trim()}
                style={{ width: '100%', padding: '8px', borderRadius: 8, border: 'none', background: nuageMots.trim() ? '#6B3FA0' : 'rgba(107,63,160,0.3)', color: 'white', fontSize: 12, fontWeight: 700, cursor: nuageMots.trim() ? 'pointer' : 'not-allowed', marginBottom: 12, fontFamily: 'inherit' }}>
                ✦ Générer le nuage
              </button>
              {nuageGenerated.length > 0 && (
                <div style={{ padding: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
                  {nuageGenerated.map((w, i) => (
                    <span key={i} style={{ fontSize: w.size, color: w.color, fontWeight: 700, lineHeight: 1.3, userSelect: 'none' }}>{w.word}</span>
                  ))}
                </div>
              )}
              {nuageGenerated.length > 0 && (
                <button onClick={() => { setNuageGenerated([]); setNuageMots('') }}
                  style={{ marginTop: 8, width: '100%', padding: '6px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'var(--text-4)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Recommencer
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bouton principal */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 901 }}>
        {timerRunning && !timerPaused && (
          <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid #A78BFA', animation: 'pulse-ring 1.8s ease-out infinite' }} />
        )}
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: open ? 'linear-gradient(135deg, #4F46E5, #6B3FA0)' : 'linear-gradient(135deg, #6B3FA0, #7F77DD)',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(127,119,221,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, transition: 'all 0.2s', position: 'relative',
          }}
          title="Outils du prof"
        >
          {open ? '×' : '🛠️'}
          {badgeLabel && !open && (
            <div style={{ position: 'absolute', top: -6, right: -6, background: timerSecs < 60 ? '#EF4444' : '#6B3FA0', color: 'white', fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 99, minWidth: 36, textAlign: 'center', border: '1.5px solid #0D1B2E', letterSpacing: '0.3px' }}>
              {badgeLabel}
            </div>
          )}
        </button>
      </div>
    </>
  )
}
