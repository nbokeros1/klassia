'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'
import { useAuth } from '@/lib/hooks/useAuth'

export default function AdminAnalytics() {
  const { profil, loading: authLoading, logout } = useAuth()
  const router   = useRouter()
  const supabase = createClient()

  const [stats,   setStats]   = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && profil && profil.type_compte !== 'admin') router.push('/dashboard')
  }, [profil, authLoading, router])

  useEffect(() => {
    if (!profil || profil.type_compte !== 'admin') return
    const load = async () => {
      const now = new Date()
      const w7  = new Date(now.getTime() - 7  * 24 * 3600 * 1000).toISOString()
      const w30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString()

      const [
        { count: totalUsers },
        { count: newUsers7 },
        { count: newUsers30 },
        { count: totalClasses },
        { count: totalLecons },
        { count: totalGen },
        { count: gen7 },
        { count: totalQuiz },
        { count: totalSondages },
        { count: leconsBrouillon },
        { count: leconsPretes },
        { count: leconsEnCours },
      ] = await Promise.all([
        supabase.from('utilisateurs').select('*', { count: 'exact', head: true }),
        supabase.from('utilisateurs').select('*', { count: 'exact', head: true }).gte('created_at', w7),
        supabase.from('utilisateurs').select('*', { count: 'exact', head: true }).gte('created_at', w30),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('lecons').select('*', { count: 'exact', head: true }),
        supabase.from('generations_ia').select('*', { count: 'exact', head: true }),
        supabase.from('generations_ia').select('*', { count: 'exact', head: true }).gte('created_at', w7),
        supabase.from('quiz').select('*', { count: 'exact', head: true }),
        supabase.from('sondages').select('*', { count: 'exact', head: true }),
        supabase.from('lecons').select('*', { count: 'exact', head: true }).eq('statut', 'brouillon'),
        supabase.from('lecons').select('*', { count: 'exact', head: true }).eq('statut', 'prete'),
        supabase.from('lecons').select('*', { count: 'exact', head: true }).eq('statut', 'en_cours'),
      ])

      setStats({ totalUsers, newUsers7, newUsers30, totalClasses, totalLecons, totalGen, gen7, totalQuiz, totalSondages, leconsBrouillon, leconsPretes, leconsEnCours })
      setLoading(false)
    }
    load()
  }, [profil])

  if (authLoading || loading) return <LoadingScreen />
  if (!profil || profil.type_compte !== 'admin') return null

  const s = stats

  const BLOCS = [
    {
      titre: 'Utilisateurs',
      color: '#A78BFA',
      items: [
        { label: 'Total inscrits',        val: s.totalUsers },
        { label: 'Nouveaux (7 jours)',    val: s.newUsers7  },
        { label: 'Nouveaux (30 jours)',   val: s.newUsers30 },
      ],
    },
    {
      titre: 'Contenu pédagogique',
      color: '#60A5FA',
      items: [
        { label: 'Classes créées',      val: s.totalClasses },
        { label: 'Leçons créées',       val: s.totalLecons  },
        { label: 'Leçons brouillon',    val: s.leconsBrouillon },
        { label: 'Leçons prêtes',       val: s.leconsPretes },
        { label: 'Leçons en cours',     val: s.leconsEnCours },
      ],
    },
    {
      titre: 'IA & Engagement',
      color: '#34D399',
      items: [
        { label: 'Générations IA totales', val: s.totalGen  },
        { label: 'Générations (7 jours)',  val: s.gen7      },
        { label: 'Quiz créés',            val: s.totalQuiz      },
        { label: 'Sondages créés',        val: s.totalSondages  },
      ],
    },
  ]

  const leconTotal = (s.leconsBrouillon || 0) + (s.leconsPretes || 0) + (s.leconsEnCours || 0)

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/admin/analytics" onLogout={logout} />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Analytics</div>
            <div className="topbar-sub">Données réelles en temps réel depuis Supabase</div>
          </div>
        </div>

        <div className="page-content fade-in">
          {/* Métriques principales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Utilisateurs',      val: s.totalUsers,   color: '#A78BFA', sub: `+${s.newUsers7} cette semaine` },
              { label: 'Classes',           val: s.totalClasses, color: '#60A5FA', sub: `${s.totalLecons} leçons` },
              { label: 'Générations IA',    val: s.totalGen,     color: '#34D399', sub: `+${s.gen7} cette semaine` },
              { label: 'Quiz + Sondages',   val: (s.totalQuiz || 0) + (s.totalSondages || 0), color: '#F59E0B', sub: `${s.totalQuiz} quiz · ${s.totalSondages} sondages` },
            ].map((kpi, i) => (
              <div key={i} style={{ padding: '18px 20px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${kpi.color}22`, borderRadius: 12 }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: kpi.color, marginBottom: 4 }}>{kpi.val?.toLocaleString() || 0}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600, marginBottom: 2 }}>{kpi.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-5)' }}>{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Distribution statuts leçons */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 12 }}>Distribution statuts leçons</div>
            <div style={{ display: 'flex', height: 24, borderRadius: 8, overflow: 'hidden', gap: 1 }}>
              {[
                { label: 'Brouillon', val: s.leconsBrouillon, color: '#94A3B8' },
                { label: 'Prête',     val: s.leconsPretes,    color: '#60A5FA' },
                { label: 'En cours',  val: s.leconsEnCours,   color: '#FBC34A' },
              ].filter(b => b.val > 0).map((b, i) => {
                const pct = leconTotal > 0 ? Math.round((b.val / leconTotal) * 100) : 0
                return (
                  <div key={i} title={`${b.label}: ${b.val} (${pct}%)`}
                    style={{ height: '100%', width: `${pct}%`, background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'rgba(0,0,0,0.6)', minWidth: pct > 5 ? 'auto' : 0 }}>
                    {pct > 8 ? `${pct}%` : ''}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              {[
                { label: 'Brouillon', val: s.leconsBrouillon, color: '#94A3B8' },
                { label: 'Prête',     val: s.leconsPretes,    color: '#60A5FA' },
                { label: 'En cours',  val: s.leconsEnCours,   color: '#FBC34A' },
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />
                  <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{b.label} ({b.val})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Blocs détaillés */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {BLOCS.map((bloc, bi) => (
              <div key={bi} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: bloc.color, marginBottom: 12, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{bloc.titre}</div>
                {bloc.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < bloc.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{item.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: bloc.color }}>{(item.val || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
