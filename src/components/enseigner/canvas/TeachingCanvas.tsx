'use client'

import { useTeaching } from '@/contexts/enseigner/TeachingContext'
import { useSectionTimer } from '@/hooks/enseigner/useTeachingTimer'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  mode: 'idle' | 'active' | 'panic'
}

export function TeachingCanvas({ mode }: Props) {
  const { state, startCourse, completeActivity, reportActivity, nextActivity, prevActivity } = useTeaching()
  const activity = state.activities[state.currentIndex]

  if (mode === 'idle') {
    return <IdleBriefing onStart={startCourse} meta={state.meta} activities={state.activities} />
  }

  if (mode === 'panic') {
    return <PanicCanvas />
  }

  if (!activity) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: '#8B97AC', fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif' }}>
          Aucune activité
        </p>
      </div>
    )
  }

  return (
    <ActivityCanvas
      activity={activity}
      currentIndex={state.currentIndex}
      totalActivities={state.activities.length}
      sessionState={state.sessionState}
      onComplete={() => completeActivity(activity.id)}
      onReport={() => reportActivity(activity.id)}
      onNext={nextActivity}
      onPrev={prevActivity}
    />
  )
}

// ─── Briefing Idle ────────────────────────────────────────────────────────────

function IdleBriefing({
  onStart,
  meta,
  activities,
}: {
  onStart: () => void
  meta: ReturnType<typeof useTeaching>['state']['meta']
  activities: ReturnType<typeof useTeaching>['state']['activities']
}) {
  const totalDuree = activities.reduce((s, a) => s + a.duree_prevue, 0)

  return (
    <div style={{
      maxWidth: 640, margin: '0 auto', padding: '40px 24px',
      display: 'flex', flexDirection: 'column', gap: 24,
    }}>
      {/* Title card */}
      <div style={{
        padding: 28, borderRadius: 20,
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '0 8px 32px rgba(15,35,65,0.08)',
      }}>
        <p style={{
          margin: '0 0 6px',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: '#6C5CE7',
          fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
        }}>
          {meta?.classe_nom ?? '—'} · {meta?.matiere ?? '—'}
        </p>
        <h1 style={{
          margin: '0 0 10px',
          fontSize: 26, fontWeight: 800,
          fontFamily: 'var(--font-display, Lexend), sans-serif',
          color: '#0F1B2D', lineHeight: 1.2,
        }}>
          {meta?.lecon_titre ?? 'Séance'}
        </h1>
        {meta?.objectifs && (
          <p style={{
            margin: '0 0 16px',
            fontSize: 14, lineHeight: 1.6, color: '#5B6B85',
            fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
          }}>
            {meta.objectifs}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <StatPill icon="⏱" label={`${totalDuree} min`} />
          <StatPill icon="📑" label={`${activities.length} activités`} />
          {meta?.date && <StatPill icon="📅" label={meta.date} />}
        </div>
        <button
          onClick={onStart}
          style={{
            padding: '14px 32px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, #6C5CE7, #8B5CF6)',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'var(--font-display, Lexend), sans-serif',
            boxShadow: '0 8px 24px rgba(108,92,231,0.35)',
            transition: 'transform 0.1s, box-shadow 0.1s',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Démarrer le cours ▶
        </button>
      </div>

      {/* Activity preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={{
          margin: 0, fontSize: 13, fontWeight: 700,
          color: '#5B6B85',
          fontFamily: 'var(--font-display, Lexend), sans-serif',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          Plan de la séance
        </h3>
        {activities.map((a, i) => (
          <div key={a.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.9)',
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'rgba(108,92,231,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#6C5CE7',
              flexShrink: 0,
              fontFamily: 'var(--font-display, Lexend), sans-serif',
            }}>
              {i + 1}
            </span>
            <span style={{ fontSize: 15 }}>{a.emoji}</span>
            <span style={{
              flex: 1, fontSize: 13, fontWeight: 500, color: '#0F1B2D',
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
            }}>
              {a.titre}
            </span>
            <span style={{ fontSize: 12, color: '#8B97AC', fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif' }}>
              {a.duree_prevue} min
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Activity Canvas ──────────────────────────────────────────────────────────

interface ActivityCanvasProps {
  activity: ReturnType<typeof useTeaching>['state']['activities'][0]
  currentIndex: number
  totalActivities: number
  sessionState: string
  onComplete: () => void
  onReport: () => void
  onNext: () => void
  onPrev: () => void
}

function ActivityCanvas({
  activity,
  currentIndex,
  totalActivities,
  sessionState,
  onComplete,
  onReport,
  onNext,
  onPrev,
}: ActivityCanvasProps) {
  const isActive = activity.etat === 'en_cours'
  const isDone = activity.etat === 'terminee'
  const isPaused = sessionState === 'paused'

  const { elapsed, percent, color, isOver } = useSectionTimer(
    activity.started_at,
    activity.duree_prevue,
    isActive && !isPaused,
  )

  const timerColor = color === 'red' ? '#EF4444' : color === 'amber' ? '#F59E0B' : '#6C5CE7'

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px' }}>
      {/* Navigation breadcrumb */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
      }}>
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          style={{
            background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.9)',
            borderRadius: 8, padding: '4px 10px', cursor: currentIndex === 0 ? 'default' : 'pointer',
            fontSize: 13, color: currentIndex === 0 ? '#8B97AC' : '#5B6B85',
            fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
            opacity: currentIndex === 0 ? 0.5 : 1,
          }}
        >
          ← Préc.
        </button>
        <span style={{
          fontSize: 12, color: '#8B97AC',
          fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
        }}>
          {currentIndex + 1} / {totalActivities}
        </span>
        <button
          onClick={onNext}
          disabled={currentIndex >= totalActivities - 1}
          style={{
            background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.9)',
            borderRadius: 8, padding: '4px 10px', cursor: currentIndex >= totalActivities - 1 ? 'default' : 'pointer',
            fontSize: 13, color: currentIndex >= totalActivities - 1 ? '#8B97AC' : '#5B6B85',
            fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
            opacity: currentIndex >= totalActivities - 1 ? 0.5 : 1,
          }}
        >
          Suiv. →
        </button>
      </div>

      {/* Main activity card */}
      <div style={{
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.9)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(15,35,65,0.08)',
      }}>
        {/* Activity header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid rgba(15,35,65,0.06)',
          display: 'flex', alignItems: 'flex-start', gap: 14,
        }}>
          <span style={{ fontSize: 28 }}>{activity.emoji}</span>
          <div style={{ flex: 1 }}>
            <h2 style={{
              margin: 0, fontSize: 20, fontWeight: 800,
              fontFamily: 'var(--font-display, Lexend), sans-serif',
              color: '#0F1B2D', lineHeight: 1.2,
            }}>
              {activity.titre}
            </h2>
            <p style={{
              margin: '3px 0 0', fontSize: 12, color: '#8B97AC',
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
            }}>
              Durée prévue : {activity.duree_prevue} min
              {isDone && ' · Terminée ✓'}
            </p>
          </div>

          {/* Section timer */}
          {isActive && (
            <div style={{
              textAlign: 'right', flexShrink: 0,
            }}>
              <p style={{
                margin: 0, fontSize: 20, fontWeight: 700,
                color: timerColor,
                fontFamily: 'var(--font-display, Lexend), sans-serif',
                fontVariantNumeric: 'tabular-nums',
                transition: 'color 0.5s',
              }}>
                {elapsed}
              </p>
              {isOver && (
                <p style={{
                  margin: '2px 0 0', fontSize: 10, color: '#F59E0B', fontWeight: 700,
                  fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                }}>
                  Temps dépassé
                </p>
              )}
            </div>
          )}
        </div>

        {/* Section progress bar */}
        {isActive && (
          <div style={{
            height: 3, background: 'rgba(15,35,65,0.06)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, percent)}%`,
              background: timerColor,
              transition: 'width 1s linear, background 0.5s',
            }} />
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '20px 22px' }}>
          {/* Objectif pill */}
          {activity.objectif && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '8px 12px', borderRadius: 10, marginBottom: 14,
              background: 'rgba(108,92,231,0.06)',
              border: '1px solid rgba(108,92,231,0.12)',
            }}>
              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>🎯</span>
              <p style={{
                margin: 0, fontSize: 13, color: '#5B6B85', lineHeight: 1.5,
                fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
              }}>
                <strong style={{ color: '#6C5CE7', fontWeight: 700 }}>Objectif :</strong>{' '}
                {activity.objectif}
              </p>
            </div>
          )}

          {/* Support */}
          {activity.support && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', borderRadius: 8, marginBottom: 14,
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.15)',
            }}>
              <span style={{ fontSize: 13 }}>📎</span>
              <p style={{
                margin: 0, fontSize: 12, color: '#5B6B85',
                fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
              }}>
                <strong style={{ color: '#16A34A', fontWeight: 600 }}>Support :</strong>{' '}
                {activity.support}
              </p>
            </div>
          )}

          {activity.contenu ? (
            <div style={{
              color: '#0F1B2D', lineHeight: 1.7,
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
              fontSize: 14,
            }}>
              <Markdown remarkPlugins={[remarkGfm]}>{activity.contenu}</Markdown>
            </div>
          ) : (
            <p style={{
              margin: 0, color: '#8B97AC', fontSize: 14, fontStyle: 'italic',
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
            }}>
              Aucune consigne rédigée pour cette activité.
            </p>
          )}
        </div>

        {/* Actions */}
        {!isDone && (
          <div style={{
            padding: '12px 22px 18px',
            borderTop: '1px solid rgba(15,35,65,0.06)',
            display: 'flex', gap: 10, flexWrap: 'wrap',
          }}>
            <button
              onClick={onComplete}
              disabled={isPaused}
              style={{
                padding: '10px 20px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: isPaused ? 'default' : 'pointer',
                fontFamily: 'var(--font-display, Lexend), sans-serif',
                opacity: isPaused ? 0.5 : 1,
                boxShadow: isPaused ? 'none' : '0 4px 12px rgba(34,197,94,0.3)',
                transition: 'all 0.15s',
              }}
            >
              ✓ Terminer
            </button>
            <button
              onClick={onReport}
              disabled={isPaused}
              style={{
                padding: '10px 20px', borderRadius: 10,
                border: '1px solid rgba(245,158,11,0.4)',
                background: 'rgba(245,158,11,0.08)',
                color: '#D97706', fontSize: 13, fontWeight: 600, cursor: isPaused ? 'default' : 'pointer',
                fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                opacity: isPaused ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              ↷ Reporter
            </button>
            {currentIndex < totalActivities - 1 && (
              <button
                onClick={onNext}
                style={{
                  marginLeft: 'auto',
                  padding: '10px 20px', borderRadius: 10,
                  border: '1px solid rgba(108,92,231,0.25)',
                  background: 'rgba(108,92,231,0.08)',
                  color: '#6C5CE7', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                  transition: 'all 0.15s',
                }}
              >
                Suivant →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Panic Canvas ─────────────────────────────────────────────────────────────

function PanicCanvas() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: 40, gap: 16,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(239,68,68,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28,
      }}>
        ⚠️
      </div>
      <h2 style={{
        margin: 0, fontSize: 20, fontWeight: 800,
        fontFamily: 'var(--font-display, Lexend), sans-serif',
        color: '#0F1B2D',
      }}>
        Mode Imprévu
      </h2>
      <p style={{
        margin: 0, fontSize: 14, color: '#5B6B85', textAlign: 'center', maxWidth: 400,
        fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
      }}>
        Prenez le temps qu&apos;il faut. Le cours reprendra où vous l&apos;avez laissé.
      </p>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatPill({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 100,
      background: 'rgba(108,92,231,0.08)',
      border: '1px solid rgba(108,92,231,0.15)',
    }}>
      <span style={{ fontSize: 12 }}>{icon}</span>
      <span style={{
        fontSize: 12, color: '#5B6B85', fontWeight: 500,
        fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
      }}>
        {label}
      </span>
    </div>
  )
}
