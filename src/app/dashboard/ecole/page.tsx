'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

// ── DONNÉES SIMULÉES ─────────────────────────────────────────────────────────

const MRR_DATA = [2400, 3100, 4200, 5800, 6400, 7900, 9200, 10800, 12400, 14200]
const TEACHERS_DATA = [24, 31, 42, 58, 26, 94, 87, 106, 119, 138]
const MONTHS = ['Aoû', 'Sep', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai']

const USERS = [
  { flag: '🇨🇦', name: 'Marie Leblanc', school: 'Éc. Saint-Michel · Montréal', plan: 'PRO', status: 'active', mrr: 9, joined: '14 Jan 2025', sessions: 234 },
  { flag: '🇫🇷', name: 'Jean-Baptiste Martin', school: 'Collège Voltaire · Paris', plan: 'FREE', status: 'active', mrr: 0, joined: '02 Mar 2025', sessions: 67 },
  { flag: '🇨🇦', name: 'Marc Ouellet', school: 'CSS des Laurentides · QC', plan: 'INST', status: 'active', mrr: 33, joined: '08 Nov 2024', sessions: 891 },
  { flag: '🇧🇪', name: 'Sophie Dupont', school: 'Athénée Royal · Bruxelles', plan: 'PRO', status: 'active', mrr: 9, joined: '21 Fév 2025', sessions: 156 },
  { flag: '🇨🇦', name: 'Amina Diallo', school: 'Éc. française · Calgary', plan: 'FREE', status: 'idle', mrr: 0, joined: '30 Avr 2025', sessions: 18 },
  { flag: '🇨🇭', name: 'Fatima Hassan', school: 'Éc. int. de Genève', plan: 'FREE', status: 'active', mrr: 0, joined: '11 Mar 2025', sessions: 43 },
  { flag: '🇨🇦', name: 'David Chen', school: 'VSB · Vancouver', plan: 'PRO', status: 'active', mrr: 9, joined: '05 Avr 2025', sessions: 112 },
  { flag: '🇲🇦', name: 'Youssef Benali', school: 'Lycée Français · Casablanca', plan: 'PRO', status: 'idle', mrr: 9, joined: '18 Avr 2025', sessions: 29 },
]

const INITIAL_FEED = [
  { id: 1, icon: '🆕', text: 'Nouvelle inscription: Jean-Baptiste Martin', sub: 'Paris, FR · Plan FREE', time: 'Il y a 2 min', color: '#00FF88' },
  { id: 2, icon: '⬆️', text: 'Upgrade: Sophie Dupont → Plan PRO', sub: '+9$/mois · Bruxelles, BE', time: 'Il y a 8 min', color: '#00FF88' },
  { id: 3, icon: '📄', text: 'Curriculum uploadé: Amina Diallo', sub: 'Français 4e · Calgary, CA', time: 'Il y a 14 min', color: '#60A5FA' },
  { id: 4, icon: '✦', text: '72 leçons générées par IA: Marc Ouellet', sub: 'Sciences 8e · Laurentides', time: 'Il y a 21 min', color: '#A78BFA' },
  { id: 5, icon: '💳', text: 'Paiement reçu: 9.00$ de Sophie Dupont', sub: 'MRR +9$ · Plan PRO mensuel', time: 'Il y a 34 min', color: '#00FF88' },
  { id: 6, icon: '📊', text: 'Export PPTX: Marie Leblanc', sub: 'Plan de leçon · Français 3e A', time: 'Il y a 47 min', color: '#60A5FA' },
  { id: 7, icon: '🆕', text: 'Nouvelle inscription: David Chen', sub: 'Vancouver, CA · Plan PRO', time: 'Il y a 1h 02', color: '#00FF88' },
  { id: 8, icon: '✦', text: 'Quiz généré par IA: Fatima Hassan', sub: 'Mathématiques · Genève, CH', time: 'Il y a 1h 18', color: '#A78BFA' },
]

const NEW_EVENTS = [
  { icon: '🆕', text: 'Nouvelle inscription: Isabelle Roy', sub: 'Gatineau, CA · Plan FREE', color: '#00FF88' },
  { icon: '⬆️', text: 'Upgrade: David Chen → Plan PRO', sub: '+9$/mois · Vancouver, CA', color: '#00FF88' },
  { icon: '✦', text: '48 leçons générées: Youssef Benali', sub: 'Histoire 9e · Casablanca, MA', color: '#A78BFA' },
  { icon: '💳', text: 'Paiement: 33.00$ de Marc Ouellet', sub: 'MRR +33$ · Institution plan', color: '#00FF88' },
]

const HEATMAP = [
  [100, 92, 84, 76, 68, 61],
  [100, 88, 79, 71, 63, 56],
  [100, 85, 74, 65, 57, 50],
  [100, 91, 83, 72, 64, 58],
  [100, 87, 77, 67, 59, 53],
  [100, 89, 80, 70, 62, 55],
]

const COHORT_LABELS = ['Mois 1', 'Mois 2', 'Mois 3', 'Mois 4', 'Mois 5', 'Mois 6']
const COHORT_NAMES = ['Nov 2024', 'Déc 2024', 'Jan 2025', 'Fév 2025', 'Mar 2025', 'Avr 2025']

const TICKER_ITEMS = [
  'MRR 14,200$ ↑12.3%', 'ENSEIGNANTS ACTIFS 312 ↑8.7%', 'CHURN 1.8% ↓0.4pt',
  'ARPU 9.00$ →', 'SESSIONS/JOUR 1,247 ↑22%', 'IA CALLS 847 ↑31%',
  'NPS SCORE 74 ↑6pt', 'EXPORTS/JOUR 234 ↑18%', 'CONVERSION 3.2% ↑0.7pt',
  'CURRICULA CHARGÉS 89 ↑14%', 'LEÇONS GÉNÉRÉES 12,430 ↑29%',
]

const GEO_DATA = [
  { region: 'Québec, CA', pct: 68, teachers: 212, flag: '🇨🇦' },
  { region: 'Ontario, CA', pct: 18, teachers: 56, flag: '🇨🇦' },
  { region: 'France', pct: 7, teachers: 22, flag: '🇫🇷' },
  { region: 'Alberta, CA', pct: 4, teachers: 12, flag: '🇨🇦' },
  { region: 'Belgique', pct: 3, teachers: 10, flag: '🇧🇪' },
]

// ── SVG SPARKLINE ─────────────────────────────────────────────────────────────
function Sparkline({ data, color = '#00FF88', w = 80, h = 32 }: { data: number[], color?: string, w?: number, h?: number }) {
  const min = Math.min(...data), max = Math.max(...data)
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / (max - min || 1)) * h,
  }))
  const line = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = `M${pts[0].x},${h} ${pts.map(p => `L${p.x},${p.y}`).join(' ')} L${pts[pts.length - 1].x},${h} Z`
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#', '')})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.5" fill={color} />
    </svg>
  )
}

