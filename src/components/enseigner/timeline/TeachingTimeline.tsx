'use client'

import { useState } from 'react'
import { useTeaching } from '@/contexts/enseigner/TeachingContext'
import { EVENT_LABELS, EVENT_COLORS, EVENT_EMOJIS } from '@/types/enseigner/timeline'
import type { KlassEvent } from '@/types/enseigner/timeline'

type ViewMode = 'vertical' | 'compact'

function formatTime(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

const COURSE_EVENTS = new Set(['COURSE_STARTED', 'COURSE_PAUSED', 'COURSE_RESUMED', 'COURSE_ENDED', 'COURSE_PANIC'])

interface Props {
  maxHeight?: number
}

export function TeachingTimeline({ maxHeight = 400 }: Props) {
  const { state } = useTeaching()
  const [view, setView] = useState<ViewMode>('vertical')
  const [filter, setFilter] = useState<'all' | 'course' | 'activity' | 'note'>('all')

  const events = state.timeline

  const filtered = filter === 'all' ? events
    : filter === 'course'   ? events.filter(e => COURSE_EVENTS.has(e.type))
    : filter === 'activity' ? events.filter(e => e.type.startsWith('ACTIVITY_'))
    : events.filter(e => e.type === 'NOTE_ADDED')

  if (events.length === 0) {
    return (
      <div style={{
        padding: '20px 16px', textAlign: 'center',
        color: '#8B97AC',
        fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
        fontSize: 13,
      }}>
        La timeline apparaîtra dès le démarrage du cours
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 4px', marginBottom: 4 }}>
        {(['all', 'course', 'activity', 'note'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '2px 8px', borderRadius: 100, border: 'none',
              background: filter === f ? 'rgba(108,92,231,0.15)' : 'transparent',
              color: filter === f ? '#6C5CE7' : '#8B97AC',
              fontSize: 10, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}
          >
            {f === 'all' ? 'Tout' : f === 'course' ? 'Cours' : f === 'activity' ? 'Activités' : 'Notes'}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: '#8B97AC', fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif' }}>
          {filtered.length} événements
        </span>
      </div>

      {/* Timeline */}
      <div style={{
        overflowY: 'auto',
        maxHeight,
        paddingRight: 4,
      }}>
        {view === 'vertical'
          ? <VerticalTimeline events={filtered} />
          : <CompactTimeline events={filtered} />
        }
      </div>
    </div>
  )
}

// ─── Vertical timeline (SC-03F Mission 6 — chosen format) ────────────────────

function VerticalTimeline({ events }: { events: KlassEvent[] }) {
  return (
    <div style={{ position: 'relative', paddingLeft: 24 }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute', left: 9, top: 8,
        width: 2, height: 'calc(100% - 16px)',
        background: 'rgba(108,92,231,0.15)',
        borderRadius: 1,
      }} />

      {events.map((evt, i) => {
        const color = EVENT_COLORS[evt.type] ?? '#8B97AC'
        const emoji = EVENT_EMOJIS[evt.type] ?? '·'
        const label = EVENT_LABELS[evt.type] ?? evt.type
        const isCourse = COURSE_EVENTS.has(evt.type)
        const title = typeof evt.payload.activite_titre === 'string' ? evt.payload.activite_titre
          : typeof evt.payload.a === 'string' ? `${evt.payload.a} + ${evt.payload.b as string}` : ''

        return (
          <div key={evt.id} style={{ display: 'flex', gap: 10, marginBottom: 10, position: 'relative' }}>
            {/* Dot */}
            <div style={{
              position: 'absolute', left: -24,
              width: 18, height: 18,
              borderRadius: '50%',
              background: isCourse ? color : `${color}22`,
              border: `2px solid ${color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, color: isCourse ? '#fff' : color,
              flexShrink: 0,
              top: 2,
              zIndex: 1,
            }}>
              {emoji}
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{
                  fontSize: 13, fontWeight: isCourse ? 700 : 600,
                  color: isCourse ? '#0F1B2D' : '#5B6B85',
                  fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                }}>
                  {label}
                </span>
                {title && (
                  <span style={{
                    fontSize: 11, color: '#8B97AC',
                    fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                    fontStyle: 'italic',
                  }}>
                    {title}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 1 }}>
                <span style={{
                  fontSize: 10, color: '#8B97AC',
                  fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatTime(evt.timestamp)}
                </span>
                {typeof evt.payload.duree_reelle === 'number' && typeof evt.payload.variance_min === 'number' && (
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: evt.payload.variance_min > 2 ? '#EF4444'
                         : evt.payload.variance_min < -2 ? '#22C55E'
                         : '#8B97AC',
                    fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                  }}>
                    {evt.payload.duree_reelle as number} min réel
                    {(evt.payload.variance_min as number) !== 0 && (
                      <> ({(evt.payload.variance_min as number) > 0 ? '+' : ''}{evt.payload.variance_min as number} min)</>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Compact timeline (horizontal condensed) ──────────────────────────────────

function CompactTimeline({ events }: { events: KlassEvent[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {events.map(evt => {
        const color = EVENT_COLORS[evt.type] ?? '#8B97AC'
        const label = EVENT_LABELS[evt.type] ?? evt.type
        return (
          <div key={evt.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 8px', borderRadius: 6,
            background: 'rgba(15,35,65,0.03)',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: color, flexShrink: 0,
            }} />
            <span style={{
              fontSize: 10, color: '#8B97AC', fontVariantNumeric: 'tabular-nums',
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
              flexShrink: 0, width: 58,
            }}>
              {formatTime(evt.timestamp)}
            </span>
            <span style={{
              fontSize: 12, color: '#5B6B85',
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
              flex: 1,
            }}>
              {label}
              {typeof evt.payload.activite_titre === 'string' && ` · ${evt.payload.activite_titre as string}`}
            </span>
          </div>
        )
      })}
    </div>
  )
}
