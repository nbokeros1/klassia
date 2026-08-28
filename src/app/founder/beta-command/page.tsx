'use client'

import { useEffect, useState, useCallback } from 'react'
import { FeedbackDrawer } from '@/components/founder/FeedbackDrawer'

// ─── Types ────────────────────────────────────────────────────────────────────

type TeacherStatus = 'ACTIVE' | 'AT_RISK' | 'INACTIVE' | 'PENDING' | 'INVITED' | 'BLOCKED'

interface TeacherRow {
  id: string
  display_name: string
  email_hint: string
  status: TeacherStatus
  invitation_statut: string | null
  onboarding: boolean
  class_count: number
  first_value: boolean
  last_signal: string | null
  feedback_count: number
}

interface FunnelStage {
  code: string
  label: string
  count: number
  pct: number
  is_first_value: boolean
}

interface CommandData {
  overview: {
    invited: number
    accepted: number
    accounts: number
    onboarded: number
    with_class: number
    first_value: number
  }
  funnel: FunnelStage[]
  teachers: TeacherRow[]
  feedback: {
    recent: { id: string; type: string; titre: string; page_url: string | null; statut: string; created_at: string; teacher_prenom: string | null; teacher_nom: string | null }[]
    by_type: Record<string, number>
    unread_count: number
    blocking_count: number
  }
  errors: {
    top: { message: string; count: number; affected_users: number; last_seen: string; routes: string[] }[]
    trend: Record<string, number>
    total_7d: number
  }
  usage: {
    ia_by_type: Record<string, number>
    packs_started: number
    packs_completed: number
  }
  weekly: {
    new_accounts: number
    onboarded: number
    ia_generations: number
    active_users: number
    at_risk: number
    inactive: number
    blocked: number
    feedback_unread: number
    feedback_blocking: number
    unique_errors_7d: number
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TeacherStatus, { label: string; color: string; bg: string }> = {
  ACTIVE:   { label: 'Actif',     color: '#22C55E', bg: 'rgba(34,197,94,0.12)'  },
  AT_RISK:  { label: 'À risque',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  INACTIVE: { label: 'Inactif',   color: '#64748B', bg: 'rgba(100,116,139,0.12)'},
  PENDING:  { label: 'En attente',color: '#A78BFA', bg: 'rgba(167,139,250,0.12)'},
  INVITED:  { label: 'Invité',    color: '#6C5CE7', bg: 'rgba(108,92,231,0.12)' },
  BLOCKED:  { label: 'Bloqué',    color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
}

const FEEDBACK_COLORS: Record<string, string> = {
  blocked:  '#EF4444',
  bug:      '#F59E0B',
  idea:     '#6C5CE7',
  positive: '#22C55E',
  remark:   '#64748B',
  confused: '#A78BFA',
  rating:   '#38BDF8',
}

type Tab = 'overview' | 'teachers' | 'feedback' | 'errors' | 'usage' | 'weekly'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const d  = Math.floor(ms / 86400000)
  const h  = Math.floor(ms / 3600000)
  const m  = Math.floor(ms / 60000)
  if (d >= 30) return `il y a ${Math.floor(d / 30)} mois`
  if (d >= 1)  return `il y a ${d}j`
  if (h >= 1)  return `il y a ${h}h`
  if (m >= 1)  return `il y a ${m}min`
  return "à l'instant"
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  page: {
    padding: '32px 40px', minHeight: '100vh', color: '#F1F5F9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  } as React.CSSProperties,

  heading: {
    fontSize: 22, fontWeight: 700, color: '#F1F5F9', marginBottom: 4, letterSpacing: '-0.3px',
  } as React.CSSProperties,

  sub: {
    fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 28,
  } as React.CSSProperties,

  card: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14, padding: '20px 22px',
  } as React.CSSProperties,

  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 28,
  } as React.CSSProperties,

  kpi: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12, padding: '16px 18px',
  } as React.CSSProperties,

  kpiLabel: {
    fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6,
  } as React.CSSProperties,

  kpiValue: {
    fontSize: 28, fontWeight: 700, color: '#F1F5F9', lineHeight: 1,
  } as React.CSSProperties,

  tab: (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
    background: active ? 'rgba(108,92,231,0.2)' : 'transparent',
    color: active ? '#A78BFA' : 'rgba(255,255,255,0.45)',
    transition: 'all 0.15s',
  }),

