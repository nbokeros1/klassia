'use client'

import { useState } from 'react'
import type { ContenuProgramme, CurriculumOutcome, Unite, LeconProgramme } from '@/lib/types/database'
import type { CurriculumCoverageData, CurriculumCoverageItem } from '@/lib/spie/curriculum-coverage'
import type { LessonTeachingState } from '@/lib/types/school-year-dashboard'

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface Props {
  contenu:            ContenuProgramme | undefined
  curriculumCoverage: CurriculumCoverageData | undefined
  lessonStateMap:     Record<string, LessonTeachingState> | undefined
  classeId:           string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusCell(val: boolean | null, nd = false) {
  if (nd || val === null) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  if (val) return <span style={{ color: '#22C55E', fontWeight: 700 }}>✓</span>
  return <span style={{ color: '#EF4444', fontWeight: 600 }}>✗</span>
}

function confidenceTag(c: 'high' | 'medium' | 'low') {
  const cfg = {
    high:   { label: 'Élevée',   color: '#22C55E' },
    medium: { label: 'Moyenne',  color: '#F59E0B' },
    low:    { label: 'Faible',   color: '#94A3B8' },
  }[c]
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color: cfg.color,
      background: `${cfg.color}18`, border: `1px solid ${cfg.color}30`,
      borderRadius: 99, padding: '1px 7px',
    }}>{cfg.label}</span>
  )
}

