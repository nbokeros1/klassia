'use client'

import { useMemo } from 'react'
import type { ContenuProgramme } from '@/lib/types/database'

interface Props {
  programme: ContenuProgramme
  matiereColor?: string
}

const UNIT_COLORS = [
  '#7F77DD', '#34D399', '#EF9F27', '#60A5FA',
  '#F472B6', '#A78BFA', '#FB923C', '#4ADE80',
]

export default function AnnualPlanTimeline({ programme, matiereColor = '#7F77DD' }: Props) {
  const unites = programme?.unites ?? []

  const totalLecons = useMemo(() =>
    unites.reduce((acc, u) => acc + (u.lecons?.length ?? 0), 0),
    [unites]
  )

  if (!unites.length) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
        Aucune unité trouvée dans ce plan annuel.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Barre de progression globale */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Plan annuel — {unites.length} unité{unites.length !== 1 ? 's' : ''}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{totalLecons} leçons planifiées</span>
        </div>
        <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', gap: 2 }}>
          {unites.map((u, i) => {
            const nb = u.lecons?.length ?? 1
            const pct = totalLecons > 0 ? (nb / totalLecons * 100) : (100 / unites.length)
            return (
              <div
                key={i}
                title={`${u.titre} — ${nb} leçon${nb !== 1 ? 's' : ''}`}
                style={{ height: '100%', background: UNIT_COLORS[i % UNIT_COLORS.length], width: `${pct}%`, borderRadius: 99, transition: 'width .3s' }}
              />
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
          {unites.map((u, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: UNIT_COLORS[i % UNIT_COLORS.length], flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.titre}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Unités */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {unites.map((unite, ui) => {
          const color = UNIT_COLORS[ui % UNIT_COLORS.length]
          const lecons = unite.lecons ?? []
          return (
            <details
              key={ui}
              open={ui === 0}
              style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
              <summary style={{ listStyle: 'none', padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, userSelect: 'none' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{unite.titre}</div>
                  {unite.semaine_debut && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {unite.semaine_fin - unite.semaine_debut + 1} semaine{unite.semaine_fin - unite.semaine_debut > 0 ? 's' : ''} · {lecons.length} leçon{lecons.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>▾</span>
              </summary>

              <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--color-border)' }}>
                {/* Objectifs */}
                {unite.objectifs && unite.objectifs.length > 0 && (
                  <div style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border)', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Objectifs</div>
                    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {unite.objectifs.map((obj, oi) => (
                        <li key={oi} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Leçons */}
                {lecons.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>Leçons</div>
                    {lecons.map((lecon, li) => (
                      <div key={li} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--color-bg-primary)' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color, flexShrink: 0, marginTop: 1 }}>
                          {li + 1}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{lecon.titre}</div>
                          {lecon.duree_minutes && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{lecon.duree_minutes} min</div>
                          )}
                          {lecon.sujet && lecon.sujet !== lecon.titre && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>{lecon.sujet}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}
