'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import LoadingScreen from '@/components/LoadingScreen'

// ─── Constants ────────────────────────────────────────────────────────────────

const JOURS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

const TACHE_ICONS: Record<string, string> = {
  valider_plan: '✅', corriger: '📝', contacter_parent: '📞',
  imprimer: '🖨', preparer_lecon: '📋', rappel: '🔔', manuelle: '📌',
}

const MATIERE_ICONS: Record<string, string> = {
  math: '➗', français: '📖', french: '📖', anglais: '🔤', english: '🔤',
  science: '🔬', histoire: '📜', history: '📜', géographie: '🌍',
  physique: '⚽', art: '🎨', musique: '🎵', music: '🎵', informatique: '💻',
}

function getMatiereIcon(matiere?: string): string {
  if (!matiere) return '📚'
  const k = matiere.toLowerCase()
  for (const [key, icon] of Object.entries(MATIERE_ICONS)) {
    if (k.includes(key)) return icon
  }
  return '📚'
}

// ─── Mini SVG area chart ───────────────────────────────────────────────────────

function AreaChart({ data }: { data: { label: string; count: number }[] }) {
  const n = data.length
  if (n < 2) return null
  const maxVal = Math.max(...data.map(d => d.count), 1)
  const W = 280, H = 80
  const padL = 4, padR = 4, padT = 8, padB = 20
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const pts = data.map((d, i) => ({
    x: padL + (i / (n - 1)) * innerW,
    y: padT + innerH - (d.count / maxVal) * innerH,
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[n - 1].x.toFixed(1)},${H - padB} L${pts[0].x.toFixed(1)},${H - padB} Z`
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id="dash-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6C5CE7" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#6C5CE7" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#dash-area-grad)" />
      <path d={line} fill="none" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => data[i].count > 0
        ? <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#6C5CE7" />
        : null
      )}
      {data.map((d, i) => (
        <text key={i} x={pts[i].x} y={H} textAnchor="middle" fontSize="8" fill="#8B97AC" fontFamily="inherit">{d.label}</text>
      ))}
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { profil, loading, logout } = useAuth()

  const [classes,          setClasses]          = useState<any[]>([])
  const [taches,           setTaches]           = useState<any[]>([])
  const [coursAujourdhui,  setCoursAujourdhui]  = useState<any[]>([])
  const [notifCount,       setNotifCount]       = useState(0)
  const [dataLoaded,       setDataLoaded]       = useState(false)
  const [totalLecons,      setTotalLecons]      = useState(0)
  const [showFab,          setShowFab]          = useState(false)
  const [prochainCours,    setProchainCours]    = useState<any>(null)
  const [leconsHistorique, setLeconsHistorique] = useState<{ created_at: string }[]>([])

  useEffect(() => {
    if (!profil?.id || dataLoaded) return
    const load = async () => {
      const todayJour  = JOURS_FR[new Date().getDay()]
      const demainJour = JOURS_FR[(new Date().getDay() + 1) % 7]
      const heureNow   = new Date().toTimeString().substring(0, 5)

      const [clsRes, tachesRes, coursRes, notifRes, coProcAujourdRes, coProcDemainRes] = await Promise.all([
        supabase.from('classes').select('*').eq('enseignant_id', profil.id).order('created_at', { ascending: false }),
        supabase.from('taches_enseignant').select('*').eq('enseignant_id', profil.id).eq('est_complete', false).order('date_echeance', { ascending: true }).limit(10),
        supabase.from('cours_semaine').select('*').eq('enseignant_id', profil.id).eq('jour', todayJour).order('heure_debut', { ascending: true }),
        supabase.from('notifications').select('id').eq('enseignant_id', profil.id).eq('est_lue', false).limit(99),
        supabase.from('cours_semaine').select('*').eq('enseignant_id', profil.id).eq('jour', todayJour).gte('heure_debut', heureNow).order('heure_debut', { ascending: true }).limit(1),
        supabase.from('cours_semaine').select('*').eq('enseignant_id', profil.id).eq('jour', demainJour).order('heure_debut', { ascending: true }).limit(1),
      ])
      const cls = clsRes.data || []
      setClasses(cls)
      setTaches(tachesRes.data || [])
      setCoursAujourdhui(coursRes.data || [])
      setNotifCount((notifRes.data || []).length)
      setProchainCours(coProcAujourdRes.data?.[0] || coProcDemainRes.data?.[0] || null)
      if (cls.length > 0) {
        const classIds = cls.map((c: any) => c.id)
        const [leconsCountRes, leconsHistRes] = await Promise.all([
          supabase.from('lecons').select('*', { count: 'exact', head: true }).in('classe_id', classIds),
          supabase.from('lecons').select('created_at').in('classe_id', classIds).order('created_at', { ascending: true }),
        ])
        setTotalLecons(leconsCountRes.count || 0)
        setLeconsHistorique(leconsHistRes.data || [])
      }
      setDataLoaded(true)
    }
    load()
  }, [profil?.id, dataLoaded])

  if (loading) return <LoadingScreen />

  const isFr        = (profil as any)?.langue_interface !== 'en'
  const prenom      = profil?.prenom ?? (profil as any)?.first_name ?? (profil as any)?.email?.split('@')[0] ?? ''
  const initiales   = prenom ? prenom[0].toUpperCase() : (profil?.email?.[0] ?? 'E').toUpperCase()
  const jourAujourd = JOURS_FR[new Date().getDay()]
  const dateAujourd = new Date().toLocaleDateString(isFr ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long' })

  // Crédits IA réels depuis le profil
  const forfait      = (profil as any)?.forfait || 'gratuit'
  const creditsUsed  = forfait === 'gratuit' ? ((profil as any)?.generations_ia_total_a_vie ?? 0)
                     : forfait === 'pro'     ? ((profil as any)?.generations_ia_mois_courant ?? 0)
                     : 0
  const creditsTotal = forfait === 'gratuit' ? 5 : forfait === 'pro' ? 75 : 0

  // Leçons par mois — 8 derniers mois
  const moisData = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - (7 - i), 1)
    const label = d.toLocaleDateString(isFr ? 'fr-CA' : 'en-CA', { month: 'short' }).replace('.', '')
    const count = leconsHistorique.filter(l => {
      const ld = new Date(l.created_at)
      return ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth()
    }).length
    return { label, count }
  })

  // Insights IA — réels, aucune stat fictive
  const insights: string[] = []
  const thisMois = moisData[moisData.length - 1]?.count ?? 0
  const prevMois = moisData[moisData.length - 2]?.count ?? 0
  if (thisMois > 0 && prevMois > 0 && thisMois > prevMois) {
    const diff = thisMois - prevMois
    insights.push(isFr
      ? `✅ Activité en hausse ce mois-ci (+${diff} leçon${diff > 1 ? 's' : ''})`
      : `✅ Activity up this month (+${diff} lesson${diff > 1 ? 's' : ''})`)
  }
  if (thisMois > 0) {
    insights.push(isFr
      ? `📖 ${thisMois} leçon${thisMois > 1 ? 's' : ''} préparée${thisMois > 1 ? 's' : ''} ce mois-ci`
      : `📖 ${thisMois} lesson${thisMois > 1 ? 's' : ''} prepared this month`)
  }
  if (classes.length > 0 && totalLecons > 0) {
    const avg = Math.round(totalLecons / classes.length)
    if (avg > 0) insights.push(isFr ? `ℹ️ Moy. ${avg} leçon${avg > 1 ? 's' : ''}/classe` : `ℹ️ Avg. ${avg} lesson${avg > 1 ? 's' : ''}/class`)
  }

  const classeProchain = prochainCours
    ? classes.find((c: any) => c.nom === prochainCours.nom_classe)
    : null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <style>{`
        .db-kpi { transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
        .db-kpi:hover { transform: translateY(-2px); box-shadow: var(--shadow-hero) !important; }
        .db-fab-menu { animation: fadeUp .15s ease both; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <Sidebar profil={profil} activeHref="/dashboard" onLogout={async () => { await logout() }} notifCount={notifCount} />

      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar
          notifCount={notifCount}
          initiales={initiales}
          creditsIa={{ used: creditsUsed, total: creditsTotal }}
          isFr={isFr}
        />

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 24px', position: 'relative' }}>

          {/* Ambient blobs */}
          <div className="ambient-blob" style={{ width: 520, height: 520, background: 'rgba(108,92,231,0.22)', top: -80, left: 60, position: 'fixed', pointerEvents: 'none', zIndex: 0 }} />
          <div className="ambient-blob" style={{ width: 380, height: 380, background: 'rgba(139,124,246,0.18)', top: 220, right: 0, position: 'fixed', pointerEvents: 'none', zIndex: 0 }} />
          <div className="ambient-blob" style={{ width: 320, height: 320, background: 'rgba(245,158,11,0.12)', bottom: 100, left: '38%', position: 'fixed', pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(circle at 15% 0%, var(--bg-veil, rgba(208,230,255,0.35)) 0%, transparent 45%), radial-gradient(circle at 85% 10%, rgba(225,240,255,0.28) 0%, transparent 40%)', pointerEvents: 'none', zIndex: 0 }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="page-layout-2col">

              {/* ── Left column ── */}
              <div className="page-layout-col-principale" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Greeting */}
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    {isFr ? `Bonjour ${prenom} 👋` : `Hello ${prenom} 👋`}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 5 }}>
                    {jourAujourd}, {dateAujourd} · {classes.length} classe{classes.length !== 1 ? 's' : ''} active{classes.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* ── BLOC 1 — Hero card « Prochaine action » ── */}
                <div className="glass-strong" style={{ borderRadius: 'var(--radius-lg)', padding: '24px 28px', boxShadow: 'var(--shadow-hero)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 12 }}>
                    {isFr ? 'Prochaine action' : 'Next action'}
                  </div>

                  {prochainCours ? (
                    /* État enrichi — cours à venir */
                    <div>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
                        {/* Thumbnail matière */}
                        <div style={{
                          width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                          background: classeProchain?.couleur
                            ? `linear-gradient(135deg, ${classeProchain.couleur}cc, ${classeProchain.couleur}55)`
                            : 'linear-gradient(135deg, var(--violet), #8B7CF6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 22,
                        }}>
                          {getMatiereIcon(prochainCours.matiere)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Matière + niveau + badge */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' as const }}>
                            {prochainCours.matiere && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{prochainCours.matiere}</span>
                            )}
                            {classeProchain?.niveau && (
                              <span style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'rgba(108,92,231,0.1)', padding: '1px 7px', borderRadius: 99 }}>{classeProchain.niveau}</span>
                            )}
                            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>
                              {isFr ? 'Prochain cours' : 'Next class'}
                            </span>
                          </div>
                          {/* Titre */}
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                            {prochainCours.nom_classe || (isFr ? 'Cours à venir' : 'Upcoming class')}
                          </div>
                          {/* Métadonnées */}
                          <div style={{ display: 'flex', gap: 12, marginTop: 5, flexWrap: 'wrap' as const }}>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>🕐 {prochainCours.heure_debut}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>📅 {prochainCours.jour}</span>
                            {classeProchain?.nb_eleves && (
                              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>👥 {classeProchain.nb_eleves} {isFr ? 'élèves' : 'students'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => router.push('/dashboard/gerer/enseigner')}
                          style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', boxShadow: '0 4px 12px var(--violet-glow)', fontFamily: 'inherit' }}>
                          {isFr ? '▶ Commencer' : '▶ Start'}
                        </button>
                        <button onClick={() => router.push('/dashboard/gerer/preparer')}
                          style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, color: 'var(--violet)', background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'inherit' }}>
                          {isFr ? '✨ Améliorer avec IA' : '✨ Enhance with AI'}
                        </button>
                      </div>
                    </div>

                  ) : taches.length > 0 ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                        <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{TACHE_ICONS[taches[0].type] || '📌'}</span>
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{taches[0].titre}</div>
                          {taches[0].date_echeance && (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                              {isFr ? 'Échéance' : 'Due'} : {new Date(taches[0].date_echeance).toLocaleDateString(isFr ? 'fr-CA' : 'en-CA')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => router.push('/dashboard/gerer/preparer')}
                          style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', boxShadow: '0 4px 12px var(--violet-glow)', fontFamily: 'inherit' }}>
                          {isFr ? 'Préparer →' : 'Prepare →'}
                        </button>
                        <button onClick={() => router.push('/dashboard/classes')}
                          style={{ padding: '9px 18px', fontSize: 13, color: 'var(--text-secondary)', background: 'rgba(15,35,65,0.05)', border: '1px solid rgba(15,35,65,0.1)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'inherit' }}>
                          {isFr ? 'Mes classes' : 'My classes'}
                        </button>
                      </div>
                    </div>

                  ) : classes.length === 0 ? (
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                        {isFr ? 'Commencez par créer votre première classe' : 'Start by creating your first class'}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                        {isFr ? 'Créez vos classes pour commencer à préparer vos leçons.' : 'Create your classes to start preparing your lessons.'}
                      </div>
                      <button onClick={() => router.push('/dashboard/classes')}
                        style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', boxShadow: '0 4px 12px var(--violet-glow)', fontFamily: 'inherit' }}>
                        {isFr ? '+ Créer une classe' : '+ Create a class'}
                      </button>
                    </div>

                  ) : (
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                        {isFr ? 'Tout est à jour ! 🎉' : 'All up to date! 🎉'}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                        {isFr ? 'Préparez votre prochaine leçon ou créez un quiz.' : 'Prepare your next lesson or create a quiz.'}
                      </div>
                      <button onClick={() => router.push('/dashboard/gerer/preparer')}
                        style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', boxShadow: '0 4px 12px var(--violet-glow)', fontFamily: 'inherit' }}>
                        {isFr ? 'Préparer une leçon →' : 'Prepare a lesson →'}
                      </button>
                    </div>
                  )}
                </div>

                {/* ── KPI grid 4× ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {[
                    { label: isFr ? 'Classes'           : 'Classes',       value: classes.length,         icon: '🏫', href: '/dashboard/classes'       },
                    { label: isFr ? 'Leçons préparées'  : 'Lessons ready', value: totalLecons,            icon: '📖', href: '/dashboard/gerer/preparer' },
                    { label: isFr ? "Cours aujourd'hui" : 'Courses today', value: coursAujourdhui.length, icon: '📅', href: '/dashboard/calendrier'      },
                    { label: isFr ? 'Tâches actives'    : 'Active tasks',  value: taches.length,          icon: '✅', href: null as string | null         },
                  ].map(kpi => (
                    <div key={kpi.label} className="glass-light db-kpi"
                      onClick={kpi.href ? () => router.push(kpi.href as string) : undefined}
                      style={{ borderRadius: 'var(--radius-md)', padding: '16px 18px', boxShadow: 'var(--shadow-card)' }}>
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{kpi.icon}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{kpi.value}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{kpi.label}</div>
                    </div>
                  ))}
                </div>

                {/* ── BLOC 4 — Intelligence pédagogique + area chart + insights ── */}
                <div className="glass-light" style={{ borderRadius: 'var(--radius-lg)', padding: '20px 24px', boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {isFr ? 'Intelligence pédagogique' : 'Teaching intelligence'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {isFr ? 'Leçons préparées — 8 derniers mois' : 'Lessons prepared — last 8 months'}
                      </div>
                    </div>
                    <button onClick={() => router.push('/dashboard/gerer/preparer')}
                      style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', boxShadow: '0 2px 8px var(--violet-glow)', fontFamily: 'inherit' }}>
                      {isFr ? 'Générer →' : 'Generate →'}
                    </button>
                  </div>

                  {classes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: 'var(--text-muted)' }}>
                      {isFr ? 'Créez vos classes pour visualiser votre activité' : 'Create your classes to see your activity'}
                    </div>
                  ) : (
                    <>
                      {/* Area chart */}
                      <div style={{ marginBottom: 16 }}>
                        {leconsHistorique.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '14px 0', fontSize: 12, color: 'var(--text-muted)' }}>
                            {isFr ? 'Préparez vos premières leçons pour voir la progression' : 'Prepare your first lessons to see progress'}
                          </div>
                        ) : (
                          <AreaChart data={moisData} />
                        )}
                      </div>

                      {/* Stats */}
                      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: insights.length > 0 ? 16 : 0 }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--violet)', lineHeight: 1 }}>{totalLecons}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{isFr ? 'leçons total' : 'total lessons'}</div>
                        </div>
                        <div style={{ width: 1, height: 36, background: 'rgba(15,35,65,0.08)', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: '#10B981', lineHeight: 1 }}>{classes.length}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{isFr ? 'classes actives' : 'active classes'}</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8 }}>
                          {classes.slice(0, 3).map((c: any) => (
                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.couleur || 'var(--violet)', flexShrink: 0 }} />
                              <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{c.nom}</div>
                            </div>
                          ))}
                          {classes.length > 3 && <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 12 }}>+{classes.length - 3} autres</div>}
                        </div>
                      </div>

                      {/* Insights IA */}
                      {insights.length > 0 && (
                        <div style={{ borderTop: '1px solid rgba(15,35,65,0.06)', paddingTop: 12 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 8 }}>
                            {isFr ? 'Insights IA' : 'AI Insights'}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {insights.map((insight, i) => (
                              <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                {insight}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

              </div>

              {/* ── Right column ── */}
              <div className="page-layout-col-secondaire" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* ── BLOC 3 — Aujourd'hui (timeline verticale) ── */}
                <div className="glass-light" style={{ borderRadius: 'var(--radius-md)', padding: '18px 20px', boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {isFr ? "Aujourd'hui" : 'Today'}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date().toLocaleDateString(isFr ? 'fr-CA' : 'en-CA', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  {coursAujourdhui.length > 0 ? (
                    <div style={{ position: 'relative', paddingLeft: 18 }}>
                      {/* Ligne de timeline */}
                      <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 2, background: 'linear-gradient(to bottom, var(--violet), rgba(108,92,231,0.08))', borderRadius: 1 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {coursAujourdhui.map((c: any) => {
                          const isPast = c.heure_debut < new Date().toTimeString().substring(0, 5)
                          return (
                            <div key={c.id} style={{ position: 'relative' }}>
                              {/* Dot */}
                              <div style={{ position: 'absolute', left: -14, top: 4, width: 8, height: 8, borderRadius: '50%', background: isPast ? '#94A3B8' : 'var(--violet)', border: '2px solid var(--bg-surface, white)', flexShrink: 0 }} />
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: isPast ? 'var(--text-muted)' : 'var(--violet)', minWidth: 40, flexShrink: 0 }}>{c.heure_debut}</span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: isPast ? 'var(--text-muted)' : 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{c.nom_classe || ''}</span>
                                <button
                                  onClick={() => router.push(isPast ? '/dashboard/classes' : '/dashboard/gerer/enseigner')}
                                  style={{ fontSize: 10, fontWeight: 700, color: isPast ? '#F59E0B' : 'var(--violet)', background: isPast ? 'rgba(245,158,11,0.1)' : 'rgba(108,92,231,0.1)', border: 'none', borderRadius: 99, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                                  {isPast ? (isFr ? 'À corriger' : 'To mark') : (isFr ? 'Enseigner' : 'Teach')}
                                </button>
                              </div>
                              {c.matiere && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, paddingLeft: 46 }}>{c.matiere}</div>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                      <div style={{ fontSize: 26, marginBottom: 6 }}>📅</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {isFr ? "Aucun cours aujourd'hui" : 'No classes today'}
                      </div>
                      <button onClick={() => router.push('/dashboard/classes')}
                        style={{ marginTop: 8, fontSize: 11, color: 'var(--violet)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                        {isFr ? 'Configurer →' : 'Configure →'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Rappels */}
                <div className="glass-light" style={{ borderRadius: 'var(--radius-md)', padding: '18px 20px', boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                    {isFr ? 'Rappels' : 'Reminders'}
                  </div>
                  {taches.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {taches.slice(0, 5).map((t: any) => (
                        <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{TACHE_ICONS[t.type] || '📌'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{t.titre}</div>
                            {t.date_echeance && (
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                                {new Date(t.date_echeance).toLocaleDateString(isFr ? 'fr-CA' : 'en-CA')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {taches.length > 5 && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                          +{taches.length - 5} autre{taches.length - 5 > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 12, color: 'var(--text-muted)' }}>
                      {isFr ? 'Aucun rappel actif' : 'No active reminders'}
                    </div>
                  )}
                </div>

                {/* Classes rapides */}
                {classes.length > 0 && (
                  <div className="glass-light" style={{ borderRadius: 'var(--radius-md)', padding: '18px 20px', boxShadow: 'var(--shadow-card)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {isFr ? 'Mes classes' : 'My classes'}
                      </div>
                      <button onClick={() => router.push('/dashboard/classes')}
                        style={{ fontSize: 11, color: 'var(--violet)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                        {isFr ? 'Voir tout →' : 'See all →'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {classes.slice(0, 5).map((c: any) => (
                        <button key={c.id} onClick={() => router.push(`/dashboard/classes/${c.id}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(15,35,65,0.03)', border: '1px solid transparent', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'inherit' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(108,92,231,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(108,92,231,0.12)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(15,35,65,0.03)'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.couleur || 'var(--violet)', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{c.nom}</div>
                            {c.niveau && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.niveau}</div>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FAB navigation ── */}
      <div style={{ position: 'fixed', bottom: 32, right: 24, zIndex: 50 }}>
        {showFab && (
          <div className="db-fab-menu" style={{ position: 'absolute', bottom: 60, right: 0, background: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-hero)', border: '1px solid rgba(15,35,65,0.08)', overflow: 'hidden', minWidth: 200 }}>
            {[
              { icon: '📖', label: isFr ? 'Nouvelle leçon'    : 'New lesson',    href: '/dashboard/gerer/preparer'                 },
              { icon: '🎮', label: isFr ? 'Créer un quiz'      : 'Create a quiz', href: '/dashboard/gerer/preparer?type=quiz'       },
              { icon: '📊', label: isFr ? 'Évaluation'         : 'Assessment',    href: '/dashboard/gerer/preparer?type=evaluation' },
              { icon: '🏫', label: isFr ? 'Nouvelle classe'    : 'New class',     href: '/dashboard/classes'                        },
              { icon: '🗓️', label: isFr ? 'Agenda intelligent' : 'Smart Agenda',  href: '/dashboard/calendrier'                     },
            ].map(item => (
              <button key={item.href} onClick={() => { router.push(item.href); setShowFab(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', width: '100%', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(108,92,231,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
        )}
        <button onClick={() => setShowFab(!showFab)}
          style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--violet)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-fab)', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', transform: showFab ? 'rotate(45deg)' : 'rotate(0deg)' }}
          title={isFr ? 'Outils rapides' : 'Quick tools'}>
          +
        </button>
      </div>

    </div>
  )
}
