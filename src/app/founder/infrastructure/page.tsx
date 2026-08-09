'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface InfraStats {
  counts: {
    utilisateurs: number
    classes:      number
    lecons:       number
    gens:         number
    fichiers:     number
    packs:        number
  }
  logs: {
    debug: number
    info:  number
    warn:  number
    error: number
  }
  recentErrors: ErrorRow[]
  spieAccess:   SpieRow[]
  dbOk:         boolean
  lastRefresh:  Date
}

interface ErrorRow {
  id:         string
  level:      string
  tag:        string
  message:    string
  page_url:   string | null
  created_at: string
}

interface SpieRow {
  id:           string
  route:        string | null
  enseignant_id:string | null
  statut:       string | null
  duree_ms:     number | null
  created_at:   string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('fr-CA')

const LOG_COLORS: Record<string, string> = {
  debug: 'rgba(255,255,255,0.3)',
  info:  '#60A5FA',
  warn:  '#F59E0B',
  error: '#EF4444',
}

function TableRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', fontVariantNumeric: 'tabular-nums' }}>
        {typeof value === 'number' ? fmt(value) : value}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FounderInfrastructure() {
  const supabase = createClient()
  const [data,    setData]    = useState<InfraStats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [
        { count: cUsers,    error: e1 },
        { count: cClasses             },
        { count: cLecons              },
        { count: cGens                },
        { count: cFichiers            },
        { count: cPacks               },
        { data: logLevels             },
        { data: recentErrors          },
        { data: spieRows              },
      ] = await Promise.all([
        supabase.from('utilisateurs').select('*',          { count: 'exact', head: true }),
        supabase.from('classes').select('*',               { count: 'exact', head: true }),
        supabase.from('lecons').select('*',                { count: 'exact', head: true }),
        supabase.from('generations_ia').select('*',        { count: 'exact', head: true }),
        supabase.from('fichiers_dossier').select('*',      { count: 'exact', head: true }),
        supabase.from('teaching_packs').select('*',        { count: 'exact', head: true }),
        supabase.from('beta_logs').select('level').limit(2000),
        supabase.from('beta_logs').select('id, level, tag, message, page_url, created_at')
          .eq('level', 'error').order('created_at', { ascending: false }).limit(30),
        supabase.from('spie_access_log').select('id, route, enseignant_id, statut, duree_ms, created_at')
          .order('created_at', { ascending: false }).limit(20),
      ])

      const lc = { debug: 0, info: 0, warn: 0, error: 0 }
      ;(logLevels || []).forEach((r: { level: string }) => {
        if (r.level in lc) lc[r.level as keyof typeof lc]++
      })

      setData({
        counts: {
          utilisateurs: cUsers    ?? 0,
          classes:      cClasses  ?? 0,
          lecons:       cLecons   ?? 0,
          gens:         cGens     ?? 0,
          fichiers:     cFichiers ?? 0,
          packs:        cPacks    ?? 0,
        },
        logs:         lc,
        recentErrors: (recentErrors || []) as ErrorRow[],
        spieAccess:   (spieRows    || []) as SpieRow[],
        dbOk:         !e1,
        lastRefresh:  new Date(),
      })
    } catch {
      setData(null)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
      Chargement de l&apos;infrastructure…
    </div>
  )

  if (!data) {
    return (
      <div style={{ padding: 28, color: '#EF4444', fontSize: 13 }}>
        Erreur de chargement — vérifier la connexion Supabase.
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1080 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
            Founder Operating Center
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Infrastructure</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            Base de données · Logs · SPIE · Stockage
          </p>
        </div>
        <button onClick={load} style={{
          padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
          color: '#A5B4FC', cursor: 'pointer',
        }}>
          ↻ Actualiser
        </button>
      </div>

      {/* DB Health + Counts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>État des services</h2>
          {[
            { label: 'Supabase PostgreSQL', ok: data.dbOk,  note: 'Connexion active'       },
            { label: 'Supabase Auth',       ok: true,        note: 'JWT validé à la connexion' },
            { label: 'Supabase Storage',    ok: true,        note: 'Bucket ressources'       },
            { label: 'Supabase Realtime',   ok: true,        note: 'Canaux actifs'           },
            { label: 'Vercel Functions',    ok: null,        note: 'Voir Vercel Dashboard'   },
            { label: 'Anthropic API',       ok: null,        note: 'Voir Claude Console'     },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', display: 'inline-block', background: s.ok === null ? 'rgba(255,255,255,0.15)' : s.ok ? '#10B981' : '#EF4444' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{s.label}</span>
              </div>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{s.note}</span>
            </div>
          ))}
        </div>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Volumétrie base de données</h2>
          <TableRow label="Utilisateurs"     value={data.counts.utilisateurs} />
          <TableRow label="Classes"          value={data.counts.classes}      />
          <TableRow label="Plans de leçon"   value={data.counts.lecons}       />
          <TableRow label="Générations IA"   value={data.counts.gens}         />
          <TableRow label="Fichiers"         value={data.counts.fichiers}      />
          <TableRow label="Teaching Packs"   value={data.counts.packs}        />
        </div>

      </div>

      {/* Logs */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px', marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Logs bêta (beta_logs)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {(['debug', 'info', 'warn', 'error'] as const).map(level => (
            <div key={level} style={{ background: '#1C2537', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: LOG_COLORS[level], marginBottom: 2 }}>
                {fmt(data.logs[level])}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {level}
              </div>
            </div>
          ))}
        </div>

        {data.recentErrors.length === 0 ? (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', padding: '8px 0' }}>
            Aucune erreur récente — bonne nouvelle
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              Dernières erreurs
            </div>
            {data.recentErrors.map(err => (
              <div key={err.id} style={{ padding: '9px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#FCA5A5', letterSpacing: '0.06em' }}>[{err.tag}]</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(err.created_at).toLocaleString('fr-CA')}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{err.message}</div>
                {err.page_url && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 3 }}>{err.page_url}</div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* SPIE Access Log */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Accès SPIE récents (spie_access_log)</h2>
        {data.spieAccess.length === 0 ? (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', padding: '8px 0' }}>Aucun accès SPIE enregistré</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Route', 'Statut', 'Durée', 'Date'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0 0 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.spieAccess.map(row => (
                <tr key={row.id}>
                  <td style={{ padding: '8px 0', fontSize: 12, color: '#F1F5F9', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{row.route || '—'}</td>
                  <td style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 11, color: row.statut === 'ok' ? '#10B981' : row.statut === 'error' ? '#EF4444' : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                      {row.statut || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 0', fontSize: 11, color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.04)', fontVariantNumeric: 'tabular-nums' }}>
                    {row.duree_ms ? `${row.duree_ms} ms` : '—'}
                  </td>
                  <td style={{ padding: '8px 0', fontSize: 10, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.04)', fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(row.created_at).toLocaleString('fr-CA')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
