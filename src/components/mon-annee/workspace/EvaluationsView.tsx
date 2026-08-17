'use client'

import type { ContenuProgramme, Unite } from '@/lib/types/database'
import type { LessonTeachingState } from '@/lib/types/school-year-dashboard'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  contenu:        ContenuProgramme | undefined
  lessonStateMap: Record<string, LessonTeachingState> | undefined
  classeId:       string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sequenceProgressLabel(unite: Unite, si: number, map?: Record<string, LessonTeachingState>): {
  taught: number; total: number; pct: number
} {
  const total = unite.lecons.length
  const taught = unite.lecons.filter((_, li) => map?.[`${si}:${li}`]?.isTaught).length
  return { taught, total, pct: total > 0 ? Math.round((taught / total) * 100) : 0 }
}

// ─── EvaluationsView ─────────────────────────────────────────────────────────

export default function EvaluationsView({ contenu, lessonStateMap, classeId }: Props) {
  if (!contenu || contenu.unites.length === 0) {
    return (
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 12, padding: '48px 32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Aucune évaluation structurée pour cette classe
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.65, maxWidth: 440, margin: '0 auto 24px' }}>
          Les évaluations planifiées apparaissent ici une fois l&apos;année scolaire construite. Chaque unité peut avoir une activité culminante et une évaluation sommative prévue.
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

  // Chercher les unités qui ont des évaluations prévues
  const unitesAvecEval = contenu.unites.filter(u =>
    u.evaluation_prevue || u.activite_culminante
  )

  if (unitesAvecEval.length === 0) {
    return (
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 12, padding: '48px 32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Aucune évaluation planifiée
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.65, maxWidth: 440, margin: '0 auto 20px' }}>
          Ce programme ne contient pas encore d&apos;évaluations sommatives ou d&apos;activités culminantes planifiées. Ces informations sont disponibles dans les programmes construits avec ScorgIA V7.
        </div>
        <div style={{
          display: 'inline-flex', padding: '8px 14px', borderRadius: 8,
          background: 'rgba(139,151,172,0.06)', border: '1px solid var(--card-border)',
          fontSize: 12, color: 'var(--text-muted)',
        }}>
          Format de programme V1 — résultats disponibles dans la structure V2 uniquement
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* En-tête */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderRadius: 10,
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
            Évaluations planifiées
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {unitesAvecEval.length} unité{unitesAvecEval.length > 1 ? 's' : ''} avec évaluation prévue
          </div>
        </div>
      </div>

      {/* Cartes par unité */}
      {contenu.unites.map((unite, si) => {
        const hasEval = unite.evaluation_prevue || unite.activite_culminante
        if (!hasEval) return null

        const prog = sequenceProgressLabel(unite, si, lessonStateMap)

        return (
          <div
            key={si}
            style={{
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: 12, overflow: 'hidden',
            }}
          >
            {/* Header unité */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--card-border)',
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: '#6C5CE7',
              }}>U{unite.numero}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {unite.titre}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Sem. {unite.semaine_debut}–{unite.semaine_fin} · {prog.taught}/{prog.total} leçons enseignées
                </div>
              </div>
              {/* Progression badge */}
              <div style={{
                fontSize: 12, fontWeight: 700,
                color: prog.pct === 100 ? '#22C55E' : prog.pct > 0 ? '#6C5CE7' : '#94A3B8',
              }}>
                {prog.pct} %
              </div>
            </div>

            {/* Contenu évaluations */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Activité culminante */}
              {unite.activite_culminante && (
                <div style={{
                  padding: '14px 16px', borderRadius: 8,
                  background: 'rgba(108,92,231,0.04)', border: '1px solid rgba(108,92,231,0.12)',
                }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
                    Activité culminante
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                    {unite.activite_culminante}
                  </div>
                </div>
              )}

              {/* Évaluation prévue */}
              {unite.evaluation_prevue && (
                <div style={{
                  padding: '14px 16px', borderRadius: 8,
                  background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)',
                }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
                    Évaluation sommative prévue
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                    {unite.evaluation_prevue}
                  </div>
                </div>
              )}

              {/* Preuves dans les leçons */}
              {(() => {
                const preuves = unite.lecons
                  .filter(l => l.preuve_apprentissage)
                  .map(l => ({ titre: l.titre, preuve: l.preuve_apprentissage! }))
                if (preuves.length === 0) return null
                return (
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
                      Preuves d&apos;apprentissage par leçon
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {preuves.map((p, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 12px', borderRadius: 6, background: 'rgba(139,151,172,0.04)', border: '1px solid var(--card-border)' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>
                            {p.titre}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
                            {p.preuve}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )
      })}
    </div>
  )
}
