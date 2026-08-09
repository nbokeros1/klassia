'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BetaFeedbackItem {
  id:           string
  type:         string
  titre:        string | null
  description:  string
  page_url:     string | null
  feature_note: number | null
  statut:       string
  created_at:   string
}

// ─── Prix forfaits (CAD/mois) ─────────────────────────────────────────────────

const PRIX: Record<string, number> = {
  gratuit:     0,
  pro:         19,
  pro_plus:    39,
  institution: 149,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCAD = (n: number) => `${n.toLocaleString('fr-CA')} $`
const fmtNum = (n: number) => n.toLocaleString('fr-CA')

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const supabase = createClient()
  const router   = useRouter()

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const [kpis, setKpis] = useState({
    mrr:            0,
    enseignants:    0,
    nouveaux7j:     0,
    genAujourdhui:  0,
    genTotal:       0,
    moyGenParUser:  0,
  })

  // ── Répartition forfaits ────────────────────────────────────────────────────
  const [forfaits, setForfaits] = useState<Record<string, number>>({
    gratuit: 0, pro: 0, pro_plus: 0, institution: 0,
  })

  // ── Live feed ───────────────────────────────────────────────────────────────
  const [feed, setFeed] = useState<{ ts: string; texte: string }[]>([])

  // ── Enseignants récents ─────────────────────────────────────────────────────
  const [enseignants, setEnseignants] = useState<any[]>([])
  const [loadEdit,    setLoadEdit]    = useState<string | null>(null)
  const channelRef = useRef<any>(null)

  // ── Onglet actif ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'overview' | 'beta'>('overview')

  // ── Bêta : retours ──────────────────────────────────────────────────────────
  const [betaFeedback,    setBetaFeedback]    = useState<BetaFeedbackItem[]>([])
  const [betaSessionsCount, setBetaSessionsCount] = useState(0)
  const [loadingBeta,     setLoadingBeta]     = useState(false)

  // ── Chargement données ───────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      // Enseignants
      const { data: users } = await supabase
        .from('utilisateurs')
        .select('id, prenom, nom, province, forfait, created_at, derniere_connexion')
        .order('created_at', { ascending: false })
      const list = users || []
      setEnseignants(list.slice(0, 20))

      // KPIs
      const total = list.length
      const sept  = new Date(); sept.setDate(sept.getDate() - 7)
      const nouveaux = list.filter(u => new Date(u.created_at) >= sept).length
      const mrr = list.reduce((acc: number, u: any) => acc + (PRIX[u.forfait || 'gratuit'] || 0), 0)

      // Répartition forfaits
      const rep: Record<string, number> = { gratuit: 0, pro: 0, pro_plus: 0, institution: 0 }
      list.forEach((u: any) => { rep[u.forfait || 'gratuit'] = (rep[u.forfait || 'gratuit'] || 0) + 1 })
      setForfaits(rep)

      // Générations
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const { data: gens } = await supabase.from('generations_ia').select('id, created_at, enseignant_id')
      const genList   = gens || []
      const genToday  = genList.filter(g => new Date(g.created_at) >= today).length
      const genTotal  = genList.length
      const uniqueUs  = new Set(genList.map(g => g.enseignant_id)).size
      const moy       = uniqueUs > 0 ? Math.round(genTotal / uniqueUs) : 0

      setKpis({ mrr, enseignants: total, nouveaux7j: nouveaux, genAujourdhui: genToday, genTotal, moyGenParUser: moy })

      // Seed live feed
      const recent = genList.slice(-10).reverse().map(g => {
        const u = list.find((u: any) => u.id === g.enseignant_id)
        const h = new Date(g.created_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
        return { ts: h, texte: `${u?.prenom || 'Enseignant'} — Génération IA` }
      })
      setFeed(recent)
    }
    load()
  }, [])

  // ── Realtime live feed ──────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase.channel('admin-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'utilisateurs' }, payload => {
        const u = payload.new as any
        const h = new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
        setFeed(prev => [{ ts: h, texte: `${u.prenom || 'Nouvel enseignant'} — Inscription (${u.forfait || 'Gratuit'})` }, ...prev].slice(0, 10))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'generations_ia' }, payload => {
        const h = new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
        setFeed(prev => [{ ts: h, texte: `Génération IA — ${(payload.new as any).type_contenu || 'contenu'}` }, ...prev].slice(0, 10))
      })
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleForfaitChange = async (userId: string, forfait: string) => {
    setLoadEdit(userId)
    await supabase.from('utilisateurs').update({ forfait }).eq('id', userId)
    setEnseignants(prev => prev.map(u => u.id === userId ? { ...u, forfait } : u))
    setLoadEdit(null)
  }

  const handleSuspend = async (userId: string) => {
    if (!confirm('Suspendre cet enseignant ?')) return
    await supabase.from('utilisateurs').update({ est_actif: false } as any).eq('id', userId)
    setEnseignants(prev => prev.filter(u => u.id !== userId))
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Supprimer définitivement ? Cette action est irréversible.')) return
    await supabase.from('utilisateurs').delete().eq('id', userId)
    setEnseignants(prev => prev.filter(u => u.id !== userId))
  }

  // ── Charger données bêta ─────────────────────────────────────────────────────
  const loadBeta = async () => {
    if (loadingBeta) return
    setLoadingBeta(true)
    try {
      const [fbRes, sessRes] = await Promise.all([
        fetch('/api/beta/feedback'),
        supabase.from('lecons').select('id', { count: 'exact', head: true }).eq('statut', 'enseignee'),
      ])
      if (fbRes.ok) {
        const { feedback } = await fbRes.json()
        setBetaFeedback(feedback || [])
      }
      setBetaSessionsCount(sessRes.count ?? 0)
    } finally {
      setLoadingBeta(false)
    }
  }

  const handleUpdateFeedbackStatut = async (id: string, statut: string) => {
    await fetch('/api/beta/feedback', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, statut }),
    })
    setBetaFeedback(prev => prev.map(f => f.id === id ? { ...f, statut } : f))
  }

  const totalEns = Object.values(forfaits).reduce((a, b) => a + b, 0) || 1

  const avgNote = (() => {
    const rated = betaFeedback.filter(f => f.feature_note != null)
    if (!rated.length) return null
    return (rated.reduce((s, f) => s + (f.feature_note ?? 0), 0) / rated.length).toFixed(1)
  })()

  const TYPE_LABELS: Record<string, string> = {
    bug: '🐛 Bug', idea: '💡 Idée', remark: '📝 Commentaire', rating: '⭐ Évaluation',
  }
  const STATUT_COLORS: Record<string, string> = {
    nouveau: '#60A5FA', en_traitement: '#FBC34A', resolu: '#34D399', ferme: '#6B7280',
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1200 }}>

      {/* ── Titre ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', marginBottom: 4 }}>📊 Administration</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          Scorgia — Tableau de bord administrateur
        </div>
      </div>

      {/* ── Onglets ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28 }}>
        {[
          { id: 'overview', label: '📊 Vue d\'ensemble' },
          { id: 'beta',     label: '🧪 Bêta & retours'  },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as 'overview' | 'beta')
              if (tab.id === 'beta' && betaFeedback.length === 0) loadBeta()
            }}
            style={{
              padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background:   activeTab === tab.id ? 'rgba(108,92,231,0.25)' : 'rgba(255,255,255,0.05)',
              border:       activeTab === tab.id ? '1px solid rgba(108,92,231,0.4)' : '1px solid rgba(255,255,255,0.08)',
              color:        activeTab === tab.id ? '#A78BFA' : 'rgba(255,255,255,0.5)',
              cursor:       'pointer',
              transition:   'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (<>

      {/* ── Section 1 : KPIs ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          {
            icon: '💰', label: 'MRR', value: fmtCAD(kpis.mrr),
            sub: 'Revenus mensuels récurrents', color: '#34D399',
          },
          {
            icon: '👩‍🏫', label: 'Enseignants actifs', value: fmtNum(kpis.enseignants),
            sub: `+${kpis.nouveaux7j} cette semaine`, color: '#60A5FA',
          },
          {
            icon: '🤖', label: "Générations IA aujourd'hui", value: fmtNum(kpis.genAujourdhui),
            sub: `Coût estimé ~${(kpis.genAujourdhui * 0.04).toFixed(2)} $ USD`, color: '#A78BFA',
          },
          {
            icon: '📚', label: 'Leçons générées total', value: fmtNum(kpis.genTotal),
            sub: `Moy. ${kpis.moyGenParUser} par enseignant`, color: '#FBC34A',
          },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 22px' }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>{kpi.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color, marginBottom: 4, letterSpacing: '-0.5px' }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>{kpi.label}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>

        {/* ── Section 2 : Répartition forfaits ─────────────────────────────── */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 18 }}>Répartition des forfaits</div>
          {[
            { id: 'gratuit',     label: 'Gratuit',     color: '#94A3B8' },
            { id: 'pro',         label: 'Pro',          color: '#60A5FA' },
            { id: 'pro_plus',    label: 'Pro+',         color: '#A78BFA' },
            { id: 'institution', label: 'Institution',  color: '#34D399' },
          ].map(f => {
            const n   = forfaits[f.id] || 0
            const pct = Math.round((n / totalEns) * 100)
            return (
              <div key={f.id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: f.color, fontWeight: 600 }}>{f.label}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{n} enseignants ({pct}%)</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: f.color, borderRadius: 4, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Section 3 : Live feed ─────────────────────────────────────────── */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', animation: 'pulse 2s infinite' }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>Activité en direct</div>
          </div>
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {feed.length === 0 && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px 0' }}>
                En attente d&apos;activité...
              </div>
            )}
            {feed.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', opacity: 1 - i * 0.08 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {item.ts}
                </span>
                <div style={{ height: 3, width: 3, borderRadius: '50%', background: '#A78BFA', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                  {item.texte}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 4 : Tableau enseignants ──────────────────────────────────── */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>Enseignants récents</div>
          <button onClick={() => router.push('/admin/enseignants')}
            style={{ fontSize: 12, color: '#60A5FA', background: 'none', border: 'none', cursor: 'pointer' }}>
            Voir tous →
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                {['Nom', 'Province', 'Forfait', 'Connexion', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enseignants.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '11px 16px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                    {u.prenom} {u.nom}
                  </td>
                  <td style={{ padding: '11px 16px', color: 'rgba(255,255,255,0.5)' }}>{u.province || '—'}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <select
                      value={u.forfait || 'gratuit'}
                      onChange={e => handleForfaitChange(u.id, e.target.value)}
                      disabled={loadEdit === u.id}
                      style={{
                        padding: '3px 8px', borderRadius: 6, fontSize: 11,
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      {['gratuit', 'pro', 'pro_plus', 'institution'].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '11px 16px', color: 'rgba(255,255,255,0.35)' }}>
                    {u.derniere_connexion
                      ? new Date(u.derniere_connexion).toLocaleDateString('fr-CA')
                      : new Date(u.created_at).toLocaleDateString('fr-CA')}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => router.push(`/dashboard`)} title="Voir"
                        style={{ padding: '4px 8px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 6, color: '#60A5FA', fontSize: 12, cursor: 'pointer' }}>
                        👁
                      </button>
                      <button onClick={() => handleSuspend(u.id)} title="Suspendre"
                        style={{ padding: '4px 8px', background: 'rgba(251,195,74,0.08)', border: '1px solid rgba(251,195,74,0.15)', borderRadius: 6, color: '#FBC34A', fontSize: 12, cursor: 'pointer' }}>
                        🚫
                      </button>
                      <button onClick={() => handleDelete(u.id)} title="Supprimer"
                        style={{ padding: '4px 8px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 6, color: '#F87171', fontSize: 12, cursor: 'pointer' }}>
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      </>)}

      {/* ── Onglet bêta ─────────────────────────────────────────────────────── */}
      {activeTab === 'beta' && (
        <div>
          {/* KPIs bêta */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { icon: '🧪', label: 'Retours reçus',     value: betaFeedback.length, color: '#A78BFA' },
              { icon: '🎓', label: 'Sessions enseignées', value: betaSessionsCount, color: '#60A5FA' },
              { icon: '⭐', label: 'Note moyenne',        value: avgNote ? `${avgNote} / 5` : '—', color: '#FBC34A' },
            ].map(kpi => (
              <div key={kpi.label} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{kpi.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: kpi.color, marginBottom: 4 }}>{kpi.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Tableau des retours */}
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>Retours bêta</div>
              <button onClick={loadBeta} disabled={loadingBeta}
                style={{ fontSize: 11, color: '#60A5FA', background: 'none', border: 'none', cursor: 'pointer', opacity: loadingBeta ? 0.5 : 1 }}>
                {loadingBeta ? 'Chargement…' : '↻ Actualiser'}
              </button>
            </div>

            {betaFeedback.length === 0 && !loadingBeta && (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                Aucun retour reçu pour l&apos;instant.
              </div>
            )}

            {betaFeedback.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                      {['Type', 'Description', 'Page', 'Note', 'Statut', 'Date', ''].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {betaFeedback.map(f => (
                      <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA' }}>
                            {TYPE_LABELS[f.type] ?? f.type}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.75)', maxWidth: 260 }}>
                          {f.titre && <div style={{ fontWeight: 600, marginBottom: 2, color: '#F1F5F9' }}>{f.titre}</div>}
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.description}</div>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.35)', maxWidth: 140 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {f.page_url ?? '—'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#FBC34A', textAlign: 'center' }}>
                          {f.feature_note ? `${f.feature_note}★` : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <select
                            value={f.statut}
                            onChange={e => handleUpdateFeedbackStatut(f.id, e.target.value)}
                            style={{
                              padding: '3px 8px', borderRadius: 6, fontSize: 11,
                              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                              color: STATUT_COLORS[f.statut] ?? 'rgba(255,255,255,0.7)',
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                            {['nouveau', 'en_traitement', 'resolu', 'ferme'].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                          {new Date(f.created_at).toLocaleDateString('fr-CA')}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <button
                            onClick={() => {
                              alert(`${TYPE_LABELS[f.type] ?? f.type}\n\n${f.titre ? f.titre + '\n' : ''}${f.description}\n\nPage : ${f.page_url ?? '—'}`)
                            }}
                            style={{ fontSize: 11, color: '#60A5FA', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            Voir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
