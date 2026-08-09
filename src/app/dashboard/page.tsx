'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import LoadingScreen from '@/components/LoadingScreen'
import MissionDuJour from '@/components/dashboard/MissionDuJour'
import { fetchMissions, buildMissionUrl, updateMissionAction, type MissionPublic, type MissionAction } from '@/lib/mission-engine/client'
import { fetchWorkflowSummary } from '@/lib/workflow-runtime/client'
import type { WorkflowSummary } from '@/lib/workflow-runtime/types'
import type { TimelineEntry } from '@/lib/activity-engine/activity-summary'
import type { Insight } from '@/lib/insight-engine/insight-types'
import type { Recommendation } from '@/lib/recommendation-engine/recommendation-types'

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

// ─── Area chart ───────────────────────────────────────────────────────────────

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
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }} aria-hidden="true">
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

// ─── Activity helpers ─────────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<string, string> = {
  lesson_created: '📝', lesson_updated: '✏️', lesson_deleted: '🗑️',
  evaluation_created: '📊', evaluation_updated: '📊',
  document_uploaded: '📎', document_moved: '📁',
  calendar_event_created: '📅', calendar_event_updated: '📅',
  assignment_corrected: '✅', feedback_added: '💬',
  workflow_started: '▶️', workflow_completed: '🏁',
  mission_completed: '🎯',
  ia_conversation_started: '🤖', ia_document_generated: '✨',
}

const ACTIVITY_LABELS: Record<string, string> = {
  lesson_created: 'Leçon créée', lesson_updated: 'Leçon modifiée', lesson_deleted: 'Leçon supprimée',
  evaluation_created: 'Évaluation créée', evaluation_updated: 'Évaluation modifiée',
  document_uploaded: 'Document ajouté', document_deleted: 'Document supprimé', document_moved: 'Document déplacé',
  calendar_event_created: 'Événement créé', calendar_event_updated: 'Événement modifié',
  assignment_corrected: 'Devoir corrigé', feedback_added: 'Retour ajouté',
  workflow_started: 'Plan démarré', workflow_completed: 'Plan terminé',
  mission_completed: 'Mission complétée',
  ia_conversation_started: 'Conversation IA', ia_document_generated: 'Document généré par IA',
}

