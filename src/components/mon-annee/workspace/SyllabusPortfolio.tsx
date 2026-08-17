'use client'

import { useState, useMemo } from 'react'
import type { Classe, ProgrammeAnnuel } from '@/lib/types/database'
import type { TeachingPack, PackSyllabus } from '@/lib/types/teaching-pack'
import { getSyllabusCompleteness } from '@/lib/spie/syllabus-v3'
import SyllabusViewer from '@/components/build-year/SyllabusViewer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  classes:    Classe[]
  programmes: Record<string, ProgrammeAnnuel>
  packs:      Record<string, TeachingPack>
  classeId:   string | null
  onSelectClasse: (id: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSyllabus(
  pack: TeachingPack | undefined,
  programme: ProgrammeAnnuel | undefined,
): PackSyllabus | null {
  const fromPack = pack?.contenu_json?.syllabus
  if (fromPack) return fromPack as PackSyllabus
  const fromProg = programme?.syllabus_json
  if (fromProg && typeof fromProg === 'object' && 'titre_cours' in fromProg) {
    return fromProg as PackSyllabus
  }
  return null
}

function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Prêt',       color: '#22C55E' }
  if (score >= 50) return { label: 'À compléter', color: '#F59E0B' }
  return               { label: 'À revoir',       color: '#EF4444' }
}

function ScoreBar({ score }: { score: number }) {
  const { color } = scoreLabel(score)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 72, height: 4, borderRadius: 99, background: 'rgba(139,151,172,0.15)', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36 }}>{score}%</span>
    </div>
  )
}

// ─── Ligne portfolio ──────────────────────────────────────────────────────────

function PortfolioRow({
  cls, pack, programme, isSelected, onOpen,
}: {
  cls:        Classe
  pack:       TeachingPack | undefined
  programme:  ProgrammeAnnuel | undefined
  isSelected: boolean
  onOpen:     () => void
}) {
  const syllabus = getSyllabus(pack, programme)
  const completeness = useMemo(() =>
    syllabus ? getSyllabusCompleteness(syllabus) : null,
  [syllabus])
  const score = completeness?.score ?? null
  const sl = score !== null ? scoreLabel(score) : null

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
      {/* Classe */}
      <td style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: isSelected ? '#6C5CE7' : 'var(--text-primary)' }}>
          {cls.matiere}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cls.nom} · {cls.niveau}</div>
      </td>

      {/* Titre syllabus */}
      <td style={{ padding: '14px', fontSize: 12.5, color: 'var(--text-secondary)', maxWidth: 200 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {syllabus?.titre_cours ?? <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>—</span>}
        </div>
      </td>

      {/* Complétude */}
      <td style={{ padding: '14px' }}>
        {score !== null
          ? <ScoreBar score={score} />
          : <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Non disponible</span>}
      </td>

      {/* Statut */}
      <td style={{ padding: '14px' }}>
        {sl ? (
          <span style={{
            fontSize: 10.5, fontWeight: 700, color: sl.color,
            background: `${sl.color}12`, border: `1px solid ${sl.color}25`,
            borderRadius: 99, padding: '2px 8px',
          }}>{sl.label}</span>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Absent</span>
        )}
      </td>

      {/* Sections incomplètes */}
      <td style={{ padding: '14px', fontSize: 12, color: 'var(--text-muted)' }}>
        {completeness ? (() => {
          const sections = completeness.sections
          const low = Object.entries(sections).filter(([, v]) => (v as number) < 50)
          if (low.length === 0) return <span style={{ color: '#22C55E' }}>Complètes</span>
          return <span>{low.length} section{low.length > 1 ? 's' : ''} à compléter</span>
        })() : '—'}
      </td>

      {/* Action */}
      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#6C5CE7' }}>
          {isSelected ? 'Affiché' : syllabus ? 'Voir →' : 'Aucun syllabus'}
        </span>
      </td>
    </tr>
  )
}

// ─── SyllabusPortfolio ────────────────────────────────────────────────────────

export default function SyllabusPortfolio({
  classes, programmes, packs, classeId, onSelectClasse,
}: Props) {

  const selectedPack      = classeId ? packs[classeId] : undefined
  const selectedProgramme = classeId ? programmes[classeId] : undefined
  const selectedSyllabus  = getSyllabus(selectedPack, selectedProgramme)
  const teachingPackId    = selectedPack?.id ?? null
  const programmeAnnuelId = selectedPack?.programme_annuel_id ?? selectedProgramme?.id ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Portfolio table */}
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
              Syllabus — Mes classes
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {classeId
                ? 'Classe sélectionnée — syllabus affiché ci-dessous'
                : `${classes.length} classe${classes.length > 1 ? 's' : ''} — cliquez pour afficher le syllabus`}
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
                {['Classe / Matière', 'Titre du syllabus', 'Complétude', 'Statut', 'Sections', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '10px 14px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.4px',
                    color: 'var(--text-muted)', textTransform: 'uppercase',
                    borderBottom: '1px solid var(--card-border)', whiteSpace: 'nowrap', textAlign: 'left',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classes.map(cls => (
                <PortfolioRow
                  key={cls.id}
                  cls={cls}
                  pack={packs[cls.id]}
                  programme={programmes[cls.id]}
                  isSelected={classeId === cls.id}
                  onOpen={() => onSelectClasse(cls.id)}
                />
              ))}
              {classes.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Aucune classe disponible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Syllabus viewer pour la classe sélectionnée */}
      {classeId && selectedSyllabus && teachingPackId && programmeAnnuelId && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderRadius: 10,
            background: 'rgba(108,92,231,0.04)', border: '1px solid rgba(108,92,231,0.12)',
            marginBottom: 16, flexWrap: 'wrap', gap: 10,
          }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
              Syllabus — lecture seule dans ce contexte.
            </div>
            <a
              href={`/dashboard/classes/${classeId}/programme?tab=syllabus`}
              style={{ fontSize: 12, fontWeight: 600, color: '#6C5CE7', textDecoration: 'none' }}
            >
              Modifier le syllabus →
            </a>
          </div>
          <SyllabusViewer
            syllabus={selectedSyllabus}
            teachingPackId={teachingPackId}
            programmeAnnuelId={programmeAnnuelId}
          />
        </div>
      )}

      {classeId && !selectedSyllabus && (
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: 12, padding: '40px 32px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Syllabus non disponible
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 400, margin: '0 auto 20px' }}>
            Le syllabus est généré lors de la construction de l&apos;année scolaire.
          </div>
          <a
            href={`/dashboard/classes/${classeId}/programme?tab=syllabus`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 8, textDecoration: 'none',
              background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.2)',
              color: '#6C5CE7', fontSize: 13, fontWeight: 600,
            }}
          >
            Construire mon année →
          </a>
        </div>
      )}
    </div>
  )
}
