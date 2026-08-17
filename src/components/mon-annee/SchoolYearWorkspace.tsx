'use client'

import { useState } from 'react'
import type { Classe, ProgrammeAnnuel, LeconProgramme, TeachingEvent } from '@/lib/types/database'
import type { TeachingPack } from '@/lib/types/teaching-pack'
import type { SchoolYearDashboardData, LessonTeachingState } from '@/lib/types/school-year-dashboard'
import { makeLessonKey } from '@/lib/spie/teaching-events'
import MarkTaughtModal from '@/components/mon-annee/MarkTaughtModal'
import YearProgressHero from '@/components/mon-annee/YearProgressHero'
import NowSection from '@/components/mon-annee/NowSection'
import AnnualFlightPlan from '@/components/mon-annee/AnnualFlightPlan'
import CurriculumProgressSummary from '@/components/mon-annee/CurriculumProgressSummary'
import QuickActions from '@/components/mon-annee/QuickActions'
import ClassSupportSummary from '@/components/mon-annee/student-support/ClassSupportSummary'
import StudentSupportList from '@/components/mon-annee/student-support/StudentSupportList'
import type { Eleve, StudentSupportPlanRow } from '@/lib/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'apercu' | 'eleves_soutien' | 'curriculum' | 'syllabus' | 'plan_annuel' | 'sequences' | 'plans_lecon' | 'evaluations' | 'ressources'

interface Props {
  profil:         { id: string; prenom: string; nom: string; langue: string } | null
  allClasses:     Classe[]
  classeId:       string
  classe:         Classe | null
  pack:           TeachingPack | null
  programme:      ProgrammeAnnuel | null
  teachingEvents: TeachingEvent[]
  dashboardData:  SchoolYearDashboardData | null
  loadingPack:    boolean
  onRefresh:      () => void
  eleves?:        Eleve[]
  supportPlans?:  StudentSupportPlanRow[]
}

type ModalTarget = { lecon: LeconProgramme; seqIdx: number; leconIdx: number }

// ─── Mini-nav tabs ────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; migrated: boolean }[] = [
  { id: 'apercu',          label: 'Aperçu',          migrated: true },
  { id: 'eleves_soutien',  label: 'Élèves & Soutien', migrated: true },
  { id: 'curriculum',      label: 'Curriculum',       migrated: false },
  { id: 'syllabus',        label: 'Syllabus',         migrated: false },
  { id: 'plan_annuel',     label: 'Plan Annuel',      migrated: false },
  { id: 'sequences',       label: 'Séquences',        migrated: false },
  { id: 'plans_lecon',     label: 'Plans de Leçon',   migrated: false },
  { id: 'evaluations',     label: 'Évaluations',      migrated: false },
  { id: 'ressources',      label: 'Ressources',       migrated: false },
]

function tabHref(tab: Tab, classeId: string): string {
  const map: Partial<Record<Tab, string>> = {
    curriculum:  `/dashboard/classes/${classeId}/programme?tab=syllabus`,
    syllabus:    `/dashboard/classes/${classeId}/programme?tab=syllabus`,
    plan_annuel: `/dashboard/classes/${classeId}/programme?tab=plan_annuel`,
    sequences:   `/dashboard/classes/${classeId}/programme?tab=sequences`,
    plans_lecon: `/dashboard/classes/${classeId}/lecons`,
    evaluations: `/dashboard/classes/${classeId}/programme?tab=evaluations`,
    ressources:  `/dashboard/classes/${classeId}/ressources`,
  }
  return map[tab] ?? `/dashboard/classes/${classeId}`
}

// ─── ClassSelector dropdown ───────────────────────────────────────────────────

