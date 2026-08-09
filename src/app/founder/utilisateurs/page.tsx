'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id:                  string
  user_id:             string
  prenom:              string
  nom:                 string
  email:               string
  province:            string | null
  forfait:             string
  role:                string
  est_actif:           boolean
  created_at:          string
  derniere_connexion:  string | null
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ROLES = ['founder','super_admin','admin','beta_manager','support','teacher_premium','teacher','beta','read_only']
const FORFAITS = ['gratuit','pro','pro_plus','institution']

const ROLE_COLORS: Record<string, string> = {
  founder:         '#F59E0B',
  super_admin:     '#F87171',
  admin:           '#FB923C',
  beta_manager:    '#A78BFA',
  support:         '#60A5FA',
  teacher_premium: '#34D399',
  teacher:         'rgba(255,255,255,0.4)',
  beta:            '#818CF8',
  read_only:       'rgba(255,255,255,0.2)',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FounderUsers() {
  const router   = useRouter()
  const supabase = createClient()

  const [users,    setUsers]    = useState<UserRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [loadErr,  setLoadErr]  = useState(false)
  const [search,   setSearch]   = useState('')
  const [filterRole,    setFilterRole]    = useState('all')
  const [filterForfait, setFilterForfait] = useState('all')
  const [filterActive,  setFilterActive]  = useState('all')
  const [saving,   setSaving]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadErr(false)
    try {
      const { data, error } = await supabase
        .from('utilisateurs')
        .select('id, user_id, prenom, nom, email, province, forfait, role, est_actif, created_at, derniere_connexion')
        .order('created_at', { ascending: false })
      if (error) throw error
      setUsers((data || []) as UserRow[])
    } catch {
      setLoadErr(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(q)
    const matchRole    = filterRole    === 'all' || u.role    === filterRole
    const matchForfait = filterForfait === 'all' || u.forfait === filterForfait
    const matchActive  = filterActive  === 'all' || (filterActive === 'actif' ? u.est_actif !== false : u.est_actif === false)
    return matchSearch && matchRole && matchForfait && matchActive
  })

  const updateField = async (id: string, field: string, value: string | boolean) => {
    setSaving(id)
    await supabase.from('utilisateurs').update({ [field]: value } as unknown as Record<string, unknown>).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, [field]: value } : u))
    await fetch('/api/founder/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: `user.${field}.update`, categorie: 'user', cible_id: id, cible_type: 'user', details: { field, value } }),
    }).catch(() => {})
    setSaving(null)
  }

  const handleDelete = async (u: UserRow) => {
    if (!confirm(`Supprimer définitivement ${u.prenom} ${u.nom} (${u.email}) ?\n\nCette action est irréversible.`)) return
    setSaving(u.id)
    await fetch(`/api/founder/users?id=${u.id}`, { method: 'DELETE' })
    setUsers(prev => prev.filter(x => x.id !== u.id))
    setSaving(null)
  }

  const handleImpersonate = async (u: UserRow) => {
    const res = await fetch('/api/admin/impersonation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enseignant_id: u.id, raison: 'Impersonation Founder' }),
    })
    if (!res.ok) { alert('Impossible d\'impersonner cet utilisateur'); return }
    const { session_id } = await res.json()
    localStorage.setItem('klassia_impersonation', JSON.stringify({ sessionId: session_id, enseignantId: u.id }))
    router.push('/dashboard')
  }

  const exportCSV = () => {
    const rows = [
      ['Prénom','Nom','Email','Province','Forfait','Rôle','Actif','Créé le','Dernière connexion'],
      ...filtered.map(u => [
        u.prenom, u.nom, u.email, u.province ?? '',
        u.forfait, u.role, u.est_actif !== false ? 'Oui' : 'Non',
        new Date(u.created_at).toLocaleDateString('fr-CA'),
        u.derniere_connexion ? new Date(u.derniere_connexion).toLocaleDateString('fr-CA') : '—',
      ]),
    ]
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'scorgia-utilisateurs.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
            Founder Operating Center
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Utilisateurs</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            {filtered.length} / {users.length} utilisateurs · Rôles, forfaits, impersonation
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCSV}
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#A5B4FC', cursor: 'pointer' }}>
            ↓ Exporter CSV
          </button>
          <button onClick={load}
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#A5B4FC', cursor: 'pointer' }}>
            ↻ Actualiser
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email…"
          style={{
            flex: 1, minWidth: 240, padding: '8px 14px', borderRadius: 8, fontSize: 13,
            background: '#1C2537', border: '1px solid rgba(255,255,255,0.08)',
            color: '#E2E8F0', outline: 'none', fontFamily: 'inherit',
          }}
        />
        {[
          { label: 'Rôle', state: filterRole, set: setFilterRole, opts: ['all', ...ROLES] },
          { label: 'Forfait', state: filterForfait, set: setFilterForfait, opts: ['all', ...FORFAITS] },
          { label: 'Statut', state: filterActive, set: setFilterActive, opts: ['all','actif','inactif'] },
        ].map(f => (
          <select key={f.label} value={f.state} onChange={e => f.set(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 12,
              background: '#1C2537', border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'inherit',
            }}>
            <option value="all">Tous ({f.label})</option>
            {f.opts.filter(o => o !== 'all').map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Tableau */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Chargement…</div>
        ) : loadErr ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: '#EF4444', fontSize: 13 }}>
            Erreur de chargement — vérifier la connexion Supabase.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Utilisateur','Email','Rôle','Forfait','Statut','Créé','Actions'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left',
                      color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: 10,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    opacity: u.est_actif === false ? 0.45 : 1,
                    transition: 'background 0.1s',
                  }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#E2E8F0' }}>{u.prenom} {u.nom}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{u.province || '—'}</div>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.5)', maxWidth: 180 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{u.email}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <select
                        value={u.role || 'teacher'}
                        onChange={e => updateField(u.id, 'role', e.target.value)}
                        disabled={saving === u.id}
                        style={{
                          padding: '3px 8px', borderRadius: 6, fontSize: 11,
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          color: ROLE_COLORS[u.role] ?? 'rgba(255,255,255,0.5)',
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <select
                        value={u.forfait || 'gratuit'}
                        onChange={e => updateField(u.id, 'forfait', e.target.value)}
                        disabled={saving === u.id}
                        style={{
                          padding: '3px 8px', borderRadius: 6, fontSize: 11,
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                        {FORFAITS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        onClick={() => updateField(u.id, 'est_actif', !(u.est_actif !== false))}
                        disabled={saving === u.id}
                        style={{
                          padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: u.est_actif !== false ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          border: `1px solid ${u.est_actif !== false ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                          color: u.est_actif !== false ? '#10B981' : '#EF4444',
                          cursor: 'pointer',
                        }}>
                        {u.est_actif !== false ? 'Actif' : 'Suspendu'}
                      </button>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(u.created_at).toLocaleDateString('fr-CA')}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button
                          onClick={() => handleImpersonate(u)}
                          disabled={u.role === 'founder' || saving === u.id}
                          title="Se connecter en tant que"
                          style={{
                            padding: '4px 8px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                            color: '#A5B4FC', opacity: u.role === 'founder' ? 0.25 : 1,
                          }}>
                          ↗
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={u.role === 'founder' || saving === u.id}
                          title="Supprimer"
                          style={{
                            padding: '4px 8px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                            color: '#EF4444', opacity: u.role === 'founder' ? 0.2 : 1,
                          }}>
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '36px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
                Aucun utilisateur ne correspond aux filtres.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
