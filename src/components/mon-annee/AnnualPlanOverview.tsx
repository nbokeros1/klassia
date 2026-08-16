'use client'

import { useState } from 'react'
import type { SequenceProgress, SequenceStatut, LessonTeachingState } from '@/lib/types/school-year-dashboard'
import type { LeconProgramme } from '@/lib/types/database'
import MarkTaughtModal from '@/components/mon-annee/MarkTaughtModal'
import { makeLessonKey } from '@/lib/spie/teaching-events'

interface Props {
  sequences:          SequenceProgress[]
  classeId:           string | null
  programmeAnnuelId?: string | null
  teachingPackId?:    string | null
  lessonStateMap?:    Record<string, LessonTeachingState>
  onTaughtUpdated?:   () => void
}

const STATUT_CONFIG: Record<SequenceStatut, { label: string; color: string; bg: string; dot: string }> = {
  terminee: { label: 'Terminée',  color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   dot: '#22C55E' },
  en_cours: { label: 'En cours',  color: '#6C5CE7', bg: 'rgba(108,92,231,0.1)', dot: '#6C5CE7' },
  a_venir:  { label: 'À venir',   color: '#8B97AC', bg: 'rgba(139,151,172,0.1)', dot: '#8B97AC' },
}

const ROLE_LABEL: Record<string, string> = {
  introduction:      'Intro',
  acquisition:       'Acq.',
  pratique:          'Pratique',
  approfondissement: 'Appro.',
  integration:       'Intégr.',
  evaluation:        'Éval.',
  autre:             'Autre',
}

function ProgressBar({ pct, statut }: { pct: number; statut: SequenceStatut }) {
  const color = STATUT_CONFIG[statut].dot
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: 'rgba(139,151,172,0.15)', borderRadius: 99 }}>
        <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: color, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, minWidth: 32, textAlign: 'right' }}>{pct} %</span>
    </div>
  )
}

type ModalTarget = { lecon: LeconProgramme; seqIdx: number; leconIdx: number }

