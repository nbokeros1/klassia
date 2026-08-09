'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const COUT_GEN = 0.03

interface UserRow {
  id: string
  prenom: string
  nom: string
  email: string
  role: string
  forfait: string
  created_at: string
  derniere_connexion: string | null
}

interface GenRow {
  id: string
  created_at: string
  enseignant_id: string | null
  type_contenu: string | null
}

interface LeconRow {
  id: string
  utilisateur_id: string | null
  created_at: string
}

export default function FounderAnalytics() {
  const supabase = createClient()
  const [users,  setUsers]  = useState<UserRow[]>([])
  const [gens,   setGens]   = useState<GenRow[]>([])
  const [lecons, setLecons] = useState<LeconRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: u }, { data: g }, { data: l }] = await Promise.all([
        supabase.from('utilisateurs').select('id, prenom, nom, email, role, forfait, created_at, derniere_connexion').order('created_at', { ascending: false }),
        supabase.from('generations_ia').select('id, created_at, enseignant_id, type_contenu').order('created_at', { ascending: false }).limit(2000),
        supabase.from('lecons').select('id, utilisateur_id, created_at').order('created_at', { ascending: false }).limit(2000),
      ])
      setUsers((u || []) as UserRow[])
      setGens((g || []) as GenRow[])
      setLecons((l || []) as LeconRow[])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
      Calcul des indicateurs avancés…
    </div>
  )

  const today   = new Date()
  const risk14  = new Date(today.getTime() - 14 * 86400000)
  const risk7   = new Date(today.getTime() - 7  * 86400000)

  // ── Top utilisateurs par IA ───────────────────────────────────────────────
  const gensByUser: Record<string, number> = {}
  gens.forEach(g => { if (g.enseignant_id) gensByUser[g.enseignant_id] = (gensByUser[g.enseignant_id] ?? 0) + 1 })

  const topUsers = Object.entries(gensByUser)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 10)
    .map(([uid, count]) => {
      const u = users.find(u => u.id === uid)
      return { uid, count, user: u }
    })

  // ── Utilisateurs à risque (inactifs 7-14j) ───────────────────────────────
  const atRisk = users.filter(u =>
    u.derniere_connexion &&
    new Date(u.derniere_connexion) >= risk14 &&
    new Date(u.derniere_connexion) < risk7
  )

  const neverLogged = users.filter(u => !u.derniere_connexion)

  // ── Coût IA par utilisateur ───────────────────────────────────────────────
  const totalUsers   = users.length || 1
  const totalGens    = gens.length
  const avgCostUser  = (totalGens / totalUsers) * COUT_GEN
  const avgGensUser  = totalGens / totalUsers

  // ── Coût IA par fonctionnalité ────────────────────────────────────────────
  const costByType: Record<string, number> = {}
  gens.forEach(g => { const t = g.type_contenu || 'autre'; costByType[t] = (costByType[t] ?? 0) + COUT_GEN })
  const costByTypeSorted = Object.entries(costByType).sort(([,a],[,b]) => b - a).slice(0, 8)

  // ── Temps moyen avant première leçon ─────────────────────────────────────
  const timeToFirstLecon: number[] = []
  users.forEach(u => {
    const firstLecon = lecons.filter(l => l.utilisateur_id === u.id).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]
    if (firstLecon) {
      const diffH = (new Date(firstLecon.created_at).getTime() - new Date(u.created_at).getTime()) / 3600000
      if (diffH >= 0 && diffH < 720) timeToFirstLecon.push(diffH)
    }
  })
  const avgTimeToFirst = timeToFirstLecon.length > 0
    ? timeToFirstLecon.reduce((a,b) => a + b, 0) / timeToFirstLecon.length
    : null

  return (
    <div style={{ padding: '28px 32px' }}>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>Founder Operating Center</div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Analytics</h1>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Indicateurs avancés — comportement utilisateurs et coûts IA</div>
      </div>

      {/* ── KPIs analytiques ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { icon: '⏱', label: 'Temps 1ère leçon',  value: avgTimeToFirst ? `${avgTimeToFirst.toFixed(1)}h` : 'N/A', color: '#A78BFA', sub: `${timeToFirstLecon.length} mesures` },
          { icon: '🎯', label: 'Gens / utilisateur', value: avgGensUser.toFixed(1), color: '#60A5FA', sub: `${totalGens} générations totales` },
          { icon: '💸', label: 'Coût IA / user',     value: `$${avgCostUser.toFixed(3)}`, color: '#F59E0B', sub: 'Estimation USD' },
          { icon: '⚠️', label: 'Utilisateurs risque',value: String(atRisk.length), color: '#F87171', sub: `${neverLogged.length} jamais connectés` },
        ].map(s => (
          <div key={s.label} style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 16, marginBottom: 5 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{s.label}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

        {/* ── Top users ── */}
        <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>TOP UTILISATEURS — IA</div>
          {topUsers.length === 0 ? (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Aucune donnée</div>
          ) : topUsers.map(({ uid, count, user }, i) => (
            <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: i < 3 ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: i < 3 ? '#F59E0B' : 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#E2E8F0', fontWeight: user ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user ? `${user.prenom} ${user.nom}` : <code style={{ fontSize: 10 }}>{uid.slice(0, 12)}…</code>}
                </div>
                {user && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{user.role} · {user.forfait}</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#A78BFA' }}>{count}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>${(count * COUT_GEN).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Coût par fonctionnalité ── */}
        <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>COÛT IA PAR FONCTIONNALITÉ</div>
          {costByTypeSorted.length === 0 ? (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Aucune donnée</div>
          ) : costByTypeSorted.map(([type, cost]) => (
            <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', textTransform: 'capitalize' }}>{type}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', fontVariantNumeric: 'tabular-nums' }}>${cost.toFixed(2)}</div>
            </div>
          ))}
          <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>
            Total estimé : ${(gens.length * COUT_GEN).toFixed(2)}
          </div>
        </div>
      </div>

      {/* ── Utilisateurs à risque ── */}
      <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>UTILISATEURS À RISQUE (inactifs 7–14 jours)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: atRisk.length > 0 ? '#F87171' : '#34D399' }}>{atRisk.length}</div>
        </div>
        {atRisk.length === 0 ? (
          <div style={{ fontSize: 12, color: '#34D399' }}>✓ Aucun utilisateur à risque immédiat.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Nom','Email','Rôle','Forfait','Dernière connexion','Inactif depuis'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {atRisk.slice(0, 20).map(u => {
                  const days = u.derniere_connexion ? Math.floor((today.getTime() - new Date(u.derniere_connexion).getTime()) / 86400000) : null
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 10px', color: '#E2E8F0' }}>{u.prenom} {u.nom}</td>
                      <td style={{ padding: '7px 10px', color: 'rgba(255,255,255,0.45)', maxWidth: 160 }}><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span></td>
                      <td style={{ padding: '7px 10px', color: 'rgba(255,255,255,0.4)' }}>{u.role}</td>
                      <td style={{ padding: '7px 10px', color: 'rgba(255,255,255,0.4)' }}>{u.forfait}</td>
                      <td style={{ padding: '7px 10px', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{u.derniere_connexion ? new Date(u.derniere_connexion).toLocaleDateString('fr-CA') : '—'}</td>
                      <td style={{ padding: '7px 10px', color: '#F87171', fontWeight: 600 }}>{days !== null ? `${days}j` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
