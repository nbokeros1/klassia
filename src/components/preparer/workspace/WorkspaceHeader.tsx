'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
  canExport:            boolean
  canExportPptx:        boolean
  assistantOpen:        boolean
  inspectorOpen?:       boolean
  hasDocument?:         boolean
  focusMode?:           boolean
  contextBar?:          string | null
  suggestion?:          { text: string; action: string; reason: string } | null
  isSaved?:             boolean
  onClasseChange:       (id: string) => void
  onClear:              () => void
  onToggleAssistant:    () => void
  onToggleInspector?:   () => void
  onExportWord?:        () => void
  onExportPptx?:        () => void
  onToggleFocus?:       () => void
  onSave?:              () => void
  onApplySuggestion?:   (action: string) => void
  onIgnoreSuggestion?:  () => void
}

// ─── Component ────────────────────────────────────────────────────────────────
export function WorkspaceHeader({
  classes, classeId, matiere,
  hasMessages, isStreaming, isFr,
  notifCount, initiales,
  canExport, canExportPptx, assistantOpen,
  inspectorOpen, hasDocument,
  focusMode, onToggleFocus,
  contextBar, suggestion,
  isSaved, onSave,
  onClasseChange, onClear, onToggleAssistant, onToggleInspector,
  onExportWord, onExportPptx,
  onApplySuggestion, onIgnoreSuggestion,
}: WorkspaceHeaderProps) {
  const router = useRouter()
  const [showMore,  setShowMore]  = useState(false)
  const [showWhy,   setShowWhy]   = useState(false)

  return (
    <>
    <header style={{
      height:           52,
      flexShrink:       0,
      display:          'flex',
      alignItems:       'center',
      gap:              6,
      padding:          '0 16px',
      background:       'rgba(255,255,255,0.96)',
      backdropFilter:   'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom:     '1px solid #EAECF0',
      zIndex:           50,
    }}>

      {/* ── Classe selector ────────────────────────────────────────────────── */}
      <select
        value={classeId || ''}
        onChange={e => onClasseChange(e.target.value)}
        aria-label={isFr ? 'Sélectionner une classe' : 'Select a class'}
        style={{
          padding:    '5px 10px 5px 12px',
          borderRadius: 20,
          border:     '1.5px solid rgba(109,93,246,0.22)',
          background: classeId ? '#EDE9FE' : 'rgba(15,35,65,0.04)',
          color:      classeId ? '#6D5DF6' : '#94A3B8',
          fontSize:   12,
          fontWeight: 600,
          cursor:     'pointer',
          outline:    'none',
          fontFamily: 'inherit',
          maxWidth:   220,
        }}>
        {!classeId && (
          <option value="">{isFr ? '— Choisir une classe —' : '— Choose a class —'}</option>
        )}
        {classes.map(c => (
          <option key={c.id} value={c.id}>{c.nom}{c.niveau ? ` · ${c.niveau}` : ''}</option>
        ))}
      </select>

      {/* ── Matière tag ────────────────────────────────────────────────────── */}
      {matiere && classeId && (
        <span style={{
          padding:    '3px 9px',
          borderRadius: 20,
          background: 'rgba(15,35,65,0.04)',
          border:     '1px solid rgba(15,35,65,0.07)',
          fontSize:   11,
          color:      '#64748B',
          whiteSpace: 'nowrap',
        }}>
          {matiere}
        </span>
      )}

      {/* ── Streaming indicator ────────────────────────────────────────────── */}
      {isStreaming && (
        <span style={{
          fontSize:   11, color: '#6D5DF6', fontWeight: 500,
          display:    'flex', alignItems: 'center', gap: 5, opacity: 0.85,
        }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#6D5DF6', animation: 'c13-pulse 0.9s ease-in-out infinite' }} />
          {isFr ? 'Génération…' : 'Generating…'}
        </span>
      )}

      <div style={{ flex: 1 }} />

      {/* ── Sauvegarder ────────────────────────────────────────────────────── */}
      {canExport && onSave && (
        <button
          onClick={isSaved ? undefined : onSave}
          disabled={!!isSaved || isStreaming}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 8,
            border: isSaved ? '1.5px solid rgba(34,197,94,0.3)' : '1.5px solid rgba(109,93,246,0.3)',
            background: isSaved ? 'rgba(34,197,94,0.06)' : 'rgba(109,93,246,0.06)',
            color: isSaved ? '#15803D' : '#6D5DF6',
            fontSize: 11, fontWeight: 600,
            cursor: isSaved || isStreaming ? 'default' : 'pointer',
            fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { if (!isSaved && !isStreaming) (e.currentTarget as HTMLElement).style.background = 'rgba(109,93,246,0.12)' }}
          onMouseLeave={e => { if (!isSaved) (e.currentTarget as HTMLElement).style.background = 'rgba(109,93,246,0.06)' }}>
          {isSaved ? '✓' : '💾'}
          <span>{isSaved ? (isFr ? 'Enregistré' : 'Saved') : (isFr ? 'Sauvegarder' : 'Save')}</span>
        </button>
      )}

      {/* ── Word direct ────────────────────────────────────────────────────── */}
      {canExport && (
        <button
          onClick={onExportWord}
          title={isFr ? 'Télécharger Word (.docx)' : 'Download Word (.docx)'}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 12px', borderRadius: 8,
            border: '1.5px solid rgba(15,35,65,0.1)',
            background: 'transparent',
            color: '#64748B', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(15,35,65,0.04)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
          📥 Word
        </button>
      )}

      {/* ── ⋯ Dropdown (PPT, Imprimer, Inspecteur, Effacer) ───────────────── */}
      {(canExport || hasMessages) && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMore(v => !v)}
            title={isFr ? 'Plus d\'options' : 'More options'}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1.5px solid rgba(15,35,65,0.1)',
              background: showMore ? 'rgba(15,35,65,0.04)' : 'transparent',
              color: '#64748B', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(15,35,65,0.04)' }}
            onMouseLeave={e => { if (!showMore) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
            ⋯
          </button>

          {showMore && (
            <>
              <div onClick={() => setShowMore(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 70,
                background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid #EAECF0', borderRadius: 12,
                boxShadow: '0 8px 32px rgba(15,35,65,0.12)',
                overflow: 'hidden', minWidth: 180,
              }}>
                {canExportPptx && (
                  <button
                    onClick={() => { setShowMore(false); onExportPptx?.() }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#374151', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(109,93,246,0.06)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}>
                    📊 PowerPoint (.pptx)
                  </button>
                )}
                {canExport && (
                  <button
                    onClick={() => { setShowMore(false); /* print handled via action chip */ }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#374151', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, opacity: 0.5 }}
                    disabled>
                    🖨️ {isFr ? 'Imprimer' : 'Print'} <span style={{ fontSize: 10, color: '#94A3B8' }}>{isFr ? '(via le document)' : '(via document)'}</span>
                  </button>
                )}
                {onToggleInspector && (
                  <button
                    onClick={() => { setShowMore(false); onToggleInspector() }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#374151', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(109,93,246,0.06)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}>
                    ⊞ {inspectorOpen ? (isFr ? 'Masquer infos' : 'Hide info') : (isFr ? 'Infos document' : 'Document info')}
                  </button>
                )}
                {hasMessages && !isStreaming && (
                  <>
                    <div style={{ height: 1, background: '#EAECF0', margin: '4px 0' }} />
                    <button
                      onClick={() => { setShowMore(false); onClear() }}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#EF4444', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.05)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}>
                      ✕ {isFr ? 'Nouveau document' : 'New document'}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Copilote toggle ────────────────────────────────────────────────── */}
      <button
        onClick={onToggleAssistant}
        title={isFr ? 'Copilote IA' : 'AI Copilot'}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 12px', borderRadius: 20,
          border: `1.5px solid ${assistantOpen ? '#6D5DF6' : 'rgba(109,93,246,0.2)'}`,
          background: assistantOpen ? '#EDE9FE' : 'transparent',
          color: assistantOpen ? '#6D5DF6' : '#64748B',
          fontSize: 11, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 0.15s', whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!assistantOpen) (e.currentTarget as HTMLElement).style.background = 'rgba(109,93,246,0.06)' }}
        onMouseLeave={e => { if (!assistantOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
        <span style={{ fontSize: 10 }}>✦</span>
        <span>{isFr ? 'Copilote' : 'Copilot'}</span>
      </button>

      {/* ── Focus mode ─────────────────────────────────────────────────────── */}
      {onToggleFocus && (
        <button
          onClick={onToggleFocus}
          className="ws-focus-btn"
          data-active={focusMode ? 'true' : 'false'}
          title={focusMode
            ? (isFr ? 'Quitter le mode Focus' : 'Exit Focus mode')
            : (isFr ? 'Mode Focus' : 'Focus mode')}
          aria-label={focusMode ? (isFr ? 'Quitter le mode Focus' : 'Exit Focus mode') : (isFr ? 'Mode Focus' : 'Focus mode')}>
          {focusMode ? '⊞' : '⊡'}
        </button>
      )}

      {/* ── Notifications ──────────────────────────────────────────────────── */}
      <button
        onClick={() => router.push('/dashboard')}
        style={{
          position: 'relative',
          width: 34, height: 34, borderRadius: 10,
          border: '1px solid #EAECF0', background: '#FFFFFF',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0,
        }}
        title={isFr ? 'Notifications' : 'Notifications'}
        aria-label={notifCount > 0
          ? `${notifCount} notification${notifCount > 1 ? 's' : ''}`
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

      {/* ── Avatar ─────────────────────────────────────────────────────────── */}
      <button
        onClick={() => router.push('/dashboard/profil')}
        style={{
          width: 32, height: 32, borderRadius: '50%',
          border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #6D5DF6, #4F46E5)',
          color: '#fff', fontSize: 11, fontWeight: 700,
          fontFamily: 'var(--font-display, "Lexend", sans-serif)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(109,93,246,0.28)',
        }}>
        {initiales || '?'}
      </button>

    </header>

    {/* ── Context Bar ─────────────────────────────────────────────────────── */}
    {contextBar && (
      <div className="ii-context-bar" aria-label={isFr ? 'Contexte actif' : 'Active context'}>
        <span>{contextBar}</span>
      </div>
    )}

    {/* ── Suggestion Strip ────────────────────────────────────────────────── */}
    {suggestion && (
      <div className="ii-suggestion-strip ii-level-1">
        <span className="ii-suggestion-text">{suggestion.text}</span>
        <button
          className="ii-suggestion-action"
          onClick={() => { onApplySuggestion?.(suggestion.action); setShowWhy(false) }}
          disabled={isStreaming}>
          {isFr ? 'Appliquer' : 'Apply'}
        </button>
        <button
          className="ii-suggestion-why"
          onClick={() => setShowWhy(v => !v)}>
          {showWhy ? (isFr ? 'Masquer' : 'Hide') : (isFr ? 'Pourquoi ?' : 'Why?')}
        </button>
        <button
          className="ii-suggestion-ignore"
          onClick={() => { onIgnoreSuggestion?.(); setShowWhy(false) }}
          aria-label={isFr ? 'Ignorer' : 'Dismiss'}>
          ✕
        </button>
        {showWhy && (
          <div className="ii-suggestion-reason">{suggestion.reason}</div>
        )}
      </div>
    )}
    </>
  )
}