export default function AnnualPlanOverview({
  sequences, classeId, programmeAnnuelId, teachingPackId, lessonStateMap, onTaughtUpdated,
}: Props) {
  const [expandedSeq,    setExpandedSeq]    = useState<number | null>(null)
  const [modalTarget,    setModalTarget]    = useState<ModalTarget | null>(null)

  // Optimistic overrides : LessonTeachingState locaux en attendant le rechargement serveur
  const [localStateOverrides, setLocalStateOverrides] = useState<Record<string, LessonTeachingState>>({})

  function resolveLeconState(seqIdx: number, leconIdx: number, fallback: LeconProgramme): LessonTeachingState {
    const k = makeLessonKey(seqIdx, leconIdx)
    return localStateOverrides[k] ?? lessonStateMap?.[k] ?? {
      isTaught: fallback.statut === 'enseignee',
      taughtAt: fallback.date_enseignee ?? null,
      note:     fallback.note_enseignement ?? null,
      source:   'legacy',
    }
  }

  function handleModalDone(newState: LessonTeachingState) {
    if (!modalTarget) return
    const k = makeLessonKey(modalTarget.seqIdx, modalTarget.leconIdx)
    setLocalStateOverrides(prev => ({ ...prev, [k]: newState }))
    setModalTarget(null)
    onTaughtUpdated?.()
  }

  const sectionStyle: React.CSSProperties = {
    background: 'var(--card-bg)', backdropFilter: 'blur(var(--card-blur))',
    border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)',
    padding: '24px 28px',
  }

  return (
    <>
      {modalTarget && programmeAnnuelId && teachingPackId && (
        <MarkTaughtModal
          lecon={modalTarget.lecon}
          seqIdx={modalTarget.seqIdx}
          leconIdx={modalTarget.leconIdx}
          teachingPackId={teachingPackId}
          programmeAnnuelId={programmeAnnuelId}
          currentState={resolveLeconState(modalTarget.seqIdx, modalTarget.leconIdx, modalTarget.lecon)}
          onDone={handleModalDone}
          onCancel={() => setModalTarget(null)}
        />
      )}

      <div style={sectionStyle}>
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
              Plan annuel
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
              Votre plan de cours
            </h2>
          </div>
          {classeId && (
            <a href={`/dashboard/classes/${classeId}/programme?tab=plan_annuel`}
               style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--violet)', textDecoration: 'none' }}>
              Vue complète →
            </a>
          )}
        </div>

        {sequences.length === 0 ? (
          <div style={{
            padding: '40px 20px', textAlign: 'center',
            color: 'var(--text-muted)', fontSize: 14,
            background: 'rgba(139,151,172,0.04)', borderRadius: 10,
            border: '1px dashed rgba(139,151,172,0.25)',
          }}>
            Aucune séquence disponible — construisez votre année pour afficher le plan.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['#', 'Séquence', 'Période', 'Leçons', 'Progression', 'Statut', ''].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '8px 12px', fontSize: 10.5,
                      fontWeight: 700, letterSpacing: '0.4px', color: 'var(--text-muted)',
                      textTransform: 'uppercase', borderBottom: '1px solid rgba(139,151,172,0.15)',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sequences.map((seq, idx) => {
                  const sc = STATUT_CONFIG[seq.statut]
                  const isExpanded = expandedSeq === seq.numero
                  const hasLecons  = seq.uniteData.lecons.length > 0

                  return (
                    <>
                      {/* ── Ligne séquence ────────────────────────────────────── */}
                      <tr
                        key={`seq-${seq.numero}`}
                        onClick={() => hasLecons && setExpandedSeq(isExpanded ? null : seq.numero)}
                        style={{
                          borderBottom: isExpanded ? 'none' : idx < sequences.length - 1 ? '1px solid rgba(139,151,172,0.1)' : 'none',
                          cursor: hasLecons ? 'pointer' : 'default',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (hasLecons) (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(139,151,172,0.04)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = '' }}
                      >
                        {/* Numéro + expand toggle */}
                        <td style={{ padding: '14px 12px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, marginRight: 6 }}>
                            {seq.numero}
                          </span>
                          {hasLecons && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', transition: 'transform 0.2s', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : '' }}>
                              ▶
                            </span>
                          )}
                        </td>

                        {/* Titre + objectif + justification V2 */}
                        <td style={{ padding: '14px 12px', maxWidth: 300 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                            {seq.titre}
                          </div>
                          {seq.objectif && (
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                              {seq.objectif.length > 80 ? seq.objectif.slice(0, 80) + '…' : seq.objectif}
                            </div>
                          )}
                          {seq.uniteData.justification_pedagogique && (
                            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.35, marginTop: 3, fontStyle: 'italic', opacity: 0.7 }}>
                              {seq.uniteData.justification_pedagogique.length > 72
                                ? seq.uniteData.justification_pedagogique.slice(0, 72) + '…'
                                : seq.uniteData.justification_pedagogique}
                            </div>
                          )}
                        </td>

                        {/* Période */}
                        <td style={{ padding: '14px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: 12 }}>
                          Sem. {seq.semaineDebut}–{seq.semaineFin}
                        </td>

                        {/* Leçons */}
                        <td style={{ padding: '14px 12px', color: 'var(--text-secondary)', textAlign: 'center', fontSize: 12 }}>
                          {seq.totalLecons}
                        </td>

                        {/* Barre */}
                        <td style={{ padding: '14px 12px', minWidth: 140 }}>
                          <ProgressBar pct={seq.progressPct} statut={seq.statut} />
                        </td>

                        {/* Statut badge */}
                        <td style={{ padding: '14px 12px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '3px 10px',
                            borderRadius: 99, color: sc.color, background: sc.bg,
                          }}>
                            {sc.label}
                          </span>
                        </td>

                        {/* CTA */}
                        <td style={{ padding: '14px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {classeId && (
                            <a
                              href={`/dashboard/classes/${classeId}/programme?tab=sequences`}
                              onClick={e => e.stopPropagation()}
                              style={{ fontSize: 12, fontWeight: 600, color: 'var(--violet)', textDecoration: 'none' }}
                            >
                              Détail →
                            </a>
                          )}
                        </td>
                      </tr>

                      {/* ── Lignes leçons (expandable) ─────────────────────────── */}
                      {isExpanded && seq.uniteData.lecons.map((rawLecon, li) => {
                        const state      = resolveLeconState(seq.seqIdx, li, rawLecon)
                        const isPrepared = !!rawLecon.lecon_id
                        const isTaught   = state.isTaught
                        const canMark    = !!programmeAnnuelId && !!teachingPackId

                        return (
                          <tr
                            key={`lecon-${seq.numero}-${li}`}
                            style={{
                              background: 'rgba(139,151,172,0.025)',
                              borderBottom: li < seq.uniteData.lecons.length - 1
                                ? '1px solid rgba(139,151,172,0.05)'
                                : '1px solid rgba(139,151,172,0.1)',
                            }}
                          >
                            {/* Numéro leçon */}
                            <td style={{ padding: '10px 12px 10px 24px', verticalAlign: 'top' }}>
                              <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>
                                L{rawLecon.numero}
                              </span>
                            </td>

                            {/* Titre + objectif d'apprentissage V2 */}
                            <td style={{ padding: '10px 12px', maxWidth: 300, verticalAlign: 'top' }}>
                              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
                                {rawLecon.titre}
                              </div>
                              {rawLecon.objectif_apprentissage && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.35, fontStyle: 'italic' }}>
                                  {rawLecon.objectif_apprentissage.length > 70
                                    ? rawLecon.objectif_apprentissage.slice(0, 70) + '…'
                                    : rawLecon.objectif_apprentissage}
                                </div>
                              )}
                              {isTaught && state.taughtAt && (
                                <div style={{ fontSize: 10.5, color: '#16A34A', marginTop: 3 }}>
                                  Enseignée le {state.taughtAt}
                                </div>
                              )}
                            </td>

                            {/* Durée */}
                            <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-muted)', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                              {rawLecon.duree_minutes} min
                            </td>

                            {/* Progression role */}
                            <td style={{ padding: '10px 12px', textAlign: 'center', verticalAlign: 'top' }}>
                              {rawLecon.progression_role ? (
                                <span style={{
                                  fontSize: 10, fontWeight: 600, padding: '2px 7px',
                                  borderRadius: 99, background: 'rgba(108,92,231,0.08)',
                                  color: 'var(--violet)', whiteSpace: 'nowrap',
                                }}>
                                  {ROLE_LABEL[rawLecon.progression_role] ?? rawLecon.progression_role}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                              )}
                            </td>

                            {/* Statuts : Préparé / Enseignée */}
                            <td colSpan={2} style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                {isPrepared && (
                                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>
                                    Préparée
                                  </span>
                                )}
                                {isTaught && (
                                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: 'rgba(34,197,94,0.15)', color: '#16A34A' }}>
                                    Enseignée ✓
                                  </span>
                                )}
                                {!isPrepared && !isTaught && (
                                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>À préparer</span>
                                )}

                                {canMark && (
                                  <button
                                    onClick={e => {
                                      e.stopPropagation()
                                      setModalTarget({ lecon: rawLecon, seqIdx: seq.seqIdx, leconIdx: li })
                                    }}
                                    style={{
                                      fontSize: 10, fontWeight: 600,
                                      padding: '2px 8px', borderRadius: 99, cursor: 'pointer',
                                      background: isTaught ? 'rgba(239,68,68,0.08)' : 'rgba(108,92,231,0.1)',
                                      border: isTaught ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(108,92,231,0.2)',
                                      color: isTaught ? '#EF4444' : 'var(--violet)',
                                      marginLeft: 2,
                                    }}
                                  >
                                    {isTaught ? 'Annuler ✕' : '+ Enseigner'}
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* CTA leçon */}
                            <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'top' }}>
                              {classeId && rawLecon.lecon_id && (
                                <a
                                  href={`/dashboard/classes/${classeId}/lecon/${rawLecon.lecon_id}`}
                                  style={{ fontSize: 11, fontWeight: 600, color: 'var(--violet)', textDecoration: 'none' }}
                                >
                                  Ouvrir →
                                </a>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