function ClassSelector({ current, all }: { current: Classe | null; all: Classe[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(139,151,172,0.08)', border: '1px solid rgba(139,151,172,0.2)',
          color: 'var(--text-primary)', fontSize: 13.5, fontWeight: 600,
        }}
      >
        <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current ? `${current.matiere} — ${current.nom}` : 'Sélectionner une classe'}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>▼</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            minWidth: 240, maxHeight: 320, overflowY: 'auto',
            padding: '6px 0',
          }}>
            {all.map(cls => (
              <a
                key={cls.id}
                href={`/dashboard/mon-annee/${cls.id}`}
                style={{
                  display: 'block', padding: '10px 16px',
                  textDecoration: 'none',
                  background: cls.id === current?.id ? 'rgba(108,92,231,0.08)' : '',
                  color: cls.id === current?.id ? '#6C5CE7' : 'var(--text-primary)',
                  fontSize: 13,
                }}
                onMouseEnter={e => { if (cls.id !== current?.id) (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(139,151,172,0.06)' }}
                onMouseLeave={e => { if (cls.id !== current?.id) (e.currentTarget as HTMLAnchorElement).style.background = '' }}
              >
                <div style={{ fontWeight: 600 }}>{cls.matiere}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cls.nom} · {cls.niveau}</div>
              </a>
            ))}
            <div style={{ borderTop: '1px solid var(--card-border)', margin: '4px 0' }} />
            <a href="/dashboard/classes"
               style={{ display: 'block', padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>
              Gérer mes classes →
            </a>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Cockpit Aperçu ───────────────────────────────────────────────────────────

function AperçuCockpit({
  data, pack, classe, classeId, onMarkTaught,
}: {
  data:         SchoolYearDashboardData
  pack:         TeachingPack | null
  classe:       Classe | null
  classeId:     string
  onMarkTaught: (lecon: LeconProgramme, seqIdx: number, leconIdx: number) => void
}) {
  const anneeScolaire = pack?.annee_scolaire ?? classe?.annee_scolaire

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Hero */}
      <YearProgressHero
        metrics={data.metrics}
        schoolYearElapsedPct={data.schoolYearElapsedPct ?? 0}
        pacingIndicator={data.pacingIndicator}
        anneeScolaire={anneeScolaire}
      />

      {/* Actions prioritaires */}
      {data.priorityTasks.length > 0 && (
        <QuickActions tasks={data.priorityTasks} classeId={classeId} />
      )}

      {/* Maintenant */}
      <NowSection
        currentSequence={data.currentSequence}
        sequences={data.sequences}
        classeId={classeId}
        programmeAnnuelId={pack?.programme_annuel_id ?? null}
        teachingPackId={pack?.id ?? null}
        lessonStateMap={data.lessonStateMap}
        onMarkTaught={onMarkTaught}
      />

      {/* Plan de vol */}
      <AnnualFlightPlan
        sequences={data.sequences}
        anneeScolaire={anneeScolaire}
        classeId={classeId}
        programmeAnnuelId={pack?.programme_annuel_id ?? null}
        teachingPackId={pack?.id ?? null}
        lessonStateMap={data.lessonStateMap}
        onMarkTaught={onMarkTaught}
      />

      {/* Couverture curriculum */}
      <CurriculumProgressSummary
        coverage={data.curriculumCoverage}
        classeId={classeId}
      />
    </div>
  )
}

// ─── No-pack state ────────────────────────────────────────────────────────────

function NoPack({ classeId }: { classeId: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '50vh', textAlign: 'center', padding: 40,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', background: 'rgba(108,92,231,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, marginBottom: 16,
      }}>📅</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
        Année scolaire non construite
      </h2>
      <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 380, lineHeight: 1.6, marginBottom: 20 }}>
        Cette classe n&apos;a pas encore de Teaching Pack. Construisez votre année pédagogique pour accéder au cockpit.
      </p>
      <a href={`/dashboard/classes/${classeId}/programme`}
         style={{ padding: '10px 24px', borderRadius: 10, background: 'var(--violet)', color: '#fff', fontWeight: 600, fontSize: 13.5, textDecoration: 'none' }}>
        Construire mon année →
      </a>
    </div>
  )
}

// ─── SchoolYearWorkspace ──────────────────────────────────────────────────────

