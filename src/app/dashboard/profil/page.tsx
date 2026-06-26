'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import LoadingScreen from '@/components/LoadingScreen'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { FEATURE_DARK_MODE_ENABLED } from '@/lib/constants/features'
import GabaritUpload from '@/components/GabaritUpload'
import { nourrirIA } from '@/lib/utils/nourrir-ia'

// ─── Constantes ───────────────────────────────────────────────────────────────

const PROVINCES = [
  'Alberta', 'Colombie-Britannique', 'Manitoba', 'Nouveau-Brunswick',
  'Terre-Neuve-et-Labrador', 'Nouvelle-Écosse', 'Ontario', 'Île-du-Prince-Édouard',
  'Québec', 'Saskatchewan', 'Territoires du Nord-Ouest', 'Nunavut', 'Yukon',
]

const STYLES_PEDA = [
  { value: 'socioconstructiviste',  label: 'Socioconstructiviste',  desc: 'Apprentissage collaboratif et social' },
  { value: 'behavioriste',          label: 'Behavioriste',          desc: 'Renforcement et répétition ciblée' },
  { value: 'humaniste',             label: 'Humaniste',             desc: 'Centré sur l\'élève et son épanouissement' },
  { value: 'cognitiviste',          label: 'Cognitiviste',          desc: 'Développement des processus mentaux' },
  { value: 'differentiation',       label: 'Différenciation',       desc: 'Adaptation à chaque profil d\'élève' },
  { value: 'experiential',          label: 'Expérientiel',          desc: 'Apprentissage par l\'action et l\'expérience' },
  { value: 'par_projet',            label: 'Par projets',           desc: 'Défis réels, interdisciplinaire' },
  { value: 'traditionnel',          label: 'Traditionnel / Exposé', desc: 'Enseignement magistral structuré' },
]

const FORFAITS = [
  {
    id:       'gratuit',
    nom:      'Gratuit',
    badge:    '',
    prix_cad: '0',
    prix_usd: '0',
    periode:  '',
    desc:     'Pour découvrir KlassIA+',
    features: [
      '3 générations IA / mois',
      '2 classes',
      'Studio IA — accès limité',
      'Bibliothèque personnelle',
    ],
    disabled: [],
    couleur:  '#64748B',
  },
  {
    id:       'pro',
    nom:      'Pro',
    badge:    '',
    prix_cad: '14.99',
    prix_usd: '10.99',
    periode:  '/mois',
    desc:     'Pour l\'enseignant actif',
    features: [
      '50 générations IA / mois',
      '10 classes',
      'Studio IA complet',
      'Kits pédagogiques',
      'Bibliothèque partagée',
    ],
    disabled: ['Plan annuel · Gestion multi-classes'],
    couleur:  '#60A5FA',
  },
  {
    id:       'pro_plus',
    nom:      'Pro+',
    badge:    '⭐ Populaire',
    prix_cad: '24.99',
    prix_usd: '18.99',
    periode:  '/mois',
    desc:     'Pour aller plus loin',
    features: [
      'Générations IA illimitées',
      'Classes illimitées',
      'Studio IA + différenciation',
      'Calendrier & évaluations',
      'Plan annuel automatisé',
      'Support prioritaire',
    ],
    disabled: [],
    couleur:  '#A78BFA',
    vedette:  true,
  },
  {
    id:       'etablissement',
    nom:      'Établissement',
    badge:    '🏫',
    prix_cad: '9.99',
    prix_usd: '7.49',
    periode:  '/ens./mois',
    desc:     'Pour toute l\'école',
    features: [
      'Tout de Pro+',
      'Tableau de bord admin',
      'Facturation centralisée',
      'Onboarding dédié',
      'Rapports de l\'établissement',
    ],
    disabled: [],
    couleur:  '#F59E0B',
  },
]

// ─── Composants onglets ───────────────────────────────────────────────────────

