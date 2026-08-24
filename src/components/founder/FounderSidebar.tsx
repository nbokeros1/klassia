'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// ─── Navigation ───────────────────────────────────────────────────────────────

const NAV = [
  { href: '/founder',               icon: '▦',  label: 'Overview'       },
  { href: '/founder/utilisateurs',  icon: '⊹',  label: 'Utilisateurs'   },
  { href: '/founder/contenu',       icon: '◫',  label: 'Contenu'        },
  { href: '/founder/ia',            icon: '✦',  label: 'IA'             },
  { href: '/founder/beta',          icon: '⟠',  label: 'Bêta'           },
  { href: '/founder/beta-command',  icon: '⎔',  label: 'Command Center' },
  { href: '/founder/finances',      icon: '◈',  label: 'Finances'       },
  { href: '/founder/infrastructure',icon: '⊞',  label: 'Infrastructure' },
  { href: '/founder/parametres',    icon: '⚙',  label: 'Paramètres'    },
]

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  sidebar: {
    width: 220,
    flexShrink: 0,
    background: '#0D1117',
    borderRight: '1px solid rgba(255,255,255,0.07)',
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    position: 'sticky' as const,
    top: 0,
    overflowY: 'auto' as const,
  },
  brand: {
    padding: '20px 18px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    flexShrink: 0,
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  logoBox: {
    width: 28, height: 28,
    borderRadius: 7,
    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 900,
    color: '#fff',
    flexShrink: 0,
  },
  brandName: {
    fontSize: 13,
    fontWeight: 700,
    color: '#F1F5F9',
    letterSpacing: '0.02em',
  },
  brandSub: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    marginTop: 2,
  },
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.06)',
    margin: '4px 0',
  },
  label: {
    padding: '16px 18px 6px',
    fontSize: 9,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FounderSidebar() {
  const path = usePathname()

  return (
    <div style={S.sidebar}>

      {/* Brand */}
      <div style={S.brand}>
        <div style={S.brandRow}>
          <div style={S.logoBox}>S</div>
          <div>
            <div style={S.brandName}>ScorgIA</div>
            <div style={S.brandSub}>Founder Operating Center</div>
          </div>
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em' }}>
          Bodingo AI Tech Inc.
        </div>
      </div>

      {/* Sélecteur de produit */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{
          padding: '7px 10px', borderRadius: 8,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'not-allowed', opacity: 0.65,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: 'linear-gradient(135deg,#6366F1,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0 }}>S</div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#F1F5F9' }}>ScorgIA</span>
          </div>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', userSelect: 'none' }}>⌄</span>
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', marginTop: 4, letterSpacing: '0.03em', textAlign: 'center' }}>
          Multi-produits désactivé
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 10px' }}>
        <div style={S.label}>Espaces</div>
        {NAV.map(item => {
          const exact  = item.href === '/founder'
          const active = exact ? path === '/founder' : path.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                marginBottom: 2,
                textDecoration: 'none',
                background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                color:      active ? '#A5B4FC'               : 'rgba(255,255,255,0.4)',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                borderLeft: active ? '2px solid #6366F1' : '2px solid transparent',
                transition: 'all 0.1s',
              }}>
              <span style={{ fontSize: 14, opacity: active ? 1 : 0.5, fontFamily: 'system-ui', minWidth: 16, textAlign: 'center' }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <Link href="/dashboard"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 8,
            textDecoration: 'none',
            color: 'rgba(255,255,255,0.25)',
            fontSize: 11,
          }}>
          <span style={{ fontSize: 12 }}>←</span>
          Retour Dashboard
        </Link>
      </div>

    </div>
  )
}
