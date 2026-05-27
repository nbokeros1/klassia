'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'

export default function DashboardPage() {
  const [profil, setProfil] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [generations, setGenerations] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [time, setTime] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }
        const user = session.user

        let { data: profil } = await supabase
          .from('utilisateurs').select('*').eq('user_id', user.id).single()
        if (!profil) {
          const { data: nouveau } = await supabase.from('utilisateurs').upsert({
            user_id: user.id, email: user.email,
            prenom: user.user_metadata?.prenom || '',
            nom: user.user_metadata?.nom || '',
            ecole: user.user_metadata?.ecole || '',
            type_compte: user.user_metadata?.type_compte || 'enseignant',
            langue_interface: user.user_metadata?.langue || 'fr',
            langue_enseignement: user.user_metadata?.langue || 'fr',
          }, { onConflict: 'user_id' }).select().single()
          if (!nouveau) return
          profil = nouveau
        }
        setProfil(profil)

        const [clsRes, genRes] = await Promise.all([
          supabase.from('classes').select('*').eq('enseignant_id', profil.id).order('created_at', { ascending: false }),
          supabase.from('generations_ia').select('*', { count: 'exact', head: true }).eq('enseignant_id', profil.id),
        ])
        setClasses(clsRes.data || [])
        setGenerations(genRes.count || 0)
        setLoading(false)
      } catch (e: any) {
        console.error('Dashboard init error:', e)
      }
    }
    init()

    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const iv = setInterval(tick, 30000)
    return () => clearInterval(iv)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <LoadingScreen />

  const today = new Date().toLocaleDateString('fr-CA', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
  const totalEleves = classes.reduce((a, c) => a + (c.nombre_eleves || 0), 0)
  const curriculumCount = classes.filter(c => c.curriculum_charge).length

  const QUICKACTIONS = [
    { label: 'Nouvelle classe', icon: '🏫', color: 'rgba(45,95,160,0.2)', border: 'rgba(45,95,160,0.3)', href: '/dashboard/classes' },
    { label: 'Générer une leçon', icon: '✦', color: 'rgba(124,58,237,0.2)', border: 'rgba(124,58,237,0.3)', href: '/dashboard/studio' },
    { label: 'Calendrier', icon: '📅', color: 'rgba(252,211,77,0.15)', border: 'rgba(252,211,77,0.25)', href: '/dashboard/calendrier' },
    { label: 'Ressources', icon: '📁', color: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.2)', href: '/dashboard/ressources' },
  ]

  return (
    <div className="app-layout">

      <Sidebar profil={profil} activeHref="/dashboard" onLogout={handleLogout} />

      {/* ── MAIN CONTENT ── */}
      <div className="main-content">

        {/* Topbar */}
        <div className="topbar">
          <div>
            <div className="topbar-title">
              Bonjour, {profil?.prenom} 👋
            </div>
            <div className="topbar-sub" style={{ textTransform: 'capitalize' }}>{today} · {time}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn-ghost btn-sm" onClick={() => router.push('/dashboard/classes')}>
              + Classe
            </button>
            <button className="btn-violet" onClick={() => router.push('/dashboard/studio')}
              style={{ fontSize: '13px', padding: '9px 18px' }}>
              ✦ Studio IA
            </button>
          </div>
        </div>

        <div className="page-content fade-in">

          {/* ── KPI STATS ── */}
          <div className="stats-grid">
            {[
              {
                icon: '🏫', label: 'Classes actives', value: classes.length,
                sub: 'Année 2025–2026',
                bg: 'rgba(45,95,160,0.15)', accent: '#60A5FA',
                action: () => router.push('/dashboard/classes'),
              },
              {
                icon: '👥', label: 'Élèves total', value: totalEleves,
                sub: 'Tous niveaux confondus',
                bg: 'rgba(124,58,237,0.15)', accent: '#A78BFA',
                action: () => router.push('/dashboard/classes'),
              },
              {
                icon: '📄', label: 'Curriculum chargés', value: curriculumCount,
                sub: `${classes.length > 0 ? Math.round((curriculumCount / classes.length) * 100) : 0}% de tes classes`,
                bg: 'rgba(252,211,77,0.12)', accent: '#FCD34D',
                action: () => router.push('/dashboard/classes'),
              },
              {
                icon: '✦', label: 'Générations IA', value: generations,
                sub: 'Total · tous types',
                bg: 'rgba(124,58,237,0.12)', accent: '#C084FC',
                action: () => router.push('/dashboard/historique'),
              },
            ].map((s, i) => (
              <div key={i} className="stat-card" onClick={s.action}
                style={{ cursor: 'pointer' }}>
                <div className="stat-icon" style={{ background: s.bg }}>
                  <span style={{ fontSize: '18px' }}>{s.icon}</span>
                </div>
                <div className="stat-value" style={{ color: s.accent }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-sub">{s.sub}</div>
                {/* accent bar */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: s.accent, opacity: 0.3, borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }} />
              </div>
            ))}
          </div>

          {/* ── QUICK ACTIONS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
            {QUICKACTIONS.map((qa, i) => (
              <button key={i} onClick={() => router.push(qa.href)} style={{
                background: qa.color, border: `1px solid ${qa.border}`,
                borderRadius: 'var(--radius-md)', padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: '10px',
                cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                <span style={{ fontSize: '18px' }}>{qa.icon}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>{qa.label}</span>
              </button>
            ))}
          </div>

          {/* ── MAIN GRID ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '16px' }}>

            {/* Mes classes */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-1)' }}>Mes classes</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '2px' }}>
                    {classes.length} classe{classes.length !== 1 ? 's' : ''} · {totalEleves} élèves
                  </div>
                </div>
                <button className="btn-ghost btn-sm" onClick={() => router.push('/dashboard/classes')}>
                  + Nouvelle
                </button>
              </div>

              {classes.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏫</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '6px' }}>
                    Aucune classe encore
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-4)', marginBottom: '20px' }}>
                    Crée ta première classe pour commencer
                  </div>
                  <button className="btn-primary" onClick={() => router.push('/dashboard/classes')}>
                    Créer une classe
                  </button>
                </div>
              ) : (
                <div>
                  {classes.slice(0, 6).map((cls, i) => (
                    <div key={cls.id}
                      onClick={() => router.push(`/dashboard/classes/${cls.id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        padding: '13px 20px',
                        borderBottom: i < Math.min(classes.length, 6) - 1 ? '1px solid var(--border)' : 'none',
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {/* Color swatch */}
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '10px',
                        background: cls.couleur || 'linear-gradient(135deg,#1B3F6E,#7C3AED)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', fontWeight: 700, color: 'white', flexShrink: 0,
                        boxShadow: `0 4px 12px ${cls.couleur || '#1B3F6E'}40`,
                      }}>
                        {cls.nom?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '2px' }}>
                          {cls.nom}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-4)' }}>
                          {cls.niveau} · {cls.matiere} · {cls.nombre_eleves} élèves
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        {cls.curriculum_charge && (
                          <span className="badge badge-green" style={{ fontSize: '10px', padding: '2px 8px' }}>✓ Curriculum</span>
                        )}
                        <span style={{ color: 'var(--text-4)', fontSize: '18px', fontWeight: 300 }}>›</span>
                      </div>
                    </div>
                  ))}
                  {classes.length > 6 && (
                    <div onClick={() => router.push('/dashboard/classes')} style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-4)', cursor: 'pointer', transition: 'color 0.15s', borderTop: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#60A5FA')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-4)')}>
                      Voir toutes les classes ({classes.length}) →
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Colonne droite */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Studio IA CTA */}
              <div onClick={() => router.push('/dashboard/studio')} style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(74,40,130,0.25) 100%)',
                border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: 'var(--radius-lg)', padding: '20px',
                cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(124,58,237,0.25)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.3), transparent)', filter: 'blur(30px)' }} />
                <div style={{ fontSize: '26px', marginBottom: '8px' }}>✦</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '5px' }}>
                  Studio IA
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(240,244,255,0.5)', marginBottom: '16px', lineHeight: 1.6 }}>
                  Génère tes plans de leçon, quiz et évaluations en 30 secondes
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)',
                  color: '#A78BFA', padding: '7px 14px', borderRadius: '8px',
                  fontSize: '12px', fontWeight: 600,
                }}>
                  Ouvrir le Studio →
                </div>
              </div>

              {/* Note rapide */}
              <div className="card">
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span>📝</span> Note rapide
                </div>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Écris une note rapide..."
                  style={{ height: '80px', resize: 'none', fontSize: '12px', lineHeight: 1.6 }}
                />
              </div>

              {/* Progression curriculum */}
              <div className="card">
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span>📄</span> Curriculum
                </div>
                {classes.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-4)', textAlign: 'center', padding: '10px 0' }}>
                    Aucune classe créée
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Chargés</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#4ADE80' }}>
                        {curriculumCount}/{classes.length}
                      </span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${classes.length > 0 ? (curriculumCount / classes.length) * 100 : 0}%`,
                        background: 'linear-gradient(90deg, #2D5FA0, #7C3AED)',
                        borderRadius: '99px', transition: 'width 0.8s ease',
                      }} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '8px' }}>
                      {classes.length - curriculumCount > 0
                        ? `${classes.length - curriculumCount} classe${classes.length - curriculumCount > 1 ? 's' : ''} sans curriculum`
                        : '✓ Tous les curriculums chargés'}
                    </div>
                  </div>
                )}
              </div>

              {/* Liens rapides */}
              <div className="card" style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-4)', marginBottom: '10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Accès rapide</div>
                {[
                  { label: 'Dashboard École (Admin)', icon: '📊', href: '/dashboard/ecole', accent: 'rgba(0,255,136,0.1)', color: '#00FF88' },
                  { label: 'Mon profil IA', icon: '🧠', href: '/dashboard/profil-ia', accent: 'rgba(124,58,237,0.1)', color: '#A78BFA' },
                  { label: 'Historique générations', icon: '🕒', href: '/dashboard/historique', accent: 'rgba(96,165,250,0.1)', color: '#60A5FA' },
                ].map((link, i) => (
                  <div key={i} onClick={() => router.push(link.href)} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', borderRadius: '8px',
                    cursor: 'pointer', transition: 'background 0.15s', marginBottom: '4px',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = link.accent)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontSize: '14px' }}>{link.icon}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-3)', flex: 1 }}>{link.label}</span>
                    <span style={{ fontSize: '10px', color: link.color }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── FOOTER INFO ── */}
          <div style={{ marginTop: '20px', padding: '14px 18px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>✦</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '2px' }}>
                KlassIA est en version Beta
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-4)' }}>
                Nouvelles fonctionnalités chaque semaine · Slides interactifs, annotation en direct et mode présentation arrivent bientôt.
              </div>
            </div>
            <button className="btn-ghost btn-sm" style={{ flexShrink: 0, whiteSpace: 'nowrap' as const }}>
              Voir la feuille de route
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
