'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackType = 'bug' | 'idea' | 'remark' | 'rating'

const TYPES: { id: FeedbackType; emoji: string; label: string }[] = [
  { id: 'bug',    emoji: '🐛', label: 'Signaler un bug'      },
  { id: 'idea',   emoji: '💡', label: 'Proposer une idée'     },
  { id: 'remark', emoji: '📝', label: 'Laisser un commentaire' },
  { id: 'rating', emoji: '⭐', label: 'Évaluer la fonctionnalité' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeedbackWidget() {
  const pathname = usePathname()

  const [open,        setOpen]        = useState(false)
  const [type,        setType]        = useState<FeedbackType | null>(null)
  const [titre,       setTitre]       = useState('')
  const [description, setDescription] = useState('')
  const [note,        setNote]        = useState(0)
  const [loading,     setLoading]     = useState(false)
  const [sent,        setSent]        = useState(false)

  const reset = () => {
    setType(null); setTitre(''); setDescription(''); setNote(0); setSent(false)
  }

  const close = () => { setOpen(false); reset() }

  const submit = async () => {
    if (!type || !description.trim()) return
    setLoading(true)
    try {
      await fetch('/api/beta/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          titre:        titre.trim() || null,
          description:  description.trim(),
          page_url:     pathname,
          feature_note: type === 'rating' && note > 0 ? note : null,
        }),
      })
      setSent(true)
      setTimeout(() => close(), 2500)
    } catch {
      // Silencieux — l'enseignant ne doit pas voir une erreur technique
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ── Bouton flottant ────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        title="Envoyer un retour"
        style={{
          position:     'fixed',
          bottom:       24,
          left:         24,
          zIndex:       40,
          width:        44,
          height:       44,
          borderRadius: '50%',
          background:   'rgba(255,255,255,0.92)',
          border:       '1.5px solid rgba(108,92,231,0.25)',
          boxShadow:    '0 4px 16px rgba(108,92,231,0.18)',
          cursor:       'pointer',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          fontSize:     18,
          backdropFilter: 'blur(8px)',
          transition:   'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform  = 'scale(1.1)'
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(108,92,231,0.28)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform  = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(108,92,231,0.18)'
        }}
      >
        💬
      </button>

      {/* ── Overlay + Modal ────────────────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(15,27,45,0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) close() }}
        >
          <div style={{
            background:    'rgba(255,255,255,0.96)',
            borderRadius:  22,
            padding:       28,
            width:         '100%',
            maxWidth:      440,
            boxShadow:     '0 16px 48px rgba(108,92,231,0.18)',
            border:        '1px solid rgba(255,255,255,0.9)',
          }}>

            {/* En-tête */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F1B2D' }}>Votre avis</div>
                <div style={{ fontSize: 12, color: '#8B97AC', marginTop: 2 }}>
                  Bêta Scorgia — votre retour améliore le produit
                </div>
              </div>
              <button onClick={close} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 20, color: '#8B97AC', lineHeight: 1, padding: 4,
              }}>×</button>
            </div>

            {sent ? (
              /* Confirmation */
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#0F1B2D' }}>Merci pour votre retour !</div>
                <div style={{ fontSize: 13, color: '#8B97AC', marginTop: 6 }}>
                  Votre message a bien été reçu.
                </div>
              </div>
            ) : (
              <>
                {/* Sélecteur de type */}
                {!type && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {TYPES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setType(t.id)}
                        style={{
                          display:       'flex',
                          flexDirection: 'column',
                          alignItems:    'center',
                          gap:           6,
                          padding:       '14px 10px',
                          borderRadius:  14,
                          border:        '1.5px solid rgba(108,92,231,0.15)',
                          background:    'rgba(108,92,231,0.04)',
                          cursor:        'pointer',
                          transition:    'background 0.15s, border-color 0.15s',
                          fontSize:      22,
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background   = 'rgba(108,92,231,0.10)'
                          e.currentTarget.style.borderColor  = 'rgba(108,92,231,0.35)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background   = 'rgba(108,92,231,0.04)'
                          e.currentTarget.style.borderColor  = 'rgba(108,92,231,0.15)'
                        }}
                      >
                        <span>{t.emoji}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#5B6B85' }}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Formulaire */}
                {type && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Fil d'Ariane type */}
                    <button
                      onClick={() => setType(null)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'rgba(108,92,231,0.07)', border: 'none',
                        borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                        fontSize: 12, color: '#6C5CE7', fontWeight: 600, alignSelf: 'flex-start',
                      }}
                    >
                      ← {TYPES.find(t => t.id === type)?.emoji} {TYPES.find(t => t.id === type)?.label}
                    </button>

                    {/* Titre (optionnel sauf bug) */}
                    {(type === 'bug' || type === 'idea') && (
                      <input
                        value={titre}
                        onChange={e => setTitre(e.target.value)}
                        placeholder={type === 'bug' ? 'Titre du bug (optionnel)' : 'Titre de l\'idée (optionnel)'}
                        style={{
                          padding: '10px 14px', borderRadius: 10, fontSize: 13,
                          border: '1.5px solid rgba(108,92,231,0.15)',
                          background: 'rgba(108,92,231,0.03)',
                          color: '#0F1B2D', outline: 'none', fontFamily: 'inherit',
                        }}
                      />
                    )}

                    {/* Description */}
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder={
                        type === 'bug'    ? 'Décrivez ce qui s\'est passé et comment reproduire le problème…' :
                        type === 'idea'   ? 'Décrivez votre idée et en quoi elle vous aiderait…'              :
                        type === 'rating' ? 'Partagez votre expérience avec cette fonctionnalité…'            :
                        'Votre commentaire…'
                      }
                      rows={4}
                      style={{
                        padding: '10px 14px', borderRadius: 10, fontSize: 13,
                        border: '1.5px solid rgba(108,92,231,0.15)',
                        background: 'rgba(108,92,231,0.03)',
                        color: '#0F1B2D', outline: 'none', resize: 'vertical',
                        fontFamily: 'inherit', lineHeight: 1.5,
                      }}
                    />

                    {/* Note étoiles */}
                    {type === 'rating' && (
                      <div>
                        <div style={{ fontSize: 12, color: '#5B6B85', marginBottom: 6, fontWeight: 600 }}>
                          Note (optionnel)
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[1, 2, 3, 4, 5].map(n => (
                            <button
                              key={n}
                              onClick={() => setNote(n === note ? 0 : n)}
                              style={{
                                fontSize: 24, background: 'none', border: 'none',
                                cursor: 'pointer', padding: 2,
                                filter: n <= note ? 'none' : 'grayscale(1) opacity(0.3)',
                                transition: 'filter 0.15s',
                              }}
                            >
                              ⭐
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Page actuelle (info) */}
                    <div style={{ fontSize: 11, color: '#8B97AC' }}>
                      Page concernée : <span style={{ color: '#6C5CE7' }}>{pathname}</span>
                    </div>

                    {/* Bouton envoi */}
                    <button
                      onClick={submit}
                      disabled={!description.trim() || loading}
                      style={{
                        padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
                        background: (!description.trim() || loading)
                          ? 'rgba(108,92,231,0.3)'
                          : 'linear-gradient(135deg, #6C5CE7, #8B5CF6)',
                        color: 'white', border: 'none', cursor: (!description.trim() || loading) ? 'not-allowed' : 'pointer',
                        transition: 'opacity 0.15s',
                      }}
                    >
                      {loading ? 'Envoi…' : 'Envoyer'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
