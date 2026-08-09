'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ForfaitStats {
  gratuit:     number
  pro:         number
  pro_plus:    number
  institution: number
  total:       number
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const PRIX_CAD: Record<string, number> = {
  gratuit:     0,
  pro:         14.99,
  pro_plus:    24.99,
  institution: 9.99,
}

const FORFAIT_META: Record<string, { label: string; color: string }> = {
  gratuit:     { label: 'Gratuit',      color: 'rgba(255,255,255,0.35)' },
  pro:         { label: 'Pro',           color: '#6366F1'                },
  pro_plus:    { label: 'Pro+',          color: '#A78BFA'                },
  institution: { label: 'Institution',   color: '#10B981'                },
}

function EmptyStripe() {
  return (
    <div style={{
      padding: '16px 20px', borderRadius: 10,
      background: 'rgba(255,255,255,0.03)',
      border: '1px dashed rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 18, opacity: 0.3 }}>—</span>
      <div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>Aucune donnée disponible</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>Disponible après intégration Stripe</div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FounderFinances() {
  const supabase = createClient()
  const [stats,   setStats]   = useState<ForfaitStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('utilisateurs')
        .select('forfait')

      const f: ForfaitStats = { gratuit: 0, pro: 0, pro_plus: 0, institution: 0, total: 0 }
      ;(data || []).forEach((u: { forfait: string | null }) => {
        const key = u.forfait || 'gratuit'
        if (key in f) f[key as keyof typeof f] = (f[key as keyof typeof f] as number) + 1
        f.total++
      })
      setStats(f)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
      Chargement des finances…
    </div>
  )

  const s = stats || { gratuit: 0, pro: 0, pro_plus: 0, institution: 0, total: 0 }
  const mrr = Object.entries(PRIX_CAD).reduce((acc, [key, prix]) => acc + prix * (s[key as keyof ForfaitStats] as number || 0), 0)
  const arr = mrr * 12

  const fmtCAD = (n: number) => n === 0 ? '0,00 $' : `${n.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1080 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
          Founder Operating Center
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Finances</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
          Métriques basées sur les forfaits actifs — revenus réels disponibles après intégration Stripe
        </p>
      </div>

      {/* Note Stripe */}
      <div style={{
        marginBottom: 24, padding: '12px 16px', borderRadius: 10,
        background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 16 }}>ℹ</span>
        <div>
          <div style={{ fontSize: 12, color: '#A5B4FC', fontWeight: 600, marginBottom: 2 }}>Stripe non intégré</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            Les calculs MRR et ARR ci-dessous sont basés sur les forfaits enregistrés dans la base de données.
            Les paiements réels, remboursements, et conversions nécessitent l&apos;intégration Stripe.
          </div>
        </div>
      </div>

      {/* MRR / ARR calculés */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'MRR calculé',      value: fmtCAD(mrr), sub: 'Basé sur forfaits actifs'  },
          { label: 'ARR projeté',      value: fmtCAD(arr), sub: 'MRR × 12'                  },
          { label: 'Enseignants payants', value: (s.pro + s.pro_plus + s.institution).toString(), sub: 'Pro + Pro+ + Institution' },
        ].map(item => (
          <div key={item.label} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.4px', marginBottom: 2 }}>{item.value}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>{item.label}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Distribution forfaits */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Distribution des forfaits</h2>
          {Object.entries(FORFAIT_META).map(([key, meta]) => {
            const n   = s[key as keyof ForfaitStats] as number || 0
            const pct = s.total > 0 ? Math.round((n / s.total) * 100) : 0
            const rev = PRIX_CAD[key] * n
            return (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, display: 'inline-block' }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{meta.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 11 }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>{n} ({pct}%)</span>
                    <span style={{ color: rev > 0 ? '#A5B4FC' : 'rgba(255,255,255,0.2)', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtCAD(rev)}
                    </span>
                  </div>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: meta.color, borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>À venir (Stripe requis)</h2>
          {['Revenus réels', 'Paiements', 'Remboursements', 'Essais', 'Conversions', 'Churn rate', 'Factures', 'Revenus par province'].map(item => (
            <div key={item} style={{ padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{item}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', marginTop: 1 }}>Aucune donnée disponible</div>
            </div>
          ))}
        </div>

      </div>

      {/* Données Stripe vides */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Métriques Stripe</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {['MRR réel', 'ARR réel', 'Clients actifs', 'Essais actifs', 'Conversions essai→payant', 'Churn mensuel', 'Dernière facture', 'Prochain renouvellement'].map(item => (
            <div key={item}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item}</div>
              <EmptyStripe />
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
