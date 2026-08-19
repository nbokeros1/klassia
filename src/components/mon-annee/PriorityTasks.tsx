import type { PriorityTask } from '@/lib/types/school-year-dashboard'

interface Props {
  tasks:    PriorityTask[]
  classeId: string | null
}

const TYPE_CONFIG = {
  enseigner: { label: 'Enseigner', color: '#22C55E', bg: 'rgba(34,197,94,0.1)'  },
  preparer:  { label: 'Préparer',  color: '#6C5CE7', bg: 'rgba(108,92,231,0.1)' },
  corriger:  { label: 'Corriger',  color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  planifier: { label: 'Planifier', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
}

export default function PriorityTasks({ tasks, classeId }: Props) {
  return (
    <div style={{
      background: 'var(--card-bg)', backdropFilter: 'blur(var(--card-blur))',
      border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)',
      padding: '24px 28px',
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
        Priorités
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 18 }}>
        À faire en priorité
      </h2>

      {tasks.length === 0 ? (
        <div style={{
          padding: '28px 20px', textAlign: 'center',
          color: 'var(--text-muted)', fontSize: 13.5,
          background: 'rgba(139,151,172,0.04)', borderRadius: 10,
          border: '1px dashed rgba(139,151,172,0.25)',
        }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>✓</div>
          Aucune tâche prioritaire détectée.
          <br />
          <span style={{ fontSize: 12 }}>Les tâches dériveront automatiquement de votre avancement.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasks.map((task, idx) => {
            const tc = TYPE_CONFIG[task.type]
            return (
              <div key={idx} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 14px',
                background: 'rgba(139,151,172,0.04)',
                borderRadius: 10, border: '1px solid rgba(139,151,172,0.12)',
              }}>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, padding: '2px 9px', flexShrink: 0,
                  borderRadius: 99, color: tc.color, background: tc.bg, marginTop: 2,
                }}>
                  {tc.label}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {task.label}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{task.detail}</div>
                </div>
                {classeId && (
                  <a href={`/dashboard/classes/${classeId}/programme?tab=plans_lecon`}
                     style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--violet)', textDecoration: 'none', flexShrink: 0, alignSelf: 'center' }}>
                    Ouvrir →
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
