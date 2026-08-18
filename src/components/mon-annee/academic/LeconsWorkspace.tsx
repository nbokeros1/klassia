'use client'

import { useState, useMemo } from 'react'
import type { ContenuProgramme, Lecon, ContenuLecon } from '@/lib/types/database'
import type { LessonTeachingState } from '@/lib/types/school-year-dashboard'
import {
  buildPedagogicalYearTree,
  LESSON_STATUS_CFG,
  htmlToText,
  type LessonNode,
  type PedagogicalYearTree,
  type LessonStatus,
} from '@/lib/spie/pedagogical-year-tree'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  contenu:        ContenuProgramme | undefined
  lecons:         Lecon[]
  lessonStateMap: Record<string, LessonTeachingState> | undefined
  classeId:       string
}

type FilterType = 'tous' | 'enseignee' | 'a_reprendre' | 'preparee' | 'planifiee'

// ─── Design tokens ────────────────────────────────────────────────────────────

const NAV = {
  bg:      'rgba(13,30,58,0.95)',
  blur:    'blur(10px)',
  text:    'rgba(255,255,255,0.92)',
  sub:     'rgba(255,255,255,0.52)',
  muted:   'rgba(255,255,255,0.32)',
  hover:   'rgba(255,255,255,0.05)',
  selBg:   'rgba(108,92,231,0.22)',
  selBord: '#6C5CE7',
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 8.5, fontWeight: 800, letterSpacing: '0.9px', textTransform: 'uppercase',
      color: '#8B97AC', borderBottom: '1px solid rgba(15,35,65,0.07)',
      paddingBottom: 7, marginBottom: 14,
    }}>{children}</div>
  )
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 9 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: '#8B97AC', width: 110,
        flexShrink: 0, paddingTop: 1, textTransform: 'uppercase', letterSpacing: '0.3px',
      }}>{label}</div>
      <div style={{ flex: 1, fontSize: 12.5, color: '#5B6B85', lineHeight: 1.55 }}>
        {children}
      </div>
    </div>
  )
}

// ─── Filter chips ─────────────────────────────────────────────────────────────

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'tous',        label: 'Toutes' },
  { id: 'enseignee',   label: 'Enseignées' },
  { id: 'a_reprendre', label: 'À reprendre' },
  { id: 'preparee',    label: 'Préparées' },
  { id: 'planifiee',   label: 'Non préparées' },
]

// ─── LEFT: Navigator ──────────────────────────────────────────────────────────

