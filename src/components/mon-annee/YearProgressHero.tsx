'use client'

import type { SchoolYearMetrics, PacingIndicator } from '@/lib/types/school-year-dashboard'

interface Props {
  metrics:             SchoolYearMetrics
  schoolYearElapsedPct: number
  pacingIndicator?:    PacingIndicator
  anneeScolaire?:      string
}

export default function YearProgressHero({ metrics, schoolYearElapsedPct, pacingIndicator, anneeScolaire }: Props) {
  const teachingPct = metrics.totalLecons && metrics.taughtLecons !== null && metrics.totalLecons > 0
    ? Math.round((metrics.taughtLecons / metrics.totalLecons) * 100)
    : null

  const preparationPct = metrics.totalLecons && metrics.preparedLecons !== null && metrics.totalLecons > 0
    ? Math.round((metrics.preparedLecons / metrics.totalLecons) * 100)
    : null

  const statColor   = pacingIndicator?.color ?? '#6C5CE7'
  const statLabel   = pacingIndicator?.label ?? 'Rythme non calculé'

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 'var(--radius-lg)', padding: '28px 32px',
    }}>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Progression pédagogique {anneeScolaire ? `— ${anneeScolaire}` : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {teachingPct !== null ? `${teachingPct} %` : '—'}
            </span>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              du programme<br />enseigné
            </div>
          </div>
        </div>

        {/* Indicateur de rythme */}
        <div style={{
          padding: '10px 16px', borderRadius: 10,
          background: `${statColor}12`, border: `1px solid ${statColor}30`,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: statColor, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            {statLabel}
          </div>
          {pacingIndicator && (
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3 }}>
              {pacingIndicator.delta > 0 ? `+${pacingIndicator.delta}` : pacingIndicator.delta} pts vs calendrier
            </div>
          )}
        </div>
      </div>

      {/* Barres de progression */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {/* Enseignement */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Enseigné</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {metrics.taughtLecons ?? '—'}/{metrics.totalLecons ?? '—'} leçons
            </span>
          </div>
          <div style={{ position: 'relative', height: 8, background: 'rgba(139,151,172,0.12)', borderRadius: 99 }}>
            <div style={{ position: 'absolute', height: '100%', left: 0, borderRadius: 99, background: '#22C55E', width: `${teachingPct ?? 0}%`, transition: 'width 0.6s ease' }} />
          </div>
        </div>

        {/* Préparation */}
        {preparationPct !== null && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Préparé</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {metrics.preparedLecons}/{metrics.totalLecons} plans de leçon
              </span>
            </div>
            <div style={{ position: 'relative', height: 8, background: 'rgba(139,151,172,0.12)', borderRadius: 99 }}>
              <div style={{ position: 'absolute', height: '100%', left: 0, borderRadius: 99, background: '#6C5CE7', width: `${preparationPct}%`, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        )}

        {/* Calendrier */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Calendrier scolaire</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{schoolYearElapsedPct} % de l&apos;année écoulée</span>
          </div>
          <div style={{ position: 'relative', height: 8, background: 'rgba(139,151,172,0.12)', borderRadius: 99 }}>
            <div style={{ position: 'absolute', height: '100%', left: 0, borderRadius: 99, background: 'rgba(139,151,172,0.4)', width: `${schoolYearElapsedPct}%`, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      </div>

      {/* Métriques clés */}
      <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', borderTop: '1px solid rgba(139,151,172,0.1)', paddingTop: 20 }}>
        {[
          { label: 'Séquences',  val: metrics.totalSequences,    sub: `${metrics.completedSequences ?? '—'} terminées` },
          { label: 'Leçons',     val: metrics.totalLecons,        sub: `${metrics.taughtLecons ?? '—'} enseignées` },
          { label: 'RA ciblés',  val: metrics.totalRA,            sub: 'résultats d\'apprentissage' },
        ].map((m, i) => (
          <div key={m.label} style={{
            flex: '1 1 100px', textAlign: 'center', padding: '0 16px',
            borderRight: i < 2 ? '1px solid rgba(139,151,172,0.1)' : 'none',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
              {m.val !== null ? m.val : '—'}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {m.label}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>{m.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
