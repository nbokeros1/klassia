'use client'

import { useState } from 'react'
import { ActivityCard } from './ActivityCard'
import { QuickNotePanel } from '../notes/QuickNotePanel'
import { TeachingTimeline } from '../timeline/TeachingTimeline'
import { AddActivityModal } from './AddActivityModal'
import { useTeaching } from '@/contexts/enseigner/TeachingContext'

const PHASE_LABELS: Record<string, string> = {
  avant: 'Avant', pendant: 'Pendant', apres: 'Après', libre: 'Séance',
}

type Tab = 'storyboard' | 'notes' | 'timeline'

interface Props {
  open: boolean
  onToggle: () => void
}

export function TeachingStoryboard({ open, onToggle }: Props) {
  const {
    state, navigateTo, startCourse,
    moveActivityUp, moveActivityDown, duplicateActivity,
    mergeActivities, ignoreActivity,
  } = useTeaching()

  const [tab, setTab]             = useState<Tab>('storyboard')
  const [reorderMode, setReorder] = useState(false)
  const [showAdd, setShowAdd]     = useState(false)
  const [mergeA, setMergeA]       = useState<number | null>(null)

  const activities   = state.activities
  const currentActivity = activities[state.currentIndex]
  const isIdle   = state.sessionState === 'idle'
  const isActive = state.sessionState === 'active' || state.sessionState === 'paused'

  const terminees   = activities.filter(a => a.etat === 'terminee').length
  const total       = activities.length
  const progressPct = total > 0 ? Math.round((terminees / total) * 100) : 0

  // Merge selection
  const handleMergeClick = (index: number) => {
    if (mergeA === null) {
      setMergeA(index)
    } else if (mergeA === index) {
      setMergeA(null)
    } else {
      mergeActivities(Math.min(mergeA, index), Math.max(mergeA, index))
      setMergeA(null)
      setReorder(false)
    }
  }

  return (
    <>
      <div style={{
        width: 260, height: '100vh',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(13,30,58,0.94)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        position: 'relative', zIndex: 20, overflow: 'hidden', flexShrink: 0,
      }}>

        {/* ─── Header ────────────────────────────────────────────────────────── */}
        <div style={{ padding: '16px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{
              fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
              fontFamily: 'var(--font-display, Lexend), sans-serif',
            }}>
              Storyboard
            </span>
            <button onClick={onToggle} title="Masquer" style={iconBtnStyle}>←</button>
          </div>

          {state.meta && (
            <p style={{
              margin: 0, fontSize: 13, fontWeight: 600,
              color: 'rgba(255,255,255,0.9)',
              fontFamily: 'var(--font-display, Lexend), sans-serif', lineHeight: 1.3,
            }}>
              {state.meta.lecon_titre}
            </p>
          )}

          {isActive && (
            <div style={{ marginTop: 8 }}>
              <div style={{ height: 3, borderRadius: 100, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 100,
                  width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, #6C5CE7, #8B5CF6)',
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <p style={{
                margin: '4px 0 0', fontSize: 10,
                color: 'rgba(255,255,255,0.4)',
                fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
              }}>
                {terminees}/{total} activités · {progressPct}%
              </p>
            </div>
          )}
        </div>

        {/* ─── Tabs ──────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', padding: '8px 10px 0', gap: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {([
            { key: 'storyboard', label: 'Activités' },
            { key: 'notes',      label: `Notes (${state.notes.length})` },
            { key: 'timeline',   label: `TL (${state.timeline.length})` },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '5px 2px',
              background: tab === t.key ? 'rgba(108,92,231,0.3)' : 'transparent',
              border: 'none', borderRadius: '8px 8px 0 0',
              color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.35)',
              fontSize: 10, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
              transition: 'all 0.15s', letterSpacing: '0.03em',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── Reorder toolbar (shown in storyboard tab) ─────────────────────── */}
        {tab === 'storyboard' && isActive && (
          <div style={{
            display: 'flex', gap: 4, padding: '6px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <button
              onClick={() => { setReorder(v => !v); setMergeA(null) }}
              style={{
                ...miniBtn,
                background: reorderMode ? 'rgba(108,92,231,0.3)' : 'rgba(255,255,255,0.08)',
                color: reorderMode ? '#a78bfa' : 'rgba(255,255,255,0.5)',
              }}
              title="Mode réorganisation"
            >
              ↕ Réorganiser
            </button>
            <button
              onClick={() => setShowAdd(true)}
              style={{ ...miniBtn, background: 'rgba(34,197,94,0.15)', color: '#86efac' }}
              title="Ajouter une activité"
            >
              ⚡ Ajouter
            </button>
          </div>
        )}

        {/* ─── Body ──────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 20px' }}>
          {tab === 'storyboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Idle start prompt */}
              {isIdle && (
                <div style={{
                  padding: 12, borderRadius: 12,
                  background: 'rgba(108,92,231,0.15)',
                  border: '1px solid rgba(108,92,231,0.3)', marginBottom: 8,
                }}>
                  <p style={{
                    margin: '0 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.7)',
                    fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                    lineHeight: 1.4,
                  }}>
                    {total} activité{total > 1 ? 's' : ''} planifiée{total > 1 ? 's' : ''}
                  </p>
                  <button onClick={startCourse} style={{
                    width: '100%', padding: 8, borderRadius: 8, border: 'none',
                    background: 'linear-gradient(135deg, #6C5CE7, #8B5CF6)',
                    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'var(--font-display, Lexend), sans-serif',
                    boxShadow: '0 4px 12px rgba(108,92,231,0.4)',
                  }}>
                    Démarrer le cours ▶
                  </button>
                </div>
              )}

              {/* Merge mode banner */}
              {reorderMode && mergeA !== null && (
                <div style={{
                  padding: '6px 10px', borderRadius: 8,
                  background: 'rgba(139,92,246,0.2)',
                  border: '1px solid rgba(139,92,246,0.4)',
                  fontSize: 11, color: '#c4b5fd',
                  fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                  marginBottom: 4,
                }}>
                  ⊕ Sélectionnez la 2e activité à fusionner
                </div>
              )}

              {activities.map((a, i) => {
                const showHeader = i === 0 || a.phase !== activities[i - 1].phase
                return (
                  <div key={a.id}>
                    {showHeader && (
                      <p style={{
                        margin: '10px 0 4px 2px', fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.35)',
                        fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                      }}>
                        {PHASE_LABELS[a.phase] ?? a.phase}
                      </p>
                    )}

                    <div style={{ position: 'relative' }}>
                      <ActivityCard
                        activity={a}
                        isCurrent={state.currentIndex === i}
                        onClick={() => reorderMode ? undefined : navigateTo(i)}
                      />

                      {/* Reorder controls overlay */}
                      {reorderMode && (
                        <div style={{
                          position: 'absolute', top: 4, right: 4,
                          display: 'flex', gap: 2,
                        }}>
                          <button onClick={() => moveActivityUp(i)} disabled={i === 0}
                            style={{ ...reorderBtn, opacity: i === 0 ? 0.3 : 1 }} title="Monter">
                            ↑
                          </button>
                          <button onClick={() => moveActivityDown(i)} disabled={i === activities.length - 1}
                            style={{ ...reorderBtn, opacity: i === activities.length - 1 ? 0.3 : 1 }} title="Descendre">
                            ↓
                          </button>
                          <button onClick={() => duplicateActivity(i)}
                            style={{ ...reorderBtn }} title="Dupliquer">
                            ⧉
                          </button>
                          <button
                            onClick={() => handleMergeClick(i)}
                            style={{
                              ...reorderBtn,
                              background: mergeA === i ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.2)',
                            }}
                            title="Fusionner"
                          >
                            ⊕
                          </button>
                          <button onClick={() => ignoreActivity(a.id)}
                            style={{ ...reorderBtn, background: 'rgba(139,151,172,0.2)' }} title="Ignorer">
                            ⏩
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'notes' && <QuickNotePanel />}

          {tab === 'timeline' && (
            <div style={{ paddingTop: 4 }}>
              <TeachingTimeline maxHeight={420} />
            </div>
          )}
        </div>

        {/* ─── Footer: current activity ────────────────────────────────────── */}
        {isActive && currentActivity && tab !== 'timeline' && (
          <div style={{
            padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(108,92,231,0.1)',
          }}>
            <p style={{
              margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)',
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif', lineHeight: 1,
            }}>En cours</p>
            <p style={{
              margin: '2px 0 0', fontSize: 13, fontWeight: 600,
              color: 'rgba(255,255,255,0.9)',
              fontFamily: 'var(--font-display, Lexend), sans-serif',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {currentActivity.emoji} {currentActivity.titre}
            </p>
          </div>
        )}
      </div>

      {/* Add activity modal */}
      {showAdd && (
        <AddActivityModal
          insertAfterIndex={state.currentIndex}
          onClose={() => setShowAdd(false)}
        />
      )}
    </>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const iconBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
  width: 28, height: 28, cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 14, transition: 'background 0.15s',
}

const miniBtn: React.CSSProperties = {
  flex: 1, padding: '4px 6px', borderRadius: 6, border: 'none',
  fontSize: 10, fontWeight: 700, cursor: 'pointer',
  fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
  letterSpacing: '0.03em', transition: 'all 0.15s',
}

const reorderBtn: React.CSSProperties = {
  background: 'rgba(108,92,231,0.3)', border: 'none', borderRadius: 4,
  width: 20, height: 20, cursor: 'pointer', color: '#a78bfa',
  fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.15s',
}
