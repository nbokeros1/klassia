'use client'

import { useState, useEffect, useRef } from 'react'
import { TOUS_SCHEMAS, SCHEMAS_CATALOGUE, getSchemasByMatiere } from './SchemasSVG/index'
import type { SchemaConfig } from './SchemasSVG/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean
  onClose: () => void
  onInsert: (schemaId: string) => void
  matiereClasse?: string
}

type ActiveTab = 'suggeres' | 'biologie' | 'chimie' | 'physique' | 'maths'

interface PropEditorState {
  schemaId: string
  couleurPrimaire: string
  couleurSecondaire: string
  showLabels: boolean
  width: number
  height: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSchemaPreviewSvg(id: string): string {
  const found = TOUS_SCHEMAS.find(s => {
    // match catalogue id → toSvg id (strip category prefix if needed)
    return s.id.includes(id.replace('bio-', '').replace('chi-', '').replace('phy-', '').replace('mat-', ''))
      || id.includes(s.id.replace('bio-', '').replace('chi-', '').replace('phy-', '').replace('mat-', ''))
      || s.id === id
  })
  if (!found) {
    // fallback: generic placeholder
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90"><rect width="120" height="90" fill="rgba(255,255,255,0.04)" rx="4"/><text x="60" y="50" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.3)" font-family="system-ui">Aperçu</text></svg>`
  }
  return found.toSvg()
}

function getSvgFromState(id: string, state: PropEditorState): string {
  const found = TOUS_SCHEMAS.find(s => s.id === id || s.id.includes(id))
  if (!found) return ''
  return found.toSvg({
    colors: {
      primary:   state.couleurPrimaire,
      secondary: state.couleurSecondaire,
    },
    labels: {},
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchemasPanel({ isOpen, onClose, onInsert, matiereClasse }: Props) {
  const [activeTab, setActiveTab]   = useState<ActiveTab>('suggeres')
  const [search, setSearch]         = useState('')
  const [apercu, setApercu]         = useState<SchemaConfig | null>(null)
  const [editing, setEditing]       = useState<PropEditorState | null>(null)
  const [copied, setCopied]         = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) { setSearch(''); setApercu(null); setEditing(null) }
  }, [isOpen])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  if (!isOpen) return null

  // ── Tab data ────────────────────────────────────────────────────────────────

  const suggested = matiereClasse
    ? getSchemasByMatiere(matiereClasse).slice(0, 9)
    : SCHEMAS_CATALOGUE.slice(0, 9)

  const tabSchemas: Record<ActiveTab, SchemaConfig[]> = {
    suggeres: suggested,
    biologie: SCHEMAS_CATALOGUE.filter(s => s.categorie === 'biologie'),
    chimie:   SCHEMAS_CATALOGUE.filter(s => s.categorie === 'chimie'),
    physique: SCHEMAS_CATALOGUE.filter(s => s.categorie === 'physique'),
    maths:    SCHEMAS_CATALOGUE.filter(s => s.categorie === 'maths'),
  }

  const filtered = search.trim()
    ? SCHEMAS_CATALOGUE.filter(s =>
        s.nom.toLowerCase().includes(search.toLowerCase()) ||
        s.tags.some(t => t.includes(search.toLowerCase())) ||
        s.description.toLowerCase().includes(search.toLowerCase())
      )
    : tabSchemas[activeTab]

  // ── Insert handler ──────────────────────────────────────────────────────────

  const handleInsert = (schema: SchemaConfig, editorState?: PropEditorState) => {
    // Find matching toSvg item
    const found = TOUS_SCHEMAS.find(s =>
      s.id === schema.id ||
      s.id.replace(/^(bio|chi|phy|mat)-/, '') === schema.id.replace(/^(bio|chi|phy|mat)-/, '') ||
      schema.id.includes(s.id.replace(/^(bio|chi|phy|mat)-/, ''))
    )
    if (found) {
      const svg = editorState
        ? found.toSvg({ colors: { primary: editorState.couleurPrimaire, secondary: editorState.couleurSecondaire } })
        : found.toSvg()
      onInsert(schema.id)
      // Pass the SVG string via custom event so EditorToolbar can pick it up
      document.dispatchEvent(new CustomEvent('klassia:insert-svg', { detail: { svg } }))
    } else {
      onInsert(schema.id)
    }
    onClose()
  }

  const handleDownloadSvg = (schema: SchemaConfig, editorState?: PropEditorState) => {
    const found = TOUS_SCHEMAS.find(s =>
      s.id === schema.id || schema.id.includes(s.id.replace(/^(bio|chi|phy|mat)-/, ''))
    )
    if (!found) return
    const svg = editorState
      ? found.toSvg({ colors: { primary: editorState.couleurPrimaire, secondary: editorState.couleurSecondaire } })
      : found.toSvg()
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${schema.id}.svg`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  const handleDownloadPng = async (schema: SchemaConfig) => {
    const found = TOUS_SCHEMAS.find(s => s.id === schema.id || schema.id.includes(s.id.replace(/^(bio|chi|phy|mat)-/, '')))
    if (!found) return
    const svgStr = found.toSvg()
    const img = new Image()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 800; canvas.height = 600
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#0D1526'
      ctx.fillRect(0, 0, 800, 600)
      ctx.drawImage(img, 0, 0, 800, 600)
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `${schema.id}.png`
      document.body.appendChild(a); a.click(); a.remove()
    }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────

  const TABS: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'suggeres', label: 'Suggérés', icon: '⭐' },
    { id: 'biologie', label: 'Biologie', icon: '🧬' },
    { id: 'chimie',   label: 'Chimie',   icon: '⚗️' },
    { id: 'physique', label: 'Physique', icon: '⚡' },
    { id: 'maths',    label: 'Maths',    icon: '📐' },
  ]

