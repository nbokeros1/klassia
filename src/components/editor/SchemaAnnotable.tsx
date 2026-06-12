'use client'

import { useState, useRef } from 'react'

export type Annotation = {
  id: string
  x: number
  y: number
  texte: string
  couleur: string
}

interface Props {
  src: string
  alt: string
  annotations?: Annotation[]
  onAnnotationsChange?: (a: Annotation[]) => void
  editable?: boolean
}

const COULEURS = ['#7F77DD', '#EF9F27', '#1D9E75', '#F87171', '#378ADD', '#F472B6', '#34D399', '#94A3B8']

export default function SchemaAnnotable({ src, alt, annotations = [], onAnnotationsChange, editable = false }: Props) {
  const [items, setItems]       = useState<Annotation[]>(annotations)
  const [tooltip, setTooltip]   = useState<string | null>(null)
  const [editing, setEditing]   = useState<Annotation | null>(null)
  const [pendingXY, setPendingXY] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const update = (next: Annotation[]) => {
    setItems(next)
    onAnnotationsChange?.(next)
  }

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editable) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPendingXY({ x, y })
    setEditing({ id: '', x, y, texte: '', couleur: COULEURS[0] })
  }

  const handleSaveAnnotation = () => {
    if (!editing) return
    if (!editing.texte.trim()) { setEditing(null); setPendingXY(null); return }
    if (editing.id) {
      update(items.map(a => a.id === editing.id ? editing : a))
    } else {
      update([...items, { ...editing, id: Date.now().toString() }])
    }
    setEditing(null)
    setPendingXY(null)
  }

  const handleDeleteAnnotation = (id: string) => {
    update(items.filter(a => a.id !== id))
    if (editing?.id === id) setEditing(null)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', cursor: editable ? 'crosshair' : 'default' }}>
      <div onClick={handleImageClick} style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
        <img
          src={src}
          alt={alt}
          style={{ maxWidth: '100%', height: 'auto', borderRadius: 8, border: '1px solid #E5E7EB', display: 'block' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />

        {items.map(a => (
          <div
            key={a.id}
            onMouseEnter={() => !editable && setTooltip(a.id)}
            onMouseLeave={() => setTooltip(null)}
            onClick={e => { if (editable) { e.stopPropagation(); setEditing(a) } }}
            style={{
              position: 'absolute',
              left: `${a.x}%`,
              top: `${a.y}%`,
              transform: 'translate(-50%, -50%)',
              background: a.couleur,
              color: 'white',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: editable ? 'pointer' : 'default',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              zIndex: 10,
              userSelect: 'none',
            }}
          >
            {a.texte}
            {!editable && tooltip === a.id && (
              <div style={{
                position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
                background: '#1a1a1a', color: 'white', padding: '4px 8px', borderRadius: 6,
                fontSize: 11, whiteSpace: 'nowrap', pointerEvents: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}>
                {a.texte}
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => { setEditing(null); setPendingXY(null) }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'white', borderRadius: 12, padding: 20, width: 300,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: '#1a1a1a' }}>
              {editing.id ? 'Modifier' : 'Ajouter'} une annotation
            </div>
            <input
              autoFocus
              value={editing.texte}
              onChange={e => setEditing({ ...editing, texte: e.target.value })}
              placeholder="Texte de l'annotation…"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveAnnotation() }}
            />
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {COULEURS.map(c => (
                <button key={c} type="button" onClick={() => setEditing({ ...editing, couleur: c })}
                  style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: editing.couleur === c ? '3px solid #1a1a1a' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSaveAnnotation} style={{ flex: 1, padding: '8px', background: '#7F77DD', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                {editing.id ? 'Modifier' : 'Ajouter'}
              </button>
              {editing.id && (
                <button onClick={() => handleDeleteAnnotation(editing.id)} style={{ padding: '8px 12px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                  Supprimer
                </button>
              )}
              <button onClick={() => { setEditing(null); setPendingXY(null) }} style={{ padding: '8px 12px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
