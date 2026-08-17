'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ForfaitType } from '@/lib/types/database'
import { FEATURE_DARK_MODE_ENABLED, FEATURE_COMMUNAUTE_VISIBLE } from '@/lib/constants/features'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { ScorgiaLogo } from '@/components/branding/scorgia-logo'
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  PenLine,
  Monitor,
  Library,
  TrendingUp,
  Calendar,
  Wrench,
  Settings,
  Shield,
  LogOut,
  Globe,
  type LucideIcon,
} from 'lucide-react'

// ─── Forfait badge ────────────────────────────────────────────────────────────

const FORFAIT_BADGE: Record<ForfaitType, { label: string; color: string; bg: string }> = {
  gratuit:     { label: 'Gratuit',     color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.06)' },
  pro:         { label: 'Pro',         color: 'rgba(255,255,255,0.5)',  bg: 'rgba(255,255,255,0.08)' },
  pro_plus:    { label: 'Pro+',        color: '#c4b5fd',                bg: 'rgba(108,92,231,0.2)'   },
  institution: { label: 'Institution', color: '#6ee7b7',                bg: 'rgba(52,211,153,0.15)'  },
}

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItemDef {
  labelFr:   string
  labelEn:   string
  icon:      LucideIcon
  href:      string
  notifBadge?:  boolean
  adminOnly?:   boolean
  communaute?:  boolean
  programmeNav?: boolean
  newTab?:   boolean
}

interface NavSection {
  id:      string
  labelFr: string
  labelEn: string
  items:   NavItemDef[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    id:      'enseignement',
    labelFr: 'Enseignement',
    labelEn: 'Teaching',
    items: [
      { labelFr: 'Tableau de bord', labelEn: 'Dashboard',  icon: LayoutDashboard, href: '/dashboard' },
      { labelFr: 'Mes classes',     labelEn: 'My Classes', icon: GraduationCap,   href: '/dashboard/classes' },
      { labelFr: 'Mon Année',       labelEn: 'My Year',    icon: BookOpen,        href: '/dashboard/mon-annee', newTab: true },
      { labelFr: 'Préparer',        labelEn: 'Prepare',    icon: PenLine,         href: '/dashboard/gerer/preparer' },
      { labelFr: 'Enseigner',       labelEn: 'Teach',      icon: Monitor,         href: '/dashboard/gerer/enseigner' },
      { labelFr: 'Bibliothèque',    labelEn: 'Library',    icon: Library,         href: '/dashboard/bibliotheque' },
    ],
  },
  {
    id:      'organisation',
    labelFr: 'Organisation',
    labelEn: 'Organisation',
    items: [
      { labelFr: 'Suivi',      labelEn: 'Tracking', icon: TrendingUp, href: '/dashboard/suivre',     notifBadge: true },
      { labelFr: 'Calendrier', labelEn: 'Calendar', icon: Calendar,   href: '/dashboard/calendrier' },
      { labelFr: 'Outils',     labelEn: 'Tools',    icon: Wrench,     href: '/dashboard/outils' },
      { labelFr: 'Communauté', labelEn: 'Community',icon: Globe,      href: '/dashboard/communaute', communaute: true },
    ],
  },
  {
    id:      'administration',
    labelFr: 'Administration',
    labelEn: 'Administration',
    items: [
      { labelFr: 'Paramètres', labelEn: 'Settings', icon: Settings, href: '/dashboard/profil' },
      { labelFr: 'Founder',    labelEn: 'Founder',  icon: Shield,   href: '/founder', adminOnly: true },
    ],
  },
]

