'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'

const TYPES = [
  { id: 'tous', label: 'Tous', icon: '📁' },
  { id: 'document', label: 'Documents', icon: '📄' },
  { id: 'lien', label: 'Liens web', icon: '🔗' },
  { id: 'video', label: 'Vidéos', icon: '▶️' },
  { id: 'image', label: 'Images', icon: '🖼️' },
]

export default function RessourcesPage() {
  const [profil, setProfil] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [ressources, setRessources] = useState<any[]>([])
  const [filtre, setFiltre] = useState('tous')
  const [classeFiltre, setClasseFiltre] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fichier, setFichier] = useState<File | null>(null)
  const [form, setForm] = useState({
    titre: '', type: 'document', url: '',
    description: '', classe_id: '', tags: '',
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
      const { data: res } = await supabase.from('ressources').select('*').eq('enseignant_id', profil?.id).order('created_at', { ascending: false })
      setRessources(res || [])
      setLoading(false)
    }
    init()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profil?.id) return
    setUploading(true)

    let url = form.url
    let type = form.type

    if (fichier) {
      const fileName = `${profil.id}/${Date.now()}_${fichier.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ressources')
        .upload(fileName, fichier)

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('ressources').getPublicUrl(fileName)
        url = urlData.publicUrl
        if (fichier.type.includes('pdf')) type = 'document'
        else if (fichier.type.includes('image')) type = 'image'
        else if (fichier.type.includes('video')) type = 'video'
        else type = 'document'
      }
    }

    const { data, error } = await supabase.from('ressources').insert({
      enseignant_id: profil.id,
      classe_id: form.classe_id || null,
      titre: form.titre || fichier?.name || 'Sans titre',
      type,
      url,
      description: form.description,
      tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
    }).select().single()

    if (!error && data) {
      setRessources(prev => [data, ...prev])
      setShowForm(false)
      setForm({ titre: '', type: 'document', url: '', description: '', classe_id: '', tags: '' })
      setFichier(null)
    }
    setUploading(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('ressources').delete().eq('id', id)
    setRessources(prev => prev.filter(r => r.id !== id))
  }

  const ressourcesFiltrees = ressources.filter(r => {
    if (filtre !== 'tous' && r.type !== filtre) return false
    if (classeFiltre && r.classe_id !== classeFiltre) return false
    return true
  })

  const iconeType = (type: string) => {
    const t = TYPES.find(t => t.id === type)
    return t?.icon || '📁'
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/ressources" />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Ressources</div>
            <div className="topbar-sub">{ressources.length} ressource{ressources.length !== 1 ? 's' : ''} · Documents, liens, vidéos</div>
          </div>
          <button className="btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Ajouter une ressource</button>
        </div>

        <div className="page-content fade-in">

          {/* Formulaire */}
          {showForm && (
            <div className="card fade-in" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3>Nouvelle ressource</h3>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-4)', cursor: 'pointer' }}>✕</button>
              </div>

              <form onSubmit={handleAdd}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Titre</label>
                    <input value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })}
                      placeholder="Ex: Vidéo pronoms personnels" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Type</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      <option value="document">📄 Document</option>
                      <option value="lien">🔗 Lien web</option>
                      <option value="video">▶️ Vidéo</option>
                      <option value="image">🖼️ Image</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">URL / Lien web</label>
                    <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
                      placeholder="https://..." />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Classe associée</label>
                    <select value={form.classe_id} onChange={e => setForm({ ...form, classe_id: e.target.value })}>
                      <option value="">Toutes les classes</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </div>
                </div>

                {/* Zone upload fichier */}
                <div className="form-group">
                  <label className="form-label">Upload un fichier depuis ta machine</label>
                  <div style={{
                    border: `2px dashed ${fichier ? 'var(--green)' : 'var(--border-mid)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '24px', textAlign: 'center',
                    background: fichier ? 'var(--green-pale)' : 'rgba(255,255,255,0.04)',
                    transition: 'all 0.2s',
                  }}>
                    <input
                      type="file"
                      id="fichier-upload"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.mp4,.mov,.txt,.csv"
                      onChange={e => {
                        const f = e.target.files?.[0] || null
                        setFichier(f)
                        if (f && !form.titre) {
                          setForm(prev => ({ ...prev, titre: f.name.replace(/\.[^/.]+$/, '') }))
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="fichier-upload" style={{ cursor: 'pointer', display: 'block' }}>
                      {fichier ? (
                        <div>
                          <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--green)', marginBottom: '4px' }}>
                            {fichier.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                            {(fichier.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '36px', marginBottom: '10px' }}>📎</div>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '4px' }}>
                            Clique pour choisir un fichier
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-4)' }}>
                            PDF · Word · PowerPoint · Excel · Image · Vidéo
                          </div>
                        </div>
                      )}
                    </label>
                    {fichier && (
                      <button type="button"
                        onClick={() => setFichier(null)}
                        style={{ marginTop: '10px', background: 'none', border: 'none', fontSize: '12px', color: 'var(--text-3)', cursor: 'pointer' }}>
                        ✕ Retirer le fichier
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Description courte..." />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Tags (séparés par des virgules)</label>
                  <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                    placeholder="Ex: grammaire, pronoms, 9e année" />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn-primary btn-sm" disabled={uploading}
                    style={{ opacity: uploading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {uploading ? '⟳ Upload en cours...' : '💾 Ajouter la ressource'}
                  </button>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => {
                    setShowForm(false)
                    setFichier(null)
                    setForm({ titre: '', type: 'document', url: '', description: '', classe_id: '', tags: '' })
                  }}>
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filtres */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            {TYPES.map(t => (
              <button key={t.id} onClick={() => setFiltre(t.id)}
                style={{
                  padding: '6px 14px', borderRadius: '99px',
                  border: `1.5px solid ${filtre === t.id ? 'var(--blue)' : 'var(--border)'}`,
                  background: filtre === t.id ? 'var(--blue-pale)' : 'rgba(255,255,255,0.04)',
                  color: filtre === t.id ? 'var(--blue)' : 'var(--text-3)',
                  fontSize: '12px', fontWeight: filtre === t.id ? 600 : 400,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {t.icon} {t.label}
              </button>
            ))}
            <select value={classeFiltre} onChange={e => setClasseFiltre(e.target.value)}
              style={{
                padding: '6px 12px', borderRadius: '99px',
                border: '1.5px solid var(--border)', fontSize: '12px',
                background: 'var(--bg-elevated)', cursor: 'pointer', outline: 'none',
              }}>
              <option value="">Toutes les classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            {ressources.length > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--text-4)', marginLeft: 'auto' }}>
                {ressourcesFiltrees.length} résultat{ressourcesFiltrees.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Liste ressources */}
          {ressourcesFiltrees.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
              <div style={{ fontSize: '48px', marginBottom: '14px' }}>📁</div>
              <h3 style={{ marginBottom: '8px' }}>Aucune ressource</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>
                Ajoute tes premiers documents, liens ou vidéos
              </p>
              <button className="btn-primary" onClick={() => setShowForm(true)}>
                + Ajouter une ressource
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              {ressourcesFiltrees.map(r => {
                const classe = classes.find(c => c.id === r.classe_id)
                return (
                  <div key={r.id} className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '10px',
                        background: r.type === 'image' ? 'var(--amber-pale)' :
                          r.type === 'video' ? 'var(--coral-pale)' :
                          r.type === 'lien' ? 'var(--violet-light)' : 'var(--blue-pale)',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '22px', flexShrink: 0,
                      }}>
                        {iconeType(r.type)}
                      </div>
                      <button onClick={() => handleDelete(r.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', fontSize: '16px', padding: '2px' }}>
                        ✕
                      </button>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '4px' }}>
                      {r.titre}
                    </div>

                    {r.description && (
                      <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '8px', lineHeight: 1.5 }}>
                        {r.description}
                      </div>
                    )}

                    {/* Aperçu image */}
                    {r.type === 'image' && r.url && (
                      <div style={{ marginBottom: '10px', borderRadius: '6px', overflow: 'hidden', height: '80px' }}>
                        <img src={r.url} alt={r.titre}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}

                    {/* Badges */}
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      {classe && (
                        <span className="badge badge-blue">{classe.nom}</span>
                      )}
                      {(r.tags || []).map((tag: string, i: number) => (
                        <span key={i} style={{
                          fontSize: '10px', padding: '2px 7px',
                          background: 'rgba(255,255,255,0.06)', color: 'var(--text-3)',
                          borderRadius: '99px', border: '1px solid var(--border)',
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Boutons action */}
                    {r.url && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <a href={r.url} target="_blank" rel="noopener noreferrer"
                          style={{
                            flex: 1, textAlign: 'center', fontSize: '11px',
                            color: '#60A5FA', textDecoration: 'none',
                            padding: '6px', background: 'var(--blue-pale)',
                            borderRadius: '6px', fontWeight: 500,
                          }}>
                          🔗 Ouvrir
                        </a>
                        <a href={r.url} download
                          style={{
                            flex: 1, textAlign: 'center', fontSize: '11px',
                            color: 'var(--text-2)', textDecoration: 'none',
                            padding: '6px', background: 'rgba(255,255,255,0.06)',
                            border: '1px solid var(--border)', borderRadius: '6px',
                          }}>
                          ⬇ Télécharger
                        </a>
                      </div>
                    )}
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