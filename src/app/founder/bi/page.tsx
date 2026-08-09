'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserRow { id: string; created_at: string; derniere_connexion: string | null; forfait: string }
interface GenRow  { id: string; created_at: string; type_contenu: string | null; enseignant_id: string | null }

const fmtPct = (n: number) => `${n.toFixed(1)}%`
const fmtNum = (n: number) => n.toLocaleString('fr-CA')

export default function FounderBI() {
  const supabase = createClient()
  const [users,   setUsers]   = useState<UserRow[]>([])
  const [gens,    setGens]    = useState<GenRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: u }, { data: g }] = await Promise.all([
        supabase.from('utilisateurs').select('id, created_at, derniere_connexion, forfait').order('created_at', { ascending: false }),
        supabase.from('generations_ia').select('id, created_at, type_contenu, enseignant_id').order('created_at', { ascending: false }),
      ])
      setUsers((u || []) as UserRow[])
      setGens((g || []) as GenRow[])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <LoadingState />

  const now    = new Date()
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const week   = new Date(today); week.setDate(week.getDate() - 7)
  const lastWk = new Date(today); lastWk.setDate(lastWk.getDate() - 14)

  // ── Croissance : users par semaine (8 dernières semaines) ──────────────────
  const weeklyGrowth = Array.from({ length: 8 }, (_, i) => {
    const end = new Date(today); end.setDate(end.getDate() - i * 7)
    const start = new Date(end); start.setDate(start.getDate() - 7)
    const count = users.filter(u => { const d = new Date(u.created_at); return d >= start && d < end }).length
    const label = start.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })
    return { label, count }
  }).reverse()

  const maxWeek = Math.max(...weeklyGrowth.map(w => w.count), 1)

  // ── Rétention ─────────────────────────────────────────────────────────────
  const activeThisWeek = users.filter(u => u.derniere_connexion && new Date(u.derniere_connexion) >= week).length
  const activeLastWeek = users.filter(u => u.derniere_connexion && new Date(u.derniere_connexion) >= lastWk && new Date(u.derniere_connexion) < week).length
  const retentionRate  = users.length > 0 ? (activeThisWeek / users.length) * 100 : 0
  const inactive14     = users.filter(u => !u.derniere_connexion || new Date(u.derniere_connexion) < new Date(today.getTime() - 14 * 86400000))
  const inactive30     = users.filter(u => !u.derniere_connexion || new Date(u.derniere_connexion) < new Date(today.getTime() - 30 * 86400000))

  // ── Activation ────────────────────────────────────────────────────────────
  const usersWithGens  = new Set(gens.map(g => g.enseignant_id)).size
  const activationRate = users.length > 0 ? (usersWithGens / users.length) * 100 : 0

  // ── Top fonctionnalités ───────────────────────────────────────────────────
  const byType: Record<string, number> = {}
  gens.forEach(g => { const t = g.type_contenu || 'autre'; byType[t] = (byType[t] ?? 0) + 1 })
  const topFeatures = Object.entries(byType).sort(([,a],[,b]) => b - a).slice(0, 10)
  const maxFeature  = topFeatures[0]?.[1] ?? 1

  // ── Usage quotidien/hebdo/mensuel ─────────────────────────────────────────
  const month = new Date(now.getFullYear(), now.getMonth(), 1)
  const usageToday  = users.filter(u => u.derniere_connexion && new Date(u.derniere_connexion) >= today).length
  const usageWeek   = users.filter(u => u.derniere_connexion && new Date(u.derniere_connexion) >= week).length
  const usageMonth  = users.filter(u => u.derniere_connexion && new Date(u.derniere_connexion) >= month).length

  // ── Conversion gratuit → payant ───────────────────────────────────────────
  const paying       = users.filter(u => u.forfait && u.forfait !== 'gratuit').length
  const conversionRate = users.length > 0 ? (paying / users.length) * 100 : 0

  return (
    <div style={{ padding: '28px 32px' }}>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>Founder Operating Center</div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Business Intelligence</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Croissance, rétention, activation et utilisation</p>
      </div>

      {/* ── Métriques clés ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { icon: '📈', label: 'Rétention sem.',  value: fmtPct(retentionRate),  color: '#34D399', sub: `${activeThisWeek} actifs / ${users.length} total` },
          { icon: '⚡', label: 'Activation',       value: fmtPct(activationRate), color: '#A78BFA', sub: `${usersWithGens} ont utilisé l'IA` },
          { icon: '💳', label: 'Conversion',       value: fmtPct(conversionRate), color: '#F59E0B', sub: `${paying} utilisateurs payants` },
          { icon: '😴', label: 'Inactifs 14j',     value: fmtNum(inactive14.length), color: '#F87171', sub: `${inactive30.length} inactifs 30j` },
        ].map(s => (
          <div key={s.label} style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 16, marginBottom: 5 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{s.label}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Croissance semaines ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

        <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>CROISSANCE — 8 SEMAINES</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
            {weeklyGrowth.map((w, i) => (
              <div key={w.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', background: i === 7 ? '#F59E0B' : 'rgba(96,165,250,0.6)', borderRadius: '3px 3px 0 0', height: maxWeek > 0 ? `${(w.count / maxWeek) * 70}px` : '2px', minHeight: 2 }} />
                {w.count > 0 && <div style={{ fontSize: 9, color: i === 7 ? '#F59E0B' : '#60A5FA', fontVariantNumeric: 'tabular-nums' }}>{w.count}</div>}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{weeklyGrowth[0]?.label}</div>
            <div style={{ fontSize: 9, color: '#F59E0B', fontWeight: 700 }}>Cette sem.</div>
          </div>
        </div>

        {/* ── Usage DAU/WAU/MAU ── */}
        <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>UTILISATEURS ACTIFS</div>
          {[
            { label: 'DAU — Aujourd\'hui',  value: usageToday, color: '#F59E0B' },
            { label: 'WAU — Cette semaine', value: usageWeek,  color: '#60A5FA' },
            { label: 'MAU — Ce mois',       value: usageMonth, color: '#A78BFA' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{r.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: r.color, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(r.value)}</div>
            </div>
          ))}
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Stickiness (DAU/MAU)</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#34D399' }}>
                {usageMonth > 0 ? fmtPct((usageToday / usageMonth) * 100) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top fonctionnalités ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>TOP FONCTIONNALITÉS (IA)</div>
          {topFeatures.length === 0 ? (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Aucune donnée</div>
          ) : topFeatures.map(([type, count], i) => (
            <div key={type} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <div style={{ fontSize: 11, color: i < 3 ? '#F59E0B' : 'rgba(255,255,255,0.55)', fontWeight: i < 3 ? 600 : 400, textTransform: 'capitalize' }}>{type}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>{count} ({fmtPct((count / gens.length) * 100)})</div>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${(count / maxFeature) * 100}%`, background: i < 3 ? '#F59E0B' : 'rgba(167,139,250,0.5)', borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Rétention + inactifs ── */}
        <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>RÉTENTION & RISQUE</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[
              { label: 'Actifs sem.', value: activeThisWeek,    color: '#34D399' },
              { label: 'Actifs sem. préc.', value: activeLastWeek, color: '#60A5FA' },
              { label: 'Inactifs 14j', value: inactive14.length, color: '#F59E0B' },
              { label: 'Inactifs 30j', value: inactive30.length, color: '#F87171' },
            ].map(r => (
              <div key={r.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: r.color, fontVariantNumeric: 'tabular-nums' }}>{r.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{r.label}</div>
              </div>
            ))}
          </div>

          {inactive14.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>Derniers inactifs</div>
              {inactive14.slice(0, 5).map(u => (
                <div key={u.id} style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <code style={{ fontSize: 10, color: '#F87171' }}>{u.id.slice(0, 8)}</code>
                  <span style={{ marginLeft: 8 }}>{u.derniere_connexion ? new Date(u.derniere_connexion).toLocaleDateString('fr-CA') : 'Jamais connecté'}</span>
                </div>
              ))}
              {inactive14.length > 5 && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>+{inactive14.length - 5} autres · voir Analytics</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
      Chargement Business Intelligence…
    </div>
  )
}
