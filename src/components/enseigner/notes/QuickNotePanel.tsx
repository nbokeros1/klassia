'use client'

import { useState } from 'react'
import { useTeaching } from '@/contexts/enseigner/TeachingContext'
import type { NoteTag } from '@/types/enseigner'

const TAG_CONFIG: Record<NoteTag, { label: string; color: string; bg: string }> = {
  cours:    { label: 'Cours',    color: '#6C5CE7', bg: 'rgba(108,92,231,0.12)' },
  eleve:    { label: 'Élève',    color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)' },
  action:   { label: 'Action',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  question: { label: 'Question', color: '#22C55E', bg: 'rgba(34,197,94,0.12)'  },
}

const TAG_PRIORITY_MARKER = '!'

export function QuickNotePanel() {
  const { state, addNote, deleteNote } = useTeaching()
  const [text, setText]       = useState('')
  const [tag, setTag]         = useState<NoteTag>('cours')
  const [important, setImportant] = useState(false)

  const handleAdd = () => {
    const t = text.trim()
    if (!t) return
    const currentActivity = state.activities[state.currentIndex]
    addNote({
      texte: t,
      tag,
      priorite: important ? 'importante' : 'normale',
      activite_id: currentActivity?.id ?? null,
    })
    setText('')
    setImportant(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
  }

  const sortedNotes = [...state.notes].sort((a, b) => {
    if (a.priorite === 'importante' && b.priorite !== 'importante') return -1
    if (b.priorite === 'importante' && a.priorite !== 'importante') return 1
    return b.timestamp - a.timestamp
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Input area */}
      <div style={{
        background: 'rgba(255,255,255,0.8)',
        border: '1px solid rgba(108,92,231,0.2)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Note rapide… (Entrée pour sauvegarder)"
          rows={2}
          style={{
            width: '100%', border: 'none', background: 'transparent',
            resize: 'none', padding: '8px 10px',
            fontSize: 13, lineHeight: 1.5,
            fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
            color: '#0F1B2D', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderTop: '1px solid rgba(0,0,0,0.06)',
        }}>
          {/* Tags */}
          {(Object.keys(TAG_CONFIG) as NoteTag[]).map(t => (
            <button
              key={t}
              onClick={() => setTag(t)}
              style={{
                padding: '2px 8px', borderRadius: 100, border: 'none',
                background: tag === t ? TAG_CONFIG[t].bg : 'transparent',
                color: tag === t ? TAG_CONFIG[t].color : '#8B97AC',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                transition: 'all 0.15s',
              }}
            >
              {TAG_CONFIG[t].label}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {/* Important toggle */}
          <button
            onClick={() => setImportant(v => !v)}
            title={important ? 'Marquer normale' : 'Marquer importante'}
            style={{
              background: important ? 'rgba(245,158,11,0.15)' : 'transparent',
              border: 'none', cursor: 'pointer', padding: '3px 6px',
              borderRadius: 6, fontSize: 14,
              transition: 'background 0.15s',
            }}
          >
            {important ? '⚡' : '☆'}
          </button>

          {/* Add button */}
          <button
            onClick={handleAdd}
            disabled={!text.trim()}
            style={{
              background: text.trim() ? '#6C5CE7' : 'rgba(139,151,172,0.2)',
              color: text.trim() ? '#fff' : '#8B97AC',
              border: 'none', cursor: text.trim() ? 'pointer' : 'default',
              padding: '4px 12px', borderRadius: 8,
              fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
              transition: 'all 0.15s',
            }}
          >
            + Note
          </button>
        </div>
      </div>

      {/* Notes list */}
      {sortedNotes.length === 0 && (
        <p style={{
          textAlign: 'center', color: '#8B97AC',
          fontSize: 12, padding: '12px 0', margin: 0,
          fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
        }}>
          Aucune note encore
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sortedNotes.map(note => {
          const cfg = TAG_CONFIG[note.tag]
          return (
            <div
              key={note.id}
              style={{
                padding: '8px 10px',
                background: note.priorite === 'importante'
                  ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.7)',
                border: note.priorite === 'importante'
                  ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.8)',
                borderRadius: 10,
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}
            >
              {note.priorite === 'importante' && (
                <span style={{ fontSize: 12, flexShrink: 0, paddingTop: 1 }}>⚡</span>
              )}
              <p style={{
                flex: 1, margin: 0, fontSize: 12, lineHeight: 1.5,
                color: '#0F1B2D',
                fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
              }}>
                {note.texte}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 100,
                  background: cfg.bg, color: cfg.color,
                  fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                }}>
                  {cfg.label}
                </span>
                <button
                  onClick={() => deleteNote(note.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#8B97AC', fontSize: 10, padding: 0,
                    fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                  }}
                  title="Supprimer"
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