function activityIcon(type: string): string { return ACTIVITY_ICONS[type] ?? '📌' }
function activityLabel(type: string): string { return ACTIVITY_LABELS[type] ?? type }

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return "à l'instant"
  if (mins < 60) return `il y a ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `il y a ${hrs}h`
  return `il y a ${Math.floor(hrs / 24)}j`
}

// ─── Statut meta ──────────────────────────────────────────────────────────────

const STATUT_META: Record<string, { label: string; color: string }> = {
  prete:     { label: 'Prête',     color: '#22C55E' },
  en_cours:  { label: 'En cours',  color: '#6C5CE7' },
  enseignee: { label: 'Enseignée', color: '#A78BFA' },
  brouillon: { label: 'Brouillon', color: '#F59E0B' },
  complete:  { label: 'Complète',  color: '#10B981' },
  a_revoir:  { label: 'À revoir',  color: '#EF4444' },
  archivee:  { label: 'Archivée',  color: '#8B97AC' },
}

// ─── Accès rapides ────────────────────────────────────────────────────────────

const QUICK_ACCESS = [
  {
    icon: '📝',
    label: 'Préparer une leçon',
    desc:  'Créez ou poursuivez une préparation pédagogique.',
    href:  '/dashboard/gerer/preparer',
  },
  {
    icon: '📊',
    label: 'Créer une évaluation',
    desc:  'Construisez une évaluation adaptée à votre classe.',
    href:  '/dashboard/gerer/preparer?type=evaluation',
  },
  {
    icon: '🏫',
    label: 'Ouvrir une classe',
    desc:  'Consultez vos classes, matières et élèves.',
    href:  '/dashboard/classes',
  },
  {
    icon: '📚',
    label: 'Consulter la bibliothèque',
    desc:  'Retrouvez vos leçons, évaluations et ressources.',
    href:  '/dashboard/bibliotheque',
  },
] as const

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
  const [leconsRecentes,   setLeconsRecentes]   = useState<{ id: string; titre: string; statut: string; created_at: string; updated_at?: string; classe_id: string }[]>([])
  const [leconsByStatut,   setLeconsByStatut]   = useState<Record<string, number>>({})
  const [missionActive,    setMissionActive]    = useState<MissionPublic | null>(null)
  const [missionsLoading,  setMissionsLoading]  = useState(false)
  const [missionsError,    setMissionsError]    = useState<string | null>(null)
  const [workflowSummary,  setWorkflowSummary]  = useState<WorkflowSummary | null>(null)
  const [recentActivity,   setRecentActivity]   = useState<TimelineEntry[]>([])
  // kept for future use — fetched but not displayed in current layout
  const [, setBehavioralInsights] = useState<Insight[]>([])
  const [, setRecommendations]    = useState<Recommendation[]>([])

  // ── Chargement des données principales ──────────────────────────────────────
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
        const [leconsCountRes, leconsHistRes, leconsRecentesRes, leconsStatutRes] = await Promise.all([
          supabase.from('lecons').select('*', { count: 'exact', head: true }).in('classe_id', classIds),
          supabase.from('lecons').select('created_at').in('classe_id', classIds).order('created_at', { ascending: true }),
          supabase.from('lecons').select('id, titre, statut, created_at, updated_at, classe_id').in('classe_id', classIds).order('updated_at', { ascending: false }).limit(3),
          supabase.from('lecons').select('statut').in('classe_id', classIds).limit(500),
        ])
        setTotalLecons(leconsCountRes.count || 0)
        setLeconsHistorique(leconsHistRes.data || [])
        setLeconsRecentes(leconsRecentesRes.data || [])
        const counts: Record<string, number> = {}
        for (const l of (leconsStatutRes.data || [])) counts[l.statut] = (counts[l.statut] || 0) + 1
        setLeconsByStatut(counts)
      }
      setDataLoaded(true)
    }
    load()
  }, [profil?.id, dataLoaded])

  // ── Missions, activité, insights (non-bloquants) ─────────────────────────────
  useEffect(() => {
    if (!dataLoaded) return
    const load = async () => {
      setMissionsLoading(true)
      setMissionsError(null)
      try {
        const classeIdStored = typeof window !== 'undefined'
          ? (localStorage.getItem('klassia_active_classe') ?? undefined)
          : undefined
        const res = await fetchMissions({ classeId: classeIdStored })
        setMissionActive(res.missions[0] ?? null)
        const planId = res.execution?.primary?.id
        if (planId) {
          fetchWorkflowSummary(planId)
            .then(s => setWorkflowSummary(s.exists ? s : null))
            .catch(() => {})
        }
        fetch('/api/activity/timeline?limit=5', { cache: 'no-store' })
          .then(r => r.ok ? r.json() : null)
          .then((body: { timeline?: TimelineEntry[] } | null) => {
            if (body?.timeline) setRecentActivity(body.timeline)
          })
          .catch(() => {})
        fetch('/api/recommendations?limit=3', { cache: 'no-store' })
          .then(r => r.ok ? r.json() : null)
          .then((body: { recommendations?: Recommendation[] } | null) => {
            if (body?.recommendations) setRecommendations(body.recommendations)
          })
          .catch(() => {})
        fetch('/api/insights?limit=3&confidence=30', { cache: 'no-store' })
          .then(r => r.ok ? r.json() : null)
          .then((body: { insights?: Insight[] } | null) => {
            if (body?.insights) setBehavioralInsights(body.insights)
          })
          .catch(() => {})
      } catch {
        setMissionsError('unavailable')
      } finally {
        setMissionsLoading(false)
      }
    }
    load()
  }, [dataLoaded])

  if (loading) return <LoadingScreen />

  // ── Dérivations ──────────────────────────────────────────────────────────────
  const isFr        = (profil as any)?.langue_interface !== 'en'
  const prenom      = profil?.prenom || (profil as any)?.first_name || (profil as any)?.email?.split('@')[0] || ''
  const initiales   = prenom ? prenom[0].toUpperCase() : (profil?.email?.[0] ?? 'E').toUpperCase()
  const jourAujourd = JOURS_FR[new Date().getDay()]
  const dateAujourd = new Date().toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })
  const heureNow    = new Date().toTimeString().substring(0, 5)

  const forfait      = (profil as any)?.forfait || 'gratuit'
  const creditsUsed  = forfait === 'gratuit' ? ((profil as any)?.generations_ia_total_a_vie ?? 0)
                     : forfait === 'pro'     ? ((profil as any)?.generations_ia_mois_courant ?? 0) : 0
  const creditsTotal = forfait === 'gratuit' ? 5 : forfait === 'pro' ? 75 : 0

  // Données aperçu — aucune stat inventée
  const moisData = Array.from({ length: 8 }, (_, i) => {
    const d     = new Date(new Date().getFullYear(), new Date().getMonth() - (7 - i), 1)
    const label = d.toLocaleDateString('fr-CA', { month: 'short' }).replace('.', '')
    const count = leconsHistorique.filter(l => {
      const ld = new Date(l.created_at)
      return ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth()
    }).length
    return { label, count }
  })
  const thisMois = moisData[moisData.length - 1]?.count ?? 0
  const prevMois = moisData[moisData.length - 2]?.count ?? 0
  const apertcuInsights: string[] = []
  if (thisMois > 0 && prevMois > 0 && thisMois > prevMois) {
    const diff = thisMois - prevMois
    apertcuInsights.push(`✅ Activité en hausse ce mois-ci (+${diff} leçon${diff > 1 ? 's' : ''})`)
  }
  if (thisMois > 0) {
    apertcuInsights.push(`📖 ${thisMois} leçon${thisMois > 1 ? 's' : ''} préparée${thisMois > 1 ? 's' : ''} ce mois-ci`)
  }

  const classeProchain = prochainCours
    ? classes.find((c: any) => c.nom === prochainCours.nom_classe)
    : null

  // Tâches en retard
  const now = new Date()
  const tachesEnRetard = taches.filter(t => t.date_echeance && new Date(t.date_echeance) < now)

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleMissionAction = async (
    mission: MissionPublic,
    action: MissionAction,
  ): Promise<MissionPublic | null> => {
    const result = await updateMissionAction(mission.id, action)
    if (result.ok && result.data) { setMissionActive(result.data); return result.data }
    if (result.status === 409) {
      try {
        const classeIdStored = typeof window !== 'undefined'
          ? (localStorage.getItem('klassia_active_classe') ?? undefined) : undefined
        const res = await fetchMissions({ classeId: classeIdStored })
        const refreshed = res.missions[0] ?? null
        setMissionActive(refreshed)
        return refreshed
      } catch { return null }
    }
    return null
  }

  // ── Style helpers ─────────────────────────────────────────────────────────────
  const btnPrimary: React.CSSProperties = {
    padding: '10px 20px', fontSize: 13, fontWeight: 600,
    background: 'var(--violet)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    boxShadow: '0 4px 12px var(--violet-glow)', fontFamily: 'inherit',
    minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 6,
  }
  const btnSecondary: React.CSSProperties = {
    padding: '10px 18px', fontSize: 13, fontWeight: 600,
    color: 'var(--violet)', background: 'rgba(108,92,231,0.08)',
    border: '1px solid rgba(108,92,231,0.2)', borderRadius: 'var(--radius-sm)',
    cursor: 'pointer', fontFamily: 'inherit',
    minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 6,
  }
  const card: React.CSSProperties = {
    borderRadius: 'var(--radius-md)', padding: '18px 20px',
    boxShadow: 'var(--shadow-card)',
  }
  const secTitle: React.CSSProperties = {
    fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
    color: 'var(--text-primary)', margin: '0 0 12px',
    display: 'flex', alignItems: 'center', gap: 6,
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <style>{`
        .db-quick:hover  { transform: translateY(-1px); box-shadow: var(--shadow-hero) !important; }
        .db-quick:focus-visible { outline: 2px solid var(--violet); outline-offset: 2px; }
        .db-row-btn:hover { background: rgba(108,92,231,0.06) !important; border-color: rgba(108,92,231,0.14) !important; }
        .db-fab-menu { animation: fadeUp .15s ease both; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      <Sidebar profil={profil} activeHref="/dashboard" onLogout={async () => { await logout() }} notifCount={notifCount} />

      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar
          notifCount={notifCount}
          initiales={initiales}
          creditsIa={{ used: creditsUsed, total: creditsTotal }}
          isFr={isFr}
        />

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 80px', position: 'relative' }}>

          {/* Blobs décoratifs */}
          <div className="ambient-blob" style={{ width: 520, height: 520, background: 'rgba(108,92,231,0.22)', top: -80, left: 60, position: 'fixed', pointerEvents: 'none', zIndex: 0 }} />
          <div className="ambient-blob" style={{ width: 380, height: 380, background: 'rgba(139,124,246,0.18)', top: 220, right: 0, position: 'fixed', pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(circle at 15% 0%, var(--bg-veil, rgba(208,230,255,0.35)) 0%, transparent 45%)', pointerEvents: 'none', zIndex: 0 }} />

          <div style={{ position: 'relative', zIndex: 1 }}>

            {/* ═══ 1 — EN-TÊTE ════════════════════════════════════════════════ */}
            <section aria-labelledby="dashboard-greeting" style={{ marginBottom: 24 }}>
              <h1
                id="dashboard-greeting"
                style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}
              >
                Bonjour{prenom ? `, ${prenom}` : ''}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 16px' }}>
                Voici l'essentiel pour votre journée.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button style={btnPrimary} onClick={() => router.push('/dashboard/gerer/preparer')}>
                  ✨ Préparer une leçon
                </button>
                <button style={btnSecondary} onClick={() => router.push('/dashboard/gerer/preparer')}>
                  Ouvrir l'assistant
                </button>
              </div>
            </section>

            <div className="page-layout-2col">

              {/* ═══ COLONNE PRINCIPALE ═════════════════════════════════════════ */}
              <div className="page-layout-col-principale" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* ── 3 : AUJOURD'HUI ─────────────────────────────────────────── */}
                <section aria-labelledby="today-heading">
                  <div className="glass-strong" style={{ ...card, padding: '22px 24px', boxShadow: 'var(--shadow-hero)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h2 id="today-heading" style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        📅 {jourAujourd}, {dateAujourd}
                      </h2>
                      {coursAujourdhui.length > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '2px 10px', borderRadius: 99 }}>
                          {coursAujourdhui.length} cours
                        </span>
                      )}
                    </div>

                    {coursAujourdhui.length > 0 ? (
                      <div style={{ position: 'relative', paddingLeft: 22 }}>
                        {/* Ligne verticale timeline */}
                        <div style={{ position: 'absolute', left: 6, top: 8, bottom: 8, width: 2, background: 'linear-gradient(to bottom, var(--violet), rgba(108,92,231,0.06))', borderRadius: 1 }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                          {coursAujourdhui.map((c: any) => {
                            const isPast  = c.heure_debut < heureNow
                            const isNext  = prochainCours?.id === c.id
                            const classeInfo = classes.find((cl: any) => cl.nom === c.nom_classe)
                            return (
                              <div key={c.id} style={{ position: 'relative' }}>
                                {/* Dot */}
                                <div style={{
                                  position: 'absolute', left: -18, top: 5,
                                  width: isNext ? 11 : 9, height: isNext ? 11 : 9,
                                  borderRadius: '50%',
                                  background: isPast ? '#94A3B8' : isNext ? '#10B981' : 'var(--violet)',
                                  border: '2px solid var(--bg-surface, white)',
                                  boxShadow: isNext ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none',
                                }} />

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: isPast ? 'var(--text-muted)' : 'var(--violet)', minWidth: 44, flexShrink: 0 }}>
                                    {c.heure_debut}
                                  </span>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: isPast ? 'var(--text-muted)' : 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                                    {c.nom_classe || 'Cours'}
                                    {classeInfo?.niveau && (
                                      <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>{classeInfo.niveau}</span>
                                    )}
                                  </span>
                                  {isNext && (
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>
                                      Prochain
                                    </span>
                                  )}
                                  <button
                                    aria-label={isPast ? `Consulter ${c.nom_classe}` : `Enseigner ${c.nom_classe}`}
                                    onClick={() => router.push(isPast ? '/dashboard/classes' : '/dashboard/gerer/enseigner')}
                                    style={{ fontSize: 11, fontWeight: 700, color: isPast ? 'var(--text-muted)' : 'var(--violet)', background: isPast ? 'rgba(139,151,172,0.08)' : 'rgba(108,92,231,0.1)', border: 'none', borderRadius: 99, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, minHeight: 28 }}>
                                    {isPast ? 'Consulter' : 'Enseigner'}
                                  </button>
                                </div>
                                {c.matiere && (
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, paddingLeft: 52 }}>
                                    <span aria-hidden>{getMatiereIcon(c.matiere)}</span> {c.matiere}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                          Aucun cours prévu aujourd'hui.
                        </p>
                        <button style={btnPrimary} onClick={() => router.push('/dashboard/gerer/preparer')}>
                          ✨ Préparer votre prochaine leçon
                        </button>
                      </div>
                    )}

                    {/* Prochain cours (si demain ou autre jour) */}
                    {coursAujourdhui.length === 0 && prochainCours && prochainCours.jour !== jourAujourd && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(15,35,65,0.06)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 10 }}>
                          Prochain cours
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                            background: classeProchain?.couleur
                              ? `linear-gradient(135deg, ${classeProchain.couleur}cc, ${classeProchain.couleur}55)`
                              : 'linear-gradient(135deg, var(--violet), #8B7CF6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                          }}>
                            <span aria-hidden>{getMatiereIcon(prochainCours.matiere)}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{prochainCours.nom_classe}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              {prochainCours.jour} · {prochainCours.heure_debut}
                              {prochainCours.matiere ? ` · ${prochainCours.matiere}` : ''}
                            </div>
                          </div>
                          <button
                            onClick={() => router.push('/dashboard/gerer/preparer')}
                            style={{ ...btnSecondary, padding: '7px 14px', fontSize: 12, minHeight: 36 }}>
                            Préparer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* ── 6 : REPRENDRE LE TRAVAIL ────────────────────────────────── */}
                {leconsRecentes.length > 0 && (
                  <section aria-labelledby="reprendre-heading">
                    <div className="glass-light" style={card}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <h2 id="reprendre-heading" style={secTitle}>
                          Reprendre le travail
                        </h2>
                        <button
                          onClick={() => router.push('/dashboard/bibliotheque')}
                          style={{ fontSize: 11, color: 'var(--violet)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                          Voir tout →
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {leconsRecentes.map((l) => {
                          const sm     = STATUT_META[l.statut] ?? { label: l.statut, color: '#8B97AC' }
                          const classe = classes.find((c: any) => c.id === l.classe_id)
                          const tsStr  = l.updated_at || l.created_at
                          return (
                            <button key={l.id} className="db-row-btn"
                              onClick={() => router.push('/dashboard/bibliotheque')}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(15,35,65,0.02)', border: '1px solid transparent', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'inherit', minHeight: 44, transition: 'background 0.12s, border-color 0.12s' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                                  {l.titre}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                  {classe?.nom && <span>{classe.nom} · </span>}
                                  {formatRelative(tsStr)}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: sm.color }}>{sm.label}</span>
                                <span style={{ fontSize: 12, color: 'var(--violet)', fontWeight: 600 }}>Reprendre →</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </section>
                )}

                {/* ── 7 : APERÇU PÉDAGOGIQUE ──────────────────────────────────── */}
                {(classes.length > 0 || totalLecons > 0) && (
                  <section aria-labelledby="apercu-heading">
                    <div className="glass-light" style={{ ...card, padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <h2 id="apercu-heading" style={secTitle}>
                          Aperçu pédagogique
                        </h2>
                        <button
                          onClick={() => router.push('/dashboard/gerer/preparer')}
                          style={{ padding: '5px 14px', fontSize: 12, fontWeight: 600, background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'inherit' }}>
                          Préparer →
                        </button>
                      </div>

                      {/* Statistiques réelles */}
                      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 16 }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--violet)', lineHeight: 1 }}>{totalLecons}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>leçons total</div>
                        </div>
                        <div style={{ width: 1, height: 32, background: 'rgba(15,35,65,0.08)', alignSelf: 'center', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: '#10B981', lineHeight: 1 }}>{classes.length}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>classes actives</div>
                        </div>
                        {/* Badges statuts — uniquement si données */}
                        {Object.keys(leconsByStatut).length > 0 && (
                          <div style={{ flex: 1, display: 'flex', gap: 5, flexWrap: 'wrap' as const, alignContent: 'center' }}>
                            {([
                              { key: 'prete',    label: 'Prête',    color: '#22C55E', bg: 'rgba(34,197,94,0.1)'  },
                              { key: 'brouillon', label: 'Brouillon', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
                              { key: 'a_revoir', label: 'À revoir', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
                            ] as const).filter(s => (leconsByStatut[s.key] ?? 0) > 0).map(s => (
                              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 99, background: s.bg, fontSize: 10 }}>
                                <span style={{ fontWeight: 700, color: s.color }}>{leconsByStatut[s.key]}</span>
                                <span style={{ color: s.color }}>{s.label}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Graphique — uniquement si activité réelle */}
                      {leconsHistorique.length > 0 ? (
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                            Leçons préparées — 8 derniers mois
                          </div>
                          <AreaChart data={moisData} />
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                          Préparez vos premières leçons pour visualiser votre progression.
                        </div>
                      )}

                      {/* Insights basés sur données réelles */}
                      {apertcuInsights.length > 0 && (
                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {apertcuInsights.map((ins, i) => (
                            <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ins}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )}

              </div>

              {/* ═══ COLONNE SECONDAIRE ═════════════════════════════════════════ */}
              <div className="page-layout-col-secondaire" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* ── 2 : ACTION PRINCIPALE — Mission du jour ─────────────────── */}
                <MissionDuJour
                  mission={missionActive}
                  loading={missionsLoading}
                  error={missionsError}
                  isFr={isFr}
                  onAction={handleMissionAction}
                  onNavigate={mission => router.push(buildMissionUrl(mission, isFr))}
                  workflowSummary={workflowSummary}
                  onWorkflowNavigate={id => router.push(`/dashboard/workflows/${id}`)}
                />

                {/* Carte prochain cours — si pas de mission et cours à venir */}
                {!missionActive && !missionsLoading && prochainCours && (
                  <div className="glass-light" style={card}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--violet)', textTransform: 'uppercase' as const, marginBottom: 10 }}>
                      Prochaine action
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                        background: classeProchain?.couleur
                          ? `linear-gradient(135deg, ${classeProchain.couleur}cc, ${classeProchain.couleur}55)`
                          : 'linear-gradient(135deg, var(--violet), #8B7CF6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                      }}>
                        <span aria-hidden>{getMatiereIcon(prochainCours.matiere)}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                          {prochainCours.nom_classe}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          🕐 {prochainCours.heure_debut}
                          {prochainCours.matiere ? ` · ${prochainCours.matiere}` : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => router.push('/dashboard/gerer/enseigner')} style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}>
                        ▶ Enseigner
                      </button>
                      <button onClick={() => router.push('/dashboard/gerer/preparer')} style={{ ...btnSecondary, padding: '10px 14px' }}>
                        ✨
                      </button>
                    </div>
                  </div>
                )}

                {/* Première classe — état vide enseignant sans classes */}
                {!missionActive && !missionsLoading && !prochainCours && classes.length === 0 && (
                  <div className="glass-light" style={card}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: 6 }}>
                      Commencez par créer une classe
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>
                      Créez vos classes pour commencer à préparer vos leçons avec ScorgIA.
                    </p>
                    <button onClick={() => router.push('/dashboard/classes')} style={btnPrimary}>
                      + Créer une classe
                    </button>
                  </div>
                )}

                {/* ── 4 : À FAIRE ──────────────────────────────────────────────── */}
                <section aria-labelledby="todo-heading">
                  <div className="glass-light" style={card}>
                    <h2 id="todo-heading" style={secTitle}>
                      À faire
                      {taches.length > 0 && (
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: tachesEnRetard.length > 0 ? '#EF4444' : 'var(--violet)',
                          background: tachesEnRetard.length > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(108,92,231,0.1)',
                          padding: '2px 7px', borderRadius: 99,
                        }}>
                          {taches.length}
                        </span>
                      )}
                    </h2>

                    {taches.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {taches.slice(0, 5).map((t: any) => {
                          const isOverdue = t.date_echeance && new Date(t.date_echeance) < now
                          return (
                            <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid rgba(15,35,65,0.04)' }}>
                              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }} aria-hidden>
                                {TACHE_ICONS[t.type] || '📌'}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                                  {t.titre}
                                </div>
                                {t.date_echeance && (
                                  <div style={{ fontSize: 10, marginTop: 2, fontWeight: isOverdue ? 700 : 400, color: isOverdue ? '#EF4444' : 'var(--text-muted)' }}>
                                    {isOverdue ? '⚠ En retard · ' : ''}
                                    {new Date(t.date_echeance).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        {taches.length > 5 && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 8 }}>
                            +{taches.length - 5} autre{taches.length - 5 > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: '8px 0' }}>
                        Tout est à jour. ✓
                      </p>
                    )}
                  </div>
                </section>

                {/* ── 5 : ACCÈS RAPIDES ───────────────────────────────────────── */}
                <section aria-labelledby="quick-heading">
                  <div className="glass-light" style={card}>
                    <h2 id="quick-heading" style={secTitle}>Accès rapides</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {QUICK_ACCESS.map(item => (
                        <button
                          key={item.href}
                          className="db-quick"
                          onClick={() => router.push(item.href)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                            background: 'rgba(108,92,231,0.04)', border: '1px solid rgba(108,92,231,0.08)',
                            cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'inherit',
                            minHeight: 44, transition: 'transform 0.2s, box-shadow 0.2s',
                          }}>
                          <span style={{ fontSize: 18, flexShrink: 0 }} aria-hidden>{item.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                              {item.desc}
                            </div>
                          </div>
                          <span style={{ fontSize: 16, color: 'var(--violet)', flexShrink: 0 }} aria-hidden>›</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                {/* ── ACTIVITÉ RÉCENTE — conditionnel ─────────────────────────── */}
                {recentActivity.length > 0 && (
                  <div className="glass-light" style={card}>
                    <h2 style={secTitle}>Activité récente</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {recentActivity.slice(0, 5).map((entry) => (
                        <div key={entry.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }} aria-hidden>
                            {activityIcon(entry.type)}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                              {activityLabel(entry.type)}
                            </div>
                            {entry.subject && (
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{entry.subject}</div>
                            )}
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                            {formatRelative(entry.occurredAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FAB ─────────────────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 32, right: 24, zIndex: 50 }}>
        {showFab && (
          <div
            className="db-fab-menu"
            style={{ position: 'absolute', bottom: 60, right: 0, background: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-hero)', border: '1px solid rgba(15,35,65,0.08)', overflow: 'hidden', minWidth: 210 }}
            role="menu"
          >
            {[
              { icon: '📝', label: 'Nouvelle leçon',    href: '/dashboard/gerer/preparer'                 },
              { icon: '📊', label: 'Créer une évaluation', href: '/dashboard/gerer/preparer?type=evaluation' },
              { icon: '🎮', label: 'Créer un quiz',      href: '/dashboard/gerer/preparer?type=quiz'       },
              { icon: '🏫', label: 'Nouvelle classe',    href: '/dashboard/classes'                        },
              { icon: '📅', label: 'Calendrier',         href: '/dashboard/calendrier'                     },
            ].map(item => (
              <button
                key={item.href}
                role="menuitem"
                onClick={() => { router.push(item.href); setShowFab(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', width: '100%', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.12s', minHeight: 44 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(108,92,231,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ fontSize: 15 }} aria-hidden>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setShowFab(!showFab)}
          aria-label="Outils rapides"
          aria-expanded={showFab}
          aria-haspopup="menu"
          style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--violet)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-fab)', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', transform: showFab ? 'rotate(45deg)' : 'rotate(0deg)' }}>
          +
        </button>
      </div>

    </div>
  )
}
