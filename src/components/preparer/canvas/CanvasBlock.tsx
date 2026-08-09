'use client'
// ─── SC-02F — Bloc pédagogique individuel ────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from 'react'
import MarkdownMessage from '@/components/ui/MarkdownMessage'
import type { CanvasBlock as TCanvasBlock, BlockType } from '@/lib/types/canvas'
import {
  BLOCK_TYPE_COLORS,
  BLOCK_TYPE_LABELS,
  BASE_SUGGESTIONS,
  TYPE_EXTRA_SUGGESTIONS,
} from '@/lib/types/canvas'

// ─── Props ────────────────────────────────────────────────────────────────────

interface CanvasBlockProps {
  block:           TCanvasBlock
  isFr:            boolean
  isDragging?:     boolean
  isOver?:         boolean
  onUpdate:        (id: string, contenu: string) => void
  onDelete:        (id: string) => void
  onDuplicate:     (id: string) => void
  onToggleLock:    (id: string) => void
  onToggleCollapse:(id: string) => void
  onComment:       (id: string, comment: string) => void
  onSuggestPrompt: (prompt: string) => void
  dragHandleProps: React.HTMLAttributes<HTMLElement>
}

// ─── Block type badge ─────────────────────────────────────────────────────────

function TypeBadge({ type, isFr }: { type: BlockType; isFr: boolean }) {
  const color = BLOCK_TYPE_COLORS[type]
  const label = isFr ? BLOCK_TYPE_LABELS[type].fr : BLOCK_TYPE_LABELS[type].en
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 99,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
      background: `${color}18`, color,
      border: `1px solid ${color}30`,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {label}
    </span>
  )
}

// ─── Status dots ──────────────────────────────────────────────────────────────

