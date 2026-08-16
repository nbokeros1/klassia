'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import YearProgressCard       from '@/components/mon-annee/YearProgressCard'
import YearMetricsRow         from '@/components/mon-annee/YearMetricsRow'
import CurrentSequenceCard    from '@/components/mon-annee/CurrentSequenceCard'
import AnnualPlanOverview     from '@/components/mon-annee/AnnualPlanOverview'
import CurriculumCoverage     from '@/components/mon-annee/CurriculumCoverage'
import PriorityTasks          from '@/components/mon-annee/PriorityTasks'
import UpcomingAssessments    from '@/components/mon-annee/UpcomingAssessments'
import type { Classe, ProgrammeAnnuel } from '@/lib/types/database'
import type { TeachingPack }            from '@/lib/types/teaching-pack'
import type { SchoolYearDashboardData } from '@/lib/types/school-year-dashboard'

interface Props {
  profil:        { prenom: string; nom: string; langue: string } | null
  allClasses:    Classe[]
  classeId:      string | null
  classe:        Classe | null
  pack:          TeachingPack | null
  programme:     ProgrammeAnnuel | null
  dashboardData: SchoolYearDashboardData
  loadingPack:   boolean
  onClasseChange:   (id: string) => void
  onTaughtUpdated?: () => void
}

// ─── Sélecteur de classe ──────────────────────────────────────────────────────

