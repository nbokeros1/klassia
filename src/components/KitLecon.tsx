'use client'

import { useState } from 'react'
import ApercuGeneration from '@/components/ApercuGeneration'
import type { ForfaitType } from '@/lib/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KitElement {
  id:    string
  label: string
  icon:  string
  html:  string
  type:  'plan' | 'lecon' | 'activite' | 'quiz' | 'programme'
}

interface KitLeconProps {
  sujet:    string
  forfait:  ForfaitType
  elements: {
    plan:      string
    lecon:     string
    activite:  string
    quiz_html: string
    devoir:    string
    corrige:   string
  }
  ids?: {
    quiz_id?:     string | null
    activite_id?: string | null
  }
  onClose?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KitLecon({ sujet, forfait, elements, ids, onClose }: KitLeconProps) {
  const [apercu, setApercu] = useState<KitElement | null>(null)

  const items: KitElement[] = [
    { id: 'plan',     label: 'Plan de leçon',      icon: '📋', html: elements.plan,      type: 'plan'     },
    { id: 'lecon',    label: 'Leçon complète',      icon: '📖', html: elements.lecon,     type: 'lecon'    },
    { id: 'activite', label: 'Activité de groupe',  icon: '🧩', html: elements.activite,  type: 'activite' },
    { id: 'quiz',     label: 'Quiz 10 questions',   icon: '❓', html: elements.quiz_html, type: 'quiz'     },
    { id: 'devoir',   label: 'Devoir différencié',  icon: '📝', html: elements.devoir,    type: 'plan'     },
    { id: 'corrige',  label: 'Corrigé complet',     icon: '✅', html: elements.corrige,   type: 'plan'     },
  ]

  const copyText = (html: string) => {
    const text = html.replace(/<[^>]*>/g, '').trim()
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 640,
        maxHeight: '88vh',
        background: '#0D1526',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 18,
        zIndex: 1001,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        overflow: 'hidden',
      }}>

        {/* ── En-tête ──────────────────────────────────────────────────── */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
                📦 Kit pédagogique complet
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{sujet}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(52,211,153,0.12)', color: '#34D399', borderRadius: 99, fontWeight: 700 }}>
                ✓ Tout sauvegardé
              </span>
              {onClose && (
                <button onClick={onClose}
                  style={{ background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', fontSize: 20, padding: 4, lineHeight: 1 }}>
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Liste des éléments ───────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((item, idx) => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, transition: 'border-color 0.15s',
              }}>
                {/* Numéro + icône */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6B3FA0,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white' }}>
                    {idx + 1}
                  </div>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                </div>

                {/* Label */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{item.label}</div>
                  {item.id === 'quiz' && ids?.quiz_id && (
                    <div style={{ fontSize: 10, color: '#34D399', marginTop: 2 }}>✓ Sauvegardé dans Quiz</div>
                  )}
                  {item.id === 'activite' && ids?.activite_id && (
                    <div style={{ fontSize: 10, color: '#34D399', marginTop: 2 }}>✓ Sauvegardé dans Activités</div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setApercu(item)}
                    style={{ padding: '6px 12px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 7, fontSize: 11, fontWeight: 600, color: '#A78BFA', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(167,139,250,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(167,139,250,0.1)'}>
                    Aperçu
                  </button>
                  <button onClick={() => copyText(item.html)}
                    style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, fontSize: 11, color: 'var(--text-4)', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                    📋
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Tout télécharger */}
          <button
            style={{ marginTop: 16, width: '100%', padding: '11px', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 10, color: 'var(--text-4)', fontSize: 12, fontWeight: 500, cursor: 'not-allowed', fontFamily: 'inherit' }}
            disabled
            title="Bientôt disponible">
            📥 Tout télécharger en ZIP (bientôt disponible)
          </button>
        </div>
      </div>

      {/* Aperçu d'un élément */}
      {apercu && (
        <ApercuGeneration
          titre={`${apercu.label} — ${sujet}`}
          type={apercu.type}
          contenu_html={apercu.html}
          forfait={forfait}
          onValider={() => setApercu(null)}
          onModifier={() => setApercu(null)}
          onRegenerer={() => setApercu(null)}
          onClose={() => setApercu(null)}
        />
      )}
    </>
  )
}
