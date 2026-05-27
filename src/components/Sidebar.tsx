'use client'

import { useRouter } from 'next/navigation'

const NAV_ORG = [
  { label: 'Tableau de bord', icon: '⌂', href: '/dashboard' },
  { label: 'Mes classes', icon: '🏫', href: '/dashboard/classes' },
  { label: 'Calendrier', icon: '📅', href: '/dashboard/calendrier' },
  { label: 'Planification', icon: '📋', href: '/dashboard/planification' },
  { label: 'Ressources', icon: '📁', href: '/dashboard/ressources' },
  { label: 'Communication', icon: '💬', href: '/dashboard/communication' },
]

const NAV_IA = [
  { label: 'Studio IA', icon: '✦', href: '/dashboard/studio' },
  { label: 'Sondage QR', icon: '📊', href: '/dashboard/sondage' },
  { label: 'Historique', icon: '🕒', href: '/dashboard/historique' },
  { label: 'Mon profil IA', icon: '🧠', href: '/dashboard/profil-ia' },
]

interface SidebarProps {
  profil: any
  activeHref: string
  onLogout?: () => void
}

export default function Sidebar({ profil, activeHref, onLogout }: SidebarProps) {
  const router = useRouter()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">K</div>
        <div className="sidebar-brand">Klass<span>IA</span></div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Organisation</div>
        {NAV_ORG.map((item, i) => (
          <div key={i}
            className={`sidebar-item ${activeHref === item.href ? 'active' : ''}`}
            onClick={() => router.push(item.href)}>
            <span className="sidebar-item-icon">{item.icon}</span>{item.label}
          </div>
        ))}
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-section">
        <div className="sidebar-label sidebar-label-ia">IA Pédagogique</div>
        {NAV_IA.map((item, i) => (
          <div key={i}
            className={`sidebar-item ${activeHref === item.href ? 'active-ia' : ''}`}
            onClick={() => router.push(item.href)}
            style={{ color: activeHref === item.href ? undefined : 'var(--violet-mid)' }}>
            <span className="sidebar-item-icon">{item.icon}</span>{item.label}
          </div>
        ))}
      </div>

      <div className="sidebar-user"
        onClick={() => router.push('/dashboard/profil')}
        style={{ cursor: 'pointer', transition: 'background 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <div className="sidebar-avatar">
          {profil?.prenom?.[0]?.toUpperCase()}{profil?.nom?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profil?.prenom} {profil?.nom}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profil?.ecole || 'KlassIA'}
          </div>
        </div>
        {onLogout && (
          <button onClick={e => { e.stopPropagation(); onLogout() }} title="Déconnexion"
            style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: '16px', cursor: 'pointer', padding: '4px', flexShrink: 0, transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--coral)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-4)')}>
            ⏻
          </button>
        )}
      </div>
    </aside>
  )
}
