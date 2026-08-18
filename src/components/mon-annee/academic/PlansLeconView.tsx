'use client'

import { useState, useMemo } from 'react'
import type { ContenuProgramme, Lecon } from '@/lib/types/database'
import type { LessonTeachingState } from '@/lib/types/school-year-dashboard'
import {
  buildPedagogicalYearTree,
  LESSON_STATUS_CFG,
  htmlToText,
  type LessonNode,
  type PedagogicalYearTree,
} from '@/lib/spie/pedagogical-year-tree'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  contenu:        ContenuProgramme | undefined
  lecons:         Lecon[]
  lessonStateMap: Record<string, LessonTeachingState> | undefined
  classeId:       string
}

// ─── Design tokens — two-pane system ─────────────────────────────────────────

const NAV = {
  bg:       'rgba(13,30,58,0.95)',
  blur:     'blur(10px)',
  border:   '1px solid rgba(255,255,255,0.07)',
  text:     'rgba(255,255,255,0.92)',
  sub:      'rgba(255,255,255,0.52)',
  muted:    'rgba(255,255,255,0.32)',
  hover:    'rgba(255,255,255,0.05)',
  selBg:    'rgba(108,92,231,0.22)',
  selBord:  '#6C5CE7',
}

// ─── Shared micro-components ──────────────────────────────────────────────────

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

