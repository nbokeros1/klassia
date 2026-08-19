import type { SchoolYearMetrics } from '@/lib/types/school-year-dashboard'
import type { TeachingPack, PackSyllabus } from '@/lib/types/teaching-pack'
import type { ProgrammeAnnuel } from '@/lib/types/database'

interface Props {
  pack:       TeachingPack | null
  programme:  ProgrammeAnnuel | null
  metrics:    SchoolYearMetrics
  classeId:   string | null
}

const STATUT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pret:               { label: 'Prêt',               color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
  partiellement_genere:{ label: 'En cours',          color: '#6C5CE7', bg: 'rgba(108,92,231,0.12)'  },
  generation_en_cours:{ label: 'Génération en cours', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  erreur:             { label: 'Erreur',              color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  configuration:      { label: 'À configurer',        color: '#8B97AC', bg: 'rgba(139,151,172,0.1)'  },
}

function MetricPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '12px 20px', background: 'rgba(108,92,231,0.07)',
      borderRadius: 12, border: '1px solid rgba(108,92,231,0.15)', minWidth: 90,
    }}>
      <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--violet)', lineHeight: 1.2 }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, textAlign: 'center' }}>
        {label}
      </span>
    </div>
  )
}

export default function YearProgressCard({ pack, programme, metrics, classeId }: Props) {
  const syllabus = programme?.syllabus_json as (PackSyllabus & Record<string, unknown>) | undefined
  const statutInfo = STATUT_LABELS[pack?.statut ?? ''] ?? { label: '—', color: '#8B97AC', bg: 'rgba(139,151,172,0.1)' }

  const progressPct = metrics.taughtLecons != null && metrics.totalLecons != null && metrics.totalLecons > 0
    ? Math.round((metrics.taughtLecons / metrics.totalLecons) * 100)
    : null

  return (
    <div style={{
      background: 'var(--card-bg)', backdropFilter: 'blur(var(--card-blur))',
      border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)',
      padding: '28px 32px', flex: 1,
    }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Progression globale
        </span>
        {pack && (
          <span style={{
            fontSize: 10.5, fontWeight: 600, padding: '2px 10px',
            borderRadius: 99, color: statutInfo.color, background: statutInfo.bg,
          }}>
            {statutInfo.label}
          </span>
        )}
      </div>

      {!pack ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Aucune année scolaire construite pour cette classe.
          {classeId && (
            <a href={`/dashboard/classes/${classeId}/programme`}
               style={{ display: 'block', marginTop: 10, color: 'var(--violet)', fontWeight: 600, fontSize: 13 }}>
              Construire mon année →
            </a>
          )}
        </div>
      ) : (
        <>
          {/* Barre de progression */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {progressPct != null ? `${progressPct} %` : '—'}
              </span>
              {metrics.taughtLecons != null && metrics.totalLecons != null && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {metrics.taughtLecons} / {metrics.totalLecons} leçons enseignées
                </span>
              )}
            </div>
            <div style={{ height: 6, background: 'rgba(108,92,231,0.12)', borderRadius: 99 }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: progressPct != null ? `${progressPct}%` : '0%',
                background: 'linear-gradient(90deg, var(--violet), #9B6FD4)',
                transition: 'width 0.6s ease',
              }} />
            </div>
            {progressPct === null && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                Suivi de progression disponible après la première leçon enseignée.
              </p>
            )}
          </div>

          {/* Pillules métriques */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <MetricPill label="Séquences" value={metrics.totalSequences ?? '—'} />
            <MetricPill label="Leçons" value={metrics.totalLecons ?? '—'} />
            {metrics.totalRA != null && (
              <MetricPill label="Résultats d'apprentissage" value={metrics.totalRA} />
            )}
          </div>

          {/* Syllabus */}
          {syllabus?.titre_cours && (
            <p style={{ marginTop: 18, fontSize: 12.5, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {syllabus.titre_cours}
              {syllabus.description && ` — ${String(syllabus.description).slice(0, 120)}${String(syllabus.description).length > 120 ? '…' : ''}`}
            </p>
          )}

          {/* Lien détail */}
          {classeId && (
            <a href={`/dashboard/classes/${classeId}/programme`}
               style={{ display: 'inline-block', marginTop: 16, fontSize: 12.5, color: 'var(--violet)', fontWeight: 600 }}>
              Voir le plan complet →
            </a>
          )}
        </>
      )}
    </div>
  )
}
