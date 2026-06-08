'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'

const TYPES_MSG = [
  { id: 'note_parents', label: 'Note aux parents', icon: '👨‍👩‍👧' },
  { id: 'annonce_classe', label: 'Annonce classe', icon: '📢' },
  { id: 'rappel', label: 'Rappel', icon: '🔔' },
  { id: 'compte_rendu', label: 'Compte rendu', icon: '📝' },
]

export default function CommunicationPage() {
  const [profil, setProfil] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({
    type: 'note_parents', classe_id: '',
    sujet: '', contenu: '', date_envoi: '',
  })
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
      const { data: msgs } = await supabase.from('communications').select('*').eq('enseignant_id', profil?.id).order('created_at', { ascending: false })
      setMessages(msgs || [])
      setLoading(false)
    }
    init()
  }, [])

  const handleGenererIA = async () => {
    if (!form.sujet || !form.type) return
    setGenerating(true)
    const classe = classes.find(c => c.id === form.classe_id)
    try {
      const res = await fetch('/api/ia/generer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_contenu: 'communication',
          sujet: `${TYPES_MSG.find(t => t.id === form.type)?.label} : ${form.sujet}`,
          contexte: {
            classe: classe ? { nom: classe.nom, niveau: classe.niveau, matiere: classe.matiere } : null,
          },
          langue: classe?.langue || profil?.langue || 'fr',
          profil_ia: profil?.profil_ia || null,
          instructions: `Rédige un message professionnel de type "${TYPES_MSG.find(t => t.id === form.type)?.label}" pour l'école. Ton poli, bienveillant et clair.`,
        }),
      })
      const data = await res.json()
      setForm(f => ({ ...f, contenu: data.contenu || 'Configure la clé API pour utiliser cette fonctionnalité.' }))
    } catch {
      setForm(f => ({ ...f, contenu: 'Erreur de génération.' }))
    }
    setGenerating(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profil?.id) return
    const { data, error } = await supabase.from('communications').insert({
      enseignant_id: profil.id,
      classe_id: form.classe_id || null,
      type: form.type,
      sujet: form.sujet,
      contenu: form.contenu,
      date_envoi: form.date_envoi || null,
      statut: 'brouillon',
    }).select().single()
    if (!error && data) {
      setMessages(prev => [data, ...prev])
      setShowForm(false)
      setForm({ type: 'note_parents', classe_id: '', sujet: '', contenu: '', date_envoi: '' })
    }
  }

  const handleDelete = async (id: string) => {
    await supabase.from('communications').delete().eq('id', id)
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/communication" onLogout={handleLogout} />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Communication</div>
            <div className="topbar-sub">Notes aux parents · Annonces · Rappels</div>
          </div>
          <button className="btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Nouveau message</button>
        </div>

        <div className="page-content fade-in">

          {/* Formulaire */}
          {showForm && (
            <div className="card fade-in" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3>Nouveau message</h3>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-4)', cursor: 'pointer' }}>✕</button>
              </div>
              <form onSubmit={handleSave}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Type *</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      {TYPES_MSG.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Classe</label>
                    <select value={form.classe_id} onChange={e => setForm({ ...form, classe_id: e.target.value })}>
                      <option value="">Toutes les classes</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Date d'envoi</label>
                    <input type="date" value={form.date_envoi} onChange={e => setForm({ ...form, date_envoi: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Sujet *</label>
                  <input value={form.sujet} onChange={e => setForm({ ...form, sujet: e.target.value })} placeholder="Ex: Sortie scolaire du 15 mai" required />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Contenu *</label>
                    <button type="button" onClick={handleGenererIA} disabled={generating}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '4px 12px', background: 'var(--violet-light)',
                        color: 'var(--violet)', border: '1px solid rgba(107,63,160,0.2)',
                        borderRadius: '99px', fontSize: '11px', fontWeight: 600,
                        cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.7 : 1,
                      }}>
                      ✦ {generating ? 'Génération...' : 'Générer avec l\'IA'}
                    </button>
                  </div>
                  <textarea value={form.contenu} onChange={e => setForm({ ...form, contenu: e.target.value })}
                    placeholder="Rédigez votre message ou utilisez l'IA pour le générer..."
                    required rows={8}
                    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.7', outline: 'none', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn-primary btn-sm">💾 Sauvegarder</button>
                  <button type="button" onClick={() => {
                    navigator.clipboard.writeText(form.contenu)
                  }} className="btn-ghost btn-sm">📋 Copier</button>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setShowForm(false)}>Annuler</button>
                </div>
              </form>
            </div>
          )}

          {/* Liste messages */}
          {messages.length === 0 && !showForm ? (
            <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
              <div style={{ fontSize: '48px', marginBottom: '14px' }}>💬</div>
              <h3 style={{ marginBottom: '8px' }}>Aucun message encore</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>
                Crée des notes aux parents, annonces et rappels — l'IA peut t'aider à les rédiger
              </p>
              <button className="btn-primary" onClick={() => setShowForm(true)}>+ Créer un message</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map(msg => {
                const typeInfo = TYPES_MSG.find(t => t.id === msg.type)
                const classe = classes.find(c => c.id === msg.classe_id)
                return (
                  <div key={msg.id} className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '10px',
                          background: 'var(--blue-pale)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0,
                        }}>
                          {typeInfo?.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '3px' }}>{msg.sujet}</div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <span className="badge badge-blue">{typeInfo?.label}</span>
                            {classe && <span className="badge badge-violet">{classe.nom}</span>}
                            {msg.date_envoi && (
                              <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-3)' }}>
                                📅 {new Date(msg.date_envoi).toLocaleDateString('fr-CA')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => navigator.clipboard.writeText(msg.contenu)}
                          className="btn-ghost btn-sm">📋</button>
                        <button onClick={() => handleDelete(msg.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.7',
                      background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px', whiteSpace: 'pre-wrap',
                      maxHeight: '120px', overflow: 'hidden',
                    }}>
                      {msg.contenu}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}