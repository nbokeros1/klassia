'use client'

import { useEffect, useState } from 'react'

interface Product {
  id: string
  nom: string
  slug: string
  description: string | null
  statut: string
  version: string
  environnement: string
  responsable: string | null
  url_prod: string | null
  url_staging: string | null
  logo_emoji: string
  couleur: string
  ordre: number
  created_at: string
}

interface RoadmapItem {
  id: string
  titre: string
  statut: string
  priorite: string
  produit_slug: string
}

const STATUT_COLORS: Record<string, { bg: string; text: string }> = {
  actif:    { bg: 'rgba(52,211,153,0.12)',  text: '#34D399' },
  beta:     { bg: 'rgba(167,139,250,0.12)', text: '#A78BFA' },
  dev:      { bg: 'rgba(96,165,250,0.12)',  text: '#60A5FA' },
  pause:    { bg: 'rgba(245,158,11,0.12)',  text: '#F59E0B' },
  archive:  { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.3)' },
}

const ENV_COLORS: Record<string, string> = {
  production: '#34D399',
  staging:    '#F59E0B',
  dev:        '#60A5FA',
}

const EMPTY_FORM = { nom: '', slug: '', description: '', statut: 'dev', version: '0.1.0', environnement: 'dev', responsable: '', logo_emoji: '🚀', couleur: '#60A5FA' }

export default function FounderProduits() {
  const [products,  setProducts]  = useState<Product[]>([])
  const [roadmap,   setRoadmap]   = useState<RoadmapItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)

  const load = async () => {
    setLoading(true)
    const [pr, rm] = await Promise.all([
      fetch('/api/founder/products').then(r => r.json()),
      fetch('/api/founder/roadmap?limit=100').then(r => r.json()),
    ])
    setProducts(Array.isArray(pr) ? pr : [])
    setRoadmap(Array.isArray(rm) ? rm : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.nom || !form.slug || saving) return
    setSaving(true)
    await fetch('/api/founder/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setForm(EMPTY_FORM); setShowForm(false)
    await load()
    setSaving(false)
  }

  const getRoadmapForProduct = (slug: string) =>
    roadmap.filter(r => r.produit_slug === slug)

  const getStatutCount = (items: RoadmapItem[]) => {
    const c: Record<string, number> = {}
    items.forEach(i => { c[i.statut] = (c[i.statut] ?? 0) + 1 })
    return c
  }

  return (
    <div style={{ padding: '28px 32px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>Founder Operating Center</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Produits</h1>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Architecture multi-produits — Bodingo AI Tech Inc.</div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#04091A', border: 'none', cursor: 'pointer' }}>
          + Ajouter un produit
        </button>
      </div>

      {/* ── Formulaire ajout ── */}
      {showForm && (
        <div style={{ background: '#0B1628', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#FEF3C7', marginBottom: 16 }}>Nouveau produit</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            {[
              { label: 'Nom *', key: 'nom', placeholder: 'MboaSchool' },
              { label: 'Slug *', key: 'slug', placeholder: 'mboaschool' },
              { label: 'Version', key: 'version', placeholder: '0.1.0' },
              { label: 'Responsable', key: 'responsable', placeholder: 'Eddy Nwaha' },
              { label: 'Emoji logo', key: 'logo_emoji', placeholder: '🌍' },
              { label: 'Couleur', key: 'couleur', placeholder: '#34D399' },
            ].map(f => (
              <div key={f.key}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>{f.label}</div>
                <input value={(form as Record<string, unknown>)[f.key] as string ?? ''} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 7, fontSize: 12, background: '#060D1A', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>Description</div>
            <input value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description du produit…"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 7, fontSize: 12, background: '#060D1A', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>Statut</div>
              <select value={form.statut} onChange={e => setForm(prev => ({ ...prev, statut: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 7, fontSize: 12, background: '#060D1A', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'inherit' }}>
                {['dev','beta','actif','pause','archive'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>Environnement</div>
              <select value={form.environnement} onChange={e => setForm(prev => ({ ...prev, environnement: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 7, fontSize: 12, background: '#060D1A', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'inherit' }}>
                {['dev','staging','production'].map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCreate} disabled={!form.nom || !form.slug || saving}
              style={{ padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#04091A', border: 'none', cursor: 'pointer', opacity: !form.nom || !form.slug ? 0.5 : 1 }}>
              {saving ? 'Création…' : '+ Créer le produit'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              style={{ padding: '9px 16px', borderRadius: 8, fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Cards produits ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Chargement…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {products.map(p => {
            const pRoadmap = getRoadmapForProduct(p.slug)
            const counts   = getStatutCount(pRoadmap)
            const sc = STATUT_COLORS[p.statut] ?? STATUT_COLORS.dev
            return (
              <div key={p.id} style={{ background: '#0B1628', border: `1px solid ${p.couleur}22`, borderRadius: 16, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: p.couleur, opacity: 0.6 }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${p.couleur}1A`, border: `1px solid ${p.couleur}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    {p.logo_emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#FEF3C7', marginBottom: 3 }}>{p.nom}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>{p.description || 'Aucune description'}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: sc.bg, border: `1px solid ${sc.text}33`, color: sc.text, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.statut}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.05)', color: ENV_COLORS[p.environnement] ?? 'rgba(255,255,255,0.4)', border: `1px solid ${ENV_COLORS[p.environnement] ?? 'rgba(255,255,255,0.1)'}33` }}>{p.environnement}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>v{p.version}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 14 }}>
                  {[
                    { label: 'Backlog', val: counts.backlog ?? 0, color: 'rgba(255,255,255,0.3)' },
                    { label: 'En dev',  val: (counts.dev ?? 0) + (counts.tests ?? 0), color: '#60A5FA' },
                    { label: 'Livré',   val: counts.production ?? 0, color: '#34D399' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  <span>👤 {p.responsable || '—'}</span>
                  <span>Créé {new Date(p.created_at).toLocaleDateString('fr-CA')}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
