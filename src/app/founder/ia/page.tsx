'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GenRow {
  id:           string
  created_at:   string
  type_contenu: string | null
  statut:       string | null
}

interface LogError {
  id:         string
  tag:        string
  message:    string
  data:       Record<string, unknown> | null
  page_url:   string | null
  created_at: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MODELES = [
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', usage: 'Génération rapide, actions', cout_in: 0.25, cout_out: 1.25 },
  { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6', usage: 'Assistant, raisonnement',  cout_in: 3.00, cout_out: 15.00 },
]

const COUT_GEN = 0.03

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FounderIA() {
  const supabase = createClient()

  const [gens,    setGens]    = useState<GenRow[]>([])
  const [errors,  setErrors]  = useState<LogError[]>([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadErr(false)
      try {
        const [{ data: g }, { data: e }] = await Promise.all([
          supabase.from('generations_ia').select('id, created_at, type_contenu, statut').order('created_at', { ascending: false }).limit(2000),
          supabase.from('beta_logs').select('id, tag, message, data, page_url, created_at').ilike('tag', '%IA%').order('created_at', { ascending: false }).limit(50),
        ])
        setGens((g || []) as GenRow[])
        setErrors((e || []) as LogError[])
      } catch {
        setLoadErr(true)
      }
      setLoading(false)
    }
    load()
  }, [])

  const now   = new Date()
  const today = now.toISOString().slice(0, 10)
  const t7    = new Date(now.getTime() - 7 * 86400000).toISOString()

  const genToday = gens.filter(g => g.created_at.startsWith(today)).length
  const genWeek  = gens.filter(g => g.created_at >= t7).length
  const genTotal = gens.length

  const successRate = gens.length > 0
    ? Math.round(gens.filter(g => g.statut !== 'error').length / gens.length * 100)
    : 100

  const byType: Record<string, number> = {}
  gens.forEach(g => { const t = g.type_contenu || 'autre'; byType[t] = (byType[t] ?? 0) + 1 })
  const typesSorted = Object.entries(byType).sort(([,a],[,b]) => b - a).slice(0, 8)

  const days14: Record<string, number> = {}
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10)
    days14[d] = 0
  }
  gens.forEach(g => { const d = g.created_at.slice(0, 10); if (d in days14) days14[d]++ })
  const chartDays = Object.entries(days14)
  const maxDay = Math.max(...Object.values(days14), 1)

  const coutTotal = genTotal * COUT_GEN
  const coutMois  = gens.filter(g => g.created_at >= new Date(now.getFullYear(), now.getMonth(), 1).toISOString()).length * COUT_GEN

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
      Chargement des données IA…
    </div>
  )

  if (loadErr) return (
    <div style={{ padding: 28, color: '#EF4444', fontSize: 13 }}>
      Erreur de chargement — vérifier la connexion Supabase.
    </div>
  )

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1080 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
          Founder Operating Center
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Centre IA</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
          Modèles, utilisation, coûts estimés et erreurs
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: "Aujourd'hui",  value: genToday,       sub: 'générations',     color: '#6366F1' },
          { label: '7 derniers j', value: genWeek,        sub: 'générations',     color: '#A5B4FC' },
          { label: 'Total',        value: genTotal,       sub: 'depuis le début', color: '#818CF8' },
          { label: 'Taux succès',  value: `${successRate}%`, sub: 'sans erreur', color: '#10B981' },
        ].map(s => (
          <div key={s.label} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, marginBottom: 4, letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Graphique 14j + Coûts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Activité — 14 derniers jours</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
            {chartDays.map(([day, count]) => (
              <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{
                  width: '100%',
                  background: count > 0 ? 'rgba(99,102,241,0.75)' : 'rgba(255,255,255,0.06)',
                  borderRadius: '2px 2px 0 0',
                  height: maxDay > 0 ? `${Math.max((count / maxDay) * 68, count > 0 ? 4 : 2)}px` : '2px',
                  minHeight: 2,
                }} />
                {count > 0 && <div style={{ fontSize: 8, color: '#818CF8', fontVariantNumeric: 'tabular-nums' }}>{count}</div>}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{chartDays[0]?.[0]?.slice(5)}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{chartDays[13]?.[0]?.slice(5)}</div>
          </div>
        </div>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Coûts estimés (USD)</h2>
          {[
            { label: 'Ce mois',      value: `$${coutMois.toFixed(2)}`,  color: '#A5B4FC' },
            { label: 'Total cumulé', value: `$${coutTotal.toFixed(2)}`, color: '#6366F1' },
            { label: '$/génération', value: `$${COUT_GEN.toFixed(3)}`,  color: 'rgba(255,255,255,0.3)' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{r.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: r.color, fontVariantNumeric: 'tabular-nums' }}>{r.value}</div>
            </div>
          ))}
          <div style={{ marginTop: 14, fontSize: 10, color: 'rgba(255,255,255,0.2)', lineHeight: 1.5 }}>
            Estimation à $0,03/génération.<br />Coûts réels → Console Anthropic.
          </div>
        </div>

      </div>

      {/* Modèles */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Modèles configurés</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {MODELES.map(m => (
            <div key={m.id} style={{ background: '#1C2537', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>{m.label}</span>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginBottom: 6 }}>{m.id}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 5 }}>{m.usage}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                In&nbsp;: ${m.cout_in}/Mtok · Out&nbsp;: ${m.cout_out}/Mtok
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Répartition type + Erreurs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Répartition par type de contenu</h2>
          {typesSorted.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, padding: '8px 0' }}>Aucune donnée disponible</div>
          ) : typesSorted.map(([type, count]) => (
            <div key={type} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', textTransform: 'capitalize' }}>{type}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${genTotal > 0 ? (count / genTotal) * 100 : 0}%`, background: 'linear-gradient(90deg, #6366F1, #818CF8)', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Erreurs IA récentes</h2>
            <span style={{ fontSize: 20, fontWeight: 700, color: errors.length > 0 ? '#EF4444' : '#10B981', fontVariantNumeric: 'tabular-nums' }}>
              {errors.length}
            </span>
          </div>
          {errors.length === 0 ? (
            <div style={{ fontSize: 12, color: '#10B981', padding: '8px 0' }}>✓ Aucune erreur IA récente</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
              {errors.slice(0, 8).map(e => (
                <div key={e.id} style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: '#FCA5A5', fontFamily: 'monospace', marginBottom: 3 }}>{e.tag}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.message}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(e.created_at).toLocaleString('fr-CA')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
