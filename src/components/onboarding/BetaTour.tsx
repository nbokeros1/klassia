'use client'

import { useState, useEffect } from 'react'

// ─── Clé localStorage ─────────────────────────────────────────────────────────

const TOUR_KEY = 'KLASSIA_BETA_TOUR_DONE'

// ─── Étapes du tour ───────────────────────────────────────────────────────────

const STEPS = [
  {
    emoji: '🎉',
    titre: 'Bienvenue dans Scorgia !',
    corps: 'Vous faites partie des premiers enseignants à utiliser Scorgia. Voici un rapide aperçu de vos outils.',
  },
  {
    emoji: '✍️',
    titre: 'Préparez vos leçons',
    corps: 'Dans « Préparer » (menu à gauche), l\'IA génère un plan de cours complet en quelques instants à partir de vos objectifs.',
  },
  {
    emoji: '🎓',
    titre: 'Animez votre cours en direct',
    corps: 'Dans « Enseigner », suivez le déroulement de votre cours, gérez le temps, et obtenez des suggestions pédagogiques en temps réel.',
  },
  {
    emoji: '📚',
    titre: 'Retrouvez vos ressources',
    corps: 'La « Bibliothèque » conserve toutes vos leçons générées. Exportez-les en PDF, Word ou PowerPoint en un clic.',
  },
  {
    emoji: '💬',
    titre: 'Votre avis compte',
    corps: 'Vous êtes en bêta. Utilisez le bouton 💬 en bas à gauche à tout moment pour signaler un bug ou proposer une amélioration.',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function BetaTour() {
  const [visible, setVisible] = useState(false)
  const [step,    setStep]    = useState(0)

  useEffect(() => {
    // Délai court pour que le dashboard soit rendu avant l'overlay
    const t = setTimeout(() => {
      if (!localStorage.getItem(TOUR_KEY)) setVisible(true)
    }, 800)
    return () => clearTimeout(t)
  }, [])

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, 'true')
    setVisible(false)
  }

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else dismiss()
  }

  const prev = () => setStep(s => s - 1)

  if (!visible) return null

  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1

  return (
    <div
      style={{
        position:   'fixed',
        inset:      0,
        zIndex:     200,
        background: 'rgba(15,27,45,0.55)',
        backdropFilter: 'blur(6px)',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding:    16,
        animation:  'fadeInOverlay 0.25s ease',
      }}
    >
      <style>{`
        @keyframes fadeInOverlay { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUpCard { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <div style={{
        background:    'rgba(255,255,255,0.97)',
        borderRadius:  24,
        padding:       '36px 32px 28px',
        maxWidth:      440,
        width:         '100%',
        boxShadow:     '0 24px 64px rgba(108,92,231,0.22), 0 4px 16px rgba(15,27,45,0.12)',
        border:        '1px solid rgba(255,255,255,0.9)',
        animation:     'slideUpCard 0.3s ease',
        textAlign:     'center',
      }}>

        {/* Badge bêta */}
        <div style={{
          display: 'inline-block', marginBottom: 20,
          padding: '4px 12px', borderRadius: 100,
          background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.2)',
          fontSize: 11, fontWeight: 700, color: '#6C5CE7', letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          Bêta Scorgia
        </div>

        {/* Icône */}
        <div style={{ fontSize: 48, marginBottom: 16 }}>{current.emoji}</div>

        {/* Titre */}
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0F1B2D', marginBottom: 10, lineHeight: 1.2 }}>
          {current.titre}
        </div>

        {/* Corps */}
        <div style={{ fontSize: 14, color: '#5B6B85', lineHeight: 1.6, marginBottom: 28 }}>
          {current.corps}
        </div>

        {/* Indicateurs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width:        i === step ? 20 : 6,
              height:       6,
              borderRadius: 3,
              background:   i === step ? '#6C5CE7' : 'rgba(108,92,231,0.18)',
              transition:   'width 0.25s ease, background 0.25s ease',
            }} />
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
          {step > 0 && (
            <button onClick={prev} style={{
              padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600,
              background: 'rgba(108,92,231,0.07)', border: '1.5px solid rgba(108,92,231,0.15)',
              color: '#6C5CE7', cursor: 'pointer',
            }}>
              ← Précédent
            </button>
          )}

          <button onClick={next} style={{
            padding: '10px 28px', borderRadius: 12, fontSize: 13, fontWeight: 700,
            background: 'linear-gradient(135deg, #6C5CE7, #8B5CF6)',
            color: 'white', border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(108,92,231,0.30)',
            flex: step === 0 ? 1 : 'unset',
          }}>
            {isLast ? 'Commencer ✨' : 'Suivant →'}
          </button>
        </div>

        {/* Ignorer */}
        {!isLast && (
          <button onClick={dismiss} style={{
            marginTop: 14, background: 'none', border: 'none',
            fontSize: 12, color: '#8B97AC', cursor: 'pointer',
          }}>
            Ignorer le tour
          </button>
        )}
      </div>
    </div>
  )
}
