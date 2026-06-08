// @deprecated — contenu intégré dans /dashboard/studio-ia (onglet "Mon profil IA"). Conservé pour rétrocompatibilité des URLs.
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'

const STYLES_PEDA = [
  { id: 'explicite', label: 'Enseignement explicite', desc: 'Modélisation claire, étapes structurées, exemples concrets' },
  { id: 'socioconstructiviste', label: 'Socioconstructiviste', desc: 'Apprentissage collaboratif, travail en équipe, discussion' },
  { id: 'differentie', label: 'Différencié', desc: 'Adaptation selon les besoins, niveaux multiples' },
  { id: 'par_projet', label: 'Par projet', desc: 'Apprentissage par l\'expérience et la création' },
  { id: 'mixte', label: 'Mixte / Flexible', desc: 'Combinaison selon le contexte et les besoins' },
]

const NIVEAUX = [
  'Maternelle', '1re année', '2e année', '3e année', '4e année', '5e année', '6e année',
  '7e année', '8e année', '9e année', '10e année', '11e année', '12e année',
  'Secondaire 1', 'Secondaire 2', 'Secondaire 3', 'Secondaire 4', 'Secondaire 5',
  'Cégep', 'Université',
]

const MATIERES = [
  'Français', 'English', 'Mathématiques', 'Sciences', 'Histoire', 'Géographie',
  'Arts plastiques', 'Musique', 'Éducation physique', 'Informatique', 'Philosophie', 'Autre',
]

