'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const PRIX: Record<string, number> = { gratuit: 0, pro: 19, pro_plus: 39, institution: 149 }
const fmtCAD = (n: number) => `${n.toLocaleString('fr-CA')} $`
const MOIS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

export default function AdminRevenusPage() {
  const supabase = createClient()
  const [users,     setUsers]     = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [mrrMois,   setMrrMois]   = useState<{ label: string; mrr: number }[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('utilisateurs').select('id, forfait, province, created_at')
      const list = data || []
      setUsers(list)

      // MRR par mois (12 derniers mois, simulé par date d'inscription)
      const now = new Date()
      const points = Array.from({ length: 12 }, (_, i) => {
        const d     = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
        const label = `${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`
        const actifs = list.filter(u => new Date(u.created_at) <= new Date(d.getFullYear(), d.getMonth() + 1, 0))
        const mrr = actifs.reduce((acc: number, u: any) => acc + (PRIX[u.forfait || 'gratuit'] || 0), 0)
        return { label, mrr }
      })
      setMrrMois(points)
      setLoading(false)
    }
    load()
  }, [])

  const mrr     = users.reduce((acc, u) => acc + (PRIX[u.forfait || 'gratuit'] || 0), 0)
  const maxMrr  = Math.max(...mrrMois.map(m => m.mrr), 1)

  const repForfait: Record<string, number> = { gratuit: 0, pro: 0, pro_plus: 0, institution: 0 }
  users.forEach(u => { repForfait[u.forfait || 'gratuit'] = (repForfait[u.forfait || 'gratuit'] || 0) + 1 })

  const repProvince: Record<string, number> = {}
  users.forEach(u => { if (u.province) repProvince[u.province] = (repProvince[u.province] || 0) + 1 })
  const provinceTop = Object.entries(repProvince).sort((a, b) => b[1] - a[1]).slice(0, 6)

  const payants  = users.filter(u => u.forfait && u.forfait !== 'gratuit').length
  const gratuits = users.filter(u => !u.forfait || u.forfait === 'gratuit').length
  const taux     = users.length > 0 ? Math.round((payants / users.length) * 100) : 0

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', marginBottom: 4 }}>💰 Revenus</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>MRR · Conversions · Répartition géographique</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>Chargement...</div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'MRR actuel',   value: fmtCAD(mrr),          color: '#34D399', icon: '💰' },
              { label: 'ARR estimé',   value: fmtCAD(mrr * 12),     color: '#60A5FA', icon: '📈' },
              { label: 'Taux conv.',   value: `${taux}%`,            color: '#A78BFA', icon: '📊' },
              { label: 'Payants',      value: `${payants}`,          color: '#FBC34A', icon: '👥' },
            ].map(k => (
              <div key={k.label} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{k.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color, marginBottom: 3 }}>{k.value}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Graphique MRR 12 mois */}
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 24px', marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 18 }}>MRR — 12 derniers mois</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
              {mrrMois.map((m, i) => {
                const h = Math.max(4, (m.mrr / maxMrr) * 100)
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 10, color: '#34D399', fontWeight: 600, opacity: m.mrr > 0 ? 1 : 0 }}>
                      {m.mrr > 0 ? `${m.mrr}$` : ''}
                    </div>
                    <div style={{ width: '100%', height: `${h}%`, background: i === 11 ? '#34D399' : 'rgba(52,211,153,0.3)', borderRadius: '4px 4px 0 0', minHeight: 4, transition: 'height 0.5s ease' }} />
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>{m.label}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Conversions */}
            <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 16 }}>Répartition forfaits</div>
              {[
                { label: 'Gratuit',     count: repForfait.gratuit     || 0, color: '#94A3B8', rev: 0 },
                { label: 'Pro',         count: repForfait.pro         || 0, color: '#60A5FA', rev: 19 },
                { label: 'Pro+',        count: repForfait.pro_plus    || 0, color: '#A78BFA', rev: 39 },
                { label: 'Institution', count: repForfait.institution || 0, color: '#34D399', rev: 149 },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 12, color: f.color, fontWeight: 600 }}>{f.label}</span>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{f.count} ens.</span>
                    <span style={{ fontSize: 12, color: '#34D399', fontWeight: 600 }}>{fmtCAD(f.count * f.rev)}/mois</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Revenus par province */}
            <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 16 }}>Revenus par province</div>
              {provinceTop.length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Aucune donnée de province</div>}
              {provinceTop.map(([prov, count]) => {
                const provUsers = users.filter(u => u.province === prov)
                const rev = provUsers.reduce((acc, u) => acc + (PRIX[u.forfait || 'gratuit'] || 0), 0)
                return (
                  <div key={prov} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{prov}</span>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{count} ens.</span>
                      <span style={{ fontSize: 12, color: '#34D399', fontWeight: 600 }}>{fmtCAD(rev)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
