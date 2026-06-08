'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const FORFAITS = ['tous', 'gratuit', 'pro', 'pro_plus', 'institution']
const PROVINCES = ['Québec', 'Ontario', 'Alberta', 'Colombie-Britannique', 'Saskatchewan', 'Manitoba']
const PAGE_SIZE = 25

export default function AdminEnseignantsPage() {
  const supabase = createClient()
  const [list,       setList]       = useState<any[]>([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [forfait,    setForfait]    = useState('tous')
  const [province,   setProvince]   = useState('')
  const [page,       setPage]       = useState(0)
  const [exporting,  setExporting]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('utilisateurs')
      .select('id, prenom, nom, email, province, forfait, created_at, derniere_connexion, is_admin', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (forfait !== 'tous') q = q.eq('forfait', forfait)
    if (province)           q = q.eq('province', province)
    if (search.trim())      q = (q as any).ilike('prenom', `%${search}%`)

    const { data, count } = await q
    setList(data || [])
    setTotal(count || 0)
    setLoading(false)
  }, [forfait, province, search, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(0) }, [forfait, province, search])

  const exportCSV = async () => {
    setExporting(true)
    const { data } = await supabase.from('utilisateurs').select('prenom, nom, email, province, forfait, created_at').order('created_at', { ascending: false })
    const rows = (data || []).map(u => [u.prenom, u.nom, u.email, u.province, u.forfait, u.created_at].join(';')).join('\n')
    const csv  = `Prénom;Nom;Email;Province;Forfait;Inscription\n${rows}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'enseignants.csv'; a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  const handleForfait = async (id: string, f: string) => {
    await supabase.from('utilisateurs').update({ forfait: f }).eq('id', id)
    setList(prev => prev.map(u => u.id === id ? { ...u, forfait: f } : u))
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', marginBottom: 4 }}>👩‍🏫 Enseignants</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{total} enseignant{total !== 1 ? 's' : ''} inscrits</div>
        </div>
        <button onClick={exportCSV} disabled={exporting}
          style={{ padding: '9px 18px', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 10, color: '#34D399', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          {exporting ? '...' : '⬇ Export CSV'}
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' as const }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher par prénom..."
          style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F1F5F9', fontSize: 12, outline: 'none', minWidth: 200 }} />

        <select value={forfait} onChange={e => setForfait(e.target.value)}
          style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F1F5F9', fontSize: 12, outline: 'none' }}>
          {FORFAITS.map(f => <option key={f} value={f}>{f === 'tous' ? 'Tous les forfaits' : f}</option>)}
        </select>

        <select value={province} onChange={e => setProvince(e.target.value)}
          style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F1F5F9', fontSize: 12, outline: 'none' }}>
          <option value="">Toutes les provinces</option>
          {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Tableau */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Chargement...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Nom', 'Email', 'Province', 'Forfait', 'Inscription', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' as const }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                      {u.prenom} {u.nom} {u.is_admin && <span style={{ fontSize: 10, color: '#EF4444', fontWeight: 700 }}>ADMIN</span>}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.45)' }}>{u.email || '—'}</td>
                    <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.5)' }}>{u.province || '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <select value={u.forfait || 'gratuit'} onChange={e => handleForfait(u.id, e.target.value)}
                        style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontFamily: 'inherit' }}>
                        {['gratuit', 'pro', 'pro_plus', 'institution'].map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' as const }}>
                      {new Date(u.created_at).toLocaleDateString('fr-CA')}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <button onClick={async () => {
                        if (!confirm('Supprimer ?')) return
                        await supabase.from('utilisateurs').delete().eq('id', u.id)
                        setList(prev => prev.filter(x => x.id !== u.id))
                      }}
                        style={{ padding: '4px 8px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 6, color: '#F87171', fontSize: 12, cursor: 'pointer' }}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', opacity: page === 0 ? 0.4 : 1 }}>
            ← Préc.
          </button>
          <span style={{ padding: '6px 12px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            Page {page + 1} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
            Suiv. →
          </button>
        </div>
      )}
    </div>
  )
}
