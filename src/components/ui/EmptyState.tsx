'use client'

// DS 2.0 — Contextual empty state component
// Replaces "Aucun contenu" with actionable, contextual messages

interface EmptyAction {
  label:   string
  onClick: () => void
  primary?: boolean
}

interface EmptyStateProps {
  icon?:       string
  title:       string
  description?: string
  actions?:    EmptyAction[]
  compact?:    boolean
  style?:      React.CSSProperties
}

export default function EmptyState({
  icon,
  title,
  description,
  actions = [],
  compact = false,
  style,
}: EmptyStateProps) {
  return (
    <div
      className="ds-empty ds-fade-in"
      style={{
        padding: compact ? '28px 16px' : undefined,
        ...style,
      }}
    >
      {icon && (
        <div className="ds-empty-icon" aria-hidden>
          {icon}
        </div>
      )}
      <h3 className="ds-empty-title">{title}</h3>
      {description && (
        <p className="ds-empty-desc">{description}</p>
      )}
      {actions.length > 0 && (
        <div className="ds-empty-actions">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className="ds-focus"
              style={{
                padding:      action.primary ? '9px 20px' : '8px 16px',
                fontSize:     13,
                fontWeight:   600,
                borderRadius: 'var(--radius-sm)',
                border:       action.primary ? 'none' : '1px solid var(--color-border)',
                background:   action.primary
                  ? 'var(--violet, #6C5CE7)'
                  : 'var(--color-card-bg)',
                color:        action.primary ? '#fff' : 'var(--color-text-secondary)',
                cursor:       'pointer',
                fontFamily:   'inherit',
                boxShadow:    action.primary ? '0 4px 12px rgba(108,92,231,0.28)' : 'none',
                transition:   'all var(--dur-base) var(--ease-out)',
              }}
              onMouseEnter={e => {
                if (action.primary) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(108,92,231,0.38)'
                } else {
                  e.currentTarget.style.background = 'var(--color-bg-hover)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = action.primary ? '0 4px 12px rgba(108,92,231,0.28)' : 'none'
                e.currentTarget.style.background = action.primary ? 'var(--violet, #6C5CE7)' : 'var(--color-card-bg)'
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
