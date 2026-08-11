'use client'

// DS 2.0 — IA Generation Timeline
// Mission 7: remplace les loaders classiques par une timeline IA vivante
// Usage: <IATimeline steps={steps} />

export type TimelineStepStatus = 'done' | 'active' | 'pending' | 'error' | 'skipped'

export interface TimelineStep {
  id:      string
  label:   string
  sub?:    string
  status:  TimelineStepStatus
}

interface IATimelineProps {
  steps:   TimelineStep[]
  style?:  React.CSSProperties
  compact?:boolean
}

const STEP_ICONS: Record<TimelineStepStatus, string> = {
  done:    '✓',
  active:  '●',
  pending: '○',
  error:   '✕',
  skipped: '–',
}

export default function IATimeline({ steps, style, compact }: IATimelineProps) {
  return (
    <div
      className="ds-timeline ds-fade-in"
      role="list"
      aria-label="Progression de la génération IA"
      style={style}
    >
      {steps.map((step, i) => (
        <div
          key={step.id}
          className="ds-timeline-item"
          role="listitem"
          style={{ paddingBottom: i < steps.length - 1 ? (compact ? 4 : 0) : 0 }}
        >
          {/* Track column */}
          <div className="ds-timeline-track-col">
            <div className="ds-timeline-dot" data-status={step.status} aria-hidden>
              {step.status === 'active' ? (
                <ActiveSpinner />
              ) : step.status === 'done' ? (
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 700, lineHeight: 1 }}>✓</span>
              ) : step.status === 'error' ? (
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 700, lineHeight: 1 }}>✕</span>
              ) : null}
            </div>
          </div>

          {/* Content */}
          <div
            className="ds-timeline-body"
            data-status={step.status}
            style={{ paddingBottom: compact ? 12 : 20 }}
          >
            <div
              className="ds-timeline-label"
              data-status={step.status}
            >
              {step.label}
              {step.status === 'active' && (
                <span style={{ marginLeft: 6 }}>
                  <DotLoader />
                </span>
              )}
            </div>
            {step.sub && (
              <div className="ds-timeline-sub">{step.sub}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Micro-composants internes ──────────────────────────────────────────────

function ActiveSpinner() {
  return (
    <div
      style={{
        width: 10, height: 10,
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'ds-spin-gentle 0.8s linear infinite',
      }}
      aria-hidden
    />
  )
}

function DotLoader() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, verticalAlign: 'middle' }} aria-hidden>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 4, height: 4,
            borderRadius: '50%',
            background: 'var(--color-accent-violet)',
            display: 'inline-block',
            animation: `ds-dot-pulse 1.4s ease-in-out ${i * 0.16}s infinite`,
          }}
        />
      ))}
    </span>
  )
}
