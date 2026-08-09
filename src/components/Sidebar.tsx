'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ForfaitType } from '@/lib/types/database'
import { FEATURE_DARK_MODE_ENABLED, FEATURE_COMMUNAUTE_VISIBLE } from '@/lib/constants/features'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { ScorgiaLogo } from '@/components/branding/scorgia-logo'

// ─── Forfait badge ────────────────────────────────────────────────────────────

const FORFAIT_BADGE: Record<ForfaitType, { label: string; color: string; bg: string }> = {
  gratuit:     { label: 'Gratuit',     color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.08)' },
  pro:         { label: 'Pro',         color: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.10)' },
  pro_plus:    { label: 'Pro+',        color: 'rgba(255,255,255,0.65)', bg: 'rgba(108,92,231,0.25)'  },
  institution: { label: 'Institution', color: 'rgba(255,255,255,0.65)', bg: 'rgba(34,197,94,0.20)'   },
}

// ─── Nav admin ────────────────────────────────────────────────────────────────

const NAV_ADMIN = [
  { label: "Founder Center", emoji: '🚀', href: '/founder'                      },
  { label: 'Utilisateurs',   emoji: '👥', href: '/dashboard/admin/utilisateurs' },
  { label: 'Inscriptions',   emoji: '👤', href: '/dashboard/admin/inscriptions' },
  { label: 'Analytics',      emoji: '📈', href: '/dashboard/admin/analytics'    },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  profil: any
  activeHref: string
  onLogout?: () => void
  notifCount?: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar({ profil, activeHref, onLogout, notifCount }: SidebarProps) {
  const router  = useRouter()
  const isAdmin = profil?.is_admin === true || profil?.type_compte === 'admin'
  const forfait = (profil?.forfait || 'gratuit') as ForfaitType
  const badge   = FORFAIT_BADGE[forfait]
  const isFr    = profil?.langue !== 'en'

  const [adminMode, setAdminMode] = useState(false)

  useEffect(() => {
    if (isAdmin) setAdminMode(localStorage.getItem('klassia_admin_mode') === 'true')
  }, [isAdmin])

  const toggleAdminMode = () => {
    const next = !adminMode
    setAdminMode(next)
    localStorage.setItem('klassia_admin_mode', String(next))
    router.push(next ? '/founder' : '/dashboard')
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return activeHref === '/dashboard'
    return activeHref === href || activeHref.startsWith(href + '/')
  }

  // ── NavItem ───────────────────────────────────────────────────────────────

  const NavItem = ({
    label, emoji, href, extraBadge,
  }: {
    label: string
    emoji: string
    href: string
    extraBadge?: React.ReactNode
  }) => {
    const active = isActive(href)
    return (
      <div
        className={`sidebar-item${active ? ' active' : ''}`}
        onClick={() => router.push(href)}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'rgba(255,255,255,0.62)'
          }
        }}
      >
        <span className="sidebar-item-icon">
          <span style={{ fontSize: 14 }}>{emoji}</span>
        </span>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        {extraBadge}
      </div>
    )
  }

  // ── SectionLabel ──────────────────────────────────────────────────────────

  const SectionLabel = ({ label }: { label: string }) => (
    <div className="sidebar-label">{label}</div>
  )

  // ── Admin mode ────────────────────────────────────────────────────────────

  if (adminMode) {
    return (
      <aside className="sidebar">
        {/* Logo admin */}
        <div className="sidebar-logo" onClick={() => router.push('/dashboard')} style={{ cursor: 'pointer' }}>
          <ScorgiaLogo variant="icon" width={28} height={28} />
          <div style={{ flex: 1 }}>
            <div className="sidebar-brand">
              Scorg<span style={{ color: '#60A5FA' }}>IA</span>
            </div>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#60A5FA', padding: '2px 7px', background: 'rgba(96,165,250,0.18)', borderRadius: 99 }}>ADMIN</span>
        </div>

        <div style={{ margin: '10px 12px 4px', padding: '6px 10px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 8, fontSize: 10, color: '#60A5FA', fontWeight: 600, textAlign: 'center', letterSpacing: '0.5px' }}>
          🛡️ MODE ADMINISTRATEUR
        </div>

        <div className="sidebar-section">
          {NAV_ADMIN.map((item, i) => (
            <NavItem key={i} label={item.label} emoji={item.emoji} href={item.href} />
          ))}
        </div>

        <div className="sidebar-divider" />

        {FEATURE_DARK_MODE_ENABLED && (
          <div style={{ padding: '4px 8px' }}><ThemeToggle /></div>
        )}

        <div style={{ marginTop: 'auto' }}>
          <UserCard profil={profil} badge={badge} adminMode onLogout={onLogout} router={router} />
          <AdminToggle adminMode={adminMode} toggleAdminMode={toggleAdminMode} />
        </div>
      </aside>
    )
  }

  // ── Enseignant mode ───────────────────────────────────────────────────────

  return (
    <aside className="sidebar">
      {/* ── Logo ─────────────────────────────────────────────────── */}
      <div className="sidebar-logo" onClick={() => router.push('/dashboard')} style={{ cursor: 'pointer' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
        <ScorgiaLogo variant="icon" width={28} height={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sidebar-brand">ScorgIA</div>
        </div>
        <span style={{
          fontSize: 9, fontWeight: 700,
          color: badge.color, padding: '2px 8px',
          background: badge.bg, borderRadius: 99,
          letterSpacing: '0.3px', flexShrink: 0,
        }}>{badge.label}</span>
      </div>

      {/* ── Navigation plate ──────────────────────────────────────── */}
      <div className="sidebar-section" style={{ paddingTop: 8 }}>
        <NavItem label={isFr ? 'Tableau de bord' : 'Dashboard'}         emoji="🏠"  href="/dashboard" />
        <NavItem label={isFr ? 'Mes classes' : 'My Classes'}             emoji="🎓"  href="/dashboard/classes" />
        <NavItem label={isFr ? 'Bibliothèque' : 'Library'}               emoji="📚"  href="/dashboard/bibliotheque" />
        <NavItem label={isFr ? 'Préparer' : 'Prepare'}                   emoji="✨"  href="/dashboard/gerer/preparer" />
        <NavItem label={isFr ? 'Enseigner' : 'Teach'}                    emoji="🖥️"  href="/dashboard/gerer/enseigner" />
        <NavItem label={isFr ? 'Agenda intelligent' : 'Smart Agenda'}    emoji="🗓️"  href="/dashboard/calendrier" />
        <NavItem label={isFr ? 'Outils enseignant' : 'Teaching Tools'}   emoji="🛠️"  href="/dashboard/outils" />
        <NavItem label={isFr ? 'Suivi' : 'Tracking'}                     emoji="📈"  href="/dashboard/suivre"
          extraBadge={notifCount && notifCount > 0
            ? <span style={{ fontSize: 9, fontWeight: 800, color: 'white', padding: '1px 5px', background: '#F87171', borderRadius: 99, minWidth: 16, textAlign: 'center', flexShrink: 0 }}>
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            : null}
        />
        {FEATURE_COMMUNAUTE_VISIBLE && (
          <NavItem label={isFr ? 'Communauté' : 'Community'} emoji="💬" href="/dashboard/communaute" />
        )}
      </div>

      <div className="sidebar-divider" />

      {/* ── Paramètres ───────────────────────────────────────────── */}
      <div className="sidebar-section">
        <NavItem label={isFr ? 'Paramètres' : 'Settings'}      emoji="⚙️"  href="/dashboard/profil" />
        {isAdmin && (
          <NavItem label={isFr ? 'Administration' : 'Administration'} emoji="🛡️" href="/founder" />
        )}
      </div>

      <div className="sidebar-divider" />

      {/* ThemeToggle — masqué tant que FEATURE_DARK_MODE_ENABLED = false */}
      {FEATURE_DARK_MODE_ENABLED && (
        <div style={{ padding: '4px 8px' }}><ThemeToggle /></div>
      )}

      {/* ── Profil utilisateur ───────────────────────────────────── */}
      <div style={{ marginTop: 'auto', paddingBottom: 8 }}>
        <UserCard profil={profil} badge={badge} adminMode={false} onLogout={onLogout} router={router} />
        {isAdmin && <AdminToggle adminMode={adminMode} toggleAdminMode={toggleAdminMode} />}
      </div>
    </aside>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function UserCard({ profil, badge, adminMode, onLogout, router }: {
  profil: any
  badge: { label: string; color: string; bg: string }
  adminMode: boolean
  onLogout?: () => void
  router: ReturnType<typeof useRouter>
}) {
  return (
    <div className="sidebar-user"
      onClick={() => router.push(adminMode ? '/founder' : '/dashboard/profil')}>
      <div className="sidebar-avatar"
        style={adminMode ? { background: 'linear-gradient(135deg,#1B3F6E,#2563EB)' } : undefined}>
        {profil?.prenom?.[0]?.toUpperCase()}{profil?.nom?.[0]?.toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {profil?.prenom}
        </div>
        <div style={{ fontSize: 10.5, marginTop: 1 }}>
          {adminMode
            ? <span style={{ color: '#60A5FA' }}>🛡️ Administrateur</span>
            : <span style={{ color: badge.color }}>{badge.label}</span>}
        </div>
      </div>
      {onLogout && (
        <button
          onClick={e => { e.stopPropagation(); onLogout() }}
          title="Déconnexion"
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: '4px 6px', flexShrink: 0, fontSize: 14, lineHeight: 1, transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#F87171')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
          ↩
        </button>
      )}
    </div>
  )
}

function AdminToggle({ adminMode, toggleAdminMode }: {
  adminMode: boolean
  toggleAdminMode: () => void
}) {
  return (
    <div style={{ padding: '4px 12px 8px' }}>
      <button onClick={toggleAdminMode} style={{
        width: '100%', padding: '8px 10px',
        background: adminMode ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${adminMode ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
        transition: 'all 0.18s', color: adminMode ? '#60A5FA' : 'rgba(255,255,255,0.45)',
      }}
        onMouseEnter={e => e.currentTarget.style.background = adminMode ? 'rgba(96,165,250,0.18)' : 'rgba(255,255,255,0.07)'}
        onMouseLeave={e => e.currentTarget.style.background = adminMode ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.04)'}
      >
        <span style={{ fontSize: 14 }}>🛡️</span>
        <span style={{ fontSize: 11, fontWeight: 600, flex: 1, textAlign: 'left' }}>
          {adminMode ? 'Mode enseignant' : 'Mode admin'}
        </span>
        <div style={{ width: 28, height: 16, borderRadius: 99, background: adminMode ? '#60A5FA' : 'rgba(255,255,255,0.15)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
          <div style={{ position: 'absolute', top: 2, left: adminMode ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
        </div>
      </button>
    </div>
  )
}