  badge: (color: string, bg: string): React.CSSProperties => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 20,
    fontSize: 11, fontWeight: 600, color, background: bg,
  }),

  table: {
    width: '100%', borderCollapse: 'collapse' as const, fontSize: 13,
  } as React.CSSProperties,

  th: {
    padding: '8px 12px', color: 'rgba(255,255,255,0.35)', fontWeight: 500,
    borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'left' as const, fontSize: 11,
    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
  } as React.CSSProperties,

  td: {
    padding: '11px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#E2E8F0',
  } as React.CSSProperties,
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BetaCommandPage() {
  const [data,    setData]    = useState<CommandData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tab,     setTab]     = useState<Tab>('overview')
  const [weekly,  setWeekly]  = useState(false)

  // Feedback drawer + filters
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null)
  const [filterStatut,       setFilterStatut]        = useState<string>('')
  const [filterType,         setFilterType]          = useState<string>('')
  const [searchQuery,        setSearchQuery]         = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/founder/beta-command')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json() as CommandData)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
      Chargement du Command Center…
    </div>
  )

  if (error) return (
    <div style={S.page}>
      <p style={{ color: '#EF4444' }}>Erreur : {error}</p>
      <button onClick={() => void load()} style={{ color: '#A78BFA', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
        Réessayer
      </button>
    </div>
  )

  if (!data) return null

  const { overview, funnel, teachers, feedback, errors, usage, weekly: w } = data

  const filteredFeedback = feedback.recent.filter(f => {
    if (filterStatut && f.statut !== filterStatut) return false
    if (filterType   && f.type   !== filterType)   return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const inTitre  = f.titre.toLowerCase().includes(q)
      const inPrenom = (f.teacher_prenom ?? '').toLowerCase().includes(q)
      const inNom    = (f.teacher_nom    ?? '').toLowerCase().includes(q)
      if (!inTitre && !inPrenom && !inNom) return false
    }
    return true
  })

  const statusCounts: Record<string, number> = {}
  for (const f of feedback.recent) statusCounts[f.statut] = (statusCounts[f.statut] ?? 0) + 1

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview',  label: 'Vue d\'ensemble' },
    { id: 'teachers',  label: 'Enseignants', badge: teachers.filter(t => ['BLOCKED', 'AT_RISK'].includes(t.status)).length || undefined },
    { id: 'feedback',  label: 'Retours', badge: feedback.unread_count || undefined },
    { id: 'errors',    label: 'Erreurs', badge: errors.top.length || undefined },
    { id: 'usage',     label: 'Usage' },
    { id: 'weekly',    label: 'Résumé semaine' },
  ]

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={S.heading}>Beta Command Center</h1>
        <p style={S.sub}>
          Cohorte beta ScorgIA — toutes les métriques en temps réel
          {feedback.blocking_count > 0 && (
            <span style={{ color: '#EF4444', marginLeft: 12, fontWeight: 600 }}>
              ⚠ {feedback.blocking_count} enseignant(s) bloqué(s)
            </span>
          )}
        </p>
      </div>

      {/* KPI row */}
      <div style={S.kpiGrid}>
        {[
          { label: 'Invités',       value: overview.invited     },
          { label: 'Acceptées',     value: overview.accepted    },
          { label: 'Comptes',       value: overview.accounts    },
          { label: 'Onboarding ✓', value: overview.onboarded   },
          { label: 'Avec classe',   value: overview.with_class  },
          { label: 'Première valeur', value: overview.first_value, accent: '#22C55E' },
        ].map(k => (
          <div key={k.label} style={S.kpi}>
            <div style={S.kpiLabel}>{k.label}</div>
            <div style={{ ...S.kpiValue, color: k.accent ?? '#F1F5F9' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 8 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={S.tab(tab === t.id)}>
            {t.label}
            {t.badge ? (
              <span style={{ marginLeft: 6, background: t.id === 'feedback' ? 'rgba(108,92,231,0.3)' : 'rgba(239,68,68,0.3)', color: t.id === 'feedback' ? '#A78BFA' : '#FCA5A5', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => void load()} style={{ ...S.tab(false), color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          ↻ Actualiser
        </button>
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>Funnel d&apos;activation</h2>
          <div style={{ ...S.card, marginBottom: 24 }}>
            {funnel.map((stage, i) => {
              const prevPct = i > 0 ? funnel[i - 1].pct : 100
              const drop    = prevPct - stage.pct
              const warn    = drop > 30 && i > 0
              return (
                <div key={stage.code} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: i < funnel.length - 1 ? 12 : 0 }}>
                  <div style={{ width: 32, color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'right', flexShrink: 0 }}>{stage.code}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: stage.is_first_value ? '#22C55E' : '#E2E8F0', fontWeight: stage.is_first_value ? 600 : 400 }}>
                        {stage.label}
                        {stage.is_first_value && <span style={{ marginLeft: 6, fontSize: 10, color: '#22C55E', background: 'rgba(34,197,94,0.12)', padding: '1px 6px', borderRadius: 10 }}>PREMIÈRE VALEUR</span>}
                      </span>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {warn && <span style={{ fontSize: 11, color: '#EF4444' }}>▼ {drop}%</span>}
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>{stage.count}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 36, textAlign: 'right' }}>{stage.pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 4, width: `${stage.pct}%`, background: stage.is_first_value ? '#22C55E' : warn ? '#EF4444' : '#6C5CE7', transition: 'width 0.4s' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>Distribution par statut</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
            {(Object.keys(STATUS_CONFIG) as TeacherStatus[]).map(s => {
              const count = teachers.filter(t => t.status === s).length
              const cfg   = STATUS_CONFIG[s]
              return (
                <div key={s} onClick={() => { setTab('teachers') }} style={{ ...S.kpi, cursor: 'pointer' }}>
                  <div style={{ ...S.kpiLabel, color: cfg.color }}>{cfg.label.toUpperCase()}</div>
                  <div style={{ ...S.kpiValue, color: cfg.color, fontSize: 22 }}>{count}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Teachers tab */}
      {tab === 'teachers' && (
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>
            Enseignants beta ({teachers.length})
          </h2>
          <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {['Nom', 'Statut', 'Invitation', 'Onboarding', 'Classes', 'Première valeur', 'Dernier signal', 'Retours'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teachers.map(t => {
                  const cfg = STATUS_CONFIG[t.status]
                  return (
                    <tr key={t.id}>
                      <td style={S.td}>
                        <div style={{ fontWeight: 500 }}>{t.display_name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{t.email_hint}</div>
                      </td>
                      <td style={S.td}>
                        <span style={S.badge(cfg.color, cfg.bg)}>{cfg.label}</span>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{t.invitation_statut ?? '—'}</span>
                      </td>
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        {t.onboarding ? '✓' : <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                      </td>
                      <td style={{ ...S.td, textAlign: 'center' }}>{t.class_count}</td>
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        {t.first_value ? <span style={{ color: '#22C55E' }}>✓</span> : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                      </td>
                      <td style={S.td}>
                        <span style={{ fontSize: 12, color: t.last_signal ? '#E2E8F0' : 'rgba(255,255,255,0.25)' }}>
                          {timeAgo(t.last_signal)}
                        </span>
                      </td>
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        {t.feedback_count > 0
                          ? <span style={{ color: '#A78BFA' }}>{t.feedback_count}</span>
                          : <span style={{ color: 'rgba(255,255,255,0.2)' }}>0</span>}
                      </td>
                    </tr>
                  )
                })}
                {teachers.length === 0 && (
                  <tr><td colSpan={8} style={{ ...S.td, textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: 32 }}>Aucun enseignant beta enregistré.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feedback tab */}
      {tab === 'feedback' && (
        <div>
          {/* Type distribution + status counters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {Object.entries(feedback.by_type).map(([type, count]) => (
              <div
                key={type}
                onClick={() => setFilterType(filterType === type ? '' : type)}
                style={{
                  ...S.kpi, flex: '0 0 auto', cursor: 'pointer',
                  border: filterType === type
                    ? `1px solid ${FEEDBACK_COLORS[type] ?? '#64748B'}`
                    : '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div style={{ ...S.kpiLabel, color: FEEDBACK_COLORS[type] ?? '#64748B' }}>{type.toUpperCase()}</div>
                <div style={{ ...S.kpiValue, color: FEEDBACK_COLORS[type] ?? '#64748B', fontSize: 20 }}>{count}</div>
              </div>
            ))}
            {Object.keys(feedback.by_type).length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Aucun retour reçu.</p>
            )}
          </div>

          {/* Status counters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[
              { key: '',              label: 'Tous',     color: 'rgba(255,255,255,0.4)' },
              { key: 'nouveau',       label: 'Nouveau',  color: '#F59E0B' },
              { key: 'en_traitement', label: 'En cours', color: '#6C5CE7' },
              { key: 'resolu',        label: 'Résolu',   color: '#22C55E' },
              { key: 'ferme',         label: 'Ignoré',   color: '#64748B' },
            ].map(opt => {
              const cnt = opt.key ? (statusCounts[opt.key] ?? 0) : feedback.recent.length
              const active = filterStatut === opt.key
              return (
                <button
                  key={opt.key}
                  onClick={() => setFilterStatut(opt.key)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    border: `1px solid ${active ? opt.color : 'rgba(255,255,255,0.1)'}`,
                    background: active ? `${opt.color}20` : 'rgba(255,255,255,0.03)',
                    color: active ? opt.color : 'rgba(255,255,255,0.4)',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label} <span style={{ fontWeight: 700 }}>{cnt}</span>
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div style={{ marginBottom: 14 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre ou enseignant…"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '8px 14px',
                color: '#F1F5F9', fontSize: 13, outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Results count */}
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
            {filteredFeedback.length} retour{filteredFeedback.length !== 1 ? 's' : ''}{' '}
            {(filterStatut || filterType || searchQuery) ? '(filtrés)' : ''}
            {(filterStatut || filterType || searchQuery) && (
              <button
                onClick={() => { setFilterStatut(''); setFilterType(''); setSearchQuery('') }}
                style={{ marginLeft: 8, background: 'none', border: 'none', color: '#A78BFA', cursor: 'pointer', fontSize: 11, padding: 0 }}
              >
                Effacer les filtres
              </button>
            )}
          </div>

          {/* Table */}
          <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {['Type', 'Titre', 'Page', 'Statut', 'Enseignant', 'Date'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredFeedback.map(f => {
                  const statutColor =
                    f.statut === 'nouveau'       ? '#F59E0B' :
                    f.statut === 'en_traitement' ? '#6C5CE7' :
                    f.statut === 'resolu'        ? '#22C55E' : '#64748B'
                  const statutLabel =
                    f.statut === 'nouveau'       ? 'Nouveau'  :
                    f.statut === 'en_traitement' ? 'En cours' :
                    f.statut === 'resolu'        ? 'Résolu'   : 'Ignoré'
                  const teacherName = [f.teacher_prenom, f.teacher_nom].filter(Boolean).join(' ') || '—'
                  return (
                    <tr
                      key={f.id}
                      onClick={() => setSelectedFeedbackId(f.id)}
                      style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.03)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = '' }}
                    >
                      <td style={S.td}>
                        <span style={S.badge(FEEDBACK_COLORS[f.type] ?? '#64748B', `${FEEDBACK_COLORS[f.type] ?? '#64748B'}18`)}>
                          {f.type}
                        </span>
                      </td>
                      <td style={{ ...S.td, maxWidth: 220 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.titre}
                        </div>
                      </td>
                      <td style={{ ...S.td, fontSize: 11, color: 'rgba(255,255,255,0.4)', maxWidth: 160 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.page_url ? f.page_url.substring(0, 40) : '—'}
                        </div>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: statutColor }}>
                          {statutLabel}
                        </span>
                      </td>
                      <td style={{ ...S.td, fontSize: 12 }}>{teacherName}</td>
                      <td style={{ ...S.td, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{timeAgo(f.created_at)}</td>
                    </tr>
                  )
                })}
                {filteredFeedback.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ ...S.td, textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: 32 }}>
                      {feedback.recent.length === 0 ? 'Aucun retour pour l\'instant.' : 'Aucun résultat pour ces filtres.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Errors tab */}
      {tab === 'errors' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={S.kpi}>
              <div style={S.kpiLabel}>Erreurs (7j)</div>
              <div style={{ ...S.kpiValue, color: errors.total_7d > 0 ? '#EF4444' : '#22C55E', fontSize: 22 }}>{errors.total_7d}</div>
            </div>
            <div style={{ ...S.card, flex: 1 }}>
              <div style={S.kpiLabel}>Tendance journalière (7j)</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 40, marginTop: 8 }}>
                {Object.entries(errors.trend).map(([day, count]) => {
                  const max = Math.max(...Object.values(errors.trend), 1)
                  return (
                    <div key={day} title={`${day}: ${count}`} style={{ flex: 1, borderRadius: 3, background: count > 0 ? '#EF4444' : 'rgba(255,255,255,0.08)', height: `${Math.max((count / max) * 100, 4)}%` }} />
                  )
                })}
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>Top erreurs (7j)</h3>
          <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {['Message', 'Occurrences', 'Utilisateurs', 'Routes', 'Dernier vu'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {errors.top.map((e, i) => (
                  <tr key={i}>
                    <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 11, maxWidth: 260 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#FCA5A5' }}>
                        {e.message}
                      </div>
                    </td>
                    <td style={{ ...S.td, textAlign: 'center', color: '#EF4444', fontWeight: 700 }}>{e.count}</td>
                    <td style={{ ...S.td, textAlign: 'center' }}>{e.affected_users}</td>
                    <td style={{ ...S.td, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                      {e.routes.slice(0, 2).join(', ')}
                    </td>
                    <td style={{ ...S.td, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{timeAgo(e.last_seen)}</td>
                  </tr>
                ))}
                {errors.top.length === 0 && (
                  <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', color: '#22C55E', padding: 32 }}>Aucune erreur cette semaine ✓</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Usage tab */}
      {tab === 'usage' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={S.card}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>Build My Year</div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div>
                  <div style={S.kpiLabel}>Démarrés</div>
                  <div style={{ ...S.kpiValue, fontSize: 22 }}>{usage.packs_started}</div>
                </div>
                <div>
                  <div style={S.kpiLabel}>Terminés</div>
                  <div style={{ ...S.kpiValue, fontSize: 22, color: '#22C55E' }}>{usage.packs_completed}</div>
                </div>
                <div>
                  <div style={S.kpiLabel}>Taux</div>
                  <div style={{ ...S.kpiValue, fontSize: 22, color: '#A78BFA' }}>
                    {usage.packs_started > 0 ? `${Math.round(usage.packs_completed / usage.packs_started * 100)}%` : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div style={S.card}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>Générations IA</div>
              {Object.entries(usage.ia_by_type).length === 0
                ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Aucune donnée.</p>
                : Object.entries(usage.ia_by_type)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => (
                      <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{type}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#A78BFA' }}>{count}</span>
                      </div>
                    ))}
            </div>
          </div>
        </div>
      )}

      {/* Feedback drawer */}
      <FeedbackDrawer
        feedbackId={selectedFeedbackId}
        onClose={() => setSelectedFeedbackId(null)}
        onMutation={() => void load()}
      />

      {/* Weekly tab */}
      {tab === 'weekly' && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
              Résumé de la semaine en cours
            </h2>
            <button onClick={() => setWeekly(v => !v)} style={{ ...S.tab(false), color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              {weekly ? 'Replier' : 'Développer'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Activation</div>
              {[
                ['Nouveaux comptes',    w.new_accounts],
                ['Onboarding terminé',  w.onboarded],
                ['Générations IA',      w.ia_generations],
              ].map(([label, val]) => (
                <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>{val}</span>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Santé de la cohorte</div>
              {[
                ['Utilisateurs actifs',  w.active_users,  '#22C55E'],
                ['À risque',             w.at_risk,       '#F59E0B'],
                ['Inactifs',             w.inactive,      '#64748B'],
                ['Bloqués',              w.blocked,       '#EF4444'],
              ].map(([label, val, color]) => (
                <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: String(color) }}>{val}</span>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Alertes</div>
              {[
                ['Retours non traités',   w.feedback_unread,    w.feedback_unread > 0 ? '#F59E0B' : '#22C55E'],
                ['Retours bloquants',     w.feedback_blocking,  w.feedback_blocking > 0 ? '#EF4444' : '#22C55E'],
                ['Erreurs uniques (7j)',  w.unique_errors_7d,   w.unique_errors_7d > 5 ? '#EF4444' : w.unique_errors_7d > 0 ? '#F59E0B' : '#22C55E'],
              ].map(([label, val, color]) => (
                <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: String(color) }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
