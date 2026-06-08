'use client'

const BADGE_META: Record<string, { emoji: string; label: string; color: string }> = {
  champion:    { emoji: '🥇', label: 'Champion',       color: '#F59E0B' },
  finaliste:   { emoji: '🥈', label: 'Finaliste',      color: '#C0C0C0' },
  medaille:    { emoji: '🥉', label: 'Médaillé',       color: '#CD7F32' },
  eclair:      { emoji: '⚡', label: 'Éclair',         color: '#FCD34D' },
  precision:   { emoji: '🎯', label: 'Précision',      color: '#60A5FA' },
  en_feu:      { emoji: '🔥', label: 'En feu !',       color: '#F87171' },
  genie:       { emoji: '💡', label: 'Génie',          color: '#A78BFA' },
  participant: { emoji: '🌟', label: 'Participant',     color: '#34D399' },
}

interface BadgeAnimationProps {
  badge: string
  score?: number
}

export default function BadgeAnimation({ badge, score }: BadgeAnimationProps) {
  const meta = BADGE_META[badge] || BADGE_META.participant

  return (
    <div style={{ textAlign: 'center' }}>
      <style>{`
        @keyframes badgeBounce {
          0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
          40%  { transform: scale(1.3) rotate(5deg);  opacity: 1; }
          60%  { transform: scale(0.9) rotate(-3deg); }
          80%  { transform: scale(1.1) rotate(2deg);  }
          100% { transform: scale(1)   rotate(0deg);  }
        }
        @keyframes badgeGlow {
          0%, 100% { text-shadow: 0 0 20px ${meta.color}80; }
          50%      { text-shadow: 0 0 48px ${meta.color}, 0 0 80px ${meta.color}60; }
        }
        @keyframes badgeTextFade {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      <div style={{
        fontSize: 96,
        animation: 'badgeBounce 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards, badgeGlow 2s ease-in-out 0.8s infinite',
        display: 'inline-block',
        marginBottom: 12,
      }}>
        {meta.emoji}
      </div>

      <div style={{
        fontSize: 22, fontWeight: 800, color: meta.color,
        animation: 'badgeTextFade 0.5s ease 0.5s both',
        textShadow: `0 0 24px ${meta.color}60`,
        marginBottom: 6,
      }}>
        Badge {meta.label}
      </div>

      <div style={{
        fontSize: 15, color: 'rgba(255,255,255,0.55)',
        animation: 'badgeTextFade 0.5s ease 0.7s both',
        marginBottom: score !== undefined ? 12 : 0,
      }}>
        Tu as gagné le badge {meta.label} !
      </div>

      {score !== undefined && (
        <div style={{
          fontSize: 28, fontWeight: 900, color: '#F59E0B',
          animation: 'badgeTextFade 0.5s ease 0.9s both',
        }}>
          {score.toLocaleString()} pts
        </div>
      )}
    </div>
  )
}
