'use client'

import { useEffect, useState } from 'react'
import { useFlowEngine } from '@/hooks/enseigner/useFlowEngine'
import { useTeaching } from '@/contexts/enseigner/TeachingContext'

// Floating non-intrusive chip — appears only when a recommendation is ready,
// auto-dismisses after 10s. Position: fixed bottom-right, above toolbar height.

export function FlowInsightChip() {
  const { state } = useTeaching()
  const { topRecommendation, dismissRecommendation, config, indicators } = useFlowEngine()
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const isActive = state.sessionState === 'active' || state.sessionState === 'paused'

  // Show chip when recommendation appears, auto-dismiss after 10s
  useEffect(() => {
    if (!topRecommendation) { setVisible(false); setExpanded(false); return }
    setVisible(true)
    setExpanded(false)
    const id = setTimeout(() => {
      setVisible(false)
    }, 10_000)
    return () => clearTimeout(id)
  }, [topRecommendation?.id])

  if (!config.actif || !isActive) return null

  // Score badge — always visible when config.show_score and session is active
  const showScore = config.show_score

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 50,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
      pointerEvents: 'none',
    }}>
      {/* Recommendation chip */}
      {visible && topRecommendation && (
        <div
          onClick={() => { dismissRecommendation(topRecommendation.type); setVisible(false) }}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: expanded ? '10px 14px' : '8px 12px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(108,92,231,0.2)',
            boxShadow: '0 8px 32px rgba(15,35,65,0.15)',
            maxWidth: 280,
            cursor: 'pointer',
            pointerEvents: 'auto',
            transition: 'all 0.2s ease',
            animation: 'flow-chip-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
          title="Cliquer pour ignorer"
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0, fontSize: 12, fontWeight: 700,
              color: '#0F1B2D',
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
              lineHeight: 1.35,
            }}>
              {topRecommendation.message}
            </p>
            {expanded && (
              <p style={{
                margin: '4px 0 0', fontSize: 11, color: '#8B97AC',
                fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                lineHeight: 1.3,
              }}>
                {topRecommendation.justification}
              </p>
            )}
          </div>
          <span style={{ fontSize: 10, color: '#8B97AC', flexShrink: 0, alignSelf: 'center' }}>✕</span>
        </div>
      )}

      {/* Flow score badge */}
      {showScore && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 100,
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${scoreColor(indicators.flow_score)}33`,
          boxShadow: '0 2px 12px rgba(15,35,65,0.08)',
          pointerEvents: 'auto',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: scoreColor(indicators.flow_score),
          }} />
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: scoreColor(indicators.flow_score),
            fontFamily: 'var(--font-display, Lexend), sans-serif',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {indicators.flow_score}
          </span>
          <span style={{ fontSize: 10, color: '#8B97AC', fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif' }}>
            flux
          </span>
        </div>
      )}

      <style>{`
        @keyframes flow-chip-in {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}

function scoreColor(score: number): string {
  if (score >= 70) return '#22C55E'
  if (score >= 45) return '#F59E0B'
  return '#EF4444'
}
