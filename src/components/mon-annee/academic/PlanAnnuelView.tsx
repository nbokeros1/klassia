'use client'

import { useState } from 'react'
import type { ContenuProgramme, Unite, LeconProgramme } from '@/lib/types/database'
import type { LessonTeachingState } from '@/lib/types/school-year-dashboard'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  contenu:        ContenuProgramme | undefined
  lessonStateMap: Record<string, LessonTeachingState> | undefined
  classeId:       string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeUniteProgress(
  unite: Unite,
  seqIdx: number,
  lessonStateMap: Record<string, LessonTeachingState> | undefined,
): { taught: number; total: number; pct: number } {
  const total = unite.lecons.length
  if (total === 0) return { taught: 0, total: 0, pct: 0 }
  let taught = 0
  for (let li = 0; li < total; li++) {
    const key = `${seqIdx}:${li}`
    const state = lessonStateMap?.[key]
    if (state?.isTaught || unite.lecons[li]?.statut === 'enseignee') taught++
  }
  return { taught, total, pct: Math.round((taught / total) * 100) }
}

function progressColor(pct: number): string {
  if (pct === 100) return '#22C55E'
  if (pct > 0)     return '#6C5CE7'
  return 'rgba(139,151,172,0.25)'
}

function lessonBadge(lecon: LeconProgramme, seqIdx: number, leconIdx: number, map?: Record<string, LessonTeachingState>) {
  const key = `${seqIdx}:${leconIdx}`
  const taught = map?.[key]?.isTaught ?? lecon.statut === 'enseignee'
  const prep = !!lecon.lecon_id
  if (taught) return { label: 'Enseignée', color: '#22C55E' }
  if (prep)   return { label: 'Préparée',  color: '#6C5CE7' }
  return        { label: 'Planifiée',      color: '#94A3B8' }
}

// ─── Carte unité ──────────────────────────────────────────────────────────────