// ── LINE CHART SVG ────────────────────────────────────────────────────────────
function LineChart({ data, labels }: { data: number[], labels: string[] }) {
  const W = 480, H = 140, PAD = { l: 52, r: 16, t: 12, b: 28 }
  const cW = W - PAD.l - PAD.r, cH = H - PAD.t - PAD.b
  const min = 0, max = Math.max(...data) * 1.1
  const pts = data.map((v, i) => ({
    x: PAD.l + (i / (data.length - 1)) * cW,
    y: PAD.t + cH - ((v - min) / (max - min)) * cH,
  }))
  const line = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `M${pts[0].x},${PAD.t + cH} ${pts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} L${pts[pts.length - 1].x},${PAD.t + cH} Z`
  const yTicks = [0, max * 0.25, max * 0.5, max * 0.75, max].reverse()
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="lcGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00FF88" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#00FF88" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((v, i) => {
        const y = PAD.t + (i / (yTicks.length - 1)) * cH
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="9" fill="rgba(232,232,232,0.3)" fontFamily="'Courier New', monospace">
              {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
            </text>
          </g>
        )
      })}
      {labels.map((l, i) => {
        const x = PAD.l + (i / (labels.length - 1)) * cW
        return <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize="9" fill="rgba(232,232,232,0.3)" fontFamily="'Courier New', monospace">{l}</text>
      })}
      <path d={area} fill="url(#lcGrad)" />
      <polyline points={line} fill="none" stroke="#00FF88" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 2.5} fill={i === pts.length - 1 ? '#00FF88' : '#000'} stroke="#00FF88" strokeWidth="1.5" />
      ))}
    </svg>
  )
}