function LeconNavigator({
  tree, selectedKey, onSelect, filter, onFilterChange,
}: {
  tree:           PedagogicalYearTree
  selectedKey:    string | null
  onSelect:       (n: LessonNode) => void
  filter:         FilterType
  onFilterChange: (f: FilterType) => void
}) {
  const [openUnits, setOpenUnits] = useState<Set<number>>(() => new Set([0]))

  function toggleUnit(idx: number) {
    setOpenUnits(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  // Flatten all lessons for filter count
  const allLessons = tree.units.flatMap(u => u.lessons)
  const filterCounts: Record<FilterType, number> = {
    tous:        allLessons.length,
    enseignee:   allLessons.filter(l => l.status === 'enseignee').length,
    a_reprendre: allLessons.filter(l => l.status === 'a_reprendre').length,
    preparee:    allLessons.filter(l => l.status === 'preparee').length,
    planifiee:   allLessons.filter(l => l.status === 'planifiee').length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.7px', textTransform: 'uppercase', color: NAV.muted, marginBottom: 2 }}>
          Registre d'enseignement
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: NAV.text, lineHeight: 1.2 }}>
          {tree.contenu.titre}
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ padding: '10px 10px 8px', display: 'flex', flexWrap: 'wrap', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {FILTERS.map(f => {
          const count   = filterCounts[f.id]
          const isActive = filter === f.id
          if (f.id !== 'tous' && count === 0) return null
          return (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              style={{
                padding: '3px 9px', borderRadius: 99, border: 'none', cursor: 'pointer',
                fontSize: 10, fontWeight: 600,
                background: isActive ? 'rgba(108,92,231,0.3)' : 'rgba(255,255,255,0.07)',
                color: isActive ? '#C4B5FD' : NAV.sub,
              }}
            >
              {f.label} {f.id !== 'tous' && <span style={{ opacity: 0.7 }}>({count})</span>}
            </button>
          )
        })}
      </div>

      {/* Tree */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {tree.units.map(unit => {
          const visibleLessons = filter === 'tous'
            ? unit.lessons
            : unit.lessons.filter(l => l.status === filter)
          if (visibleLessons.length === 0) return null
          const isOpen = openUnits.has(unit.seqIdx)
          return (
            <div key={unit.seqIdx}>
              {/* Unit header */}
              <button
                onClick={() => toggleUnit(unit.seqIdx)}
                style={{
                  width: '100%', padding: '8px 12px', background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = NAV.hover }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                  background: 'rgba(108,92,231,0.18)', border: '1px solid rgba(108,92,231,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 7.5, fontWeight: 800, color: '#A78BFA',
                }}>U{unit.unite.numero}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: NAV.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {unit.unite.titre}
                  </div>
                  <div style={{ fontSize: 9, color: NAV.muted }}>
                    {unit.stats.taught}/{unit.stats.total} ens.
                  </div>
                </div>
                <span style={{ fontSize: 7.5, color: NAV.muted, transform: isOpen ? 'rotate(180deg)' : '', transition: 'transform 0.15s' }}>▼</span>
              </button>

              {/* Lesson rows */}
              {isOpen && visibleLessons.map(lesson => {
                const isSelected = lesson.lessonKey === selectedKey
                const cfg        = LESSON_STATUS_CFG[lesson.status]
                return (
                  <button
                    key={lesson.lessonKey}
                    onClick={() => onSelect(lesson)}
                    style={{
                      width: '100%', padding: '6px 12px 6px 30px',
                      background: isSelected ? NAV.selBg : 'none',
                      borderLeft: isSelected ? `2px solid ${NAV.selBord}` : '2px solid transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = NAV.hover }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = isSelected ? NAV.selBg : 'none' }}
                  >
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 11, color: isSelected ? '#C4B5FD' : NAV.text,
                        fontWeight: isSelected ? 700 : 400,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        L{lesson.leconProg.numero} — {lesson.leconProg.titre}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 8, fontWeight: 700, color: cfg.color,
                      background: `${cfg.color}22`, borderRadius: 99, padding: '1px 5px', flexShrink: 0,
                    }}>{cfg.abbr}</span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── RIGHT: Inspector empty ───────────────────────────────────────────────────

function InspectorEmpty() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', flexDirection: 'column', gap: 10, padding: 40,
    }}>
      <div style={{ fontSize: 30, opacity: 0.1, color: '#0F1B2D' }}>←</div>
      <div style={{ fontSize: 13, color: '#8B97AC', textAlign: 'center', maxWidth: 260, lineHeight: 1.65 }}>
        Sélectionnez une leçon pour afficher son détail d'enseignement
      </div>
    </div>
  )
}

// ─── RIGHT: Lecon Inspector ───────────────────────────────────────────────────

function LeconInspector({
  lesson, tree, classeId,
}: {
  lesson:   LessonNode
  tree:     PedagogicalYearTree
  classeId: string
}) {
  const { leconProg, leconDB, status, teachState, outcomes } = lesson
  const unit = tree.units[lesson.seqIdx]
  const cfg  = LESSON_STATUS_CFG[status]
  const c    = leconDB?.contenu_json

  // Teaching lifecycle flags
  const hasPlan      = !!leconProg.lecon_id
  const isTaught     = status === 'enseignee'
  const isToRevisit  = status === 'a_reprendre'

  // Key plan sections (lifecycle view — not exhaustive checklist like PlansLeconView)
  const lifeCycleItems = hasPlan && c ? [
    { label: 'Objectifs',      done: !!(c?.objectifs && (Array.isArray(c.objectifs) ? c.objectifs.length > 0 : (c.objectifs as string).trim())) },
    { label: 'Déroulement',    done: !!(c?.avant?.amorce || c?.avant_amorce || c?.pendant?.modelisation || c?.pendant_modelisation) },
    { label: 'Éval. formative',done: !!(c?.evaluation_formative) },
    { label: 'Différenciation',done: !!(c?.differentiation || c?.differentiation_universelle) },
  ] : []

  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── IDENTITÉ ── */}
      <div>
        <div style={{ fontSize: 10.5, color: '#8B97AC', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>U{unit?.unite.numero} — {unit?.unite.titre}</span>
          <span style={{ opacity: 0.4 }}>›</span>
          <span style={{ fontWeight: 700, color: '#5B6B85' }}>Leçon {leconProg.numero}</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0F1B2D', lineHeight: 1.2, marginBottom: 14 }}>
          {leconProg.titre}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          <span style={{
            fontSize: 11.5, fontWeight: 700, color: cfg.color,
            background: cfg.bg, border: `1px solid ${cfg.color}35`,
            borderRadius: 99, padding: '4px 12px',
          }}>{cfg.label}</span>
          <span style={{
            fontSize: 11, color: '#5B6B85',
            background: 'rgba(91,107,133,0.08)', border: '1px solid rgba(91,107,133,0.15)',
            borderRadius: 99, padding: '4px 12px',
          }}>{leconProg.duree_minutes} min</span>
          {leconProg.type && (
            <span style={{
              fontSize: 11, color: '#5B6B85',
              background: 'rgba(91,107,133,0.08)', border: '1px solid rgba(91,107,133,0.15)',
              borderRadius: 99, padding: '4px 12px', textTransform: 'capitalize',
            }}>{leconProg.type}</span>
          )}
          {leconProg.progression_role && leconProg.progression_role !== 'autre' && (
            <span style={{
              fontSize: 11, color: '#5B6B85',
              background: 'rgba(91,107,133,0.08)', border: '1px solid rgba(91,107,133,0.15)',
              borderRadius: 99, padding: '4px 12px', textTransform: 'capitalize',
            }}>{leconProg.progression_role}</span>
          )}
        </div>
      </div>

      {/* ── ANCRAGE CURRICULAIRE ── */}
      <div>
        <SectionLabel>Ancrage curriculaire</SectionLabel>
        {leconProg.objectif_apprentissage && (
          <MetaField label="Objectif">{leconProg.objectif_apprentissage}</MetaField>
        )}
        {!leconProg.objectif_apprentissage && leconProg.sujet && (
          <MetaField label="Sujet">{leconProg.sujet}</MetaField>
        )}
        {leconProg.preuve_apprentissage && (
          <MetaField label="Preuve d'app.">
            <span style={{ fontStyle: 'italic' }}>{leconProg.preuve_apprentissage}</span>
          </MetaField>
        )}
        {outcomes.length > 0 && (
          <MetaField label="Résultats">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {outcomes.map((o, i) => (
                <span key={i} style={{
                  fontSize: 10.5, fontWeight: 700, color: '#6C5CE7',
                  background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)',
                  borderRadius: 5, padding: '2px 8px', cursor: 'help',
                }} title={o.description}>{o.code ?? o.id.slice(0, 8)}</span>
              ))}
            </div>
          </MetaField>
        )}
        {outcomes.length === 0 && leconProg.curriculum_outcome_ids && leconProg.curriculum_outcome_ids.length > 0 && (
          <MetaField label="RA (codes)">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {leconProg.curriculum_outcome_ids.map((id, i) => (
                <span key={i} style={{
                  fontSize: 10.5, fontWeight: 700, color: '#6C5CE7',
                  background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)',
                  borderRadius: 5, padding: '2px 8px',
                }}>{id}</span>
              ))}
            </div>
          </MetaField>
        )}
        {!tree.hasV2Data && (
          <div style={{ fontSize: 10.5, color: '#8B97AC', fontStyle: 'italic', marginTop: 4 }}>
            ⓘ Résultats d'apprentissage disponibles avec les programmes V2
          </div>
        )}
      </div>

      {/* ── CYCLE DE VIE ── */}
      <div>
        <SectionLabel>Cycle de vie</SectionLabel>
        {!hasPlan ? (
          <div style={{
            padding: '13px 16px', borderRadius: 9,
            background: 'rgba(139,151,172,0.05)', border: '1px solid rgba(139,151,172,0.14)',
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#5B6B85', marginBottom: 4 }}>Plan non préparé</div>
            <div style={{ fontSize: 12, color: '#8B97AC', lineHeight: 1.6 }}>
              Leçon planifiée dans le programme. Le contenu détaillé n'a pas encore été créé dans Préparer.
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {lifeCycleItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                    background: item.done ? 'rgba(34,197,94,0.1)' : 'rgba(139,151,172,0.06)',
                    border: item.done ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(139,151,172,0.16)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 7.5, color: item.done ? '#22C55E' : 'rgba(139,151,172,0.3)', fontWeight: 800,
                  }}>
                    {item.done ? '✓' : '–'}
                  </div>
                  <span style={{ fontSize: 12, color: item.done ? '#5B6B85' : '#8B97AC', fontWeight: item.done ? 500 : 400 }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            {leconDB?.updated_at && (
              <div style={{ marginTop: 10, fontSize: 11, color: '#8B97AC' }}>
                Dernière modification : {new Date(leconDB.updated_at).toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            )}
          </div>
        )}

        {/* Teaching status indicator */}
        {isTaught && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>Leçon enseignée</span>
          </div>
        )}
        {isToRevisit && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#D97706', fontWeight: 600 }}>À reprendre</span>
          </div>
        )}
      </div>

      {/* ── TRACE D'ENSEIGNEMENT ── */}
      {teachState && (teachState.isTaught || teachState.note) && (
        <div>
          <SectionLabel>Trace d'enseignement</SectionLabel>
          {teachState.taughtAt && (
            <MetaField label="Enseignée le">
              <span style={{ color: '#22C55E', fontWeight: 600 }}>
                {new Date(teachState.taughtAt).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </MetaField>
          )}
          {teachState.note && (
            <MetaField label="Note enseignant">
              <span style={{ fontStyle: 'italic' }}>{teachState.note}</span>
            </MetaField>
          )}
        </div>
      )}

      {/* ── ACTIONS ── */}
      <div>
        <SectionLabel>Actions</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {leconDB && (
            <a
              href={`/dashboard/classes/${classeId}/lecons/${leconDB.id}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '9px 16px', borderRadius: 8, textDecoration: 'none',
                background: 'rgba(108,92,231,0.09)', border: '1px solid rgba(108,92,231,0.22)',
                color: '#6C5CE7', fontSize: 12.5, fontWeight: 600,
              }}
            >
              Voir la leçon →
            </a>
          )}
          {!leconDB && (
            <a
              href="/dashboard/gerer/preparer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '9px 16px', borderRadius: 8, textDecoration: 'none',
                background: 'rgba(108,92,231,0.09)', border: '1px solid rgba(108,92,231,0.22)',
                color: '#6C5CE7', fontSize: 12.5, fontWeight: 600,
              }}
            >
              Préparer avec ScorgIA →
            </a>
          )}
          {leconDB && (
            <a
              href={`/dashboard/classes/${classeId}/lecons/${leconDB.id}/modifier`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '9px 16px', borderRadius: 8, textDecoration: 'none',
                background: 'rgba(91,107,133,0.07)', border: '1px solid rgba(91,107,133,0.15)',
                color: '#5B6B85', fontSize: 12.5, fontWeight: 600,
              }}
            >
              Modifier →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── LeconsWorkspace ──────────────────────────────────────────────────────────

export default function LeconsWorkspace({ contenu, lecons, lessonStateMap, classeId }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('tous')

  const tree = useMemo(() =>
    contenu ? buildPedagogicalYearTree(contenu, lecons, lessonStateMap) : null,
  [contenu, lecons, lessonStateMap])

  if (!tree || tree.units.length === 0) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.9)',
        borderRadius: 16, padding: '48px 32px', textAlign: 'center',
        boxShadow: '0 8px 32px rgba(15,35,65,0.08)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F1B2D', marginBottom: 8 }}>
          Registre d'enseignement non disponible
        </div>
        <div style={{ fontSize: 12.5, color: '#8B97AC', lineHeight: 1.65, maxWidth: 380, margin: '0 auto 20px' }}>
          Les leçons sont créées lors de la construction de l&apos;année scolaire.
        </div>
        <a href={`/dashboard/classes/${classeId}/programme`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '10px 20px', borderRadius: 9, textDecoration: 'none',
          background: 'rgba(108,92,231,0.09)', border: '1px solid rgba(108,92,231,0.22)',
          color: '#6C5CE7', fontSize: 13, fontWeight: 600,
        }}>Construire mon année →</a>
      </div>
    )
  }

  // Year-level stats
  const allLessons = tree.units.flatMap(u => u.lessons)
  const stats: Record<string, number> = {
    enseignee:   allLessons.filter(l => l.status === 'enseignee').length,
    a_reprendre: allLessons.filter(l => l.status === 'a_reprendre').length,
    preparee:    allLessons.filter(l => l.status === 'preparee').length,
    planifiee:   allLessons.filter(l => l.status === 'planifiee').length,
  }

  const selectedLesson = selectedKey
    ? allLessons.find(l => l.lessonKey === selectedKey) ?? null
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {(Object.entries(stats) as [LessonStatus, number][]).map(([s, n]) => {
          if (n === 0 && s !== 'enseignee') return null
          const cfg = LESSON_STATUS_CFG[s]
          return (
            <div key={s} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 9,
              background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(15,35,65,0.08)',
              boxShadow: '0 2px 8px rgba(15,35,65,0.04)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
              <span style={{ fontSize: 16, fontWeight: 800, color: '#0F1B2D' }}>{n}</span>
              <span style={{ fontSize: 11, color: '#8B97AC' }}>{cfg.label.toLowerCase()}{n > 1 && s === 'planifiee' ? 's' : ''}</span>
            </div>
          )
        })}
      </div>

      {/* Two-pane workspace */}
      <div style={{
        display: 'flex', borderRadius: 16, overflow: 'hidden',
        border: '1px solid rgba(15,35,65,0.1)',
        boxShadow: '0 8px 32px rgba(15,35,65,0.08)',
        minHeight: '72vh',
      }}>
        {/* LEFT — Navigator */}
        <div style={{
          width: 310, flexShrink: 0,
          background: 'rgba(13,30,58,0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'hidden',
        }}>
          <LeconNavigator
            tree={tree}
            selectedKey={selectedKey}
            onSelect={n => setSelectedKey(n.lessonKey)}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>

        {/* RIGHT — Inspector */}
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.95)', overflowY: 'auto' }}>
          {selectedLesson
            ? <LeconInspector lesson={selectedLesson} tree={tree} classeId={classeId} />
            : <InspectorEmpty />
          }
        </div>
      </div>
    </div>
  )
}
