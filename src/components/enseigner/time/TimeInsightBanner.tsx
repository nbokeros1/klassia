'use client'

import { useTimeIntelligence } from '@/hooks/enseigner/useTimeIntelligence'
import { useTeaching } from '@/contexts/enseigner/TeachingContext'

export function TimeInsightBanner() {
  const { state } = useTeaching()
  const {
    sessionTiming, alerts, topSuggestion, isAhead, isBehind,
    criticalAlerts, estimatedEndDisplay, stats,
  } = useTimeIntelligence()

  // Only show when active
  if (state.sessionState !== 'active' && state.sessionState !== 'paused') return null

  const hasCritical = criticalAlerts.length > 0
  const bg = hasCritical
    ? 'rgba(239,68,68,0.06)'
    : isAhead
      ? 'rgba(34,197,94,0.06)'
      : isBehind
        ? 'rgba(245,158,11,0.08)'
        : 'rgba(108,92,231,0.05)'

  const border = hasCritical
    ? 'rgba(239,68,68,0.2)'
    : isAhead
      ? 'rgba(34,197,94,0.2)'
      : isBehind
        ? 'rgba(245,158,11,0.2)'
        : 'rgba(108,92,231,0.12)'

  const variance = sessionTiming.variance_cumulative
  const varianceText = variance === 0 ? 'Dans les temps'
    : variance > 0 ? `+${Math.round(variance)} min d'avance`
    : `${Math.round(variance)} min de retard`
  const varianceColor = variance > 0 ? '#22C55E' : variance < -3 ? '#EF4444' : '#F59E0B'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '6px 16px',
      background: bg,
      borderTop: `1px solid ${border}`,
      borderBottom: `1px solid ${border}`,
      fontSize: 12,
      fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
    }}>
      {/* Clock icon */}
      <span style={{ fontSize: 14, flexShrink: 0 }}>⏱</span>

      {/* Variance */}
      <span style={{
        fontWeight: 700, color: varianceColor,
        whiteSpace: 'nowrap',
      }}>
        {varianceText}
      </span>

      {/* Separator */}
      <span style={{ color: '#8B97AC' }}>·</span>

      {/* Estimated end */}
      <span style={{ color: '#5B6B85', whiteSpace: 'nowrap' }}>
        Fin estimée <strong style={{ color: '#0F1B2D' }}>{estimatedEndDisplay}</strong>
      </span>

      {/* Progress */}
      <span style={{ color: '#8B97AC' }}>·</span>
      <span style={{ color: '#5B6B85', whiteSpace: 'nowrap' }}>
        {sessionTiming.percent_complete}% du cours
      </span>

      {/* Top suggestion (very quiet) */}
      {topSuggestion && (
        <>
          <span style={{ color: '#8B97AC' }}>·</span>
          <span style={{
            color: '#8B97AC', fontStyle: 'italic',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: 220,
          }}>
            💡 {topSuggestion.message}
          </span>
        </>
      )}

      {/* Critical alert badge */}
      {hasCritical && (
        <span style={{
          marginLeft: 'auto', flexShrink: 0,
          padding: '2px 8px', borderRadius: 100,
          background: 'rgba(239,68,68,0.12)',
          color: '#DC2626',
          fontSize: 10, fontWeight: 700,
          border: '1px solid rgba(239,68,68,0.3)',
        }}>
          ⚠ {criticalAlerts[0].message}
        </span>
      )}
    </div>
  )
}
