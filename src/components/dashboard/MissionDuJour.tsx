'use client'

import { useState } from 'react'
import type { MissionPublic, MissionAction } from '@/lib/mission-engine/client'
import type { WorkflowSummary } from '@/lib/workflow-runtime/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MissionDuJourProps {
  mission:              MissionPublic | null
  loading?:             boolean
  error?:               string | null
  isFr?:                boolean
  onAction?:            (mission: MissionPublic, action: MissionAction) => Promise<MissionPublic | null>
  onNavigate?:          (mission: MissionPublic) => void
  workflowSummary?:     WorkflowSummary | null
  onWorkflowNavigate?:  (workflowId: string) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPriorityLabel(priority: number): { label: string; color: string; bg: string } {
  if (priority >= 90) return { label: 'Prioritaire', color: '#6C5CE7', bg: 'rgba(108,92,231,0.1)'  }
  if (priority >= 70) return { label: 'Recommandée', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  }
  return                     { label: 'Suggestion',  color: '#8B97AC', bg: 'rgba(139,151,172,0.1)' }
}

function getStatusBadge(status: MissionPublic['status']): { label: string; color: string; bg: string } | null {
  switch (status) {
    case 'accepted':    return { label: 'Acceptée',   color: '#6C5CE7', bg: 'rgba(108,92,231,0.1)'  }
    case 'in_progress': return { label: 'En cours',   color: '#10B981', bg: 'rgba(16,185,129,0.1)'  }
    default: return null
  }
}

// ── Workflow status strip ─────────────────────────────────────────────────────

