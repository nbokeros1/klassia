'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PackRow {
  id:       string
  nom:      string
  statut:   string
  province: string | null
  langue:   string | null
  created_at: string
}

interface ContentStats {
  packs:        number
  packsByStatus: Record<string, number>
  recentPacks:  PackRow[]
  plansAnnuels: number
  lecons:       number
  leconsByStatus: Record<string, number>
  fichiers:     number
  quizTotal:    number
  questions:    number
  versions:     number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('fr-CA')

const STATUT_PACK: Record<string, { label: string; color: string }> = {
  configuration: { label: 'Configuration', color: '#6366F1' },
  analyse:       { label: 'Analyse',       color: '#F59E0B' },
  generation:    { label: 'Génération',    color: '#A78BFA' },
  complet:       { label: 'Complet',       color: '#10B981' },
  erreur:        { label: 'Erreur',        color: '#EF4444' },
}

const STATUT_LECON: Record<string, { label: string; color: string }> = {
  brouillon:  { label: 'Brouillon',  color: 'rgba(255,255,255,0.35)' },
  prete:      { label: 'Prête',      color: '#6366F1' },
  en_cours:   { label: 'En cours',   color: '#F59E0B' },
  enseignee:  { label: 'Enseignée',  color: '#10B981' },
  complete:   { label: 'Complète',   color: '#34D399' },
  a_revoir:   { label: 'À revoir',   color: '#F87171' },
  archivee:   { label: 'Archivée',   color: 'rgba(255,255,255,0.2)' },
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.4px', marginBottom: 2 }}>
        {typeof value === 'number' ? fmt(value) : value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FounderContenu() {
  const supabase = createClient()
  const [data,    setData]    = useState<ContentStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [
        { data: packs             },
        { count: cPlans           },
        { data: lecons            },
        { count: cFichiers        },
        { count: cQuiz            },
        { count: cQuestions       },
        { count: cVersions        },
      ] = await Promise.all([
        supabase.from('teaching_packs').select('id, nom, statut, province, langue, created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('programme_annuel').select('*', { count: 'exact', head: true }),
        supabase.from('lecons').select('id, statut').limit(2000),
        supabase.from('fichiers_dossier').select('*', { count: 'exact', head: true }),
        supabase.from('quiz').select('*', { count: 'exact', head: true }),
        supabase.from('questions_quiz').select('*', { count: 'exact', head: true }),
        supabase.from('pack_versions').select('*', { count: 'exact', head: true }),
      ])

      const packList  = (packs   || []) as PackRow[]
      const leconList = (lecons  || []) as { id: string; statut: string }[]

      const packsByStatus: Record<string, number> = {}
      packList.forEach(p => { packsByStatus[p.statut] = (packsByStatus[p.statut] || 0) + 1 })

      const leconsByStatus: Record<string, number> = {}
      leconList.forEach(l => { leconsByStatus[l.statut] = (leconsByStatus[l.statut] || 0) + 1 })

      setData({
        packs:        packList.length,
        packsByStatus,
        recentPacks:  packList.slice(0, 10),
        plansAnnuels: cPlans     ?? 0,
        lecons:       leconList.length,
        leconsByStatus,
        fichiers:     cFichiers  ?? 0,
        quizTotal:    cQuiz      ?? 0,
        questions:    cQuestions ?? 0,
        versions:     cVersions  ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
      Chargement du contenu…
    </div>
  )
  if (!data) return null

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1080 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
          Founder Operating Center
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Contenu</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
          Tout le contenu produit par ScorgIA
        </p>
      </div>

      {/* Stats globales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        <StatCard label="Teaching Packs"  value={data.packs}       />
        <StatCard label="Plans annuels"   value={data.plansAnnuels} />
        <StatCard label="Plans de leçon"  value={data.lecons}       />
        <StatCard label="Fichiers totaux" value={data.fichiers}     />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
        <StatCard label="Quiz créés"       value={data.quizTotal}  />
        <StatCard label="Questions quiz"   value={data.questions}  />
        <StatCard label="Versions de pack" value={data.versions}   sub="pack_versions" />
        <StatCard label="—"               value="—"               />
      </div>

      {/* Teaching Packs par statut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Teaching Packs par statut</h2>
          {Object.entries(STATUT_PACK).map(([key, meta]) => {
            const n = data.packsByStatus[key] || 0
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{meta.label}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: n > 0 ? meta.color : 'rgba(255,255,255,0.2)' }}>{n}</span>
              </div>
            )
          })}
          {Object.entries(data.packsByStatus)
            .filter(([k]) => !(k in STATUT_PACK))
            .map(([k, n]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>{n}</span>
              </div>
            ))
          }
        </div>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Leçons par statut</h2>
          {Object.entries(STATUT_LECON).map(([key, meta]) => {
            const n = data.leconsByStatus[key] || 0
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{meta.label}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: n > 0 ? meta.color : 'rgba(255,255,255,0.2)' }}>{n}</span>
              </div>
            )
          })}
        </div>

      </div>

      {/* Teaching Packs récents */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Teaching Packs récents</h2>
        {data.recentPacks.length === 0 ? (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', padding: '8px 0' }}>Aucun Teaching Pack créé</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Nom', 'Statut', 'Province', 'Langue', 'Date'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0 0 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentPacks.map(pack => {
                const st = STATUT_PACK[pack.statut] ?? { label: pack.statut, color: 'rgba(255,255,255,0.3)' }
                return (
                  <tr key={pack.id}>
                    <td style={{ padding: '9px 0', fontSize: 12, color: '#F1F5F9', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {pack.nom || 'Sans titre'}
                    </td>
                    <td style={{ padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: 11, color: st.color, fontWeight: 600 }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '9px 0', fontSize: 11, color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {pack.province || '—'}
                    </td>
                    <td style={{ padding: '9px 0', fontSize: 11, color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {pack.langue || '—'}
                    </td>
                    <td style={{ padding: '9px 0', fontSize: 11, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.04)', fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(pack.created_at).toLocaleDateString('fr-CA')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
