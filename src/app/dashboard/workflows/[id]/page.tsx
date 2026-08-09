'use client'

// ── /dashboard/workflows/[id] — Vue détaillée d'un workflow (ME-14) ──────────

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar  from '@/components/Topbar'
import { useAuth } from '@/lib/hooks/useAuth'
import type { WorkflowPublic, WorkflowStepPublic } from '@/lib/workflow-runtime/types'

// ── Types de profil minimal ────────────────────────────────────────────────────

interface ProfilMinimal {
  prenom?: string
  role?:   string
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchWorkflow(id: string): Promise<WorkflowPublic | null> {
  const res = await fetch(`/api/workflows/${encodeURIComponent(id)}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json() as Promise<WorkflowPublic>
}

async function sendAction(
  id:              string,
  action:          Record<string, unknown>,
  expectedVersion: number,
): Promise<{ ok: boolean; data?: WorkflowPublic; error?: { code: string; message: string } }> {
  const res = await fetch(`/api/workflows/${encodeURIComponent(id)}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action, expectedVersion }),
  })
  const body = await res.json().catch(() => ({})) as Record<string, unknown>
  if (res.ok) return { ok: true, data: body as unknown as WorkflowPublic }
  return { ok: false, error: (body as { error?: { code: string; message: string } }).error ?? { code: 'UNKNOWN', message: `HTTP ${res.status}` } }
}

// ── Composants ────────────────────────────────────────────────────────────────

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div style={{ background: 'rgba(108,92,231,0.1)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, percent))}%`,
        height: '100%',
        background: percent === 100 ? '#22C55E' : 'var(--violet)',
        borderRadius: 99,
        transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

function StepStatusBadge({ status }: { status: WorkflowStepPublic['status'] }) {
  const map: Record<WorkflowStepPublic['status'], { label: string; color: string; bg: string }> = {
    pending:     { label: 'En attente',  color: 'var(--text-muted)', bg: 'rgba(139,151,172,0.1)' },
    available:   { label: 'À faire',     color: 'var(--violet)',      bg: 'rgba(108,92,231,0.1)'  },
    in_progress: { label: 'En cours',    color: '#F59E0B',            bg: 'rgba(245,158,11,0.1)'  },
    completed:   { label: 'Terminée',    color: '#22C55E',            bg: 'rgba(34,197,94,0.1)'   },
    skipped:     { label: 'Ignorée',     color: 'var(--text-muted)', bg: 'rgba(139,151,172,0.1)' },
    blocked:     { label: 'Bloquée',     color: '#EF4444',            bg: 'rgba(239,68,68,0.1)'   },
  }
  const { label, color, bg } = map[status] ?? map.pending
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, background: bg, padding: '2px 8px', borderRadius: 99 }}>
      {label}
    </span>
  )
}

