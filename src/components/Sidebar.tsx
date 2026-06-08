'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ForfaitType } from '@/lib/types/database'
import ThemeToggle from '@/components/ui/ThemeToggle'

// ─── SVG icons ───────────────────────────────────────────────────────────────

function TIcon({ paths, size = 16 }: { paths: readonly string[]; size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

const ICONS = {
  home:         ['M5 12l-2 0l9 -9l9 9l-2 0', 'M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7', 'M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6'],
  school:       ['M22 9l-10 -4l-10 4l10 4l10 -4v6', 'M6 10.6v5.4a6 3 0 0 0 12 0v-5.4'],
  sparkles:     ['M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z'],
  tool:         ['M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5'],
  users2:       ['M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0', 'M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2', 'M16 3.13a4 4 0 0 1 0 7.75', 'M21 21v-2a4 4 0 0 0 -3 -3.85'],
  calendar:     ['M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z', 'M16 3v4', 'M8 3v4', 'M4 11h16', 'M8 15h2v2h-2z'],
  settings:     ['M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z', 'M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0'],
  shield:       ['M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3'],
  users:        ['M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0', 'M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2', 'M16 3.13a4 4 0 0 1 0 7.75', 'M21 21v-2a4 4 0 0 0 -3 -3.85'],
  trending:     ['M3 17l4 -4l4 4l4 -8l4 4', 'M3 7h2', 'M3 12h2', 'M3 17h2'],
  userPlus:     ['M8 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0', 'M16 19h6', 'M19 16v6', 'M6 21v-2a4 4 0 0 1 4 -4h4'],
  chartLine:    ['M4 19l4 -8l4 4l4 -6l4 10'],
  chevronDown:  ['M6 9l6 6l6 -6'],
  chevronRight: ['M9 6l6 6l-6 6'],
  logout:       ['M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2', 'M9 12h12l-3 -3', 'M18 15l3 -3'],
} as const

// ─── Forfait badge ────────────────────────────────────────────────────────────

const FORFAIT_BADGE: Record<ForfaitType, { label: string; color: string; bg: string }> = {
  gratuit:     { label: 'Gratuit',     color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' },
  pro:         { label: 'Pro',         color: '#60A5FA', bg: 'rgba(96,165,250,0.15)'  },
  pro_plus:    { label: 'Pro+',        color: '#A78BFA', bg: 'rgba(167,139,250,0.15)' },
  institution: { label: 'Institution', color: '#34D399', bg: 'rgba(52,211,153,0.15)'  },
}

// ─── Nav admin ────────────────────────────────────────────────────────────────

const NAV_ADMIN = [
  { label: "Vue d'ensemble", icon: 'chartLine' as keyof typeof ICONS, href: '/dashboard/ecole'               },
  { label: 'Utilisateurs',   icon: 'users'     as keyof typeof ICONS, href: '/dashboard/admin/utilisateurs' },
  { label: 'Inscriptions',   icon: 'userPlus'  as keyof typeof ICONS, href: '/dashboard/admin/inscriptions' },
  { label: 'Analytics',      icon: 'trending'  as keyof typeof ICONS, href: '/dashboard/admin/analytics'    },
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

  const [adminMode, setAdminMode] = useState(false)
  const [gererOpen, setGererOpen] = useState(
    activeHref.startsWith('/dashboard/gerer/')
  )

  useEffect(() => {
    if (isAdmin) setAdminMode(localStorage.getItem('klassia_admin_mode') === 'true')
  }, [isAdmin])

  const toggleAdminMode = () => {
    const next = !adminMode
    setAdminMode(next)
    localStorage.setItem('klassia_admin_mode', String(next))
    router.push(next ? '/dashboard/ecole' : '/dashboard')
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return activeHref === '/dashboard'
    return activeHref === href || activeHref.startsWith(href + '/')
  }

  // ── NavItem ───────────────────────────────────────────────────────────────

  const NavItem = ({
    label, icon, href, badge: itemBadge, indent = false,
  }: {
    label: string; icon: keyof typeof ICONS; href: string
    badge?: React.ReactNode; indent?: boolean
  }) => {
    const active = isActive(href)
    return (
      <div
        className={`sidebar-item ${active ? 'active' : ''}`}
        onClick={() => router.push(href)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingLeft: indent ? 28 : undefined }}
      >
        <span className="sidebar-item-icon" style={{ display: 'flex', alignItems: 'center' }}>
          <TIcon paths={ICONS[icon]} />
        </span>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        {itemBadge}
      </div>
    )
  }

  // ── SectionLabel ──────────────────────────────────────────────────────────

  const SectionLabel = ({ label }: { label: string }) => (
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-4)', padding: '12px 12px 4px', textTransform: 'uppercase' }}>
      {label}
    </div>
  )

  // ── Admin mode ────────────────────────────────────────────────────────────

  if (adminMode) {
    return (
      <aside className="sidebar">
        <Logo adminMode router={router} badge={badge} forfait={forfait} />
        <div style={{ margin: '0 8px 4px', padding: '6px 10px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 8, fontSize: 10, color: '#60A5FA', fontWeight: 600, textAlign: 'center', letterSpacing: '0.5px' }}>
          🛡 MODE ADMINISTRATEUR
        </div>
        <div className="sidebar-section">
          {NAV_ADMIN.map((item, i) => (
            <div key={i} className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
              onClick={() => router.push(item.href)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <span className="sidebar-item-icon" style={{ display: 'flex', alignItems: 'center' }}>
                <TIcon paths={ICONS[item.icon]} />
              </span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <div className="sidebar-divider" />
        <div style={{ padding: '4px 8px' }}><ThemeToggle /></div>
        <UserProfile profil={profil} adminMode onLogout={onLogout} router={router} badge={badge} forfait={forfait} />
        <AdminToggle adminMode={adminMode} toggleAdminMode={toggleAdminMode} />
      </aside>
    )
  }

  // ── Enseignant mode ───────────────────────────────────────────────────────

  const communauteOK = forfait === 'pro_plus' || forfait === 'institution'
  const gererIsActive = activeHref.startsWith('/dashboard/gerer/')

  return (
    <aside className="sidebar">
      <Logo adminMode={false} router={router} badge={badge} forfait={forfait} />

      {/* Tableau de bord — pas de label section */}
      <div className="sidebar-section" style={{ paddingTop: 4 }}>
        <NavItem label="Tableau de bord" icon="home" href="/dashboard" />
      </div>

      {/* CLASSES */}
      <SectionLabel label="CLASSES" />
      <div className="sidebar-section">
        <NavItem label="Mes classes" icon="school" href="/dashboard/classes" />
      </div>

      {/* GÉRER — expandable */}
      <SectionLabel label="GÉRER" />
      <div className="sidebar-section">
        <div
          className={`sidebar-item ${gererIsActive ? 'active' : ''}`}
          onClick={() => setGererOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        >
          <span className="sidebar-item-icon" style={{ display: 'flex', alignItems: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M9 5H7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2V7a2 2 0 0 0 -2 -2h-2" />
              <path d="M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" />
            </svg>
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>Gérer</span>
          <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-4)', flexShrink: 0 }}>
            <TIcon paths={gererOpen ? ICONS.chevronDown : ICONS.chevronRight} size={12} />
          </span>
        </div>

        {gererOpen && (
          <div style={{ marginLeft: 10, borderLeft: '1px solid rgba(255,255,255,0.07)', paddingLeft: 8, marginTop: 2 }}>
            {([
              { emoji: '✏️', label: 'Préparer',  href: '/dashboard/gerer/preparer'  },
              { emoji: '▶',  label: 'Enseigner', href: '/dashboard/gerer/enseigner' },
              { emoji: '📊', label: 'Suivre',    href: '/dashboard/suivre'          },
            ] as const).map(item => (
              <div key={item.href}
                className={`sidebar-item ${activeHref === item.href ? 'active' : ''}`}
                onClick={() => router.push(item.href)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              >
                <span style={{ fontSize: 13, width: 16, textAlign: 'center', flexShrink: 0 }}>{item.emoji}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OUTILS */}
      <SectionLabel label="OUTILS" />
      <div className="sidebar-section">
        <NavItem
          label="Studio IA" icon="sparkles" href="/dashboard/studio-ia"
          badge={<span style={{ fontSize: 8, fontWeight: 700, color: '#A78BFA', padding: '1px 6px', background: 'rgba(167,139,250,0.2)', borderRadius: 99, letterSpacing: '0.4px', flexShrink: 0 }}>✦ IA</span>}
        />
        <NavItem label="Mes outils"  icon="tool"     href="/dashboard/outils"    />
        <div
          className={`sidebar-item ${isActive('/dashboard/communaute') ? 'active' : ''}`}
          onClick={() => router.push(communauteOK ? '/dashboard/communaute' : '/dashboard/forfaits')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', opacity: communauteOK ? 1 : 0.55 }}
          title={!communauteOK ? 'Fonctionnalité Pro+ — Cliquez pour voir les forfaits' : undefined}
        >
          <span className="sidebar-item-icon" style={{ display: 'flex', alignItems: 'center' }}>
            <TIcon paths={ICONS.users2} />
          </span>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Communauté
          </span>
          {notifCount && notifCount > 0 && communauteOK
            ? <span style={{ fontSize: 9, fontWeight: 800, color: 'white', padding: '1px 5px', background: '#F87171', borderRadius: 99, minWidth: 16, textAlign: 'center', flexShrink: 0 }}>
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            : !communauteOK
            ? <span style={{ fontSize: 9, flexShrink: 0, opacity: 0.7 }}>🔒</span>
            : null}
        </div>
        <NavItem label="Calendrier"  icon="calendar" href="/dashboard/calendrier" />
      </div>

      <div className="sidebar-divider" />

      {/* BAS */}
      <div className="sidebar-section">
        <NavItem label="Paramètres" icon="settings" href="/dashboard/profil" />
      </div>

      <div className="sidebar-divider" />

      {/* Thème */}
      <div style={{ padding: '4px 8px' }}><ThemeToggle /></div>

      {/* Profil utilisateur */}
      <UserProfile profil={profil} adminMode={false} onLogout={onLogout} router={router} badge={badge} forfait={forfait} />

      {/* Mode admin */}
      {isAdmin && <AdminToggle adminMode={adminMode} toggleAdminMode={toggleAdminMode} />}
    </aside>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Logo({ adminMode, router, badge, forfait }: {
  adminMode: boolean
  router: ReturnType<typeof useRouter>
  badge: { label: string; color: string; bg: string }
  forfait: ForfaitType
}) {
  return (
    <div className="sidebar-logo"
      onClick={() => router.push('/')}
      title="Accueil KlassIA+"
      style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      <div className="sidebar-logo-mark"
        style={{ background: adminMode ? 'linear-gradient(135deg,#0F1923,#1B3F6E)' : undefined, fontSize: 17, fontWeight: 800 }}>
        {adminMode ? '⚙' : 'K+'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="sidebar-brand" style={{ fontSize: 14 }}>
          Klass<span style={{ color: adminMode ? '#60A5FA' : '#A78BFA' }}>IA+</span>
          {adminMode && <span style={{ fontSize: 8, fontWeight: 700, color: '#60A5FA', marginLeft: 4, padding: '1px 5px', background: 'rgba(96,165,250,0.15)', borderRadius: 4 }}>ADMIN</span>}
        </div>
        <div style={{ marginTop: 2 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, color: badge.color,
            padding: '1px 7px', background: badge.bg,
            borderRadius: 99, letterSpacing: '0.3px',
          }}>
            {badge.label}
          </span>
        </div>
      </div>
    </div>
  )
}

function AdminToggle({ adminMode, toggleAdminMode }: {
  adminMode: boolean
  toggleAdminMode: () => void
}) {
  return (
    <div style={{ padding: '6px 8px' }}>
      <button onClick={toggleAdminMode} style={{
        width: '100%', padding: '8px 10px',
        background: adminMode ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${adminMode ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
        transition: 'all 0.18s', color: adminMode ? '#60A5FA' : 'var(--text-4)',
      }}
        onMouseEnter={e => e.currentTarget.style.background = adminMode ? 'rgba(96,165,250,0.18)' : 'rgba(255,255,255,0.07)'}
        onMouseLeave={e => e.currentTarget.style.background = adminMode ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.04)'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" />
        </svg>
        <span style={{ fontSize: 11, fontWeight: 600, flex: 1, textAlign: 'left' }}>
          {adminMode ? 'Mode enseignant' : 'Mode admin 🔘'}
        </span>
        <div style={{ width: 28, height: 16, borderRadius: 99, background: adminMode ? '#60A5FA' : 'rgba(255,255,255,0.15)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
          <div style={{ position: 'absolute', top: 2, left: adminMode ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
        </div>
      </button>
    </div>
  )
}

function UserProfile({ profil, adminMode, onLogout, router, badge, forfait }: {
  profil: any
  adminMode: boolean
  onLogout?: () => void
  router: ReturnType<typeof useRouter>
  badge?: { label: string; color: string; bg: string }
  forfait?: ForfaitType
}) {
  return (
    <div className="sidebar-user"
      onClick={() => router.push(adminMode ? '/dashboard/ecole' : '/dashboard/profil')}
      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="sidebar-avatar"
        style={{ background: adminMode ? 'linear-gradient(135deg,#1B3F6E,#2563EB)' : undefined }}>
        {profil?.prenom?.[0]?.toUpperCase()}{profil?.nom?.[0]?.toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {profil?.prenom}
        </div>
        <div style={{ marginTop: 2 }}>
          {adminMode
            ? <span style={{ fontSize: 9, color: '#60A5FA' }}>🛡 Administrateur</span>
            : badge
            ? <span style={{ fontSize: 9, fontWeight: 700, color: badge.color, padding: '1px 6px', background: badge.bg, borderRadius: 99 }}>{badge.label}</span>
            : null}
        </div>
      </div>
      {onLogout && (
        <button
          onClick={e => { e.stopPropagation(); onLogout() }}
          title="Déconnexion"
          style={{ background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--coral)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-4)')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" />
            <path d="M9 12h12l-3 -3" />
            <path d="M18 15l3 -3" />
          </svg>
        </button>
      )}
    </div>
  )
}
