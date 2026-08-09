'use client'

import { useState, useRef, useCallback } from 'react'
import type { GabaritMappingResult, MappingLigne } from '@/lib/types/teaching-pack'

interface Props {
  classeId?: string
  onAccept?: (gabaritUrl: string) => void
  onReturnToDefault?: () => void
}

const STATUT_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  reconnu:       { icon: '✅', label: 'Reconnu',       color: '#34D399' },
  manquant:      { icon: '⚠️', label: 'Manquant',      color: '#FBC34A' },
  supplementaire:{ icon: '➕', label: 'Supplémentaire', color: '#60A5FA' },
  incompris:     { icon: '❓', label: 'Non compris',    color: '#F87171' },
  ignore:        { icon: '—',  label: 'Ignoré',         color: '#94A3B8' },
}

export default function TemplateMapping({ classeId, onAccept, onReturnToDefault }: Props) {
  const [file,      setFile]      = useState<File | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [mapping,   setMapping]   = useState<GabaritMappingResult | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [accepted,  setAccepted]  = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const analyserGabarit = useCallback(async (f: File) => {
    setLoading(true)
    setError(null)
    setMapping(null)

    try {
      const formData = new FormData()
      formData.append('file', f)
      const res = await fetch('/api/spie/analyze-template', { method: 'POST', body: formData })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erreur d\'analyse')
      }
      const data = await res.json()
      setMapping(data.mapping as GabaritMappingResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleAccept = useCallback(() => {
    setAccepted(true)
    onAccept?.('custom')
  }, [onAccept])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Mon gabarit</h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
          Téléversez votre gabarit institutionnel (Word, PDF). ScorgIA analyse les sections et propose un mapping avec ses objets pédagogiques.
        </p>
      </div>

      {/* Avertissements */}
      <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(96,165,250,.08)', border: '1px solid rgba(96,165,250,.25)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        <strong>Règles :</strong><br />
        • Votre fichier original n'est jamais modifié.<br />
        • L'analyse est locale — le contenu du gabarit n'est pas utilisé pour entraîner des modèles.<br />
        • Vous pouvez accepter, ignorer ou revenir au gabarit ScorgIA à tout moment.
      </div>

      {/* Upload */}
      {!file && !mapping && (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setFile(f); analyserGabarit(f) } }}
          style={{ border: '2px dashed var(--color-border)', borderRadius: 12, padding: '32px 24px', textAlign: 'center', cursor: 'pointer' }}>
          <input ref={fileRef} type="file" accept=".docx,.doc,.pdf,.txt" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); analyserGabarit(f) } }} />
          <div style={{ fontSize: 32, marginBottom: 10 }}>📤</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Glissez votre gabarit ici ou cliquez pour parcourir</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Word, PDF ou texte acceptés</div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: 13 }}>
          ⏳ Analyse du gabarit en cours…
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', color: '#F87171', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Résultats du mapping */}
      {mapping && !accepted && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Compatibilité */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 12, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: mapping.compatibilite_spie >= 70 ? '#34D399' : mapping.compatibilite_spie >= 40 ? '#FBC34A' : '#F87171' }}>
                {mapping.compatibilite_spie}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Compatibilité SPIE</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {mapping.peut_utiliser
                  ? 'Ce gabarit est compatible. Vous pouvez l\'utiliser avec ScorgIA.'
                  : 'Ce gabarit manque des sections obligatoires — certains éléments ScorgIA ne pourront pas être mappés.'}
              </div>
            </div>
          </div>

          {/* Aperçu mapping */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Aperçu du mapping</div>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', background: 'var(--color-bg-primary)', padding: '8px 12px', borderBottom: '1px solid var(--color-border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <span>Section gabarit</span>
                <span>Objet SPIE</span>
                <span>Statut</span>
              </div>
              {mapping.sections_reconnues.map((ligne, i) => {
                const cfg = STATUT_CONFIG[ligne.statut] ?? STATUT_CONFIG.ignore
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', padding: '8px 12px', borderBottom: '1px solid var(--color-border)', alignItems: 'center', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,.02)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ligne.section_gabarit_utilisateur}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ligne.objet_spie_associe ?? '—'}</span>
                    <span style={{ fontSize: 11, color: cfg.color, display: 'flex', alignItems: 'center', gap: 4 }}>{cfg.icon} {cfg.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Avertissements */}
          {mapping.avertissements.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {mapping.avertissements.map((a, i) => (
                <div key={i} style={{ fontSize: 12, color: '#FBC34A' }}>⚠ {a}</div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {mapping.peut_utiliser && (
              <button onClick={handleAccept} style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#7F77DD,#4F46E5)', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                ✓ Accepter ce gabarit
              </button>
            )}
            <button onClick={() => { setFile(null); setMapping(null) }} style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              Réessayer avec un autre fichier
            </button>
            <button onClick={onReturnToDefault} style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              ← Revenir au gabarit ScorgIA
            </button>
          </div>
        </div>
      )}

      {accepted && (
        <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.3)', fontSize: 14, color: '#34D399', fontWeight: 700 }}>
          ✅ Gabarit utilisateur accepté — il sera utilisé pour les exports de ce Teaching Pack.
        </div>
      )}
    </div>
  )
}
