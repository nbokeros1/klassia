'use client'

import { useState, useMemo } from 'react'
import { SCHEMAS_IMAGES, getSchemasByMatiere, getSchemasByCategorie, type SchemaImage } from '@/lib/constants/schemas-images'

const CATEGORIES = [
  { id: 'suggeres',   label: 'Suggérés',  icon: '⭐' },
  { id: 'biologie',   label: 'Biologie',  icon: '🧬' },
  { id: 'chimie',     label: 'Chimie',    icon: '⚗️' },
  { id: 'physique',   label: 'Physique',  icon: '⚡' },
  { id: 'maths',      label: 'Maths',     icon: '📐' },
  { id: 'geographie', label: 'Géographie', icon: '🌍' },
] as const

type Cat = typeof CATEGORIES[number]['id']

interface Props {
  isOpen: boolean
  onClose: () => void
  onInsert: (schema: SchemaImage) => void
  matiereClasse?: string
}

export default function PanneauSchemas({ isOpen, onClose, onInsert, matiereClasse }: Props) {
  const [tab, setTab]     = useState<Cat>('suggeres')
  const [search, setSearch] = useState('')

  const schemas = useMemo(() => {
    let list: SchemaImage[]
    if (tab === 'suggeres') {
      list = matiereClasse ? getSchemasByMatiere(matiereClasse) : SCHEMAS_IMAGES.slice(0, 6)
    } else {
      list = getSchemasByCategorie(tab)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => s.nom.toLowerCase().includes(q) || s.matieres.some(m => m.includes(q)))
    }
    return list
  }, [tab, search, matiereClasse])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 800 }} />

      {/* Drawer droite */}
      <div style={{
        position: 'fixed', top: 0, right: 0, width: 420, height: '100vh',
        background: 'white', zIndex: 900, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.15)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F9FAFB' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1B3F6E' }}>📐 Bibliothèque de schémas</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#9CA3AF', cursor: 'pointer', padding: '2px 6px' }}>✕</button>
        </div>

        {/* Recherche */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un schéma…"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none', color: '#374151' }}
          />
        </div>

        {/* Onglets */}
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setTab(c.id)} style={{
              padding: '8px 12px', border: 'none', borderBottom: tab === c.id ? '2px solid #1B3F6E' : '2px solid transparent',
              background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: tab === c.id ? 700 : 400,
              color: tab === c.id ? '#1B3F6E' : '#6B7280', whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Grille schémas */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {schemas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9CA3AF', fontSize: 13 }}>
              Aucun schéma trouvé
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {schemas.map(schema => (
                <div key={schema.id} style={{
                  border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden',
                  background: 'white', transition: 'box-shadow 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                  {/* Miniature */}
                  <div style={{ height: 100, background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <img
                      src={schema.url_fallback}
                      alt={schema.nom}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      onError={e => {
                        const img = e.target as HTMLImageElement
                        img.style.display = 'none'
                        const parent = img.parentElement!
                        parent.innerHTML = `<div style="font-size:32px">📐</div>`
                      }}
                    />
                  </div>
                  {/* Info + bouton */}
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {schema.nom}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                      {schema.matieres.slice(0, 2).map(m => (
                        <span key={m} style={{ fontSize: 9, padding: '1px 5px', background: '#EFF6FF', color: '#1D4ED8', borderRadius: 99, fontWeight: 600 }}>{m}</span>
                      ))}
                    </div>
                    <button
                      onClick={() => { onInsert(schema); onClose() }}
                      style={{ width: '100%', padding: '6px', background: '#1B3F6E', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#2D5FA0')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#1B3F6E')}>
                      Insérer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