// ── BAR CHART SVG ─────────────────────────────────────────────────────────────
function BarChart({ data, labels, animated }: { data: number[], labels: string[], animated: boolean }) {
  const W = 380, H = 120, PAD = { l: 8, r: 8, t: 10, b: 24 }
  const cW = W - PAD.l - PAD.r, cH = H - PAD.t - PAD.b
  const max = Math.max(...data)
  const barW = (cW / data.length) * 0.55
  const gap = cW / data.length
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {data.map((v, i) => {
        const bh = (v / max) * cH
        const x = PAD.l + i * gap + (gap - barW) / 2
        const y = PAD.t + cH - bh
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh}
              fill="#00FF88" opacity="0.75" rx="2"
              style={{ transformOrigin: `${x + barW / 2}px ${PAD.t + cH}px`, animation: animated ? `barGrow 0.8s ease ${i * 0.06}s both` : 'none' }}
            />
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="8" fill="rgba(232,232,232,0.3)" fontFamily="'Courier New', monospace">{labels[i]}</text>
          </g>
        )
      })}
      <style>{`@keyframes barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }`}</style>
    </svg>
  )
}

// ── DONUT SVG ─────────────────────────────────────────────────────────────────
function Donut({ segments }: { segments: { label: string, value: number, color: string }[] }) {
  const R = 52, cx = 68, cy = 68, stroke = 18
  const total = segments.reduce((a, s) => a + s.value, 0)
  const circ = 2 * Math.PI * R
  let offset = 0
  return (
    <svg width="136" height="136" viewBox="0 0 136 136">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ
        const gap = circ - dash
        const el = (
          <circle key={i} cx={cx} cy={cy} r={R} fill="none"
            stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )
        offset += dash
        return el
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="700" fill="#E8E8E8" fontFamily="'Courier New', monospace">312</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="rgba(232,232,232,0.4)" fontFamily="'Courier New', monospace">TEACHERS</text>
    </svg>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function EcoleDashboard() {
  const router = useRouter()
  const { profil, loading: authLoading } = useAuth()

  // All hooks must be declared before any conditional return
  const [time,         setTime]         = useState('')
  const [feed,         setFeed]         = useState(INITIAL_FEED)
  const [filter,       setFilter]       = useState('')
  const [activeNav,    setActiveNav]    = useState('overview')
  const [refreshing,   setRefreshing]   = useState(false)
  const [barsAnimated, setBarsAnimated] = useState(false)
  const feedRef      = useRef(0)
  const eventCounter = useRef(9)

  // Accès réservé aux admins
  useEffect(() => {
    if (!authLoading && profil && profil.type_compte !== 'admin') {
      router.push('/dashboard')
    }
  }, [profil, authLoading, router])

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('fr-CA', { hour12: false }))
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    setTimeout(() => setBarsAnimated(true), 300)
  }, [])

  useEffect(() => {
    const iv = setInterval(() => {
      const evt = NEW_EVENTS[feedRef.current % NEW_EVENTS.length]
      feedRef.current++
      const newItem = { id: eventCounter.current++, time: 'Il y a quelques sec.', ...evt }
      setFeed(prev => [newItem, ...prev.slice(0, 11)])
    }, 10000)
    return () => clearInterval(iv)
  }, [])

  if (authLoading || !profil || profil.type_compte !== 'admin') return null

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1200)
  }

  const filtered = USERS.filter(u =>
    !filter || u.name.toLowerCase().includes(filter.toLowerCase()) ||
    u.school.toLowerCase().includes(filter.toLowerCase()) ||
    u.plan.toLowerCase().includes(filter.toLowerCase())
  )

  const navItems = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'teachers', label: 'TEACHERS' },
    { id: 'revenue', label: 'REVENUE' },
    { id: 'activity', label: 'ACTIVITY' },
    { id: 'settings', label: 'SETTINGS' },
  ]

  const planBadge = (plan: string) => {
    const map: Record<string, { bg: string, color: string }> = {
      PRO: { bg: 'rgba(0,255,136,0.1)', color: '#00FF88' },
      FREE: { bg: 'rgba(232,232,232,0.06)', color: 'rgba(232,232,232,0.4)' },
      INST: { bg: 'rgba(96,165,250,0.12)', color: '#60A5FA' },
    }
    const s = map[plan] || map.FREE
    return (
      <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: s.bg, color: s.color, fontFamily: 'inherit', letterSpacing: '0.5px' }}>
        {plan}
      </span>
    )
  }

  const G = '#00FF88' // green accent
  const FONT = "'Courier New', 'Courier', monospace"

  const cardStyle: React.CSSProperties = {
    background: '#0A0A0A',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px', padding: '20px',
    position: 'relative', overflow: 'hidden',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#000', color: '#E8E8E8', fontFamily: FONT, position: 'relative', overflowX: 'hidden' }}>

      {/* ── SCANLINES ── */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)', pointerEvents: 'none', zIndex: 9999 }} />
      {/* ── GRAIN ── */}
      <div style={{ position: 'fixed', inset: 0, opacity: 0.035, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '128px', pointerEvents: 'none', zIndex: 9998 }} />

      <style>{`
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #050505; } ::-webkit-scrollbar-thumb { background: #1A1A1A; border-radius: 2px; }
        @keyframes ledPulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes tickerScroll { 0% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
        .term-card:hover { border-color: rgba(0,255,136,0.2) !important; }
        .term-card:hover::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:rgba(0,255,136,0.6); }
        .term-row:hover { background: rgba(255,255,255,0.025) !important; }
        input[type="text"] { caret-color: #00FF88; }
        input::placeholder { color: rgba(232,232,232,0.2) !important; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: '220px', flexShrink: 0, background: '#050505', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 30 }}>

        {/* Logo */}
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: G, letterSpacing: '1px' }}>KLASS<span style={{ color: 'rgba(232,232,232,0.4)' }}>//</span>IA</div>
          <div style={{ fontSize: '9px', color: 'rgba(232,232,232,0.25)', marginTop: '3px', letterSpacing: '1.5px' }}>ADMIN TERMINAL v2.1</div>
        </div>

        {/* Status */}
        <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: G, display: 'inline-block', animation: 'ledPulse 2s ease-in-out infinite', boxShadow: `0 0 6px ${G}` }} />
          <span style={{ fontSize: '9px', color: G, letterSpacing: '1px' }}>SYSTÈME OPÉRATIONNEL</span>
        </div>

        {/* Nav */}
        <nav style={{ padding: '14px 0', flex: 1 }}>
          <div style={{ fontSize: '8px', color: 'rgba(232,232,232,0.2)', letterSpacing: '2px', padding: '0 18px 8px' }}>NAVIGATION</div>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveNav(item.id)} style={{
              display: 'block', width: '100%', padding: '9px 18px',
              background: activeNav === item.id ? 'rgba(0,255,136,0.06)' : 'transparent',
              border: 'none', borderLeft: activeNav === item.id ? `2px solid ${G}` : '2px solid transparent',
              color: activeNav === item.id ? G : 'rgba(232,232,232,0.35)',
              fontSize: '11px', fontWeight: activeNav === item.id ? 600 : 400,
              letterSpacing: '1px', cursor: 'pointer', textAlign: 'left', fontFamily: FONT,
              transition: 'all 0.15s',
            }}>
              {activeNav === item.id ? '▸ ' : '  '}{item.label}
            </button>
          ))}

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '12px 14px' }} />
          <div style={{ fontSize: '8px', color: 'rgba(232,232,232,0.2)', letterSpacing: '2px', padding: '0 18px 8px' }}>ACCÈS RAPIDE</div>
          <button onClick={() => router.push('/dashboard')} style={{ display: 'block', width: '100%', padding: '9px 18px', background: 'transparent', border: 'none', borderLeft: '2px solid transparent', color: 'rgba(232,232,232,0.35)', fontSize: '11px', letterSpacing: '1px', cursor: 'pointer', textAlign: 'left', fontFamily: FONT, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = G}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(232,232,232,0.35)'}>
            ← DASHBOARD PROF
          </button>
        </nav>

        {/* System status bottom */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[['LATENCE API', '42ms'], ['UPTIME', '99.97%'], ['DB', 'CONN OK']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '9px', color: 'rgba(232,232,232,0.2)', letterSpacing: '0.5px' }}>{k}</span>
              <span style={{ fontSize: '9px', color: G, letterSpacing: '0.5px' }}>{v}</span>
            </div>
          ))}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '10px 0 10px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(0,255,136,0.1)', border: `1px solid rgba(0,255,136,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>⚙</div>
            <div>
              <div style={{ fontSize: '11px', color: '#E8E8E8', fontWeight: 600 }}>Admin</div>
              <div style={{ fontSize: '9px', color: 'rgba(232,232,232,0.3)' }}>admin@klassia.app</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ marginLeft: '220px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* ── TOPBAR ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(0,0,0,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'rgba(232,232,232,0.3)', letterSpacing: '0.5px' }}>
              <span style={{ color: G }}>KLASSIA</span>
              <span>›</span><span>ÉCOLE</span>
              <span>›</span><span style={{ color: '#E8E8E8' }}>{activeNav.toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '13px', color: G, letterSpacing: '2px', fontWeight: 600 }}>{time}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['SYNC', 'EXPORT'].map(label => (
                  <button key={label} style={{ padding: '5px 12px', background: 'transparent', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: '4px', color: 'rgba(232,232,232,0.4)', fontSize: '10px', letterSpacing: '1px', cursor: 'pointer', fontFamily: FONT, transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.color = G }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(232,232,232,0.4)' }}>
                    {label}
                  </button>
                ))}
                <button onClick={handleRefresh} style={{ padding: '5px 12px', background: 'transparent', border: `1px solid rgba(0,255,136,0.3)`, borderRadius: '4px', color: G, fontSize: '10px', letterSpacing: '1px', cursor: 'pointer', fontFamily: FONT }}
                  title="Rafraîchir">
                  <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}>↻</span> REFRESH
                </button>
              </div>
            </div>
          </div>

          {/* TICKER */}
          <div style={{ background: '#050505', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '7px 0', overflow: 'hidden' }}>
            <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'tickerScroll 32s linear infinite' }}>
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} style={{ fontSize: '10px', color: item.includes('↑') || item.includes('↓') ? (item.includes('↑') ? G : '#F85149') : 'rgba(232,232,232,0.5)', padding: '0 28px', letterSpacing: '0.8px', flexShrink: 0 }}>
                  {item}
                  <span style={{ color: 'rgba(255,255,255,0.12)', marginLeft: '28px' }}>│</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ padding: '24px', flex: 1 }}>

          {/* ── MINI STATS ROW ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'SESSION MOY.', value: '18 min', delta: '+2m' },
              { label: 'PAGES/SESSION', value: '12.4', delta: '+1.8' },
              { label: 'IA CALLS/JOUR', value: '847', delta: '+31%' },
              { label: 'EXPORTS/JOUR', value: '234', delta: '+18%' },
              { label: 'SUBSCRIBERS', value: '312', delta: '+8%' },
              { label: 'TICKETS SUPP.', value: '3', delta: '-5' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '12px 14px' }}>
                <div style={{ fontSize: '8px', color: 'rgba(232,232,232,0.25)', letterSpacing: '1px', marginBottom: '6px' }}>{s.label}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#E8E8E8', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '9px', color: s.delta.startsWith('-') && s.label !== 'TICKETS SUPP.' ? '#F85149' : G, marginTop: '4px' }}>{s.delta}</div>
              </div>
            ))}
          </div>

          {/* ── KPI CARDS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'MRR', value: '14,200$', delta: '+12.3%', spark: MRR_DATA, positive: true },
              { label: 'ENSEIGNANTS ACTIFS', value: '312', delta: '+8.7%', spark: TEACHERS_DATA, positive: true },
              { label: 'TAUX DE CHURN', value: '1.8%', delta: '-0.4pt', spark: [2.4, 2.2, 2.1, 2.0, 2.3, 1.9, 2.1, 1.8, 1.9, 1.8], positive: true },
              { label: 'ARPU', value: '9.00$', delta: '→ stable', spark: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9], positive: true },
            ].map((kpi, i) => (
              <div key={i} className="term-card" style={{ ...cardStyle }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ fontSize: '9px', color: 'rgba(232,232,232,0.3)', letterSpacing: '1.5px' }}>{kpi.label}</div>
                  <span style={{ fontSize: '9px', color: kpi.positive ? G : '#F85149', background: kpi.positive ? 'rgba(0,255,136,0.08)' : 'rgba(248,81,73,0.08)', padding: '2px 7px', borderRadius: '3px' }}>
                    {kpi.delta}
                  </span>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: '#E8E8E8', lineHeight: 1, marginBottom: '14px' }}>{kpi.value}</div>
                <Sparkline data={kpi.spark} color={G} w={90} h={30} />
              </div>
            ))}
          </div>

          {/* ── CHARTS ROW ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr', gap: '12px', marginBottom: '20px' }}>

            {/* Line chart — MRR */}
            <div className="term-card" style={{ ...cardStyle }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '9px', color: 'rgba(232,232,232,0.3)', letterSpacing: '1.5px', marginBottom: '3px' }}>MRR — 10 MOIS</div>
                  <div style={{ fontSize: '11px', color: G }}>▲ +491% depuis août 2024</div>
                </div>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: G, boxShadow: `0 0 8px ${G}`, animation: 'ledPulse 2s ease-in-out infinite' }} />
              </div>
              <LineChart data={MRR_DATA} labels={MONTHS} />
            </div>

            {/* Bar chart — new teachers */}
            <div className="term-card" style={{ ...cardStyle }}>
              <div style={{ fontSize: '9px', color: 'rgba(232,232,232,0.3)', letterSpacing: '1.5px', marginBottom: '4px' }}>NOUVELLES INSCRIPTIONS</div>
              <div style={{ fontSize: '11px', color: G, marginBottom: '14px' }}>138 enseignants en mai</div>
              <BarChart data={TEACHERS_DATA} labels={MONTHS} animated={barsAnimated} />
            </div>

            {/* Donut — plan distribution */}
            <div className="term-card" style={{ ...cardStyle }}>
              <div style={{ fontSize: '9px', color: 'rgba(232,232,232,0.3)', letterSpacing: '1.5px', marginBottom: '14px' }}>DISTRIBUTION DES PLANS</div>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <Donut segments={[
                  { label: 'FREE', value: 68, color: 'rgba(232,232,232,0.15)' },
                  { label: 'PRO', value: 27, color: G },
                  { label: 'INST', value: 5, color: '#60A5FA' },
                ]} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { label: 'FREE', pct: '68%', count: '212', color: 'rgba(232,232,232,0.4)' },
                    { label: 'PRO', pct: '27%', count: '84', color: G },
                    { label: 'INST', pct: '5%', count: '16', color: '#60A5FA' },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <div style={{ width: '7px', height: '7px', borderRadius: '1px', background: s.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '10px', color: 'rgba(232,232,232,0.5)', letterSpacing: '0.5px' }}>{s.label}</span>
                        <span style={{ fontSize: '10px', color: s.color, marginLeft: 'auto', paddingLeft: '8px' }}>{s.pct}</span>
                      </div>
                      <div style={{ fontSize: '8px', color: 'rgba(232,232,232,0.2)', paddingLeft: '13px' }}>{s.count} enseignants</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── TEACHERS TABLE ── */}
          <div className="term-card" style={{ ...cardStyle, padding: 0, marginBottom: '20px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <div style={{ fontSize: '9px', color: 'rgba(232,232,232,0.3)', letterSpacing: '1.5px', marginBottom: '2px' }}>ENSEIGNANTS RÉCENTS</div>
                <div style={{ fontSize: '11px', color: 'rgba(232,232,232,0.55)' }}>{filtered.length} résultats</div>
              </div>
              <input
                type="text" placeholder="Filtrer..." value={filter}
                onChange={e => setFilter(e.target.value)}
                style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', color: '#E8E8E8', fontSize: '11px', outline: 'none', fontFamily: FONT, width: '180px', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = `rgba(0,255,136,0.4)`}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['ENSEIGNANT', 'ÉCOLE', 'PLAN', 'MRR', 'SESSIONS', 'STATUT', 'INSCRIT'].map(h => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '9px', color: 'rgba(232,232,232,0.25)', letterSpacing: '1.5px', fontWeight: 400, whiteSpace: 'nowrap' as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => (
                    <tr key={i} className="term-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s', cursor: 'default' }}>
                      <td style={{ padding: '12px 20px', whiteSpace: 'nowrap' as const }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>{u.flag}</span>
                          <span style={{ fontSize: '12px', color: '#E8E8E8', fontWeight: 500 }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(232,232,232,0.4)' }}>{u.school}</span>
                      </td>
                      <td style={{ padding: '12px 20px' }}>{planBadge(u.plan)}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ fontSize: '12px', color: u.mrr > 0 ? G : 'rgba(232,232,232,0.25)', fontWeight: u.mrr > 0 ? 600 : 400 }}>
                          {u.mrr > 0 ? `+${u.mrr}$` : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(232,232,232,0.55)' }}>{u.sessions}</span>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: u.status === 'active' ? G : 'rgba(232,232,232,0.2)', display: 'inline-block', animation: u.status === 'active' ? 'ledPulse 2s ease-in-out infinite' : 'none', boxShadow: u.status === 'active' ? `0 0 5px ${G}` : 'none' }} />
                          <span style={{ fontSize: '9px', color: u.status === 'active' ? G : 'rgba(232,232,232,0.3)', letterSpacing: '0.5px' }}>{u.status.toUpperCase()}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(232,232,232,0.3)' }}>{u.joined}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── BOTTOM ROW: FEED + HEATMAP + GEO ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.85fr', gap: '12px' }}>

            {/* Activity Feed */}
            <div className="term-card" style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '9px', color: 'rgba(232,232,232,0.3)', letterSpacing: '1.5px', marginBottom: '2px' }}>ACTIVITÉ EN DIRECT</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: G, display: 'inline-block', animation: 'ledPulse 1.5s ease-in-out infinite' }} />
                    <span style={{ fontSize: '9px', color: G }}>LIVE</span>
                  </div>
                </div>
                <span style={{ fontSize: '9px', color: 'rgba(232,232,232,0.2)' }}>MÀJ / 10s</span>
              </div>
              <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '8px 0' }}>
                {feed.map((evt, i) => (
                  <div key={evt.id} style={{ padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.03)', animation: i === 0 ? 'slideIn 0.4s ease' : 'none', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>{evt.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', color: '#E8E8E8', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{evt.text}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(232,232,232,0.35)' }}>{evt.sub}</div>
                    </div>
                    <span style={{ fontSize: '9px', color: 'rgba(232,232,232,0.2)', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>{evt.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Heatmap rétention */}
            <div className="term-card" style={{ ...cardStyle }}>
              <div style={{ fontSize: '9px', color: 'rgba(232,232,232,0.3)', letterSpacing: '1.5px', marginBottom: '14px' }}>RÉTENTION DES COHORTES</div>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${COHORT_LABELS.length}, 1fr)`, gap: '3px', minWidth: '320px' }}>
                  <div />
                  {COHORT_LABELS.map(l => (
                    <div key={l} style={{ fontSize: '8px', color: 'rgba(232,232,232,0.25)', textAlign: 'center', paddingBottom: '4px', letterSpacing: '0.5px' }}>{l}</div>
                  ))}
                  {HEATMAP.map((row, ri) => (
                    <>
                      <div key={`label-${ri}`} style={{ fontSize: '9px', color: 'rgba(232,232,232,0.3)', display: 'flex', alignItems: 'center', paddingRight: '6px' }}>{COHORT_NAMES[ri]}</div>
                      {row.map((val, ci) => (
                        <div key={`${ri}-${ci}`} style={{
                          height: '28px', borderRadius: '3px',
                          background: `rgba(0,255,136,${(val / 100) * 0.7 + 0.05})`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '8px', color: val > 70 ? 'rgba(0,0,0,0.7)' : 'rgba(232,232,232,0.4)',
                          fontWeight: 600,
                        }}>{val}%</div>
                      ))}
                    </>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ height: '6px', flex: 1, background: 'linear-gradient(90deg, rgba(0,255,136,0.05), rgba(0,255,136,0.75))', borderRadius: '3px' }} />
                <span style={{ fontSize: '8px', color: 'rgba(232,232,232,0.25)' }}>0% → 100%</span>
              </div>
            </div>

            {/* Géographie */}
            <div className="term-card" style={{ ...cardStyle }}>
              <div style={{ fontSize: '9px', color: 'rgba(232,232,232,0.3)', letterSpacing: '1.5px', marginBottom: '16px' }}>GÉOGRAPHIE — TOP 5</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {GEO_DATA.map((g, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <span style={{ fontSize: '14px' }}>{g.flag}</span>
                        <span style={{ fontSize: '11px', color: 'rgba(232,232,232,0.7)' }}>{g.region}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(232,232,232,0.35)' }}>{g.teachers} prof.</span>
                        <span style={{ fontSize: '11px', color: G, fontWeight: 600, minWidth: '38px', textAlign: 'right' }}>{g.pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                      <div style={{ height: '100%', width: `${g.pct}%`, background: `linear-gradient(90deg, rgba(0,255,136,0.5), ${G})`, borderRadius: '2px', transition: 'width 1s ease', boxShadow: `0 0 6px rgba(0,255,136,0.3)` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.1)', borderRadius: '6px' }}>
                <div style={{ fontSize: '9px', color: 'rgba(232,232,232,0.25)', letterSpacing: '1px', marginBottom: '5px' }}>COUVERTURE TOTALE</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: G }}>12 pays</div>
                <div style={{ fontSize: '10px', color: 'rgba(232,232,232,0.35)', marginTop: '2px' }}>5 continents · EN CROISSANCE</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
