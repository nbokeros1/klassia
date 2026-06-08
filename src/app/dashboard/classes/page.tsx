'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'
import { STATUT_LECON } from '@/lib/constants/statuts'

const COULEURS = [
  '#1B3F6E', '#6B3FA0', '#2D7DD2', '#2ECC71',
  '#E8634A', '#F39C12', '#C9A84C', '#0A7065',
]

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [leconsByClass, setLeconsByClass] = useState<Record<string, any[]>>({})
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
      let { data: p } = await supabase.from('utilisateurs').select('*').eq('user_id', user.id).single()
      if (!p) {
        const { data: nouveau } = await supabase.from('utilisateurs').upsert({
          user_id: user.id, email: user.email,
          prenom: user.user_metadata?.prenom || '',
          nom: user.user_metadata?.nom || '',
          ecole: user.user_metadata?.ecole || '',
          type_compte: 'enseignant', langue_interface: 'fr', langue_enseignement: 'fr',
        }, { onConflict: 'user_id' }).select().single()
        if (!nouveau) { router.push('/login'); return }
        p = nouveau
      }
      setProfil(p)

      const { data: cls } = await supabase.from('classes').select('*').eq('enseignant_id', p.id).order('created_at', { ascending: false })
      const clsList = cls || []
      setClasses(clsList)

      if (clsList.length > 0) {
        const classIds = clsList.map((c: any) => c.id)
        const { data: lecons } = await supabase.from('lecons').select('classe_id, statut').in('classe_id', classIds)
        const grouped = (lecons || []).reduce((acc: Record<string, any[]>, l) => {
          if (!acc[l.classe_id]) acc[l.classe_id] = []
          acc[l.classe_id].push(l)
          return acc
        }, {})
        setLeconsByClass(grouped)
      }

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
      nom: form.nom, niveau: form.niveau, matiere: form.matiere,
      nombre_eleves: parseInt(form.nombre_eleves) || 0,
      couleur: form.couleur, langue: form.langue,
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
      <Sidebar profil={profil} activeHref="/dashboard/classes" />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Mes classes</div>
            <div className="topbar-sub">{classes.length} classe{classes.length !== 1 ? 's' : ''} · Année 2025-2026</div>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nouvelle classe</button>
        </div>

        <div className="page-content fade-in">

          {/* Formulaire */}
          {showForm && (
            <div className="card fade-in" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ color: 'var(--text-1)' }}>Nouvelle classe</h3>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-4)', cursor: 'pointer' }}>✕</button>
              </div>
              <form onSubmit={handleCreate}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Nom de la classe *</label>
                    <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Français 3e A" required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Niveau *</label>
                    <input value={form.niveau} onChange={e => setForm({ ...form, niveau: e.target.value })} placeholder="Ex: Secondaire 3" required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Matière *</label>
                    <input value={form.matiere} onChange={e => setForm({ ...form, matiere: e.target.value })} placeholder="Ex: Français" required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Nombre d'élèves</label>
                    <input type="number" value={form.nombre_eleves} onChange={e => setForm({ ...form, nombre_eleves: e.target.value })} placeholder="Ex: 28" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Couleur</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {COULEURS.map(c => (
                      <div key={c} onClick={() => setForm({ ...form, couleur: c })}
                        style={{ width: '30px', height: '30px', borderRadius: '50%', background: c, cursor: 'pointer', border: form.couleur === c ? '3px solid var(--text-1)' : '3px solid transparent', transition: 'all 0.15s' }} />
                    ))}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Langue d'enseignement</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {[{ v: 'fr', l: '🇫🇷 Français' }, { v: 'en', l: '🇨🇦 English' }].map(lang => (
                      <button key={lang.v} type="button" onClick={() => setForm({ ...form, langue: lang.v })}
                        style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: `2px solid ${form.langue === lang.v ? 'var(--violet)' : 'var(--border)'}`, background: form.langue === lang.v ? 'var(--violet-pale)' : 'rgba(255,255,255,0.03)', color: form.langue === lang.v ? '#A78BFA' : 'var(--text-3)', fontSize: '13px', fontWeight: form.langue === lang.v ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                        {lang.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" disabled={saving} className="btn-primary" style={{ opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Création...' : 'Créer la classe'}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Annuler</button>
                </div>
              </form>
            </div>
          )}

          {/* Vide */}
          {classes.length === 0 && !showForm && (
            <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
              <div style={{ fontSize: '52px', marginBottom: '14px' }}>🏫</div>
              <h3 style={{ marginBottom: '6px' }}>Aucune classe encore</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '24px' }}>
                Crée ta première classe pour organiser ton année scolaire et générer tes leçons
              </p>
              <button className="btn-primary" onClick={() => setShowForm(true)}>+ Créer ma première classe</button>
            </div>
          )}

          {/* Grille des classes */}
          {classes.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {classes.map(cls => {
                const lecons = leconsByClass[cls.id] || []
                const done = lecons.filter((l: any) => l.statut === 'complete').length
                const enseignees = lecons.filter((l: any) => ['enseignee', 'complete'].includes(l.statut)).length
                const pretes = lecons.filter((l: any) => l.statut === 'prete').length
                const pct = lecons.length > 0 ? Math.round((enseignees / lecons.length) * 100) : 0

                return (
                  <div key={cls.id} className="class-card"
                    style={{ '--card-accent': cls.couleur || 'var(--blue)', padding: 0, overflow: 'hidden' } as any}>

                    {/* Bande colorée */}
                    <div style={{ height: 6, background: cls.couleur || 'var(--blue)' }} />

                    <div style={{ padding: '14px' }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: cls.couleur || 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: 'white', flexShrink: 0 }}>
                            {cls.nom?.[0]?.toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.nom}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{cls.niveau} · {cls.matiere}</div>
                          </div>
                        </div>
                        {cls.curriculum_charge
                          ? <span className="badge badge-green" style={{ fontSize: '9px', flexShrink: 0 }}>✓ Curriculum</span>
                          : <span className="badge" style={{ fontSize: '9px', background: 'rgba(251,195,74,0.12)', color: '#FBC34A', border: '1px solid rgba(251,195,74,0.2)', flexShrink: 0 }}>Sans curriculum</span>
                        }
                      </div>

                      {/* Stats */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '5px', marginBottom: '12px' }}>
                        {([
                          { icon: '👥', v: cls.nombre_eleves || 0, l: 'Élèves',  c: '#60A5FA' },
                          { icon: '📄', v: lecons.length,           l: 'Leçons',  c: '#A78BFA' },
                          { icon: '✅', v: pretes,                   l: 'Prêtes',  c: '#FBC34A' },
                          { icon: '📊', v: `${pct}%`,               l: 'Prog.',   c: pct >= 80 ? '#34D399' : pct >= 40 ? '#60A5FA' : '#94A3B8' },
                        ] as const).map((s, i) => (
                          <div key={i} style={{ textAlign: 'center', padding: '6px 4px', background: 'rgba(255,255,255,0.04)', borderRadius: '7px' }}>
                            <div style={{ fontSize: '11px', marginBottom: '2px' }}>{s.icon}</div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.v}</div>
                            <div style={{ fontSize: '9px', color: 'var(--text-4)', marginTop: '2px' }}>{s.l}</div>
                          </div>
                        ))}
                      </div>

                      {/* Barre de progression */}
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '99px', overflow: 'hidden', marginBottom: '6px' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#34D399' : `linear-gradient(90deg, ${cls.couleur || '#A78BFA'}, #34D399)`, borderRadius: '99px', transition: 'width 0.6s ease' }} />
                        </div>
                        {/* Message contextuel */}
                        {!cls.curriculum_charge ? (
                          <div style={{ fontSize: '11px', color: '#F97316', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>⚠️</span><span>Charger le curriculum</span>
                          </div>
                        ) : lecons.length === 0 ? (
                          <div style={{ fontSize: '11px', color: '#34D399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>✓</span><span>Prêt à créer des leçons</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>✓</span><span>{lecons.length} leçon{lecons.length !== 1 ? 's' : ''} planifiée{lecons.length !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => router.push(`/dashboard/classes/${cls.id}`)}
                          style={{ flex: 1, padding: '8px 0', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}>
                          📂 Ouvrir
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/gerer/enseigner?classe=${cls.id}`)}
                          style={{ flex: 1, padding: '8px 0', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: 'rgba(37,99,235,0.18)', border: '1px solid rgba(37,99,235,0.35)', color: '#60A5FA', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.28)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.18)')}>
                          ▶ Enseigner
                        </button>
                      </div>
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
