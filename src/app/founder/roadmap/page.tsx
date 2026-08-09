'use client'

import { useEffect, useState } from 'react'

interface RoadmapItem {
  id:           string
  titre:        string
  description:  string | null
  statut:       string
  priorite:     string
  produit_slug: string
  version_cible:string | null
  sprint:       string | null
  tags:         string[] | null
  ordre:        number
  created_at:   string
}

interface Product { id: string; nom: string; slug: string; logo_emoji: string; couleur: string }

const STATUTS = [
  { id: 'backlog',    label: 'Backlog',     color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.04)' },
  { id: 'dev',        label: 'En dev',      color: '#60A5FA',              bg: 'rgba(96,165,250,0.08)'  },
  { id: 'tests',      label: 'Tests',       color: '#F59E0B',              bg: 'rgba(245,158,11,0.08)'  },
  { id: 'beta',       label: 'Bêta',        color: '#A78BFA',              bg: 'rgba(167,139,250,0.08)' },
  { id: 'production', label: 'Production',  color: '#34D399',              bg: 'rgba(52,211,153,0.08)'  },
]

const PRIORITE_COLORS: Record<string, string> = {
  critical: '#F87171', high: '#F59E0B', medium: '#60A5FA', low: 'rgba(255,255,255,0.3)',
}

const EMPTY_FORM = { titre: '', description: '', statut: 'backlog', priorite: 'medium', produit_slug: 'scorgia', version_cible: '', sprint: '' }

export default function FounderRoadmap() {
  const [items,    setItems]    = useState<RoadmapItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [dragItem, setDragItem] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const [rm, pr] = await Promise.all([
      fetch('/api/founder/roadmap?limit=200').then(r => r.json()),
      fetch('/api/founder/products').then(r => r.json()),
    ])
    setItems(Array.isArray(rm) ? rm : [])
    setProducts(Array.isArray(pr) ? pr : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.titre || saving) return
    setSaving(true)
    await fetch('/api/founder/roadmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setForm(EMPTY_FORM); setShowForm(false)
    await load()
    setSaving(false)
  }

  const handleMove = async (id: string, newStatut: string) => {
    await fetch('/api/founder/roadmap', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, statut: newStatut }),
    })
    setItems(prev => prev.map(i => i.id === id ? { ...i, statut: newStatut } : i))
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/founder/roadmap?id=${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.produit_slug === filter)

  const getByStatut = (statut: string) => filtered.filter(i => i.statut === statut).sort((a,b) => a.ordre - b.ordre)

  const getProduct = (slug: string) => products.find(p => p.slug === slug)

  return (
    <div style={{ padding: '28px 28px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>Founder Operating Center</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Roadmap</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, fontSize: 12, background: '#0B1628', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'inherit' }}>
            <option value="all">Tous les produits</option>
            {products.map(p => <option key={p.slug} value={p.slug}>{p.logo_emoji} {p.nom}</option>)}
          </select>
          <button onClick={() => setShowForm(!showForm)}
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#04091A', border: 'none', cursor: 'pointer' }}>
            + Ajouter
          </button>
        </div>
      </div>

      {/* ── Formulaire ── */}
      {showForm && (
        <div style={{ background: '#0B1628', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div style={{ gridColumn: '1 / 3' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Titre *</div>
              <input value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))}
                placeholder="Titre de la feature…"
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 12, background: '#060D1A', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Statut</div>
              <select value={form.statut} onChange={e => setForm(p => ({ ...p, statut: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 12, background: '#060D1A', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'inherit' }}>
                {STATUTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Priorité</div>
              <select value={form.priorite} onChange={e => setForm(p => ({ ...p, priorite: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 12, background: '#060D1A', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'inherit' }}>
                {['critical','high','medium','low'].map(pr => <option key={pr} value={pr}>{pr}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Produit</div>
              <select value={form.produit_slug} onChange={e => setForm(p => ({ ...p, produit_slug: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 12, background: '#060D1A', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'inherit' }}>
                {products.map(p => <option key={p.slug} value={p.slug}>{p.nom}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Version cible</div>
              <input value={form.version_cible} onChange={e => setForm(p => ({ ...p, version_cible: e.target.value }))}
                placeholder="0.4.0"
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 12, background: '#060D1A', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Sprint</div>
              <input value={form.sprint} onChange={e => setForm(p => ({ ...p, sprint: e.target.value }))}
                placeholder="Sprint 2"
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 12, background: '#060D1A', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCreate} disabled={!form.titre || saving}
              style={{ padding: '7px 18px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#04091A', border: 'none', cursor: 'pointer', opacity: !form.titre ? 0.5 : 1 }}>
              {saving ? 'Ajout…' : '+ Ajouter'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              style={{ padding: '7px 12px', borderRadius: 7, fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Kanban ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Chargement…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, alignItems: 'start' }}>
          {STATUTS.map(col => {
            const colItems = getByStatut(col.id)
            return (
              <div key={col.id}
                onDragOver={e => e.preventDefault()}
                onDrop={() => dragItem && handleMove(dragItem, col.id)}
                style={{ background: col.bg, border: `1px solid ${col.color}22`, borderRadius: 12, padding: '10px 10px', minHeight: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${col.color}22` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{col.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: col.color, background: `${col.color}15`, padding: '1px 7px', borderRadius: 5 }}>{colItems.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {colItems.map(item => {
                    const prod = getProduct(item.produit_slug)
                    return (
                      <div key={item.id}
                        draggable
                        onDragStart={() => setDragItem(item.id)}
                        onDragEnd={() => setDragItem(null)}
                        style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, padding: '10px 11px', cursor: 'grab' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#E2E8F0', marginBottom: 5, lineHeight: 1.4 }}>{item.titre}</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: `${PRIORITE_COLORS[item.priorite] ?? 'rgba(255,255,255,0.1)'}18`, color: PRIORITE_COLORS[item.priorite] ?? 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.priorite}</span>
                          {prod && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: `${prod.couleur}12`, color: prod.couleur }}>{prod.logo_emoji} {prod.nom}</span>}
                          {item.sprint && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}>{item.sprint}</span>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {item.version_cible && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>v{item.version_cible}</span>}
                          <button onClick={() => handleDelete(item.id)}
                            style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: '#F87171', cursor: 'pointer', marginLeft: 'auto' }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
        💡 Glissez-déposez les cartes pour changer leur statut.
      </div>
    </div>
  )
}
