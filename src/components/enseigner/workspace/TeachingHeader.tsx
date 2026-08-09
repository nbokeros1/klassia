'use client'

import { useTeaching } from '@/contexts/enseigner/TeachingContext'
import { TimerWidget } from '../timer/TimerWidget'
import { useRouter } from 'next/navigation'

interface Props {
  storyboardOpen: boolean
  onToggleStoryboard: () => void
}

const SESSION_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  idle:    { label: 'Prêt',        color: '#8B97AC', bg: 'rgba(139,151,172,0.12)' },
  active:  { label: 'En cours',    color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
  paused:  { label: 'Pause',       color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  panic:   { label: 'Imprévu',     color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  closing: { label: 'Fin...',      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
  done:    { label: 'Terminé',     color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
}

export function TeachingHeader({ storyboardOpen, onToggleStoryboard }: Props) {
  const { state, pauseCourse, resumeCourse, beginEnd } = useTeaching()
  const router = useRouter()

  const isIdle    = state.sessionState === 'idle'
  const isActive  = state.sessionState === 'active'
  const isPaused  = state.sessionState === 'paused'
  const isDone    = state.sessionState === 'done'
  const badge     = SESSION_BADGE[state.sessionState] ?? SESSION_BADGE.idle

  const handleLeave = () => {
    router.push('/dashboard/gerer/enseigner')
  }

  return (
    <header style={{
      height: 56,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0 16px',
      background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(15,35,65,0.08)',
      zIndex: 10,
      flexShrink: 0,
    }}>
      {/* Storyboard toggle */}
      {!storyboardOpen && (
        <button
          onClick={onToggleStoryboard}
          style={{
            background: 'rgba(108,92,231,0.1)', border: 'none',
            borderRadius: 8, width: 32, height: 32,
            cursor: 'pointer', color: '#6C5CE7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0, transition: 'background 0.15s',
          }}
          title="Afficher le storyboard"
        >
          ☰
        </button>
      )}

      {/* Session info */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {state.meta && (
            <>
              <span style={{
                fontSize: 13, fontWeight: 700,
                fontFamily: 'var(--font-display, Lexend), sans-serif',
                color: '#0F1B2D',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 260,
              }}>
                {state.meta.lecon_titre}
              </span>
              <span style={{ color: '#8B97AC', fontSize: 12 }}>·</span>
              <span style={{
                fontSize: 12, color: '#8B97AC',
                fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                whiteSpace: 'nowrap',
              }}>
                {state.meta.classe_nom}
              </span>
              <span style={{ color: '#8B97AC', fontSize: 12 }}>·</span>
              <span style={{
                fontSize: 12, color: '#8B97AC',
                fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                whiteSpace: 'nowrap',
              }}>
                {state.meta.matiere}
              </span>
            </>
          )}
        </div>
        {/* State badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '1px 7px', borderRadius: 100, marginTop: 2,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
          background: badge.bg, color: badge.color,
          fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
          alignSelf: 'flex-start',
        }}>
          {isActive && (
            <span style={{
              display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
              background: badge.color, marginRight: 4,
              animation: 'klassia-pulse 2s ease-in-out infinite',
            }} />
          )}
          {badge.label}
        </span>
      </div>

      {/* Timer */}
      <TimerWidget />

      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {isActive && (
          <button
            onClick={pauseCourse}
            style={{
              padding: '6px 14px', borderRadius: 10, border: 'none',
              background: 'rgba(245,158,11,0.12)', color: '#D97706',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
              transition: 'background 0.15s',
            }}
            title="Mettre en pause"
          >
            ⏸ Pause
          </button>
        )}

        {isPaused && (
          <button
            onClick={resumeCourse}
            style={{
              padding: '6px 14px', borderRadius: 10, border: 'none',
              background: 'rgba(34,197,94,0.12)', color: '#16A34A',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
              transition: 'background 0.15s',
            }}
          >
            ▶ Reprendre
          </button>
        )}

        {(isActive || isPaused) && (
          <button
            onClick={beginEnd}
            style={{
              padding: '6px 14px', borderRadius: 10,
              border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.08)', color: '#DC2626',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
              transition: 'background 0.15s',
            }}
          >
            Terminer le cours
          </button>
        )}

        {(isIdle || isDone) && (
          <button
            onClick={handleLeave}
            style={{
              padding: '6px 14px', borderRadius: 10, border: 'none',
              background: 'rgba(139,151,172,0.15)', color: '#5B6B85',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
            }}
          >
            ← Retour
          </button>
        )}
      </div>
    </header>
  )
}
