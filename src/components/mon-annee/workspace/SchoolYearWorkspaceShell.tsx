'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { deriveData } from '@/lib/spie/derive-dashboard-data'
import { makeLessonKey } from '@/lib/spie/teaching-events'
import { ScorgiaLogo } from '@/components/branding/scorgia-logo'
import LoadingScreen from '@/components/LoadingScreen'
import MarkTaughtModal from '@/components/mon-annee/MarkTaughtModal'
import YearProgressHero from '@/components/mon-annee/YearProgressHero'
import NowSection from '@/components/mon-annee/NowSection'
import AnnualFlightPlan from '@/components/mon-annee/AnnualFlightPlan'
import CurriculumProgressSummary from '@/components/mon-annee/CurriculumProgressSummary'
import QuickActions from '@/components/mon-annee/QuickActions'
import StudentSupportList from '@/components/mon-annee/student-support/StudentSupportList'
import ClassSupportSummary from '@/components/mon-annee/student-support/ClassSupportSummary'
import CurriculumPortfolio from '@/components/mon-annee/workspace/CurriculumPortfolio'
import SyllabusPortfolio from '@/components/mon-annee/workspace/SyllabusPortfolio'
import EvaluationsView from '@/components/mon-annee/workspace/EvaluationsView'
import PlanAnnuelView from '@/components/mon-annee/academic/PlanAnnuelView'
import SequencesView from '@/components/mon-annee/academic/SequencesView'
import PlansLeconView from '@/components/mon-annee/academic/PlansLeconView'
import LeconsWorkspace from '@/components/mon-annee/academic/LeconsWorkspace'
import type {
  Classe, ProgrammeAnnuel, TeachingEvent, Eleve, StudentSupportPlanRow,
  ContenuProgramme, Lecon, LeconProgramme,
} from '@/lib/types/database'
import type { TeachingPack } from '@/lib/types/teaching-pack'
import type { SchoolYearDashboardData, LessonTeachingState } from '@/lib/types/school-year-dashboard'

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkspaceTab =
  | 'apercu'
  | 'curriculum'
  | 'syllabus'
  | 'plan_annuel'
  | 'sequences'
  | 'plans_lecon'
  | 'lecons'
  | 'evaluations'
  | 'eleves_soutien'
  | 'documents'

interface NavItem { id: WorkspaceTab; label: string }
interface NavSection { label: string; items: NavItem[] }

interface ClassSpecificData {
  teachingEvents:  TeachingEvent[]
  lecons:          Lecon[]
  dashboardData:   SchoolYearDashboardData | null
  localOverrides:  Record<string, LessonTeachingState>
}

interface ModalTarget { lecon: LeconProgramme; seqIdx: number; leconIdx: number }

// ─── Navigation definition ────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Pilotage',
    items: [{ id: 'apercu', label: 'Aperçu' }],
  },
  {
    label: 'Programme',
    items: [
      { id: 'curriculum',  label: 'Curriculum' },
      { id: 'syllabus',    label: 'Syllabus' },
      { id: 'plan_annuel', label: 'Plan annuel' },
      { id: 'sequences',   label: 'Unités' },
      { id: 'plans_lecon', label: 'Plans de leçon' },
      { id: 'lecons',      label: 'Leçons' },
    ],
  },
  {
    label: 'Suivi',
    items: [{ id: 'evaluations', label: 'Évaluations' }],
  },
  {
    label: 'Élèves',
    items: [{ id: 'eleves_soutien', label: 'Élèves & soutien' }],
  },
  {
    label: 'Ressources',
    items: [{ id: 'documents', label: 'Documents' }],
  },
]

// Tabs that require a class to be selected
const CLASS_REQUIRED_TABS: Set<WorkspaceTab> = new Set([
  'plan_annuel', 'sequences', 'plans_lecon', 'lecons', 'evaluations', 'documents',
])

// ─── Context dropdowns ────────────────────────────────────────────────────────