const NAV_ADMIN: NavItemDef[] = [
  { labelFr: 'Founder Center', labelEn: 'Founder Center', icon: Shield,        href: '/founder' },
  { labelFr: 'Utilisateurs',   labelEn: 'Users',          icon: GraduationCap, href: '/dashboard/admin/utilisateurs' },
  { labelFr: 'Inscriptions',   labelEn: 'Registrations',  icon: TrendingUp,    href: '/dashboard/admin/inscriptions' },
  { labelFr: 'Analytics',      labelEn: 'Analytics',      icon: TrendingUp,    href: '/dashboard/admin/analytics' },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  profil:     any
  activeHref: string
  onLogout?:  () => void
  notifCount?: number
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
  def, active, isFr, onClick, badge,
}: {
  def:    NavItemDef
  active: boolean
  isFr:   boolean
  onClick: () => void
  badge?:  React.ReactNode
}) {
  const Icon = def.icon
  const hoverStyle = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      if (!active) {
        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
        ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.88)'
      }
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      if (!active) {
        (e.currentTarget as HTMLElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.52)'
      }
    },
  }
  const inner = (
    <>
      <span className="sidebar-item-icon">
        <Icon size={15} strokeWidth={1.75} />
      </span>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {isFr ? def.labelFr : def.labelEn}
      </span>
      {badge}
    </>
  )

  if (def.newTab) {
    return (
      <a
        href={def.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`sidebar-item${active ? ' active' : ''}`}
        style={{ textDecoration: 'none', color: 'inherit' }}
        {...hoverStyle}
      >
        {inner}
      </a>
    )
  }

  return (
    <div
      className={`sidebar-item${active ? ' active' : ''}`}
      onClick={onClick}
      {...hoverStyle}
    >
      {inner}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar({ profil, activeHref, onLogout, notifCount = 0 }: SidebarProps) {
  const router  = useRouter()
  const isAdmin = profil?.is_admin === true || profil?.type_compte === 'admin'
  const forfait = (profil?.forfait || 'gratuit') as ForfaitType
  const badge   = FORFAIT_BADGE[forfait]
  const isFr    = profil?.langue !== 'en'

  const [adminMode, setAdminMode] = useState(false)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    if (isAdmin) setAdminMode(localStorage.getItem('klassia_admin_mode') === 'true')
  }, [isAdmin])

  useEffect(() => {
    const stored = typeof window !== 'undefined' && localStorage.getItem('sidebar_compact') === 'true'
    setCompact(stored)
    document.documentElement.style.setProperty('--sidebar-w', stored ? '64px' : '240px')
  }, [])

  const toggleCompact = () => {
    setCompact(prev => {
      const next = !prev
      localStorage.setItem('sidebar_compact', String(next))
      document.documentElement.style.setProperty('--sidebar-w', next ? '64px' : '240px')
      return next
    })
  }

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

  // ── Admin mode ─────────────────────────────────────────────────────────────
  if (adminMode) {
    return (
      <aside className={`sidebar${compact ? ' sidebar--compact' : ''}`}>
        <div className="sidebar-logo" onClick={() => router.push('/dashboard')} style={{ cursor: 'pointer' }}>
          {compact
            ? <ScorgiaLogo variant="icon" width={24} height={24} />
            : <ScorgiaLogo variant="dark" height={96} />
          }
          {!compact && (
            <span style={{ fontSize: 8.5, fontWeight: 700, color: '#60A5FA', padding: '2px 7px', background: 'rgba(96,165,250,0.12)', borderRadius: 99, flexShrink: 0 }}>
              ADMIN
            </span>
          )}
        </div>

        <div style={{ margin: '8px 10px 4px', padding: '5px 10px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 7, fontSize: 9.5, color: '#60A5FA', fontWeight: 600, textAlign: 'center', letterSpacing: '0.4px' }}>
          MODE ADMINISTRATEUR
        </div>

        <div className="sidebar-section" style={{ flex: 1 }}>
          {NAV_ADMIN.map((def, i) => (
            <NavItem key={i} def={def} active={isActive(def.href)} isFr={isFr} onClick={() => router.push(def.href)} />
          ))}
        </div>

        <div style={{ flexShrink: 0, paddingBottom: 8 }}>
          {FEATURE_DARK_MODE_ENABLED && !compact && <div style={{ padding: '4px 8px' }}><ThemeToggle /></div>}
          <UserCard profil={profil} badge={badge} adminMode onLogout={onLogout} router={router} />
          {!compact && <AdminToggle adminMode={adminMode} toggleAdminMode={toggleAdminMode} isFr={isFr} />}
          <div style={{ display: 'flex', justifyContent: compact ? 'center' : 'flex-end', padding: '4px 10px 2px' }}>
            <button className="sidebar-compact-btn" onClick={toggleCompact} title={compact ? (isFr ? 'Agrandir la barre' : 'Expand sidebar') : (isFr ? 'Réduire la barre' : 'Collapse sidebar')} aria-label={compact ? 'Agrandir' : 'Réduire'}>
              {compact ? '›' : '‹'}
            </button>
          </div>
        </div>
      </aside>
    )
  }

  // ── Enseignant mode ────────────────────────────────────────────────────────
  return (
    <aside className={`sidebar${compact ? ' sidebar--compact' : ''}`}>

      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <div
        className="sidebar-logo"
        onClick={() => router.push('/dashboard')}
        style={{ cursor: 'pointer' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        {compact
          ? <ScorgiaLogo variant="icon" width={24} height={24} />
          : <ScorgiaLogo variant="dark" height={96} />
        }
        {!compact && (
          <span style={{
            fontSize: 8.5, fontWeight: 700,
            color: badge.color, padding: '2px 7px',
            background: badge.bg, borderRadius: 99,
            letterSpacing: '0.3px', flexShrink: 0,
          }}>{badge.label}</span>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0 12px' }}>
        {NAV_SECTIONS.map((section, sIdx) => {
          const visibleItems = section.items.filter(item => {
            if (item.adminOnly  && !isAdmin)               return false
            if (item.communaute && !FEATURE_COMMUNAUTE_VISIBLE) return false
            return true
          })
          if (visibleItems.length === 0) return null

          return (
            <div key={section.id} style={{ marginTop: sIdx === 0 ? 0 : 6 }}>
              <div className="sidebar-label">
                {isFr ? section.labelFr : section.labelEn}
              </div>
              {visibleItems.map((def, i) => {
                const notifBadge = def.notifBadge && notifCount > 0
                  ? <span style={{
                      fontSize: 9, fontWeight: 800, color: '#fff',
                      padding: '1px 5px', background: '#F87171',
                      borderRadius: 99, minWidth: 16, textAlign: 'center' as const,
                      flexShrink: 0, lineHeight: '14px',
                    }}>
                      {notifCount > 99 ? '99+' : notifCount}
                    </span>
                  : undefined

                const itemActive = def.programmeNav
                  ? activeHref.startsWith('/dashboard/classes/') && activeHref.includes('/programme')
                  : isActive(def.href)

                const itemOnClick = def.programmeNav
                  ? () => {
                      const stored = typeof window !== 'undefined' ? localStorage.getItem('klassia_active_classe') : null
                      router.push(stored ? `/dashboard/classes/${stored}/programme` : '/dashboard/classes')
                    }
                  : () => router.push(def.href)

                return (
                  <NavItem
                    key={i}
                    def={def}
                    active={itemActive}
                    isFr={isFr}
                    onClick={itemOnClick}
                    badge={notifBadge}
                  />
                )
              })}
            </div>
          )
        })}
      </div>

      {/* ── Bottom ────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, paddingBottom: 8 }}>
        {FEATURE_DARK_MODE_ENABLED && !compact && <div style={{ padding: '4px 8px' }}><ThemeToggle /></div>}
        <UserCard profil={profil} badge={badge} adminMode={false} onLogout={onLogout} router={router} />
        {isAdmin && !compact && <AdminToggle adminMode={adminMode} toggleAdminMode={toggleAdminMode} isFr={isFr} />}
        <div style={{ display: 'flex', justifyContent: compact ? 'center' : 'flex-end', padding: '4px 10px 2px' }}>
          <button className="sidebar-compact-btn" onClick={toggleCompact} title={compact ? (isFr ? 'Agrandir la barre' : 'Expand sidebar') : (isFr ? 'Réduire la barre' : 'Collapse sidebar')} aria-label={compact ? 'Agrandir' : 'Réduire'}>
            {compact ? '›' : '‹'}
          </button>
        </div>
      </div>
    </aside>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function UserCard({ profil, badge, adminMode, onLogout, router }: {
  profil:    any
  badge:     { label: string; color: string; bg: string }
  adminMode: boolean
  onLogout?: () => void
  router:    ReturnType<typeof useRouter>
}) {
  return (
    <div
      className="sidebar-user"
      onClick={() => router.push(adminMode ? '/founder' : '/dashboard/profil')}
    >
      <div className="sidebar-avatar"
        style={adminMode ? { background: 'linear-gradient(135deg,#1B3F6E,#2563EB)' } : undefined}>
        {profil?.prenom?.[0]?.toUpperCase()}{profil?.nom?.[0]?.toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {profil?.prenom}
        </div>
        <div style={{ fontSize: 10, marginTop: 1 }}>
          {adminMode
            ? <span style={{ color: '#60A5FA' }}>Administrateur</span>
            : <span style={{ color: badge.color }}>{badge.label}</span>}
        </div>
      </div>
      {onLogout && (
        <button
          onClick={e => { e.stopPropagation(); onLogout() }}
          title="Déconnexion"
          aria-label="Déconnexion"
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', cursor: 'pointer', padding: '4px 6px', flexShrink: 0, lineHeight: 1, transition: 'color 0.12s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#F87171')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.28)')}
        >
          <LogOut size={13} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}

function AdminToggle({ adminMode, toggleAdminMode, isFr }: {
  adminMode:        boolean
  toggleAdminMode:  () => void
  isFr:             boolean
}) {
  return (
    <div style={{ padding: '4px 10px 6px' }}>
      <button
        onClick={toggleAdminMode}
        style={{
          width: '100%', padding: '7px 10px',
          background: adminMode ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${adminMode ? 'rgba(96,165,250,0.25)' : 'rgba(255,255,255,0.07)'}`,
          borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          transition: 'all 0.15s', color: adminMode ? '#60A5FA' : 'rgba(255,255,255,0.38)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = adminMode ? 'rgba(96,165,250,0.16)' : 'rgba(255,255,255,0.06)' }}
        onMouseLeave={e => { e.currentTarget.style.background = adminMode ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.04)' }}
      >
        <Shield size={13} strokeWidth={2} />
        <span style={{ fontSize: 11, fontWeight: 600, flex: 1, textAlign: 'left' }}>
          {adminMode ? (isFr ? 'Mode enseignant' : 'Teacher mode') : (isFr ? 'Mode admin' : 'Admin mode')}
        </span>
        <div style={{ width: 26, height: 14, borderRadius: 99, background: adminMode ? '#60A5FA' : 'rgba(255,255,255,0.12)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
          <div style={{ position: 'absolute', top: 1.5, left: adminMode ? 13 : 1.5, width: 11, height: 11, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
        </div>
      </button>
    </div>
  )
}
