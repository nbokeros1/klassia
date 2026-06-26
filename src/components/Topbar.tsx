'use client'

import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = 'preparer' | 'enseigner' | 'suivre'

interface TopbarProps {
  classeActive?: string
  matiereActive?: string
  modeActuel?: Mode
  onModeChange?: (mode: Mode) => void
  creditsIa?: { used: number; total: number }
  notifCount?: number
  initiales?: string
  isFr?: boolean
}

const MODE_LABELS: Record<Mode, { fr: string; en: string }> = {
  preparer:  { fr: 'Préparer',  en: 'Prepare' },
  enseigner: { fr: 'Enseigner', en: 'Teach'   },
  suivre:    { fr: 'Suivre',    en: 'Track'   },
}

// ─── SVG ring de crédits IA ────────────────────────────────────────────────────

function IaRing({ used, total }: { used: number; total: number }) {
  const r = 8
  const circ = 2 * Math.PI * r
  const fraction = total > 0 ? Math.min(used / total, 1) : 0
  const dashUsed = fraction * circ
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r={r} fill="none" stroke="rgba(15,35,65,0.1)" strokeWidth="2.5" />
      <circle cx="11" cy="11" r={r} fill="none"
        stroke="var(--violet, #6C5CE7)" strokeWidth="2.5"
        strokeDasharray={`${dashUsed} ${circ}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        transform="rotate(-90 11 11)"
      />
    </svg>
  )
}

// ─── Pill button helper ────────────────────────────────────────────────────────

function Pill({ children, style, onClick }: {
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: () => void
}) {
  return (
    <div
      className="glass-pill"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 11px', borderRadius: 20,
        fontSize: 12, color: 'var(--text-primary, #0F1B2D)',
        boxShadow: 'var(--shadow-pill)',
        userSelect: 'none',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >{children}</div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Topbar({
  classeActive,
  matiereActive,
  modeActuel,
  onModeChange,
  creditsIa = { used: 0, total: 10 },
  notifCount = 0,
  initiales = '?',
  isFr = true,
}: TopbarProps) {
  const router = useRouter()

  return (
    <div
      className="glass-light"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 28px',
        borderBottom: '1px solid var(--card-border-light)',
        position: 'sticky', top: 0, zIndex: 10,
        flexWrap: 'wrap',
      }}
    >
      {/* ── Powered by Claude ─────────────────────────────────── */}
      <Pill style={{ fontSize: 10.5, color: 'var(--text-muted, #8B97AC)', padding: '4px 10px 4px 8px' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--violet, #6C5CE7)', display: 'inline-block', flexShrink: 0 }} />
        Powered by Claude
      </Pill>

      <div style={{ flex: 1 }} />

      {/* ── Classe + matière (si dispo) ───────────────────────── */}
      {classeActive && (
        <Pill style={{ fontSize: 12, fontWeight: 600 }}>
          <span style={{ fontSize: 13 }}>🎓</span>
          {classeActive}
        </Pill>
      )}
      {classeActive && matiereActive && (
        <Pill style={{ fontSize: 11.5, color: 'var(--text-secondary, #5B6B85)' }}>
          {matiereActive}
        </Pill>
      )}

      {/* ── Mode switch (Préparer / Enseigner / Suivre) ──────── */}
      {modeActuel && onModeChange && (
        <div className="glass-pill" style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 12 }}>
          {(['preparer', 'enseigner', 'suivre'] as Mode[]).map(mode => {
            const active = modeActuel === mode
            return (
              <button key={mode} onClick={() => onModeChange(mode)} style={{
                padding: '5px 13px', borderRadius: 9, fontSize: 11.5, fontWeight: active ? 600 : 500,
                background: active ? 'var(--violet, #6C5CE7)' : 'transparent',
                color: active ? '#fff' : 'var(--text-secondary, #5B6B85)',
                boxShadow: active ? '0 2px 8px var(--violet-glow, rgba(108,92,231,0.35))' : 'none',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {isFr ? MODE_LABELS[mode].fr : MODE_LABELS[mode].en}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Crédits IA ────────────────────────────────────────── */}
      <Pill style={{ gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #0F1B2D)' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted, #8B97AC)', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {isFr ? 'Générations restantes' : 'Remaining generations'}
        </span>
        <IaRing used={creditsIa.used} total={creditsIa.total} />
        <span>{creditsIa.total === 0 ? '∞' : `${creditsIa.used}/${creditsIa.total}`}</span>
      </Pill>

      {/* ── Notifications ─────────────────────────────────────── */}
      <button
        className="glass-pill"
        style={{
          width: 38, height: 38, borderRadius: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', cursor: 'pointer', flexShrink: 0,
          border: '1px solid var(--pill-border, rgba(15,35,65,0.08))',
          background: 'var(--pill-bg, rgba(255,255,255,0.85))',
          fontSize: 15,
        }}
        title={isFr ? 'Notifications' : 'Notifications'}
        aria-label="Notifications"
      >
        🔔
        {notifCount > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            minWidth: 16, height: 16, borderRadius: '50%',
            background: '#EF4444', color: '#fff',
            fontSize: 8, fontWeight: 800, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '0 3px',
            border: '1.5px solid white',
          }}>
            {notifCount > 9 ? '9+' : notifCount}
          </span>
        )}
      </button>

      {/* ── Avatar profil ─────────────────────────────────────── */}
      <div
        onClick={() => router.push('/dashboard/profil')}
        style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--violet, #6C5CE7), #8B7CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff',
          cursor: 'pointer', boxShadow: '0 2px 8px var(--violet-glow, rgba(108,92,231,0.35))',
          transition: 'transform 0.15s',
          userSelect: 'none',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.07)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        title={isFr ? 'Mon profil' : 'My profile'}
      >
        {initiales}
      </div>
    </div>
  )
}
