'use client'
// ─── SC-02F — Canvas pédagogique intelligent ─────────────────────────────────
// Reçoit le markdown d'une préparation IA, le parse en blocs indépendants,
// et permet l'édition inline, le réordonnancement, et les suggestions IA.
// Règle absolue : ne jamais modifier les APIs, l'IA, ou Supabase.

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { parseMarkdownToBlocks } from './utils/parseMarkdown'
import { CanvasBlock as CanvasBlockComp } from './CanvasBlock'
import type { CanvasBlock } from '@/lib/types/canvas'

// ─── Props ────────────────────────────────────────────────────────────────────

interface PreparationCanvasProps {
  content:         string        // markdown brut de la préparation IA
  titre:           string
  typeContenu:     string
  isFr:            boolean
  isStreaming?:    boolean
  onSuggestPrompt: (prompt: string) => void  // pre-fill chat input, user confirms
}

// ─── uid helper ───────────────────────────────────────────────────────────────

let _seq = 0
function uid() { return `cb_${Date.now()}_${++_seq}` }

// ─── Component ────────────────────────────────────────────────────────────────

export function PreparationCanvas({
  content,
  titre,
  isFr,
  isStreaming,
  onSuggestPrompt,
}: PreparationCanvasProps) {
  // Parse markdown → blocs (only when content changes)
  const initialBlocks = useMemo(
    () => parseMarkdownToBlocks(content, titre),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content],
  )

  const [blocks,      setBlocks]      = useState<CanvasBlock[]>(initialBlocks)
  const [allCollapsed, setAllCollapsed] = useState(false)
  const [focusMode,   setFocusMode]   = useState(false)

  // Sync when a new generation is complete — never reset during active stream
  useEffect(() => {
    if (isStreaming) return
    if (initialBlocks.length > 0) {
      setBlocks(initialBlocks)
      setAllCollapsed(false)
    }
  }, [initialBlocks, isStreaming])

  // ── Drag & Drop state ────────────────────────────────────────────────────
  const dragIdRef     = useRef<string | null>(null)
  const dragOverIdRef = useRef<string | null>(null)
  const [draggingId,  setDraggingId]  = useState<string | null>(null)
  const [overBlockId, setOverBlockId] = useState<string | null>(null)

  // ── Block operations ─────────────────────────────────────────────────────

  const handleUpdate = useCallback((id: string, contenu: string) => {
    setBlocks(prev => prev.map(b =>
      b.id === id ? { ...b, contenu, modifie: true, version: b.version + 1 } : b,
    ))
  }, [])

  const handleDelete = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id).map((b, i) => ({ ...b, ordre: i })))
  }, [])

  const handleDuplicate = useCallback((id: string) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id)
      if (idx < 0) return prev
      const src = prev[idx]
      const clone: CanvasBlock = { ...src, id: uid(), ordre: src.ordre + 1, modifie: false }
      const next = [...prev]
      next.splice(idx + 1, 0, clone)
      return next.map((b, i) => ({ ...b, ordre: i }))
    })
  }, [])

  const handleToggleLock = useCallback((id: string) => {
    setBlocks(prev => prev.map(b =>
      b.id === id
        ? { ...b, statut: b.statut === 'verrouille' ? 'normal' : 'verrouille' }
        : b,
    ))
  }, [])

  const handleToggleCollapse = useCallback((id: string) => {
    setBlocks(prev => prev.map(b =>
      b.id === id ? { ...b, collapsed: !b.collapsed } : b,
    ))
  }, [])

  const handleComment = useCallback((id: string, comment: string) => {
    setBlocks(prev => prev.map(b =>
      b.id === id
        ? { ...b, commentaire: comment, statut: comment ? 'commente' : 'normal' }
        : b,
    ))
  }, [])

  // ── Fold/unfold all ──────────────────────────────────────────────────────

  const toggleAllCollapsed = useCallback(() => {
    setAllCollapsed(prev => {
      const next = !prev
      setBlocks(bs => bs.map(b => ({ ...b, collapsed: next })))
      return next
    })
  }, [])

  // ── Drag & Drop (native HTML5) ───────────────────────────────────────────

  const handleDragStart = useCallback((id: string) => (e: React.DragEvent) => {
    dragIdRef.current = id
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((id: string) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dragOverIdRef.current = id
    setOverBlockId(id)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const fromId = dragIdRef.current
    const toId   = dragOverIdRef.current
    if (!fromId || !toId || fromId === toId) {
      setDraggingId(null)
      setOverBlockId(null)
      return
    }
    setBlocks(prev => {
      const fromIdx = prev.findIndex(b => b.id === fromId)
      const toIdx   = prev.findIndex(b => b.id === toId)
      if (fromIdx < 0 || toIdx < 0) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next.map((b, i) => ({ ...b, ordre: i }))
    })
    dragIdRef.current     = null
    dragOverIdRef.current = null
    setDraggingId(null)
    setOverBlockId(null)
  }, [])

  const handleDragEnd = useCallback(() => {
    dragIdRef.current     = null
    dragOverIdRef.current = null
    setDraggingId(null)
    setOverBlockId(null)
  }, [])

  // ── Focus mode ───────────────────────────────────────────────────────────

  const canvasStyle: React.CSSProperties = focusMode
    ? {
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        overflowY: 'auto',
        padding: '24px 0',
      }
    : { padding: '20px 28px 40px' }

  // ── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:    blocks.length,
    modifies: blocks.filter(b => b.modifie).length,
    verrouilles: blocks.filter(b => b.statut === 'verrouille').length,
  }), [blocks])

  if (isStreaming) return null

  return (
    <div style={canvasStyle}>
      <div style={{ maxWidth: 820, margin: '0 auto', width: '100%' }}>

        {/* ── Toolbar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
          padding: '8px 0', flexWrap: 'wrap',
        }}>
          {/* Stats */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
              {stats.total} {isFr ? 'blocs' : 'blocks'}
            </span>
            {stats.modifies > 0 && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(245,158,11,0.12)', color: '#D97706', fontWeight: 600 }}>
                {stats.modifies} {isFr ? 'modifié(s)' : 'modified'}
              </span>
            )}
            {stats.verrouilles > 0 && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(15,35,65,0.06)', color: 'var(--text-muted)', fontWeight: 600 }}>
                🔒 {stats.verrouilles}
              </span>
            )}
          </div>

          {/* Controls */}
          {[
            {
              label: allCollapsed ? (isFr ? '↕ Tout déplier' : '↕ Expand all') : (isFr ? '↕ Tout replier' : '↕ Collapse all'),
              action: toggleAllCollapsed,
            },
            {
              label: focusMode ? (isFr ? '⊠ Quitter focus' : '⊠ Exit focus') : (isFr ? '⊡ Mode focus' : '⊡ Focus mode'),
              action: () => setFocusMode(v => !v),
            },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={btn.action}
              style={{
                padding: '5px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: '1px solid rgba(15,35,65,0.1)',
                background: 'rgba(255,255,255,0.85)',
                color: 'var(--text-secondary)',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(108,92,231,0.3)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.85)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(15,35,65,0.1)' }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* ── Blocks list ── */}
        {blocks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {isFr ? 'Aucun bloc détecté' : 'No blocks detected'}
            </div>
            <div style={{ fontSize: 12, marginTop: 6 }}>
              {isFr
                ? 'La préparation ne contient pas de sections structurées avec des titres.'
                : 'The preparation contains no structured sections with headings.'}
            </div>
          </div>
        ) : (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          >
            {blocks.map(block => (
              <div
                key={block.id}
                onDragOver={handleDragOver(block.id)}
                onDragLeave={() => { if (overBlockId === block.id) setOverBlockId(null) }}
              >
                <CanvasBlockComp
                  block={block}
                  isFr={isFr}
                  isDragging={draggingId === block.id}
                  isOver={overBlockId === block.id && draggingId !== block.id}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onToggleLock={handleToggleLock}
                  onToggleCollapse={handleToggleCollapse}
                  onComment={handleComment}
                  onSuggestPrompt={onSuggestPrompt}
                  dragHandleProps={{
                    draggable: true,
                    onDragStart: handleDragStart(block.id) as any,
                    onDragEnd:   handleDragEnd,
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Footer hint ── */}
        {blocks.length > 0 && (
          <div style={{ marginTop: 24, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
            {isFr
              ? 'Cliquez sur un bloc pour le modifier · Glissez ⠿ pour réorganiser · Les suggestions IA pré-remplissent le chat'
              : 'Click a block to edit · Drag ⠿ to reorder · AI suggestions pre-fill the chat'}
          </div>
        )}
      </div>
    </div>
  )
}
