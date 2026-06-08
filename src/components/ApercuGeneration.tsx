'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ForfaitType } from '@/lib/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TypeContenuApercu = 'programme' | 'plan' | 'lecon' | 'activite' | 'quiz' | 'kit'

interface ApercuGenerationProps {
  titre: string
  type: TypeContenuApercu
  contenu_html: string
  contenu_json?: Record<string, any>
  forfait: ForfaitType
  onValider: () => void
  onModifier: () => void
  onRegenerer: () => void
  onTelecharger?: (format: 'pdf' | 'docx' | 'pptx') => void
  onClose?: () => void
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<TypeContenuApercu, { label: string; color: string; bg: string }> = {
  programme: { label: 'Programme annuel', color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  plan:      { label: 'Plan de leçon',    color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  lecon:     { label: 'Leçon complète',   color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  activite:  { label: 'Activité',         color: '#FBC34A', bg: 'rgba(251,195,74,0.12)' },
  quiz:      { label: 'Quiz',             color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  kit:       { label: 'Kit pédagogique',  color: '#22D3EE', bg: 'rgba(34,211,238,0.12)' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ApercuGeneration({
  titre,
  type,
  contenu_html,
  contenu_json,
  forfait,
  onValider,
  onModifier,
  onRegenerer,
  onTelecharger,
  onClose,
}: ApercuGenerationProps) {
  const router    = useRouter()
  const typeInfo  = TYPE_LABELS[type]
  const isProPlus = forfait === 'pro_plus' || forfait === 'institution'
  const isPro     = forfait === 'pro' || isProPlus

  const [downloading, setDownloading] = useState<string | null>(null)

  const now = new Date().toLocaleDateString('fr-CA', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const handleDownload = async (format: 'pdf' | 'docx' | 'pptx') => {
    if (!isPro) { router.push('/dashboard/forfaits'); return }
    if (onTelecharger) { onTelecharger(format); return }

    setDownloading(format)
    try {
      const endpoint = format === 'docx' ? '/api/export/docx' : '/api/export/pptx'
      if (format === 'pdf') {
        window.print()
        setDownloading(null)
        return
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenu_html, titre }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `${titre.replace(/\s+/g, '_')}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Fail silently — export routes may not support content-only mode yet
    }
    setDownloading(null)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, backdropFilter: 'blur(2px)' }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 760,
        maxHeight: '90vh',
        background: '#0D1526',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 18,
        zIndex: 1001,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        overflow: 'hidden',
      }}>

        {/* ── En-tête ────────────────────────────────────────────────── */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>✦</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                  Aperçu généré — {titre}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                <span style={{
                  padding: '3px 10px',
                  background: typeInfo.bg, color: typeInfo.color,
                  borderRadius: 99, fontSize: 11, fontWeight: 700,
                }}>
                  {typeInfo.label}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-4)', alignSelf: 'center' }}>
                  Généré le {now}
                </span>
              </div>
            </div>
            {onClose && (
              <button onClick={onClose}
                style={{ background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', fontSize: 20, lineHeight: 1, flexShrink: 0, padding: 4 }}>
                ×
              </button>
            )}
          </div>
        </div>

        {/* ── Contenu scrollable ─────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          <style>{`
            .apercu-content { font-family: Georgia, 'Times New Roman', serif; font-size: 14px; line-height: 1.7; color: #1A1A2E; }
            .apercu-content h1 { font-size: 22px; font-weight: 800; margin: 24px 0 12px; }
            .apercu-content h2 { font-size: 17px; font-weight: 700; margin: 18px 0 8px; }
            .apercu-content h3 { font-size: 14px; font-weight: 700; margin: 14px 0 6px; }
            .apercu-content p  { margin: 0 0 10px; }
            .apercu-content ul, .apercu-content ol { margin: 8px 0 10px 22px; }
            .apercu-content li { margin-bottom: 4px; }
            .apercu-content table { width: 100%; border-collapse: collapse; margin: 14px 0; }
            .apercu-content th { background: #EDE9FE; color: #4C1D95; padding: 8px 12px; text-align: left; font-size: 12px; }
            .apercu-content td { padding: 8px 12px; border-bottom: 1px solid #EDE9FE; font-size: 13px; }
            .apercu-content tr:nth-child(even) td { background: #FAFBFF; }
            .apercu-content callout { display:block; padding:12px 16px; border-radius:8px; margin:12px 0; border-left:3px solid; }
            .apercu-content callout[type="intention"] { background:rgba(96,165,250,0.1); border-color:#60A5FA; }
            .apercu-content callout[type="exemple"]   { background:rgba(52,211,153,0.1); border-color:#34D399; }
            .apercu-content callout[type="activite"]  { background:rgba(167,139,250,0.1); border-color:#A78BFA; }
            .apercu-content callout[type="exercice"]  { background:rgba(251,195,74,0.1); border-color:#FBC34A; }
            .apercu-content callout[type="formule"]   { background:rgba(248,113,113,0.1); border-color:#F87171; }
            .apercu-content callout[type="important"] { background:rgba(248,113,113,0.12); border-color:#F87171; }
          `}</style>
          <div style={{ background: 'white', padding: '28px 32px', minHeight: 300 }}>
            <div
              className="apercu-content"
              dangerouslySetInnerHTML={{ __html: contenu_html }}
            />
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────────────────── */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, background: '#0D1526' }}>

          {/* Actions principales */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <button onClick={onValider}
              style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#6B3FA0,#4F46E5)', border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              ✓ Valider
            </button>
            <button onClick={onModifier}
              style={{ padding: '11px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--text-2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}>
              ✏️ Modifier
            </button>
            <button onClick={onRegenerer}
              style={{ padding: '11px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--text-2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}>
              🔄 Regénérer
            </button>
          </div>

          {/* Actions secondaires — téléchargement */}
          {isPro ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              {(['pdf', 'docx', 'pptx'] as const).map(fmt => (
                <button key={fmt}
                  onClick={() => handleDownload(fmt)}
                  disabled={downloading === fmt}
                  style={{
                    padding: '7px 14px', borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: downloading === fmt ? 'rgba(255,255,255,0.06)' : 'transparent',
                    color: 'var(--text-3)', fontSize: 12, fontWeight: 600,
                    cursor: downloading === fmt ? 'wait' : 'pointer',
                    transition: 'all 0.15s', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                >
                  {downloading === fmt ? '⏳' : fmt === 'pdf' ? '📄' : fmt === 'docx' ? '📝' : '📊'}{' '}
                  {fmt.toUpperCase()}
                </button>
              ))}

              {/* Kit complet si Pro+ + type leçon */}
              {isProPlus && type === 'lecon' && (
                <button
                  onClick={() => router.push('/dashboard/classes')}
                  style={{
                    padding: '7px 14px', borderRadius: 8,
                    border: '1px solid rgba(167,139,250,0.3)',
                    background: 'rgba(167,139,250,0.08)',
                    color: '#A78BFA', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(167,139,250,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(167,139,250,0.08)'}
                >
                  📦 Générer le kit complet
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => router.push('/dashboard/forfaits')}
              style={{
                padding: '8px 18px', borderRadius: 8,
                border: '1px solid rgba(167,139,250,0.25)',
                background: 'rgba(167,139,250,0.06)',
                color: '#A78BFA', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              🔒 Télécharger — Passer au Pro
            </button>
          )}
        </div>
      </div>
    </>
  )
}
