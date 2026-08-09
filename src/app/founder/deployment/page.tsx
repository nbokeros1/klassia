'use client'

import { useEffect, useState } from 'react'

interface DeployRow {
  id:           string
  version:      string
  produit_slug: string
  environnement:string
  statut:       string
  deploye_par:  string | null
  notes:        string | null
  commit_sha:   string | null
  branche:      string | null
  migration_id: string | null
  created_at:   string
}

interface Product { nom: string; slug: string; logo_emoji: string; couleur: string; version: string }

const STATUT_COLORS: Record<string, { bg: string; text: string }> = {
  success:     { bg: 'rgba(52,211,153,0.12)',  text: '#34D399' },
  failed:      { bg: 'rgba(248,113,113,0.12)', text: '#F87171' },
  rollback:    { bg: 'rgba(245,158,11,0.12)',  text: '#F59E0B' },
  in_progress: { bg: 'rgba(96,165,250,0.12)',  text: '#60A5FA' },
}

export default function FounderDeployment() {
  const [deploys,  setDeploys]  = useState<DeployRow[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [d, p] = await Promise.all([
        fetch('/api/founder/deployment?limit=50').then(r => r.json()),
        fetch('/api/founder/products').then(r => r.json()),
      ])
      setDeploys(Array.isArray(d) ? d : [])
      setProducts(Array.isArray(p) ? p : [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filter === 'all' ? deploys : deploys.filter(d => d.produit_slug === filter)
  const latest   = deploys[0]
  const scorgia  = products.find(p => p.slug === 'scorgia')

  return (
    <div style={{ padding: '28px 32px' }}>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>Founder Operating Center</div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Déploiements</h1>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Historique des déploiements · Versions · CI/CD</div>
      </div>

      {/* ── Version actuelle ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Version actuelle</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#FEF3C7', fontVariantNumeric: 'tabular-nums' }}>v{scorgia?.version ?? latest?.version ?? '0.3.0'}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>Scorgia · Production</div>
        </div>
        <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Dernier déploiement</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#34D399' }}>
            {latest ? new Date(latest.created_at).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{latest?.notes || '—'}</div>
        </div>
        <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Statut CI/CD</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F59E0B' }}>À configurer</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>GitHub Actions · AWS CodePipeline</div>
        </div>
      </div>

      {/* ── Infra AWS (informatif) ── */}
      <div style={{ background: '#0B1628', border: '1px solid rgba(251,146,60,0.15)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>ARCHITECTURE AWS (CIBLE)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[
            { icon: '☁️', label: 'Region', value: 'ca-central-1', color: '#FB923C' },
            { icon: '🖥',  label: 'Compute', value: 'EC2 / ECS', color: '#FB923C' },
            { icon: '🗄',  label: 'Storage', value: 'S3 + CloudFront', color: '#FB923C' },
            { icon: '⚡',  label: 'Edge', value: 'CloudFront CDN', color: '#FB923C' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.12)', borderRadius: 9, padding: '10px 12px' }}>
              <div style={{ fontSize: 16, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
          ⚠️ Aucun déploiement automatique dans ce module. La migration AWS est prévue pour Scorgia v0.4.0.
        </div>
      </div>

      {/* ── GitHub (informatif) ── */}
      <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>ÉTAT GITHUB</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { label: 'Branche principale', value: 'main', color: '#34D399', icon: '🌿' },
            { label: 'Organisation', value: 'Bodingo-AI', color: '#60A5FA', icon: '🐙' },
            { label: 'Build status', value: 'À configurer', color: '#F59E0B', icon: '🔧' },
          ].map(r => (
            <div key={r.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 9, padding: '10px 12px' }}>
              <div style={{ fontSize: 14, marginBottom: 4 }}>{r.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: r.color }}>{r.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{r.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Historique des déploiements ── */}
      <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>HISTORIQUE DES DÉPLOIEMENTS</div>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, background: '#060D1A', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: 'inherit' }}>
            <option value="all">Tous</option>
            {products.map(p => <option key={p.slug} value={p.slug}>{p.nom}</option>)}
          </select>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Chargement…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Date','Version','Produit','Env','Statut','Déployé par','Notes','Migration'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const sc = STATUT_COLORS[d.statut] ?? STATUT_COLORS.success
                  const prod = products.find(p => p.slug === d.produit_slug)
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '9px 12px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', fontSize: 11 }}>
                        {new Date(d.created_at).toLocaleString('fr-CA', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '9px 12px' }}><code style={{ fontSize: 11 }}>v{d.version}</code></td>
                      <td style={{ padding: '9px 12px', color: 'rgba(255,255,255,0.6)' }}>
                        {prod ? `${prod.logo_emoji} ${prod.nom}` : d.produit_slug}
                      </td>
                      <td style={{ padding: '9px 12px', color: 'rgba(255,255,255,0.45)', textTransform: 'capitalize' }}>{d.environnement}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: sc.bg, border: `1px solid ${sc.text}33`, color: sc.text, fontWeight: 600 }}>{d.statut}</span>
                      </td>
                      <td style={{ padding: '9px 12px', color: 'rgba(255,255,255,0.4)' }}>{d.deploye_par || '—'}</td>
                      <td style={{ padding: '9px 12px', color: 'rgba(255,255,255,0.45)', maxWidth: 200 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.notes || '—'}</span>
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        {d.migration_id && <code style={{ fontSize: 10 }}>#{d.migration_id}</code>}
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && !loading && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '28px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Aucun déploiement.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