export default function ProfilIAPage() {
  const [profil, setProfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    style_peda: 'explicite',
    niveaux: [] as string[],
    matieres: [] as string[],
    duree_typique: '75',
    groupes_typiques: '25',
    inclure_differentiation: true,
    inclure_evaluation: true,
    inclure_vocabulaire: true,
    inclure_perspective_autochtone: false,
    langue_ia: 'fr',
    ton_ia: 'professionnel',
    instructions_perso: '',
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
      if (profil?.profil_ia) {
        setForm({ ...form, ...profil.profil_ia })
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('utilisateurs').update({ profil_ia: form }).eq('id', profil.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const toggleItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]

  const Toggle = ({ val, onChange, label, desc }: any) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>{label}</div>
        {desc && <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>{desc}</div>}
      </div>
      <div onClick={onChange} style={{
        width: '40px', height: '22px', borderRadius: '99px',
        background: val ? 'var(--violet)' : 'var(--border)',
        display: 'flex', alignItems: 'center', padding: '3px',
        cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{
          width: '16px', height: '16px', borderRadius: '50%', background: 'white',
          transform: val ? 'translateX(18px)' : 'translateX(0)',
          transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
    </div>
  )

  if (loading) return <LoadingScreen />

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/profil-ia" onLogout={async () => { await supabase.auth.signOut(); router.push('/login') }} />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">IA Enseignant</div>
            <div className="topbar-sub">Ton profil pédagogique · KlassIA+ adapte chaque génération à ton style</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {saved && (
              <span style={{ fontSize: '12px', padding: '6px 12px', background: 'var(--green-pale)', color: 'var(--green)', borderRadius: 'var(--radius-sm)' }}>
                ✓ Profil sauvegardé
              </span>
            )}
          </div>
        </div>

        <div className="page-content fade-in">

          {/* Bandeau info */}
          <div style={{
            background: 'linear-gradient(135deg, var(--violet-light), var(--violet-pale))',
            border: '1px solid rgba(107,63,160,0.15)',
            borderRadius: 'var(--radius-lg)', padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '14px',
            marginBottom: '20px',
          }}>
            <div style={{ fontSize: '32px' }}>🧠</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--violet)', marginBottom: '4px' }}>
                Mémoire pédagogique de KlassIA+
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                Ces préférences sont utilisées automatiquement par KlassIA+ pour personnaliser chaque génération à ton style d'enseignement. Plus tu complètes ce profil, plus les résultats seront pertinents.
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px' }}>

            {/* Style pédagogique */}
            <div className="card">
              <h3 style={{ marginBottom: '4px' }}>Style pédagogique</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px' }}>
                Comment préfères-tu structurer tes leçons ?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {STYLES_PEDA.map(s => (
                  <div key={s.id}
                    onClick={() => setForm({ ...form, style_peda: s.id })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                      border: `2px solid ${form.style_peda === s.id ? 'var(--violet)' : 'var(--border)'}`,
                      background: form.style_peda === s.id ? 'var(--violet-pale)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      border: `2px solid ${form.style_peda === s.id ? 'var(--violet)' : 'var(--border)'}`,
                      background: form.style_peda === s.id ? 'var(--violet)' : 'rgba(255,255,255,0.08)',
                      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {form.style_peda === s.id && (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: form.style_peda === s.id ? 'var(--violet)' : 'var(--text-1)' }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Niveaux enseignés */}
            <div className="card">
              <h3 style={{ marginBottom: '4px' }}>Niveaux enseignés</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '14px' }}>
                Sélectionne tous les niveaux que tu enseignes
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                {NIVEAUX.map(n => (
                  <button key={n} type="button"
                    onClick={() => setForm({ ...form, niveaux: toggleItem(form.niveaux, n) })}
                    style={{
                      padding: '6px 13px', borderRadius: '99px',
                      border: `1.5px solid ${form.niveaux.includes(n) ? '#60A5FA' : 'var(--border)'}`,
                      background: form.niveaux.includes(n) ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.04)',
                      color: form.niveaux.includes(n) ? '#60A5FA' : 'var(--text-3)',
                      fontSize: '12px', fontWeight: form.niveaux.includes(n) ? 600 : 400,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Matières */}
            <div className="card">
              <h3 style={{ marginBottom: '4px' }}>Matières enseignées</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '14px' }}>
                Sélectionne tes matières principales
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                {MATIERES.map(m => (
                  <button key={m} type="button"
                    onClick={() => setForm({ ...form, matieres: toggleItem(form.matieres, m) })}
                    style={{
                      padding: '6px 13px', borderRadius: '99px',
                      border: `1.5px solid ${form.matieres.includes(m) ? 'var(--violet)' : 'var(--border)'}`,
                      background: form.matieres.includes(m) ? 'var(--violet-pale)' : 'rgba(255,255,255,0.04)',
                      color: form.matieres.includes(m) ? '#A78BFA' : 'var(--text-3)',
                      fontSize: '12px', fontWeight: form.matieres.includes(m) ? 600 : 400,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Paramètres typiques */}
            <div className="card">
              <h3 style={{ marginBottom: '16px' }}>Paramètres typiques de cours</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Durée typique d'un cours (minutes)</label>
                  <select value={form.duree_typique} onChange={e => setForm({ ...form, duree_typique: e.target.value })}>
                    {['45', '50', '60', '75', '80', '90', '100', '120'].map(d => (
                      <option key={d} value={d}>{d} minutes</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Taille typique d'un groupe</label>
                  <select value={form.groupes_typiques} onChange={e => setForm({ ...form, groupes_typiques: e.target.value })}>
                    {['10', '15', '20', '25', '28', '30', '32', '35'].map(n => (
                      <option key={n} value={n}>{n} élèves</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Langue de génération IA</label>
                  <select value={form.langue_ia} onChange={e => setForm({ ...form, langue_ia: e.target.value })}>
                    <option value="fr">🇫🇷 Français</option>
                    <option value="en">🇨🇦 English</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ton des contenus générés</label>
                  <select value={form.ton_ia} onChange={e => setForm({ ...form, ton_ia: e.target.value })}>
                    <option value="professionnel">Professionnel et structuré</option>
                    <option value="chaleureux">Chaleureux et accessible</option>
                    <option value="concis">Concis et direct</option>
                    <option value="detaille">Détaillé et complet</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Options inclure */}
            <div className="card">
              <h3 style={{ marginBottom: '4px' }}>Éléments inclus automatiquement</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '14px' }}>
                KlassIA+ inclura ces sections dans chaque génération
              </p>
              <Toggle
                val={form.inclure_differentiation}
                onChange={() => setForm({ ...form, inclure_differentiation: !form.inclure_differentiation })}
                label="Stratégies de différenciation"
                desc="Adaptations pour élèves à besoins particuliers (Dyslexie, TDAH, Allophone)"
              />
              <Toggle
                val={form.inclure_evaluation}
                onChange={() => setForm({ ...form, inclure_evaluation: !form.inclure_evaluation })}
                label="Critères d'évaluation"
                desc="Grilles et critères de réussite liés aux objectifs"
              />
              <Toggle
                val={form.inclure_vocabulaire}
                onChange={() => setForm({ ...form, inclure_vocabulaire: !form.inclure_vocabulaire })}
                label="Vocabulaire clé"
                desc="Liste des termes importants à enseigner"
              />
              <Toggle
                val={form.inclure_perspective_autochtone}
                onChange={() => setForm({ ...form, inclure_perspective_autochtone: !form.inclure_perspective_autochtone })}
                label="Perspective autochtone"
                desc="Liens avec les savoirs et perspectives des peuples autochtones"
              />
            </div>

            {/* Instructions personnalisées */}
            <div className="card" style={{ background: 'var(--violet-light)', border: '1px solid rgba(107,63,160,0.15)' }}>
              <h3 style={{ marginBottom: '4px', color: 'var(--violet)' }}>✦ Instructions personnalisées</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '14px' }}>
                Donne des instructions spécifiques à KlassIA+ sur ta façon d'enseigner, tes élèves, ton école ou toute autre info contextuelle.
              </p>
              <textarea
                value={form.instructions_perso}
                onChange={e => setForm({ ...form, instructions_perso: e.target.value })}
                placeholder="Ex: J'enseigne dans une école en milieu défavorisé. Mes élèves ont souvent des difficultés en lecture. Privilégie des textes courts et des activités collaboratives. Évite les références culturelles nord-américaines uniquement..."
                rows={5}
                style={{ width: '100%', padding: '12px', border: '1.5px solid rgba(107,63,160,0.3)', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.6', outline: 'none', resize: 'vertical', background: 'rgba(255,255,255,0.05)' }}
              />
            </div>

            {/* Bouton save */}
            <div style={{ display: 'flex', gap: '10px', paddingBottom: '24px' }}>
              <button type="submit" disabled={saving} className="btn-violet"
                style={{ opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Sauvegarde...' : '✦ Sauvegarder mon profil IA'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => router.push('/dashboard')}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}