function lessonStatusBadge(seqIdx: number, leconIdx: number, lecon: LeconProgramme, map?: Record<string, LessonTeachingState>) {
  const key = `${seqIdx}:${leconIdx}`
  const taught = map?.[key]?.isTaught ?? lecon.statut === 'enseignee'
  const prepared = !!lecon.lecon_id
  if (taught)    return <span style={{ fontSize: 10, fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,0.1)', borderRadius: 99, padding: '1px 7px' }}>Enseignée</span>
  if (prepared)  return <span style={{ fontSize: 10, fontWeight: 700, color: '#6C5CE7', background: 'rgba(108,92,231,0.1)', borderRadius: 99, padding: '1px 7px' }}>Préparée</span>
  return           <span style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', background: 'rgba(139,151,172,0.1)', borderRadius: 99, padding: '1px 7px' }}>Planifiée</span>
}

// ─── Panneau de détail RA ─────────────────────────────────────────────────────

function RaDrillPanel({
  item, contenu, lessonStateMap, onClose,
}: {
  item:           CurriculumCoverageItem
  contenu:        ContenuProgramme
  lessonStateMap: Record<string, LessonTeachingState> | undefined
  onClose:        () => void
}) {
  const outcome = item.outcome

  // Trouver les unités liées
  const unitesLiees: { unite: Unite; seqIdx: number; leconIdxs: number[] }[] = []
  for (let si = 0; si < contenu.unites.length; si++) {
    const u = contenu.unites[si]
    const seqCovers = u.curriculum_outcome_ids?.includes(outcome.id) ?? false
    const leconIdxs: number[] = []
    for (let li = 0; li < u.lecons.length; li++) {
      if (u.lecons[li].curriculum_outcome_ids?.includes(outcome.id)) leconIdxs.push(li)
    }
    if (seqCovers || leconIdxs.length > 0) {
      unitesLiees.push({ unite: u, seqIdx: si, leconIdxs })
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div
        style={{
          width: '100%', maxWidth: 720, maxHeight: '85vh', overflow: 'auto',
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: 16, padding: 32,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
          {outcome.code && (
            <span style={{
              flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#6C5CE7',
              background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.2)',
              borderRadius: 8, padding: '4px 10px', marginTop: 2,
            }}>{outcome.code}</span>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Résultat d&apos;apprentissage
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.45 }}>
              {outcome.titre}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ flexShrink: 0, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: 4 }}
          >✕</button>
        </div>

        {/* Description complète */}
        {outcome.description && outcome.description !== outcome.titre && (
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            background: 'rgba(108,92,231,0.04)', border: '1px solid rgba(108,92,231,0.12)',
            fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 24,
          }}>
            {outcome.description}
          </div>
        )}

        {/* Statut + fiabilité */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {item.isPlanified && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '3px 10px' }}>
              Planifié
            </span>
          )}
          {item.isPrepared && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6C5CE7', background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)', borderRadius: 6, padding: '3px 10px' }}>
              Préparé
            </span>
          )}
          {item.isTaught && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '3px 10px' }}>
              Enseigné
            </span>
          )}
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            Fiabilité couverture : {confidenceTag(item.coverageConfidence)}
          </span>
        </div>

        {/* Chaîne de provenance */}
        <div style={{ marginBottom: 8, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Chaîne pédagogique
        </div>

        {unitesLiees.length === 0 ? (
          <div style={{ padding: '16px', background: 'rgba(139,151,172,0.04)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Ce résultat n&apos;est associé à aucune séquence ou leçon planifiée.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {unitesLiees.map(({ unite, seqIdx, leconIdxs }) => (
              <div
                key={seqIdx}
                style={{
                  border: '1px solid var(--card-border)', borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
                {/* Unité header */}
                <div style={{
                  padding: '12px 16px', background: 'rgba(108,92,231,0.04)',
                  borderBottom: '1px solid var(--card-border)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: 'rgba(108,92,231,0.12)',
                    fontSize: 10.5, fontWeight: 800, color: '#6C5CE7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>U{unite.numero}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{unite.titre}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Semaines {unite.semaine_debut}–{unite.semaine_fin}
                    </div>
                  </div>
                  {leconIdxs.length === 0 && (
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Via séquence entière
                    </span>
                  )}
                </div>

                {/* Leçons liées */}
                {leconIdxs.length > 0 ? (
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {leconIdxs.map(li => {
                      const l = unite.lecons[li]
                      if (!l) return null
                      return (
                        <div
                          key={li}
                          style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', minWidth: 32 }}>
                            L{l.numero}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{l.titre}</span>
                          {lessonStatusBadge(seqIdx, li, l, lessonStateMap)}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {unite.lecons.map((l, li) => (
                      <div key={li} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', minWidth: 32 }}>L{l.numero}</span>
                        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', flex: 1 }}>{l.titre}</span>
                        {lessonStatusBadge(seqIdx, li, l, lessonStateMap)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Vue V1 (pas de curriculum_outcomes) ──────────────────────────────────────

function V1CurriculumView({ contenu, classeId }: { contenu: ContenuProgramme | undefined; classeId: string }) {
  const raList = contenu ? [] as string[] : []

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 12, padding: '24px',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
        Curriculum
      </div>
      <div style={{
        padding: '12px 16px', borderRadius: 8,
        background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
        fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20,
      }}>
        La vue Curriculum enrichie (résultats d&apos;apprentissage avec traçabilité) est disponible pour les programmes V2.
        Ce programme utilise le format V1 — les RA sont issus du syllabus.
      </div>
      <a
        href={`/dashboard/classes/${classeId}/programme?tab=curriculum`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '10px 18px', borderRadius: 8, textDecoration: 'none',
          background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)',
          color: '#6C5CE7', fontSize: 13, fontWeight: 600,
        }}
      >
        Voir le curriculum complet →
      </a>
    </div>
  )
}

// ─── CurriculumView ───────────────────────────────────────────────────────────

export default function CurriculumView({ contenu, curriculumCoverage, lessonStateMap, classeId }: Props) {
  const [selectedItem, setSelectedItem] = useState<CurriculumCoverageItem | null>(null)

  const hasV2 = curriculumCoverage?.hasV2Data && (curriculumCoverage.items.length > 0)

  if (!hasV2) return <V1CurriculumView contenu={contenu} classeId={classeId} />

  const items = curriculumCoverage!.items
  const totalRA = items.length
  const planified = items.filter(i => i.isPlanified).length
  const taught = items.filter(i => i.isTaught).length

  const TH = ({ children, align = 'left' }: { children?: React.ReactNode; align?: string }) => (
    <th style={{
      padding: '10px 14px', textAlign: align as 'left' | 'right' | 'center',
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.4px',
      color: 'var(--text-muted)', textTransform: 'uppercase',
      borderBottom: '1px solid var(--card-border)', whiteSpace: 'nowrap',
    }}>{children}</th>
  )

  return (
    <>
      {selectedItem && contenu && (
        <RaDrillPanel
          item={selectedItem}
          contenu={contenu}
          lessonStateMap={lessonStateMap}
          onClose={() => setSelectedItem(null)}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Métriques rapides */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Résultats d\'apprentissage', value: totalRA, color: undefined },
            { label: 'Planifiés', value: planified, color: planified === totalRA ? '#22C55E' : '#F59E0B' },
            { label: 'Enseignés', value: taught, color: taught > 0 ? '#22C55E' : '#94A3B8' },
            { label: 'À enseigner', value: totalRA - taught, color: totalRA - taught > 0 ? '#F59E0B' : '#22C55E' },
          ].map(m => (
            <div key={m.label} style={{
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: 10, padding: '12px 18px', flex: '1 1 120px',
            }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: m.color ?? 'var(--text-primary)', lineHeight: 1.1 }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Table RA */}
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Tableau de couverture du curriculum
            </span>
            <a
              href={`/dashboard/classes/${classeId}/programme?tab=curriculum`}
              style={{ fontSize: 12, fontWeight: 600, color: '#6C5CE7', textDecoration: 'none' }}
            >
              Vue complète →
            </a>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'rgba(139,151,172,0.04)' }}>
                  <TH>Résultat d&apos;apprentissage</TH>
                  <TH align="center">Planifié</TH>
                  <TH align="center">Préparé</TH>
                  <TH align="center">Enseigné</TH>
                  <TH align="center">Fiabilité</TH>
                  <TH>Planifié dans</TH>
                  <TH></TH>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={item.outcome.id}
                    style={{
                      borderBottom: idx < items.length - 1 ? '1px solid var(--card-border)' : '',
                      cursor: 'pointer', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(108,92,231,0.04)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = '' }}
                    onClick={() => setSelectedItem(item)}
                  >
                    {/* RA */}
                    <td style={{ padding: '12px 14px', maxWidth: 320 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        {item.outcome.code && (
                          <span style={{
                            flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#6C5CE7',
                            background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.15)',
                            borderRadius: 6, padding: '1px 7px', marginTop: 1,
                          }}>
                            {item.outcome.code}
                          </span>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                            {item.outcome.titre}
                          </div>
                          {item.outcome.description && item.outcome.description !== item.outcome.titre && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                              {item.outcome.description.length > 90
                                ? item.outcome.description.slice(0, 90) + '…'
                                : item.outcome.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>{statusCell(item.isPlanified)}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>{statusCell(item.isPrepared, !item.isPlanified)}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>{statusCell(item.isTaught, !item.isPlanified)}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>{confidenceTag(item.coverageConfidence)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {item.sequences.length === 0 ? (
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>Non planifié</span>
                      ) : (
                        item.sequences.map((s, si) => (
                          <div key={si} style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>U{s.sequenceNumero}</span>
                            {' '}{s.sequenceTitre.length > 30 ? s.sequenceTitre.slice(0, 30) + '…' : s.sequenceTitre}
                            {s.leconNumeros.length > 0 && (
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                                {' '}(L{s.leconNumeros.join(', ')})
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#6C5CE7' }}>Détail →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