function PlanCheck({ label, done }: { label: string; done: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
      <div style={{
        width: 15, height: 15, borderRadius: 3.5, flexShrink: 0,
        background: done ? 'rgba(34,197,94,0.1)' : 'rgba(139,151,172,0.06)',
        border: done ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(139,151,172,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 8, color: done ? '#22C55E' : 'rgba(139,151,172,0.35)',
        fontWeight: 800,
      }}>
        {done ? '✓' : '–'}
      </div>
      <span style={{ fontSize: 12, color: done ? '#5B6B85' : '#8B97AC', fontWeight: done ? 500 : 400 }}>
        {label}
      </span>
    </div>
  )
}

// ─── LEFT: Pedagogical Navigator ──────────────────────────────────────────────

function PlanNavigator({
  tree, selectedKey, onSelect,
}: {
  tree:        PedagogicalYearTree
  selectedKey: string | null
  onSelect:    (node: LessonNode) => void
}) {
  const [openUnits, setOpenUnits] = useState<Set<number>>(() => new Set([0]))

  function toggleUnit(idx: number) {
    setOpenUnits(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px', borderBottom: `1px solid ${NAV.border.split(' ').slice(2).join(' ')}`,
      }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.7px', textTransform: 'uppercase', color: NAV.muted, marginBottom: 2 }}>
          Plans de leçon
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: NAV.text, lineHeight: 1.2 }}>
          {tree.contenu.titre}
        </div>
        <div style={{ fontSize: 10, color: NAV.muted, marginTop: 3 }}>
          {tree.units.reduce((s, u) => s + u.stats.total, 0)} leçons · {tree.units.length} unités
        </div>
      </div>

      {/* Tree */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {tree.units.map(unit => {
          const isOpen = openUnits.has(unit.seqIdx)
          const pct    = unit.stats.pctTaught

          return (
            <div key={unit.seqIdx}>
              {/* Unit row */}
              <button
                onClick={() => toggleUnit(unit.seqIdx)}
                style={{
                  width: '100%', padding: '9px 14px', background: 'none',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 9,
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = NAV.hover }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
              >
                {/* Unit badge */}
                <div style={{
                  width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                  background: 'rgba(108,92,231,0.18)', border: '1px solid rgba(108,92,231,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 800, color: '#A78BFA',
                }}>U{unit.unite.numero}</div>

                {/* Labels */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11.5, fontWeight: 700, color: NAV.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {unit.unite.titre}
                  </div>
                  <div style={{ fontSize: 9, color: NAV.muted, marginTop: 1.5 }}>
                    {unit.stats.taught}/{unit.stats.total} ens. · Sem. {unit.unite.semaine_debut}–{unit.unite.semaine_fin}
                  </div>
                </div>

                {/* Mini progress + chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <div style={{ width: 24, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.08)' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 99,
                      background: pct === 100 ? '#22C55E' : pct > 0 ? '#6C5CE7' : 'rgba(255,255,255,0.12)',
                    }} />
                  </div>
                  <span style={{ fontSize: 8, color: NAV.muted, transform: isOpen ? 'rotate(180deg)' : '', transition: 'transform 0.15s' }}>▼</span>
                </div>
              </button>

              {/* Lesson rows */}
              {isOpen && unit.lessons.map(lesson => {
                const isSelected = lesson.lessonKey === selectedKey
                const cfg        = LESSON_STATUS_CFG[lesson.status]
                return (
                  <button
                    key={lesson.lessonKey}
                    onClick={() => onSelect(lesson)}
                    style={{
                      width: '100%', padding: '6px 14px 6px 36px',
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
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
                      <span style={{ fontSize: 9, color: NAV.muted }}>{lesson.leconProg.duree_minutes}m</span>
                      <span style={{
                        fontSize: 8, fontWeight: 700, color: cfg.color,
                        background: `${cfg.color}22`, borderRadius: 99, padding: '1px 5px',
                      }}>{cfg.abbr}</span>
                    </div>
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

// ─── RIGHT: Plan Inspector ────────────────────────────────────────────────────

function PlanInspector({
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

  const planSections = leconDB ? [
    { label: 'Objectifs d\'apprentissage',  done: !!(c?.objectifs && (Array.isArray(c.objectifs) ? c.objectifs.length > 0 : (c.objectifs as string).trim())) },
    { label: 'Critères de réussite',        done: !!(c?.criteres && (Array.isArray(c.criteres) ? c.criteres.length > 0 : (c.criteres as string).trim())) },
    { label: 'Matériel',                    done: !!(c?.materiel && (Array.isArray(c.materiel) ? c.materiel.length > 0 : (c.materiel as string).trim())) },
    { label: 'Amorce / ouverture',          done: !!(c?.avant?.amorce || c?.avant_amorce) },
    { label: 'Modelage / enseignement',     done: !!(c?.pendant?.modelisation || c?.pendant_modelisation) },
    { label: 'Pratique guidée',             done: !!(c?.pendant?.pratique_guidee || c?.pendant_pratique_guidee) },
    { label: 'Pratique autonome',           done: !!(c?.pendant?.pratique_autonome || c?.pendant_pratique_autonome) },
    { label: 'Clôture / consolidation',     done: !!(c?.apres?.retour || c?.apres_cloture) },
    { label: 'Évaluation formative',        done: !!(c?.evaluation_formative) },
    { label: 'Différenciation',             done: !!(c?.differentiation || c?.differentiation_universelle) },
  ] : []

  const completeSections = planSections.filter(s => s.done).length
  const planScore = planSections.length > 0
    ? Math.round((completeSections / planSections.length) * 100)
    : null

  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── HEADER ── */}
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
          <MetaField label="Objectif">
            {leconProg.objectif_apprentissage}
          </MetaField>
        )}
        {!leconProg.objectif_apprentissage && leconProg.sujet && (
          <MetaField label="Sujet">{leconProg.sujet}</MetaField>
        )}
        {leconProg.activite_principale && (
          <MetaField label="Activité">{leconProg.activite_principale}</MetaField>
        )}
        {leconProg.preuve_apprentissage && (
          <MetaField label="Preuve d'app.">
            <span style={{ fontStyle: 'italic' }}>{leconProg.preuve_apprentissage}</span>
          </MetaField>
        )}

        {/* Resolved outcomes */}
        {outcomes.length > 0 && (
          <MetaField label="Résultats">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {outcomes.map((o, i) => (
                <span key={i} style={{
                  fontSize: 10.5, fontWeight: 700, color: '#6C5CE7',
                  background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)',
                  borderRadius: 5, padding: '2px 8px', cursor: 'help',
                }} title={o.description}>
                  {o.code ?? o.id.slice(0, 8)}
                </span>
              ))}
            </div>
          </MetaField>
        )}

        {/* Outcome IDs when no resolved data */}
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

        {/* Data limitations */}
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {!tree.hasV2Data && (
            <div style={{ fontSize: 10.5, color: '#8B97AC', fontStyle: 'italic' }}>
              ⓘ Résultats d'apprentissage : disponibles avec les programmes V2
            </div>
          )}
          <div style={{ fontSize: 10.5, color: '#8B97AC', fontStyle: 'italic' }}>
            ⓘ Question directrice — non disponible dans le schéma actuel (prévu V8)
          </div>
          <div style={{ fontSize: 10.5, color: '#8B97AC', fontStyle: 'italic' }}>
            ⓘ CCHP — non disponible dans le schéma actuel (prévu V8)
          </div>
        </div>
      </div>

      {/* ── STATUT DU PLAN ── */}
      <div>
        <SectionLabel>Statut du plan de leçon</SectionLabel>
        {!leconProg.lecon_id ? (
          <div style={{
            padding: '16px 18px', borderRadius: 10,
            background: 'rgba(139,151,172,0.06)', border: '1px solid rgba(139,151,172,0.15)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#5B6B85', marginBottom: 5 }}>Plan non préparé</div>
            <div style={{ fontSize: 12, color: '#8B97AC', lineHeight: 1.6 }}>
              Cette leçon est planifiée dans le programme annuel. Son plan détaillé n'a pas encore été créé dans Préparer.
            </div>
          </div>
        ) : (
          <div>
            {planScore !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'rgba(15,35,65,0.07)' }}>
                  <div style={{
                    height: '100%', borderRadius: 99,
                    width: `${planScore}%`,
                    background: planScore >= 70 ? '#22C55E' : planScore >= 40 ? '#6C5CE7' : '#F59E0B',
                    transition: 'width 0.3s',
                  }} />
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#5B6B85', minWidth: 40 }}>
                  {completeSections}/{planSections.length} sections
                </span>
              </div>
            )}
            <div style={{ columns: 2, gap: 12 }}>
              {planSections.map((s, i) => <PlanCheck key={i} label={s.label} done={s.done} />)}
            </div>
          </div>
        )}
      </div>

      {/* ── DOCUMENT ── */}
      {leconDB && (
        <div>
          <SectionLabel>Document</SectionLabel>
          <MetaField label="Statut">
            <span style={{ color: '#22C55E', fontWeight: 600 }}>Plan créé</span>
          </MetaField>
          {leconDB.updated_at && (
            <MetaField label="Dernière modif.">
              {new Date(leconDB.updated_at).toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
            </MetaField>
          )}
        </div>
      )}

      {/* ── TRACE D'ENSEIGNEMENT ── */}
      {teachState?.isTaught && (
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
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 8, textDecoration: 'none',
                background: 'rgba(108,92,231,0.09)', border: '1px solid rgba(108,92,231,0.22)',
                color: '#6C5CE7', fontSize: 12.5, fontWeight: 600,
              }}
            >
              Voir le plan complet →
            </a>
          )}
          {leconDB && (
            <a
              href={`/dashboard/classes/${classeId}/lecons/${leconDB.id}/modifier`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 8, textDecoration: 'none',
                background: 'rgba(91,107,133,0.07)', border: '1px solid rgba(91,107,133,0.15)',
                color: '#5B6B85', fontSize: 12.5, fontWeight: 600,
              }}
            >
              Modifier →
            </a>
          )}
          {!leconDB && (
            <a
              href={`/dashboard/gerer/preparer`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 8, textDecoration: 'none',
                background: 'rgba(108,92,231,0.09)', border: '1px solid rgba(108,92,231,0.22)',
                color: '#6C5CE7', fontSize: 12.5, fontWeight: 600,
              }}
            >
              Préparer avec ScorgIA →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyInspector() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', flexDirection: 'column', gap: 10, padding: 40,
    }}>
      <div style={{ fontSize: 32, opacity: 0.12, color: '#0F1B2D' }}>←</div>
      <div style={{ fontSize: 13, color: '#8B97AC', textAlign: 'center', maxWidth: 260, lineHeight: 1.65 }}>
        Sélectionnez une leçon dans le navigateur pour inspecter son plan
      </div>
    </div>
  )
}

// ─── PlansLeconView ───────────────────────────────────────────────────────────

export default function PlansLeconView({ contenu, lecons, lessonStateMap, classeId }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

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
          Plans de leçon non disponibles
        </div>
        <div style={{ fontSize: 12.5, color: '#8B97AC', lineHeight: 1.65, maxWidth: 380, margin: '0 auto 20px' }}>
          Les plans de leçon sont générés lors de la construction de l&apos;année scolaire.
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

  // Find selected lesson node
  const selectedLesson = selectedKey
    ? tree.units.flatMap(u => u.lessons).find(l => l.lessonKey === selectedKey) ?? null
    : null

  return (
    <div style={{
      display: 'flex', borderRadius: 16, overflow: 'hidden',
      border: '1px solid rgba(15,35,65,0.1)',
      boxShadow: '0 8px 32px rgba(15,35,65,0.08)',
      minHeight: '75vh',
    }}>
      {/* LEFT — Pedagogical Navigator */}
      <div style={{
        width: 310, flexShrink: 0,
        background: NAV.bg,
        backdropFilter: NAV.blur,
        WebkitBackdropFilter: NAV.blur,
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        <PlanNavigator
          tree={tree}
          selectedKey={selectedKey}
          onSelect={n => setSelectedKey(n.lessonKey)}
        />
      </div>

      {/* RIGHT — Inspector */}
      <div style={{
        flex: 1, background: 'rgba(255,255,255,0.95)',
        overflowY: 'auto',
      }}>
        {selectedLesson
          ? <PlanInspector lesson={selectedLesson} tree={tree} classeId={classeId} />
          : <EmptyInspector />
        }
      </div>
    </div>
  )
}
