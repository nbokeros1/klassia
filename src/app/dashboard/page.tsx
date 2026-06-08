'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'
import type { ForfaitType } from '@/lib/types/database'

// ─── Constantes ───────────────────────────────────────────────────────────────

const JOURS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon', prete: 'Prête', en_cours: 'En cours',
  enseignee: 'Enseignée', complete: 'Terminée', a_revoir: 'À revoir', archivee: 'Archivée',
}
const STATUT_COLORS: Record<string, string> = {
  brouillon: '#94A3B8', prete: '#60A5FA', en_cours: '#FBC34A',
  enseignee: '#A78BFA', complete: '#34D399', a_revoir: '#F87171', archivee: '#475569',
}

const TACHE_ICONS: Record<string, string> = {
  valider_plan: '✅', corriger: '📝', contacter_parent: '📞',
  imprimer: '🖨', preparer_lecon: '📋', rappel: '🔔', manuelle: '📌',
}
const TACHE_COLORS: Record<string, string> = {
  contacter_parent: '#F87171', valider_plan: '#FBC34A',
  preparer_lecon: '#60A5FA', corriger: '#A78BFA',
  manuelle: '#94A3B8', rappel: '#94A3B8', imprimer: '#94A3B8',
}

const LIENS_PROVINCE: Record<string, { emoji: string; label: string; url: string }[]> = {
  'Québec': [
    { emoji: '📚', label: 'PFEQ — Formation de base',           url: 'http://www.education.gouv.qc.ca/enseignants/pfeq/'          },
    { emoji: '🛠', label: 'RÉCIT — Ressources numériques',       url: 'https://www.recit.qc.ca/'                                   },
    { emoji: '🧮', label: 'Alloprof',                            url: 'https://www.alloprof.qc.ca/'                                },
    { emoji: '📄', label: 'Progressions des apprentissages',     url: 'http://www.education.gouv.qc.ca/enseignants/programme/'     },
  ],
  'Ontario': [
    { emoji: '📚', label: "Curriculum de l'Ontario",             url: 'https://www.dcp.edu.gov.on.ca/fr/'                         },
    { emoji: '📊', label: 'EQAO — Évaluations',                  url: 'https://www.eqao.com/fr/'                                  },
    { emoji: '🎓', label: 'TVO Learn',                           url: 'https://www.tvolearn.com/'                                 },
    { emoji: '🛠', label: 'EduSource Ontario',                    url: 'https://www.curriculum.org/'                               },
  ],
  'Alberta': [
    { emoji: '📚', label: 'Alberta Education',                   url: 'https://www.alberta.ca/curriculum.aspx'                    },
    { emoji: '🛠', label: 'LearnAlberta',                         url: 'https://www.learnalberta.ca/'                              },
    { emoji: '📊', label: 'Provincial Achievement',              url: 'https://www.alberta.ca/provincial-achievement-tests.aspx'  },
  ],
  'Colombie-Britannique': [
    { emoji: '📚', label: 'BC Curriculum',                       url: 'https://curriculum.gov.bc.ca/'                             },
    { emoji: '📊', label: 'FSA Assessment',                      url: 'https://www2.gov.bc.ca/gov/content/education-training/k-12'},
    { emoji: '🛠', label: 'BCcampus Open Ed',                     url: 'https://bccampus.ca/'                                      },
  ],
  'Saskatchewan': [
    { emoji: '📚', label: 'SK Curriculum',                       url: 'https://www.curriculum.gov.sk.ca/'                         },
    { emoji: '🛠', label: 'Saskatchewan Rivers',                  url: 'https://www.srsd119.ca/'                                   },
  ],
  'Manitoba': [
    { emoji: '📚', label: 'Éducation Manitoba',                  url: 'https://www.edu.gov.mb.ca/'                                },
    { emoji: '🛠', label: 'Sciences humaines MB',                 url: 'https://www.edu.gov.mb.ca/m12/progetu/soc_studies.html'    },
  ],
  default: [
    { emoji: '🇨🇦', label: 'Ressources éducatives Canada',       url: 'https://www.canada.ca/fr/services/education.html'          },
    { emoji: '📚', label: 'Éducation Canada (UBC)',               url: 'https://www.educationcanada.ubc.ca/'                       },
    { emoji: '🛠', label: 'Carrefour Éducation',                  url: 'https://carrefour-education.qc.ca/'                        },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d    = new Date(dateStr)
  const now  = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diff < 60)   return `Il y a ${diff} min`
  if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`
  return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })
}

function ColTitle({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
      {label}
    </div>
  )
}

function SectionTitle({ label, action, onAction }: { label: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10, marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {label}
      {action && <button onClick={onAction} style={{ fontSize: 11, color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{action}</button>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router   = useRouter()
  const supabase = createClient()

  // ── State ────────────────────────────────────────────────────────────────
  const [profil,          setProfil]          = useState<any>(null)
  const [classes,         setClasses]         = useState<any[]>([])
  const [allLecons,       setAllLecons]       = useState<any[]>([])
  const [leconsByClass,   setLeconsByClass]   = useState<Record<string, any[]>>({})
  const [favoris,         setFavoris]         = useState<any[]>([])
  const [taches,          setTaches]          = useState<any[]>([])
  const [coursAujourdhui, setCoursAujourdhui] = useState<any[]>([])
  const [notesIA,         setNotesIA]         = useState<any[]>([])
  const [notesLues,       setNotesLues]       = useState<Set<string>>(new Set())
  const [evenements,      setEvenements]      = useState<any[]>([])
  const [notifCount,      setNotifCount]      = useState(0)
  const [loading,         setLoading]         = useState(true)
  const [time,            setTime]            = useState('')

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [showCreate,  setShowCreate]  = useState(false)
  const [showAvatar,  setShowAvatar]  = useState(false)

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }
        const userId = session.user.id

        let { data: p } = await supabase.from('utilisateurs').select('*').eq('user_id', userId).single()
        if (!p) {
          const { data: nouveau } = await supabase.from('utilisateurs').upsert({
            user_id: userId, email: session.user.email,
            prenom: session.user.user_metadata?.prenom || '',
            nom:    session.user.user_metadata?.nom || '',
            ecole:  session.user.user_metadata?.ecole || '',
            type_compte: session.user.user_metadata?.type_compte || 'enseignant',
          }, { onConflict: 'user_id' }).select().single()
          if (!nouveau) return
          p = nouveau
        }
        setProfil(p)

        const { data: cls } = await supabase
          .from('classes').select('*').eq('enseignant_id', p.id)
          .order('created_at', { ascending: false })
        const classesList = cls || []
        setClasses(classesList)

        const todayJour = JOURS_FR[new Date().getDay()]
        const todayStr  = new Date().toISOString().slice(0, 10)

        const [favRes, tachesRes, coursRes, notifRes, notesRes, evtRes] = await Promise.all([
          supabase.from('favoris_enseignant').select('*').eq('enseignant_id', p.id).order('ordre', { ascending: true }).limit(5),
          supabase.from('taches_enseignant').select('*').eq('enseignant_id', p.id).eq('est_complete', false).order('date_echeance', { ascending: true }).limit(10),
          supabase.from('cours_semaine').select('*').eq('enseignant_id', p.id).eq('jour', todayJour).order('heure_debut', { ascending: true }),
          supabase.from('notifications').select('id').eq('enseignant_id', p.id).eq('est_lue', false).limit(99),
          supabase.from('notes_ia').select('*').eq('enseignant_id', p.id).gte('created_at', todayStr).order('created_at', { ascending: false }).limit(3),
          supabase.from('evenements_calendrier').select('*').eq('enseignant_id', p.id).gte('date_debut', todayStr).order('date_debut', { ascending: true }).limit(1),
        ])
        setFavoris(favRes.data        || [])
        setTaches(tachesRes.data      || [])
        setCoursAujourdhui(coursRes.data || [])
        setNotifCount((notifRes.data  || []).length)
        setNotesIA(notesRes.data      || [])
        setEvenements(evtRes.data     || [])

        if (classesList.length > 0) {
          const classIds = classesList.map((c: any) => c.id)
          const { data: lecons } = await supabase
            .from('lecons').select('id,titre,sujet,statut,classe_id,updated_at,type_document')
            .in('classe_id', classIds).order('updated_at', { ascending: false })
          const list = lecons || []
          setAllLecons(list)
          const grouped = list.reduce((acc: Record<string, any[]>, l: any) => {
            if (!acc[l.classe_id]) acc[l.classe_id] = []
            acc[l.classe_id].push(l)
            return acc
          }, {})
          setLeconsByClass(grouped)
        }
        setLoading(false)
      } catch (e) {
        console.error('Dashboard init error:', e)
        setLoading(false)
      }
    }
    init()

    const tick = () => setTime(new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const iv = setInterval(tick, 30000)
    return () => clearInterval(iv)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const completeTache = async (id: string) => {
    setTaches(prev => prev.filter(t => t.id !== id))
    await supabase.from('taches_enseignant').update({ est_complete: true }).eq('id', id)
  }

  // ── Computed ─────────────────────────────────────────────────────────────

  const forfait        = (profil?.forfait || 'gratuit') as ForfaitType
  const isAdmin        = profil?.is_admin === true || profil?.type_compte === 'admin'
  const hasLessonPrete = allLecons.some(l => l.statut === 'prete')

  const today    = new Date().toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })
  const todayStr = new Date().toISOString().slice(0, 10)

  // Prochain cours aujourd'hui
  const prochainCours = useMemo(() => {
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
    return coursAujourdhui.find((c: any) => {
      const [h, m] = (c.heure_debut || '00:00').split(':').map(Number)
      return h * 60 + m > nowMin
    })
  }, [coursAujourdhui])

  const minutesAvant = useMemo(() => {
    if (!prochainCours) return null
    const [h, m] = (prochainCours.heure_debut || '00:00').split(':').map(Number)
    const nowMin  = new Date().getHours() * 60 + new Date().getMinutes()
    return h * 60 + m - nowMin
  }, [prochainCours])

  // ── Recherche ─────────────────────────────────────────────────────────────

  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) return []
    const q = searchQuery.toLowerCase()
    const clsRes = classes
      .filter(c => c.nom.toLowerCase().includes(q) || c.matiere?.toLowerCase().includes(q))
      .slice(0, 3)
      .map((c: any) => ({ type: 'classe', id: c.id, titre: c.nom, sub: c.matiere, href: `/dashboard/classes/${c.id}` }))
    const lecRes = allLecons
      .filter(l => l.titre.toLowerCase().includes(q) || l.sujet?.toLowerCase().includes(q))
      .slice(0, 5)
      .map((l: any) => ({ type: 'lecon', id: l.id, titre: l.titre, sub: STATUT_LABELS[l.statut] || l.statut, href: `/dashboard/classes/${l.classe_id}/lecons/${l.id}` }))
    return [...clsRes, ...lecRes]
  }, [searchQuery, classes, allLecons])

  if (loading) return <LoadingScreen />

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="app-layout">
      <style>{`
        .dash-col-left  { width:220px; flex-shrink:0; overflow-y:auto; padding:16px 10px 24px; border-right:1px solid rgba(255,255,255,0.05); }
        .dash-col-center{ flex:1; overflow-y:auto; padding:20px 24px 32px; min-width:0; }
        .dash-col-right { width:268px; flex-shrink:0; overflow-y:auto; padding:16px 12px 24px; border-left:1px solid rgba(255,255,255,0.05); }
        .dash-body      { display:flex; flex:1; overflow:hidden; }
        .side-item      { display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:8px; cursor:pointer; font-size:12px; color:var(--text-2); transition:background 0.15s; }
        .side-item:hover{ background:rgba(255,255,255,0.05); }
        .classe-card-dash { padding:0; border-radius:12px; border:1.5px solid rgba(255,255,255,0.07); background:rgba(255,255,255,0.02); cursor:pointer; transition:all 0.18s; overflow:hidden; }
        .classe-card-dash:hover { border-color:rgba(255,255,255,0.14); background:rgba(255,255,255,0.04); transform:translateY(-2px); }
        .doc-card       { padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.02); cursor:pointer; transition:background 0.15s; }
        .doc-card:hover { background:rgba(255,255,255,0.05); }
        .search-input   { flex:1; min-width:0; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:8px 14px; font-size:13px; color:var(--text-1); outline:none; transition:border-color 0.15s; width:100%; max-width:360px; }
        .search-input:focus { border-color:rgba(167,139,250,0.5); background:rgba(255,255,255,0.08); }
        .search-input::placeholder { color:var(--text-4); }
        .create-btn     { padding:8px 16px; border-radius:10px; border:1px solid rgba(167,139,250,0.3); background:rgba(167,139,250,0.1); color:#A78BFA; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.15s; white-space:nowrap; }
        .create-btn:hover{ background:rgba(167,139,250,0.18); }
        .dropdown-menu  { position:absolute; top:calc(100% + 6px); right:0; background:var(--bg-surface); border:1px solid rgba(255,255,255,0.1); border-radius:12px; min-width:200px; z-index:200; box-shadow:0 12px 40px rgba(0,0,0,0.5); overflow:hidden; }
        .dropdown-item  { display:flex; align-items:center; gap:10px; padding:10px 14px; font-size:13px; color:var(--text-2); cursor:pointer; transition:background 0.12s; width:100%; border:none; background:none; text-align:left; font-family:inherit; }
        .dropdown-item:hover{ background:rgba(255,255,255,0.06); color:var(--text-1); }
        .lien-utile     { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:8px; text-decoration:none; margin-bottom:5px; transition:background 0.15s; background:rgba(255,255,255,0.02); }
        .lien-utile:hover{ background:rgba(255,255,255,0.06); }
        .tache-row      { display:flex; align-items:center; gap:8px; padding:7px 8px; border-radius:8px; border:1px solid rgba(255,255,255,0.05); background:rgba(255,255,255,0.02); margin-bottom:5px; }
        .tache-check    { width:16px; height:16px; border-radius:50%; border:1.5px solid rgba(255,255,255,0.2); cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
        .tache-check:hover{ border-color:rgba(52,211,153,0.6); background:rgba(52,211,153,0.1); }
        .jour-block     { display:flex; gap:10px; align-items:flex-start; padding:10px; background:rgba(255,255,255,0.03); border-radius:10px; border:1px solid rgba(255,255,255,0.06); margin-bottom:7px; }
        .note-ia-row    { display:flex; gap:8px; align-items:flex-start; padding:9px 10px; background:rgba(167,139,250,0.05); border:1px solid rgba(167,139,250,0.15); border-radius:8px; margin-bottom:6px; }
        @media (max-width:1100px) { .dash-col-right { display:none; } }
        @media (max-width:800px)  { .dash-col-left  { display:none; } }
      `}</style>

      <Sidebar
        profil={profil}
        activeHref="/dashboard"
        onLogout={handleLogout}
        notifCount={notifCount}
      />

      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Topbar ──────────────────────────────────────────────────── */}
        <div className="topbar" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', flexShrink: 0 }}>

          {/* Recherche */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
            <input
              className="search-input"
              placeholder="🔍 Rechercher dans KlassIA+..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 180)}
            />
            {searchOpen && searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                {searchResults.map(r => (
                  <div key={r.id}
                    onMouseDown={() => { router.push(r.href); setSearchQuery(''); setSearchOpen(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: 14 }}>{r.type === 'classe' ? '🏫' : '📄'}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.titre}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{r.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Bouton Créer */}
          <div style={{ position: 'relative' }}>
            <button className="create-btn" onClick={() => { setShowCreate(!showCreate); setShowAvatar(false) }}>
              🪄 Créer ▾
            </button>
            {showCreate && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowCreate(false)} />
                <div className="dropdown-menu">
                  {[
                    { icon: '📄', label: 'Nouvelle leçon',    href: '/dashboard/gerer/preparer'  },
                    { icon: '📅', label: 'Planifier',         href: '/dashboard/calendrier'      },
                    { icon: '✦',  label: "Générer avec l'IA", href: '/dashboard/studio-ia'       },
                    { icon: '🏫', label: 'Nouvelle classe',   href: '/dashboard/classes'         },
                  ].map(opt => (
                    <button key={opt.href} className="dropdown-item"
                      onClick={() => { router.push(opt.href); setShowCreate(false) }}>
                      <span style={{ fontSize: 15 }}>{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Cloche */}
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => router.push('/dashboard/communaute')}>
            <div style={{ fontSize: 18, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: 'rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >🔔</div>
            {notifCount > 0 && (
              <span style={{ position: 'absolute', top: 2, right: 2, fontSize: 8, fontWeight: 800, color: 'white', padding: '1px 4px', background: '#F87171', borderRadius: 99, minWidth: 14, textAlign: 'center', lineHeight: '14px' }}>
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </div>

          {/* Avatar dropdown */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => { setShowAvatar(!showAvatar); setShowCreate(false) }}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6B3FA0,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', flexShrink: 0 }}>
              {profil?.prenom?.[0]?.toUpperCase() || 'E'}
            </div>
            {showAvatar && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowAvatar(false)} />
                <div className="dropdown-menu" style={{ minWidth: 220 }}>
                  <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{profil?.prenom} {profil?.nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{profil?.email}</div>
                  </div>
                  <button className="dropdown-item" onClick={() => { router.push('/dashboard/profil'); setShowAvatar(false) }}>
                    <span>👤</span> Mon profil
                  </button>
                  <button className="dropdown-item" onClick={() => { router.push('/dashboard/forfaits'); setShowAvatar(false) }}>
                    <span>💳</span> Forfaits &amp; Abonnement
                  </button>
                  <button className="dropdown-item" onClick={() => { router.push('/dashboard/profil-ia'); setShowAvatar(false) }}>
                    <span>✦</span> Profil IA
                  </button>
                  {isAdmin && (
                    <>
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                      <button className="dropdown-item" onClick={() => { router.push('/dashboard/ecole'); setShowAvatar(false) }}>
                        <span>🔐</span> Administration
                      </button>
                    </>
                  )}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                  <button className="dropdown-item" onClick={() => { setShowAvatar(false); handleLogout() }}
                    style={{ color: '#F87171' }}>
                    <span>⏻</span> Se déconnecter
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Corps 3 colonnes ─────────────────────────────────────────── */}
        <div className="dash-body fade-in">

          {/* ── Colonne gauche ─────────────────────────────────────────── */}
          <div className="dash-col-left">

            {/* ⭐ Favoris */}
            <ColTitle label="⭐ Favoris" />
            {favoris.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text-4)', padding: '6px 4px', lineHeight: 1.6 }}>
                Épinglez vos leçons,<br />plans et ressources fréquents
              </div>
            ) : (
              favoris.map((f: any) => (
                <div key={f.id} className="side-item" onClick={() => f.url && router.push(f.url)}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{f.icone || '📌'}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.titre?.slice(0, 20)}{(f.titre?.length || 0) > 20 ? '…' : ''}
                  </span>
                </div>
              ))
            )}

            {/* Séparateur */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '14px 0 12px' }} />

            {/* ⚡ À faire */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                ⚡ À faire
              </div>
              {taches.length > 0 && (
                <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', background: 'rgba(251,195,74,0.15)', color: '#FBC34A', borderRadius: 99 }}>
                  {taches.length}
                </span>
              )}
            </div>
            {taches.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text-4)', padding: '4px', lineHeight: 1.5 }}>
                Aucune tâche en attente
              </div>
            ) : (
              taches.slice(0, 5).map((t: any) => (
                <div key={t.id} className="tache-row">
                  <div
                    className="tache-check"
                    onClick={() => completeTache(t.id)}
                    title="Marquer comme complétée"
                  />
                  <span style={{ flex: 1, fontSize: 11, color: TACHE_COLORS[t.type] || 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {TACHE_ICONS[t.type] || '📌'} {t.titre}
                  </span>
                </div>
              ))
            )}
            <button
              onClick={() => router.push('/dashboard/calendrier')}
              style={{ marginTop: 8, width: '100%', padding: '6px 8px', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.12)', background: 'none', color: 'var(--text-4)', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'var(--text-2)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--text-4)' }}
            >
              ➕ Ajouter
            </button>
          </div>

          {/* ── Colonne centre ─────────────────────────────────────────── */}
          <div className="dash-col-center">

            {/* En-tête */}
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
                Bonjour, {profil?.prenom} ! 👋
              </h1>
              <div style={{ fontSize: 13, color: 'var(--text-3)', textTransform: 'capitalize', marginBottom: prochainCours ? 6 : 0 }}>
                {today} · {time}
              </div>
              {prochainCours && (
                <div style={{ fontSize: 12, color: '#60A5FA', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📚</span>
                  <span>
                    Prochain cours : <strong>{prochainCours.nom_classe}</strong>
                    {minutesAvant !== null && ` dans ${minutesAvant < 60 ? `${minutesAvant} min` : `${Math.floor(minutesAvant / 60)}h${minutesAvant % 60 > 0 ? String(minutesAvant % 60).padStart(2,'0') : ''}`}`}
                  </span>
                </div>
              )}
            </div>

            {/* État vide (pas de classes) */}
            {classes.length === 0 && (
              <div style={{ padding: '40px 32px', textAlign: 'center', border: '1.5px dashed rgba(255,255,255,0.1)', borderRadius: 16 }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>🏫</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>Créez votre première classe</div>
                <div style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 20, lineHeight: 1.5 }}>
                  Organisez vos leçons et commencez à enseigner
                </div>
                <button onClick={() => router.push('/dashboard/classes')}
                  style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#6B3FA0,#4F46E5)', border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Créer ma première classe →
                </button>
              </div>
            )}

            {/* Mes classes récentes */}
            {classes.length > 0 && (
              <>
                <SectionTitle
                  label="📚 Mes classes récentes"
                  action="Tout voir →"
                  onAction={() => router.push('/dashboard/classes')}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
                  {classes.slice(0, 4).map(cls => {
                    const lecons = leconsByClass[cls.id] || []
                    const enseignees = lecons.filter((l: any) => ['enseignee', 'complete'].includes(l.statut)).length
                    const pct = lecons.length > 0 ? Math.round((enseignees / lecons.length) * 100) : 0
                    return (
                      <div key={cls.id} className="classe-card-dash"
                        onClick={() => router.push(`/dashboard/classes/${cls.id}`)}>
                        {/* Bande colorée */}
                        <div style={{ height: 5, background: cls.couleur || '#A78BFA' }} />
                        <div style={{ padding: '12px 14px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.nom}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 10 }}>{cls.niveau} · {cls.matiere}</div>
                          <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#34D399' : `linear-gradient(90deg, ${cls.couleur || '#A78BFA'}, #34D399)`, borderRadius: 99, transition: 'width 0.6s' }} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{enseignees}/{lecons.length} leçons</span>
                            <span style={{ fontSize: 10, color: cls.couleur || '#A78BFA', fontWeight: 600 }}>Ouvrir →</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Documents récents */}
            {allLecons.length > 0 && (
              <>
                <SectionTitle
                  label="📄 Documents récents"
                  action="Voir tout →"
                  onAction={() => router.push('/dashboard/classes')}
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 4 }}>
                  {allLecons.slice(0, 6).map((l: any) => {
                    const sc = STATUT_COLORS[l.statut] || '#94A3B8'
                    const icon = l.type_document === 'plan_sequence' ? '🗓' : l.type_document === 'lecon_complete' ? '📖' : '📄'
                    const cls = classes.find((c: any) => c.id === l.classe_id)
                    return (
                      <div key={l.id} className="doc-card"
                        onClick={() => router.push(`/dashboard/classes/${l.classe_id}/lecons/${l.id}`)}>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                          {l.titre}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-4)', marginBottom: 6 }}>{cls?.nom || '—'} · {formatDate(l.updated_at)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ padding: '1px 6px', background: `${sc}22`, color: sc, borderRadius: 99, fontSize: 9, fontWeight: 600 }}>
                            {STATUT_LABELS[l.statut]}
                          </span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <span title="Voir" style={{ fontSize: 12, cursor: 'pointer', color: 'var(--text-4)' }} onClick={e => { e.stopPropagation(); router.push(`/dashboard/classes/${l.classe_id}/lecons/${l.id}`) }}>👁</span>
                            <span title="Modifier" style={{ fontSize: 12, cursor: 'pointer', color: 'var(--text-4)' }} onClick={e => { e.stopPropagation(); router.push(`/dashboard/classes/${l.classe_id}/lecons/${l.id}`) }}>✏️</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Prochain événement */}
            {evenements.length > 0 && (
              <>
                <SectionTitle
                  label="📅 Prochain événement"
                  action="Voir le calendrier →"
                  onAction={() => router.push('/dashboard/calendrier')}
                />
                {evenements.slice(0, 1).map((evt: any) => (
                  <div key={evt.id} style={{ padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${evt.couleur || '#60A5FA'}33`, background: `${evt.couleur || '#60A5FA'}08`, display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => router.push('/dashboard/calendrier')}>
                    <div style={{ width: 4, borderRadius: 2, alignSelf: 'stretch', background: evt.couleur || '#60A5FA', flexShrink: 0, minHeight: 36 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 3 }}>{evt.titre}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
                        {new Date(evt.date_debut).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })}
                        {evt.heure_debut && ` · ${evt.heure_debut}`}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* ── Colonne droite ──────────────────────────────────────────── */}
          <div className="dash-col-right">

            {/* 🕐 Ma journée */}
            <ColTitle label="🕐 Ma journée" />
            {coursAujourdhui.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '8px 0', textAlign: 'center', lineHeight: 1.7 }}>
                Aucun cours aujourd&apos;hui.<br />
                <span style={{ fontSize: 11, cursor: 'pointer', color: 'var(--text-4)', textDecoration: 'underline' }}
                  onClick={() => router.push('/dashboard/calendrier')}>
                  Configurer mon emploi du temps
                </span>
              </div>
            ) : (
              coursAujourdhui.map((cours: any) => {
                const leconDuJour = allLecons.find((l: any) => l.statut === 'prete' && leconsByClass[cours.classe_id ?? '']?.some((ll: any) => ll.id === l.id))
                return (
                  <div key={cours.id} className="jour-block">
                    <div style={{ width: 4, borderRadius: 2, alignSelf: 'stretch', flexShrink: 0, background: cours.couleur || '#60A5FA', minHeight: 36 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-4)', marginBottom: 2 }}>{cours.heure_debut} – {cours.heure_fin}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{cours.nom_classe}</div>
                      {cours.salle && <div style={{ fontSize: 10, color: 'var(--text-4)' }}>Salle {cours.salle}</div>}
                    </div>
                    {leconDuJour && (
                      <button
                        onClick={() => router.push(`/dashboard/classes/${leconDuJour.classe_id}/lecons/${leconDuJour.id}/presenter`)}
                        title="Présenter la leçon"
                        style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 6, color: '#60A5FA', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '4px 8px', flexShrink: 0 }}>
                        ▶
                      </button>
                    )}
                  </div>
                )
              })
            )}

            {/* 🔔 Notes IA */}
            <div style={{ marginTop: 18 }}>
              <ColTitle label="🔔 Notes IA" />
              {notesIA.filter(n => !notesLues.has(n.id)).length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '6px 0', textAlign: 'center' }}>
                  Aucune note aujourd&apos;hui
                </div>
              ) : (
                notesIA.filter(n => !notesLues.has(n.id)).slice(0, 3).map((note: any) => (
                  <div key={note.id} className="note-ia-row">
                    <span style={{ color: '#A78BFA', fontSize: 14, flexShrink: 0, marginTop: 1 }}>✦</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {note.contenu}
                      </div>
                    </div>
                    <button
                      onClick={() => setNotesLues(prev => new Set([...prev, note.id]))}
                      style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 10, cursor: 'pointer', flexShrink: 0, padding: '2px 4px', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#34D399'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-4)'}
                      title="Marquer comme lu"
                    >
                      ✓ Lu
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* 🔗 Liens utiles */}
            <div style={{ marginTop: 18 }}>
              <ColTitle label={`🔗 Liens utiles${profil?.province ? ` · ${profil.province}` : ''}`} />
              {(LIENS_PROVINCE[profil?.province || ''] || LIENS_PROVINCE.default).slice(0, 4).map(lien => (
                <a key={lien.url} href={lien.url} target="_blank" rel="noopener noreferrer" className="lien-utile">
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{lien.emoji}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lien.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-4)', flexShrink: 0 }}>↗</span>
                </a>
              ))}
              <button onClick={() => router.push('/dashboard/calendrier')}
                style={{ marginTop: 6, width: '100%', background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 11, cursor: 'pointer', textAlign: 'center', padding: '4px 0', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-4)'}
              >
                Voir tous →
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
