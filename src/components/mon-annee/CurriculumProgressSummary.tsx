'use client'

import type { CurriculumCoverageData } from '@/lib/spie/curriculum-coverage'

interface Props {
  coverage:  CurriculumCoverageData | undefined
  classeId:  string
}

export default function CurriculumProgressSummary({ coverage, classeId }: Props) {
  if (!coverage || !coverage.hasV2Data) {
    return (
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 'var(--radius-lg)', padding: '24px 28px',
      }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
          Curriculum
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Couverture du curriculum
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Données disponibles uniquement pour les programmes V2. Reconstruisez votre année pour activer le suivi des résultats d&apos;apprentissage.
        </div>
      </div>
    )
  }

  const items        = coverage.items
  const total        = items.length
  const worked       = items.filter(i => i.isPlanified).length
  const taught       = items.filter(i => i.isTaught).length
  const highConf     = items.filter(i => i.isTaught && i.coverageConfidence === 'high').length
  const taughtPct    = total > 0 ? Math.round((taught / total) * 100) : 0
  const workedPct    = total > 0 ? Math.round((worked / total) * 100) : 0

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 'var(--radius-lg)', padding: '24px 28px',
    }}>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Curriculum
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Couverture des RA
          </h2>
        </div>
        <a href={`/dashboard/classes/${classeId}/programme?tab=syllabus`}
           style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--violet)', textDecoration: 'none' }}>
          Voir la couverture →
        </a>
      </div>

      {/* Métriques */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <MetricTile
          value={`${taughtPct} %`}
          label="Enseigné"
          sub={`${taught}/${total} RA`}
          color="#22C55E"
        />
        <MetricTile
          value={`${workedPct} %`}
          label="Planifié"
          sub={`${worked}/${total} RA`}
          color="#6C5CE7"
        />
        {highConf > 0 && (
          <MetricTile
            value={String(highConf)}
            label="Haute confiance"
            sub="RA avec données explicites"
            color="#3B82F6"
          />
        )}
      </div>

      {/* Barre globale */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>RA travaillés</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#22C55E' }}>{workedPct} %</span>
        </div>
        <div style={{ position: 'relative', height: 6, background: 'rgba(139,151,172,0.12)', borderRadius: 99 }}>
          {/* Barre planifié */}
          <div style={{ position: 'absolute', height: '100%', left: 0, borderRadius: 99, background: '#6C5CE7', width: `${workedPct}%` }} />
          {/* Barre enseigné par-dessus */}
          <div style={{ position: 'absolute', height: '100%', left: 0, borderRadius: 99, background: '#22C55E', width: `${taughtPct}%` }} />
        </div>
      </div>

      {/* Aperçu RA non travaillés */}
      {(() => {
        const untouched = items.filter(i => !i.isPlanified)
        if (untouched.length === 0) return null
        return (
          <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', marginBottom: 6 }}>
              {untouched.length} RA non encore planifiés
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {untouched.slice(0, 3).map(i => i.outcome.code).join(' · ')}
              {untouched.length > 3 ? ` · +${untouched.length - 3} autres` : ''}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function MetricTile({ value, label, sub, color }: { value: string; label: string; sub: string; color: string }) {
  return (
    <div style={{
      flex: '1 1 100px', padding: '12px 16px', borderRadius: 10,
      background: `${color}08`, border: `1px solid ${color}20`, textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}
