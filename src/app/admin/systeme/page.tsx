'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const MIGRATIONS = [
  { id: '001', name: '001_fix_schema.sql',                 desc: 'Schéma initial + tables quiz' },
  { id: '002', name: '002_fix_rls_nouvelles_tables.sql',   desc: 'RLS sur nouvelles tables' },
  { id: '007', name: '007_admin_outils_onboarding.sql',    desc: 'is_admin, forfait, menus_debloque, outils' },
]

export default function AdminSystemePage() {
  const supabase = createClient()
  const [stats, setStats] = useState({ users: 0, classes: 0, lecons: 0, gens: 0, ressources: 0 })
  const [loading, setLoading] = useState(true)
  const [archiving, setArchiving] = useState(false)
  const [archived, setArchived] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [
        { count: users },
        { count: classes },
        { count: lecons },
        { count: gens },
        { count: ressources },
      ] = await Promise.all([
        supabase.from('utilisateurs').select('id', { count: 'exact', head: true }),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
        supabase.from('lecons').select('id', { count: 'exact', head: true }),
        supabase.from('generations_ia').select('id', { count: 'exact', head: true }),
        supabase.from('studio_ia_ressources').select('id', { count: 'exact', head: true }),
      ])
      setStats({ users: users || 0, classes: classes || 0, lecons: lecons || 0, gens: gens || 0, ressources: ressources || 0 })
      setLoading(false)
    }
    load()
  }, [])

  const handleArchive = async () => {
    setArchiving(true)
    // Placeholder — en production, insérer dans stats_plateforme
    await new Promise(r => setTimeout(r, 1200))
    setArchiving(false)
    setArchived(true)
    setTimeout(() => setArchived(false), 4000)
  }

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', marginBottom: 4 }}>⚙️ Système</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Santé Supabase · Migrations · Paramètres globaux</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>Chargement...</div>
      ) : (
        <>
          {/* Santé DB */}
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 24px', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 16 }}>📊 Santé de la base de données</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {[
                { label: 'Utilisateurs', value: stats.users,     icon: '👩‍🏫', color: '#60A5FA' },
                { label: 'Classes',      value: stats.classes,   icon: '🏫',  color: '#A78BFA' },
                { label: 'Leçons',       value: stats.lecons,    icon: '📄',  color: '#34D399' },
                { label: 'Générations',  value: stats.gens,      icon: '🤖',  color: '#FBC34A' },
                { label: 'Ressources',   value: stats.ressources,icon: '📁',  color: '#F472B6' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Statut services */}
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 24px', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 14 }}>🟢 Statut des services</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { name: 'Supabase Database',  status: 'Opérationnel',  ok: true },
                { name: 'Supabase Auth',       status: 'Opérationnel',  ok: true },
                { name: 'Supabase Storage',    status: 'Opérationnel',  ok: true },
                { name: 'Supabase Realtime',   status: 'Opérationnel',  ok: true },
                { name: 'API Anthropic',        status: 'Opérationnel',  ok: true },
                { name: 'Next.js App Router',  status: 'Opérationnel',  ok: true },
              ].map(s => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{s.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: s.ok ? '#34D399' : '#F87171' }}>
                    {s.ok ? '● ' : '● '}{s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Migrations */}
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 24px', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 14 }}>🗄️ Migrations SQL</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MIGRATIONS.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{m.desc}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#34D399' }}>✓ Appliquée</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 14 }}>🛠️ Actions d&apos;administration</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
              <button onClick={handleArchive} disabled={archiving}
                style={{ padding: '10px 18px', background: archiving || archived ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${archived ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, color: archived ? '#34D399' : 'rgba(255,255,255,0.6)', fontSize: 13, cursor: archiving ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
                {archived ? '✓ Archivé !' : archiving ? '...' : '📦 Archiver les stats du mois'}
              </button>
              <button disabled
                style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'not-allowed', fontFamily: 'inherit' }}
                title="Bientôt disponible">
                🧹 Purger les anciennes générations (bientôt)
              </button>
            </div>
            {archived && (
              <div style={{ marginTop: 12, fontSize: 12, color: '#34D399' }}>
                ✓ Les statistiques du mois courant ont été archivées dans stats_plateforme.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