function WorkflowStepCard({
  step,
  onStart,
  onComplete,
  onSkip,
}: {
  step:       WorkflowStepPublic
  onStart:    (stepId: string) => void
  onComplete: (stepId: string) => void
  onSkip:     (stepId: string) => void
}) {
  const [showCriteria, setShowCriteria] = useState(false)
  const isActive = step.status === 'available' || step.status === 'in_progress'

  return (
    <div style={{
      borderRadius: 'var(--radius-md)',
      padding: '16px 20px',
      background: isActive ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
      border: `1px solid ${isActive ? 'rgba(108,92,231,0.25)' : 'rgba(255,255,255,0.6)'}`,
      boxShadow: isActive ? 'var(--shadow-card)' : 'none',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Numéro d'étape */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: step.status === 'completed' ? '#22C55E' : step.status === 'blocked' ? '#EF4444' : 'var(--violet)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
        }}>
          {step.status === 'completed' ? '✓' : step.order}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{step.title}</span>
            <StepStatusBadge status={step.status} />
            {step.optional && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'rgba(139,151,172,0.1)', padding: '2px 6px', borderRadius: 99 }}>
                Optionnel
              </span>
            )}
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{step.description}</p>

          {step.estimatedMinutes && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              ⏱ {step.estimatedMinutes} min
            </div>
          )}

          {/* Critères de complétion */}
          {step.completionCriteria.length > 0 && isActive && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setShowCriteria(v => !v)}
                style={{
                  fontSize: 11, color: 'var(--violet)', background: 'none',
                  border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
                }}
              >
                {showCriteria ? '▼' : '▶'} Critères de complétion
              </button>
              {showCriteria && (
                <ul style={{ margin: '6px 0 0 0', paddingLeft: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {step.completionCriteria.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              )}
            </div>
          )}

          {/* Raisons de blocage */}
          {step.blockingLabels.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#EF4444' }}>
              {step.blockingLabels.map((l, i) => <div key={i}>⚠ {l}</div>)}
            </div>
          )}

          {/* Actions */}
          {isActive && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {step.status === 'available' && (
                <button
                  onClick={() => onStart(step.id)}
                  style={{
                    padding: '6px 14px', fontSize: 12, fontWeight: 600,
                    background: 'var(--violet)', color: '#fff',
                    border: 'none', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Commencer cette étape
                </button>
              )}
              {(step.status === 'available' || step.status === 'in_progress') && (
                <button
                  onClick={() => {
                    if (showCriteria || step.completionCriteria.length === 0) {
                      onComplete(step.id)
                    } else {
                      setShowCriteria(true)
                    }
                  }}
                  style={{
                    padding: '6px 14px', fontSize: 12, fontWeight: 600,
                    background: '#22C55E', color: '#fff',
                    border: 'none', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {step.completionCriteria.length > 0 && !showCriteria
                    ? 'Voir les critères'
                    : 'Marquer comme terminée'}
                </button>
              )}
              {step.optional && (step.status === 'available' || step.status === 'in_progress') && (
                <button
                  onClick={() => onSkip(step.id)}
                  style={{
                    padding: '6px 14px', fontSize: 12, fontWeight: 600,
                    color: 'var(--text-secondary)', background: 'rgba(139,151,172,0.1)',
                    border: '1px solid rgba(139,151,172,0.2)', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Ignorer
                </button>
              )}
              {step.target?.route && (
                <a
                  href={buildStepRoute(step)}
                  style={{
                    padding: '6px 14px', fontSize: 12, fontWeight: 600,
                    color: 'var(--violet)', background: 'rgba(108,92,231,0.08)',
                    border: '1px solid rgba(108,92,231,0.2)', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  Ouvrir l'outil ↗
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function buildStepRoute(step: WorkflowStepPublic): string {
  if (!step.target?.route) return '#'
  const qs = new URLSearchParams(step.target.query ?? {})
  const str = qs.toString()
  return str ? `${step.target.route}?${str}` : step.target.route
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function WorkflowDetailPage() {
  const router  = useRouter()
  const params  = useParams()
  const { profil: authProfil } = useAuth()

  const workflowId = typeof params['id'] === 'string' ? params['id'] : ''

  const [profil,   setProfil]   = useState<ProfilMinimal | null>(null)
  const [workflow, setWorkflow] = useState<WorkflowPublic | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [busy,     setBusy]     = useState(false)

  useEffect(() => {
    if (!authProfil) return
    setProfil({ prenom: authProfil.prenom ?? authProfil.email?.split('@')[0] ?? 'Enseignant' })
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authProfil, workflowId])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const wf = await fetchWorkflow(workflowId)
    if (!wf) setError('Workflow introuvable.')
    else setWorkflow(wf)
    setLoading(false)
  }, [workflowId])

  const act = useCallback(async (action: Record<string, unknown>) => {
    if (!workflow || busy) return
    setBusy(true)
    const r = await sendAction(workflowId, action, workflow.version)
    if (r.ok && r.data) {
      setWorkflow(r.data)
    } else if (r.error?.code === 'WORKFLOW_VERSION_CONFLICT') {
      await load()
    } else {
      setError(r.error?.message ?? 'Action échouée.')
    }
    setBusy(false)
  }, [workflow, busy, workflowId, load])

  const isFr = true

  if (!authProfil) return null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        profil={profil}
        activeHref="/dashboard"
        onLogout={async () => router.push('/auth/login')}
        notifCount={0}
      />

      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar notifCount={0} initiales="" creditsIa={{ used: 0, total: 0 }} isFr={isFr} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 40px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>

            {/* Retour */}
            <button
              onClick={() => router.back()}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)', fontSize: 13, padding: 0,
                marginBottom: 20, fontFamily: 'inherit',
              }}
            >
              ← Retour
            </button>

            {loading && (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 60 }}>Chargement…</div>
            )}

            {error && (
              <div style={{ color: '#EF4444', padding: 16, background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-md)' }}>
                {error}
              </div>
            )}

            {workflow && !loading && (
              <>
                {/* En-tête */}
                <div className="glass-strong" style={{ borderRadius: 'var(--radius-lg)', padding: '24px 28px', marginBottom: 20, boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Plan de mission
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {workflow.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    {workflow.objective}
                  </div>

                  {/* Progression */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Progression</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {workflow.progress.percent} %
                      </span>
                    </div>
                    <ProgressBar percent={workflow.progress.percent} />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {workflow.progress.completedRequiredSteps} / {workflow.progress.totalRequiredSteps} étapes obligatoires
                    </div>
                  </div>

                  {/* Actions workflow */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                    {workflow.status === 'not_started' && (
                      <button
                        onClick={() => act({ type: 'start_workflow' })}
                        disabled={busy}
                        style={{
                          padding: '8px 18px', fontSize: 13, fontWeight: 600,
                          background: 'var(--violet)', color: '#fff',
                          border: 'none', borderRadius: 'var(--radius-sm)',
                          cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                          opacity: busy ? 0.6 : 1,
                        }}
                      >
                        Démarrer le plan
                      </button>
                    )}
                    {workflow.canPause && (
                      <button
                        onClick={() => act({ type: 'pause_workflow' })}
                        disabled={busy}
                        style={{
                          padding: '8px 18px', fontSize: 13, fontWeight: 600,
                          color: 'var(--text-secondary)', background: 'rgba(139,151,172,0.1)',
                          border: '1px solid rgba(139,151,172,0.2)', borderRadius: 'var(--radius-sm)',
                          cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                          opacity: busy ? 0.6 : 1,
                        }}
                      >
                        Mettre en pause
                      </button>
                    )}
                    {workflow.canResume && (
                      <button
                        onClick={() => act({ type: 'resume_workflow' })}
                        disabled={busy}
                        style={{
                          padding: '8px 18px', fontSize: 13, fontWeight: 600,
                          background: 'var(--violet)', color: '#fff',
                          border: 'none', borderRadius: 'var(--radius-sm)',
                          cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                          opacity: busy ? 0.6 : 1,
                        }}
                      >
                        Reprendre
                      </button>
                    )}
                    {workflow.status === 'completed' && (
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#22C55E', display: 'flex', alignItems: 'center', gap: 6 }}>
                        ✓ Terminé
                      </div>
                    )}
                  </div>
                </div>

                {/* Liste des étapes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[...workflow.steps].sort((a, b) => a.order - b.order).map(step => (
                    <WorkflowStepCard
                      key={step.id}
                      step={step}
                      onStart={sid => act({ type: 'start_step', stepId: sid })}
                      onComplete={sid => act({ type: 'complete_step', stepId: sid })}
                      onSkip={sid => act({ type: 'skip_step', stepId: sid })}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
