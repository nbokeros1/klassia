'use client'

import { useState, useCallback } from 'react'
import { useTeaching } from '@/contexts/enseigner/TeachingContext'
import { useCountdownTimer } from '@/hooks/enseigner/useTeachingTimer'

interface ToolDef {
  id: string
  emoji: string
  label: string
  available: boolean
}

const TOOLS: ToolDef[] = [
  { id: 'chrono',       emoji: '⏱',  label: 'Minuterie',      available: true },
  { id: 'sondage',      emoji: '📊',  label: 'Sondage',        available: true },
  { id: 'calculatrice', emoji: '🧮',  label: 'Calculatrice',   available: true },
  { id: 'tbi',          emoji: '🎨',  label: 'Tableau blanc',  available: true },
  { id: 'presentation', emoji: '🖥',  label: 'Présenter',      available: true },
  { id: 'copilot',      emoji: '🤖',  label: 'Copilot',        available: true },
]

interface Props {
  activeToolId: string | null
  onToolSelect: (id: string | null) => void
}

export function TeachingToolbar({ activeToolId, onToolSelect }: Props) {
  const { state } = useTeaching()
  const isActive = state.sessionState === 'active' || state.sessionState === 'paused'

  const handleTool = useCallback((id: string) => {
    onToolSelect(activeToolId === id ? null : id)
  }, [activeToolId, onToolSelect])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '6px 16px',
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(15,35,65,0.08)',
    }}>
      {TOOLS.map(tool => (
        <ToolButton
          key={tool.id}
          tool={tool}
          isActive={activeToolId === tool.id}
          disabled={!isActive}
          onClick={() => handleTool(tool.id)}
        />
      ))}

      {/* Countdown widget (only visible when chrono is active) */}
      {activeToolId === 'chrono' && isActive && (
        <CountdownWidget onClose={() => onToolSelect(null)} />
      )}

      {/* Sondage link */}
      {activeToolId === 'sondage' && isActive && (
        <SondageLauncher onClose={() => onToolSelect(null)} />
      )}
    </div>
  )
}

// ─── Tool Button ──────────────────────────────────────────────────────────────

function ToolButton({
  tool, isActive, disabled, onClick,
}: {
  tool: ToolDef
  isActive: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tool.label}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 2, padding: '5px 10px', borderRadius: 10, border: 'none',
        background: isActive ? 'rgba(108,92,231,0.12)' : 'transparent',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.15s',
        minWidth: 56,
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{tool.emoji}</span>
      <span style={{
        fontSize: 10, fontWeight: 500,
        color: isActive ? '#6C5CE7' : '#8B97AC',
        fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
        lineHeight: 1,
      }}>
        {tool.label}
      </span>
      {isActive && (
        <span style={{
          width: 4, height: 4, borderRadius: '50%',
          background: '#6C5CE7', marginTop: 1,
        }} />
      )}
    </button>
  )
}

// ─── Countdown Widget ─────────────────────────────────────────────────────────

const PRESETS = [1, 2, 3, 5, 10, 15, 20]

function CountdownWidget({ onClose }: { onClose: () => void }) {
  const [minutes, setMinutes]   = useState(5)
  const [startedAt, setStarted] = useState<number | null>(null)
  const isRunning = startedAt !== null

  const { display, isOver, percent, color } = useCountdownTimer(startedAt, minutes, isRunning)

  const barColor = color === 'red' ? '#EF4444' : color === 'amber' ? '#F59E0B' : '#6C5CE7'

  const handleToggle = () => {
    if (isRunning) {
      setStarted(null)
    } else {
      setStarted(Date.now())
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 14px', marginLeft: 8,
      background: 'rgba(255,255,255,0.9)',
      border: '1px solid rgba(108,92,231,0.2)',
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(15,35,65,0.08)',
    }}>
      {/* Presets */}
      {!isRunning && (
        <div style={{ display: 'flex', gap: 4 }}>
          {PRESETS.map(p => (
            <button
              key={p}
              onClick={() => setMinutes(p)}
              style={{
                padding: '2px 7px', borderRadius: 6, border: 'none',
                background: minutes === p ? 'rgba(108,92,231,0.15)' : 'transparent',
                color: minutes === p ? '#6C5CE7' : '#8B97AC',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
              }}
            >
              {p}′
            </button>
          ))}
        </div>
      )}

      {/* Display */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{
          fontSize: 18, fontWeight: 700,
          color: isOver ? '#EF4444' : barColor,
          fontFamily: 'var(--font-display, Lexend), sans-serif',
          fontVariantNumeric: 'tabular-nums',
          transition: 'color 0.5s',
        }}>
          {isRunning ? (isOver ? 'Terminé!' : display) : `${String(minutes).padStart(2, '0')}:00`}
        </span>
        {isRunning && (
          <div style={{
            width: 60, height: 2, borderRadius: 100, marginTop: 2,
            background: 'rgba(15,35,65,0.1)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: `${percent}%`,
              background: barColor,
              transition: 'width 0.5s linear, background 0.5s',
            }} />
          </div>
        )}
      </div>

      {/* Controls */}
      <button
        onClick={handleToggle}
        style={{
          padding: '4px 12px', borderRadius: 8, border: 'none',
          background: isRunning ? 'rgba(239,68,68,0.1)' : 'rgba(108,92,231,0.15)',
          color: isRunning ? '#EF4444' : '#6C5CE7',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
        }}
      >
        {isRunning ? '⏹ Stop' : '▶ Lancer'}
      </button>

      <button onClick={onClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#8B97AC', fontSize: 16, lineHeight: 1, padding: 2,
      }}>
        ✕
      </button>
    </div>
  )
}

// ─── Sondage Launcher ─────────────────────────────────────────────────────────

function SondageLauncher({ onClose }: { onClose: () => void }) {
  const { state } = useTeaching()

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 14px', marginLeft: 8,
      background: 'rgba(255,255,255,0.9)',
      border: '1px solid rgba(108,92,231,0.2)',
      borderRadius: 12,
    }}>
      <a
        href="/dashboard/sondage"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 13, fontWeight: 600, color: '#6C5CE7',
          fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
          textDecoration: 'none',
        }}
      >
        Ouvrir les sondages →
      </a>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#8B97AC', fontSize: 16, lineHeight: 1, padding: 2,
      }}>
        ✕
      </button>
    </div>
  )
}