function ClassSelector({
  allClasses, classeId, classe, onClasseChange,
}: Pick<Props, 'allClasses' | 'classeId' | 'classe' | 'onClasseChange'>) {
  const [open, setOpen] = useState(false)
  const label = classe ? `${classe.matiere} — ${classe.niveau}` : 'Sélectionner une classe'

  if (allClasses.length === 0) return null

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', borderRadius: 10,
          background: 'var(--card-bg)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--card-border)',
          fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)',
          cursor: 'pointer',
        }}
      >
        {label}
        <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0,
            background: 'var(--card-bg)', backdropFilter: 'blur(20px)',
            border: '1px solid var(--card-border)', borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            zIndex: 100, minWidth: 240, padding: '6px',
          }}>
            {allClasses.map(c => (
              <button
                key={c.id}
                onClick={() => { onClasseChange(c.id); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '9px 14px', borderRadius: 8, fontSize: 13,
                  fontWeight: c.id === classeId ? 700 : 400,
                  color: c.id === classeId ? 'var(--violet)' : 'var(--text-primary)',
                  background: c.id === classeId ? 'rgba(108,92,231,0.08)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                {c.matiere} — {c.niveau}
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', fontWeight: 400 }}>
                  {c.nom}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── No-class state ───────────────────────────────────────────────────────────

function EmptyClassState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', textAlign: 'center', padding: '40px 20px',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(108,92,231,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <span style={{ fontSize: 28 }}>📅</span>
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
        Aucune classe disponible
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 360, lineHeight: 1.6 }}>
        Créez d&apos;abord une classe pour accéder à votre cockpit pédagogique annuel.
      </p>
      <a href="/dashboard/classes"
         style={{
           marginTop: 20, display: 'inline-block',
           padding: '10px 24px', borderRadius: 10,
           background: 'var(--violet)', color: '#fff',
           fontWeight: 600, fontSize: 13.5, textDecoration: 'none',
         }}>
        Créer une classe
      </a>
    </div>
  )
}

// ─── Syllabus progress card ───────────────────────────────────────────────────

function SyllabusProgressCard({ score, classeId }: { score: number; classeId: string | null }) {
  const color = score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'
  return (
    <div style={{
      background: 'var(--card-bg)', backdropFilter: 'blur(var(--card-blur))',
      border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)',
      padding: '18px 24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Syllabus</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Complétude du syllabus</span>
        </div>
        <span style={{ fontSize: 18, fontWeight: 800, color }}>{score}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'rgba(139,151,172,0.15)', overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
      {classeId && (
        <a href={`/dashboard/classes/${classeId}/programme?tab=syllabus`}
           style={{ fontSize: 12, fontWeight: 600, color: 'var(--violet)', textDecoration: 'none' }}>
          {score < 80 ? 'Compléter le syllabus →' : 'Voir le syllabus →'}
        </a>
      )}
    </div>
  )
}

// ─── Dashboard principal ──────────────────────────────────────────────────────

export default function SchoolYearDashboard({
  profil, allClasses, classeId, classe, pack, programme,
  dashboardData, loadingPack, onClasseChange, onTaughtUpdated,
}: Props) {
  const { metrics, sequences, raList, priorityTasks, upcomingAssessments, currentSequence, curriculumCoverage, syllabusCompleteness, pacingIndicator, lessonStateMap } = dashboardData

  const annee = pack?.annee_scolaire ?? classe?.annee_scolaire ?? '—'

  if (allClasses.length === 0) return <EmptyClassState />

  return (
    <div style={{
      padding: '28px 32px 48px',
      maxWidth: 1280, margin: '0 auto',
      minHeight: '100%',
    }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        {/* Ligne supérieure */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.2 }}>
              {profil ? `Bonjour, ${profil.prenom}` : 'Mon année'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Votre cockpit pédagogique annuel en un coup d&apos;œil.
            </p>
          </div>

          {/* Actions header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {annee !== '—' && (
              <span style={{
                fontSize: 12.5, fontWeight: 600, padding: '6px 14px',
                background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                borderRadius: 8, color: 'var(--text-secondary)',
              }}>
                {annee}
              </span>
            )}

            {/* Indicateur de rythme (V4) */}
            {pacingIndicator && (
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '6px 14px',
                borderRadius: 8,
                background: `${pacingIndicator.color}18`,
                border: `1px solid ${pacingIndicator.color}40`,
                color: pacingIndicator.color,
              }}
                title={`Δ ${pacingIndicator.delta > 0 ? '+' : ''}${pacingIndicator.delta}% vs calendrier`}
              >
                {pacingIndicator.label}
              </span>
            )}

            {classeId && (
              <a href={`/dashboard/classes/${classeId}/programme`}
                 style={{
                   fontSize: 12.5, fontWeight: 600, padding: '6px 14px',
                   background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)',
                   borderRadius: 8, color: 'var(--violet)', textDecoration: 'none',
                 }}>
                Détail complet
              </a>
            )}
          </div>
        </div>

        {/* Sélecteur de classe + contexte */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Mon année</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>·</span>
            <ClassSelector
              allClasses={allClasses}
              classeId={classeId}
              classe={classe}
              onClasseChange={onClasseChange}
            />
          </div>

          {/* Contexte classe */}
          {classe && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[classe.matiere, classe.niveau, pack?.province ?? ''].filter(Boolean).map(tag => (
                <span key={tag} style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px',
                  background: 'rgba(108,92,231,0.08)', borderRadius: 99,
                  color: 'var(--violet)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Pas de pack ─────────────────────────────────────────────────────── */}
      {!loadingPack && !pack && classeId && (
        <div style={{
          padding: '28px 32px', background: 'var(--card-bg)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)',
          marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Cette classe n&apos;a pas encore d&apos;année scolaire construite.
          </h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 16 }}>
            Lancez la construction pour générer le syllabus, le plan annuel et les séquences.
          </p>
          <a href={`/dashboard/classes/${classeId}/programme`}
             style={{
               display: 'inline-block', padding: '10px 22px', borderRadius: 10,
               background: 'var(--violet)', color: '#fff',
               fontWeight: 600, fontSize: 13.5, textDecoration: 'none',
             }}>
            Construire mon année →
          </a>
        </div>
      )}

      {/* ── Rang 1 : Progression globale + métriques ────────────────────────── */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px' }}>
          <YearProgressCard pack={pack} programme={programme} metrics={metrics} classeId={classeId} />
        </div>
        <div style={{ flex: '2 1 480px' }}>
          <div style={{ marginBottom: 12 }}>
            <YearMetricsRow metrics={metrics} loading={loadingPack} />
          </div>
          {/* Séquence en cours si le viewport est large */}
          <CurrentSequenceCard sequence={currentSequence} classeId={classeId} lessonStateMap={lessonStateMap} />
        </div>
      </div>

      {/* ── Rang 2 : Plan annuel ──────────────────────────────────────────────── */}
      {sequences.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <AnnualPlanOverview
            sequences={sequences}
            classeId={classeId}
            programmeAnnuelId={programme?.id ?? null}
            teachingPackId={pack?.id ?? null}
            lessonStateMap={lessonStateMap}
            onTaughtUpdated={onTaughtUpdated}
          />
        </div>
      )}

      {/* ── Rang 3 : Curriculum + Tâches + Évaluations ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>
        <CurriculumCoverage raList={raList} classeId={classeId} curriculumCoverage={curriculumCoverage} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {syllabusCompleteness !== undefined && (
            <SyllabusProgressCard score={syllabusCompleteness} classeId={classeId} />
          )}
          <PriorityTasks    tasks={priorityTasks}          classeId={classeId} />
          <UpcomingAssessments assessments={upcomingAssessments} classeId={classeId} />
        </div>
      </div>

    </div>
  )
}
