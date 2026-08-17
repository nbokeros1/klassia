'use client'

import { useState } from 'react'
import type { Classe, ProgrammeAnnuel, ContenuProgramme, CurriculumOutcome } from '@/lib/types/database'
import type { TeachingPack } from '@/lib/types/teaching-pack'
import type { CurriculumCoverageData, LessonTeachingState } from '@/lib/types/school-year-dashboard'
import CurriculumView from '@/components/mon-annee/academic/CurriculumView'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  classes:        Classe[]
  programmes:     Record<string, ProgrammeAnnuel>
  packs:          Record<string, TeachingPack>
  classeId:       string | null
  lessonStateMap: Record<string, LessonTeachingState> | undefined
  curriculumCoverage: CurriculumCoverageData | undefined
  onSelectClasse: (id: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getContenu(prog: ProgrammeAnnuel | undefined): ContenuProgramme | undefined {
  return prog?.contenu_json
}

function countRA(contenu: ContenuProgramme | undefined): number {
  return contenu?.curriculum_outcomes?.length ?? 0
}

function countRAPlanifies(contenu: ContenuProgramme | undefined): number {
  if (!contenu) return 0
  const ids = new Set<string>()
  for (const u of contenu.unites ?? []) {
    for (const l of u.lecons ?? []) {
      for (const id of l.curriculum_outcome_ids ?? []) ids.add(id)
    }
    for (const id of (u as { curriculum_outcome_ids?: string[] }).curriculum_outcome_ids ?? []) ids.add(id)
  }
  return ids.size
}

function statusBadge(contenu: ContenuProgramme | undefined, pack: TeachingPack | undefined): {
  label: string; color: string
} {
  if (!pack) return { label: 'Aucun pack', color: '#94A3B8' }
  if (!contenu?.curriculum_outcomes?.length) return { label: 'V1 — Pas de RA', color: '#F59E0B' }
  return { label: 'V2 — RA disponibles', color: '#22C55E' }
}

// ─── Ligne du tableau ─────────────────────────────────────────────────────────

function PortfolioRow({ cls, programme, pack, isSelected, onOpen }: {
  cls:        Classe
  programme:  ProgrammeAnnuel | undefined
  pack:       TeachingPack | undefined
  isSelected: boolean
  onOpen:     () => void
}) {
  const contenu  = getContenu(programme)
  const totalRA  = countRA(contenu)
  const planRA   = countRAPlanifies(contenu)
  const status   = statusBadge(contenu, pack)

  return (
    <tr
      onClick={onOpen}
      style={{
        cursor: 'pointer', transition: 'background 0.1s',
        background: isSelected ? 'rgba(108,92,231,0.07)' : '',
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(139,151,172,0.05)' }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '' }}
    >
      {/* Classe/matière */}
      <td style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: isSelected ? '#6C5CE7' : 'var(--text-primary)' }}>
          {cls.matiere}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cls.nom} · {cls.niveau}</div>
      </td>

      {/* Province */}
      <td style={{ padding: '14px', fontSize: 12, color: 'var(--text-secondary)' }}>
        {pack?.province ?? pack?.pays ?? '—'}
      </td>

      {/* Curriculum source */}
      <td style={{ padding: '14px', fontSize: 12, color: 'var(--text-secondary)' }}>
        {pack?.curriculum_source ?? '—'}
      </td>

      {/* RA totaux */}
      <td style={{ padding: '14px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
        {totalRA > 0 ? totalRA : '—'}
      </td>

      {/* RA planifiés */}
      <td style={{ padding: '14px', textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)' }}>
        {planRA > 0 ? planRA : '—'}
      </td>

      {/* RA enseignés */}
      <td style={{ padding: '14px', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
        —
      </td>

      {/* Statut */}
      <td style={{ padding: '14px' }}>
        <span style={{
          fontSize: 10.5, fontWeight: 700, color: status.color,
          background: `${status.color}12`, border: `1px solid ${status.color}25`,
          borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap',
        }}>{status.label}</span>
      </td>

      {/* Action */}
      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#6C5CE7' }}>
          {isSelected ? 'Affiché' : 'Ouvrir →'}
        </span>
      </td>
    </tr>
  )
}

// ─── CurriculumPortfolio ──────────────────────────────────────────────────────

export default function CurriculumPortfolio({
  classes, programmes, packs, classeId, lessonStateMap, curriculumCoverage, onSelectClasse,
}: Props) {

  const selectedProgramme = classeId ? programmes[classeId] : undefined
  const selectedContenu   = getContenu(selectedProgramme)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Portfolio header */}
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
              Curriculum — Portefeuille
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {classeId
                ? `Classe sélectionnée — vue détaillée ci-dessous`
                : `${classes.length} classe${classes.length > 1 ? 's' : ''} — cliquez pour afficher le curriculum`}
            </div>
          </div>
          {classeId && (
            <button
              onClick={() => onSelectClasse('')}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid var(--card-border)',
                background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)',
              }}
            >
              Voir toutes les classes
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(139,151,172,0.04)' }}>
                {['Classe / Matière', 'Province', 'Curriculum', 'RA totaux', 'RA planifiés', 'RA enseignés', 'Statut', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '10px 14px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.4px',
                    color: 'var(--text-muted)', textTransform: 'uppercase',
                    borderBottom: '1px solid var(--card-border)', whiteSpace: 'nowrap',
                    textAlign: i >= 3 && i <= 5 ? 'right' : 'left',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classes.map((cls, idx) => (
                <PortfolioRow
                  key={cls.id}
                  cls={cls}
                  programme={programmes[cls.id]}
                  pack={packs[cls.id]}
                  isSelected={classeId === cls.id}
                  onOpen={() => onSelectClasse(cls.id)}
                />
              ))}
              {classes.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Aucune classe disponible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down curriculum classe sélectionnée */}
      {classeId && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, color: '#6C5CE7' }}>
              {classes.find(c => c.id === classeId)?.matiere ?? 'Classe'} — {classes.find(c => c.id === classeId)?.nom}
            </span>
          </div>
          <CurriculumView
            contenu={selectedContenu}
            curriculumCoverage={curriculumCoverage}
            lessonStateMap={lessonStateMap}
            classeId={classeId}
          />
        </div>
      )}
    </div>
  )
}
