'use client'

import type { FlowReplayEvent, TeachingPaceScore } from '@/types/enseigner/flow-engine'
import { REPLAY_COLORS } from '@/types/enseigner/flow-engine'

interface Props {
  replay: FlowReplayEvent[]
  paceScore: TeachingPaceScore
}

const NIVEAU_LABELS: Record<TeachingPaceScore['niveau'], string> = {
  debutant:       'Débutant',
  en_progression: 'En progression',
  confirme:       'Confirmé',
  expert:         'Expert',
}

const NIVEAU_COLORS: Record<TeachingPaceScore['niveau'], string> = {
  debutant:       '#EF4444',
  en_progression: '#F59E0B',
  confirme:       '#6C5CE7',
  expert:         '#22C55E',
}

export function FlowReplay({ replay, paceScore }: Props) {
  if (!replay.length) return null

  const niveauColor = NIVEAU_COLORS[paceScore.niveau]

  return (
    <div style={{ marginTop: 16 }}>

      {/* Pace score summary */}
      <div style={{
        padding: '14px 16px', borderRadius: 14, marginBottom: 14,
        background: 'rgba(108,92,231,0.05)',
        border: '1px solid rgba(108,92,231,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', borderRadius: 100,
            background: `${niveauColor}18`,
            border: `1px solid ${niveauColor}33`,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: niveauColor }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: niveauColor, fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif' }}>
              {NIVEAU_LABELS[paceScore.niveau]}
            </span>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 20, fontWeight: 800, color: '#0F1B2D', fontFamily: 'var(--font-display, Lexend), sans-serif', fontVariantNumeric: 'tabular-nums' }}>
            {paceScore.total}<span style={{ fontSize: 12, fontWeight: 500, color: '#8B97AC' }}>/100</span>
          </span>
        </div>

        <p style={{ margin: '0 0 10px', fontSize: 12, color: '#5B6B85', fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif' }}>
          {paceScore.interpretation}
        </p>

        {/* Composantes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {([
            ['Temps', paceScore.composantes.respect_temps, 30],
            ['Transitions', paceScore.composantes.transitions, 20],
            ['Variété', paceScore.composantes.variete, 25],
            ['Storyboard', paceScore.composantes.storyboard, 15],
            ['Adaptations', paceScore.composantes.adaptations, 10],
          ] as [string, number, number][]).map(([label, val, max]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#8B97AC', width: 70, fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif', flexShrink: 0 }}>{label}</span>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(15,35,65,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${(val / max) * 100}%`, background: val / max >= 0.75 ? '#22C55E' : val / max >= 0.5 ? '#F59E0B' : '#EF4444' }} />
              </div>
              <span style={{ fontSize: 10, color: '#8B97AC', fontVariantNumeric: 'tabular-nums', width: 28, textAlign: 'right', fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif' }}>{val}/{max}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Replay timeline */}
      <h3 style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8B97AC', fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif' }}>
        Replay de séance
      </h3>

      <div style={{ position: 'relative', paddingLeft: 22 }}>
        {/* Vertical line */}
        <div style={{ position: 'absolute', left: 8, top: 6, bottom: 6, width: 2, borderRadius: 1, background: 'rgba(108,92,231,0.12)' }} />

        {replay.map((evt, i) => {
          const color = REPLAY_COLORS[evt.quality]
          return (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, position: 'relative', alignItems: 'flex-start' }}>
              {/* Dot */}
              <div style={{
                position: 'absolute', left: -22,
                width: 16, height: 16, borderRadius: '50%',
                background: `${color}20`,
                border: `2px solid ${color}`,
                top: 2, zIndex: 1,
              }} />

              {/* Time */}
              <span style={{ fontSize: 10, color: '#8B97AC', fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginTop: 2, fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif', width: 36 }}>
                +{evt.elapsed_min}min
              </span>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: evt.quality === 'attention' ? 400 : 600, color: evt.quality === 'attention' ? '#F59E0B' : '#0F1B2D', fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif', lineHeight: 1.3 }}>
                  {evt.label}
                </p>
                {evt.annotation && (
                  <p style={{ margin: '1px 0 0', fontSize: 10, color: color, fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif' }}>
                    {evt.annotation}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
