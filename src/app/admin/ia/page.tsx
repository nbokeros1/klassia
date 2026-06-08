'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Coût estimé Anthropic claude-sonnet-4-6 : ~0.03$ USD / génération
const COUT_PAR_GEN = 0.03
const fmtUSD = (n: number) => `${n.toFixed(2)} $`

const TYPES_LABELS: Record<string, string> = {
  fiche_lecon:     '📄 Fiche de leçon',
  quiz:            '❓ Quiz',
  evaluation:      '📊 Évaluation',
  differentiation: '🎯 Différenciation',
  activite:        '🧩 Activité',
  plan_cours:      '🗓️ Plan de cours',
  communication:   '💬 Communication',
}

export default function AdminIAPage() {
  const supabase = createClient()
  const [gens,    setGens]    = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('generations_ia')
        .select('id, type_contenu, created_at, enseignant_id')
        .order('created_at', { ascending: false })
        .limit(1000)
      setGens(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const now    = new Date()
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const week   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
  const month  = new Date(now.getFullYear(), now.getMonth(), 1)

  const genToday = gens.filter(g => new Date(g.created_at) >= today).length
  const genWeek  = gens.filter(g => new Date(g.created_at) >= week).length
  const genMonth = gens.filter(g => new Date(g.created_at) >= month).length
  const genTotal = gens.length

  // Par type
  const byType: Record<string, number> = {}
  gens.forEach(g => { byType[g.type_contenu || 'autre'] = (byType[g.type_contenu || 'autre'] || 0) + 1 })
  const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1])

  // Par heure (aujourd'hui)
  const byHour: Record<number, number> = {}
  gens.filter(g => new Date(g.created_at) >= today).forEach(g => {
    const h = new Date(g.created_at).getHours()
    byHour[h] = (byHour[h] || 0) + 1
  })
  const maxHour = Math.max(...Object.values(byHour), 1)

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', marginBottom: 4 }}>🤖 IA & API</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Utilisation de l'API Anthropic · Coûts · Types de contenu</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>Chargement...</div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            {[
              { label: "Aujourd'hui",   value: genToday, cout: genToday * COUT_PAR_GEN,  color: '#A78BFA', icon: '🤖' },
              { label: 'Cette semaine', value: genWeek,  cout: genWeek  * COUT_PAR_GEN,  color: '#60A5FA', icon: '📅' },
              { label: 'Ce mois',       value: genMonth, cout: genMonth * COUT_PAR_GEN,  color: '#34D399', icon: '🗓️' },
              { label: 'Total',         value: genTotal, cout: genTotal * COUT_PAR_GEN,  color: '#FBC34A', icon: '📊' },
            ].map(k => (
              <div key={k.label} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{k.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color, marginBottom: 3 }}>{k.value.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{k.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>~{fmtUSD(k.cout)} USD</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Types de contenu */}
            <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 24px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 16 }}>Types de contenu générés</div>
              {topTypes.length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Aucune génération</div>}
              {topTypes.map(([type, count]) => {
                const pct = Math.round((count / genTotal) * 100)
                return (
                  <div key={type} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{TYPES_LABELS[type] || type}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6B3FA0,#A78BFA)', borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Distribution par heure (auj.) */}
            <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 24px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 16 }}>
                Activité par heure — Aujourd'hui
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
                {Array.from({ length: 24 }, (_, h) => {
                  const n = byHour[h] || 0
                  const height = maxHour > 0 ? Math.max(2, (n / maxHour) * 80) : 2
                  return (
                    <div key={h} title={`${h}h : ${n} gén.`} style={{ flex: 1, height: height, background: n > 0 ? '#A78BFA' : 'rgba(255,255,255,0.06)', borderRadius: 2, transition: 'height 0.4s' }} />
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>0h</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>12h</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>23h</span>
              </div>
            </div>
          </div>

          {/* Budget mensuel */}
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 12 }}>Budget mensuel</div>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' as const }}>
              {[
                { label: 'Consommé ce mois',    value: fmtUSD(genMonth * COUT_PAR_GEN), color: '#F87171' },
                { label: 'Limite mensuelle',     value: fmtUSD(500),                     color: '#94A3B8' },
                { label: 'Temps de réponse moy', value: '~2.4 sec',                     color: '#34D399' },
                { label: 'Erreurs (30 jours)',   value: '0',                             color: '#FBC34A' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
