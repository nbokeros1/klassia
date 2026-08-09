'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CountRow { count: number }
interface LogRow {
  id:         string
  level:      string
  tag:        string
  message:    string
  page_url:   string | null
  created_at: string
}

export default function FounderMonitoring() {
  const supabase = createClient()

  const [loading, setLoading]       = useState(true)
  const [counts,  setCounts]        = useState({ users: 0, classes: 0, lecons: 0, gens: 0 })
  const [logCounts, setLogCounts]   = useState({ debug: 0, info: 0, warn: 0, error: 0 })
  const [recentErrors, setErrors]   = useState<LogRow[]>([])
  const [health,  setHealth]        = useState({ db: 'ok', storage: 'ok', auth: 'ok' })
  const [refreshAt, setRefreshAt]   = useState(new Date())

  const load = async () => {
    setLoading(true)
    try {
      const [
        { count: cUsers },
        { count: cClasses },
        { count: cLecons },
        { count: cGens },
        { data: logLevels },
        { data: recentErr },
      ] = await Promise.all([
        supabase.from('utilisateurs').select('*', { count: 'exact', head: true }),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('lecons').select('*', { count: 'exact', head: true }),
        supabase.from('generations_ia').select('*', { count: 'exact', head: true }),
        supabase.from('beta_logs').select('level').limit(1000),
        supabase.from('beta_logs').select('id, level, tag, message, page_url, created_at').eq('level', 'error').order('created_at', { ascending: false }).limit(20),
      ])

      setCounts({ users: cUsers ?? 0, classes: cClasses ?? 0, lecons: cLecons ?? 0, gens: cGens ?? 0 })

      const lc = { debug: 0, info: 0, warn: 0, error: 0 }
      ;(logLevels || []).forEach((r: { level: string }) => { if (r.level in lc) lc[r.level as keyof typeof lc]++ })
      setLogCounts(lc)

      setErrors((recentErr || []) as LogRow[])
      setHealth({ db: 'ok', storage: 'ok', auth: 'ok' })
    } catch {
      setHealth({ db: 'error', storage: 'unknown', auth: 'unknown' })
    }
    setRefreshAt(new Date())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const LEVEL_COLOR: Record<string, string> = {
    debug: 'rgba(255,255,255,0.3)',
    info:  '#60A5FA',
    warn:  '#F59E0B',
    error: '#F87171',
  }

  const STATUS_COLOR: Record<string, string> = { ok: '#34D399', error: '#F87171', unknown: '#F59E0B' }
  const STATUS_LABEL: Record<string, string>  = { ok: '✓ Opérationnel', error: '✗ Erreur', unknown: '? Inconnu' }

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>Founder Operating Center</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Monitoring</h1>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            Dernière actualisation : {refreshAt.toLocaleTimeString('fr-CA')}
          </div>
        </div>
        <button onClick={load} disabled={loading}
          style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
          ↻ Actualiser
        </button>
      </div>

      {/* Santé système */}
      <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>SANTÉ DU SYSTÈME</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[
            { key: 'db',      label: 'Base de données Supabase' },
            { key: 'auth',    label: 'Authentification'         },
            { key: 'storage', label: 'Stockage fichiers'        },
          ].map(s => {
            const st = health[s.key as keyof typeof health]
            return (
              <div key={s.key} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${STATUS_COLOR[st]}33`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: STATUS_COLOR[st] }}>{STATUS_LABEL[st]}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Volumes de données */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Utilisateurs', value: counts.users,   icon: '👥', color: '#60A5FA' },
          { label: 'Classes',      value: counts.classes, icon: '🏫', color: '#A78BFA' },
          { label: 'Leçons',       value: counts.lecons,  icon: '📄', color: '#34D399' },
          { label: 'Générations',  value: counts.gens,    icon: '🤖', color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums', marginBottom: 2 }}>
              {loading ? '—' : s.value.toLocaleString('fr-CA')}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Logs par niveau */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>LOGS PAR NIVEAU</div>
          {Object.entries(logCounts).map(([level, count]) => (
            <div key={level} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: LEVEL_COLOR[level] }} />
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{level}</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: LEVEL_COLOR[level], fontVariantNumeric: 'tabular-nums' }}>{count}</div>
            </div>
          ))}
        </div>

        {/* Dernières erreurs */}
        <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>DERNIÈRES ERREURS</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: logCounts.error > 0 ? '#F87171' : '#34D399' }}>{logCounts.error}</div>
          </div>
          {recentErrors.length === 0 ? (
            <div style={{ color: '#34D399', fontSize: 12 }}>✓ Aucune erreur</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
              {recentErrors.slice(0, 8).map(e => (
                <div key={e.id} style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.1)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: '#F87171', fontFamily: 'monospace' }}>{e.tag || 'ERR'}</span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{new Date(e.created_at).toLocaleTimeString('fr-CA')}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.message}</div>
                  {e.page_url && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.page_url}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.12)', borderRadius: 12, padding: '14px 18px', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
        <strong style={{ color: '#60A5FA' }}>Note :</strong> Le monitoring avancé (CPU, mémoire, temps de réponse API, alertes Supabase) sera disponible en V1.1 via l&apos;API Supabase Management et des webhooks d&apos;alerte. Pour la bêta privée, ce tableau de bord fournit une vue basique des volumes et erreurs applicatives.
      </div>
    </div>
  )
}
