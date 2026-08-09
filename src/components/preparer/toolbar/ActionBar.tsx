'use client'

// ─── Props ────────────────────────────────────────────────────────────────────
export interface ActionBarProps {
  isFr:        boolean
  isStreaming:  boolean
  onAction:    (prompt: string) => void
}

// ─── Définition des actions contextuelles ─────────────────────────────────────
const CONTEXTUAL_ACTIONS = [
  {
    id: 'ameliorer',
    emoji: '🔍',
    labelFr: 'Améliorer',
    labelEn: 'Improve',
    promptFr: 'Améliore et enrichis ce contenu avec plus de détails et d\'exemples concrets.',
    promptEn: 'Improve and enrich this content with more details and concrete examples.',
  },
  {
    id: 'adapter',
    emoji: '🎯',
    labelFr: 'Adapter',
    labelEn: 'Adapt',
    promptFr: 'Adapte ce contenu à différents niveaux d\'élèves dans ma classe.',
    promptEn: 'Adapt this content for different student levels in my class.',
  },
  {
    id: 'differencier',
    emoji: '🌈',
    labelFr: 'Différencier',
    labelEn: 'Differentiate',
    promptFr: 'Propose des activités différenciées pour les élèves ayant des besoins particuliers.',
    promptEn: 'Suggest differentiated activities for students with special needs.',
  },
  {
    id: 'reformuler',
    emoji: '✏️',
    labelFr: 'Reformuler',
    labelEn: 'Rephrase',
    promptFr: 'Reformule ce contenu de manière plus claire et accessible pour mes élèves.',
    promptEn: 'Rephrase this content in a clearer, more accessible way for my students.',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────
export function ActionBar({ isFr, isStreaming, onAction }: ActionBarProps) {
  return (
    <div style={{
      flexShrink: 0,
      padding: '6px 24px 4px',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      borderTop: '1px solid rgba(15,35,65,0.05)',
      background: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      overflowX: 'auto',
    }}>

      <span style={{
        fontSize: 10, fontWeight: 700,
        color: 'var(--text-muted)',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        marginRight: 4,
        flexShrink: 0,
      }}>
        {isFr ? 'Réviser' : 'Revise'}
      </span>

      {CONTEXTUAL_ACTIONS.map(action => (
        <button
          key={action.id}
          onClick={() => !isStreaming && onAction(isFr ? action.promptFr : action.promptEn)}
          disabled={isStreaming}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 11px',
            borderRadius: 20,
            border: '1.5px solid rgba(108,92,231,0.12)',
            background: 'rgba(255,255,255,0.85)',
            color: 'var(--text-secondary)',
            fontSize: 12, fontWeight: 500,
            cursor: isStreaming ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.12s',
            opacity: isStreaming ? 0.5 : 1,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            if (!isStreaming) {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--violet)'
              ;(e.currentTarget as HTMLElement).style.background = 'var(--violet-soft, #EDE9FE)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--violet)'
            }
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(108,92,231,0.12)'
            ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.85)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
          }}>
          <span style={{ fontSize: 12 }}>{action.emoji}</span>
          <span>{isFr ? action.labelFr : action.labelEn}</span>
        </button>
      ))}
    </div>
  )
}
