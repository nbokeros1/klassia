'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── SVG ring crédits IA ──────────────────────────────────────────────────────
function IaRing({ used, total }: { used: number; total: number }) {
  const r = 7
  const circ = 2 * Math.PI * r
  const fraction = total > 0 ? Math.min(used / total, 1) : 0
  const dashUsed = fraction * circ
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      <circle cx="9" cy="9" r={r} fill="none" stroke="rgba(15,35,65,0.1)" strokeWidth="2.5" />
      <circle cx="9" cy="9" r={r} fill="none"
        stroke="var(--violet, #6C5CE7)" strokeWidth="2.5"
        strokeDasharray={`${dashUsed} ${circ}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        transform="rotate(-90 9 9)"
      />
    </svg>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface WorkspaceHeaderProps {
  classes:              Array<{ id: string; nom: string; niveau?: string }>
  classeId:             string | null
  matiere:              string | null
  hasMessages:          boolean
  isStreaming:          boolean
  isFr:                 boolean
  notifCount:           number
  initiales:            string
  creditsIa:            { used: number; total: number }
  canExport:            boolean
  canExportPptx:        boolean
  assistantOpen:        boolean
  inspectorOpen?:       boolean
  hasDocument?:         boolean
  onClasseChange:       (id: string) => void
  onClear:              () => void
  onToggleAssistant:    () => void
  onToggleInspector?:   () => void
  onExportWord?:        () => void
  onExportPptx?:        () => void
}

// ─── Component ────────────────────────────────────────────────────────────────
export function WorkspaceHeader({
  classes, classeId, matiere,
  hasMessages, isStreaming, isFr,
  notifCount, initiales, creditsIa,
  canExport, canExportPptx, assistantOpen,
  inspectorOpen, hasDocument,
  onClasseChange, onClear, onToggleAssistant, onToggleInspector,
  onExportWord, onExportPptx,
}: WorkspaceHeaderProps) {
  const router = useRouter()
  const [showExport, setShowExport] = useState(false)

  return (
    <header style={{
      height: 52,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 18px',
      background: 'rgba(255,255,255,0.94)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(15,35,65,0.07)',
      zIndex: 50,
    }}>

      {/* ── Classe selector ─────────────────────────────────────────────────── */}
      <select
        value={classeId || ''}
        onChange={e => onClasseChange(e.target.value)}
        aria-label={isFr ? 'Sélectionner une classe' : 'Select a class'}
        style={{
          padding: '5px 10px 5px 12px',
          borderRadius: 20,
          border: '1.5px solid rgba(108,92,231,0.22)',
          background: classeId ? 'var(--violet-soft, #EDE9FE)' : 'rgba(15,35,65,0.04)',
          color: classeId ? 'var(--violet)' : 'var(--text-muted)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
          fontFamily: 'inherit',
          maxWidth: 220,
        }}>
        {!classeId && (
          <option value="">— {isFr ? 'Choisir une classe' : 'Choose a class'} —</option>
        )}
        {classes.map(c => (
          <option key={c.id} value={c.id}>{c.nom}{c.niveau ? ` · ${c.niveau}` : ''}</option>
        ))}
      </select>

      {/* ── Matière badge ───────────────────────────────────────────────────── */}
      {matiere && classeId && (
        <span style={{
          padding: '4px 10px',
          borderRadius: 20,
          background: 'rgba(15,35,65,0.05)',
          border: '1px solid rgba(15,35,65,0.08)',
          fontSize: 11,
          color: 'var(--text-secondary)',
          whiteSpace: 'nowrap',
        }}>
          {matiere}
        </span>
      )}

      {/* ── Spacer ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── Crédits IA ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 20,
        background: 'rgba(255,255,255,0.8)',
        border: '1px solid rgba(15,35,65,0.07)',
        fontSize: 11, fontWeight: 600, color: 'var(--text-primary)',
        userSelect: 'none',
      }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
          {isFr ? 'Génér.' : 'Gen.'}
        </span>
        <IaRing used={creditsIa.used} total={creditsIa.total} />
        <span>{creditsIa.total === 0 ? '∞' : `${creditsIa.used}/${creditsIa.total}`}</span>
      </div>

      {/* ── Effacer conversation ────────────────────────────────────────────── */}
      {hasMessages && !isStreaming && (
        <button
          onClick={onClear}
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 10px',
            borderRadius: 8,
            fontFamily: 'inherit',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(15,35,65,0.05)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}>
          {isFr ? 'Effacer ✕' : 'Clear ✕'}
        </button>
      )}

      {/* ── Inspecteur toggle (visible seulement si un document est généré) ─── */}
      {hasDocument && onToggleInspector && (
        <button
          onClick={onToggleInspector}
          title={isFr ? 'Inspecteur — informations et métadonnées' : 'Inspector — information and metadata'}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 13px', borderRadius: 20,
            border: `1.5px solid ${inspectorOpen ? 'rgba(15,35,65,0.35)' : 'rgba(15,35,65,0.12)'}`,
            background: inspectorOpen ? 'rgba(15,35,65,0.06)' : 'transparent',
            color: inspectorOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { if (!inspectorOpen) (e.currentTarget as HTMLElement).style.background = 'rgba(15,35,65,0.04)' }}
          onMouseLeave={e => { if (!inspectorOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
          <span style={{ fontSize: 11 }}>⊞</span>
          <span>{isFr ? 'Infos' : 'Info'}</span>
        </button>
      )}

      {/* ── Assistant IA toggle ─────────────────────────────────────────────── */}
      <button
        onClick={onToggleAssistant}
        title={isFr ? 'Assistant IA — suggestions et actions rapides' : 'AI Assistant — quick actions and suggestions'}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 13px', borderRadius: 20,
          border: `1.5px solid ${assistantOpen ? 'var(--violet)' : 'rgba(108,92,231,0.2)'}`,
          background: assistantOpen ? 'var(--violet-soft, #EDE9FE)' : 'transparent',
          color: assistantOpen ? 'var(--violet)' : 'var(--text-secondary)',
          fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!assistantOpen) (e.currentTarget as HTMLElement).style.background = 'rgba(108,92,231,0.06)' }}
        onMouseLeave={e => { if (!assistantOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
        <span style={{ fontSize: 11 }}>✦</span>
        <span>Assistant</span>
      </button>

      {/* ── Export dropdown ─────────────────────────────────────────────────── */}
      {canExport && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowExport(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 12px', borderRadius: 8,
              border: '1.5px solid rgba(15,35,65,0.1)',
              background: showExport ? 'rgba(15,35,65,0.04)' : 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(15,35,65,0.04)' }}
            onMouseLeave={e => { if (!showExport) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
            {isFr ? 'Exporter' : 'Export'} <span style={{ fontSize: 9 }}>▼</span>
          </button>

          {showExport && (
            <>
              <div onClick={() => setShowExport(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                zIndex: 70,
                background: 'rgba(255,255,255,0.98)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(15,35,65,0.1)',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(15,35,65,0.12)',
                overflow: 'hidden', minWidth: 168,
              }}>
                <button
                  onClick={() => { setShowExport(false); onExportWord?.() }}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'inherit' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(108,92,231,0.06)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}>
                  📥 Word (.docx)
                </button>
                {canExportPptx && (
                  <button
                    onClick={() => { setShowExport(false); onExportPptx?.() }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'inherit' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(108,92,231,0.06)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}>
                    📊 PowerPoint (.pptx)
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Notifications ───────────────────────────────────────────────────── */}
      <button
        onClick={() => router.push('/dashboard/notifications')}
        style={{
          position: 'relative',
          width: 36, height: 36, borderRadius: 10,
          border: '1px solid rgba(15,35,65,0.08)',
          background: 'rgba(255,255,255,0.8)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, flexShrink: 0,
        }}
        title={isFr ? 'Notifications' : 'Notifications'}
        aria-label={notifCount > 0
          ? (isFr ? `Notifications — ${notifCount} non lue${notifCount > 1 ? 's' : ''}` : `Notifications — ${notifCount} unread`)
          : (isFr ? 'Notifications' : 'Notifications')}>
        🔔
        {notifCount > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            minWidth: 15, height: 15, borderRadius: '50%',
            background: '#EF4444', color: '#fff',
            fontSize: 8, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', border: '1.5px solid white',
          }}>
            {notifCount > 9 ? '9+' : notifCount}
          </span>
        )}
      </button>

      {/* ── Avatar ──────────────────────────────────────────────────────────── */}
      <button
        onClick={() => router.push('/dashboard/profil')}
        style={{
          width: 34, height: 34, borderRadius: '50%',
          border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, var(--violet, #6C5CE7), #4F46E5)',
          color: '#fff', fontSize: 12, fontWeight: 700,
          fontFamily: 'var(--font-display, "Lexend", sans-serif)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(108,92,231,0.28)',
        }}>
        {initiales || '?'}
      </button>

    </header>
  )
}