function WorkflowStatusStrip({
  summary,
  onNavigate,
}: {
  summary:    WorkflowSummary
  onNavigate: (id: string) => void
}) {
  const { workflowId, status, progressPercent } = summary
  if (!workflowId || !status) return null

  const navigate = () => onNavigate(workflowId)

  const stripStyle: React.CSSProperties = {
    marginTop: 12,
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(108,92,231,0.05)',
    border: '1px solid rgba(108,92,231,0.12)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  }

  const btnSmall = (primary: boolean): React.CSSProperties => ({
    padding: '6px 12px', fontSize: 11, fontWeight: 600,
    background: primary ? 'var(--violet)' : 'rgba(108,92,231,0.08)',
    color: primary ? '#fff' : 'var(--violet)',
    border: primary ? 'none' : '1px solid rgba(108,92,231,0.2)',
    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    fontFamily: 'inherit', boxShadow: primary ? '0 2px 8px var(--violet-glow)' : 'none',
  })

  const pct = progressPercent ?? 0

  if (status === 'not_started') {
    return (
      <div style={stripStyle}>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Plan d'exécution disponible</div>
        <button style={btnSmall(true)} onClick={navigate}>Démarrer le plan</button>
      </div>
    )
  }

  if (status === 'in_progress') {
    return (
      <div style={stripStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Plan en cours</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet)' }}>{pct} %</span>
        </div>
        <div style={{ height: 4, borderRadius: 99, background: 'rgba(108,92,231,0.12)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--violet)', borderRadius: 99, transition: 'width 0.3s' }} />
        </div>
        <button style={btnSmall(true)} onClick={navigate}>Continuer</button>
      </div>
    )
  }

  if (status === 'paused') {
    return (
      <div style={stripStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Plan en pause</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber, #F59E0B)' }}>{pct} %</span>
        </div>
        <div style={{ height: 4, borderRadius: 99, background: 'rgba(108,92,231,0.12)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--amber, #F59E0B)', borderRadius: 99 }} />
        </div>
        <button style={btnSmall(false)} onClick={navigate}>Reprendre</button>
      </div>
    )
  }

  if (status === 'completed') {
    return (
      <div style={{ ...stripStyle, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#15803D' }}>✓ Plan terminé</div>
      </div>
    )
  }

  return null
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function MissionSkeleton() {
  return (
    <div
      className="glass-light"
      style={{ borderRadius: 'var(--radius-lg)', padding: '20px 24px', boxShadow: 'var(--shadow-card)' }}
      aria-busy="true"
      aria-label="Chargement des recommandations ScorgIA"
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--violet)', textTransform: 'uppercase' as const, marginBottom: 12 }}>
        ✦ Mission du jour
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[120, 80, 60].map((w, i) => (
          <div
            key={i}
            style={{ height: 12, borderRadius: 6, background: 'rgba(108,92,231,0.08)', width: w, animation: 'pulse 1.4s ease infinite', animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}

function MissionEmpty({ isFr }: { isFr: boolean }) {
  return (
    <div
      className="glass-light"
      style={{ borderRadius: 'var(--radius-lg)', padding: '18px 24px', boxShadow: 'var(--shadow-card)' }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--violet)', textTransform: 'uppercase' as const, marginBottom: 8 }}>
        ✦ Mission du jour
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
        {isFr ? 'Tout est à jour' : 'All up to date'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        {isFr
          ? 'Aucune mission prioritaire n\'a été détectée pour cette classe.'
          : 'No priority mission was detected for this class.'}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function MissionDuJour({
  mission: initialMission,
  loading  = false,
  error    = null,
  isFr     = true,
  onAction,
  onNavigate,
  workflowSummary,
  onWorkflowNavigate,
}: MissionDuJourProps) {
  const [mission,    setMission]    = useState(initialMission)
  const [showWhy,    setShowWhy]    = useState(false)
  const [hidden,     setHidden]     = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionErr,  setActionErr]  = useState<string | null>(null)

  // Sync si la prop change (rechargement externe)
  if (initialMission !== mission && !actionBusy) {
    setMission(initialMission)
  }

  if (loading) return <MissionSkeleton />
  if (hidden)  return null

  if (error) {
    return (
      <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(15,35,65,0.03)', border: '1px solid rgba(15,35,65,0.06)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {isFr
            ? 'Les recommandations ne sont pas disponibles pour le moment.'
            : 'Recommendations are not available at this time.'}
        </div>
      </div>
    )
  }

  if (!mission) return <MissionEmpty isFr={isFr} />

  const prio        = getPriorityLabel(mission.priority)
  const statusBadge = getStatusBadge(mission.status)
  const sujet       = mission.metadata.suggestedTopic
  const contextLine = [mission.metadata.matiere, mission.metadata.classeNom].filter(Boolean).join(' · ')

  const handleAction = async (action: MissionAction) => {
    if (!mission || actionBusy || !onAction) return
    setActionBusy(true)
    setActionErr(null)
    try {
      const updated = await onAction(mission, action)
      if (updated) {
        // hide completed/dismissed
        if (updated.status === 'completed' || updated.status === 'dismissed') {
          setHidden(true)
        } else {
          setMission(updated)
        }
      }
    } catch {
      setActionErr(
        isFr
          ? 'Impossible de mettre à jour cette mission pour le moment.'
          : 'Unable to update this mission right now.',
      )
    } finally {
      setActionBusy(false)
    }
  }

  const handlePreparer = async () => {
    if (!mission || actionBusy) return
    // "Préparer maintenant" depuis proposed → start then navigate
    if (mission.status === 'proposed' && onAction) {
      setActionBusy(true)
      try {
        const updated = await onAction(mission, 'start')
        if (updated) setMission(updated)
      } finally {
        setActionBusy(false)
      }
    }
    onNavigate?.(mission)
  }

  const btnStyle = (primary: boolean): React.CSSProperties => ({
    padding: '8px 16px', fontSize: 12, fontWeight: 600,
    background: primary ? 'var(--violet)' : 'rgba(108,92,231,0.08)',
    color: primary ? '#fff' : 'var(--violet)',
    border: primary ? 'none' : '1px solid rgba(108,92,231,0.2)',
    borderRadius: 'var(--radius-sm)', cursor: actionBusy ? 'not-allowed' : 'pointer',
    boxShadow: primary ? '0 4px 12px var(--violet-glow)' : 'none',
    fontFamily: 'inherit', opacity: actionBusy ? 0.6 : 1, transition: 'opacity 0.15s',
  })

  const ghostBtn: React.CSSProperties = {
    fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none',
    cursor: actionBusy ? 'not-allowed' : 'pointer', padding: '4px 6px', borderRadius: 4,
    fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2,
    opacity: actionBusy ? 0.4 : 0.7, transition: 'opacity 0.15s',
  }

  return (
    <div
      className="glass-light"
      style={{ borderRadius: 'var(--radius-lg)', padding: '20px 24px', boxShadow: 'var(--shadow-card)', position: 'relative' }}
      role="region"
      aria-label="Mission du jour ScorgIA"
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--violet)', textTransform: 'uppercase' as const }}>
          ✦ Mission du jour
        </div>
        {/* Status badge (si accepted/in_progress) ou bouton fermer */}
        {statusBadge ? (
          <span style={{ fontSize: 10, fontWeight: 700, color: statusBadge.color, background: statusBadge.bg, padding: '2px 8px', borderRadius: 99, letterSpacing: '0.04em' }}>
            {statusBadge.label}
          </span>
        ) : (
          <button
            onClick={() => setHidden(true)}
            disabled={actionBusy}
            aria-label="Fermer"
            style={{ fontSize: 14, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', lineHeight: 1, borderRadius: 4, fontFamily: 'inherit', opacity: 0.5 }}
          >
            ×
          </button>
        )}
      </div>

      {/* Priority badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: prio.color, background: prio.bg, padding: '2px 8px', borderRadius: 99, letterSpacing: '0.04em' }}>
          {prio.label}
        </span>
      </div>

      {/* Title */}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 4 }}>
        {mission.title}
      </div>

      {/* Context line */}
      {contextLine && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: sujet ? 8 : 12 }}>
          {contextLine}
        </div>
      )}

      {/* Suggested topic */}
      {sujet && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, padding: '6px 10px', borderRadius: 8, background: 'rgba(108,92,231,0.05)', borderLeft: '2px solid rgba(108,92,231,0.3)' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{isFr ? 'Sujet suggéré : ' : 'Suggested topic: '}</span>
          {sujet}
        </div>
      )}

      {/* Reason */}
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
        {mission.reason.label}
      </div>

      {/* Error feedback */}
      {actionErr && (
        <div style={{ fontSize: 11, color: 'var(--red-alert, #EF4444)', marginBottom: 10, padding: '6px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
          {actionErr}
        </div>
      )}

      {/* ── Boutons par statut ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>

        {mission.status === 'proposed' && (
          <>
            <button disabled={actionBusy} onClick={() => handleAction('accept')} style={btnStyle(true)}>
              {isFr ? 'Accepter' : 'Accept'}
            </button>
            <button disabled={actionBusy} onClick={handlePreparer} style={btnStyle(false)}>
              {isFr ? 'Préparer maintenant' : 'Prepare now'}
            </button>
            <button disabled={actionBusy} onClick={() => handleAction('dismiss')} style={ghostBtn}>
              {isFr ? 'Ignorer' : 'Dismiss'}
            </button>
          </>
        )}

        {mission.status === 'accepted' && (
          <>
            <button disabled={actionBusy} onClick={() => { handleAction('start').then(() => onNavigate?.(mission)) }} style={btnStyle(true)}>
              {isFr ? 'Commencer' : 'Start'}
            </button>
            <button disabled={actionBusy} onClick={() => handleAction('dismiss')} style={ghostBtn}>
              {isFr ? 'Ignorer' : 'Dismiss'}
            </button>
          </>
        )}

        {mission.status === 'in_progress' && (
          <>
            <button disabled={actionBusy} onClick={() => onNavigate?.(mission)} style={btnStyle(true)}>
              {isFr ? 'Continuer' : 'Continue'}
            </button>
            <button disabled={actionBusy} onClick={() => handleAction('complete')} style={btnStyle(false)}>
              {isFr ? 'Marquer terminée' : 'Mark complete'}
            </button>
            <button disabled={actionBusy} onClick={() => handleAction('dismiss')} style={ghostBtn}>
              {isFr ? 'Ignorer' : 'Dismiss'}
            </button>
          </>
        )}

        {actionBusy && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>…</span>
        )}
      </div>

      {/* "Voir pourquoi" */}
      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => setShowWhy(v => !v)}
          aria-expanded={showWhy}
          aria-controls="mission-why-panel"
          style={ghostBtn}
        >
          {showWhy ? (isFr ? 'Masquer' : 'Hide') : (isFr ? 'Voir pourquoi' : 'See why')}
        </button>
      </div>

      {showWhy && (
        <div
          id="mission-why-panel"
          style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(15,35,65,0.07)' }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
            {mission.reason.description}
          </div>
          {mission.evidence.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {mission.evidence.map((ev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: 10, color: 'var(--violet)', fontWeight: 700 }}>✓</span>
                  {ev.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {workflowSummary?.exists && onWorkflowNavigate && (
        <WorkflowStatusStrip summary={workflowSummary} onNavigate={onWorkflowNavigate} />
      )}
    </div>
  )
}
