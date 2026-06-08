'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'
import { useAuth } from '@/lib/hooks/useAuth'

type Inscription = {
  id: string
  prenom: string
  nom: string
  email: string
  ecole: string | null
  type_compte: string
  langue: string
  province: string | null
  onboarding_complete: boolean
  created_at: string
}

export default function AdminInscriptions() {
  const { profil, loading: authLoading, logout } = useAuth()
  const router   = useRouter()
  const supabase = createClient()

  const [inscrits, setInscrits]   = useState<Inscription[]>([])
  const [loading,  setLoading]    = useState(true)
  const [periode,  setPeriode]    = useState<7 | 30 | 90>(30)

  useEffect(() => {
    if (!authLoading && profil && profil.type_compte !== 'admin') router.push('/dashboard')
  }, [profil, authLoading, router])

  useEffect(() => {
    if (!profil || profil.type_compte !== 'admin') return
    const load = async () => {
      const since = new Date(Date.now() - periode * 24 * 3600 * 1000).toISOString()
      const { data } = await supabase
        .from('utilisateurs')
        .select('id,prenom,nom,email,ecole,type_compte,langue,province,onboarding_complete,created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
      setInscrits(data || [])
      setLoading(false)
    }
    load()
  }, [profil, periode])

  if (authLoading || loading) return <LoadingScreen />
  if (!profil || profil.type_compte !== 'admin') return null

  // Regrouper par jour
  const byDay: Record<string, number> = {}
  inscrits.forEach(u => {
    const day = u.created_at.slice(0, 10)
    byDay[day] = (byDay[day] || 0) + 1
  })
  const dayKeys = Object.keys(byDay).sort()
  const maxDay  = Math.max(...Object.values(byDay), 1)

  // Stats
  const onboardingRate = inscrits.length
    ? Math.round((inscrits.filter(u => u.onboarding_complete).length / inscrits.length) * 100)
    : 0
  const byLangue  = { fr: inscrits.filter(u => u.langue === 'fr').length, en: inscrits.filter(u => u.langue === 'en').length }
  const byProvince: Record<string, number> = {}
  inscrits.forEach(u => { if (u.province) byProvince[u.province] = (byProvince[u.province] || 0) + 1 })
  const topProvinces = Object.entries(byProvince).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/admin/inscriptions" onLogout={logout} />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Inscriptions</div>
            <div className="topbar-sub">{inscrits.length} inscriptions sur {periode} jours</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {([7, 30, 90] as const).map(p => (
              <button key={p} onClick={() => setPeriode(p)}
                style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${periode === p ? '#A78BFA' : 'rgba(255,255,255,0.1)'}`, background: periode === p ? 'rgba(167,139,250,0.15)' : 'transparent', color: periode === p ? '#A78BFA' : 'var(--text-4)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {p}j
              </button>
            ))}
          </div>
        </div>

        <div className="page-content fade-in">
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
            {[
              { label: `Inscrits (${periode}j)`,   val: inscrits.length,           color: '#A78BFA' },
              { label: 'Onboarding complet',        val: `${onboardingRate}%`,      color: '#34D399' },
              { label: 'Langue FR',                 val: byLangue.fr,               color: '#60A5FA' },
              { label: 'Langue EN',                 val: byLangue.en,               color: '#F59E0B' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--text-5)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Graphique inscriptions par jour */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 16 }}>Inscriptions par jour</div>
              {dayKeys.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-5)', fontSize: 13 }}>Aucune inscription sur cette période</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
                  {dayKeys.map(day => {
                    const count = byDay[day]
                    const h = Math.max(4, Math.round((count / maxDay) * 80))
                    return (
                      <div key={day} title={`${day}: ${count}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'default' }}>
                        <div style={{ width: '100%', height: h, background: 'linear-gradient(180deg, #A78BFA, #6B3FA0)', borderRadius: '3px 3px 0 0', minHeight: 4 }} />
                        {dayKeys.length <= 14 && (
                          <div style={{ fontSize: 8, color: 'var(--text-5)', transform: 'rotate(-45deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>
                            {day.slice(5)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Top provinces */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 14 }}>Par province</div>
              {topProvinces.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-5)' }}>Aucune donnée</div>
              ) : topProvinces.map(([province, count], i) => {
                const COLORS = ['#60A5FA','#A78BFA','#34D399','#F59E0B','#F87171']
                const pct = Math.round((count / inscrits.length) * 100)
                return (
                  <div key={province} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{province}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: COLORS[i] }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i], borderRadius: 99 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Funnel onboarding */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 14 }}>Funnel onboarding</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
              {[
                { label: 'Inscriptions',      val: inscrits.length,                                         color: '#A78BFA' },
                { label: '→' },
                { label: 'Onboarding complet', val: inscrits.filter(u => u.onboarding_complete).length,     color: '#34D399' },
                { label: '→' },
                { label: 'Drop onboarding',   val: inscrits.filter(u => !u.onboarding_complete).length,    color: '#F87171' },
              ].map((s, i) => 'label' in s && 'val' in s ? (
                <div key={i} style={{ padding: '10px 16px', background: `${s.color}15`, border: `1px solid ${s.color}30`, borderRadius: 10, textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-5)', marginTop: 2 }}>{s.label}</div>
                </div>
              ) : (
                <div key={i} style={{ color: 'var(--text-5)', fontSize: 18 }}>→</div>
              ))}
            </div>
          </div>

          {/* Liste récente */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>
              Dernières inscriptions
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Nom','Email','École','Province','Langue','Onboarding','Date'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inscrits.slice(0, 50).map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--text-1)', fontWeight: 500 }}>{u.prenom} {u.nom}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-4)' }}>{u.email}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-3)' }}>{u.ecole || '—'}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-4)' }}>{u.province || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ padding: '2px 6px', background: u.langue === 'fr' ? 'rgba(96,165,250,0.15)' : 'rgba(245,158,11,0.15)', color: u.langue === 'fr' ? '#60A5FA' : '#F59E0B', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                        {u.langue.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ padding: '2px 6px', background: u.onboarding_complete ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.1)', color: u.onboarding_complete ? '#34D399' : '#F87171', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                        {u.onboarding_complete ? '✓ Complet' : '⚪ Incomplet'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-5)', whiteSpace: 'nowrap' }}>
                      {new Date(u.created_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