function StatusDots({ block, isFr }: { block: TCanvasBlock; isFr: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      {block.genereParIA && !block.modifie && (
        <span title={isFr ? 'Généré par IA' : 'AI-generated'} style={{ fontSize: 11, opacity: 0.6 }}>✦</span>
      )}
      {block.modifie && (
        <span title={isFr ? 'Modifié' : 'Modified'} style={{ width: 7, height: 7, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
      )}
      {block.statut === 'verrouille' && (
        <span title={isFr ? 'Verrouillé' : 'Locked'} style={{ fontSize: 11 }}>🔒</span>
      )}
      {block.statut === 'a_revoir' && (
        <span title={isFr ? 'À revoir' : 'To review'} style={{ fontSize: 11 }}>🔁</span>
      )}
      {block.statut === 'commente' && (
        <span title={block.commentaire || (isFr ? 'Commenté' : 'Commented')} style={{ fontSize: 11 }}>💬</span>
      )}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CanvasBlock({
  block,
  isFr,
  isDragging,
  isOver,
  onUpdate,
  onDelete,
  onDuplicate,
  onToggleLock,
  onToggleCollapse,
  onComment,
  onSuggestPrompt,
  dragHandleProps,
}: CanvasBlockProps) {
  const [editing,      setEditing]      = useState(false)
  const [editVal,      setEditVal]      = useState(block.contenu)
  const [showActions,  setShowActions]  = useState(false)
  const [showSugg,     setShowSugg]     = useState(false)
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentVal,   setCommentVal]   = useState(block.commentaire || '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const color       = BLOCK_TYPE_COLORS[block.type]
  const isLocked    = block.statut === 'verrouille'

  // Auto-size textarea
  useEffect(() => {
    if (!editing || !textareaRef.current) return
    const ta = textareaRef.current
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
  }, [editing, editVal])

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (editing) {
      setEditVal(block.contenu)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [editing])

  const startEdit = useCallback(() => {
    if (isLocked) return
    setEditing(true)
  }, [isLocked])

  const saveEdit = useCallback(() => {
    setEditing(false)
    if (editVal.trim() !== block.contenu) {
      onUpdate(block.id, editVal.trim())
    }
  }, [editVal, block.id, block.contenu, onUpdate])

  const cancelEdit = useCallback(() => {
    setEditing(false)
    setEditVal(block.contenu)
  }, [block.contenu])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
    // Ctrl+Enter saves
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveEdit() }
  }

  const allSuggestions = [
    ...BASE_SUGGESTIONS,
    ...(TYPE_EXTRA_SUGGESTIONS[block.type] || []),
  ]

  const handleSuggestionClick = (suggId: string) => {
    const s = allSuggestions.find(x => x.id === suggId)
    if (!s) return
    const prompt = isFr
      ? s.promptFr(block.titre, block.contenu)
      : s.promptEn(block.titre, block.contenu)
    onSuggestPrompt(prompt)
    setShowSugg(false)
  }

  const handleSaveComment = () => {
    onComment(block.id, commentVal)
    setShowCommentInput(false)
  }

  return (
    <div
      data-block-id={block.id}
      style={{
        borderRadius: 'var(--radius-md, 16px)',
        border: `1.5px solid ${isOver ? color : 'rgba(15,35,65,0.08)'}`,
        background: isDragging ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: isDragging
          ? `0 12px 32px rgba(15,35,65,0.18)`
          : `0 2px 8px rgba(15,35,65,0.05)`,
        opacity: isDragging ? 0.7 : 1,
        transition: 'box-shadow 0.18s, border-color 0.18s, opacity 0.18s',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: color, borderRadius: '16px 0 0 16px',
      }} />

      {/* ── Header ── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px 10px 18px',
          cursor: 'pointer',
          userSelect: 'none',
          borderBottom: block.collapsed ? 'none' : '1px solid rgba(15,35,65,0.06)',
        }}
        onClick={() => !editing && onToggleCollapse(block.id)}
      >
        {/* Drag handle */}
        <span
          {...dragHandleProps}
          onClick={e => e.stopPropagation()}
          style={{
            cursor: 'grab', color: 'var(--text-muted)', fontSize: 14,
            padding: '0 2px', flexShrink: 0, lineHeight: 1,
          }}
          title={isFr ? 'Déplacer' : 'Move'}
        >
          ⠿
        </span>

        {/* Collapse chevron */}
        <span style={{
          fontSize: 10, color: 'var(--text-muted)', flexShrink: 0,
          transform: block.collapsed ? 'rotate(-90deg)' : 'none',
          transition: 'transform 0.15s',
          lineHeight: 1,
        }}>▾</span>

        {/* Titre */}
        <span style={{
          flex: 1,
          fontSize: 13, fontWeight: 700,
          color: 'var(--text-primary, #0F1B2D)',
          fontFamily: 'var(--font-display, Lexend)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {block.titre}
        </span>

        <TypeBadge type={block.type} isFr={isFr} />
        <StatusDots block={block} isFr={isFr} />

        {/* Actions menu toggle */}
        <button
          onClick={e => { e.stopPropagation(); setShowActions(v => !v); setShowSugg(false) }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 15, color: 'var(--text-muted)', padding: '2px 4px',
            borderRadius: 6, lineHeight: 1, flexShrink: 0,
          }}
          title={isFr ? 'Actions' : 'Actions'}
        >
          ···
        </button>
      </div>

      {/* ── Actions dropdown ── */}
      {showActions && (
        <div
          style={{
            position: 'absolute', top: 42, right: 12, zIndex: 50,
            background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(15,35,65,0.1)',
            borderRadius: 'var(--radius-md, 16px)',
            boxShadow: '0 8px 32px rgba(15,35,65,0.12)',
            minWidth: 190, overflow: 'hidden',
          }}
          onClick={e => e.stopPropagation()}
        >
          {[
            !isLocked && { icon: '✏️', label: isFr ? 'Modifier'    : 'Edit',      action: () => { setShowActions(false); startEdit() } },
            { icon: '📋', label: isFr ? 'Dupliquer'  : 'Duplicate', action: () => { setShowActions(false); onDuplicate(block.id) } },
            { icon: isLocked ? '🔓' : '🔒', label: isLocked ? (isFr ? 'Déverrouiller' : 'Unlock') : (isFr ? 'Verrouiller' : 'Lock'), action: () => { setShowActions(false); onToggleLock(block.id) } },
            { icon: '💬', label: isFr ? 'Commenter'  : 'Comment',  action: () => { setShowActions(false); setShowCommentInput(v => !v) } },
            !isLocked && { icon: '✨', label: isFr ? 'Demander à l\'IA' : 'Ask AI', action: () => { setShowActions(false); setShowSugg(v => !v) } },
            { icon: '🗑️', label: isFr ? 'Supprimer'  : 'Delete',   action: () => { setShowActions(false); onDelete(block.id) }, danger: true },
          ].filter(Boolean).map((item: any) => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                width: '100%', padding: '9px 14px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: item.danger ? '#EF4444' : 'var(--text-secondary)',
                textAlign: 'left', transition: 'background 0.1s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = item.danger ? 'rgba(239,68,68,0.06)' : 'rgba(108,92,231,0.06)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
            >
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Body (collapsed guard) ── */}
      {!block.collapsed && (
        <div style={{ padding: '12px 18px 14px' }}>

          {/* ── Comment input ── */}
          {showCommentInput && (
            <div style={{ marginBottom: 10, display: 'flex', gap: 6 }}>
              <input
                value={commentVal}
                onChange={e => setCommentVal(e.target.value)}
                placeholder={isFr ? 'Ajouter un commentaire…' : 'Add a comment…'}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveComment(); if (e.key === 'Escape') setShowCommentInput(false) }}
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 12,
                  border: '1px solid rgba(15,35,65,0.15)', background: 'rgba(255,255,255,0.9)',
                  outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)',
                }}
              />
              <button onClick={handleSaveComment}
                style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'var(--violet)', color: '#fff', border: 'none', fontFamily: 'inherit' }}>
                {isFr ? 'OK' : 'OK'}
              </button>
              <button onClick={() => setShowCommentInput(false)}
                style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: 'none', border: '1px solid rgba(15,35,65,0.1)', color: 'var(--text-muted)', fontFamily: 'inherit' }}>
                ✕
              </button>
            </div>
          )}

          {/* ── Content: edit mode ── */}
          {editing ? (
            <div>
              <textarea
                ref={textareaRef}
                value={editVal}
                onChange={e => setEditVal(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={saveEdit}
                style={{
                  width: '100%', minHeight: 80, padding: '10px 12px',
                  borderRadius: 10, fontSize: 13, lineHeight: 1.65,
                  border: `2px solid ${color}60`,
                  background: 'rgba(255,255,255,0.97)',
                  outline: 'none', resize: 'vertical',
                  fontFamily: 'inherit', color: 'var(--text-primary)',
                  boxSizing: 'border-box',
                  boxShadow: `0 0 0 3px ${color}18`,
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onMouseDown={e => { e.preventDefault(); saveEdit() }}
                  style={{ padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'var(--violet)', color: '#fff', border: 'none', fontFamily: 'inherit' }}>
                  {isFr ? '✓ Sauvegarder' : '✓ Save'}
                </button>
                <button
                  onMouseDown={e => { e.preventDefault(); cancelEdit() }}
                  style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', background: 'none', border: '1px solid rgba(15,35,65,0.1)', color: 'var(--text-muted)', fontFamily: 'inherit' }}>
                  Échap
                </button>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>
                  {isFr ? 'Ctrl+Entrée pour sauvegarder' : 'Ctrl+Enter to save'}
                </span>
              </div>
            </div>
          ) : (
            /* ── Content: read mode ── */
            <div
              onClick={isLocked ? undefined : startEdit}
              style={{
                cursor: isLocked ? 'default' : 'text',
                borderRadius: 8,
                padding: '2px 4px',
                transition: 'background 0.12s',
                minHeight: 32,
              }}
              onMouseEnter={e => { if (!isLocked) (e.currentTarget as HTMLElement).style.background = 'rgba(108,92,231,0.03)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              title={isLocked ? (isFr ? 'Bloc verrouillé' : 'Locked block') : (isFr ? 'Cliquer pour modifier' : 'Click to edit')}
            >
              {block.contenu ? (
                <MarkdownMessage content={block.contenu} />
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {isFr ? 'Bloc vide — cliquez pour ajouter du contenu' : 'Empty block — click to add content'}
                </span>
              )}
            </div>
          )}

          {/* ── AI Suggestions ── */}
          {showSugg && !isLocked && (
            <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(108,92,231,0.04)', border: '1px solid rgba(108,92,231,0.12)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {isFr ? '✦ Suggestions IA — à confirmer avant envoi' : '✦ AI Suggestions — confirm before sending'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allSuggestions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSuggestionClick(s.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 12px', borderRadius: 99,
                      fontSize: 12, fontWeight: 600,
                      border: '1px solid rgba(108,92,231,0.2)',
                      background: 'rgba(255,255,255,0.9)',
                      color: 'var(--violet)',
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(108,92,231,0.08)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.9)'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
                    title={isFr ? 'Pré-remplit le chat — appuyez Entrée pour confirmer' : 'Pre-fills chat — press Enter to confirm'}
                  >
                    {s.emoji} {isFr ? s.labelFr : s.labelEn}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {isFr
                  ? 'La suggestion remplit la zone de saisie. Vérifiez, puis appuyez sur Entrée.'
                  : 'The suggestion fills the input area. Review it, then press Enter.'}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Overlay click-away for dropdowns */}
      {(showActions) && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 49 }}
          onClick={() => { setShowActions(false) }}
        />
      )}
    </div>
  )
}
