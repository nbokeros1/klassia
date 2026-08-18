'use client'

import { useState, useMemo } from 'react'
import type { ContenuProgramme } from '@/lib/types/database'
import type { LessonTeachingState } from '@/lib/types/school-year-dashboard'
import {
  buildPedagogicalYearTree,
  LESSON_STATUS_CFG,
  type UnitNode,
  type PedagogicalYearTree,
} from '@/lib/spie/pedagogical-year-tree'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  contenu:        ContenuProgramme | undefined
  lessonStateMap: Record<string, LessonTeachingState> | undefined
  classeId:       string
  onSelectLecon?: (seqIdx: number, leconIdx: number) => void
}

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

function UnitStatusBadge({ pct }: { pct: number }) {
  const color = pct === 100 ? '#22C55E' : pct > 0 ? '#6C5CE7' : '#8B97AC'
  const label = pct === 100 ? 'Terminée' : pct > 0 ? 'En cours' : 'À venir'
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color,
      background: `${color}15`, border: `1px solid ${color}30`,
      borderRadius: 99, padding: '2px 9px',
    }}>{label}</span>
  )
}

// ─── LEFT: Unit Navigator ─────────────────────────────────────────────────────

function UnitNavigator({
  tree, selectedSeqIdx, onSelect,
}: {
  tree:           PedagogicalYearTree
  selectedSeqIdx: number | null
  onSelect:       (seqIdx: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.7px', textTransform: 'uppercase', color: NAV.muted, marginBottom: 2 }}>
          Unités du programme
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: NAV.text, lineHeight: 1.2 }}>
          {tree.contenu.titre}
        </div>
        <div style={{ fontSize: 10, color: NAV.muted, marginTop: 3 }}>
          {tree.units.length} unité{tree.units.length !== 1 ? 's' : ''} · {tree.units.reduce((s, u) => s + u.stats.total, 0)} leçons
        </div>
      </div>

      {/* Unit list */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {tree.units.map(unit => {
          const isSelected = unit.seqIdx === selectedSeqIdx
          const pct        = unit.stats.pctTaught
          const color      = pct === 100 ? '#22C55E' : pct > 0 ? '#6C5CE7' : '#8B97AC'

          return (
            <button
              key={unit.seqIdx}
              onClick={() => onSelect(unit.seqIdx)}
              style={{
                width: '100%', padding: '12px 14px',
                background: isSelected ? NAV.selBg : 'none',
                borderLeft: isSelected ? `2px solid ${NAV.selBord}` : '2px solid transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 10,
                borderTop: '1px solid rgba(255,255,255,0.03)',
              }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = NAV.hover }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = isSelected ? NAV.selBg : 'none' }}
            >
              {/* Unit badge */}
              <div style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: isSelected ? 'rgba(108,92,231,0.3)' : 'rgba(108,92,231,0.14)',
                border: `1px solid ${isSelected ? 'rgba(108,92,231,0.6)' : 'rgba(108,92,231,0.25)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 800, color: isSelected ? '#C4B5FD' : '#A78BFA',
              }}>
                U{unit.unite.numero}
              </div>

              {/* Labels */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? '#C4B5FD' : NAV.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  lineHeight: 1.3,
                }}>
                  {unit.unite.titre}
                </div>
                <div style={{ fontSize: 9.5, color: NAV.muted, marginTop: 2 }}>
                  Sem. {unit.unite.semaine_debut}–{unit.unite.semaine_fin} · {unit.stats.total} leçon{unit.stats.total !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Mini progress */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color }}>
                  {unit.stats.taught}/{unit.stats.total}
                </span>
                <div style={{ width: 32, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.08)' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: 99,
                    background: pct === 100 ? '#22C55E' : pct > 0 ? '#6C5CE7' : 'rgba(255,255,255,0.12)',
                  }} />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── RIGHT: Unit Inspector (empty) ────────────────────────────────────────────

function InspectorEmpty() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', flexDirection: 'column', gap: 10, padding: 40,
    }}>
      <div style={{ fontSize: 30, opacity: 0.1, color: '#0F1B2D' }}>←</div>
      <div style={{ fontSize: 13, color: '#8B97AC', textAlign: 'center', maxWidth: 260, lineHeight: 1.65 }}>
        Sélectionnez une unité pour afficher son détail pédagogique
      </div>
    </div>
  )
}

// ─── RIGHT: Unit Inspector ────────────────────────────────────────────────────

function UnitInspector({
  unit, tree, classeId,
}: {
  unit:     UnitNode
  tree:     PedagogicalYearTree
  classeId: string
}) {
  const { unite, stats, outcomes, lessons } = unit
  const duree = unite.semaine_fin - unite.semaine_debut + 1

  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── HEADER ── */}
      <div>
        <div style={{ fontSize: 10.5, color: '#8B97AC', marginBottom: 8 }}>
          Unité {unite.numero} · Sem. {unite.semaine_debut}–{unite.semaine_fin} ({duree} semaine{duree !== 1 ? 's' : ''})
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0F1B2D', lineHeight: 1.2, marginBottom: 14 }}>
          {unite.titre}
        </div>

        {/* Progress + status */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <UnitStatusBadge pct={stats.pctTaught} />
          <span style={{
            fontSize: 11, color: '#5B6B85',
            background: 'rgba(91,107,133,0.08)', border: '1px solid rgba(91,107,133,0.15)',
            borderRadius: 99, padding: '4px 12px',
          }}>{stats.taught}/{stats.total} leçon{stats.total !== 1 ? 's' : ''} enseignée{stats.taught !== 1 ? 's' : ''}</span>
          {stats.prepared > 0 && (
            <span style={{
              fontSize: 11, color: '#6C5CE7',
              background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.18)',
              borderRadius: 99, padding: '4px 12px',
            }}>{stats.prepared} préparée{stats.prepared !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'rgba(15,35,65,0.07)' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${stats.pctTaught}%`,
              background: stats.pctTaught === 100 ? '#22C55E' : stats.pctTaught > 0 ? '#6C5CE7' : 'transparent',
              transition: 'width 0.3s',
            }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#5B6B85', minWidth: 38 }}>
            {stats.pctTaught}%
          </span>
        </div>
      </div>

      {/* ── OBJECTIFS ── */}
      {unite.objectifs && unite.objectifs.length > 0 && (
        <div>
          <SectionLabel>Objectifs</SectionLabel>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {unite.objectifs.map((o, i) => (
              <li key={i} style={{ display: 'flex', gap: 9, fontSize: 12.5, color: '#5B6B85', lineHeight: 1.6 }}>
                <span style={{ color: '#6C5CE7', fontWeight: 800, flexShrink: 0, marginTop: 1 }}>·</span>
                {o}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── JUSTIFICATION PÉDAGOGIQUE (V2) ── */}
      {unite.justification_pedagogique && (
        <div>
          <SectionLabel>Pourquoi cette unité ?</SectionLabel>
          <div style={{
            fontSize: 12.5, color: '#5B6B85', lineHeight: 1.65,
            padding: '12px 16px', borderRadius: 10,
            background: 'rgba(108,92,231,0.04)', border: '1px solid rgba(108,92,231,0.1)',
          }}>
            {unite.justification_pedagogique}
          </div>
        </div>
      )}

      {/* ── GRANDES IDÉES (V2) ── */}
      {unite.grandes_idees && unite.grandes_idees.length > 0 && (
        <div>
          <SectionLabel>Grandes idées</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {unite.grandes_idees.map((g, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, fontSize: 12.5, color: '#5B6B85', lineHeight: 1.6 }}>
                <span style={{ color: '#F59E0B', fontWeight: 800, flexShrink: 0, marginTop: 1 }}>·</span>
                {g}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CONCEPTS CLÉS (V2) ── */}
      {unite.concepts_cles && unite.concepts_cles.length > 0 && (
        <div>
          <SectionLabel>Concepts clés</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {unite.concepts_cles.map((c, i) => (
              <span key={i} style={{
                fontSize: 12, padding: '4px 11px', borderRadius: 7,
                background: 'rgba(15,35,65,0.05)', border: '1px solid rgba(15,35,65,0.08)',
                color: '#5B6B85',
              }}>{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── RÉSULTATS D'APPRENTISSAGE (V2) ── */}
      {outcomes.length > 0 ? (
        <div>
          <SectionLabel>Résultats d'apprentissage</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {outcomes.map((o, i) => (
              <span key={i} style={{
                fontSize: 10.5, fontWeight: 700, color: '#6C5CE7',
                background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)',
                borderRadius: 5, padding: '3px 9px', cursor: 'help',
              }} title={o.description}>
                {o.code ?? o.id.slice(0, 8)}
              </span>
            ))}
          </div>
        </div>
      ) : unite.curriculum_outcome_ids && unite.curriculum_outcome_ids.length > 0 ? (
        <div>
          <SectionLabel>Résultats d'apprentissage (codes)</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {unite.curriculum_outcome_ids.map((id, i) => (
              <span key={i} style={{
                fontSize: 10.5, fontWeight: 700, color: '#6C5CE7',
                background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)',
                borderRadius: 5, padding: '3px 9px',
              }}>{id}</span>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── ACTIVITÉ CULMINANTE + ÉVALUATION ── */}
      {(unite.activite_culminante || unite.evaluation_prevue) && (
        <div>
          <SectionLabel>Évaluation et activité culminante</SectionLabel>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {unite.activite_culminante && (
              <div style={{
                flex: '1 1 200px', padding: '13px 16px', borderRadius: 10,
                background: 'rgba(108,92,231,0.04)', border: '1px solid rgba(108,92,231,0.1)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.7px', textTransform: 'uppercase', color: '#8B97AC', marginBottom: 6 }}>
                  Activité culminante
                </div>
                <div style={{ fontSize: 12.5, color: '#5B6B85', lineHeight: 1.6 }}>
                  {unite.activite_culminante}
                </div>
              </div>
            )}
            {unite.evaluation_prevue && (
              <div style={{
                flex: '1 1 200px', padding: '13px 16px', borderRadius: 10,
                background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.7px', textTransform: 'uppercase', color: '#8B97AC', marginBottom: 6 }}>
                  Évaluation prévue
                </div>
                <div style={{ fontSize: 12.5, color: '#5B6B85', lineHeight: 1.6 }}>
                  {unite.evaluation_prevue}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DATA LIMITATIONS ── */}
      {!tree.hasV2Data && (
        <div style={{ fontSize: 10.5, color: '#8B97AC', fontStyle: 'italic' }}>
          ⓘ Grandes idées, concepts clés, résultats d'apprentissage — disponibles avec les programmes V2
        </div>
      )}
      <div style={{ fontSize: 10.5, color: '#8B97AC', fontStyle: 'italic' }}>
        ⓘ Question directrice — non disponible dans le schéma actuel (prévu V8)
      </div>

      {/* ── LEÇONS DE L'UNITÉ ── */}
      <div>
        <SectionLabel>{`Leçons de cette unité (${lessons.length})`}</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {lessons.map(lesson => {
            const cfg = LESSON_STATUS_CFG[lesson.status]
            return (
              <div key={lesson.lessonKey} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 12px', borderRadius: 9,
                background: 'rgba(15,35,65,0.03)', border: '1px solid rgba(15,35,65,0.07)',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                  background: cfg.bg, border: `1px solid ${cfg.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9.5, fontWeight: 700, color: cfg.color,
                }}>
                  {lesson.leconProg.numero}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F1B2D', lineHeight: 1.3 }}>
                    {lesson.leconProg.titre}
                  </div>
                  {lesson.leconProg.objectif_apprentissage && (
                    <div style={{ fontSize: 11, color: '#8B97AC', marginTop: 2, lineHeight: 1.4 }}>
                      {lesson.leconProg.objectif_apprentissage.length > 85
                        ? lesson.leconProg.objectif_apprentissage.slice(0, 85) + '…'
                        : lesson.leconProg.objectif_apprentissage}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: '#8B97AC' }}>{lesson.leconProg.duree_minutes}m</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: cfg.color,
                    background: cfg.bg, border: `1px solid ${cfg.color}30`,
                    borderRadius: 99, padding: '1px 6px',
                  }}>{cfg.abbr}</span>
                  {lesson.leconDB && (
                    <a
                      href={`/dashboard/classes/${classeId}/lecons/${lesson.leconDB.id}`}
                      style={{ fontSize: 10, fontWeight: 600, color: '#6C5CE7', textDecoration: 'none' }}
                    >
                      →
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── SequencesView ────────────────────────────────────────────────────────────

export default function SequencesView({ contenu, lessonStateMap, classeId }: Props) {
  const [selectedSeqIdx, setSelectedSeqIdx] = useState<number | null>(null)

  const tree = useMemo(() =>
    contenu ? buildPedagogicalYearTree(contenu, [], lessonStateMap) : null,
  [contenu, lessonStateMap])

  if (!tree || tree.units.length === 0) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.9)',
        borderRadius: 16, padding: '48px 32px', textAlign: 'center',
        boxShadow: '0 8px 32px rgba(15,35,65,0.08)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F1B2D', marginBottom: 8 }}>
          Unités non disponibles
        </div>
        <div style={{ fontSize: 12.5, color: '#8B97AC', lineHeight: 1.65, maxWidth: 380, margin: '0 auto 20px' }}>
          Les unités sont générées lors de la construction de l&apos;année scolaire.
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

  const selectedUnit = selectedSeqIdx !== null
    ? tree.units[selectedSeqIdx] ?? null
    : null

  return (
    <div style={{
      display: 'flex', borderRadius: 16, overflow: 'hidden',
      border: '1px solid rgba(15,35,65,0.1)',
      boxShadow: '0 8px 32px rgba(15,35,65,0.08)',
      minHeight: '72vh',
    }}>
      {/* LEFT — Unit Navigator */}
      <div style={{
        width: 310, flexShrink: 0,
        background: 'rgba(13,30,58,0.95)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        <UnitNavigator
          tree={tree}
          selectedSeqIdx={selectedSeqIdx}
          onSelect={setSelectedSeqIdx}
        />
      </div>

      {/* RIGHT — Inspector */}
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.95)', overflowY: 'auto' }}>
        {selectedUnit
          ? <UnitInspector unit={selectedUnit} tree={tree} classeId={classeId} />
          : <InspectorEmpty />
        }
      </div>
    </div>
  )
}
