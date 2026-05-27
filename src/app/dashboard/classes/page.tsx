'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'

const COULEURS = [
  '#1B3F6E', '#6B3FA0', '#2D7DD2', '#2ECC71',
  '#E8634A', '#F39C12', '#C9A84C', '#0A7065',
]

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [profil, setProfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nom: '', niveau: '', matiere: '',
    nombre_eleves: '', couleur: '#1B3F6E', langue: 'fr',
  })
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const user = session.user
      let { data: profil } = await supabase
        .from('utilisateurs').select('*')
        .eq('user_id', user.id).single()
      if (!profil) {
        const { data: nouveau } = await supabase.from('utilisateurs').upsert({
          user_id: user.id, email: user.email,
          prenom: user.user_metadata?.prenom || '',
          nom: user.user_metadata?.nom || '',
          ecole: user.user_metadata?.ecole || '',
          type_compte: 'enseignant', langue_interface: 'fr', langue_enseignement: 'fr',
        }, { onConflict: 'user_id' }).select().single()
        if (!nouveau) { router.push('/login'); return }
        profil = nouveau
      }
      setProfil(profil)
      const { data: cls } = await supabase
        .from('classes').select('*')
        .eq('enseignant_id', profil.id)
        .order('created_at', { ascending: false })
      setClasses(cls || [])
      setLoading(false)
    }
    init()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profil?.id) return
    setSaving(true)
    const { data, error } = await supabase.from('classes').insert({
      enseignant_id: profil.id,
      nom: form.nom,
      niveau: form.niveau,
      matiere: form.matiere,
      nombre_eleves: parseInt(form.nombre_eleves) || 0,
      couleur: form.couleur,
      langue: form.langue,
      annee_scolaire: '2025-2026',
    }).select().single()

    if (!error && data) {
      setClasses(prev => [data, ...prev])
      setShowForm(false)
      setForm({ nom: '', niveau: '', matiere: '', nombre_eleves: '', couleur: '#1B3F6E', langue: 'fr' })
    }
    setSaving(false)
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="app-layout">

      {/* Sidebar */}
      <Sidebar profil={profil} activeHref="/dashboard/classes" />

      {/* Main */}
      <div className="main-content">

        {/* Topbar */}
        <div className="topbar">
          <div>
            <div className="topbar-title">Mes classes</div>
            <div className="topbar-sub">
              {classes.length} classe{classes.length !== 1 ? 's' : ''} · Année 2025-2026
            </div>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Nouvelle classe
          </button>
        </div>

        <div className="page-content fade-in">

          {/* Formulaire création */}
          {showForm && (
            <div className="card fade-in" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ color: 'var(--text-1)' }}>Nouvelle classe</h3>
                <button onClick={() => setShowForm(false)}
                  style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-4)', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Nom de la classe *</label>
                    <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                      placeholder="Ex: Français 3e A" required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Niveau *</label>
                    <input value={form.niveau} onChange={e => setForm({ ...form, niveau: e.target.value })}
                      placeholder="Ex: Secondaire 3" required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Matière *</label>
                    <input value={form.matiere} onChange={e => setForm({ ...form, matiere: e.target.value })}
                      placeholder="Ex: Français" required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Nombre d'élèves</label>
                    <input type="number" value={form.nombre_eleves}
                      onChange={e => setForm({ ...form, nombre_eleves: e.target.value })}
                      placeholder="Ex: 28" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Couleur</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {COULEURS.map(c => (
                      <div key={c} onClick={() => setForm({ ...form, couleur: c })}
                        style={{
                          width: '30px', height: '30px', borderRadius: '50%',
                          background: c, cursor: 'pointer',
                          border: form.couleur === c ? '3px solid var(--text-1)' : '3px solid transparent',
                          boxShadow: form.couleur === c ? '0 0 0 1px white inset' : 'none',
                          transition: 'all 0.15s',
                        }} />
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Langue d'enseignement</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {[{ v: 'fr', l: '🇫🇷 Français' }, { v: 'en', l: '🇨🇦 English' }].map(lang => (
                      <button key={lang.v} type="button"
                        onClick={() => setForm({ ...form, langue: lang.v })}
                        style={{
                          flex: 1, padding: '10px',
                          borderRadius: 'var(--radius-sm)',
                          border: `2px solid ${form.langue === lang.v ? 'var(--violet)' : 'var(--border)'}`,
                          background: form.langue === lang.v ? 'var(--violet-pale)' : 'rgba(255,255,255,0.03)',
                          color: form.langue === lang.v ? '#A78BFA' : 'var(--text-3)',
                          fontSize: '13px', fontWeight: form.langue === lang.v ? 600 : 400,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        {lang.l}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" disabled={saving} className="btn-primary"
                    style={{ opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Création...' : 'Créer la classe'}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Liste vide */}
          {classes.length === 0 && !showForm && (
            <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
              <div style={{ fontSize: '52px', marginBottom: '14px' }}>🏫</div>
              <h3 style={{ marginBottom: '6px' }}>Aucune classe encore</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '24px' }}>
                Crée ta première classe pour organiser ton année scolaire et générer tes leçons
              </p>
              <button className="btn-primary" onClick={() => setShowForm(true)}>
                + Créer ma première classe
              </button>
            </div>
          )}

          {/* Grille des classes */}
          {classes.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {classes.map((cls) => (
                <div key={cls.id}
                  onClick={() => router.push(`/dashboard/classes/${cls.id}`)}
                  className="class-card"
                  style={{ '--card-accent': cls.couleur || 'var(--blue)' } as any}>

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '11px',
                        background: cls.couleur || 'var(--blue)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px', fontWeight: 700, color: 'white',
                        boxShadow: `0 4px 12px ${cls.couleur || '#1B3F6E'}40`,
                      }}>
                        {cls.nom?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>
                          {cls.nom}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                          {cls.niveau} · {cls.matiere}
                        </div>
                      </div>
                    </div>
                    <span className="badge badge-blue">En cours</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-1)' }}>{cls.nombre_eleves || 0}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-4)' }}>élèves</div>
                      </div>
                      <div style={{ width: '1px', background: 'var(--border)' }} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-1)' }}>0</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-4)' }}>leçons</div>
                      </div>
                      <div style={{ width: '1px', background: 'var(--border)' }} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: cls.curriculum_charge ? 'var(--green)' : 'var(--text-4)' }}>
                          {cls.curriculum_charge ? '✓' : '—'}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-4)' }}>curriculum</div>
                      </div>
                    </div>
                  </div>

                  {/* Barre de progression */}
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: '0%',
                      background: cls.couleur || 'var(--blue)',
                      borderRadius: '99px', transition: 'width 0.5s',
                    }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-4)' }}>
                      {cls.curriculum_charge ? 'Programme généré' : 'Upload le curriculum pour commencer'}
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-4)' }}>›</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}