'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoKlassIA from '@/components/ui/LogoKlassIA'

const NAV = [
  { href: '/admin',             icon: '📊', label: 'Vue d\'ensemble' },
  { href: '/admin/enseignants', icon: '👩‍🏫', label: 'Enseignants'    },
  { href: '/admin/revenus',     icon: '💰', label: 'Revenus'         },
  { href: '/admin/ia',          icon: '🤖', label: 'IA & API'        },
  { href: '/admin/communaute',  icon: '👥', label: 'Communauté'      },
  { href: '/admin/systeme',     icon: '⚙️', label: 'Système'         },
]

export default function AdminSidebar() {
  const path = usePathname()

  return (
    <div style={{
      width: 240, flexShrink: 0,
      background: '#09101C',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoKlassIA variant="icone" taille={28} />
          <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 400, fontSize: 13 }}>Admin</span>
        </div>
        <div style={{ fontSize: 10, color: '#EF4444', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginTop: 3 }}>
          Panneau d'administration
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {NAV.map(item => {
          const exact   = item.href === '/admin'
          const active  = exact ? path === '/admin' : path.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10, marginBottom: 3,
                textDecoration: 'none', transition: 'all 0.15s',
                background: active ? 'rgba(239,68,68,0.12)' : 'transparent',
                color: active ? '#FCA5A5' : 'rgba(255,255,255,0.5)',
                fontSize: 13, fontWeight: active ? 600 : 400,
              }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Retour */}
      <div style={{ padding: '12px 10px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/dashboard"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', borderRadius: 10,
            textDecoration: 'none', color: 'rgba(255,255,255,0.35)',
            fontSize: 12, transition: 'color 0.15s',
          }}>
          ← Retour à KlassIA+
        </Link>
      </div>
    </div>
  )
}
