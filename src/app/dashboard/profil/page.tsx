'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'

const PROVINCES = [
  'Alberta', 'Colombie-Britannique', 'Manitoba', 'Nouveau-Brunswick',
  'Terre-Neuve-et-Labrador', 'Nouvelle-Écosse', 'Ontario', 'Île-du-Prince-Édouard',
  'Québec', 'Saskatchewan', 'Territoires du Nord-Ouest', 'Nunavut', 'Yukon',
]

export default function ProfilPage() {
  const [profil, setProfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)
  const [form, setForm] = useState({
    prenom: '', nom: '', ecole: '', ville: '',
    province: 'Québec', telephone: '', bio: '',
  })
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await supabase.from('utilisateurs').select('*').eq('user_id', session.user.id).single()
      setProfil(p)
      if (p) {
        setForm({
          prenom: p.prenom || '',
          nom: p.nom || '',
          ecole: p.ecole || '',
          ville: p.ville || '',
          province: p.province || 'Québec',
          telephone: p.telephone || '',
          bio: p.bio || '',
        })
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profil?.id) return
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('utilisateurs').update(form).eq('id', profil.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    setProfil({ ...profil, ...form })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    if (pwForm.next !== pwForm.confirm) { setPwError('Les mots de passe ne correspondent pas.'); return }
    if (pwForm.next.length < 8) { setPwError('Le mot de passe doit avoir au moins 8 caractères.'); return }
    const { error: err } = await supabase.auth.updateUser({ password: pwForm.next })
    if (err) { setPwError(err.message); return }
    setPwForm({ current: '', next: '', confirm: '' })
    setPwSaved(true)
    setTimeout(() => setPwSaved(false), 3000)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <LoadingScreen />

  const initiales = `${profil?.prenom?.[0] || ''}${profil?.nom?.[0] || ''}`.toUpperCase()

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="" />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Mon profil</div>
            <div className="topbar-sub">Informations personnelles · Sécurité</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {saved && (
              <span style={{ fontSize: '12px', padding: '6px 12px', background: 'var(--green-pale)', color: 'var(--green)', borderRadius: 'var(--radius-sm)' }}>
                ✓ Profil sauvegardé
              </span>
            )}
            <button onClick={handleSignOut} className="btn-ghost btn-sm" style={{ color: 'var(--text-3)' }}>
              ⏻ Déconnexion
            </button>
          </div>
        </div>

        <div className="page-content fade-in" style={{ maxWidth: '760px' }}>

          {/* Avatar card */}
          <div className="card" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--violet), #4A2882)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', fontWeight: 700, color: 'white', flexShrink: 0,
            }}>
              {initiales || '?'}
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>
                {profil?.prenom} {profil?.nom}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '6px' }}>{profil?.ecole}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-4)' }}>{profil?.email}</div>
            </div>
          </div>

          {/* Infos personnelles */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ marginBottom: '16px' }}>Informations personnelles</h3>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Prénom *</label>
                  <input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} required placeholder="Ton prénom" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nom *</label>
                  <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} required placeholder="Ton nom de famille" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">École</label>
                  <input value={form.ecole} onChange={e => setForm({ ...form, ecole: e.target.value })} placeholder="Nom de ton école" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Téléphone</label>
                  <input value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} placeholder="(514) 000-0000" type="tel" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ville</label>
                  <input value={form.ville} onChange={e => setForm({ ...form, ville: e.target.value })} placeholder="Montréal, Ottawa..." />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Province</label>
                  <select value={form.province} onChange={e => setForm({ ...form, province: e.target.value })}>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Bio / Note professionnelle</label>
                <textarea
                  value={form.bio}
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                  placeholder="Ex: Enseignant de mathématiques depuis 10 ans, spécialisé en pédagogie différenciée..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.6', outline: 'none', resize: 'vertical', background: 'var(--bg-elevated)', color: 'var(--text-1)' }}
                />
              </div>
              {error && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: '#F87171', marginBottom: '12px' }}>
                  {error}
                </div>
              )}
              <button type="submit" className="btn-primary btn-sm" disabled={saving}>
                {saving ? '⟳ Sauvegarde...' : '💾 Sauvegarder'}
              </button>
            </form>
          </div>

          {/* Changer mot de passe */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ marginBottom: '4px' }}>Sécurité</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px' }}>Modifier ton mot de passe</p>
            <form onSubmit={handlePasswordChange}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={pwForm.next}
                    onChange={e => setPwForm({ ...pwForm, next: e.target.value })}
                    placeholder="Au moins 8 caractères"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    value={pwForm.confirm}
                    onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                    placeholder="Répète le mot de passe"
                  />
                </div>
              </div>
              {pwError && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: '#F87171', marginTop: '10px', marginBottom: '4px' }}>
                  {pwError}
                </div>
              )}
              {pwSaved && (
                <div style={{ padding: '10px 14px', background: 'var(--green-pale)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--green)', marginTop: '10px', marginBottom: '4px' }}>
                  ✓ Mot de passe mis à jour
                </div>
              )}
              <button type="submit" className="btn-ghost btn-sm" style={{ marginTop: '12px' }}>
                🔒 Changer le mot de passe
              </button>
            </form>
          </div>

          {/* Liens rapides */}
          <div className="card">
            <h3 style={{ marginBottom: '12px' }}>Accès rapide</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => router.push('/dashboard/profil-ia')} className="btn-ghost btn-sm">
                🧠 Mon profil IA
              </button>
              <button onClick={() => router.push('/dashboard/studio')} className="btn-ghost btn-sm">
                ✦ Studio IA
              </button>
              <button onClick={() => router.push('/dashboard/classes')} className="btn-ghost btn-sm">
                🏫 Mes classes
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
