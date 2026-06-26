'use client'

// ─── Logo Anthropic SVG inline ────────────────────────────────────────────────

function AnthropicLogo({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Anthropic"
      style={{ flexShrink: 0, display: 'block' }}
    >
      {/* Approximation du logo Anthropic — étoile radiante */}
      <circle cx="16" cy="16" r="14" fill="#CC785C" opacity=".12" />
      <path d="M16 4 L18.5 13.5 L28 16 L18.5 18.5 L16 28 L13.5 18.5 L4 16 L13.5 13.5 Z"
        fill="#CC785C" />
      <circle cx="16" cy="16" r="3.5" fill="#FFF" />
    </svg>
  )
}

// ─── Composant PoweredByClaude ────────────────────────────────────────────────

interface Props {
  variant: 'header' | 'footer' | 'sidebar'
}

export default function PoweredByClaude({ variant }: Props) {

  // ── Variante header — pill discret ──────────────────────────────────────
  if (variant === 'header') {
    return (
      <div style={{
        display:     'inline-flex',
        alignItems:  'center',
        gap:         6,
        background:  'rgba(204,120,92,0.08)',
        border:      '1px solid rgba(204,120,92,0.2)',
        borderRadius: 99,
        padding:     '3px 10px',
        fontSize:    11,
        color:       'var(--color-text-muted)',
        fontFamily:  "'Inter', system-ui, sans-serif",
        whiteSpace:  'nowrap',
        userSelect:  'none',
      }}>
        <AnthropicLogo size={14} />
        <span>Powered by Claude</span>
      </div>
    )
  }

  // ── Variante sidebar — très compacte ────────────────────────────────────
  if (variant === 'sidebar') {
    return (
      <div style={{
        display:    'flex',
        alignItems: 'center',
        gap:        5,
        padding:    '6px 8px',
        borderRadius: 8,
        background: 'rgba(204,120,92,0.06)',
        border:     '1px solid rgba(204,120,92,0.15)',
        fontSize:   10,
        color:      'var(--color-text-muted)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <AnthropicLogo size={12} />
        <span>Claude by Anthropic</span>
      </div>
    )
  }

  // ── Variante footer — grande ────────────────────────────────────────────
  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      gap:           8,
      padding:       '16px 20px',
      borderTop:     '1px solid var(--color-border)',
      textAlign:     'center',
      fontFamily:    "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <AnthropicLogo size={24} />
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            KlassIA+ × Claude
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>by Anthropic</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.6, maxWidth: 220 }}>
        KlassIA+ est propulsé par{' '}
        <a href="https://claude.ai" target="_blank" rel="noopener noreferrer"
          style={{ color: '#CC785C', textDecoration: 'none', fontWeight: 600 }}>
          Claude d'Anthropic
        </a>
        {' '}— L'IA de confiance pour l'éducation
      </div>
    </div>
  )
}
