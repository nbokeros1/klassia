'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AuditRow {
  id:          string
  acteur_id:   string | null
  acteur_email:string | null
  action:      string
  categorie:   string
  cible_id:    string | null
  cible_type:  string | null
  details:     Record<string, unknown> | null
  ip_address:  string | null
  created_at:  string
}

interface ImpersonationRow {
  id:           string
  admin_id:     string | null
  enseignant_id:string | null
  raison:       string | null
  debut_session:string
  fin_session:  string | null
}

const CATEGORIE_COLORS: Record<string, string> = {
  auth:          '#60A5FA',
  user:          '#A78BFA',
  role:          '#F59E0B',
  ia:            '#34D399',
  beta:          '#818CF8',
  system:        'rgba(255,255,255,0.4)',
  impersonation: '#F87171',
  data:          '#FB923C',
  admin:         '#E879F9',
  feedback:      '#6EE7B7',
}

const ALL_CATS = ['auth','user','role','ia','beta','system','impersonation','data','admin','feedback']

export default function FounderAudit() {
  const supabase = createClient()

  const [events,         setEvents]         = useState<AuditRow[]>([])
  const [impersonations, setImpersonations] = useState<ImpersonationRow[]>([])
  const [loading,        setLoading]        = useState(true)
  const [activeTab,      setActiveTab]      = useState<'audit' | 'impersonation'>('audit')
  const [filterCat,      setFilterCat]      = useState('all')
  const [filterAction,   setFilterAction]   = useState('')
  const [page,           setPage]           = useState(0)

  const PAGE_SIZE = 50

  const load = async () => {
    setLoading(true)
    const [{ data: ev }, { data: imp }] = await Promise.all([
      supabase.from('audit_trail').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('sessions_impersonation').select('*').order('debut_session', { ascending: false }).limit(100),
    ])
    setEvents((ev || []) as AuditRow[])
    setImpersonations((imp || []) as ImpersonationRow[])
    setPage(0)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = events.filter(e => {
    const matchCat    = filterCat    === 'all' || e.categorie === filterCat
    const matchAction = !filterAction || e.action.toLowerCase().includes(filterAction.toLowerCase())
    return matchCat && matchAction
  })

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>Founder Operating Center</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Piste d&apos;audit</h1>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            {filtered.length} événements · {impersonations.length} impersonations
          </div>
        </div>
        <button onClick={load} disabled={loading}
          style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#A5B4FC', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
          ↻ Actualiser
        </button>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[
          { id: 'audit',        label: `🔍 Piste d'audit (${events.length})` },
          { id: 'impersonation',label: `👤 Impersonations (${impersonations.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as 'audit' | 'impersonation')}
            style={{ padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              background:   activeTab === t.id ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
              border:       activeTab === t.id ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.08)',
              color:        activeTab === t.id ? '#F59E0B' : 'rgba(255,255,255,0.45)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Audit tab */}
      {activeTab === 'audit' && (
        <>
          {/* Filtres */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <input value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(0) }}
              placeholder="Filtrer par action…"
              style={{ flex: 1, minWidth: 180, padding: '7px 12px', borderRadius: 8, fontSize: 12, background: '#0B1628', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0', outline: 'none', fontFamily: 'inherit' }}
            />
            <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(0) }}
              style={{ padding: '7px 12px', borderRadius: 8, fontSize: 12, background: '#0B1628', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'inherit' }}>
              <option value="all">Toutes catégories</option>
              {ALL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Chargement…</div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                        {['Date','Acteur','Action','Catégorie','Cible','Détails'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map(e => {
                        const cc = CATEGORIE_COLORS[e.categorie] ?? 'rgba(255,255,255,0.3)'
                        return (
                          <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '9px 14px', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', fontSize: 11 }}>
                              {new Date(e.created_at).toLocaleString('fr-CA', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: '9px 14px', color: 'rgba(255,255,255,0.55)', maxWidth: 140 }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{e.acteur_email || e.acteur_id?.slice(0,8) || 'system'}</span>
                            </td>
                            <td style={{ padding: '9px 14px' }}>
                              <code style={{ fontSize: 11, color: '#E2E8F0', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>{e.action}</code>
                            </td>
                            <td style={{ padding: '9px 14px' }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${cc}18`, border: `1px solid ${cc}33`, color: cc, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{e.categorie}</span>
                            </td>
                            <td style={{ padding: '9px 14px', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                              {e.cible_type && <span style={{ marginRight: 4 }}>{e.cible_type}</span>}
                              {e.cible_id && <code style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{e.cible_id.slice(0, 8)}…</code>}
                            </td>
                            <td style={{ padding: '9px 14px' }}>
                              {e.details && (
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                  {JSON.stringify(e.details).slice(0, 60)}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                      {paginated.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                            Aucun événement d&apos;audit pour ces filtres.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                      style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}>
                      ←
                    </button>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{page + 1} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                      style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
                      →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Impersonation tab */}
      {activeTab === 'impersonation' && (
        <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Début','Fin','Admin','Enseignant','Raison','Durée'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {impersonations.map(s => {
                  const debut = new Date(s.debut_session)
                  const fin   = s.fin_session ? new Date(s.fin_session) : null
                  const duree = fin ? Math.round((fin.getTime() - debut.getTime()) / 60000) : null
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '9px 14px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', fontSize: 11 }}>
                        {debut.toLocaleString('fr-CA', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '9px 14px', color: fin ? 'rgba(255,255,255,0.35)' : '#34D399', whiteSpace: 'nowrap', fontSize: 11 }}>
                        {fin ? fin.toLocaleString('fr-CA', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '⬤ En cours'}
                      </td>
                      <td style={{ padding: '9px 14px', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                        <code style={{ fontSize: 10 }}>{s.admin_id?.slice(0, 8)}…</code>
                      </td>
                      <td style={{ padding: '9px 14px', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                        <code style={{ fontSize: 10 }}>{s.enseignant_id?.slice(0, 8)}…</code>
                      </td>
                      <td style={{ padding: '9px 14px', color: 'rgba(255,255,255,0.5)', maxWidth: 200 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{s.raison || '—'}</span>
                      </td>
                      <td style={{ padding: '9px 14px', color: 'rgba(255,255,255,0.4)' }}>
                        {duree !== null ? `${duree} min` : '—'}
                      </td>
                    </tr>
                  )
                })}
                {impersonations.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                      Aucune session d&apos;impersonation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
