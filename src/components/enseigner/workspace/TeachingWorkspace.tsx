'use client'

import { useState } from 'react'
import { TeachingHeader } from './TeachingHeader'
import { TeachingStoryboard } from '../storyboard/TeachingStoryboard'
import { TeachingCanvas } from '../canvas/TeachingCanvas'
import { TeachingToolbar } from '../toolbar/TeachingToolbar'
import { IASuggestionBanner } from '../ia/IASuggestionBanner'
import { TimeInsightBanner } from '../time/TimeInsightBanner'
import { FlowInsightChip } from '../flow/FlowInsightChip'
import { CopilotPanel } from '../copilot/CopilotPanel'
import { CourseEndDialog } from '../course-end/CourseEndDialog'
import { useTeaching } from '@/contexts/enseigner/TeachingContext'

export function TeachingWorkspace() {
  const { state } = useTeaching()
  const [storyboardOpen, setStoryboardOpen] = useState(true)
  const [activeToolId, setActiveToolId]     = useState<string | null>(null)

  const canvasMode =
    state.sessionState === 'panic'   ? 'panic'  :
    state.sessionState === 'idle'    ? 'idle'   :
    state.sessionState === 'closing' ? 'active' :
    state.sessionState === 'done'    ? 'active' :
    'active'

  const isDone   = state.sessionState === 'done'
  const isClosing = state.sessionState === 'closing'

  return (
    <>
      {/* ambient blobs */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,92,231,0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', left: '15%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
      </div>

      {/* Main layout */}
      <div style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(160deg, var(--bg-top, #EEF5FF) 0%, var(--bg-bottom, #FFFFFF) 100%)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Storyboard sidebar */}
        <div style={{
          width: storyboardOpen ? 260 : 0,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <TeachingStoryboard
            open={storyboardOpen}
            onToggle={() => setStoryboardOpen(v => !v)}
          />
        </div>

        {/* Right panel */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {/* Header */}
          <TeachingHeader
            storyboardOpen={storyboardOpen}
            onToggleStoryboard={() => setStoryboardOpen(v => !v)}
          />

          {/* Toolbar */}
          <TeachingToolbar
            activeToolId={activeToolId}
            onToolSelect={setActiveToolId}
          />

          {/* IA suggestion banner */}
          {state.suggestion && <IASuggestionBanner />}

          {/* Time Intelligence banner */}
          <TimeInsightBanner />

          {/* Done banner */}
          {isDone && (
            <div style={{
              padding: '10px 20px',
              background: 'linear-gradient(90deg, rgba(34,197,94,0.12), rgba(34,197,94,0.06))',
              borderBottom: '1px solid rgba(34,197,94,0.2)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>🎉</span>
              <p style={{
                margin: 0, fontSize: 13, fontWeight: 600, color: '#16A34A',
                fontFamily: 'var(--font-display, Lexend), sans-serif',
              }}>
                Cours terminé — séance marquée comme enseignée.
              </p>
            </div>
          )}

          {/* Canvas */}
          <main style={{
            flex: 1, overflowY: 'auto',
            position: 'relative',
          }}>
            <TeachingCanvas mode={canvasMode} />
          </main>
        </div>
      </div>

      {/* Flow insight chip — floating bottom-right */}
      <FlowInsightChip />

      {/* Teaching Copilot panel */}
      {activeToolId === 'copilot' && (
        <CopilotPanel onClose={() => setActiveToolId(null)} />
      )}

      {/* Course-end modal */}
      {isClosing && <CourseEndDialog />}

      {/* Global keyframe animation */}
      <style>{`
        @keyframes klassia-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  )
}
