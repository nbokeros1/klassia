'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'
import { STATUT_LECON } from '@/lib/constants/statuts'

// Conserve l'ordre d'affichage de la barre segmentée
const STATUTS = (
  ['brouillon', 'prete', 'en_cours', 'enseignee', 'complete', 'a_revoir', 'archivee'] as const
).map(id => ({ id, ...STATUT_LECON[id] }))

type SuivreTab = 'progression' | 'evaluations' | 'participation' | 'rapports'

export default function SuivrePage() {
  const [profil, setProfil]   = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [lecons, setLecons]   = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<SuivreTab>('progression')
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await supabase.from('utilisateurs').select('*').eq('user_id', session.user.id).single()
      if (!p) { router.push('/login'); return }
      setProfil(p)
      const { data: cls } = await supabase.from('classes').select('*').eq('enseignant_id', p.id).order('created_at', { ascending: false })
      const list = cls || []
      setClasses(list)
      if (list.length > 0) {
        const ids = list.map((c: any) => c.id)
        const { data: lec } = await supabase.from('lecons').select('id, titre, statut, classe_id').in('classe_id', ids)
        const map: Record<string, any[]> = {}
        for (const l of lec || []) {
          if (!map[l.classe_id]) map[l.classe_id] = []
          map[l.classe_id].push(l)
        }
        setLecons(map)
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <LoadingScreen />

  const allLecons    = Object.values(lecons).flat()
  const totalLecons  = allLecons.length
  const totalComplete = allLecons.filter((l: any) => l.statut === 'complete').length
  const totalEnCours  = allLecons.filter((l: any) => l.statut === 'en_cours').length
  const totalARevoir  = allLecons.filter((l: any) => l.statut === 'a_revoir').length

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/suivre" onLogout={handleLogout} />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Suivre</div>
            <div className="topbar-sub">Progression des leçons et résultats</div>
          </div>
          <button className="btn-ghost btn-sm" onClick={() => router.push('/dashboard/historique')}>
            🕒 Historique
          </button>
        </div>

        <div className="page-content fade-in">

          {/* KPI cards */}
          <div className="stats-grid" style={{ marginBottom: '20px' }}>
            {[
              { icon: '🏫', label: 'Classes',   value: classes.length, sub: 'actives',        accent: '#60A5FA', bg: 'rgba(45,95,160,0.15)' },
              { icon: '📄', label: 'Leçons',    value: totalLecons,    sub: 'tous statuts',   accent: '#A78BFA', bg: 'rgba(124,58,237,0.15)' },
              { icon: '🟡', label: 'En cours',  value: totalEnCours,   sub: 'en progression', accent: '#FBC34A', bg: 'rgba(251,195,74,0.12)' },
              { icon: '✅', label: 'Terminées', value: totalComplete,  sub: totalLecons > 0 ? `${Math.round((totalComplete / totalLecons) * 100)}% du total` : '0%', accent: '#34D399', bg: 'rgba(52,211,153,0.12)' },
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{ position: 'relative' }}>
                <div className="stat-icon" style={{ background: s.bg }}>
                  <span style={{ fontSize: '18px' }}>{s.icon}</span>
                </div>
                <div className="stat-value" style={{ color: s.accent }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-sub">{s.sub}</div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: s.accent, opacity: 0.3, borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }} />
              </div>
            ))}
          </div>

          {/* À revoir alert */}
          {totalARevoir > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', marginBottom: '16px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
              onClick={() => setActiveTab('progression')}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <span style={{ fontSize: '13px', color: '#F87171', fontWeight: 600 }}>
                {totalARevoir} leçon{totalARevoir > 1 ? 's' : ''} marquée{totalARevoir > 1 ? 's' : ''} «&nbsp;À revoir&nbsp;» nécessite{totalARevoir > 1 ? 'nt' : ''} ton attention
              </span>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-4)' }}>Voir →</span>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '18px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)', width: 'fit-content' }}>
            {([
              { id: 'progression'  as SuivreTab, label: 'Progression',  icon: '📊' },
              { id: 'evaluations'  as SuivreTab, label: 'Évaluations',  icon: '📝' },
              { id: 'participation'as SuivreTab, label: 'Participation', icon: '🙋' },
              { id: 'rapports'     as SuivreTab, label: 'Rapports',      icon: '📋' },
            ]).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: '7px 16px', borderRadius: '7px', border: 'none',
                background: activeTab === tab.id ? 'var(--violet)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--text-3)',
                fontSize: '12px', fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Progression ── */}
          {activeTab === 'progression' && (
            <>
              {/* Legend */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                {STATUTS.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>{s.label}</span>
                  </div>
                ))}
              </div>

              {classes.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '8px' }}>Aucune classe créée</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-4)', lineHeight: 1.6 }}>Crée ta première classe dans <strong style={{ color: 'var(--text-3)' }}>Mes classes</strong> pour suivre la progression de tes leçons.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
                  {classes.map(cls => {
                    const lecs  = lecons[cls.id] || []
                    const total = lecs.length
                    const complete = lecs.filter((l: any) => l.statut === 'complete').length
                    const pct   = total > 0 ? Math.round((complete / total) * 100) : 0
                    const counts = STATUTS.reduce((acc, s) => {
                      acc[s.id] = lecs.filter((l: any) => l.statut === s.id).length
                      return acc
                    }, {} as Record<string, number>)
                    const aRevoir = counts['a_revoir'] || 0
                    return (
                      <div key={cls.id} className="card" style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                        onClick={() => router.push(`/dashboard/classes/${cls.id}`)}>
                        {aRevoir > 0 && (
                          <div style={{ position: 'absolute', top: 0, right: 0, background: '#F87171', color: 'white', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '0 var(--radius-md) 0 6px' }}>
                            {aRevoir} à revoir
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0,
                            background: cls.couleur || 'linear-gradient(135deg,#1B3F6E,#7C3AED)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', fontWeight: 700, color: 'white',
                          }}>
                            {cls.nom?.[0]?.toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.nom}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-4)' }}>{cls.niveau} · {total} leçon{total !== 1 ? 's' : ''}</div>
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: pct === 100 ? '#34D399' : 'var(--text-3)', flexShrink: 0 }}>{pct}%</span>
                        </div>

                        {total > 0 ? (
                          <>
                            {/* Segmented progress bar */}
                            <div style={{ height: '8px', borderRadius: '99px', overflow: 'hidden', marginBottom: '12px', display: 'flex', gap: '1px', background: 'rgba(255,255,255,0.05)' }}>
                              {STATUTS.map(s => {
                                const w = (counts[s.id] / total) * 100
                                if (w === 0) return null
                                return <div key={s.id} style={{ height: '100%', width: `${w}%`, background: s.color, transition: 'width 0.5s ease', flexShrink: 0 }} />
                              })}
                            </div>
                            {/* Status count pills — only non-zero */}
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {STATUTS.filter(s => counts[s.id] > 0).map(s => (
                                <div key={s.id} style={{ padding: '3px 8px', borderRadius: '99px', background: s.bg, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: s.color }}>{counts[s.id]}</span>
                                  <span style={{ fontSize: '10px', color: s.color, opacity: 0.85 }}>{s.label}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--text-4)', textAlign: 'center', padding: '6px 0' }}>Aucune leçon encore</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Tab: Évaluations ── */}
          {activeTab === 'evaluations' && (() => {
            const enseignees = allLecons.filter((l: any) => l.statut === 'enseignee' || l.statut === 'complete')
            const taux = totalLecons > 0 ? Math.round((enseignees.length / totalLecons) * 100) : 0
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {[
                    { icon: '📘', label: 'Leçons enseignées', value: enseignees.length, sub: 'enseignée + terminée', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
                    { icon: '✅', label: 'Terminées',          value: totalComplete,       sub: 'statut « complete »', color: '#34D399', bg: 'rgba(52,211,153,0.12)'  },
                    { icon: '📊', label: 'Taux d\'avancement', value: `${taux}%`,          sub: 'enseignée + terminée / total', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
                  ].map((k, i) => (
                    <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                        {k.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginTop: '2px' }}>{k.label}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-4)' }}>{k.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Par classe */}
                {classes.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '8px' }}>Aucune donnée d&apos;avancement</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-4)', lineHeight: 1.6 }}>Crée des classes et prépare des leçons — les données d&apos;avancement apparaîtront automatiquement.</div>
                  </div>
                ) : (
                  classes.map(cls => {
                    const lecs     = lecons[cls.id] || []
                    const taught   = lecs.filter((l: any) => l.statut === 'enseignee' || l.statut === 'complete')
                    const prete    = lecs.filter((l: any) => l.statut === 'prete').length
                    const aRevoir  = lecs.filter((l: any) => l.statut === 'a_revoir').length
                    const pct      = lecs.length > 0 ? Math.round((taught.length / lecs.length) * 100) : 0
                    return (
                      <div key={cls.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        {/* Classe header */}
                        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: cls.couleur || 'linear-gradient(135deg,#1B3F6E,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                            {cls.nom?.[0]?.toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>{cls.nom}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-4)' }}>{cls.niveau} · {lecs.length} leçon{lecs.length !== 1 ? 's' : ''}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {aRevoir > 0 && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(248,113,113,0.15)', color: '#F87171', fontWeight: 700 }}>{aRevoir} à revoir</span>}
                            {prete > 0   && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(96,165,250,0.12)', color: '#60A5FA' }}>{prete} prête{prete > 1 ? 's' : ''}</span>}
                            <span style={{ fontSize: '13px', fontWeight: 800, color: pct === 100 ? '#34D399' : 'var(--text-3)', minWidth: '38px', textAlign: 'right' }}>{pct}%</span>
                          </div>
                        </div>

                        {/* Leçons enseignées */}
                        {taught.length === 0 ? (
                          <div style={{ padding: '20px 18px', textAlign: 'center', fontSize: '12px', color: 'var(--text-4)' }}>
                            Aucune leçon enseignée dans cette classe
                          </div>
                        ) : (
                          taught.map((l: any) => {
                            const st = STATUT_LECON[l.statut as keyof typeof STATUT_LECON] || STATUT_LECON.brouillon
                            return (
                              <div key={l.id}
                                onClick={() => router.push(`/dashboard/classes/${cls.id}/lecons/${l.id}`)}
                                style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'background 0.15s' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '99px', background: st.bg, color: st.color, flexShrink: 0 }}>{st.label}</span>
                                <span style={{ fontSize: '12px', color: 'var(--text-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.titre || 'Sans titre'}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-4)', flexShrink: 0 }}>›</span>
                              </div>
                            )
                          })
                        )}

                        {/* Quiz section */}
                        <div style={{ padding: '10px 18px', borderTop: taught.length > 0 ? '1px solid var(--border)' : undefined, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px' }}>🎮</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>Quiz live — <span style={{ color: '#A78BFA', fontWeight: 600 }}>Pro+</span></span>
                          </div>
                          <button className="btn-ghost btn-sm" style={{ fontSize: '10px' }} onClick={() => router.push('/dashboard/outils')}>
                            Activer →
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )
          })()}

          {/* ── Tab: Participation ── */}
          {activeTab === 'participation' && (() => {
            const statusOrder: (keyof typeof STATUT_LECON)[] = ['brouillon','prete','en_cours','enseignee','complete','a_revoir','archivee']
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Info banner */}
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '15px', flexShrink: 0 }}>ℹ️</span>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.6 }}>
                    La <strong style={{ color: 'var(--text-2)' }}>participation par élève</strong> (présences, réponses aux sondages, scores quiz) sera disponible avec <strong style={{ color: '#A78BFA' }}>Pro+</strong>. En attendant, voici l'activité de tes classes.
                  </div>
                </div>

                {/* Per-class activity */}
                {classes.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '8px' }}>Aucune classe à afficher</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-4)', lineHeight: 1.6 }}>Crée des classes pour commencer à suivre l&apos;activité de tes enseignements.</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                    {classes.map(cls => {
                      const lecs = lecons[cls.id] || []
                      const counts = statusOrder.reduce((acc, s) => {
                        acc[s] = lecs.filter((l: any) => l.statut === s).length
                        return acc
                      }, {} as Record<string, number>)
                      const active = (counts['en_cours'] || 0) + (counts['prete'] || 0)
                      const aRevoir = counts['a_revoir'] || 0
                      const done = (counts['complete'] || 0) + (counts['enseignee'] || 0)
                      const total = lecs.length
                      return (
                        <div key={cls.id} className="card">
                          {/* Header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: cls.couleur || 'linear-gradient(135deg,#1B3F6E,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                              {cls.nom?.[0]?.toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.nom}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-4)' }}>{cls.niveau} · {cls.matiere}</div>
                            </div>
                            <button className="btn-ghost btn-sm" style={{ fontSize: '10px' }} onClick={() => router.push(`/dashboard/classes/${cls.id}`)}>
                              Voir →
                            </button>
                          </div>

                          {/* Activity metrics */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '14px' }}>
                            {[
                              { label: 'Total',    value: total,    color: 'var(--text-3)',  bg: 'rgba(255,255,255,0.04)' },
                              { label: 'Actives',  value: active,   color: '#60A5FA',        bg: 'rgba(96,165,250,0.08)'  },
                              { label: 'Faites',   value: done,     color: '#34D399',        bg: 'rgba(52,211,153,0.08)'  },
                            ].map((m, i) => (
                              <div key={i} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: '8px', background: m.bg }}>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-4)', marginTop: '3px' }}>{m.label}</div>
                              </div>
                            ))}
                          </div>

                          {/* Alert if à revoir */}
                          {aRevoir > 0 && (
                            <div onClick={() => router.push(`/dashboard/classes/${cls.id}`)}
                              style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px' }}>
                              <span style={{ fontSize: '12px' }}>⚠️</span>
                              <span style={{ fontSize: '11px', color: '#F87171', fontWeight: 600 }}>{aRevoir} leçon{aRevoir > 1 ? 's' : ''} à revoir</span>
                              <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#F87171' }}>→</span>
                            </div>
                          )}

                          {/* Status distribution bar */}
                          {total > 0 && (
                            <div>
                              <div style={{ height: '6px', borderRadius: '99px', overflow: 'hidden', display: 'flex', gap: '1px', marginBottom: '8px' }}>
                                {statusOrder.map(s => {
                                  const w = (counts[s] / total) * 100
                                  if (w === 0) return null
                                  return <div key={s} style={{ height: '100%', width: `${w}%`, background: STATUT_LECON[s].color, flexShrink: 0 }} />
                                })}
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {statusOrder.filter(s => counts[s] > 0).map(s => (
                                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: STATUT_LECON[s].color, flexShrink: 0 }} />
                                    <span style={{ fontSize: '10px', color: 'var(--text-4)' }}>{counts[s]} {STATUT_LECON[s].label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── Tab: Rapports ── */}
          {activeTab === 'rapports' && (() => {
            const handlePrint = () => window.print()
            const now = new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-4)' }}>Rapport généré le {now}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-ghost btn-sm" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🖨️ Imprimer
                    </button>
                    <button className="btn-ghost btn-sm" onClick={() => router.push('/dashboard/studio-ia')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ✦ Générer rapport IA
                    </button>
                  </div>
                </div>

                {/* Global summary */}
                {classes.length > 0 && (
                  <div className="card">
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '16px' }}>Résumé global — {classes.length} classe{classes.length > 1 ? 's' : ''}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                      {([
                        { label: 'Leçons total',   value: totalLecons,    color: 'var(--text-2)' },
                        { label: 'Terminées',       value: totalComplete,  color: '#34D399'       },
                        { label: 'En cours',        value: totalEnCours,   color: '#FBC34A'       },
                        { label: 'À revoir',        value: totalARevoir,   color: '#F87171'       },
                        { label: 'Avancement',      value: totalLecons > 0 ? `${Math.round((totalComplete / totalLecons) * 100)}%` : '—', color: '#A78BFA' },
                      ] as const).map((m, i) => (
                        <div key={i} style={{ textAlign: 'center', padding: '14px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '22px', fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-4)', marginTop: '4px' }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                    {/* Global progress bar */}
                    {totalLecons > 0 && (
                      <div style={{ height: '8px', borderRadius: '99px', overflow: 'hidden', display: 'flex', gap: '1px', background: 'rgba(255,255,255,0.05)' }}>
                        {STATUTS.map(s => {
                          const cnt = allLecons.filter((l: any) => l.statut === s.id).length
                          const w   = (cnt / totalLecons) * 100
                          if (w === 0) return null
                          return <div key={s.id} style={{ height: '100%', width: `${w}%`, background: s.color, flexShrink: 0 }} />
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Per-class report cards */}
                {classes.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '8px' }}>Aucune donnée à rapporter</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-4)', lineHeight: 1.6 }}>Les rapports apparaîtront dès que tu auras créé des classes et préparé des leçons.</div>
                  </div>
                ) : (
                  classes.map(cls => {
                    const lecs    = lecons[cls.id] || []
                    const total   = lecs.length
                    const done    = lecs.filter((l: any) => l.statut === 'complete').length
                    const taught  = lecs.filter((l: any) => l.statut === 'enseignee').length
                    const inProg  = lecs.filter((l: any) => l.statut === 'en_cours').length
                    const prete   = lecs.filter((l: any) => l.statut === 'prete').length
                    const aRevoir = lecs.filter((l: any) => l.statut === 'a_revoir').length
                    const brouillon = lecs.filter((l: any) => l.statut === 'brouillon').length
                    const pct     = total > 0 ? Math.round((done / total) * 100) : 0
                    return (
                      <div key={cls.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        {/* Class header */}
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: cls.couleur || 'linear-gradient(135deg,#1B3F6E,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                            {cls.nom?.[0]?.toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>{cls.nom}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-4)' }}>{cls.niveau} · {cls.matiere} · {total} leçon{total !== 1 ? 's' : ''}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: pct === 100 ? '#34D399' : 'var(--text-2)', lineHeight: 1 }}>{pct}%</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-4)' }}>terminé</div>
                          </div>
                        </div>

                        <div style={{ padding: '16px 20px' }}>
                          {/* Progress bar */}
                          {total > 0 && (
                            <div style={{ marginBottom: '14px' }}>
                              <div style={{ height: '8px', borderRadius: '99px', overflow: 'hidden', display: 'flex', gap: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: '8px' }}>
                                {STATUTS.map(s => {
                                  const cnt = lecs.filter((l: any) => l.statut === s.id).length
                                  const w   = (cnt / total) * 100
                                  if (w === 0) return null
                                  return <div key={s.id} style={{ height: '100%', width: `${w}%`, background: s.color, flexShrink: 0 }} />
                                })}
                              </div>
                            </div>
                          )}

                          {/* Stats grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: total > 0 && aRevoir > 0 ? '12px' : '0' }}>
                            {([
                              { label: 'Terminées',   value: done,      color: '#34D399' },
                              { label: 'Enseignées',  value: taught,    color: '#A78BFA' },
                              { label: 'En cours',    value: inProg,    color: '#FBC34A' },
                              { label: 'Prêtes',      value: prete,     color: '#60A5FA' },
                              { label: 'Brouillons',  value: brouillon, color: '#94A3B8' },
                              { label: 'À revoir',    value: aRevoir,   color: '#F87171' },
                            ] as const).filter(m => m.value > 0).map((m, i) => (
                              <div key={i} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                                <div>
                                  <div style={{ fontSize: '14px', fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</div>
                                  <div style={{ fontSize: '9px', color: 'var(--text-4)', marginTop: '2px' }}>{m.label}</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {aRevoir > 0 && (
                            <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '12px' }}>⚠️</span>
                              <span style={{ fontSize: '11px', color: '#F87171', fontWeight: 600 }}>Attention : {aRevoir} leçon{aRevoir > 1 ? 's' : ''} marquée{aRevoir > 1 ? 's' : ''} « À revoir »</span>
                              <button onClick={() => router.push(`/dashboard/classes/${cls.id}`)}
                                style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '11px', color: '#F87171', cursor: 'pointer', padding: '2px 8px', borderRadius: '6px' }}>
                                Corriger →
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}

                {/* Print CSS */}
                <style>{`@media print { .sidebar, .topbar button, [class*="btn"] { display: none !important; } .app-layout { display: block !important; } .main-content { margin: 0 !important; padding: 0 !important; } @page { margin: 1.5cm; } }`}</style>
              </div>
            )
          })()}

        </div>
      </div>
    </div>
  )
}
