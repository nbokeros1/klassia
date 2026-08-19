import type { UpcomingAssessment } from '@/lib/types/school-year-dashboard'

interface Props {
  assessments: UpcomingAssessment[]
  classeId:    string | null
}

export default function UpcomingAssessments({ assessments, classeId }: Props) {
  return (
    <div style={{
      background: 'var(--card-bg)', backdropFilter: 'blur(var(--card-blur))',
      border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)',
      padding: '24px 28px',
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
        Évaluations
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 18 }}>
        Prochaines évaluations
      </h2>

      {assessments.length === 0 ? (
        <div style={{
          padding: '28px 20px', textAlign: 'center',
          color: 'var(--text-muted)', fontSize: 13.5,
          background: 'rgba(139,151,172,0.04)', borderRadius: 10,
          border: '1px dashed rgba(139,151,172,0.25)',
        }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>📅</div>
          Aucune évaluation planifiée.
          <br />
          <span style={{ fontSize: 12 }}>
            La gestion des évaluations avec dates sera disponible dans une prochaine version.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {assessments.map((a, idx) => (
            <div key={idx} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              padding: '12px 14px', background: 'rgba(245,158,11,0.05)',
              borderRadius: 10, border: '1px solid rgba(245,158,11,0.15)',
            }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                  {a.titre}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{a.contexte}</div>
              </div>
              {a.dateLabel && (
                <span style={{
                  fontSize: 11.5, fontWeight: 700, color: '#F59E0B',
                  flexShrink: 0, marginLeft: 12,
                }}>
                  {a.dateLabel}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {classeId && (
        <a href={`/dashboard/classes/${classeId}/programme?tab=quiz`}
           style={{
             display: 'inline-block', marginTop: 16,
             fontSize: 12.5, fontWeight: 600, color: 'var(--violet)', textDecoration: 'none',
           }}>
          Voir les quiz générés →
        </a>
      )}
    </div>
  )
}
