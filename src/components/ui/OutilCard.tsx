'use client'

type BadgeType = 'Pro+' | 'Bêta' | null

interface OutilCardProps {
  icone: string
  titre: string
  description: string
  badge?: BadgeType
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}

export default function OutilCard({
  icone,
  titre,
  description,
  badge = null,
  active = false,
  disabled = false,
  onClick,
}: OutilCardProps) {
  const classes = [
    'outil-card',
    active ? 'card-active' : '',
    disabled ? 'disabled' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={classes} onClick={() => !disabled && onClick?.()}>
      {badge && (
        <div style={{
          position: 'absolute', top: 9, right: 9,
          fontSize: 9, fontWeight: 700, padding: '2px 7px',
          borderRadius: 99,
          background: badge === 'Pro+' ? 'var(--violet-soft, #EDE9FE)' : 'rgba(245,158,11,0.14)',
          color: badge === 'Pro+' ? 'var(--violet, #6C5CE7)' : '#F59E0B',
          letterSpacing: '0.04em',
        }}>
          {disabled ? '🔒 ' : ''}{badge}
        </div>
      )}
      <div className="outil-icon-wrap">{icone}</div>
      <div className="outil-titre">{titre}</div>
      <div className="outil-desc">{description}</div>
    </div>
  )
}
