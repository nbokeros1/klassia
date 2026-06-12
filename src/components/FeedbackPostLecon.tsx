'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type Niveau = 'facile' | 'parfait' | 'difficile' | null
type Step   = 'form' | 'success'

interface FeedbackPostLeconProps {
  lecon_id:      string
  lecon_titre:   string
  classe_id:     string
  enseignant_id: string
  onClose:       () => void
  onComplete?:   () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeedbackPostLecon({
  lecon_id, lecon_titre, classe_id, enseignant_id, onClose, onComplete,
}: FeedbackPostLeconProps) {
  const supabase = createClient()

  const [niveau,       setNiveau]       = useState<Niveau>(null)
  const [etoiles,      setEtoiles]      = useState(0)
  const [hoverEtoile,  setHoverEtoile]  = useState(0)
  const [note,         setNote]         = useState('')
  const [step,         setStep]         = useState<Step>('form')
  const [loading,      setLoading]      = useState(false)
  const [passerOk,     setPasserOk]     = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setPasserOk(true), 3000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (step !== 'success') return
    const t = setTimeout(() => { onComplete?.(); onClose() }, 2000)
    return () => clearTimeout(t)
  }, [step])

  const handleSubmit = async () => {
    setLoading(true)

    const commentaire = [
      niveau === 'facile' ? 'Niveau: trop facile'
        : niveau === 'difficile' ? 'Niveau: trop difficile'
        : 'Niveau: parfait',
      note.trim() || null,
    ].filter(Boolean).join(' — ')

    // 1. Marquer leçon comme enseignee
    await supabase.from('lecons').update({ statut: 'enseignee' }).eq('id', lecon_id)

    // 2. Mettre à jour fichiers_classe si la table existe
    try {
      await (supabase.from('fichiers_classe') as any).update({
        feedback_note:        etoiles,
        feedback_commentaire: commentaire,
        derniere_utilisation: new Date().toISOString(),
      }).eq('lecon_id', lecon_id)
    } catch { /* table optionnelle */ }

    // 3. Sauvegarder dans studio_ia_ressources (mémoire IA)
    await supabase.from('studio_ia_ressources').insert({
      enseignant_id,
      classe_id,
      source:        'ressource_generale',
      type_contenu:  'feedback_lecon',
      titre:         `Feedback — ${lecon_titre}`,
      contenu_texte: commentaire,
      est_general:   false,
    })

    // 4. Tâche auto si engagement faible (< 3 étoiles)
    if (etoiles > 0 && etoiles < 3) {
      const demain = new Date()
      demain.setDate(demain.getDate() + 1)
      await supabase.from('taches_enseignant').insert({
        enseignant_id,
        titre:         `Revoir la leçon "${lecon_titre}" — feedback faible`,
        type:          'preparer_lecon',
        date_echeance: demain.toISOString().split('T')[0],
        est_complete:  false,
      })
    }

    setLoading(false)
    setStep('success')
  }

  const canSubmit = niveau !== null && etoiles > 0

  return (
    <>
      <style>{`
        @keyframes fbIn  { from{opacity:0;transform:translate(-50%,calc(-50% + 24px)) scale(0.95)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
        @keyframes fbChk { 0%{transform:scale(0.4);opacity:0} 60%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
        @keyframes fbStar{ 0%{transform:scale(1)} 50%{transform:scale(1.35)} 100%{transform:scale(1)} }
      `}</style>

      {/* Backdrop */}
      <div onClick={() => passerOk && onClose()}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 468,
        background: '#0D1526',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, zIndex: 1001, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        animation: 'fbIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
      }}>

        {/* ── Succès ──────────────────────────────────────────────────── */}
        {step === 'success' && (
          <div style={{ padding: '52px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16, display: 'inline-block', animation: 'fbChk 0.5s ease forwards' }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>Merci !</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
              Votre IA s'améliore pour cette classe. ✓
            </div>
          </div>
        )}

        {/* ── Formulaire ──────────────────────────────────────────────── */}
        {step === 'form' && (
          <>
            {/* En-tête */}
            <div style={{ padding: '24px 24px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>
                Comment s'est passé ce cours ? 📝
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-4)' }}>3 questions rapides (30 secondes)</div>
            </div>

            <div style={{ padding: '20px 24px 24px' }}>

              {/* Q1 — Niveau */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>
                  La leçon était-elle adaptée au niveau ?
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([
                    { id: 'facile',    label: '😕 Trop facile',    color: '#60A5FA' },
                    { id: 'parfait',   label: '😊 Parfait',        color: '#34D399' },
                    { id: 'difficile', label: '😤 Trop difficile', color: '#F87171' },
                  ] as const).map(opt => (
                    <button key={opt.id} onClick={() => setNiveau(opt.id)}
                      style={{
                        flex: 1, padding: '10px 6px', borderRadius: 10, fontFamily: 'inherit',
                        border: `2px solid ${niveau === opt.id ? opt.color : 'rgba(255,255,255,0.1)'}`,
                        background: niveau === opt.id ? `${opt.color}18` : 'rgba(255,255,255,0.04)',
                        color: niveau === opt.id ? opt.color : 'var(--text-3)',
                        fontSize: 11.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q2 — Étoiles */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>
                  L'engagement des élèves était :
                </div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                  {[1, 2, 3, 4, 5].map(n => {
                    const active = hoverEtoile >= n || etoiles >= n
                    return (
                      <button key={n}
                        onMouseEnter={() => setHoverEtoile(n)}
                        onMouseLeave={() => setHoverEtoile(0)}
                        onClick={() => setEtoiles(n)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 34, padding: '2px 4px',
                          color: active ? '#FBC34A' : 'rgba(255,255,255,0.15)',
                          transform: active ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.1s',
                        }}>
                        ★
                      </button>
                    )
                  })}
                </div>
                {etoiles > 0 && (
                  <div style={{ textAlign: 'center', fontSize: 11, color: '#FBC34A', marginTop: 5, fontWeight: 600 }}>
                    {['', 'Très faible', 'Faible', 'Correct', 'Bon', 'Excellent !'][etoiles]}
                  </div>
                )}
              </div>

              {/* Q3 — Note texte */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>
                  Une note rapide ?{' '}
                  <span style={{ fontWeight: 400, color: 'var(--text-4)', fontSize: 12 }}>(optionnel)</span>
                </div>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value.slice(0, 150))}
                  rows={2}
                  placeholder="Ex: L'amorce a très bien fonctionné..."
                  style={{
                    width: '100%', padding: '10px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                    color: 'var(--text-1)', fontSize: 12, fontFamily: 'inherit',
                    lineHeight: 1.6, resize: 'none', outline: 'none',
                    boxSizing: 'border-box' as const,
                  }}
                />
                <div style={{ fontSize: 10, color: 'var(--text-4)', textAlign: 'right', marginTop: 3 }}>
                  {note.length}/150
                </div>
              </div>

              {/* Boutons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleSubmit} disabled={!canSubmit || loading}
                  style={{
                    flex: 1, padding: '12px',
                    background: canSubmit && !loading
                      ? 'linear-gradient(135deg,#6B3FA0,#4F46E5)'
                      : 'rgba(255,255,255,0.08)',
                    border: 'none', borderRadius: 12, fontFamily: 'inherit',
                    color: canSubmit && !loading ? 'white' : 'var(--text-4)',
                    fontSize: 14, fontWeight: 700,
                    cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                  }}>
                  {loading ? '...' : 'Envoyer le feedback'}
                </button>
                <button onClick={onClose} disabled={!passerOk}
                  style={{
                    padding: '12px 18px', borderRadius: 12, fontFamily: 'inherit',
                    border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                    color: passerOk ? 'var(--text-4)' : 'rgba(255,255,255,0.2)',
                    fontSize: 13, cursor: passerOk ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s',
                  }}>
                  Passer
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
