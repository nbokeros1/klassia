'use client'

import { useSessionTimer } from '@/hooks/enseigner/useTeachingTimer'
import { useTeaching } from '@/contexts/enseigner/TeachingContext'

export function TimerWidget() {
  const { state } = useTeaching()
  const { elapsed, percent, color } = useSessionTimer({
    startedAt:      state.startedAt,
    pausedAt:       state.pausedAt,
    totalPauseMs:   state.totalPauseMs,
    sessionState:   state.sessionState,
    duréePrévueMin: state.meta?.duree_prevue ?? 60,
  })

  const trackColor = color === 'red' ? '#EF4444' : color === 'amber' ? '#F59E0B' : '#6C5CE7'
  const isRunning  = state.sessionState === 'active'
  const isIdle     = state.sessionState === 'idle'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '6px 12px',
      background: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(8px)',
      borderRadius: 100,
      border: '1px solid rgba(255,255,255,0.9)',
      boxShadow: '0 2px 8px rgba(15,35,65,0.08)',
    }}>
      {/* circular progress */}
      <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
        <svg width={32} height={32} viewBox="0 0 32 32" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={16} cy={16} r={12} fill="none" stroke="rgba(139,151,172,0.2)" strokeWidth={3} />
          <circle
            cx={16} cy={16} r={12}
            fill="none"
            stroke={isIdle ? 'rgba(139,151,172,0.4)' : trackColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 12}`}
            strokeDashoffset={`${2 * Math.PI * 12 * (1 - percent / 100)}`}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
          />
        </svg>
        {/* pulse dot when running */}
        {isRunning && (
          <span style={{
            position: 'absolute', top: 3, right: 3,
            width: 6, height: 6, borderRadius: '50%',
            background: trackColor,
            boxShadow: `0 0 0 2px rgba(255,255,255,0.9)`,
            animation: 'klassia-pulse 2s ease-in-out infinite',
          }} />
        )}
      </div>

      {/* elapsed / total */}
      <div>
        <p style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 700,
          fontFamily: 'var(--font-display, Lexend), sans-serif',
          color: isIdle ? '#8B97AC' : '#0F1B2D',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}>
          {isIdle ? '00:00' : elapsed}
        </p>
        <p style={{
          margin: '2px 0 0',
          fontSize: 10,
          color: '#8B97AC',
          fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
          lineHeight: 1,
        }}>
          {state.meta ? `/ ${state.meta.duree_prevue} min` : '— min'}
        </p>
      </div>
    </div>
  )
}
