'use client'

import { useTeaching } from '@/contexts/enseigner/TeachingContext'

export function IASuggestionBanner() {
  const { state, dismissSuggestion } = useTeaching()
  if (!state.suggestion) return null

  const { texte, source } = state.suggestion

  const srcLabel = source === 'time' ? 'Timing' : source === 'memory' ? 'Mémoire' : 'Imprévu'
  const srcColor = source === 'panic' ? '#EF4444' : '#22C55E'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 16px',
      background: 'rgba(34,197,94,0.08)',
      borderTop: '1px solid rgba(34,197,94,0.2)',
      borderBottom: '1px solid rgba(34,197,94,0.2)',
    }}>
      {/* icon */}
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: '50%',
        background: 'linear-gradient(135deg, #22C55E, #16A34A)',
        flexShrink: 0,
      }}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round">
          <path d="M12 2a7 7 0 0 1 7 7c0 3.5-2.5 5.5-3.5 7H8.5C7.5 14.5 5 12.5 5 9a7 7 0 0 1 7-7z"/>
          <path d="M9 21h6M12 21v-5"/>
        </svg>
      </span>

      {/* source badge */}
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
        padding: '2px 7px', borderRadius: 100,
        background: `${srcColor}18`, color: srcColor,
        border: `1px solid ${srcColor}40`,
        fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
        flexShrink: 0, textTransform: 'uppercase',
      }}>
        IA · {srcLabel}
      </span>

      {/* message */}
      <p style={{
        flex: 1, margin: 0,
        fontSize: 13, color: '#0F1B2D',
        fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
        lineHeight: 1.4,
      }}>
        {texte}
      </p>

      {/* dismiss */}
      <button
        onClick={dismissSuggestion}
        style={{
          flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px 8px', borderRadius: 8,
          fontSize: 12, color: '#8B97AC',
          fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
          transition: 'color 0.15s',
        }}
        title="Ignorer"
      >
        Ignorer ✕
      </button>
    </div>
  )
}
