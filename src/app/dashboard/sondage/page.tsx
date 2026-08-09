'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'
import { QRCodeSVG } from 'qrcode.react'

interface Sondage {
  id: string
  code: string
  question: string
  type: 'texte' | 'choix'
  choix: string[] | null
  statut: 'ouvert' | 'ferme'
  created_at: string
}

interface Reponse {
  id: string
  sondage_id: string
  reponse: string
  created_at: string
}

// Build frequency map for word-cloud style display
function buildFrequency(reponses: Reponse[]) {
  const map: Record<string, number> = {}
  for (const r of reponses) {
    const key = r.reponse.trim().toLowerCase()
    if (key) map[key] = (map[key] || 0) + 1
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1])
}

const COULEUR_POOL = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4', '#EF4444', '#6366F1']

export default function SondagePage() {
  const [profil, setProfil] = useState<any>(null)
  const [sondages, setSondages] = useState<Sondage[]>([])
  const [reponses, setReponses] = useState<Reponse[]>([])
  const [activeSondage, setActiveSondage] = useState<Sondage | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ question: '', type: 'texte' as 'texte' | 'choix', choix: ['', ''] })
  const [baseUrl, setBaseUrl] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeSondageIdRef = useRef<string | null>(null)

  useEffect(() => {
    setBaseUrl(window.location.origin)
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: profil } = await supabase.from('utilisateurs').select('*').eq('user_id', session.user.id).single()
      setProfil(profil)
      if (!profil?.id) { setLoading(false); return }
      const { data } = await supabase.from('sondages').select('*').eq('enseignant_id', profil.id).order('created_at', { ascending: false })
      setSondages(data || [])
      setLoading(false)
    }
    init()
  }, [])

  const subscribeToReponses = useCallback((sondageId: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    activeSondageIdRef.current = sondageId

    const load = async () => {
      const { data } = await supabase
        .from('reponses_sondage').select('*')
        .eq('sondage_id', sondageId).order('created_at')
      if (activeSondageIdRef.current === sondageId) {
        setReponses(data || [])
      }
    }

    load()
    intervalRef.current = setInterval(load, 2000)
  }, [supabase])

  const handleSelectSondage = (s: Sondage) => {
    setActiveSondage(s)
    subscribeToReponses(s.id)
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      activeSondageIdRef.current = null
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profil?.id || !form.question.trim()) return
    setCreating(true)
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const choix = form.type === 'choix' ? form.choix.filter(Boolean) : null
    const { data, error } = await supabase.from('sondages').insert({
      enseignant_id: profil.id,
      code,
      question: form.question,
      type: form.type,
      choix,
      statut: 'ouvert',
    }).select().single()
    if (!error && data) {
      setSondages(prev => [data, ...prev])
      setActiveSondage(data)
      subscribeToReponses(data.id)
      setForm({ question: '', type: 'texte', choix: ['', ''] })
    }
    setCreating(false)
  }

  const handleToggleStatut = async (s: Sondage) => {
    const next = s.statut === 'ouvert' ? 'ferme' : 'ouvert'
    await supabase.from('sondages').update({ statut: next }).eq('id', s.id)
    const updated = { ...s, statut: next as 'ouvert' | 'ferme' }
    setSondages(prev => prev.map(x => x.id === s.id ? updated : x))
    if (activeSondage?.id === s.id) setActiveSondage(updated)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('sondages').delete().eq('id', id)
    setSondages(prev => prev.filter(s => s.id !== id))
    if (activeSondage?.id === id) { setActiveSondage(null); setReponses([]) }
  }

  const handleClearReponses = async (sondageId: string) => {
    await supabase.from('reponses_sondage').delete().eq('sondage_id', sondageId)
    setReponses([])
  }

  const freq = buildFrequency(reponses)
  const maxFreq = freq[0]?.[1] || 1
  const studentUrl = activeSondage ? `${baseUrl}/sondage/${activeSondage.code}` : ''

  if (loading) return <LoadingScreen />

  // ── Fullscreen TBI overlay ────────────────────────────────────────────────
  if (fullscreen && activeSondage) {
    const fFreq = buildFrequency(reponses)
    const fMax = fFreq[0]?.[1] || 1
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#0A0A1A',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', zIndex: 9999, padding: 48,
      }}>
        {/* Exit button */}
        <button onClick={() => setFullscreen(false)}
          style={{
            position: 'absolute', top: 24, right: 24,
            background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
            borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}>
          ✕ Fermer (Échap)
        </button>

        {/* ScorgIA watermark */}
        <div style={{ position: 'absolute', top: 24, left: 32, fontSize: 18, fontWeight: 900, color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>
          Scorg<span style={{ color: 'rgba(107,63,160,0.4)' }}>IA</span>
        </div>

        {/* Question */}
        <div style={{ fontSize: 36, fontWeight: 800, color: 'white', textAlign: 'center', marginBottom: 16, maxWidth: 900, lineHeight: 1.3 }}>
          {activeSondage.question}
        </div>

        {/* Count */}
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', marginBottom: 48, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
          {reponses.length} réponse{reponses.length !== 1 ? 's' : ''}
        </div>

        {reponses.length === 0 ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 72, marginBottom: 24 }}>📲</div>
            <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>En attente des réponses...</div>
            <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: 8, color: 'white', background: 'rgba(255,255,255,0.08)', padding: '16px 40px', borderRadius: 20 }}>
              {activeSondage.code}
            </div>
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.3)', marginTop: 12 }}>Tape ce code sur scorgia.app ou scanne le QR</div>
          </div>
        ) : activeSondage.type === 'texte' ? (
          /* Large word cloud */
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'center', maxWidth: 1000 }}>
            {fFreq.map(([mot, count], i) => {
              const ratio = count / fMax
              const size = 18 + ratio * 42
              const color = COULEUR_POOL[i % COULEUR_POOL.length]
              return (
                <div key={mot} style={{
                  padding: `${8 + ratio * 10}px ${18 + ratio * 14}px`,
                  borderRadius: 99,
                  background: `${color}25`,
                  border: `2px solid ${color}60`,
                  color: color,
                  fontSize: size,
                  fontWeight: count > 1 ? 800 : 500,
                  transition: 'all 0.5s',
                  textTransform: 'capitalize',
                }}>
                  {mot}
                  {count > 1 && <sup style={{ fontSize: size * 0.45, marginLeft: 6, opacity: 0.7 }}>×{count}</sup>}
                </div>
              )
            })}
          </div>
        ) : (
          /* Large bar chart */
          <div style={{ width: '100%', maxWidth: 700 }}>
            {(activeSondage.choix || []).map((choix, i) => {
              const count = reponses.filter(r => r.reponse === choix).length
              const pct = reponses.length > 0 ? Math.round(count / reponses.length * 100) : 0
              const color = COULEUR_POOL[i % COULEUR_POOL.length]
              return (
                <div key={i} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 22, color: 'white', fontWeight: 600 }}>{choix}</span>
                    <span style={{ fontSize: 22, color: color, fontWeight: 800 }}>{pct}%</span>
                  </div>
                  <div style={{ height: 18, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{count} réponse{count !== 1 ? 's' : ''}</div>
                </div>
              )
            })}
          </div>
        )}

        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.4); } }
        `}</style>
      </div>
    )
  }

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/sondage" />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Sondage QR</div>
            <div className="topbar-sub">Échantillonnage en temps réel · Réponses instantanées</div>
          </div>
        </div>

        <div className="page-content fade-in" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>

          {/* Left: Create + list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Create form */}
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>Nouveau sondage</div>
              <form onSubmit={handleCreate}>
                <div style={{ marginBottom: 10 }}>
                  <div className="form-label">Question *</div>
                  <textarea value={form.question} onChange={e => setForm({ ...form, question: e.target.value })}
                    required rows={3} placeholder="Posez votre question aux élèves..."
                    style={{ width: '100%', padding: '9px 11px', background: 'rgba(255,255,255,0.06)', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 13, color: 'var(--text-1)', resize: 'none' as const, fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div className="form-label">Type de réponse</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['texte', 'choix'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                        style={{ flex: 1, padding: '7px 0', border: `1.5px solid ${form.type === t ? '#60A5FA' : 'var(--border)'}`, borderRadius: 7, background: form.type === t ? 'var(--blue-pale)' : 'transparent', color: form.type === t ? '#60A5FA' : 'var(--text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {t === 'texte' ? '✏️ Texte libre' : '☑️ Choix multiples'}
                      </button>
                    ))}
                  </div>
                </div>
                {form.type === 'choix' && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="form-label">Options</div>
                    {form.choix.map((c, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                        <input value={c} onChange={e => { const ch = [...form.choix]; ch[i] = e.target.value; setForm({ ...form, choix: ch }) }}
                          placeholder={`Option ${i + 1}`}
                          style={{ flex: 1, padding: '7px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--text-1)', fontFamily: 'inherit' }} />
                        {form.choix.length > 2 && (
                          <button type="button" onClick={() => setForm({ ...form, choix: form.choix.filter((_, j) => j !== i) })}
                            style={{ background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', fontSize: 16 }}>✕</button>
                        )}
                      </div>
                    ))}
                    {form.choix.length < 6 && (
                      <button type="button" onClick={() => setForm({ ...form, choix: [...form.choix, ''] })}
                        className="btn-ghost btn-sm" style={{ width: '100%' }}>+ Ajouter une option</button>
                    )}
                  </div>
                )}
                <button type="submit" disabled={creating} className="btn-primary btn-sm" style={{ width: '100%' }}>
                  {creating ? 'Création...' : '▶ Lancer le sondage'}
                </button>
              </form>
            </div>

            {/* Sondage history */}
            {sondages.length > 0 && (
              <div className="card" style={{ padding: '12px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>SONDAGES RÉCENTS</div>
                {sondages.slice(0, 8).map(s => (
                  <div key={s.id}
                    onClick={() => handleSelectSondage(s)}
                    style={{
                      padding: '8px 10px', borderRadius: 7, marginBottom: 4, cursor: 'pointer',
                      background: activeSondage?.id === s.id ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${activeSondage?.id === s.id ? 'rgba(96,165,250,0.3)' : 'transparent'}`,
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.question}
                      </div>
                      <div style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, marginLeft: 6, flexShrink: 0, background: s.statut === 'ouvert' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', color: s.statut === 'ouvert' ? '#10B981' : 'var(--text-4)' }}>
                        {s.statut === 'ouvert' ? 'Ouvert' : 'Fermé'}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-4)' }}>Code: {s.code} · {s.type}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Active sondage + results */}
          {activeSondage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Header */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>{activeSondage.question}</div>
                      <div style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: activeSondage.statut === 'ouvert' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)', color: activeSondage.statut === 'ouvert' ? '#10B981' : 'var(--text-4)', fontWeight: 600 }}>
                        {activeSondage.statut === 'ouvert' ? '● Ouvert' : '■ Fermé'}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
                      Code: <b style={{ color: 'var(--text-1)', fontSize: 14, letterSpacing: 1 }}>{activeSondage.code}</b>
                      {' · '}{reponses.length} réponse{reponses.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setFullscreen(true)}
                        style={{
                          padding: '7px 14px', border: 'none', borderRadius: 7,
                          background: 'linear-gradient(135deg, #6B3FA0, #3B82F6)',
                          color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                        🖥️ Afficher au TBI
                      </button>
                      <button onClick={() => handleToggleStatut(activeSondage)} className="btn-ghost btn-sm">
                        {activeSondage.statut === 'ouvert' ? '■ Fermer' : '▶ Rouvrir'}
                      </button>
                      <button onClick={() => handleClearReponses(activeSondage.id)} className="btn-ghost btn-sm">
                        🗑 Effacer
                      </button>
                      <button onClick={() => handleDelete(activeSondage.id)} className="btn-ghost btn-sm" style={{ color: '#EF4444' }}>
                        Supprimer
                      </button>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ background: 'white', padding: 12, borderRadius: 12, display: 'inline-block', marginBottom: 6 }}>
                      <QRCodeSVG value={studentUrl} size={120} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-4)', marginBottom: 4 }}>Scanner pour répondre</div>
                    <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, color: 'var(--text-1)' }}>{activeSondage.code}</div>
                    <a href={studentUrl} target="_blank" rel="noreferrer"
                      style={{ fontSize: 10, color: '#60A5FA', display: 'block', marginTop: 4 }}>
                      Ouvrir le lien élève ↗
                    </a>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                    Résultats en temps réel
                    {reponses.length > 0 && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-4)', fontWeight: 400 }}>{reponses.length} réponse{reponses.length !== 1 ? 's' : ''}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: activeSondage.statut === 'ouvert' ? '#10B981' : 'var(--text-4)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: activeSondage.statut === 'ouvert' ? '#10B981' : 'var(--text-4)', animation: activeSondage.statut === 'ouvert' ? 'pulse 2s infinite' : 'none' }} />
                    {activeSondage.statut === 'ouvert' ? 'Actualisation auto' : 'Fermé'}
                  </div>
                </div>

                {reponses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📲</div>
                    <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 6 }}>En attente des réponses</div>
                    <div style={{ fontSize: 12, color: 'var(--text-4)' }}>Les élèves scannent le QR ou saisissent le code <b>{activeSondage.code}</b></div>
                  </div>
                ) : activeSondage.type === 'texte' ? (
                  /* Word cloud / bubble view for text responses */
                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', minHeight: 120, padding: '12px 0' }}>
                      {freq.map(([mot, count], i) => {
                        const ratio = count / maxFreq
                        const size = 11 + ratio * 20
                        const color = COULEUR_POOL[i % COULEUR_POOL.length]
                        return (
                          <div key={mot} style={{
                            padding: `${4 + ratio * 6}px ${10 + ratio * 8}px`,
                            borderRadius: 99,
                            background: `${color}22`,
                            border: `1.5px solid ${color}55`,
                            color: color,
                            fontSize: size,
                            fontWeight: count > 1 ? 700 : 500,
                            transition: 'all 0.3s',
                            cursor: 'default',
                          }} title={`${count} réponse${count > 1 ? 's' : ''}`}>
                            {mot}
                            {count > 1 && <sup style={{ fontSize: 10, marginLeft: 4, opacity: 0.8 }}>×{count}</sup>}
                          </div>
                        )
                      })}
                    </div>
                    {/* Raw list */}
                    <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 8 }}>Toutes les réponses ({reponses.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                        {[...reponses].reverse().map((r, i) => (
                          <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: COULEUR_POOL[i % COULEUR_POOL.length], fontSize: 9, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                              {reponses.length - i}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.reponse}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Bar chart for multiple choice */
                  <div>
                    {(activeSondage.choix || []).map((choix, i) => {
                      const count = reponses.filter(r => r.reponse === choix).length
                      const pct = reponses.length > 0 ? Math.round(count / reponses.length * 100) : 0
                      const color = COULEUR_POOL[i % COULEUR_POOL.length]
                      return (
                        <div key={i} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{choix}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <div style={{ textAlign: 'center', color: 'var(--text-4)' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>Créez ou sélectionnez un sondage</div>
                <div style={{ fontSize: 13 }}>Les élèves répondent via QR code ou le code de 6 caractères</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  )
}
