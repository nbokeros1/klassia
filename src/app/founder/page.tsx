'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Constantes ───────────────────────────────────────────────────────────────

const COUT_GEN = 0.03  // USD / génération (estimation mixte Haiku + Sonnet)
const fmt      = (n: number) => n.toLocaleString('fr-CA')
const fmtUSD   = (n: number) => n < 0.01 ? '$0.00' : `$${n.toFixed(2)}`

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  users:         number
  activeToday:   number
  newThisWeek:   number
  classes:       number
  lecons:        number
  teachingPacks: number
  progAnnuels:   number
  quiz:          number
  genToday:      number
  genTotal:      number
  errorsToday:   number
  forfaits:      Record<string, number>
  feed:          FeedItem[]
  dbOk:          boolean
}

interface FeedItem {
  ts:     string
  type:   'user' | 'gen' | 'error' | 'pack'
  label:  string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dot(color: string) {
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: color, flexShrink: 0,
    }} />
  )
}

type HealthStatus = 'ok' | 'warn' | 'error' | 'unknown'

function HealthRow({ label, status, note }: { label: string; status: HealthStatus; note?: string }) {
  const colors: Record<HealthStatus, string> = {
    ok:      '#10B981',
    warn:    '#F59E0B',
    error:   '#EF4444',
    unknown: 'rgba(255,255,255,0.2)',
  }
  const labels: Record<HealthStatus, string> = {
    ok:      'Opérationnel',
    warn:    'Dégradé',
    error:   'Erreur',
    unknown: 'Non vérifié',
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        {dot(colors[status])}
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{label}</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 11, color: colors[status], fontWeight: 600 }}>{labels[status]}</span>
        {note && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 1 }}>{note}</div>}
      </div>
    </div>
  )
}