function UniteCard({
  unite, seqIdx, lessonStateMap, classeId,
}: {
  unite:          Unite
  seqIdx:         number
  lessonStateMap: Record<string, LessonTeachingState> | undefined
  classeId:       string
}) {
  const [expanded, setExpanded] = useState(false)
  const progress = computeUniteProgress(unite, seqIdx, lessonStateMap)
  const duree = unite.semaine_fin - unite.semaine_debut + 1
  const hasV2 = !!(unite.justification_pedagogique || unite.grandes_idees?.length || unite.curriculum_outcome_ids?.length)

  const statusColor = progress.pct === 100 ? '#22C55E' : progress.pct > 0 ? '#6C5CE7' : '#94A3B8'
  const statusLabel = progress.pct === 100 ? 'Terminée' : progress.pct > 0 ? 'En cours' : 'À venir'

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', padding: '20px 24px', textAlign: 'left',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'flex-start', gap: 16,
        }}
      >
        {/* Numéro */}
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: 'rgba(108,92,231,0.10)', border: '1px solid rgba(108,92,231,0.20)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: '#6C5CE7', marginTop: 2,
        }}>
          U{unite.numero}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              {unite.titre}
            </span>
            <span style={{
              fontSize: 10.5, fontWeight: 700, color: statusColor,
              background: `${statusColor}15`, border: `1px solid ${statusColor}30`,
              borderRadius: 99, padding: '2px 9px', flexShrink: 0,
            }}>
              {statusLabel}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Sem. {unite.semaine_debut}–{unite.semaine_fin} · {duree} semaine{duree !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {unite.lecons.length} leçon{unite.lecons.length !== 1 ? 's' : ''}
            </span>

            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 140px', minWidth: 140 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(139,151,172,0.12)' }}>
                <div style={{
                  height: '100%', borderRadius: 99, transition: 'width 0.3s',
                  width: `${progress.pct}%`,
                  background: progressColor(progress.pct),
                }} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: statusColor, minWidth: 36 }}>
                {progress.taught}/{progress.total}
              </span>
            </div>
          </div>
        </div>

        <span style={{
          fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginTop: 4,
          transform: expanded ? 'rotate(180deg)' : '', transition: 'transform 0.2s',
        }}>▼</span>
      </button>

      {/* Contenu expandé */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--card-border)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>

            {/* Colonne info pédagogique */}
            <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Objectifs */}
              {unite.objectifs.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Objectifs
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {unite.objectifs.map((o, i) => (
                      <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        <span style={{ color: '#6C5CE7', flexShrink: 0, fontWeight: 700 }}>·</span>
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Grandes idées (V2) */}
              {unite.grandes_idees && unite.grandes_idees.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Grandes idées
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {unite.grandes_idees.map((g, i) => (
                      <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        <span style={{ color: '#F59E0B', flexShrink: 0, fontWeight: 700 }}>·</span>
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Concepts clés (V2) */}
              {unite.concepts_cles && unite.concepts_cles.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                    Concepts clés
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {unite.concepts_cles.map((c, i) => (
                      <span key={i} style={{
                        fontSize: 12, padding: '3px 10px', borderRadius: 6,
                        background: 'rgba(139,151,172,0.08)', border: '1px solid var(--card-border)',
                        color: 'var(--text-secondary)',
                      }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Justification pédagogique (V2) */}
              {unite.justification_pedagogique && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                    Pourquoi cette unité ?
                  </div>
                  <div style={{
                    fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.65,
                    padding: '10px 14px', borderRadius: 8,
                    background: 'rgba(108,92,231,0.04)', border: '1px solid rgba(108,92,231,0.10)',
                  }}>
                    {unite.justification_pedagogique}
                  </div>
                </div>
              )}

              {/* Activité culminante + évaluation (V2) */}
              {(unite.activite_culminante || unite.evaluation_prevue) && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {unite.activite_culminante && (
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                        Activité culminante
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{unite.activite_culminante}</div>
                    </div>
                  )}
                  {unite.evaluation_prevue && (
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                        Évaluation prévue
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{unite.evaluation_prevue}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Colonne leçons */}
            <div style={{ flex: '1 1 260px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                Découpage des leçons
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {unite.lecons.map((l, li) => {
                  const badge = lessonBadge(l, seqIdx, li, lessonStateMap)
                  return (
                    <div
                      key={li}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '10px 12px', borderRadius: 8,
                        background: 'rgba(139,151,172,0.04)', border: '1px solid var(--card-border)',
                      }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        background: badge.color === '#22C55E' ? 'rgba(34,197,94,0.1)' : badge.color === '#6C5CE7' ? 'rgba(108,92,231,0.1)' : 'rgba(139,151,172,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9.5, fontWeight: 700, color: badge.color,
                      }}>
                        {l.numero}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                          {l.titre}
                        </div>
                        {l.objectif_apprentissage && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                            {l.objectif_apprentissage.length > 80 ? l.objectif_apprentissage.slice(0, 80) + '…' : l.objectif_apprentissage}
                          </div>
                        )}
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: badge.color, flexShrink: 0,
                        background: `${badge.color}12`, border: `1px solid ${badge.color}25`,
                        borderRadius: 99, padding: '2px 7px', marginTop: 1,
                      }}>
                        {badge.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {unite.lecons.length > 0 && (
                <a
                  href={`/dashboard/classes/${classeId}/lecons`}
                  style={{ display: 'block', marginTop: 10, fontSize: 12, fontWeight: 600, color: '#6C5CE7', textDecoration: 'none', textAlign: 'right' }}
                >
                  Préparer les leçons →
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PlanAnnuelView ───────────────────────────────────────────────────────────

export default function PlanAnnuelView({ contenu, lessonStateMap, classeId }: Props) {
  if (!contenu || contenu.unites.length === 0) {
    return (
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 12, padding: '40px 32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Plan annuel non disponible
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 400, margin: '0 auto 20px' }}>
          Le plan annuel est généré lors de la construction de l&apos;année scolaire.
        </div>
        <a
          href={`/dashboard/classes/${classeId}/programme`}
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
    )
  }

  const totalLecons = contenu.unites.reduce((s, u) => s + u.lecons.length, 0)
  const totalSemaines = contenu.nb_semaines

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Métadonnées du plan */}
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 12, padding: '18px 24px',
        display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 3 }}>
            Plan annuel
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
            {contenu.titre}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{contenu.unites.length}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>unités</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{totalLecons}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>leçons</div>
          </div>
          {totalSemaines && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{totalSemaines}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>semaines</div>
            </div>
          )}
        </div>
      </div>

      {/* Unités */}
      {contenu.unites.map((unite, si) => (
        <UniteCard
          key={si}
          unite={unite}
          seqIdx={si}
          lessonStateMap={lessonStateMap}
          classeId={classeId}
        />
      ))}
    </div>
  )
}
