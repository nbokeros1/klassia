'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'
import { useAuth } from '@/lib/hooks/useAuth'

type Utilisateur = {
  id: string
  user_id: string
  prenom: string
  nom: string
  email: string
  ecole: string | null
  type_compte: string
  langue: string
  province: string | null
  onboarding_complete: boolean
  created_at: string
  _nb_classes: number
  _nb_lecons: number
  _nb_generations: number
}

const TYPE_COLOR: Record<string, string> = {
  enseignant:  '#60A5FA',
  direction:   '#A78BFA',
  admin:       '#34D399',
  etudiant:    '#FCD34D',
  institution: '#F59E0B',
}

export default function AdminUtilisateurs() {
  const { profil, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [users,    setUsers]    = useState<Utilisateur[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [typeFilter, setTypeFilter] = useState('tous')
  const [editing,  setEditing]  = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [sortBy,   setSortBy]   = useState<'date' | 'nom' | 'activite'>('date')

  // Guard admin
  useEffect(() => {
    if (!authLoading && profil && profil.type_compte !== 'admin') {
      router.push('/dashboard')
    }
  }, [profil, authLoading, router])

  useEffect(() => {
    if (!profil || profil.type_compte !== 'admin') return
    const load = async () => {
      const { data: users } = await supabase
        .from('utilisateurs')
        .select('*')
        .order('created_at', { ascending: false })

      if (!users) { setLoading(false); return }

      // Enrichir avec les counts
      const enriched = await Promise.all(users.map(async (u: any) => {
        const [{ count: nbClasses }, { count: nbLecons }, { count: nbGen }] = await Promise.all([
          supabase.from('classes').select('*', { count: 'exact', head: true }).eq('enseignant_id', u.id),
          supabase.from('lecons').select('*', { count: 'exact', head: true }).eq('enseignant_id', u.id),
          supabase.from('generations_ia').select('*', { count: 'exact', head: true }).eq('enseignant_id', u.id),
        ])
        return { ...u, _nb_classes: nbClasses || 0, _nb_lecons: nbLecons || 0, _nb_generations: nbGen || 0 }
      }))
      setUsers(enriched)
      setLoading(false)
    }
    load()
  }, [profil])

  const handleChangeType = async (userId: string, newType: string) => {
    setSaving(true)
    await supabase.from('utilisateurs').update({ type_compte: newType }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, type_compte: newType } : u))
    setEditing(null)
    setSaving(false)
  }

  if (authLoading || loading) return <LoadingScreen />
  if (!profil || profil.type_compte !== 'admin') return null

  const filtered = users
    .filter(u => {
      if (typeFilter !== 'tous' && u.type_compte !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (u.prenom + ' ' + u.nom).toLowerCase().includes(q) ||
               u.email.toLowerCase().includes(q) ||
               (u.ecole || '').toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'nom')      return (a.prenom + a.nom).localeCompare(b.prenom + b.nom)
      if (sortBy === 'activite') return (b._nb_lecons + b._nb_generations) - (a._nb_lecons + a._nb_generations)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const stats = {
    total:       users.length,
    enseignants: users.filter(u => u.type_compte === 'enseignant').length,
    admins:      users.filter(u => u.type_compte === 'admin').length,
    onboarded:   users.filter(u => u.onboarding_complete).length,
    cette_semaine: users.filter(u => {
      const d = new Date(u.created_at)
      const now = new Date()
      return (now.getTime() - d.getTime()) < 7 * 24 * 3600 * 1000
    }).length,
  }

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/admin/utilisateurs" onLogout={logout} />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Utilisateurs</div>
            <div className="topbar-sub">{stats.total} comptes · {stats.cette_semaine} nouveaux cette semaine</div>
          </div>
        </div>

        <div className="page-content fade-in">
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Total',         val: stats.total,          color: '#60A5FA' },
              { label: 'Enseignants',   val: stats.enseignants,    color: '#A78BFA' },
              { label: 'Onboardés',     val: stats.onboarded,      color: '#34D399' },
              { label: 'Admins',        val: stats.admins,         color: '#FCD34D' },
              { label: 'Cette semaine', val: stats.cette_semaine,  color: '#F59E0B' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--text-5)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filtres */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher nom, email, école..."
              style={{ flex: 1, minWidth: 200, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13, color: 'var(--text-1)', outline: 'none' }} />
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)', outline: 'none' }}>
              <option value="tous">Tous les types</option>
              {['enseignant','direction','admin','etudiant','institution'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)', outline: 'none' }}>
              <option value="date">↓ Plus récents</option>
              <option value="nom">↓ Nom A–Z</option>
              <option value="activite">↓ Plus actifs</option>
            </select>
          </div>

          {/* Tableau */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Utilisateur', 'Email', 'École', 'Type', 'Province', 'Onboarding', 'Classes', 'Leçons', 'Générations IA', 'Inscrit le'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${TYPE_COLOR[u.type_compte] || '#60A5FA'}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: TYPE_COLOR[u.type_compte] || '#60A5FA', flexShrink: 0 }}>
                          {u.prenom?.[0]}{u.nom?.[0]}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{u.prenom} {u.nom}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-4)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-3)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.ecole || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {editing === u.id ? (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <select defaultValue={u.type_compte} onChange={e => handleChangeType(u.id, e.target.value)} disabled={saving}
                            style={{ padding: '3px 6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, fontSize: 11, color: 'var(--text-1)', outline: 'none' }}>
                            {['enseignant','direction','admin','etudiant','institution'].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                          <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: 'var(--text-5)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                        </div>
                      ) : (
                        <span onClick={() => setEditing(u.id)}
                          title="Cliquer pour modifier"
                          style={{ padding: '2px 8px', background: `${TYPE_COLOR[u.type_compte] || '#60A5FA'}20`, color: TYPE_COLOR[u.type_compte] || '#60A5FA', borderRadius: 99, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                          {u.type_compte}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-4)', fontSize: 11 }}>{u.province || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '2px 7px', background: u.onboarding_complete ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.1)', color: u.onboarding_complete ? '#34D399' : '#F87171', borderRadius: 6, fontSize: 10, fontWeight: 600 }}>
                        {u.onboarding_complete ? '✓' : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#60A5FA', fontWeight: 700, textAlign: 'center' }}>{u._nb_classes}</td>
                    <td style={{ padding: '10px 12px', color: '#A78BFA', fontWeight: 700, textAlign: 'center' }}>{u._nb_lecons}</td>
                    <td style={{ padding: '10px 12px', color: '#FCD34D', fontWeight: 700, textAlign: 'center' }}>{u._nb_generations}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-5)', whiteSpace: 'nowrap' }}>
                      {new Date(u.created_at).toLocaleDateString('fr-CA')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-5)' }}>Aucun utilisateur trouvé</div>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-5)', marginTop: 8 }}>{filtered.length} utilisateur{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''} · Cliquer sur le badge "type" pour modifier le rôle</div>
        </div>
      </div>
    </div>
  )
}
