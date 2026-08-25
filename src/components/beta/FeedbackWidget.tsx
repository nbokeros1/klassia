'use client'

import { useState } from 'react'

type FeedbackType = 'bug' | 'blocked' | 'confused' | 'idea' | 'positive' | 'remark'

const TYPES: { value: FeedbackType; label: string; emoji: string; color: string }[] = [
  { value: 'blocked',  label: 'Bloqué(e)',    emoji: '🚫', color: '#EF4444' },
  { value: 'bug',      label: 'Bug',          emoji: '🐛', color: '#F59E0B' },
  { value: 'confused', label: 'Perdu(e)',     emoji: '😕', color: '#A78BFA' },
  { value: 'idea',     label: 'Suggestion',   emoji: '💡', color: '#6C5CE7' },
  { value: 'positive', label: 'Ça marche !',  emoji: '✨', color: '#22C55E' },
  { value: 'remark',   label: 'Commentaire',  emoji: '💬', color: '#64748B' },
]

type Stage = 'closed' | 'picker' | 'form' | 'done'

export default function FeedbackWidget() {
  const [stage,       setStage]       = useState<Stage>('closed')
  const [type,        setType]        = useState<FeedbackType>('remark')
  const [titre,       setTitre]       = useState('')
  const [description, setDescription] = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const selectedType = TYPES.find(t => t.value === type) ?? TYPES[4]

  async function submit() {
    if (!description.trim()) { setError('Décrivez le problème ou l\'idée.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/beta/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          titre: titre.trim() || null,
          description: description.trim(),
          page_url: window.location.pathname,
        }),
      })
      if (!res.ok) throw new Error('Erreur lors de l\'envoi.')
      setStage('done')
      setTitre('')
      setDescription('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setStage('closed')
    setTitre('')
    setDescription('')
    setError(null)
  }

  return (
    <>
      {/* FAB trigger */}
      {stage === 'closed' && (
        <button
          onClick={() => setStage('picker')}
          title="Donner mon avis"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 999,
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6C5CE7, #A78BFA)',
            border: 'none', cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, boxShadow: '0 4px 20px rgba(108,92,231,0.45)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
        >
          💬
        </button>
      )}

      {/* Panel overlay */}
      {stage !== 'closed' && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
            padding: '0 24px 24px 0',
            background: 'transparent',
          }}
        >
          <div
            style={{
              width: 340, borderRadius: 16,
              background: 'rgba(13, 18, 36, 0.96)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
              <span style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 14 }}>
                Donner mon avis
              </span>
              <button
                onClick={reset}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}
              >
                ×
              </button>
            </div>

            {/* Type picker */}
            {stage === 'picker' && (
              <div style={{ padding: 16 }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 12, marginTop: 0 }}>
                  Que voulez-vous nous dire ?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => { setType(t.value); setStage('form') }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer', color: '#F1F5F9',
                        fontSize: 14, fontWeight: 500, textAlign: 'left',
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLButtonElement
                        const rgb =
                          t.color === '#EF4444' ? '239,68,68' :
                          t.color === '#F59E0B' ? '245,158,11' :
                          t.color === '#A78BFA' ? '167,139,250' :
                          t.color === '#6C5CE7' ? '108,92,231' :
                          t.color === '#22C55E' ? '34,197,94' :
                          '100,116,139'
                        el.style.background = `rgba(${rgb},0.12)`
                        el.style.borderColor = `${t.color}40`
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLButtonElement
                        el.style.background = 'rgba(255,255,255,0.04)'
                        el.style.borderColor = 'rgba(255,255,255,0.08)'
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{t.emoji}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form */}
            {stage === 'form' && (
              <div style={{ padding: 16 }}>
                {/* Type badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 20,
                  background: `${selectedType.color}18`,
                  border: `1px solid ${selectedType.color}40`,
                  color: selectedType.color, fontSize: 12, fontWeight: 600,
                  marginBottom: 14,
                }}>
                  {selectedType.emoji} {selectedType.label}
                  <button
                    onClick={() => setStage('picker')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 11, opacity: 0.7, padding: '0 0 0 4px' }}
                  >
                    changer
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Titre court (optionnel)"
                  value={titre}
                  onChange={e => setTitre(e.target.value)}
                  maxLength={120}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '9px 12px', borderRadius: 8, marginBottom: 10,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#F1F5F9', fontSize: 13, outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />

                <textarea
                  placeholder={
                    type === 'blocked'  ? 'Décrivez ce qui vous bloque…' :
                    type === 'bug'      ? 'Décrivez le bug et comment le reproduire…' :
                    type === 'confused' ? 'Qu\'est-ce qui vous a semblé peu clair ?' :
                    type === 'idea'     ? 'Décrivez votre suggestion…' :
                    type === 'positive' ? 'Qu\'est-ce qui a bien fonctionné ?' :
                    'Votre commentaire…'
                  }
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '9px 12px', borderRadius: 8, marginBottom: 12,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#F1F5F9', fontSize: 13, resize: 'vertical', outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />

                {error && (
                  <p style={{ color: '#EF4444', fontSize: 12, marginBottom: 10, marginTop: -6 }}>
                    {error}
                  </p>
                )}

                <button
                  onClick={submit}
                  disabled={submitting}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                    background: submitting ? 'rgba(108,92,231,0.5)' : 'linear-gradient(135deg, #6C5CE7, #A78BFA)',
                    color: '#fff', fontWeight: 600, fontSize: 14, cursor: submitting ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {submitting ? 'Envoi…' : 'Envoyer'}
                </button>
              </div>
            )}

            {/* Done */}
            {stage === 'done' && (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🙏</div>
                <p style={{ color: '#F1F5F9', fontWeight: 600, marginBottom: 6, fontSize: 15 }}>
                  Merci pour votre retour !
                </p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 20 }}>
                  Votre avis aide à améliorer ScorgIA.
                </p>
                <button
                  onClick={reset}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent', color: 'rgba(255,255,255,0.6)',
                    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
