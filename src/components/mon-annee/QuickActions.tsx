'use client'

import type { PriorityTask } from '@/lib/types/school-year-dashboard'

interface Props {
  tasks:    PriorityTask[]
  classeId: string
}

const TYPE_CFG = {
  enseigner: { color: '#6C5CE7', bg: 'rgba(108,92,231,0.1)', border: 'rgba(108,92,231,0.2)', icon: '▶' },
  preparer:  { color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', icon: '📝' },
  corriger:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: '!' },
  planifier: { color: '#8B97AC', bg: 'rgba(139,151,172,0.08)', border: 'rgba(139,151,172,0.2)', icon: '○' },
}

function taskHref(task: PriorityTask, classeId: string): string {
  if (task.type === 'enseigner' || task.type === 'preparer') {
    return `/dashboard/classes/${classeId}/programme?tab=sequences`
  }
  if (task.type === 'planifier') {
    return `/dashboard/classes/${classeId}/programme?tab=syllabus`
  }
  return `/dashboard/classes/${classeId}/programme`
}

export default function QuickActions({ tasks, classeId }: Props) {
  const displayTasks = tasks.slice(0, 4)

  if (displayTasks.length === 0) {
    return (
      <div style={{
        background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.18)',
        borderRadius: 'var(--radius-lg)', padding: '20px 24px',
        display: 'flex', gap: 14, alignItems: 'center',
      }}>
        <div style={{ fontSize: 20, color: '#22C55E' }}>✓</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#22C55E' }}>Aucune action urgente</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Votre progression pédagogique est à jour.</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
        Actions prioritaires
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {displayTasks.map((task, i) => {
          const cfg  = TYPE_CFG[task.type] ?? TYPE_CFG.planifier
          const href = taskHref(task, classeId)
          return (
            <a
              key={i}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', borderRadius: 10, textDecoration: 'none',
                background: cfg.bg, border: `1px solid ${cfg.border}`,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.8' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: `${cfg.color}18`, border: `1px solid ${cfg.color}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, color: cfg.color, fontWeight: 700,
              }}>
                {cfg.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {task.label}
                </div>
                {task.detail && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    {task.detail}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color, flexShrink: 0 }}>→</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