  const CAT_COLORS: Record<string, string> = {
    biologie: '#34D399',
    chimie:   '#FBC34A',
    physique: '#60A5FA',
    maths:    '#A78BFA',
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 900,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed', zIndex: 901,
          top: '5%', left: '50%', transform: 'translateX(-50%)',
          width: '90vw', maxWidth: '880px',
          maxHeight: '88vh',
          background: '#0D1526',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: '12px',
          flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>
              🔬 Bibliothèque de schémas
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-4)' }}>
              {SCHEMAS_CATALOGUE.length} schémas SVG éditables · Biologie · Chimie · Physique · Maths
            </div>
          </div>
          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher (cellule, atome, vecteur…)"
            style={{
              width: '240px', padding: '7px 12px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px', fontSize: '12px', color: 'white',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-3)', fontSize: '18px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* ── Tabs (hidden when searching) ─────────────────────────────────── */}
        {!search.trim() && (
          <div style={{
            display: 'flex', gap: '4px', padding: '10px 20px 6px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0, overflowX: 'auto',
          }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 14px', borderRadius: '99px', border: 'none',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  background: activeTab === tab.id ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === tab.id ? '#A78BFA' : 'var(--text-3)',
                  transition: 'all 0.15s',
                }}
              >
                {tab.icon} {tab.label}
                {tab.id !== 'suggeres' && (
                  <span style={{ marginLeft: '6px', fontSize: '10px', opacity: 0.6 }}>
                    ({tabSchemas[tab.id].length})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Main content ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

          {/* Schema grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {search.trim() && (
              <div style={{ fontSize: '11px', color: 'var(--text-4)', marginBottom: '12px' }}>
                {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} pour « {search} »
              </div>
            )}

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔍</div>
                <div style={{ fontSize: '13px', color: 'var(--text-4)' }}>Aucun schéma trouvé pour « {search} »</div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '12px',
              }}>
                {filtered.map(schema => {
                  const previewSvg = getSchemaPreviewSvg(schema.id)
                  const catColor = CAT_COLORS[schema.categorie] || '#A78BFA'
                  return (
                    <div
                      key={schema.id}
                      style={{
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px', overflow: 'hidden',
                        background: 'rgba(255,255,255,0.02)',
                        transition: 'border-color 0.15s, transform 0.15s',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = catColor + '60'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      {/* SVG Preview */}
                      <div
                        style={{
                          background: '#080E1E',
                          padding: '8px', lineHeight: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          height: '110px', overflow: 'hidden',
                        }}
                        dangerouslySetInnerHTML={{ __html: previewSvg }}
                      />

                      {/* Card footer */}
                      <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {schema.nom}
                          </div>
                          <span style={{
                            fontSize: '9px', fontWeight: 700, padding: '1px 6px',
                            borderRadius: '99px',
                            background: catColor + '20',
                            color: catColor,
                            flexShrink: 0,
                          }}>
                            SVG éditable
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            onClick={() => handleInsert(schema)}
                            style={{
                              flex: 1, padding: '5px 0', borderRadius: '6px',
                              background: 'var(--violet)', color: 'white',
                              border: 'none', fontSize: '11px', fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Insérer
                          </button>
                          <button
                            onClick={() => setApercu(schema)}
                            style={{
                              padding: '5px 8px', borderRadius: '6px',
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: 'var(--text-3)', fontSize: '11px',
                              cursor: 'pointer',
                            }}
                            title="Aperçu"
                          >
                            🔍
                          </button>
                          <button
                            onClick={() => handleDownloadSvg(schema)}
                            style={{
                              padding: '5px 8px', borderRadius: '6px',
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: 'var(--text-3)', fontSize: '11px',
                              cursor: 'pointer',
                            }}
                            title="Télécharger SVG"
                          >
                            ⬇
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Edit panel (slide in when editing) ───────────────────────── */}
          {editing && (
            <div style={{
              width: '260px', flexShrink: 0,
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
              overflowY: 'auto',
              padding: '16px',
              display: 'flex', flexDirection: 'column', gap: '14px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)' }}>
                ✏️ Paramètres du schéma
              </div>

              {/* Preview */}
              <div
                style={{ background: '#080E1E', borderRadius: '8px', padding: '8px', lineHeight: 0 }}
                dangerouslySetInnerHTML={{ __html: getSvgFromState(editing.schemaId, editing) }}
              />

              {/* Color primary */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '5px' }}>
                  Couleur principale
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={editing.couleurPrimaire}
                    onChange={e => setEditing({ ...editing, couleurPrimaire: e.target.value })}
                    style={{ width: '36px', height: '28px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'none' }}
                  />
                  <input
                    value={editing.couleurPrimaire}
                    onChange={e => setEditing({ ...editing, couleurPrimaire: e.target.value })}
                    style={{ flex: 1, padding: '5px 8px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '11px', color: 'white', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              {/* Color secondary */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '5px' }}>
                  Couleur secondaire
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={editing.couleurSecondaire}
                    onChange={e => setEditing({ ...editing, couleurSecondaire: e.target.value })}
                    style={{ width: '36px', height: '28px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'none' }}
                  />
                  <input
                    value={editing.couleurSecondaire}
                    onChange={e => setEditing({ ...editing, couleurSecondaire: e.target.value })}
                    style={{ flex: 1, padding: '5px 8px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '11px', color: 'white', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              {/* Show labels toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Afficher les labels</span>
                <button
                  onClick={() => setEditing({ ...editing, showLabels: !editing.showLabels })}
                  style={{
                    width: '36px', height: '20px', borderRadius: '10px',
                    background: editing.showLabels ? 'var(--violet)' : 'rgba(255,255,255,0.15)',
                    border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: '2px', left: editing.showLabels ? '18px' : '2px',
                    width: '16px', height: '16px', borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s',
                  }}/>
                </button>
              </div>

              {/* Taille */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '5px' }}>
                  Largeur : {editing.width}px
                </label>
                <input
                  type="range" min={200} max={800} step={50}
                  value={editing.width}
                  onChange={e => setEditing({ ...editing, width: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Quick palette */}
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '6px' }}>Palettes rapides</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    { p: '#60A5FA', s: '#FBC34A', n: 'Bleu/Jaune' },
                    { p: '#34D399', s: '#A78BFA', n: 'Vert/Violet' },
                    { p: '#F87171', s: '#60A5FA', n: 'Rouge/Bleu' },
                    { p: '#FBC34A', s: '#F87171', n: 'Chaud' },
                  ].map(pal => (
                    <button
                      key={pal.n}
                      onClick={() => setEditing({ ...editing, couleurPrimaire: pal.p, couleurSecondaire: pal.s })}
                      title={pal.n}
                      style={{
                        width: '28px', height: '18px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                        background: `linear-gradient(90deg, ${pal.p} 50%, ${pal.s} 50%)`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                <button
                  onClick={() => {
                    const sc = SCHEMAS_CATALOGUE.find(s => s.id === editing.schemaId)
                    if (sc) handleInsert(sc, editing)
                  }}
                  style={{ padding: '8px', borderRadius: '8px', background: 'var(--violet)', color: 'white', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  ✦ Appliquer et insérer
                </button>
                <button
                  onClick={() => {
                    const sc = SCHEMAS_CATALOGUE.find(s => s.id === editing.schemaId)
                    if (sc) handleDownloadSvg(sc, editing)
                  }}
                  style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-2)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  ⬇ Télécharger SVG
                </button>
                <button
                  onClick={() => {
                    const sc = SCHEMAS_CATALOGUE.find(s => s.id === editing.schemaId)
                    if (sc) handleDownloadPng(sc)
                  }}
                  style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-2)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  🖼 Télécharger PNG
                </button>
                <button
                  onClick={() => setEditing(null)}
                  style={{ padding: '6px', borderRadius: '8px', background: 'none', border: 'none', color: 'var(--text-4)', fontSize: '11px', cursor: 'pointer' }}
                >
                  ← Retour à la liste
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Aperçu modal ──────────────────────────────────────────────────── */}
      {apercu && (
        <div
          onClick={() => setApercu(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 950,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '40px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0D1526',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '640px', width: '100%',
              boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>{apercu.nom}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '2px' }}>{apercu.description}</div>
              </div>
              <button onClick={() => setApercu(null)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '22px', cursor: 'pointer' }}>×</button>
            </div>

            {/* Large preview */}
            <div
              style={{ background: '#080E1E', borderRadius: '10px', padding: '16px', marginBottom: '16px', lineHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '280px' }}
              dangerouslySetInnerHTML={{ __html: getSchemaPreviewSvg(apercu.id) }}
            />

            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '16px' }}>
              {apercu.tags.map(tag => (
                <span key={tag} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-4)' }}>{tag}</span>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { handleInsert(apercu); setApercu(null) }}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--violet)', color: 'white', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Insérer dans l'éditeur
              </button>
              <button
                onClick={() => {
                  setEditing({ schemaId: apercu.id, couleurPrimaire: '#60A5FA', couleurSecondaire: '#FBC34A', showLabels: true, width: 400, height: 300 })
                  setApercu(null)
                }}
                style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-2)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                ✏️ Personnaliser
              </button>
              <button
                onClick={() => handleDownloadSvg(apercu)}
                style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-3)', fontSize: '13px', cursor: 'pointer' }}
                title="Télécharger SVG"
              >
                ⬇ SVG
              </button>
              <button
                onClick={() => handleDownloadPng(apercu)}
                style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-3)', fontSize: '13px', cursor: 'pointer' }}
                title="Télécharger PNG"
              >
                🖼 PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
