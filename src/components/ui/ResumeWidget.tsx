'use client'

// DS 2.0 — "Reprendre où vous étiez" widget (Mission 6)
// Smart resume card that shows last class/lesson worked on

interface ResumeItem {
  type:    'classe' | 'lecon' | 'sequence' | 'programme'
  title:   string
  sub?:    string
  href:    string
  icon?:   string
  tsStr?:  string
}

interface ResumeWidgetProps {
  item:    ResumeItem
  onGo:   (href: string) => void
  style?:  React.CSSProperties
}

const TYPE_META: Record<ResumeItem['type'], { label: string; icon: string; color: string }> = {
  classe:     { label: 'Classe',            icon: '🎓', color: 'var(--color-accent-violet)' },
  lecon:      { label: 'Leçon',             icon: '📖', color: '#059669'                   },
  sequence:   { label: 'Séquence',          icon: '📑', color: '#2563EB'                   },
  programme:  { label: 'Année scolaire',    icon: '📅', color: '#D97706'                   },
}

function formatRelative(iso?: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return "à l'instant"
  if (mins < 60) return `il y a ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `il y a ${hrs}h`
  return `il y a ${Math.floor(hrs / 24)}j`
}

export default function ResumeWidget({ item, onGo, style }: ResumeWidgetProps) {
  const meta = TYPE_META[item.type]

  return (
    <div
      className="ds-card ds-fade-in"
      style={{ padding: '16px 20px', cursor: 'pointer', ...style }}
      onClick={() => onGo(item.href)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onGo(item.href)}
      aria-label={`Reprendre : ${item.title}`}
    >
      {/* Label */}
      <div style={{
        fontSize:      'var(--text-xs)',
        fontWeight:    700,
        letterSpacing: '0.07em',
        color:         meta.color,
        textTransform: 'uppercase',
        marginBottom:  10,
        display:       'flex',
        alignItems:    'center',
        gap:           5,
      }}>
        <span aria-hidden>▶</span>
        Reprendre
        <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', textTransform: 'none', letterSpacing: 0 }}>
          · {meta.label}
        </span>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Icon */}
        <div style={{
          width:          40,
          height:         40,
          borderRadius:   10,
          background:     `${meta.color}18`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       20,
          flexShrink:     0,
          transition:     'transform var(--dur-base) var(--ease-spring)',
        }}
          aria-hidden
        >
          {item.icon ?? meta.icon}
        </div>

        {/* Title + sub */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize:     'var(--text-base)',
            fontWeight:   600,
            color:        'var(--color-text-primary)',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {item.title}
          </div>
          {(item.sub || item.tsStr) && (
            <div style={{
              fontSize:   'var(--text-xs)',
              color:      'var(--color-text-muted)',
              marginTop:  3,
              overflow:   'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {item.sub && <span>{item.sub}</span>}
              {item.sub && item.tsStr && <span> · </span>}
              {item.tsStr && <span>{formatRelative(item.tsStr)}</span>}
            </div>
          )}
        </div>

        {/* Arrow */}
        <div style={{
          fontSize:   20,
          color:      meta.color,
          opacity:    0.7,
          flexShrink: 0,
          transition: 'transform var(--dur-fast) var(--ease-out)',
        }}
          aria-hidden
        >
          →
        </div>
      </div>
    </div>
  )
}
