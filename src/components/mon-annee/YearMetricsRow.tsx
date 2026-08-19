import type { SchoolYearMetrics } from '@/lib/types/school-year-dashboard'

interface Props {
  metrics: SchoolYearMetrics
  loading: boolean
}

interface KPICardProps {
  titre:    string
  valeur:   string
  detail?:  string
  couleur:  string
  bgColor:  string
  loading:  boolean
}

function KPICard({ titre, valeur, detail, couleur, bgColor, loading }: KPICardProps) {
  return (
    <div style={{
      background: 'var(--card-bg)', backdropFilter: 'blur(var(--card-blur))',
      border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)',
      padding: '20px 22px', flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
        {titre}
      </div>
      {loading ? (
        <div style={{ height: 32, width: 64, background: 'var(--bg-veil)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
      ) : (
        <>
          <div style={{ fontSize: 28, fontWeight: 800, color: couleur, lineHeight: 1.1 }}>
            {valeur}
          </div>
          {detail && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5 }}>{detail}</div>
          )}
        </>
      )}
      <div style={{ height: 3, borderRadius: 99, background: bgColor, marginTop: 14 }} />
    </div>
  )
}

export default function YearMetricsRow({ metrics, loading }: Props) {
  const fmt = (v: number | null, total: number | null, label?: string) => {
    if (v === null) return '—'
    if (total !== null) return `${v} / ${total}`
    return label ? `${v} ${label}` : String(v)
  }

  const cards = [
    {
      titre:   'Séquences',
      valeur:  fmt(metrics.completedSequences, metrics.totalSequences),
      detail:  'terminées',
      couleur: '#22C55E',
      bgColor: 'rgba(34,197,94,0.2)',
    },
    {
      titre:   'Leçons enseignées',
      valeur:  fmt(metrics.taughtLecons, metrics.totalLecons),
      detail:  'enseignées',
      couleur: '#3B82F6',
      bgColor: 'rgba(59,130,246,0.2)',
    },
    {
      titre:   'Leçons préparées',
      valeur:  metrics.preparedLecons != null ? String(metrics.preparedLecons) : '—',
      detail:  metrics.preparedLecons != null ? 'plans générés' : 'Pas encore disponible',
      couleur: '#6C5CE7',
      bgColor: 'rgba(108,92,231,0.2)',
    },
    {
      titre:   'Évaluations',
      valeur:  '—',
      detail:  'Prochainement disponible',
      couleur: '#F59E0B',
      bgColor: 'rgba(245,158,11,0.2)',
    },
  ]

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {cards.map(c => (
        <KPICard key={c.titre} {...c} loading={loading} />
      ))}
    </div>
  )
}
