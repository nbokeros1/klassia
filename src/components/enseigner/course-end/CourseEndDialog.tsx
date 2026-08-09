'use client'

import { useState } from 'react'
import { useTeaching } from '@/contexts/enseigner/TeachingContext'
import { useFlowEngine } from '@/hooks/enseigner/useFlowEngine'
import { FlowReplay } from '../flow/FlowReplay'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function CourseEndDialog() {
  const { state, cancelEnd, confirmEnd } = useTeaching()
  const { replay, paceScore } = useFlowEngine()
  const [showReplay, setShowReplay] = useState(false)
  const router = useRouter()

  const activities = state.activities
  const terminees  = activities.filter(a => a.etat === 'terminee').length
  const reportees  = activities.filter(a => a.etat === 'reportee').length
  const annulees   = activities.filter(a => a.etat === 'annulee').length
  const totalMs    = state.startedAt
    ? Math.max(0, Date.now() - state.startedAt - state.totalPauseMs)
    : 0
  const totalMin   = Math.floor(totalMs / 60000)
  const notesCount = state.notes.length

  const handleConfirm = async () => {
    // Mark leçon as enseignee in Supabase
    if (state.meta?.lecon_id) {
      const supabase = createClient()
      await supabase
        .from('lecons')
        .update({ statut: 'enseignee' })
        .eq('id', state.meta.lecon_id)
    }
    confirmEnd()
    // Brief delay then navigate away
    setTimeout(() => {
      router.push('/dashboard/gerer/enseigner')
    }, 1200)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15,35,65,0.6)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(20px)',
        borderRadius: 22,
        padding: '32px 36px',
        maxWidth: 480, width: '100%', margin: '0 20px',
        boxShadow: '0 24px 64px rgba(15,35,65,0.24)',
        border: '1px solid rgba(255,255,255,0.9)',
      }}>
        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(108,92,231,0.15), rgba(139,92,246,0.15))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, marginBottom: 18,
        }}>
          🏁
        </div>

        <h2 style={{
          margin: '0 0 6px',
          fontSize: 22, fontWeight: 800,
          fontFamily: 'var(--font-display, Lexend), sans-serif',
          color: '#0F1B2D',
        }}>
          Terminer le cours?
        </h2>
        <p style={{
          margin: '0 0 24px',
          fontSize: 14, color: '#5B6B85', lineHeight: 1.5,
          fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
        }}>
          La séance sera marquée comme <strong>enseignée</strong> dans votre journal.
        </p>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 10, marginBottom: 24,
        }}>
          <StatCard label="Durée réelle" value={`${totalMin} min`} icon="⏱" />
          <StatCard label="Activités terminées" value={`${terminees} / ${activities.length}`} icon="✅" />
          {reportees > 0 && <StatCard label="Reportées" value={`${reportees}`} icon="↷" />}
          {notesCount > 0 && <StatCard label="Notes" value={`${notesCount}`} icon="📝" />}
        </div>

        {/* Pace score teaser + Flow Replay */}
        {replay.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => setShowReplay(v => !v)}
              style={{
                width: '100%', padding: '8px 14px', borderRadius: 10,
                border: '1px solid rgba(108,92,231,0.15)',
                background: 'rgba(108,92,231,0.04)',
                color: '#6C5CE7', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span>Voir le replay de séance &amp; Teaching Pace Score</span>
              <span>{showReplay ? '▲' : '▼'}</span>
            </button>
            {showReplay && (
              <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 4 }}>
                <FlowReplay replay={replay} paceScore={paceScore} />
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={cancelEnd}
            style={{
              flex: 1, padding: '12px', borderRadius: 12,
              border: '1px solid rgba(15,35,65,0.12)',
              background: 'rgba(15,35,65,0.04)', color: '#5B6B85',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
              transition: 'background 0.15s',
            }}
          >
            Continuer le cours
          </button>
          <button
            onClick={handleConfirm}
            style={{
              flex: 1, padding: '12px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #6C5CE7, #8B5CF6)',
              color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-display, Lexend), sans-serif',
              boxShadow: '0 4px 16px rgba(108,92,231,0.35)',
              transition: 'all 0.15s',
            }}
          >
            Terminer la séance ✓
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 12,
      background: 'rgba(108,92,231,0.06)',
      border: '1px solid rgba(108,92,231,0.12)',
    }}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
      <p style={{
        margin: 0, fontSize: 16, fontWeight: 700,
        color: '#0F1B2D',
        fontFamily: 'var(--font-display, Lexend), sans-serif',
      }}>
        {value}
      </p>
      <p style={{
        margin: '2px 0 0', fontSize: 11, color: '#8B97AC',
        fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
      }}>
        {label}
      </p>
    </div>
  )
}
