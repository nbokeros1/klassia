'use client'

import { useState } from 'react'
import { useTeaching } from '@/contexts/enseigner/TeachingContext'

interface Props {
  insertAfterIndex: number
  onClose: () => void
}

export function AddActivityModal({ insertAfterIndex, onClose }: Props) {
  const { addLiveActivity, state } = useTeaching()
  const [titre, setTitre]     = useState('')
  const [duree, setDuree]     = useState(10)
  const [objectif, setObjectif] = useState('')
  const [contenu, setContenu] = useState('')

  const handleAdd = () => {
    const t = titre.trim()
    if (!t) return
    addLiveActivity(t, duree, objectif.trim(), contenu.trim(), insertAfterIndex)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15,35,65,0.55)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.97)',
        borderRadius: 20,
        padding: '28px 32px',
        maxWidth: 480, width: '100%', margin: '0 20px',
        boxShadow: '0 20px 60px rgba(15,35,65,0.2)',
        border: '1px solid rgba(255,255,255,0.9)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{
              margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#6C5CE7',
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
            }}>
              Activité improvisée ⚡
            </p>
            <h2 style={{
              margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: '#0F1B2D',
              fontFamily: 'var(--font-display, Lexend), sans-serif',
            }}>
              Ajouter une activité
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(15,35,65,0.06)', border: 'none',
              borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
              fontSize: 16, color: '#5B6B85',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Titre */}
          <div>
            <label style={labelStyle}>Titre *</label>
            <input
              value={titre}
              onChange={e => setTitre(e.target.value)}
              placeholder="ex: Discussion improvisée"
              style={inputStyle}
              autoFocus
            />
          </div>

          {/* Durée */}
          <div>
            <label style={labelStyle}>Durée prévue (minutes)</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[5, 8, 10, 15, 20].map(m => (
                <button
                  key={m}
                  onClick={() => setDuree(m)}
                  style={{
                    padding: '5px 12px', borderRadius: 8, border: 'none',
                    background: duree === m ? 'rgba(108,92,231,0.15)' : 'rgba(15,35,65,0.06)',
                    color: duree === m ? '#6C5CE7' : '#5B6B85',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                  }}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>

          {/* Objectif */}
          <div>
            <label style={labelStyle}>Objectif (optionnel)</label>
            <input
              value={objectif}
              onChange={e => setObjectif(e.target.value)}
              placeholder="Ce que les élèves devront savoir/faire..."
              style={inputStyle}
            />
          </div>

          {/* Contenu */}
          <div>
            <label style={labelStyle}>Consignes (optionnel)</label>
            <textarea
              value={contenu}
              onChange={e => setContenu(e.target.value)}
              placeholder="Notes, consignes, ressources..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Position info */}
        <p style={{
          margin: '16px 0',
          fontSize: 12, color: '#8B97AC', fontStyle: 'italic',
          fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
        }}>
          Sera insérée après «&nbsp;
          {state.activities[insertAfterIndex]?.titre ?? 'activité courante'}
          &nbsp;»
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px', borderRadius: 10,
              border: '1px solid rgba(15,35,65,0.12)',
              background: 'transparent', color: '#5B6B85',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleAdd}
            disabled={!titre.trim()}
            style={{
              flex: 2, padding: '10px', borderRadius: 10, border: 'none',
              background: titre.trim() ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'rgba(139,151,172,0.2)',
              color: titre.trim() ? '#fff' : '#8B97AC',
              fontSize: 13, fontWeight: 700, cursor: titre.trim() ? 'pointer' : 'default',
              fontFamily: 'var(--font-display, Lexend), sans-serif',
              boxShadow: titre.trim() ? '0 4px 12px rgba(34,197,94,0.3)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            ⚡ Ajouter l&apos;activité
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: '#5B6B85', marginBottom: 5,
  fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
  textTransform: 'uppercase', letterSpacing: '0.05em',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 10,
  border: '1px solid rgba(15,35,65,0.12)',
  background: 'rgba(15,35,65,0.03)',
  fontSize: 13, color: '#0F1B2D',
  fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
  outline: 'none', boxSizing: 'border-box',
}