type TabId = 'profil' | 'ia' | 'forfaits' | 'notifs' | 'apparence'
const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'profil',    icon: '👤', label: 'Profil'    },
  { id: 'ia',        icon: '🤖', label: 'IA'        },
  { id: 'forfaits',  icon: '💳', label: 'Forfaits'  },
  { id: 'notifs',    icon: '🔔', label: 'Notifs'    },
  { id: 'apparence', icon: '🎨', label: 'Apparence' },
]

// ─── Toggle composant ─────────────────────────────────────────────────────────

function ToggleSwitch({ on, onChange, label, desc }: { on: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-separator)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{desc}</div>}
      </div>
      <button
        onClick={() => onChange(!on)}
        style={{
          width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
          background: on ? 'var(--color-accent-violet)' : 'var(--color-border)',
          position: 'relative', transition: 'background .2s', flexShrink: 0,
        }}
        aria-pressed={on}
      >
        <span style={{
          position: 'absolute', top: 2, left: on ? 22 : 2,
          width: 20, height: 20, borderRadius: '50%', background: '#FFF',
          boxShadow: '0 1px 3px rgba(0,0,0,.3)', transition: 'left .2s',
        }} />
      </button>
    </div>
  )
}

// ─── Contenu principal ────────────────────────────────────────────────────────

function ProfilContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  // ── Data ─────────────────────────────────────────────────────────────────
  const [profil,  setProfil]  = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // ── Tab ──────────────────────────────────────────────────────────────────
  const tabParam = (searchParams.get('tab') as TabId) || 'profil'
  const [activeTab, setActiveTab] = useState<TabId>(tabParam)

  // ── Profil form ──────────────────────────────────────────────────────────
  const [form,    setForm]    = useState({ prenom: '', nom: '', ecole: '', ville: '', province: 'Québec', telephone: '', bio: '', langue: 'fr' })
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [formErr, setFormErr] = useState('')

  // ── Password form ─────────────────────────────────────────────────────────
  const [pwForm,   setPwForm]  = useState({ next: '', confirm: '' })
  const [pwErr,    setPwErr]   = useState('')
  const [pwSaved,  setPwSaved] = useState(false)

  // ── IA form ───────────────────────────────────────────────────────────────
  const [iaForm, setIaForm] = useState({
    style_pedagogique:    '',
    duree_typique:        '75',
    groupes_typiques:     '',
    langue_ia:            'fr',
    instructions_permanentes: '',
  })
  const [iaGabaritUrl, setIaGabaritUrl] = useState<string | null>(null)
  const [iaSaving,     setIaSaving]     = useState(false)
  const [iaSaved,      setIaSaved]      = useState(false)
  const [iaErr,        setIaErr]        = useState('')

  // ── Notifs ────────────────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState({
    email_taches:   true,
    email_rappels:  true,
    email_nouveautes: false,
    push_taches:    true,
    push_calendrier: true,
  })
  const [notifSaved, setNotifSaved] = useState(false)

  // ── Forfaits ──────────────────────────────────────────────────────────────
  const [monnaie, setMonnaie] = useState<'cad' | 'usd'>('cad')

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await supabase.from('utilisateurs').select('*').eq('user_id', session.user.id).single()
      if (!p) { router.push('/login'); return }
      setProfil(p)
      setForm({
        prenom:    p.prenom    || '',
        nom:       p.nom       || '',
        ecole:     p.ecole     || '',
        ville:     p.ville     || '',
        province:  p.province  || 'Québec',
        telephone: p.telephone || '',
        bio:       p.bio       || '',
        langue:    p.langue    || 'fr',
      })
      const ia = p.profil_ia || {}
      setIaForm({
        style_pedagogique:        ia.style_pedagogique        || '',
        duree_typique:            String(ia.duree_typique     || '75'),
        groupes_typiques:         ia.groupes_typiques         || '',
        langue_ia:                ia.langue_ia               || 'fr',
        instructions_permanentes: ia.instructions_permanentes || '',
      })
      setIaGabaritUrl(ia.gabarit_lecon_url || null)
      if (p.preferences_notif) setNotifs({ ...notifs, ...p.preferences_notif })
      setLoading(false)
    }
    init()
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaveProfil = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profil?.id) return
    setSaving(true); setFormErr('')
    const { error: err } = await supabase.from('utilisateurs').update(form).eq('id', profil.id)
    setSaving(false)
    if (err) { setFormErr(err.message); return }
    setProfil({ ...profil, ...form })
    setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault(); setPwErr('')
    if (pwForm.next !== pwForm.confirm) { setPwErr('Les mots de passe ne correspondent pas.'); return }
    if (pwForm.next.length < 8) { setPwErr('8 caractères minimum.'); return }
    const { error: err } = await supabase.auth.updateUser({ password: pwForm.next })
    if (err) { setPwErr(err.message); return }
    setPwForm({ next: '', confirm: '' }); setPwSaved(true)
    setTimeout(() => setPwSaved(false), 3000)
  }

  const handleSaveIA = async () => {
    if (!profil?.id) return
    setIaSaving(true); setIaErr('')
    const current = profil?.profil_ia || {}
    const updated = {
      ...current,
      style_pedagogique:        iaForm.style_pedagogique,
      duree_typique:            parseInt(iaForm.duree_typique) || 75,
      groupes_typiques:         iaForm.groupes_typiques,
      langue_ia:                iaForm.langue_ia,
      instructions_permanentes: iaForm.instructions_permanentes,
    }
    const { error: err } = await supabase.from('utilisateurs').update({ profil_ia: updated }).eq('id', profil.id)
    setIaSaving(false)
    if (err) { setIaErr(err.message); return }
    setProfil({ ...profil, profil_ia: updated })
    setIaSaved(true); setTimeout(() => setIaSaved(false), 3000)

    if (iaForm.style_pedagogique) {
      nourrirIA({
        enseignant_id: profil.id,
        source:        'gabarit',
        titre:         `Style pédagogique : ${iaForm.style_pedagogique}`,
        type:          'profil_ia',
        contenu_texte: iaForm.instructions_permanentes || undefined,
      }).catch(() => {})
    }
  }

  const handleGabaritAnalysed = async (analyse: Record<string, any>, url: string) => {
    if (!profil?.id) return
    const current = profil?.profil_ia || {}
    const updated = { ...current, gabarit_lecon_analyse: analyse, gabarit_lecon_url: url }
    await supabase.from('utilisateurs').update({ profil_ia: updated }).eq('id', profil.id)
    setProfil({ ...profil, profil_ia: updated })
    setIaGabaritUrl(url)
    showToast('✓ Gabarit intégré au profil IA', true)

    nourrirIA({
      enseignant_id: profil.id,
      source:        'gabarit',
      titre:         'Gabarit de leçon personnel',
      type:          'gabarit',
      url_storage:   url,
    }).catch(() => {})
  }

  const handleSaveNotifs = async () => {
    if (!profil?.id) return
    await supabase.from('utilisateurs').update({ preferences_notif: notifs } as any).eq('id', profil.id)
    setNotifSaved(true); setTimeout(() => setNotifSaved(false), 2500)
    showToast('✓ Préférences de notifications sauvegardées', true)
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (loading) return <LoadingScreen />

  const initiales = `${profil?.prenom?.[0] || ''}${profil?.nom?.[0] || ''}`.toUpperCase()
  const forfaitActuel = profil?.forfait || 'gratuit'

  return (
    <div className="app-layout" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .ptab-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 18px; border-radius: 10px;
          border: 1.5px solid transparent;
          background: transparent;
          color: var(--color-text-secondary);
          font-size: 13px; font-weight: 500;
          cursor: pointer; font-family: inherit;
          transition: all .15s; white-space: nowrap;
        }
        .ptab-btn.active {
          background: var(--color-bg-active);
          border-color: var(--color-accent-violet);
          color: var(--color-accent-violet);
          font-weight: 700;
        }
        .ptab-btn:hover:not(.active) {
          background: var(--color-bg-hover);
          color: var(--color-text-primary);
        }
        .pcard {
          background: var(--color-bg-card);
          border: 1.5px solid var(--color-border);
          border-radius: 14px;
          padding: 22px 24px;
          margin-bottom: 16px;
        }
        .pcard h3 {
          font-size: 14px; font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 4px;
        }
        .pcard .sub {
          font-size: 12px; color: var(--color-text-muted);
          margin: 0 0 18px;
        }
        .p-field label {
          display: block; font-size: 11px; font-weight: 700;
          color: var(--color-text-muted); text-transform: uppercase;
          letter-spacing: .5px; margin-bottom: 5px;
        }
        .p-field input, .p-field select, .p-field textarea {
          width: 100%; box-sizing: border-box;
          padding: 9px 13px;
          border: 1.5px solid var(--color-input-border);
          border-radius: 9px;
          background: var(--color-input-bg);
          color: var(--color-text-primary);
          font-size: 13px; outline: none;
          font-family: inherit; line-height: 1.5;
          transition: border-color .15s;
        }
        .p-field input:focus, .p-field select:focus, .p-field textarea:focus {
          border-color: var(--color-accent-violet);
        }
        .p-field textarea { resize: vertical; }
        .btn-save {
          padding: 9px 22px; border-radius: 9px;
          background: linear-gradient(135deg, #6B3FA0, #4F46E5);
          border: none; color: #FFF;
          font-size: 13px; font-weight: 700;
          cursor: pointer; font-family: inherit;
          transition: opacity .15s;
        }
        .btn-save:disabled { opacity: .5; cursor: not-allowed; }
        .btn-ghost-sm {
          padding: 8px 16px; border-radius: 9px;
          border: 1.5px solid var(--color-border);
          background: transparent; color: var(--color-text-secondary);
          font-size: 13px; cursor: pointer; font-family: inherit;
          transition: border-color .15s;
        }
        .btn-ghost-sm:hover { border-color: var(--color-border-strong); }
        .forfait-card {
          border: 2px solid var(--color-border);
          border-radius: 14px; padding: 20px;
          display: flex; flex-direction: column;
          gap: 10px; transition: border-color .15s, box-shadow .15s;
          background: var(--color-bg-card);
          position: relative;
        }
        .forfait-card.vedette {
          border-color: #A78BFA;
          box-shadow: 0 0 0 3px rgba(167,139,250,.12);
        }
        .forfait-card.actuel {
          border-color: #34D399;
          box-shadow: 0 0 0 3px rgba(52,211,153,.1);
        }
        .style-chip {
          padding: 8px 14px; border-radius: 10px;
          border: 1.5px solid var(--color-border);
          background: transparent; color: var(--color-text-secondary);
          font-size: 12px; cursor: pointer; font-family: inherit;
          text-align: left; transition: all .15s;
        }
        .style-chip.sel {
          border-color: var(--color-accent-violet);
          background: var(--color-accent-violet-bg);
          color: var(--color-accent-violet);
          font-weight: 700;
        }
        .style-chip:hover:not(.sel) { border-color: var(--color-border-strong); }
      `}</style>

      <Sidebar profil={profil} activeHref="/dashboard/profil" />

      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <Topbar initiales={initiales} isFr={profil?.langue_interface !== 'en'} />

        {/* Corps */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', padding: '16px 24px 40px' }}>

            {/* Carte avatar */}
            <div className="pcard" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #7F77DD, #4A2882)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#FFF', flexShrink: 0 }}>
                {initiales || '?'}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.4px' }}>
                  {profil?.prenom} {profil?.nom}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3 }}>{profil?.email}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, fontWeight: 700, background: forfaitActuel === 'pro_plus' ? 'rgba(167,139,250,.15)' : forfaitActuel === 'pro' ? 'rgba(96,165,250,.15)' : 'rgba(100,116,139,.12)', color: forfaitActuel === 'pro_plus' ? '#A78BFA' : forfaitActuel === 'pro' ? '#60A5FA' : '#94A3B8' }}>
                    {forfaitActuel === 'pro_plus' ? '⭐ Pro+' : forfaitActuel === 'pro' ? '✦ Pro' : '○ Gratuit'}
                  </span>
                  {profil?.ecole && (
                    <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, fontWeight: 600, background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}>
                      🏫 {profil.ecole}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation onglets */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', padding: '2px 0' }}>
              {TABS.map(t => (
                <button key={t.id}
                  className={`ptab-btn${activeTab === t.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(t.id)}>
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>

            {/* ── ONGLET PROFIL ──────────────────────────────────────────────── */}
            {activeTab === 'profil' && (
              <>
                <div className="pcard">
                  <h3>Informations personnelles</h3>
                  <p className="sub">Prénom, nom, école et coordonnées</p>
                  <form onSubmit={handleSaveProfil}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                      {[
                        { key: 'prenom',    label: 'Prénom *',     placeholder: 'Ton prénom',       type: 'text'  },
                        { key: 'nom',       label: 'Nom *',        placeholder: 'Nom de famille',   type: 'text'  },
                        { key: 'ecole',     label: 'École',        placeholder: 'Nom de l\'école',  type: 'text'  },
                        { key: 'telephone', label: 'Téléphone',    placeholder: '(514) 000-0000',   type: 'tel'   },
                        { key: 'ville',     label: 'Ville',        placeholder: 'Montréal, Ottawa…',type: 'text'  },
                      ].map(f => (
                        <div key={f.key} className="p-field">
                          <label>{f.label}</label>
                          <input
                            type={f.type}
                            value={(form as any)[f.key]}
                            onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                            placeholder={f.placeholder}
                            required={f.label.endsWith('*')}
                          />
                        </div>
                      ))}
                      <div className="p-field">
                        <label>Province</label>
                        <select value={form.province} onChange={e => setForm({ ...form, province: e.target.value })}>
                          {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="p-field">
                        <label>Langue de la plateforme</label>
                        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                          {[
                            { value: 'fr', label: '🇫🇷 Français' },
                            { value: 'en', label: '🇨🇦 English'  },
                          ].map(opt => (
                            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: form.langue === opt.value ? 700 : 400, color: form.langue === opt.value ? 'var(--color-accent-violet)' : 'var(--color-text-secondary)' }}>
                              <input
                                type="radio"
                                name="langue"
                                value={opt.value}
                                checked={form.langue === opt.value}
                                onChange={() => setForm({ ...form, langue: opt.value })}
                                style={{ accentColor: 'var(--color-accent-violet)' }}
                              />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="p-field" style={{ marginBottom: 16 }}>
                      <label>Bio professionnelle</label>
                      <textarea
                        value={form.bio}
                        onChange={e => setForm({ ...form, bio: e.target.value })}
                        placeholder="Ex : Enseignant de maths depuis 10 ans, spécialisé en pédagogie différenciée…"
                        rows={3}
                      />
                    </div>
                    {formErr && <div style={{ padding: '9px 14px', background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 8, fontSize: 12, color: '#F87171', marginBottom: 12 }}>{formErr}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button type="submit" className="btn-save" disabled={saving}>{saving ? '⟳ Sauvegarde…' : '💾 Sauvegarder'}</button>
                      {saved && <span style={{ fontSize: 12, color: '#34D399', fontWeight: 600 }}>✓ Sauvegardé !</span>}
                    </div>
                  </form>
                </div>

                <div className="pcard">
                  <h3>Sécurité</h3>
                  <p className="sub">Modifier ton mot de passe</p>
                  <form onSubmit={handlePasswordChange}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 480, marginBottom: 12 }}>
                      <div className="p-field">
                        <label>Nouveau mot de passe</label>
                        <input type="password" value={pwForm.next} onChange={e => setPwForm({ ...pwForm, next: e.target.value })} placeholder="Min. 8 caractères" />
                      </div>
                      <div className="p-field">
                        <label>Confirmer</label>
                        <input type="password" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} placeholder="Répéter le mot de passe" />
                      </div>
                    </div>
                    {pwErr && <div style={{ padding: '9px 14px', background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 8, fontSize: 12, color: '#F87171', marginBottom: 10 }}>{pwErr}</div>}
                    {pwSaved && <div style={{ padding: '9px 14px', background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.3)', borderRadius: 8, fontSize: 12, color: '#34D399', marginBottom: 10 }}>✓ Mot de passe mis à jour</div>}
                    <button type="submit" className="btn-ghost-sm">🔒 Changer le mot de passe</button>
                  </form>
                </div>
              </>
            )}

            {/* ── ONGLET IA ──────────────────────────────────────────────────── */}
            {activeTab === 'ia' && (
              <>
                <div className="pcard">
                  <h3>Style pédagogique</h3>
                  <p className="sub">Détermine le ton et l'approche de toutes vos générations IA</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                    {STYLES_PEDA.map(s => (
                      <button key={s.value}
                        className={`style-chip${iaForm.style_pedagogique === s.value ? ' sel' : ''}`}
                        onClick={() => setIaForm({ ...iaForm, style_pedagogique: s.value })}>
                        <div style={{ fontWeight: 700, marginBottom: 2 }}>{s.label}</div>
                        <div style={{ fontSize: 10, opacity: .7, lineHeight: 1.4 }}>{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pcard">
                  <h3>Gabarit de leçon</h3>
                  <p className="sub">Uploader un de vos plans de leçon existants — KlassIA+ imitera votre style</p>
                  <GabaritUpload
                    profilId={profil?.id || ''}
                    currentUrl={iaGabaritUrl}
                    onAnalysed={handleGabaritAnalysed}
                  />
                </div>

                <div className="pcard">
                  <h3>Instructions permanentes</h3>
                  <p className="sub">Ces instructions s'appliquent à TOUTES vos générations IA</p>
                  <div className="p-field" style={{ marginBottom: 16 }}>
                    <label>Mes instructions</label>
                    <textarea
                      value={iaForm.instructions_permanentes}
                      onChange={e => setIaForm({ ...iaForm, instructions_permanentes: e.target.value })}
                      placeholder="Ex : Toujours inclure des exemples concrets. Adapter pour la dyslexie. Inclure des questions de discussion. Langue simple niveau 6e année…"
                      rows={5}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
                    <div className="p-field">
                      <label>Durée typique (min)</label>
                      <input type="number" min={15} max={180} value={iaForm.duree_typique} onChange={e => setIaForm({ ...iaForm, duree_typique: e.target.value })} />
                    </div>
                    <div className="p-field">
                      <label>Groupes typiques</label>
                      <input value={iaForm.groupes_typiques} onChange={e => setIaForm({ ...iaForm, groupes_typiques: e.target.value })} placeholder="Ex : 25 élèves, maternelle 5 ans" />
                    </div>
                    <div className="p-field">
                      <label>Langue de génération</label>
                      <select value={iaForm.langue_ia} onChange={e => setIaForm({ ...iaForm, langue_ia: e.target.value })}>
                        <option value="fr">🇨🇦 Français</option>
                        <option value="en">🇺🇸 English</option>
                      </select>
                    </div>
                  </div>
                  {iaErr && <div style={{ padding: '9px 14px', background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 8, fontSize: 12, color: '#F87171', marginBottom: 12 }}>{iaErr}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={handleSaveIA} className="btn-save" disabled={iaSaving}>{iaSaving ? '⟳ Sauvegarde…' : '💾 Sauvegarder le profil IA'}</button>
                    {iaSaved && <span style={{ fontSize: 12, color: '#34D399', fontWeight: 600 }}>✓ Profil IA sauvegardé !</span>}
                  </div>
                </div>
              </>
            )}

            {/* ── ONGLET FORFAITS ────────────────────────────────────────────── */}
            {activeTab === 'forfaits' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)' }}>Plans KlassIA+</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3 }}>Conçus pour les enseignants canadiens</div>
                  </div>
                  <div style={{ display: 'flex', background: 'var(--color-bg-card)', borderRadius: 10, border: '1.5px solid var(--color-border)', overflow: 'hidden' }}>
                    {(['cad', 'usd'] as const).map(m => (
                      <button key={m}
                        onClick={() => setMonnaie(m)}
                        style={{ padding: '7px 16px', border: 'none', background: monnaie === m ? 'var(--color-accent-violet)' : 'transparent', color: monnaie === m ? '#FFF' : 'var(--color-text-secondary)', fontSize: 12, fontWeight: monnaie === m ? 700 : 400, cursor: 'pointer', transition: 'all .15s' }}>
                        {m === 'cad' ? '🇨🇦 CAD' : '🇺🇸 USD'}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
                  {FORFAITS.map(f => {
                    const actuel = forfaitActuel === f.id
                    const prix   = monnaie === 'cad' ? f.prix_cad : f.prix_usd
                    return (
                      <div key={f.id} className={`forfait-card${f.vedette ? ' vedette' : ''}${actuel ? ' actuel' : ''}`}>
                        {f.badge && (
                          <div style={{ fontSize: 10, fontWeight: 800, color: f.couleur, background: `${f.couleur}18`, padding: '3px 9px', borderRadius: 99, display: 'inline-block', marginBottom: 2 }}>
                            {f.badge}
                          </div>
                        )}
                        {actuel && (
                          <div style={{ position: 'absolute', top: 12, right: 14, fontSize: 10, fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,.12)', padding: '2px 8px', borderRadius: 99 }}>
                            ✓ Actuel
                          </div>
                        )}
                        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text-primary)' }}>{f.nom}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{f.desc}</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, margin: '8px 0 4px' }}>
                          <span style={{ fontSize: 26, fontWeight: 900, color: f.couleur }}>${prix}</span>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>{monnaie.toUpperCase()}{f.periode}</span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 10 }}>taxes en sus</div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {f.features.map(ft => (
                            <li key={ft} style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                              <span style={{ color: '#34D399', fontWeight: 700, fontSize: 11, marginTop: 1, flexShrink: 0 }}>✓</span>{ft}
                            </li>
                          ))}
                          {f.disabled.map(ft => (
                            <li key={ft} style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'flex-start', gap: 5, opacity: .5 }}>
                              <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>—</span>{ft}
                            </li>
                          ))}
                        </ul>
                        {!actuel && (
                          <button
                            onClick={() => showToast('Fonctionnalité de paiement bientôt disponible !', true)}
                            style={{ width: '100%', padding: '9px', borderRadius: 9, border: 'none', background: f.vedette ? `linear-gradient(135deg, #7F77DD, #4F46E5)` : `${f.couleur}22`, color: f.vedette ? '#FFF' : f.couleur, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {f.id === 'gratuit' ? 'Continuer gratuit' : `Choisir ${f.nom}`}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="pcard" style={{ background: 'rgba(167,139,250,.05)' }}>
                  <h3>Questions ?</h3>
                  <p className="sub">Contactez-nous pour l'offre Établissement ou pour tout besoin spécifique</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-ghost-sm" onClick={() => window.open('mailto:contact@klassia.app', '_blank')}>📧 contact@klassia.app</button>
                  </div>
                </div>
              </>
            )}

            {/* ── ONGLET NOTIFS ──────────────────────────────────────────────── */}
            {activeTab === 'notifs' && (
              <>
                <div className="pcard">
                  <h3>Notifications par courriel</h3>
                  <p className="sub">Choisissez les alertes que vous souhaitez recevoir par email</p>
                  <ToggleSwitch on={notifs.email_taches} onChange={v => setNotifs(n => ({ ...n, email_taches: v }))}
                    label="Rappels de tâches" desc="Recevoir un email quand une tâche approche son échéance" />
                  <ToggleSwitch on={notifs.email_rappels} onChange={v => setNotifs(n => ({ ...n, email_rappels: v }))}
                    label="Rappels de cours" desc="Alertes 24 h avant chaque cours au calendrier" />
                  <ToggleSwitch on={notifs.email_nouveautes} onChange={v => setNotifs(n => ({ ...n, email_nouveautes: v }))}
                    label="Nouveautés KlassIA+" desc="Nouvelles fonctionnalités et mises à jour de la plateforme" />
                </div>

                <div className="pcard">
                  <h3>Notifications dans l'application</h3>
                  <p className="sub">Alertes affichées directement dans le tableau de bord</p>
                  <ToggleSwitch on={notifs.push_taches} onChange={v => setNotifs(n => ({ ...n, push_taches: v }))}
                    label="Tâches à venir" desc="Afficher les tâches dues dans les 48 prochaines heures" />
                  <ToggleSwitch on={notifs.push_calendrier} onChange={v => setNotifs(n => ({ ...n, push_calendrier: v }))}
                    label="Événements du calendrier" desc="Alertes pour les cours et événements programmés" />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button className="btn-save" onClick={handleSaveNotifs}>💾 Sauvegarder les préférences</button>
                  {notifSaved && <span style={{ fontSize: 12, color: '#34D399', fontWeight: 600 }}>✓ Sauvegardé !</span>}
                </div>
              </>
            )}

            {/* ── ONGLET APPARENCE ───────────────────────────────────────────── */}
            {activeTab === 'apparence' && (
              <>
                {FEATURE_DARK_MODE_ENABLED && (
                  <div className="pcard">
                    <h3>Thème</h3>
                    <p className="sub">Mode clair ou sombre de l'interface</p>
                    <ThemeToggle showLabels />
                  </div>
                )}

                <div className="pcard">
                  <h3>Langue de l'interface</h3>
                  <p className="sub">Langue d'affichage des menus et de l'interface (hors IA)</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[{ code: 'fr', flag: '🇨🇦', label: 'Français' }, { code: 'en', flag: '🇺🇸', label: 'English' }].map(l => (
                      <button key={l.code}
                        style={{ padding: '10px 20px', borderRadius: 10, border: `1.5px solid ${l.code === 'fr' ? 'var(--color-accent-violet)' : 'var(--color-border)'}`, background: l.code === 'fr' ? 'var(--color-accent-violet-bg)' : 'transparent', color: l.code === 'fr' ? 'var(--color-accent-violet)' : 'var(--color-text-secondary)', fontWeight: l.code === 'fr' ? 700 : 400, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span>{l.flag}</span>{l.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: 'var(--color-text-muted)' }}>
                    Langue anglaise bientôt disponible
                  </div>
                </div>

                <div className="pcard">
                  <h3>Densité de l'interface</h3>
                  <p className="sub">Espacement et taille des éléments</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[
                      { val: 'compact', label: 'Compact',   desc: 'Plus d\'informations à l\'écran'  },
                      { val: 'normal',  label: 'Normal',    desc: 'Équilibre espace et lisibilité'  },
                      { val: 'large',   label: 'Confort',   desc: 'Plus d\'espacement, meilleure lecture' },
                    ].map(d => (
                      <button key={d.val}
                        style={{ padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${d.val === 'normal' ? 'var(--color-accent-violet)' : 'var(--color-border)'}`, background: d.val === 'normal' ? 'var(--color-accent-violet-bg)' : 'transparent', color: d.val === 'normal' ? 'var(--color-accent-violet)' : 'var(--color-text-secondary)', fontWeight: d.val === 'normal' ? 700 : 400, fontSize: 12, cursor: 'pointer', flex: 1, textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, marginBottom: 2 }}>{d.label}</div>
                        <div style={{ fontSize: 10, opacity: .7 }}>{d.desc}</div>
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: 'var(--color-text-muted)' }}>
                    Densité personnalisée bientôt disponible
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', padding: '10px 22px', borderRadius: 10, zIndex: 999, background: toast.ok ? 'rgba(52,211,153,.95)' : 'rgba(248,113,113,.95)', color: '#FFF', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,.3)', whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ─── Export avec Suspense ──────────────────────────────────────────────────────

export default function ProfilPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ProfilContent />
    </Suspense>
  )
}
