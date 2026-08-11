'use client'

// DS 2.0 — Signature Teaching Pack Card (Mission 4)
// Premium card with progression, quality, version, and CTA

import Badge from './Badge'

interface TeachingPackCardProps {
  titre:             string
  matiere:           string
  niveau:            string
  statut:            string
  progression:       number        // 0–100
  nbSequences?:      number
  nbPlans?:          number
  nbLecons?:         number
  version?:          number
  derniereMaj?:      string        // ISO date
  onContinue?:       () => void
  onView?:           () => void
  style?:            React.CSSProperties
}

function formatDate(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })
}

function ProgressRing({ pct }: { pct: number }) {
  const r    = 16
  const circ = 2 * Math.PI * r
  const fill = Math.min(pct / 100, 1) * circ
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" style={{ flexShrink: 0 }} aria-hidden>
      <circle cx="21" cy="21" r={r} fill="none" stroke="var(--timeline-track)" strokeWidth="3" />
      <circle
        cx="21" cy="21" r={r}
        fill="none"
        stroke="url(#pack-grad)"
        strokeWidth="3"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 21 21)"
        style={{ transition: 'stroke-dasharray 0.6s var(--ease-out)' }}
      />
      <defs>
        <linearGradient id="pack-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--violet, #6C5CE7)" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      <text
        x="21" y="25"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="var(--color-text-primary)"
        fontFamily="var(--font-body)"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

export default function TeachingPackCard({
  titre, matiere, niveau, statut, progression,
  nbSequences, nbPlans, nbLecons, version,
  derniereMaj, onContinue, onView, style,
}: TeachingPackCardProps) {
  const isComplete = statut === 'pret'
  const isBuilding = statut === 'generation_en_cours'
  const hasAction  = onContinue || onView

  return (
    <div
      className="ds-card ds-pack-card"
      style={{ padding: '22px 24px', ...style }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
        {/* Progress ring */}
        <ProgressRing pct={progression} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <h3 style={{
            fontFamily:   'var(--font-display)',
            fontSize:     'var(--text-lg)',
            fontWeight:   700,
            color:        'var(--color-text-primary)',
            margin:       0,
            lineHeight:   'var(--leading-snug)',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {titre}
          </h3>

          {/* Subtitle */}
          <div style={{
            fontSize:  'var(--text-sm)',
            color:     'var(--color-text-muted)',
            marginTop: 3,
          }}>
            {matiere} · {niveau}
          </div>
        </div>

        {/* Status badge */}
        <Badge variant={statut as any} size="sm" />
      </div>

      {/* ── Progress bar ──────────────────────────────────────── */}
      <div style={{ marginBottom: 18 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginBottom: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)',
        }}>
          <span>Progression</span>
          <span style={{ fontWeight: 600, color: isComplete ? 'var(--color-success)' : 'var(--color-accent-violet)' }}>
            {Math.round(progression)}%
          </span>
        </div>
        <div className="ds-pack-progress-track">
          <div
            className="ds-pack-progress-fill"
            style={{ width: `${progression}%` }}
          />
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────── */}
      {(nbSequences !== undefined || nbPlans !== undefined || nbLecons !== undefined) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 18,
          padding: '12px 0',
          borderTop:    '1px solid var(--ds-card-border)',
          borderBottom: '1px solid var(--ds-card-border)',
        }}>
          {[
            { label: 'Séquences', value: nbSequences, icon: '📑' },
            { label: 'Plans',     value: nbPlans,     icon: '📋' },
            { label: 'Leçons',    value: nbLecons,    icon: '📖' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize:   'var(--text-2xl)',
                fontWeight: 700,
                color:      stat.value !== undefined && stat.value > 0
                  ? 'var(--color-text-primary)'
                  : 'var(--color-text-muted)',
                lineHeight: 1,
              }}>
                {stat.value ?? '—'}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 3 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Meta ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)',
        marginBottom: hasAction ? 16 : 0,
      }}>
        <span>
          {version !== undefined && version > 1 && `v${version} · `}
          {derniereMaj && `Modifié ${formatDate(derniereMaj)}`}
        </span>
        {isBuilding && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5,
            color: 'var(--color-accent-violet)', fontSize: 'var(--text-xs)', fontWeight: 600,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--color-accent-violet)',
              animation: 'pulse 1.4s ease-in-out infinite',
              display: 'inline-block',
            }} aria-hidden />
            Génération en cours
          </span>
        )}
      </div>

      {/* ── Actions ───────────────────────────────────────────── */}
      {hasAction && (
        <div style={{ display: 'flex', gap: 8 }}>
          {onContinue && (
            <button
              onClick={onContinue}
              style={{
                flex:         1,
                padding:      '9px 16px',
                fontSize:     'var(--text-sm)',
                fontWeight:   600,
                borderRadius: 'var(--radius-sm)',
                border:       'none',
                background:   isComplete
                  ? 'rgba(108,92,231,0.08)'
                  : 'var(--violet, #6C5CE7)',
                color:        isComplete
                  ? 'var(--color-accent-violet)'
                  : '#fff',
                cursor:       'pointer',
                fontFamily:   'inherit',
                boxShadow:    isComplete ? 'none' : '0 4px 12px rgba(108,92,231,0.28)',
                transition:   'all var(--dur-base) var(--ease-out)',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                gap:          6,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                if (!isComplete) e.currentTarget.style.boxShadow = '0 6px 18px rgba(108,92,231,0.38)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = isComplete ? 'none' : '0 4px 12px rgba(108,92,231,0.28)'
              }}
            >
              {isComplete ? '↗ Ouvrir' : isBuilding ? '⏳ Reprendre' : '→ Continuer'}
            </button>
          )}
          {onView && (
            <button
              onClick={onView}
              style={{
                padding:      '9px 14px',
                fontSize:     'var(--text-sm)',
                fontWeight:   500,
                borderRadius: 'var(--radius-sm)',
                border:       '1px solid var(--ds-card-border)',
                background:   'transparent',
                color:        'var(--color-text-muted)',
                cursor:       'pointer',
                fontFamily:   'inherit',
                transition:   'all var(--dur-fast) var(--ease-out)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background  = 'var(--cmdk-item-hover)'
                e.currentTarget.style.borderColor = 'var(--color-accent-violet)'
                e.currentTarget.style.color       = 'var(--color-accent-violet)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background  = 'transparent'
                e.currentTarget.style.borderColor = 'var(--ds-card-border)'
                e.currentTarget.style.color       = 'var(--color-text-muted)'
              }}
            >
              Détails
            </button>
          )}
        </div>
      )}
    </div>
  )
}