export default function SchoolYearWorkspace({
  profil, allClasses, classeId, classe, pack, programme,
  dashboardData, loadingPack, onRefresh,
  eleves = [], supportPlans = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('apercu')

  // Mark-taught modal state
  const [modalTarget, setModalTarget] = useState<ModalTarget | null>(null)
  const [localOverrides, setLocalOverrides] = useState<Record<string, LessonTeachingState>>({})

  function handleMarkTaught(lecon: LeconProgramme, seqIdx: number, leconIdx: number) {
    setModalTarget({ lecon, seqIdx, leconIdx })
  }

  function handleModalDone(newState: LessonTeachingState) {
    if (!modalTarget) return
    const k = makeLessonKey(modalTarget.seqIdx, modalTarget.leconIdx)
    setLocalOverrides(prev => ({ ...prev, [k]: newState }))
    setModalTarget(null)
    onRefresh()
  }

  // Merge local optimistic overrides into dashboardData.lessonStateMap
  const mergedData: SchoolYearDashboardData | null = dashboardData
    ? { ...dashboardData, lessonStateMap: { ...dashboardData.lessonStateMap, ...localOverrides } }
    : null

  const anneeScolaire = pack?.annee_scolaire ?? classe?.annee_scolaire ?? ''

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary, #0F1B2D)' }}>

      {/* ── Mark-taught modal ────────────────────────────────────────────────── */}
      {modalTarget && pack?.programme_annuel_id && pack?.id && (
        <MarkTaughtModal
          lecon={modalTarget.lecon}
          seqIdx={modalTarget.seqIdx}
          leconIdx={modalTarget.leconIdx}
          teachingPackId={pack.id}
          programmeAnnuelId={pack.programme_annuel_id}
          currentState={
            localOverrides[makeLessonKey(modalTarget.seqIdx, modalTarget.leconIdx)]
            ?? dashboardData?.lessonStateMap?.[makeLessonKey(modalTarget.seqIdx, modalTarget.leconIdx)]
            ?? null
          }
          onDone={handleModalDone}
          onCancel={() => setModalTarget(null)}
        />
      )}

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'var(--card-bg)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--card-border)',
      }}>
        <div style={{
          padding: '14px 28px',
          display: 'flex', alignItems: 'center', gap: 16,
          maxWidth: 1320, margin: '0 auto',
        }}>
          {/* Back */}
          <a href="/dashboard/mon-annee"
             style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none', flexShrink: 0 }}>
            ← ScorgIA
          </a>
          <div style={{ width: 1, height: 18, background: 'rgba(139,151,172,0.3)', flexShrink: 0 }} />

          {/* Title */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.6px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              MON ANNÉE {anneeScolaire}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {profil?.prenom ? `${profil.prenom} · ` : ''}{classe?.matiere ?? 'Cockpit'}
            </div>
          </div>

          {/* Class selector */}
          <div style={{ marginLeft: 'auto' }}>
            <ClassSelector current={classe} all={allClasses} />
          </div>
        </div>

        {/* ── Mini-nav ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 0, padding: '0 28px', maxWidth: 1320, margin: '0 auto',
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            if (!tab.migrated) {
              // Non-migrated: render as link to existing page
              return (
                <a
                  key={tab.id}
                  href={tabHref(tab.id, classeId)}
                  style={{
                    padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    color: 'var(--text-muted)', whiteSpace: 'nowrap', textDecoration: 'none',
                    borderBottom: '2px solid transparent',
                    transition: 'color 0.15s',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)' }}
                >
                  {tab.label}
                  <span style={{ fontSize: 9, color: 'rgba(139,151,172,0.5)', fontWeight: 400 }}>↗</span>
                </a>
              )
            }
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  color: isActive ? '#6C5CE7' : 'var(--text-muted)',
                  background: 'none', border: 'none', whiteSpace: 'nowrap',
                  borderBottom: isActive ? '2px solid #6C5CE7' : '2px solid transparent',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Contenu ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: '32px 28px 56px', maxWidth: 1320, margin: '0 auto' }}>
        {loadingPack && !mergedData && activeTab === 'apercu' ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Chargement…
          </div>
        ) : activeTab === 'apercu' ? (
          !pack ? (
            <NoPack classeId={classeId} />
          ) : mergedData ? (
            <AperçuCockpit
              data={mergedData}
              pack={pack}
              classe={classe}
              classeId={classeId}
              onMarkTaught={handleMarkTaught}
            />
          ) : (
            <NoPack classeId={classeId} />
          )
        ) : activeTab === 'eleves_soutien' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <ClassSupportSummary
              eleves={eleves}
              supportPlans={supportPlans}
              classeId={classeId}
            />
            <StudentSupportList
              eleves={eleves}
              supportPlans={supportPlans}
              classes={allClasses}
              classeId={classeId}
            />
          </div>
        ) : null /* non-migrated tabs handled via link — tab content never shown */}
      </div>
    </div>
  )
}