function KPICard({ label, value, sub, accent = false }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      background: '#111827',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent ? '#A5B4FC' : '#F1F5F9', letterSpacing: '-0.3px', marginBottom: 2 }}>
        {typeof value === 'number' ? fmt(value) : value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

const FEED_COLORS: Record<string, string> = {
  user:  '#10B981',
  gen:   '#A78BFA',
  error: '#EF4444',
  pack:  '#F59E0B',
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function FounderOverview() {
  const supabase  = createClient()
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncAt,  setSyncAt]  = useState<Date | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const now   = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const week7 = new Date(today); week7.setDate(week7.getDate() - 7)

      const [
        { data: users,       error: e1 },
        { count: cClasses             },
        { count: cLecons              },
        { count: cPacks               },
        { count: cPlans               },
        { count: cQuiz                },
        { data: gens,        error: e2 },
        { count: errCount             },
        { data: recentGens            },
      ] = await Promise.all([
        supabase.from('utilisateurs').select('id, forfait, created_at, derniere_connexion'),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('lecons').select('*', { count: 'exact', head: true }),
        supabase.from('teaching_packs').select('*', { count: 'exact', head: true }),
        supabase.from('programme_annuel').select('*', { count: 'exact', head: true }),
        supabase.from('questions_quiz').select('*', { count: 'exact', head: true }),
        supabase.from('generations_ia').select('id, created_at, type_contenu').gte('created_at', today.toISOString()),
        supabase.from('beta_logs').select('*', { count: 'exact', head: true }).eq('level', 'error').gte('created_at', today.toISOString()),
        supabase.from('generations_ia').select('id, created_at, type_contenu').order('created_at', { ascending: false }).limit(12),
      ])

      const dbOk   = !e1 && !e2
      const uList  = users || []
      const gList  = gens  || []

      const activeToday  = uList.filter(u => u.derniere_connexion && new Date(u.derniere_connexion) >= today).length
      const newThisWeek  = uList.filter(u => new Date(u.created_at) >= week7).length

      const forfaits: Record<string, number> = { gratuit: 0, pro: 0, pro_plus: 0, institution: 0 }
      uList.forEach(u => { forfaits[u.forfait || 'gratuit'] = (forfaits[u.forfait || 'gratuit'] || 0) + 1 })

      const feed: FeedItem[] = (recentGens || []).map(g => ({
        ts:    new Date(g.created_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }),
        type:  'gen' as const,
        label: `Génération ${g.type_contenu || 'contenu'}`,
      }))

      setStats({
        users: uList.length, activeToday, newThisWeek,
        classes:       cClasses       ?? 0,
        lecons:        cLecons        ?? 0,
        teachingPacks: cPacks         ?? 0,
        progAnnuels:   cPlans         ?? 0,
        quiz:          cQuiz          ?? 0,
        genToday:      gList.length,
        genTotal:      0,
        errorsToday:   errCount       ?? 0,
        forfaits,
        feed,
        dbOk,
      })
    } catch {
      setStats(null)
    }
    setLoading(false)
    setSyncAt(new Date())
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const ch = supabase.channel('foc-overview')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'utilisateurs' }, () => {
        setStats(prev => prev ? { ...prev, users: prev.users + 1, newThisWeek: prev.newThisWeek + 1 } : prev)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'generations_ia' }, (p) => {
        const h = new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
        setStats(prev => prev ? {
          ...prev,
          genToday: prev.genToday + 1,
          feed: [{ ts: h, type: 'gen' as const, label: `Génération ${(p.new as Record<string, unknown>)?.type_contenu || 'contenu'}` }, ...prev.feed].slice(0, 12),
        } : prev)
      })
      .subscribe()
    channelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
        Chargement de l&apos;overview…
      </div>
    )
  }

  if (!stats) {
    return (
      <div style={{ padding: 28, color: '#EF4444', fontSize: 13 }}>
        Erreur de chargement — vérifier la connexion Supabase.
      </div>
    )
  }

  const s = stats
  const mrr = Object.entries(s.forfaits).reduce((acc, [key, count]) => {
    const prix: Record<string, number> = { gratuit: 0, pro: 14.99, pro_plus: 24.99, institution: 9.99 }
    return acc + (prix[key] || 0) * count
  }, 0)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1080 }}>

      {/* ── En-tête ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
            Founder Operating Center
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Overview</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            État complet de la plateforme en temps réel
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {syncAt && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
              Sync {syncAt.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button onClick={load} style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
            color: '#A5B4FC', cursor: 'pointer',
          }}>
            ↻ Actualiser
          </button>
        </div>
      </div>

      {/* ── Alerte erreurs ── */}
      {s.errorsToday > 0 && (
        <div style={{
          marginBottom: 20, padding: '11px 16px', borderRadius: 10,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
        }}>
          {dot('#EF4444')}
          <span style={{ color: '#FCA5A5', fontWeight: 600 }}>
            {s.errorsToday} erreur{s.errorsToday > 1 ? 's' : ''} aujourd&apos;hui
          </span>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>— voir Infrastructure pour le détail</span>
        </div>
      )}

      {/* ── Layout 3 colonnes ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Santé plateforme */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Santé plateforme</h2>
          <HealthRow label="Base de données"  status={s.dbOk ? 'ok' : 'error'} />
          <HealthRow label="Authentification" status="ok"      note="Supabase Auth" />
          <HealthRow label="IA (Anthropic)"   status={s.errorsToday > 20 ? 'warn' : 'ok'} note="Claude Haiku + Sonnet" />
          <HealthRow label="Stockage"         status="ok"      note="Supabase Storage" />
          <HealthRow label="Email"            status="unknown" note="Non testé" />
          <HealthRow label="Vercel"           status="unknown" note="Voir Vercel Dashboard" />
        </div>

        {/* Activité */}
        <div style={{ gridColumn: 'span 2', background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'none' }} />
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Activité récente</h2>
          </div>
          {s.feed.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', padding: '12px 0' }}>
              Aucune activité disponible
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {s.feed.map((item, i) => (
                <div key={`${item.ts}-${item.type}-${i}`} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 0',
                  borderBottom: i < s.feed.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  opacity: Math.max(0.3, 1 - i * 0.07),
                }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', minWidth: 40, fontVariantNumeric: 'tabular-nums' }}>
                    {item.ts}
                  </span>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: FEED_COLORS[item.type] ?? '#6366F1', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── KPIs — Enseignants & Plateforme ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 10 }}>
          Enseignants
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KPICard label="Enseignants total"  value={s.users}       sub={`+${s.newThisWeek} cette semaine`} />
          <KPICard label="Actifs aujourd'hui" value={s.activeToday} sub="Connexions du jour" />
          <KPICard label="Forfait Gratuit"    value={s.forfaits.gratuit || 0} />
          <KPICard label="Forfait Pro / Pro+" value={(s.forfaits.pro || 0) + (s.forfaits.pro_plus || 0)} sub="Pro + Pro+ combinés" />
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 10 }}>
          Contenu produit
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KPICard label="Classes"         value={s.classes}       />
          <KPICard label="Teaching Packs"  value={s.teachingPacks} />
          <KPICard label="Plans annuels"   value={s.progAnnuels}   />
          <KPICard label="Plans de leçon"  value={s.lecons}        />
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 10 }}>
          IA & Finances
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <KPICard label="Générations IA aujourd'hui" value={s.genToday}             accent />
          <KPICard label="Coût IA estimé aujourd'hui" value={fmtUSD(s.genToday * COUT_GEN)} accent sub="Estimation Haiku+Sonnet" />
          <KPICard label="MRR calculé"  value={mrr === 0 ? '0 $' : `${mrr.toFixed(2)} $`} sub="Basé sur les forfaits actifs" />
          <KPICard label="Questions quiz" value={s.quiz} />
        </div>
      </div>

    </div>
  )
}
