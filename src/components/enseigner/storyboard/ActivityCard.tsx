'use client'

import { useSectionTimer } from '@/hooks/enseigner/useTeachingTimer'
import type { TeachingActivity } from '@/types/enseigner'

const STATE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  prevue:    { bg: 'rgba(139,151,172,0.12)', text: '#8B97AC', border: 'transparent' },
  prete:     { bg: 'rgba(108,92,231,0.08)', text: '#6C5CE7', border: 'rgba(108,92,231,0.3)' },
  en_cours:  { bg: 'rgba(108,92,231,0.15)', text: '#6C5CE7', border: '#6C5CE7' },
  pausee:    { bg: 'rgba(245,158,11,0.12)', text: '#D97706', border: 'rgba(245,158,11,0.4)' },
  terminee:  { bg: 'rgba(34,197,94,0.12)',  text: '#16A34A', border: 'rgba(34,197,94,0.4)' },
  reportee:  { bg: 'rgba(245,158,11,0.12)', text: '#D97706', border: 'rgba(245,158,11,0.4)' },
  annulee:   { bg: 'rgba(239,68,68,0.08)',  text: '#DC2626', border: 'rgba(239,68,68,0.3)' },
}

const STATE_LABEL: Record<string, string> = {
  prevue: 'À venir', prete: 'Prête', en_cours: 'En cours',
  pausee: 'En pause', terminee: 'Terminée', reportee: 'Reportée', annulee: 'Annulée',
}

interface Props {
  activity: TeachingActivity
  isCurrent: boolean
  onClick: () => void
}

export function ActivityCard({ activity, isCurrent, onClick }: Props) {
  const isActive = activity.etat === 'en_cours'
  const { percent, color } = useSectionTimer(
    activity.started_at,
    activity.duree_prevue,
    isActive,
  )

  const style = STATE_COLORS[activity.etat] ?? STATE_COLORS.prevue
  const isDone  = activity.etat === 'terminee'
  const isSkipped = activity.etat === 'annulee' || activity.etat === 'reportee'

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 12,
        border: `1.5px solid ${isCurrent ? '#6C5CE7' : style.border}`,
        background: isCurrent ? 'rgba(108,92,231,0.12)' : style.bg,
        cursor: isSkipped ? 'default' : 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s ease',
        opacity: isDone || isSkipped ? 0.65 : 1,
        position: 'relative',
        overflow: 'hidden',
      }}
      disabled={isSkipped}
      title={activity.titre}
    >
      {/* progress bar underlay for active activity */}
      {isActive && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0,
          height: 2,
          width: `${Math.min(100, percent)}%`,
          background: color === 'red' ? '#EF4444' : color === 'amber' ? '#F59E0B' : '#6C5CE7',
          transition: 'width 1s linear, background 0.5s',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* emoji */}
        <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{activity.emoji}</span>

        {/* info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: isCurrent ? '#6C5CE7' : style.text,
            fontFamily: 'var(--font-display, Lexend), sans-serif',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {activity.titre}
          </p>
          <p style={{
            margin: '2px 0 0',
            fontSize: 11,
            color: '#8B97AC',
            fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
          }}>
            {activity.duree_prevue} min
            {isDone && ' · ✓'}
            {activity.etat === 'reportee' && ' · reportée'}
          </p>
        </div>

        {/* state pill */}
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: 100,
          background: style.bg,
          color: style.text,
          border: `1px solid ${style.border}`,
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
          letterSpacing: '0.02em',
        }}>
          {STATE_LABEL[activity.etat] ?? activity.etat}
        </span>
      </div>
    </button>
  )
}
