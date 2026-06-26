'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ForfaitType } from '@/lib/types/database'
import MarkdownRenderer from '@/components/ui/MarkdownRenderer'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TypeContenuApercu = 'programme' | 'plan' | 'lecon' | 'activite' | 'quiz' | 'kit'

interface ApercuGenerationProps {
  titre: string
  type: TypeContenuApercu
  /** Contenu HTML pré-généré (mode non-streaming) */
  contenu_html?: string
  /** Params pour appel streaming direct */
  params?: Record<string, any>
  contenu_json?: Record<string, any>
  forfait: ForfaitType
  onValider: (contenu?: string) => void
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

// ─── Dots animation ───────────────────────────────────────────────────────────

function AnimatedDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', marginLeft: 4 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 4, height: 4, borderRadius: '50%',
          background: '#A78BFA',
          animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          display: 'inline-block',
        }} />
      ))}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ApercuGeneration({
  titre,
  type,
  contenu_html = '',
  params,
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

  // ── Streaming state ──────────────────────────────────────────────────────
  const [streamContenu, setStreamContenu] = useState('')
  const [enCours, setEnCours]             = useState(false)
  const [termine, setTermine]             = useState(!params)
  const abortRef = useRef<AbortController | null>(null)

  const contenuAffiche = streamContenu || contenu_html

  // ── Auto-démarrage du streaming si params fournis ────────────────────────
  useEffect(() => {
    if (params) {
      genererAvecStreaming(params)
    }
    return () => { abortRef.current?.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function genererAvecStreaming(p: Record<string, any>) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setEnCours(true)
    setTermine(false)
    setStreamContenu('')

    try {
      const response = await fetch('/api/ia/generer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, streaming: true }),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        setStreamContenu('⚠️ Erreur lors de la génération.')
        setEnCours(false)
        setTermine(true)
        return
      }

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setStreamContenu(prev => prev + chunk)
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setStreamContenu(prev => prev || '⚠️ Erreur de connexion.')
      }
    }

    setEnCours(false)
    setTermine(true)
  }

  // ── Téléchargement ───────────────────────────────────────────────────────
  const now = new Date().toLocaleDateString('fr-CA', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const handleDownload = async (format: 'pdf' | 'docx' | 'pptx') => {
    if (!isPro) { router.push('/dashboard/forfaits'); return }
    if (onTelecharger) { onTelecharger(format); return }

    setDownloading(format)
    try {
      if (format === 'pdf') {
        window.print()
        setDownloading(null)
        return
      }
      const endpoint = format === 'docx' ? '/api/export/docx' : '/api/export/pptx'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenu_html: contenuAffiche, titre }),
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
      /* Fail silently */
    }
    setDownloading(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────
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
        background: 'var(--color-bg-secondary)',
        border: '1.5px solid var(--color-border)',
        borderRadius: 18,
        zIndex: 1001,
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-modal)',
        overflow: 'hidden',
      }}>

        {/* ── En-tête ────────────────────────────────────────────────── */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--color-separator)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>✦</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Aperçu — {titre}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
                <span style={{
                  padding: '3px 10px',
                  background: typeInfo.bg, color: typeInfo.color,
                  borderRadius: 99, fontSize: 11, fontWeight: 700,
                  border: `1px solid ${typeInfo.color}33`,
                }}>
                  {typeInfo.label}
                </span>

                {/* Indicateur streaming */}
                {enCours ? (
                  <span style={{ fontSize: 11, color: '#A78BFA', display: 'flex', alignItems: 'center', gap: 4 }}>
                    ✦ KlassIA+ génère<AnimatedDots />
                  </span>
                ) : termine ? (
                  <span style={{ fontSize: 11, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    ✓ Génération terminée
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    Généré le {now}
                  </span>
                )}
              </div>
            </div>
            {onClose && (
              <button onClick={onClose}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 22, lineHeight: 1, flexShrink: 0, padding: 4, transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}>
                ×
              </button>
            )}
          </div>
        </div>

        {/* ── Contenu scrollable ─────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <style>{`
            @keyframes dotPulse {
              0%,100% { opacity: 1; transform: scale(1); }
              50%      { opacity: 0.4; transform: scale(0.75); }
            }
          `}</style>

          <div style={{ background: 'white', padding: '28px 32px', minHeight: 300 }}>
            {contenuAffiche ? (
              <>
                <MarkdownRenderer content={contenuAffiche} className="md-doc" />
                {enCours && (
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', paddingTop: 8 }}>
                    {([0, 0.3, 0.6] as number[]).map(delay => (
                      <span key={delay} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: '#A78BFA', display: 'inline-block',
                        animation: `dotPulse 1.2s ease-in-out ${delay}s infinite`,
                      }} />
                    ))}
                  </div>
                )}
              </>
            ) : enCours ? (
              /* Skeleton minimal pendant le démarrage */
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>✦</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>
                  KlassIA+ prépare votre contenu<AnimatedDots />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────────────────── */}
        <div style={{
          padding: '14px 24px 16px',
          borderTop: '1px solid var(--color-separator)',
          flexShrink: 0,
          background: 'var(--color-bg-secondary)',
        }}>

          {/* Actions principales */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <button onClick={() => onValider(streamContenu || contenu_html)}
              disabled={enCours}
              style={{
                flex: 1, padding: '11px',
                background: enCours ? 'rgba(107,63,160,0.4)' : 'linear-gradient(135deg,#6B3FA0,#4F46E5)',
                border: 'none', borderRadius: 10, color: 'white',
                fontSize: 14, fontWeight: 700,
                cursor: enCours ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { if (!enCours) e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              ✓ Valider
            </button>
            <button onClick={onModifier}
              style={{
                padding: '11px 18px',
                background: 'var(--color-btn-ghost-bg)',
                border: '1px solid var(--color-btn-ghost-border)',
                borderRadius: 10, color: 'var(--color-btn-ghost-text)',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-btn-ghost-hover-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--color-btn-ghost-bg)'}>
              ✏️ Modifier
            </button>
            <button onClick={params ? () => genererAvecStreaming(params) : onRegenerer}
              disabled={enCours}
              style={{
                padding: '11px 18px',
                background: 'var(--color-btn-ghost-bg)',
                border: '1px solid var(--color-btn-ghost-border)',
                borderRadius: 10, color: 'var(--color-btn-ghost-text)',
                fontSize: 14, fontWeight: 600,
                cursor: enCours ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!enCours) e.currentTarget.style.background = 'var(--color-btn-ghost-hover-bg)' }}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--color-btn-ghost-bg)'}>
              🔄 Regénérer
            </button>
          </div>

          {/* Actions secondaires — téléchargement */}
          {isPro ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              {(['pdf', 'docx', 'pptx'] as const).map(fmt => (
                <button key={fmt}
                  onClick={() => handleDownload(fmt)}
                  disabled={downloading === fmt || enCours}
                  style={{
                    padding: '7px 14px', borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: downloading === fmt ? 'var(--color-bg-hover)' : 'transparent',
                    color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600,
                    cursor: (downloading === fmt || enCours) ? 'wait' : 'pointer',
                    transition: 'all 0.15s', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { if (!enCours) e.currentTarget.style.borderColor = 'var(--color-border-strong)' }}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                >
                  {downloading === fmt ? '⏳' : fmt === 'pdf' ? '📄' : fmt === 'docx' ? '📝' : '📊'}{' '}
                  {fmt.toUpperCase()}
                </button>
              ))}

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
