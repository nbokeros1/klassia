'use client'

import { useEffect, useState } from 'react'

interface Notif {
  id:           string
  type:         string
  titre:        string
  message:      string | null
  priorite:     string
  lu:           boolean
  produit_slug: string | null
  lien:         string | null
  created_at:   string
}

const TYPE_ICONS: Record<string, string> = {
  signup:      '👤',
  bug:         '🐛',
  ia_error:    '🤖',
  ia_cost:     '💸',
  backup_fail: '💾',
  deploy:      '🚀',
  feedback:    '💬',
  system:      '⚙️',
}

const PRIORITE_STYLES: Record<string, { bg: string; border: string; dot: string }> = {
  critical: { bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.2)', dot: '#F87171' },
  warning:  { bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.2)',  dot: '#F59E0B' },
  info:     { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)', dot: 'rgba(255,255,255,0.3)' },
}

export default function FounderNotifications() {
  const [notifs,   setNotifs]   = useState<Notif[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<'all'|'unread'|'critical'>('all')

  const load = async () => {
    setLoading(true)
    const data = await fetch('/api/founder/notifications?limit=100').then(r => r.json())
    setNotifs(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const markRead = async (id: string) => {
    await fetch('/api/founder/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, lu: true }),
    })
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n))
  }

  const markAllRead = async () => {
    await Promise.all(notifs.filter(n => !n.lu).map(n => markRead(n.id)))
  }

  const filtered = notifs.filter(n => {
    if (filter === 'unread')   return !n.lu
    if (filter === 'critical') return n.priorite === 'critical'
    return true
  })

  const unreadCount    = notifs.filter(n => !n.lu).length
  const criticalCount  = notifs.filter(n => n.priorite === 'critical').length

  return (
    <div style={{ padding: '28px 32px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>Founder Operating Center</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Centre de notifications</h1>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            {unreadCount} non lue{unreadCount > 1 ? 's' : ''} · {criticalCount} critique{criticalCount > 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
              ✓ Tout marquer lu
            </button>
          )}
          <button onClick={load}
            style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B', cursor: 'pointer' }}>
            ↻ Actualiser
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total',     value: notifs.length,  color: 'rgba(255,255,255,0.5)', icon: '🔔' },
          { label: 'Non lues',  value: unreadCount,    color: '#60A5FA',               icon: '📨' },
          { label: 'Critiques', value: criticalCount,  color: '#F87171',               icon: '🚨' },
          { label: 'Warnings',  value: notifs.filter(n => n.priorite === 'warning').length, color: '#F59E0B', icon: '⚠️' },
        ].map(s => (
          <div key={s.label} style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 16, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filtres ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {[{ id: 'all', label: 'Toutes' }, { id: 'unread', label: 'Non lues' }, { id: 'critical', label: 'Critiques' }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id as 'all' | 'unread' | 'critical')}
            style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s',
              background:   filter === f.id ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
              border:       filter === f.id ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.08)',
              color:        filter === f.id ? '#F59E0B' : 'rgba(255,255,255,0.4)',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Liste ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Chargement…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
              Aucune notification pour ce filtre.
            </div>
          ) : filtered.map(n => {
            const ps = PRIORITE_STYLES[n.priorite] ?? PRIORITE_STYLES.info
            return (
              <div key={n.id} style={{ background: ps.bg, border: `1px solid ${ps.border}`, borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', opacity: n.lu ? 0.6 : 1 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                  {TYPE_ICONS[n.type] ?? '🔔'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    {!n.lu && <div style={{ width: 7, height: 7, borderRadius: '50%', background: ps.dot, flexShrink: 0 }} />}
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0' }}>{n.titre}</div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: `${ps.dot}18`, border: `1px solid ${ps.dot}30`, color: ps.dot, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                      {n.priorite}
                    </span>
                  </div>
                  {n.message && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 5 }}>{n.message}</div>}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{new Date(n.created_at).toLocaleString('fr-CA', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    {n.produit_slug && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{n.produit_slug}</span>}
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'capitalize' }}>{n.type}</span>
                  </div>
                </div>
                {!n.lu && (
                  <button onClick={() => markRead(n.id)}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: '#60A5FA', cursor: 'pointer', flexShrink: 0 }}>
                    Marquer lu
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
