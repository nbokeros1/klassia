'use client'

import { useState } from 'react'
import type { SequenceProgress, SequenceStatut, LessonTeachingState } from '@/lib/types/school-year-dashboard'
import type { LeconProgramme } from '@/lib/types/database'
import { makeLessonKey } from '@/lib/spie/teaching-events'

interface Props {
  sequences:         SequenceProgress[]
  anneeScolaire?:    string
  classeId:          string
  programmeAnnuelId: string | null
  teachingPackId:    string | null
  lessonStateMap?:   Record<string, LessonTeachingState>
  onMarkTaught?:     (lecon: LeconProgramme, seqIdx: number, leconIdx: number) => void
}

const STATUT_CFG: Record<SequenceStatut, { label: string; color: string; bg: string }> = {
  terminee: { label: 'Terminée',  color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  en_cours: { label: 'En cours',  color: '#6C5CE7', bg: 'rgba(108,92,231,0.1)' },
  a_venir:  { label: 'À venir',   color: '#8B97AC', bg: 'rgba(139,151,172,0.1)' },
}

export default function AnnualFlightPlan({
  sequences, anneeScolaire, classeId,
  programmeAnnuelId, teachingPackId, lessonStateMap, onMarkTaught,
}: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(sequences.filter(s => s.statut === 'en_cours').map(s => s.seqIdx))
  )

  function toggle(seqIdx: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(seqIdx) ? next.delete(seqIdx) : next.add(seqIdx)
      return next
    })
  }

  if (sequences.length === 0) {
    return (
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 'var(--radius-lg)', padding: '40px 32px', textAlign: 'center',
        color: 'var(--text-muted)', fontSize: 14,
      }}>
        Aucune séquence — construisez votre année pour afficher le plan de vol.
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    }}>
      {/* En-tête */}
      <div style={{
        padding: '20px 28px 16px', borderBottom: '1px solid var(--card-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
            Roadmap
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Plan de vol {anneeScolaire ?? ''}
          </h2>
        </div>
        <a href={`/dashboard/classes/${classeId}/programme?tab=plan_annuel`}
           style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--violet)', textDecoration: 'none' }}>
          Vue complète →
        </a>
      </div>

      {/* Tableau */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(139,151,172,0.04)' }}>
              {['', 'Séquence', 'Semaines', 'Préparées', 'Enseignées', 'Statut'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '10px 16px', fontSize: 10.5,
                  fontWeight: 700, letterSpacing: '0.4px', color: 'var(--text-muted)',
                  textTransform: 'uppercase', borderBottom: '1px solid rgba(139,151,172,0.1)',
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sequences.map((seq, rowIdx) => {
              const sc          = STATUT_CFG[seq.statut]
              const isExpanded  = expanded.has(seq.seqIdx)
              const hasLecons   = seq.uniteData.lecons.length > 0
              const preparedCnt = seq.uniteData.lecons.filter(l => !!l.lecon_id).length
              const canMark     = !!programmeAnnuelId && !!teachingPackId

              return [
                /* ── Ligne séquence ──────────────────────────────────── */
                <tr
                  key={`seq-${seq.seqIdx}`}
                  aria-expanded={isExpanded}
                  onClick={() => hasLecons && toggle(seq.seqIdx)}
                  style={{
                    borderBottom: isExpanded ? 'none' : rowIdx < sequences.length - 1 ? '1px solid rgba(139,151,172,0.08)' : 'none',
                    cursor: hasLecons ? 'pointer' : 'default',
                    transition: 'background 0.12s',
                    background: seq.statut === 'en_cours' ? 'rgba(108,92,231,0.025)' : '',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(139,151,172,0.04)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = seq.statut === 'en_cours' ? 'rgba(108,92,231,0.025)' : '' }}
                >
                  {/* Toggle + numéro */}
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', width: 56 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {hasLecons && (
                        <span aria-hidden="true" style={{
                          fontSize: 9, color: 'var(--text-muted)', display: 'inline-block',
                          transform: isExpanded ? 'rotate(90deg)' : '', transition: 'transform 0.2s',
                        }}>▶</span>
                      )}
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                        {seq.numero}
                      </span>
                    </div>
                  </td>

                  {/* Titre + objectif */}
                  <td style={{ padding: '14px 16px', maxWidth: 320 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{seq.titre}</div>
                    {seq.objectif && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.35 }}>
                        {seq.objectif.length > 72 ? seq.objectif.slice(0, 72) + '…' : seq.objectif}
                      </div>
                    )}
                  </td>

                  {/* Semaines */}
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {seq.semaineDebut}–{seq.semaineFin}
                  </td>

                  {/* Préparées */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: preparedCnt > 0 ? '#22C55E' : 'var(--text-muted)' }}>
                      {preparedCnt}/{seq.totalLecons}
                    </span>
                  </td>

                  {/* Enseignées */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: seq.taughtLecons > 0 ? '#3B82F6' : 'var(--text-muted)' }}>
                      {seq.taughtLecons}/{seq.totalLecons}
                    </span>
                  </td>

                  {/* Statut */}
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px',
                      borderRadius: 99, color: sc.color, background: sc.bg,
                      whiteSpace: 'nowrap',
                    }}>
                      {sc.label}
                    </span>
                  </td>
                </tr>,

                /* ── Lignes leçons (expandable) ──────────────────────── */
                ...(isExpanded ? seq.uniteData.lecons.map((l, li) => {
                  const key       = makeLessonKey(seq.seqIdx, li)
                  const isTaught  = lessonStateMap
                    ? (lessonStateMap[key]?.isTaught ?? l.statut === 'enseignee')
                    : l.statut === 'enseignee'
                  const taughtAt  = lessonStateMap?.[key]?.taughtAt
                  const isPrepared = !!l.lecon_id

                  return (
                    <tr key={`lecon-${seq.seqIdx}-${li}`} style={{
                      background: 'rgba(139,151,172,0.02)',
                      borderBottom: li < seq.uniteData.lecons.length - 1
                        ? '1px solid rgba(139,151,172,0.05)'
                        : '1px solid rgba(139,151,172,0.1)',
                    }}>
                      {/* Indent + numéro */}
                      <td style={{ padding: '9px 16px 9px 28px' }}>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>L{l.numero}</span>
                      </td>

                      {/* Titre leçon */}
                      <td style={{ padding: '9px 16px', maxWidth: 300 }} colSpan={1}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: isTaught ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isTaught ? 'line-through' : 'none' }}>
                          {l.titre}
                        </div>
                        {taughtAt && (
                          <div style={{ fontSize: 10, color: '#22C55E', marginTop: 2 }}>
                            Enseignée le {taughtAt}
                          </div>
                        )}
                      </td>

                      {/* Durée */}
                      <td style={{ padding: '9px 16px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {l.duree_minutes} min
                      </td>

                      {/* Préparée */}
                      <td style={{ padding: '9px 16px', textAlign: 'center' }}>
                        {isPrepared ? (
                          <span style={{ fontSize: 10, color: '#22C55E', fontWeight: 700 }}>✓</span>
                        ) : (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Enseignée + action */}
                      <td style={{ padding: '9px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                          {isTaught ? (
                            <span style={{ fontSize: 10, color: '#22C55E', fontWeight: 700 }}>✓</span>
                          ) : (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>—</span>
                          )}
                          {canMark && onMarkTaught && (
                            <button
                              onClick={e => { e.stopPropagation(); onMarkTaught(l, seq.seqIdx, li) }}
                              style={{
                                fontSize: 9.5, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                                cursor: 'pointer',
                                background: isTaught ? 'rgba(239,68,68,0.07)' : 'rgba(108,92,231,0.08)',
                                border: isTaught ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(108,92,231,0.18)',
                                color: isTaught ? '#EF4444' : '#6C5CE7',
                              }}
                            >
                              {isTaught ? '✕' : '+'}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Lien */}
                      <td style={{ padding: '9px 16px' }}>
                        {isPrepared && l.lecon_id ? (
                          <a href={`/dashboard/classes/${classeId}/lecon/${l.lecon_id}`}
                             style={{ fontSize: 11, fontWeight: 600, color: 'var(--violet)', textDecoration: 'none' }}>
                            Ouvrir →
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  )
                }) : []),
              ]
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