function ClassSelector({
  allClasses, selected, matiereFilter, onChange,
}: {
  allClasses:    Classe[]
  selected:      string | null
  matiereFilter: string | null
  onChange:      (id: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const visible = matiereFilter
    ? allClasses.filter(c => c.matiere === matiereFilter)
    : allClasses

  const selectedClasse = selected ? allClasses.find(c => c.id === selected) : null
  const label = selectedClasse
    ? `${selectedClasse.matiere} — ${selectedClasse.nom}`
    : 'Toutes les classes'

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
          background: selected ? 'rgba(108,92,231,0.1)' : 'rgba(139,151,172,0.08)',
          border: selected ? '1px solid rgba(108,92,231,0.3)' : '1px solid rgba(139,151,172,0.2)',
          color: selected ? '#6C5CE7' : 'var(--text-secondary)',
          fontSize: 12.5, fontWeight: 600, maxWidth: 220,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <span style={{ fontSize: 9, flexShrink: 0, transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.15s' }}>▼</span>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} aria-hidden />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            minWidth: 240, maxHeight: 320, overflowY: 'auto', padding: '4px 0',
          }}>
            <button
              onClick={() => { onChange(null); setOpen(false) }}
              style={{
                width: '100%', padding: '9px 16px', textAlign: 'left', background: 'none',
                border: 'none', cursor: 'pointer', fontSize: 12.5,
                color: !selected ? '#6C5CE7' : 'var(--text-secondary)',
                fontWeight: !selected ? 700 : 400,
              }}
            >
              Toutes les classes
            </button>
            <div style={{ height: 1, background: 'var(--card-border)', margin: '2px 0' }} />
            {visible.map(cls => (
              <button
                key={cls.id}
                onClick={() => { onChange(cls.id); setOpen(false) }}
                style={{
                  width: '100%', padding: '9px 16px', textAlign: 'left',
                  background: selected === cls.id ? 'rgba(108,92,231,0.08)' : 'none',
                  border: 'none', cursor: 'pointer', fontSize: 12.5,
                  color: selected === cls.id ? '#6C5CE7' : 'var(--text-primary)',
                  fontWeight: selected === cls.id ? 700 : 400,
                }}
              >
                <div>{cls.matiere}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 400 }}>{cls.nom} · {cls.niveau}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function MatiereSelector({
  allClasses, selected, onChange,
}: {
  allClasses: Classe[]
  selected:   string | null
  onChange:   (m: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const matieres = useMemo(() => [...new Set(allClasses.map(c => c.matiere))].sort(), [allClasses])
  if (matieres.length <= 1) return null

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
          background: selected ? 'rgba(108,92,231,0.1)' : 'rgba(139,151,172,0.08)',
          border: selected ? '1px solid rgba(108,92,231,0.3)' : '1px solid rgba(139,151,172,0.2)',
          color: selected ? '#6C5CE7' : 'var(--text-secondary)',
          fontSize: 12.5, fontWeight: 600,
        }}
      >
        <span>{selected ?? 'Toutes les matières'}</span>
        <span style={{ fontSize: 9, flexShrink: 0, transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.15s' }}>▼</span>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} aria-hidden />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            minWidth: 180, padding: '4px 0',
          }}>
            <button
              onClick={() => { onChange(null); setOpen(false) }}
              style={{
                width: '100%', padding: '9px 16px', textAlign: 'left', background: 'none',
                border: 'none', cursor: 'pointer', fontSize: 12.5,
                color: !selected ? '#6C5CE7' : 'var(--text-secondary)',
                fontWeight: !selected ? 700 : 400,
              }}
            >
              Toutes les matières
            </button>
            <div style={{ height: 1, background: 'var(--card-border)', margin: '2px 0' }} />
            {matieres.map(m => (
              <button
                key={m}
                onClick={() => { onChange(m); setOpen(false) }}
                style={{
                  width: '100%', padding: '9px 16px', textAlign: 'left',
                  background: selected === m ? 'rgba(108,92,231,0.08)' : 'none',
                  border: 'none', cursor: 'pointer', fontSize: 12.5,
                  color: selected === m ? '#6C5CE7' : 'var(--text-primary)',
                  fontWeight: selected === m ? 700 : 400,
                }}
              >{m}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Left navigation ──────────────────────────────────────────────────────────

function WorkspaceNav({
  activeTab, classeId, onTabChange,
}: {
  activeTab:    WorkspaceTab
  classeId:     string | null
  onTabChange:  (t: WorkspaceTab) => void
}) {
  return (
    <nav style={{ display: 'flex', flexDirection: 'column', padding: '16px 0', gap: 4 }}>
      {NAV_SECTIONS.map(section => (
        <div key={section.label} style={{ marginBottom: 4 }}>
          {/* Section label */}
          <div style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.7px', textTransform: 'uppercase',
            color: 'var(--text-muted)', padding: '6px 18px 4px',
          }}>
            {section.label}
          </div>

          {section.items.map(item => {
            const isActive   = activeTab === item.id
            const needsClass = CLASS_REQUIRED_TABS.has(item.id) && !classeId
            return (
              <button
                key={item.id}
                onClick={() => !needsClass && onTabChange(item.id)}
                title={needsClass ? 'Sélectionnez une classe pour accéder à cet onglet' : undefined}
                style={{
                  width: '100%', padding: '8px 18px', textAlign: 'left',
                  background: isActive ? 'rgba(108,92,231,0.1)' : 'none',
                  border: 'none', borderLeft: isActive ? '2px solid #6C5CE7' : '2px solid transparent',
                  cursor: needsClass ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10, borderRadius: '0 6px 6px 0',
                  opacity: needsClass ? 0.4 : 1, transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isActive && !needsClass) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,151,172,0.06)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = isActive ? 'rgba(108,92,231,0.1)' : '' }}
              >
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: isActive ? '#6C5CE7' : 'rgba(139,151,172,0.4)',
                  transition: 'background 0.15s',
                }} />
                <span style={{
                  fontSize: 13, fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#6C5CE7' : 'var(--text-secondary)',
                  transition: 'color 0.15s',
                }}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

// ─── Global Aperçu helpers ────────────────────────────────────────────────────

function computeYearElapsed(annee: string): number {
  const parts = annee.split('-')
  const startYear = parseInt(parts[0] ?? '2025', 10)
  const start = new Date(startYear, 8, 1)
  const end   = new Date(startYear + 1, 5, 30)
  const now   = new Date()
  if (now <= start) return 0
  if (now >= end)   return 1
  return (now.getTime() - start.getTime()) / (end.getTime() - start.getTime())
}

function lessonCountFromProgramme(prog: ProgrammeAnnuel | undefined): number {
  if (!prog) return 0
  const c = prog.contenu_json as ContenuProgramme | undefined
  return c?.unites?.reduce((s, u) => s + (u.lecons?.length ?? 0), 0) ?? 0
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 12, padding: '16px 20px', flex: '1 1 140px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent ?? 'var(--text-primary)', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

// ─── Class-required empty state ───────────────────────────────────────────────

function SelectClassePrompt({ tabLabel, classeCount }: { tabLabel: string; classeCount: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '50vh', flexDirection: 'column', gap: 12, textAlign: 'center', padding: 40,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, background: 'rgba(108,92,231,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, color: '#6C5CE7',
      }}>↖</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
        Sélectionnez une classe
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360, lineHeight: 1.65 }}>
        L&apos;onglet <strong style={{ color: 'var(--text-secondary)' }}>{tabLabel}</strong> affiche des données spécifiques à une classe.
        Utilisez le sélecteur <strong>Classe</strong> en haut pour choisir parmi vos {classeCount} classe{classeCount > 1 ? 's' : ''}.
      </div>
    </div>
  )
}

// ─── SchoolYearWorkspaceShell ─────────────────────────────────────────────────

interface ShellProps {
  initialClasseId?: string
}

export default function SchoolYearWorkspaceShell({ initialClasseId }: ShellProps) {
  const router = useRouter()

  // ── Global data state ────────────────────────────────────────────────────
  const [loadingGlobal, setLoadingGlobal] = useState(true)
  const [profil,        setProfil]        = useState<{ id: string; prenom: string; nom: string; langue: string } | null>(null)
  const [allClasses,    setAllClasses]    = useState<Classe[]>([])
  const [packs,         setPacks]         = useState<Record<string, TeachingPack>>({})
  const [programmes,    setProgrammes]    = useState<Record<string, ProgrammeAnnuel>>({})
  const [eventCounts,   setEventCounts]   = useState<Record<string, number>>({})
  const [eleves,        setEleves]        = useState<Eleve[]>([])
  const [supportPlans,  setSupportPlans]  = useState<StudentSupportPlanRow[]>([])

  // ── Context state ────────────────────────────────────────────────────────
  const [activeTab,      setActiveTab]      = useState<WorkspaceTab>('apercu')
  const [classeId,       setClasseId]       = useState<string | null>(initialClasseId ?? null)
  const [matiereFilter,  setMatiereFilter]  = useState<string | null>(null)
  const [navVisible,     setNavVisible]     = useState(false)

  // ── Class-specific state ─────────────────────────────────────────────────
  const [classData,    setClassData]    = useState<ClassSpecificData | null>(null)
  const [loadingClass, setLoadingClass] = useState(false)
  const [modalTarget,  setModalTarget]  = useState<ModalTarget | null>(null)

  // ── Derived ──────────────────────────────────────────────────────────────
  const filteredClasses = useMemo(() => {
    if (!matiereFilter) return allClasses
    return allClasses.filter(c => c.matiere === matiereFilter)
  }, [allClasses, matiereFilter])

  const selectedClasse   = classeId ? (allClasses.find(c => c.id === classeId) ?? null) : null
  const selectedPack     = classeId ? (packs[classeId] ?? null) : null
  const selectedProg     = classeId ? (programmes[classeId] ?? null) : null
  const contenu: ContenuProgramme | undefined = selectedProg?.contenu_json
  const lessonStateMap   = classData?.dashboardData?.lessonStateMap
  const curriculumCov    = classData?.dashboardData?.curriculumCoverage
  const mergedLSM        = classData
    ? { ...(lessonStateMap ?? {}), ...classData.localOverrides }
    : undefined

  const annee = selectedPack?.annee_scolaire
    ?? selectedClasse?.annee_scolaire
    ?? packs[Object.keys(packs)[0] ?? '']?.annee_scolaire
    ?? allClasses[0]?.annee_scolaire
    ?? '2026-2027'

  // ── Tab label lookup ─────────────────────────────────────────────────────
  const tabLabel = NAV_SECTIONS.flatMap(s => s.items).find(i => i.id === activeTab)?.label ?? ''

  // ── Global data fetch ────────────────────────────────────────────────────
  const loadGlobalData = useCallback(async () => {
    setLoadingGlobal(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profilData } = await supabase
      .from('utilisateurs').select('id, prenom, nom, langue').eq('user_id', user.id).single()
    if (!profilData) { setLoadingGlobal(false); return }
    setProfil(profilData)

    const { data: classesData } = await supabase
      .from('classes').select('*').eq('enseignant_id', profilData.id).order('created_at', { ascending: false })
    const cls = (classesData as Classe[] | null) ?? []
    setAllClasses(cls)

    if (cls.length === 0) { setLoadingGlobal(false); return }

    const classeIds = cls.map(c => c.id)
    const [packsRes, progRes, eventsRes, elevesRes] = await Promise.all([
      supabase.from('teaching_packs').select('*').in('classe_id', classeIds),
      supabase.from('programme_annuel').select('id, classe_id, nb_unites, nb_lecons_total, syllabus_json, contenu_json').in('classe_id', classeIds),
      supabase.from('teaching_events').select('teaching_pack_id, sequence_index, lecon_index, event_type, occurred_at').in('classe_id', classeIds).order('occurred_at', { ascending: true }),
      supabase.from('eleves').select('id, classe_id, enseignant_id, prenom, nom, besoins, notes_enseignant').eq('enseignant_id', profilData.id),
    ])

    // Index packs by classe_id
    const packMap: Record<string, TeachingPack> = {}
    for (const p of (packsRes.data as TeachingPack[] | null) ?? []) {
      packMap[p.classe_id] = p
    }
    setPacks(packMap)

    // Index programmes by classe_id
    const progMap: Record<string, ProgrammeAnnuel> = {}
    for (const p of (progRes.data as ProgrammeAnnuel[] | null) ?? []) {
      progMap[p.classe_id] = p
    }
    setProgrammes(progMap)

    // Compute event counts per pack
    const events = (eventsRes.data ?? []) as { teaching_pack_id: string; sequence_index: number; lecon_index: number; event_type: string; occurred_at: string }[]
    const lastEvent = new Map<string, string>()
    for (const ev of events) {
      const k = `${ev.teaching_pack_id}:${ev.sequence_index}:${ev.lecon_index}`
      lastEvent.set(k, ev.event_type)
    }
    const counts: Record<string, number> = {}
    for (const [k, et] of lastEvent) {
      if (et !== 'lesson_taught') continue
      const packId = k.split(':')[0]
      counts[packId] = (counts[packId] ?? 0) + 1
    }
    setEventCounts(counts)
    setEleves((elevesRes.data as Eleve[] | null) ?? [])

    // Support plans (graceful — table may not exist)
    const { data: plansData } = await supabase
      .from('student_support_plans').select('*').eq('enseignant_id', profilData.id)
    setSupportPlans((plansData as StudentSupportPlanRow[] | null) ?? [])

    setLoadingGlobal(false)
  }, [router])

  // ── Class-specific data fetch ────────────────────────────────────────────
  const loadClassData = useCallback(async (cid: string) => {
    setLoadingClass(true)
    const supabase = createClient()

    // Pack is already in the packs map from global fetch — but we need it after global loaded
    // We'll read from state via closure — safe because this runs after global fetch completes
    const tp = packs[cid] ?? null
    const prog = programmes[cid] ?? null

    const [eventsRes, leconsRes] = await Promise.all([
      tp
        ? supabase.from('teaching_events').select('*').eq('teaching_pack_id', tp.id).order('occurred_at', { ascending: true })
        : Promise.resolve({ data: [] }),
      supabase.from('lecons')
        .select('id, titre, sujet, numero, statut, duree_minutes, contenu_json, created_at, updated_at, classe_id, unite_id, enseignant_id')
        .eq('classe_id', cid),
    ])

    const teachingEvents = (eventsRes.data as TeachingEvent[] | null) ?? []
    const lecons         = (leconsRes.data as Lecon[] | null) ?? []
    const dashboardData  = deriveData(tp, prog, teachingEvents, tp?.annee_scolaire)

    setClassData({ teachingEvents, lecons, dashboardData, localOverrides: {} })
    if (typeof window !== 'undefined') localStorage.setItem('klassia_active_classe', cid)
    setLoadingClass(false)
  }, [packs, programmes])

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => { loadGlobalData() }, [loadGlobalData])

  // Load class data once global data is ready and classeId is set
  useEffect(() => {
    if (loadingGlobal) return
    if (classeId) loadClassData(classeId)
    else setClassData(null)
  }, [classeId, loadingGlobal, loadClassData])

  // ── Context handlers ─────────────────────────────────────────────────────
  function handleClassChange(id: string | null) {
    setClasseId(id || null)
    // Keep active tab, but fall back to apercu if tab needs a class and none selected
    if (!id && CLASS_REQUIRED_TABS.has(activeTab)) setActiveTab('apercu')
  }

  function handleMatiereChange(m: string | null) {
    setMatiereFilter(m)
    // Clear class selection if it doesn't match new matière filter
    if (m && selectedClasse && selectedClasse.matiere !== m) setClasseId(null)
  }

  function handleTabChange(tab: WorkspaceTab) {
    setActiveTab(tab)
  }

  // ── Modal ──────────────────────────────────────────────────────────────
  function handleMarkTaught(lecon: ModalTarget['lecon'], seqIdx: number, leconIdx: number) {
    setModalTarget({ lecon, seqIdx, leconIdx })
  }

  function handleModalDone(newState: LessonTeachingState) {
    if (!modalTarget || !classData) return
    const k = makeLessonKey(modalTarget.seqIdx, modalTarget.leconIdx)
    setClassData(prev => prev
      ? { ...prev, localOverrides: { ...prev.localOverrides, [k]: newState } }
      : prev,
    )
    setModalTarget(null)
    if (classeId) loadClassData(classeId)
  }

  // ── Initial load ─────────────────────────────────────────────────────────
  if (loadingGlobal) return <LoadingScreen />

  // ── Global aperçu data ────────────────────────────────────────────────────
  const totalEleves  = eleves.length || filteredClasses.reduce((s, c) => s + (c.nombre_eleves ?? 0), 0)
  const totalTaught  = filteredClasses.reduce((s, c) => {
    const p = packs[c.id]; return s + (p ? (eventCounts[p.id] ?? 0) : 0)
  }, 0)
  const totalLecons  = filteredClasses.reduce((s, c) => s + lessonCountFromProgramme(programmes[c.id]), 0)
  const currPct      = totalLecons > 0 ? Math.round((totalTaught / totalLecons) * 100) : null
  const activePlans  = supportPlans.filter(p => p.statut === 'actif').length
  const toReview     = supportPlans.filter(p => p.date_revision && new Date(p.date_revision) < new Date()).length

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary, #0F1B2D)', display: 'flex', flexDirection: 'column' }}>

      {/* MarkTaughtModal */}
      {modalTarget && selectedPack?.programme_annuel_id && selectedPack?.id && (
        <MarkTaughtModal
          lecon={modalTarget.lecon}
          seqIdx={modalTarget.seqIdx}
          leconIdx={modalTarget.leconIdx}
          teachingPackId={selectedPack.id}
          programmeAnnuelId={selectedPack.programme_annuel_id}
          currentState={
            classData?.localOverrides[makeLessonKey(modalTarget.seqIdx, modalTarget.leconIdx)]
            ?? lessonStateMap?.[makeLessonKey(modalTarget.seqIdx, modalTarget.leconIdx)]
            ?? null
          }
          onDone={handleModalDone}
          onCancel={() => setModalTarget(null)}
        />
      )}

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'var(--card-bg)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--card-border)',
        display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px',
        height: 56, flexShrink: 0,
      }}>
        {/* Back */}
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
          <ScorgiaLogo variant="icon" width={22} height={22} />
          <span style={{ display: 'none' }}>ScorgIA</span>
        </a>

        <div style={{ width: 1, height: 20, background: 'rgba(139,151,172,0.25)', flexShrink: 0 }} />

        {/* Title */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.7px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            MON ANNÉE {annee}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {profil?.prenom ? `${profil.prenom} ${profil.nom}` : 'Workspace pédagogique'}
          </div>
        </div>

        {/* Mobile nav toggle */}
        <button
          onClick={() => setNavVisible(v => !v)}
          aria-label={navVisible ? 'Fermer la navigation' : 'Ouvrir la navigation'}
          style={{
            display: 'none', background: 'none', border: '1px solid var(--card-border)',
            borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)',
            padding: '5px 8px', flexShrink: 0, fontSize: 12,
            // shown via media query via inline class below — we use a workaround
          }}
          className="mon-annee-nav-toggle"
        >
          ☰
        </button>

        {/* Context selectors */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MatiereSelector
            allClasses={allClasses}
            selected={matiereFilter}
            onChange={handleMatiereChange}
          />
          <ClassSelector
            allClasses={filteredClasses}
            selected={classeId}
            matiereFilter={matiereFilter}
            onChange={handleClassChange}
          />
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left nav — hidden on mobile unless navVisible */}
        <div style={{
          width: 220, flexShrink: 0,
          borderRight: '1px solid var(--card-border)',
          background: 'var(--card-bg)',
          position: 'sticky', top: 56,
          height: 'calc(100vh - 56px)',
          overflowY: 'auto',
          // mobile: overlay drawer behaviour
        }}
          className={`mon-annee-left-nav${navVisible ? ' mon-annee-left-nav--open' : ''}`}
        >
          <WorkspaceNav
            activeTab={activeTab}
            classeId={classeId}
            onTabChange={handleTabChange}
          />

          {/* Classe pill at bottom of nav */}
          {selectedClasse && (
            <div style={{
              margin: '8px 12px 16px',
              padding: '10px 12px', borderRadius: 8,
              background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.18)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>
                Classe active
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedClasse.matiere}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedClasse.nom} · {selectedClasse.niveau}</div>
              <button
                onClick={() => handleClassChange(null)}
                style={{
                  marginTop: 8, fontSize: 10.5, color: 'var(--text-muted)', background: 'none',
                  border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline',
                }}
              >
                Voir toutes les classes
              </button>
            </div>
          )}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 56px' }}>
          {loadingClass && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Chargement de la classe…
            </div>
          )}

          {!loadingClass && (
            <>
              {/* ── APERÇU ──────────────────────────────────────────── */}
              {activeTab === 'apercu' && !classeId && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* Global KPIs */}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <MetricCard label="Classes"           value={filteredClasses.length} />
                    <MetricCard label="Élèves"            value={totalEleves} />
                    <MetricCard
                      label="Leçons enseignées"
                      value={totalLecons > 0 ? `${totalTaught} / ${totalLecons}` : '—'}
                      sub={totalLecons > 0 ? `${Math.round((totalTaught / totalLecons) * 100)} % du total` : undefined}
                      accent="#22C55E"
                    />
                    <MetricCard
                      label="Couverture curriculum"
                      value={currPct !== null ? `${currPct} %` : '—'}
                      accent={currPct !== null ? '#6C5CE7' : undefined}
                    />
                    <MetricCard
                      label="Plans de soutien"
                      value={activePlans > 0 ? activePlans : '—'}
                      sub={activePlans > 0 ? 'actifs' : 'Aucun plan actif'}
                    />
                    <MetricCard
                      label="À réviser"
                      value={toReview > 0 ? toReview : '—'}
                      accent={toReview > 0 ? '#F59E0B' : undefined}
                      sub={toReview > 0 ? 'révision dépassée' : 'Aucune'}
                    />
                  </div>

                  {/* Classes table */}
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--card-border)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Vue d&apos;ensemble des classes
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'rgba(139,151,172,0.04)' }}>
                            {['Classe', 'Élèves', 'Leçons', 'Progression', 'Rythme', ''].map((h, i) => (
                              <th key={i} style={{
                                padding: '10px 14px', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)',
                                textTransform: 'uppercase', letterSpacing: '0.4px',
                                borderBottom: '1px solid var(--card-border)',
                                textAlign: i >= 1 && i <= 3 ? 'right' : 'left',
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredClasses.map((cls, idx) => {
                            const p   = packs[cls.id]
                            const pr  = programmes[cls.id]
                            const cnt = p ? (eventCounts[p.id] ?? 0) : 0
                            const tot = lessonCountFromProgramme(pr)
                            const pct = tot > 0 ? Math.round((cnt / tot) * 100) : null
                            const ye  = computeYearElapsed(annee)
                            const delta = pct !== null ? pct - ye * 100 : null
                            const rythme = delta === null ? null : delta >= -10 ? { label: 'Dans le rythme', color: '#22C55E' } : delta >= -25 ? { label: 'À surveiller', color: '#F59E0B' } : { label: 'En retard', color: '#EF4444' }
                            const nb = (eleves.filter(e => e.classe_id === cls.id).length) || cls.nombre_eleves || 0
                            return (
                              <tr
                                key={cls.id}
                                onClick={() => handleClassChange(cls.id)}
                                style={{
                                  cursor: 'pointer',
                                  borderBottom: idx < filteredClasses.length - 1 ? '1px solid var(--card-border)' : '',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(108,92,231,0.04)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
                              >
                                <td style={{ padding: '14px' }}>
                                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{cls.matiere}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cls.nom} · {cls.niveau}</div>
                                </td>
                                <td style={{ padding: '14px', textAlign: 'right', fontSize: 13.5, fontWeight: 600 }}>{nb > 0 ? nb : '—'}</td>
                                <td style={{ padding: '14px', textAlign: 'right', fontSize: 13 }}>
                                  {p && tot > 0
                                    ? <span><span style={{ fontWeight: 700, color: '#22C55E' }}>{cnt}</span><span style={{ color: 'var(--text-muted)' }}> / {tot}</span></span>
                                    : '—'}
                                </td>
                                <td style={{ padding: '14px', textAlign: 'right', minWidth: 100 }}>
                                  {pct !== null ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                                      <div style={{ width: 50, height: 4, background: 'rgba(139,151,172,0.15)', borderRadius: 99 }}>
                                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: '#6C5CE7' }} />
                                      </div>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6C5CE7' }}>{pct}%</span>
                                    </div>
                                  ) : <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                                </td>
                                <td style={{ padding: '14px' }}>
                                  {rythme ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: rythme.color }} />
                                      <span style={{ fontSize: 12, fontWeight: 600, color: rythme.color }}>{rythme.label}</span>
                                    </div>
                                  ) : '—'}
                                </td>
                                <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6C5CE7' }}>Ouvrir →</span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── APERÇU CLASSE ───────────────────────────────────── */}
              {activeTab === 'apercu' && classeId && (
                !selectedPack ? (
                  <div style={{ textAlign: 'center', padding: '60px 40px' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Année scolaire non construite</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto 20px', lineHeight: 1.65 }}>
                      Cette classe n&apos;a pas encore de Teaching Pack.
                    </div>
                    <a href={`/dashboard/classes/${classeId}/programme`} style={{
                      display: 'inline-flex', padding: '10px 24px', borderRadius: 10,
                      background: '#6C5CE7', color: '#fff', fontWeight: 600, fontSize: 13.5, textDecoration: 'none',
                    }}>Construire mon année →</a>
                  </div>
                ) : classData?.dashboardData ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <YearProgressHero
                      metrics={classData.dashboardData.metrics}
                      schoolYearElapsedPct={classData.dashboardData.schoolYearElapsedPct ?? 0}
                      pacingIndicator={classData.dashboardData.pacingIndicator}
                      anneeScolaire={selectedPack?.annee_scolaire ?? selectedClasse?.annee_scolaire}
                    />
                    {classData.dashboardData.priorityTasks.length > 0 && (
                      <QuickActions tasks={classData.dashboardData.priorityTasks} classeId={classeId} />
                    )}
                    <NowSection
                      currentSequence={classData.dashboardData.currentSequence}
                      sequences={classData.dashboardData.sequences}
                      classeId={classeId}
                      programmeAnnuelId={selectedPack?.programme_annuel_id ?? null}
                      teachingPackId={selectedPack?.id ?? null}
                      lessonStateMap={mergedLSM}
                      onMarkTaught={handleMarkTaught}
                    />
                    <AnnualFlightPlan
                      sequences={classData.dashboardData.sequences}
                      anneeScolaire={selectedPack?.annee_scolaire ?? selectedClasse?.annee_scolaire}
                      classeId={classeId}
                      programmeAnnuelId={selectedPack?.programme_annuel_id ?? null}
                      teachingPackId={selectedPack?.id ?? null}
                      lessonStateMap={mergedLSM}
                      onMarkTaught={handleMarkTaught}
                    />
                    <CurriculumProgressSummary
                      coverage={classData.dashboardData.curriculumCoverage}
                      classeId={classeId}
                    />
                  </div>
                ) : null
              )}

              {/* ── CURRICULUM ──────────────────────────────────────── */}
              {activeTab === 'curriculum' && (
                <CurriculumPortfolio
                  classes={filteredClasses}
                  programmes={programmes}
                  packs={packs}
                  classeId={classeId}
                  lessonStateMap={mergedLSM}
                  curriculumCoverage={curriculumCov}
                  onSelectClasse={handleClassChange}
                />
              )}

              {/* ── SYLLABUS ────────────────────────────────────────── */}
              {activeTab === 'syllabus' && (
                <SyllabusPortfolio
                  classes={filteredClasses}
                  programmes={programmes}
                  packs={packs}
                  classeId={classeId}
                  onSelectClasse={handleClassChange}
                />
              )}

              {/* ── PLAN ANNUEL ─────────────────────────────────────── */}
              {activeTab === 'plan_annuel' && !classeId && (
                <SelectClassePrompt tabLabel={tabLabel} classeCount={filteredClasses.length} />
              )}
              {activeTab === 'plan_annuel' && classeId && (
                <PlanAnnuelView contenu={contenu} lessonStateMap={mergedLSM} classeId={classeId} />
              )}

              {/* ── UNITÉS ─────────────────────────────────────────── */}
              {activeTab === 'sequences' && !classeId && (
                <SelectClassePrompt tabLabel={tabLabel} classeCount={filteredClasses.length} />
              )}
              {activeTab === 'sequences' && classeId && (
                <SequencesView contenu={contenu} lessonStateMap={mergedLSM} classeId={classeId} />
              )}

              {/* ── PLANS DE LEÇON ──────────────────────────────────── */}
              {activeTab === 'plans_lecon' && !classeId && (
                <SelectClassePrompt tabLabel={tabLabel} classeCount={filteredClasses.length} />
              )}
              {activeTab === 'plans_lecon' && classeId && (
                <PlansLeconView
                  contenu={contenu}
                  lecons={classData?.lecons ?? []}
                  lessonStateMap={mergedLSM}
                  classeId={classeId}
                />
              )}

              {/* ── LEÇONS ──────────────────────────────────────────── */}
              {activeTab === 'lecons' && !classeId && (
                <SelectClassePrompt tabLabel={tabLabel} classeCount={filteredClasses.length} />
              )}
              {activeTab === 'lecons' && classeId && (
                <LeconsWorkspace
                  contenu={contenu}
                  lecons={classData?.lecons ?? []}
                  lessonStateMap={mergedLSM}
                  classeId={classeId}
                />
              )}

              {/* ── ÉVALUATIONS ─────────────────────────────────────── */}
              {activeTab === 'evaluations' && !classeId && (
                <SelectClassePrompt tabLabel={tabLabel} classeCount={filteredClasses.length} />
              )}
              {activeTab === 'evaluations' && classeId && (
                <EvaluationsView
                  contenu={contenu}
                  lessonStateMap={mergedLSM}
                  classeId={classeId}
                />
              )}

              {/* ── ÉLÈVES & SOUTIEN ────────────────────────────────── */}
              {activeTab === 'eleves_soutien' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {classeId && (
                    <ClassSupportSummary
                      eleves={eleves.filter(e => e.classe_id === classeId)}
                      supportPlans={supportPlans.filter(p => p.classe_id === classeId)}
                      classeId={classeId}
                    />
                  )}
                  <StudentSupportList
                    eleves={classeId ? eleves.filter(e => e.classe_id === classeId) : eleves}
                    supportPlans={supportPlans}
                    classes={allClasses}
                    classeId={classeId ?? undefined}
                    showClasseColumn={!classeId}
                  />
                </div>
              )}

              {/* ── DOCUMENTS ───────────────────────────────────────── */}
              {activeTab === 'documents' && !classeId && (
                <SelectClassePrompt tabLabel={tabLabel} classeCount={filteredClasses.length} />
              )}
              {activeTab === 'documents' && classeId && (
                <div style={{
                  background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                  borderRadius: 12, padding: '48px 32px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Documents de la classe
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.65, maxWidth: 440, margin: '0 auto 24px' }}>
                    L&apos;accès contextuel aux documents de classe sera disponible prochainement. Pour l&apos;instant, accédez aux ressources depuis la fiche de la classe.
                  </div>
                  <a
                    href={`/dashboard/classes/${classeId}/ressources`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '10px 20px', borderRadius: 8, textDecoration: 'none',
                      background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.2)',
                      color: '#6C5CE7', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Voir les ressources de la classe →
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
