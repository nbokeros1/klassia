'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'

const TYPES_CONTENU = [
  { id: 'tous', label: 'Tous', icon: '✦' },
  { id: 'fiche_lecon', label: 'Fiche de leçon', icon: '📄' },
  { id: 'quiz', label: 'Quiz', icon: '❓' },
  { id: 'evaluation', label: 'Évaluation', icon: '📊' },
  { id: 'differentiation', label: 'Différenciation', icon: '🎯' },
  { id: 'activite', label: 'Activité', icon: '🧩' },
  { id: 'plan_cours', label: 'Plan de cours', icon: '🗓️' },
  { id: 'communication', label: 'Communication', icon: '💬' },
]

export default function HistoriquePage() {
  const [profil, setProfil] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [generations, setGenerations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('tous')
  const [classeFiltre, setClasseFiltre] = useState('')
  const [recherche, setRecherche] = useState('')
  const [selectionne, setSelectionne] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const user = session.user
            const { data: profil } = await supabase.from('utilisateurs').select('*').eq('user_id', user.id).single()
      setProfil(profil)
      const { data: cls } = await supabase.from('classes').select('*').eq('enseignant_id', profil?.id)
      setClasses(cls || [])
      const { data: gens } = await supabase
        .from('generations_ia')
        .select('*')
        .eq('enseignant_id', profil?.id)
        .order('created_at', { ascending: false })
      setGenerations(gens || [])
      setLoading(false)
    }
    init()
  }, [])

  const handleDelete = async (id: string) => {
    await supabase.from('generations_ia').delete().eq('id', id)
    setGenerations(prev => prev.filter(g => g.id !== id))
    if (selectionne?.id === id) setSelectionne(null)
  }

  const handleToggleSave = async (gen: any) => {
    const newVal = !gen.sauvegarde
    await supabase.from('generations_ia').update({ sauvegarde: newVal }).eq('id', gen.id)
    setGenerations(prev => prev.map(g => g.id === gen.id ? { ...g, sauvegarde: newVal } : g))
    if (selectionne?.id === gen.id) setSelectionne({ ...gen, sauvegarde: newVal })
  }

  const handleCopy = (texte: string) => {
    navigator.clipboard.writeText(texte)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const generationsFiltrees = generations.filter(g => {
    if (filtre !== 'tous' && g.type_contenu !== filtre) return false
    if (classeFiltre && g.classe_id !== classeFiltre) return false
    if (recherche && !g.contenu_genere?.toLowerCase().includes(recherche.toLowerCase())) return false
    return true
  })

  const getTypeInfo = (type: string) => TYPES_CONTENU.find(t => t.id === type) || TYPES_CONTENU[0]

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000 / 60)
    if (diff < 60) return `Il y a ${diff} min`
    if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`
    return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/historique" />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Historique IA</div>
            <div className="topbar-sub">
              {generations.length} génération{generations.length !== 1 ? 's' : ''} · {generations.filter(g => g.sauvegarde).length} sauvegardée{generations.filter(g => g.sauvegarde).length !== 1 ? 's' : ''}
            </div>
          </div>
          <button className="btn-violet btn-sm" onClick={() => router.push('/dashboard/studio')}>
            ✦ Nouvelle génération
          </button>
        </div>

        <div className="page-content fade-in">

          {generations.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
              <div style={{ fontSize: '56px', marginBottom: '14px', opacity: 0.4 }}>✦</div>
              <h3 style={{ marginBottom: '8px' }}>Aucune génération encore</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>
                Utilise le Studio IA pour générer tes premières fiches, quiz et évaluations
              </p>
              <button className="btn-violet" onClick={() => router.push('/dashboard/studio')}>
                ✦ Ouvrir le Studio IA
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

              {/* Colonne gauche — liste */}
              <div>
                {/* Recherche et filtres */}
                <div style={{ marginBottom: '14px' }}>
                  <input
                    value={recherche}
                    onChange={e => setRecherche(e.target.value)}
                    placeholder="🔍 Rechercher dans les générations..."
                    style={{ marginBottom: '10px' }}
                  />
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {TYPES_CONTENU.slice(0, 4).map(t => (
                      <button key={t.id} onClick={() => setFiltre(t.id)}
                        style={{
                          padding: '5px 12px', borderRadius: '99px',
                          border: `1.5px solid ${filtre === t.id ? 'var(--violet)' : 'var(--border)'}`,
                          background: filtre === t.id ? 'var(--violet-pale)' : 'rgba(255,255,255,0.04)',
                          color: filtre === t.id ? 'var(--violet)' : 'var(--text-3)',
                          fontSize: '11px', fontWeight: filtre === t.id ? 600 : 400,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {TYPES_CONTENU.slice(4).map(t => (
                      <button key={t.id} onClick={() => setFiltre(t.id)}
                        style={{
                          padding: '5px 12px', borderRadius: '99px',
                          border: `1.5px solid ${filtre === t.id ? 'var(--violet)' : 'var(--border)'}`,
                          background: filtre === t.id ? 'var(--violet-pale)' : 'rgba(255,255,255,0.04)',
                          color: filtre === t.id ? 'var(--violet)' : 'var(--text-3)',
                          fontSize: '11px', fontWeight: filtre === t.id ? 600 : 400,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        {t.icon} {t.label}
                      </button>
                    ))}
                    <select value={classeFiltre} onChange={e => setClasseFiltre(e.target.value)}
                      style={{ padding: '5px 10px', borderRadius: '99px', border: '1.5px solid var(--border)', fontSize: '11px', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', outline: 'none' }}>
                      <option value="">Toutes les classes</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '8px' }}>
                    {generationsFiltrees.length} résultat{generationsFiltrees.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Liste */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                  {generationsFiltrees.map(gen => {
                    const typeInfo = getTypeInfo(gen.type_contenu)
                    const classe = classes.find(c => c.id === gen.classe_id)
                    const isSelected = selectionne?.id === gen.id
                    const preview = gen.contenu_genere?.substring(0, 120) + '...'

                    return (
                      <div key={gen.id}
                        onClick={() => setSelectionne(gen)}
                        style={{
                          background: isSelected ? 'var(--violet-light)' : 'rgba(255,255,255,0.04)',
                          border: `1.5px solid ${isSelected ? 'var(--violet)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-md)',
                          padding: '14px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>{typeInfo.icon}</span>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? 'var(--violet)' : 'var(--text-1)' }}>
                                {typeInfo.label}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-4)' }}>
                                {formatDate(gen.created_at)}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {gen.sauvegarde && (
                              <span style={{ fontSize: '10px', padding: '2px 7px', background: 'var(--green-pale)', color: 'var(--green)', borderRadius: '99px', fontWeight: 600 }}>
                                ★ Sauvegardé
                              </span>
                            )}
                          </div>
                        </div>
                        {classe && (
                          <span className="badge badge-blue" style={{ fontSize: '10px', marginBottom: '6px', display: 'inline-block' }}>
                            {classe.nom}
                          </span>
                        )}
                        <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.5 }}>
                          {preview}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Colonne droite — aperçu */}
              <div>
                {!selectionne ? (
                  <div style={{
                    height: '100%', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-4)', textAlign: 'center',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', padding: '48px',
                    minHeight: '400px',
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '14px', opacity: 0.3 }}>✦</div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-3)' }}>
                      Sélectionne une génération
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-4)', marginTop: '6px' }}>
                      pour voir le contenu complet
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                    position: 'sticky', top: '80px',
                  }}>
                    {/* Header aperçu */}
                    <div style={{
                      background: 'linear-gradient(135deg, var(--violet), #4A2882)',
                      padding: '16px 20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '3px' }}>
                          {getTypeInfo(selectionne.type_contenu).icon} {getTypeInfo(selectionne.type_contenu).label}
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                          {formatDate(selectionne.created_at)}
                          {classes.find(c => c.id === selectionne.classe_id) && ` · ${classes.find(c => c.id === selectionne.classe_id)?.nom}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleCopy(selectionne.contenu_genere)}
                          style={{
                            padding: '6px 12px', background: 'rgba(255,255,255,0.15)',
                            border: 'none', color: 'white', borderRadius: '6px',
                            fontSize: '11px', cursor: 'pointer', fontWeight: 500,
                          }}>
                          {copied ? '✓ Copié' : '📋 Copier'}
                        </button>
                        <button
                          onClick={() => handleToggleSave(selectionne)}
                          style={{
                            padding: '6px 12px',
                            background: selectionne.sauvegarde ? 'rgba(46,204,113,0.3)' : 'rgba(255,255,255,0.15)',
                            border: 'none', color: 'white', borderRadius: '6px',
                            fontSize: '11px', cursor: 'pointer', fontWeight: 500,
                          }}>
                          {selectionne.sauvegarde ? '★ Sauvegardé' : '☆ Sauvegarder'}
                        </button>
                        <button
                          onClick={() => handleDelete(selectionne.id)}
                          style={{
                            padding: '6px 10px', background: 'rgba(255,255,255,0.1)',
                            border: 'none', color: 'rgba(255,255,255,0.7)',
                            borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
                          }}>
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Contenu */}
                    <div style={{
                      padding: '20px', maxHeight: 'calc(100vh - 360px)',
                      overflowY: 'auto', fontSize: '13px', lineHeight: '1.8',
                      color: 'var(--text-1)', whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                    }}>
                      {selectionne.contenu_genere}
                    </div>

                    {/* Footer */}
                    <div style={{
                      padding: '12px 20px', borderTop: '1px solid var(--border)',
                      display: 'flex', gap: '8px',
                    }}>
                      <button onClick={() => handleCopy(selectionne.contenu_genere)} className="btn-ghost btn-sm">
                        📋 Copier le texte
                      </button>
                      <button onClick={() => router.push('/dashboard/studio')} className="btn-violet btn-sm">
                        ✦ Régénérer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}