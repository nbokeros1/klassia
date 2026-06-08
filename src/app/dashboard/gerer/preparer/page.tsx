'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'
import ApercuGeneration from '@/components/ApercuGeneration'

// ─── Types ────────────────────────────────────────────────────────────────────

type StatutLecon = 'brouillon' | 'prete' | 'en_cours' | 'enseignee' | 'complete' | 'a_revoir' | 'archivee'

const STATUT_CFG: Record<StatutLecon, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: '#94A3B8' },
  prete:     { label: 'Prête',     color: '#60A5FA' },
  en_cours:  { label: 'En cours',  color: '#FBC34A' },
  enseignee: { label: 'Enseignée', color: '#A78BFA' },
  complete:  { label: 'Terminée',  color: '#34D399' },
  a_revoir:  { label: 'À revoir',  color: '#F87171' },
  archivee:  { label: 'Archivée',  color: '#475569' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PreparerPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  const [profil,    setProfil]    = useState<any>(null)
  const [classes,   setClasses]   = useState<any[]>([])
  const [classeId,  setClasseId]  = useState<string>('')
  const [sequences, setSequences] = useState<any[]>([])
  const [plans,     setPlans]     = useState<any[]>([])
  const [eleves,    setEleves]    = useState<any[]>([])
  const [memoire,   setMemoire]   = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)

  // Expanded sequences
  const [expanded,  setExpanded]  = useState<Set<string>>(new Set())

  // Panel génération
  const [panelPlan, setPanelPlan] = useState<any | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [apercuData, setApercuData] = useState<{ content: string; type: string; titre?: string } | null>(null)

  // Form options
  const [duree,     setDuree]     = useState(60)
  const [differenc, setDifferenc] = useState(false)
  const [elevesSelected, setElevesSelected] = useState<string[]>([])
  const [memoireSelected, setMemoireSelected] = useState<string[]>([])

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await supabase.from('utilisateurs').select('*').eq('user_id', session.user.id).single()
      if (!p) return
      setProfil(p)
      const { data: cls } = await supabase.from('classes').select('*').eq('enseignant_id', p.id).order('created_at', { ascending: false })
      const list = cls || []
      setClasses(list)
      const initClasse = searchParams?.get('classe') || list[0]?.id || ''
      setClasseId(initClasse)
      setLoading(false)
    }
    init()
  }, [])

  // ── Reload when classe changes ─────────────────────────────────────────────
  useEffect(() => {
    if (!classeId || !profil) return
    const load = async () => {
      const [{ data: seqs }, { data: pl }, { data: elv }, { data: mem }] = await Promise.all([
        supabase.from('lecons').select('*').eq('classe_id', classeId).eq('type_document', 'plan_sequence').order('numero'),
        supabase.from('lecons').select('*').eq('classe_id', classeId).eq('type_document', 'plan_lecon').order('numero'),
        supabase.from('eleves').select('*').eq('classe_id', classeId).order('nom'),
        supabase.from('studio_ia_memoire').select('id,cle,type,contenu,created_at').eq('enseignant_id', profil.id).order('created_at', { ascending: false }).limit(20),
      ])
      setSequences(seqs || [])
      setPlans(pl || [])
      setEleves(elv || [])
      setMemoire(mem || [])
    }
    load()
  }, [classeId, profil])

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  const toggleSeq = (id: string) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const openPanel = (plan: any) => {
    setPanelPlan(plan)
    setPanelOpen(true)
    setApercuData(null)
    setGenerating(false)
  }

  const handleGenerer = async () => {
    if (!panelPlan || !profil) return
    setGenerating(true)
    setApercuData(null)
    const classe = classes.find(c => c.id === classeId)
    try {
      const res = await fetch('/api/ia/generer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enseignant_id:    profil.id,
          classe_id:        classeId,
          type_contenu:     'lecon_complete',
          titre:            panelPlan.titre,
          sujet:            panelPlan.sujet || '',
          duree_minutes:    duree,
          matiere:          classe?.matiere,
          niveau:           classe?.niveau,
          langue:           classe?.langue || 'fr',
          differentiation:  differenc,
          eleves_besoins:   differenc ? elevesSelected.map(id => eleves.find(e => e.id === id)).filter(Boolean) : [],
          contexte_studio:  memoireSelected,
          profil_ia:        profil.profil_ia || {},
          gabarit_url:      profil.gabarit_lecon_url || '',
          contenu_plan:     panelPlan.contenu_json || {},
        }),
      })
      const data = await res.json()
      if (data.contenu) setApercuData({ content: data.contenu, type: 'lecon_complete' })
    } catch {
      // keep generating state visible to user, reset on retry
    }
    setGenerating(false)
  }

  const handleValiderLecon = async (contenu: string) => {
    if (!profil || !classeId) return
    const classe = classes.find(c => c.id === classeId)
    const nextNumero = Math.max(...plans.map((p: any) => p.numero || 0), 0) + 1
    const { data } = await supabase.from('lecons').insert({
      enseignant_id: profil.id,
      classe_id:     classeId,
      numero:        nextNumero,
      titre:         panelPlan?.titre || 'Nouvelle leçon',
      duree_minutes: duree,
      statut:        'prete',
      type_document: 'lecon_complete',
      contenu_json:  (() => { try { return JSON.parse(contenu) } catch { return { notes_enseignant: contenu } } })(),
    }).select().single()
    if (data) router.push(`/dashboard/classes/${classeId}/lecons/${data.id}`)
    setPanelOpen(false)
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="app-layout">
      <style>{`
        .prep-accordion { border:1.5px solid rgba(255,255,255,0.07); border-radius:12px; overflow:hidden; margin-bottom:10px; }
        .prep-seq-header { display:flex; align-items:center; gap:12px; padding:14px 16px; cursor:pointer; transition:background 0.15s; }
        .prep-seq-header:hover { background:rgba(255,255,255,0.04); }
        .prep-plan-row { display:flex; align-items:center; gap:10px; padding:10px 16px; border-top:1px solid rgba(255,255,255,0.05); background:rgba(0,0,0,0.1); transition:background 0.12s; }
        .prep-plan-row:hover { background:rgba(255,255,255,0.03); }
        .gen-panel { position:fixed; top:0; right:0; width:460px; height:100vh; background:var(--bg-surface); border-left:1px solid rgba(255,255,255,0.1); z-index:300; display:flex; flex-direction:column; box-shadow:-12px 0 40px rgba(0,0,0,0.4); overflow-y:auto; }
      `}</style>

      <Sidebar profil={profil} activeHref="/dashboard/gerer/preparer" onLogout={handleLogout} />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">✏️ Préparer</div>
            <div className="topbar-sub">Plans de leçons · Séquences</div>
          </div>

          {/* Sélecteur classe */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 12, color: 'var(--text-4)' }}>Classe :</label>
            <select value={classeId} onChange={e => setClasseId(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 13, outline: 'none' }}>
              {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
        </div>

        <div className="page-content fade-in">
          {classes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏫</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 16 }}>Créez d'abord une classe</div>
              <button onClick={() => router.push('/dashboard/classes')} className="btn-primary">Créer une classe</button>
            </div>
          ) : !classeId ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ fontSize: 13, color: 'var(--text-4)' }}>Sélectionnez une classe pour voir ses séquences</div>
            </div>
          ) : (
            <>
              {/* Sans séquences */}
              {sequences.length === 0 && plans.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 24px', border: '1.5px dashed rgba(255,255,255,0.1)', borderRadius: 14, marginBottom: 20 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                  <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 6 }}>Aucune séquence ni plan de leçon</div>
                  <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 20 }}>
                    Générez votre programme annuel depuis la classe, puis créez des plans de leçons ici.
                  </div>
                  <button onClick={() => router.push(`/dashboard/classes/${classeId}`)} className="btn-primary">
                    Ouvrir la classe
                  </button>
                </div>
              )}

              {/* Séquences avec plans imbriqués */}
              {sequences.length > 0 && sequences.map(seq => {
                const seqPlans = plans.filter(p => p.numero && p.numero > (seq.numero * 10) && p.numero <= ((seq.numero + 1) * 10))
                const isOpen = expanded.has(seq.id)
                return (
                  <div key={seq.id} className="prep-accordion">
                    <div className="prep-seq-header" onClick={() => toggleSeq(seq.id)}>
                      <span style={{ fontSize: 18 }}>📁</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{seq.titre}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{seqPlans.length} plan{seqPlans.length !== 1 ? 's' : ''} · {seq.duree_minutes} min</div>
                      </div>
                      <span style={{ fontSize: 14, color: 'var(--text-4)', transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>
                    </div>
                    {isOpen && (
                      <>
                        {seqPlans.map(plan => {
                          const sc = STATUT_CFG[plan.statut as StatutLecon] || STATUT_CFG.brouillon
                          return (
                            <div key={plan.id} className="prep-plan-row">
                              <span style={{ fontSize: 12, color: 'var(--text-4)', width: 20, flexShrink: 0, textAlign: 'right' }}>{plan.numero}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.titre}</div>
                                {plan.date_prevue && <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{new Date(plan.date_prevue).toLocaleDateString('fr-CA')}</div>}
                              </div>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', background: `${sc.color}22`, color: sc.color, borderRadius: 99, flexShrink: 0 }}>{sc.label}</span>
                              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                <button title="Aperçu plan" onClick={() => router.push(`/dashboard/classes/${classeId}/lecons/${plan.id}`)}
                                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6, color: 'var(--text-3)', fontSize: 12, cursor: 'pointer', padding: '5px 8px' }}>👁</button>
                                <button title="Modifier plan" onClick={() => router.push(`/dashboard/classes/${classeId}/lecons/${plan.id}`)}
                                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6, color: 'var(--text-3)', fontSize: 12, cursor: 'pointer', padding: '5px 8px' }}>✏️</button>
                                {(plan.statut === 'valide' || plan.statut === 'prete' || plan.statut === 'brouillon') && (
                                  <button title="Générer leçon" onClick={() => openPanel(plan)}
                                    style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 6, color: '#A78BFA', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '5px 10px', whiteSpace: 'nowrap' }}>
                                    ✨ Générer
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.05)' }}>
                          <button style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 12, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-4)'}
                            onClick={() => router.push(`/dashboard/classes/${classeId}`)}>
                            ➕ Nouveau plan
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}

              {/* Plans sans séquence */}
              {sequences.length === 0 && plans.length > 0 && (
                <div className="card">
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12 }}>Plans de leçons</div>
                  {plans.map(plan => {
                    const sc = STATUT_CFG[plan.statut as StatutLecon] || STATUT_CFG.brouillon
                    return (
                      <div key={plan.id} className="prep-plan-row" style={{ borderRadius: 8, marginBottom: 6 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{plan.titre}</div>
                          {plan.date_prevue && <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{new Date(plan.date_prevue).toLocaleDateString('fr-CA')}</div>}
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', background: `${sc.color}22`, color: sc.color, borderRadius: 99 }}>{sc.label}</span>
                        <button onClick={() => openPanel(plan)} style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 6, color: '#A78BFA', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '5px 10px' }}>
                          ✨ Générer
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Panneau génération ────────────────────────────────────────────── */}
      {panelOpen && panelPlan && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 299 }} onClick={() => { if (!generating) setPanelOpen(false) }} />
          <div className="gen-panel">
            <div style={{ padding: '20px 20px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Générer depuis le plan</div>
                <button onClick={() => setPanelOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 20, cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ fontSize: 12, color: '#A78BFA', marginTop: 4 }}>{panelPlan.titre}</div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {/* Options */}
              {!apercuData && !generating && (
                <>
                  {/* Durée */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>Durée</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[45, 60, 75, 90].map(d => (
                        <button key={d} onClick={() => setDuree(d)}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1.5px solid ${duree === d ? '#A78BFA' : 'var(--border)'}`, background: duree === d ? 'rgba(167,139,250,0.1)' : 'transparent', color: duree === d ? '#A78BFA' : 'var(--text-3)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                          {d} min
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Différenciation */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: differenc ? 12 : 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>Différenciation</div>
                      <div onClick={() => setDifferenc(d => !d)}
                        style={{ width: 32, height: 18, borderRadius: 99, background: differenc ? '#A78BFA' : 'rgba(255,255,255,0.15)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                        <div style={{ position: 'absolute', top: 2, left: differenc ? 14 : 2, width: 14, height: 14, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                      </div>
                    </div>
                    {differenc && eleves.filter(e => e.profil_type !== 'standard').length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {eleves.filter(e => e.profil_type !== 'standard').map(e => (
                          <button key={e.id} onClick={() => setElevesSelected(prev => prev.includes(e.id) ? prev.filter(i => i !== e.id) : [...prev, e.id])}
                            style={{ padding: '4px 10px', borderRadius: 99, border: `1px solid ${elevesSelected.includes(e.id) ? '#A78BFA' : 'var(--border)'}`, background: elevesSelected.includes(e.id) ? 'rgba(167,139,250,0.1)' : 'transparent', color: elevesSelected.includes(e.id) ? '#A78BFA' : 'var(--text-4)', fontSize: 11, cursor: 'pointer' }}>
                            {e.prenom} {e.nom}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ressources Studio IA */}
                  {memoire.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>Ressources à inclure</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {memoire.slice(0, 6).map(m => (
                          <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input type="checkbox" checked={memoireSelected.includes(m.id)}
                              onChange={e => setMemoireSelected(prev => e.target.checked ? [...prev, m.id] : prev.filter(i => i !== m.id))} />
                            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{m.contenu?.nom || m.cle}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{m.type}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={handleGenerer}
                    style={{ width: '100%', padding: '13px 0', borderRadius: 12, background: 'linear-gradient(135deg,#6B3FA0,#4F46E5)', border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    ✦ Générer avec l&apos;IA
                  </button>
                </>
              )}

              {/* En cours de génération */}
              {generating && (
                <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                  <div style={{ fontSize: 40, marginBottom: 16, color: '#A78BFA', animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>✦</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>Génération en cours…</div>
                  <div style={{ fontSize: 12, color: 'var(--text-4)' }}>Structure BienEnseigner + Bruner · {duree} min</div>
                </div>
              )}

              {/* Aperçu */}
              {apercuData && !generating && (
                <ApercuGeneration
                  titre={apercuData.titre || 'Contenu généré'}
                  type={apercuData.type as import('@/components/ApercuGeneration').TypeContenuApercu}
                  contenu_html={apercuData.content}
                  forfait={(profil?.forfait || 'gratuit') as import('@/lib/types/database').ForfaitType}
                  onValider={() => handleValiderLecon(apercuData.content)}
                  onRegenerer={handleGenerer}
                  onModifier={() => setApercuData(null)}
                  onClose={() => setApercuData(null)}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function PreparerPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PreparerPageInner />
    </Suspense>
  )
}
