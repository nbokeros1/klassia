'use client'

import { useState } from 'react'
import type { LeconProgramme } from '@/lib/types/database'
import type { LessonTeachingState } from '@/lib/types/school-year-dashboard'

interface Props {
  lecon:             LeconProgramme
  seqIdx:            number        // 0-based — identité V5
  leconIdx:          number        // 0-based — identité V5
  teachingPackId:    string
  programmeAnnuelId: string
  currentState:      LessonTeachingState | null  // null si leçon jamais enseignée
  onDone:            (newState: LessonTeachingState) => void
  onCancel:          () => void
}

// ─── MarkTaughtModal ─────────────────────────────────────────────────────────
// V5 : POST sur teaching_events (append-only) au lieu de PATCH contenu_json.
// Fallback d'affichage V4 : lecon.date_enseignee / lecon.note_enseignement.

export default function MarkTaughtModal({
  lecon, seqIdx, leconIdx, teachingPackId, programmeAnnuelId, currentState, onDone, onCancel,
}: Props) {
  // Résolution display : V5 (currentState) prime sur V4 (lecon fields)
  const isAlreadyTaught = currentState?.isTaught ?? lecon.statut === 'enseignee'
  const existingDate    = currentState?.taughtAt ?? lecon.date_enseignee ?? null
  const existingNote    = currentState?.note     ?? lecon.note_enseignement ?? ''

  const todayISO = new Date().toISOString().slice(0, 10)
  const [date,   setDate]   = useState<string>(existingDate ?? todayISO)
  const [note,   setNote]   = useState<string>(existingNote)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  async function handleSubmit(eventType: 'lesson_taught' | 'lesson_taught_cancelled') {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/spie/mark-taught', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programmeAnnuelId,
          teachingPackId,
          sequenceIndex: seqIdx,
          lessonIndex:   leconIdx,
          eventType,
          occurredAt:    eventType === 'lesson_taught' ? date : undefined,
          note:          eventType === 'lesson_taught' && note.trim() ? note.trim() : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Erreur serveur')
      }

      const result = await res.json()
      const newState: LessonTeachingState = {
        isTaught: eventType === 'lesson_taught',
        taughtAt: eventType === 'lesson_taught' ? (result.occurredAt?.slice(0, 10) ?? date) : null,
        note:     eventType === 'lesson_taught' && note.trim() ? note.trim() : null,
        source:   'events',
      }
      onDone(newState)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
      setSaving(false)
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px',
  }

  const modalStyle: React.CSSProperties = {
    background: 'var(--card-bg)', border: '1px solid var(--card-border)',
    borderRadius: 'var(--radius-lg)', padding: '32px 36px',
    width: '100%', maxWidth: 480,
    boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
    letterSpacing: '0.4px', textTransform: 'uppercase', display: 'block', marginBottom: 8,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13.5,
    background: 'var(--bg-veil, rgba(0,0,0,0.15))',
    border: '1px solid rgba(139,151,172,0.25)', color: 'var(--text-primary)',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>

        {/* En-tête */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--violet)', textTransform: 'uppercase', marginBottom: 4 }}>
            {isAlreadyTaught ? 'Annuler l\'enseignement' : 'Marquer comme enseignée'}
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {lecon.titre}
          </h2>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
            Séquence {seqIdx + 1} · Leçon {lecon.numero}
          </p>
        </div>

        {!isAlreadyTaught ? (
          /* ── Formulaire marquage ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>Date d&apos;enseignement</label>
              <input
                type="date"
                value={date}
                max={todayISO}
                onChange={e => setDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Note (optionnel)</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ex. : bonne participation, sujet à revoir en L7…"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              />
            </div>
          </div>
        ) : (
          /* ── Confirmation annulation ── */
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Cette leçon a été enseignée le <strong>{existingDate ?? '—'}</strong>.
            Confirmer l&apos;annulation enregistrera un événement d&apos;annulation dans l&apos;historique.
          </p>
        )}

        {error && (
          <div style={{
            marginTop: 16, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            fontSize: 12.5, color: '#EF4444',
          }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 28, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'transparent', border: '1px solid rgba(139,151,172,0.3)',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            Annuler
          </button>

          {isAlreadyTaught ? (
            <button
              onClick={() => handleSubmit('lesson_taught_cancelled')}
              disabled={saving}
              style={{
                padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#EF4444', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'En cours…' : 'Confirmer l\'annulation'}
            </button>
          ) : (
            <button
              onClick={() => handleSubmit('lesson_taught')}
              disabled={saving || !date}
              style={{
                padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                background: 'var(--violet)', color: '#fff',
                cursor: saving || !date ? 'not-allowed' : 'pointer',
                opacity: saving || !date ? 0.7 : 1,
                border: 'none',
              }}
            >
              {saving ? 'Enregistrement…' : 'Confirmer l\'enseignement'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
