'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Data ─────────────────────────────────────────────────────────────────────

const PROVINCES = [
  'Québec', 'Ontario', 'Alberta', 'Colombie-Britannique',
  'Saskatchewan', 'Manitoba', 'Nouveau-Brunswick',
  'Nouvelle-Écosse', 'Île-du-Prince-Édouard',
  'Terre-Neuve-et-Labrador', 'Yukon',
  'Territoires du Nord-Ouest', 'Nunavut',
]

const MATIERES = [
  'Mathématiques',
  "Français (langue d'enseignement)",
  'Anglais (langue seconde)',
  'Sciences et technologie',
  'Sciences humaines et sociales',
  'Histoire',
  'Géographie',
  'Éducation physique et à la santé',
  'Arts plastiques',
  'Musique',
  'Éthique et culture religieuse',
  'Informatique',
  'Autre',
]

const NIVEAUX = [
  'Maternelle', '1re année', '2e année', '3e année', '4e année',
  '5e année', '6e année', '7e année', '8e année',
  '9e année', '10e année', '11e année', '12e année',
  'Plusieurs niveaux',
]

const NB_ELEVES_OPTIONS = [
  '5', '10', '15', '18', '20', '22', '24', '25',
  '26', '28', '30', '32', '35', '40',
]

type Ecran = 1 | 2 | 3 | 4
type GabaritStatus = 'idle' | 'parsing' | 'done' | 'error'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingV2Page() {
  const router   = useRouter()
  const supabase = createClient()

  const [profil,        setProfil]        = useState<any>(null)
  const [ecran,         setEcran]         = useState<Ecran>(1)

  // Écran 2 — Profil
  const [province,      setProvince]      = useState('')
  const [matiere,       setMatiere]       = useState('')
  const [niveau,        setNiveau]        = useState('')
  const [gabaritFile,   setGabaritFile]   = useState<File | null>(null)
  const [gabaritStatus, setGabaritStatus] = useState<GabaritStatus>('idle')
  const [gabaritAnalyse,setGabaritAnalyse]= useState('')
  const [saving2,       setSaving2]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Écran 3 — Première classe
  const [nomClasse,     setNomClasse]     = useState('')
  const [nbEleves,      setNbEleves]      = useState('25')
  const [langueClasse,  setLangueClasse]  = useState<'fr' | 'en'>('fr')
  const [classeId,      setClasseId]      = useState<string | null>(null)
  const [creerLoad,     setCreerLoad]     = useState(false)

  // Écran 4 — Curriculum
  const [currMode,      setCurrMode]      = useState<'ia' | 'skip' | null>(null)
  const [genSteps,      setGenSteps]      = useState<string[]>([])
  const [generating,    setGenerating]    = useState(false)
  const [genDone,       setGenDone]       = useState(false)
  const [genError,      setGenError]      = useState('')
  const [finishing,     setFinishing]     = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await supabase
        .from('utilisateurs').select('*')
        .eq('user_id', session.user.id).single()
      if (!p) { router.push('/login'); return }
      if (p.onboarding_complete_v2) { router.push('/dashboard'); return }
      setProfil(p)
      setProvince(p.province || '')
      setMatiere(p.matiere   || '')
      setNiveau(p.niveau_enseignement || '')
    }
    init()
  }, [])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleGabaritSelect = async (file: File) => {
    setGabaritFile(file)
    setGabaritStatus('parsing')
    try {
      // 1. Extraire le texte
      let texte = ''
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/import/docx', { method: 'POST', body: fd })
      if (res.ok) {
        const json = await res.json()
        const div  = document.createElement('div')
        div.innerHTML = json.html || ''
        texte = (div.innerText || div.textContent || '').slice(0, 8000)
      } else {
        texte = await file.text().catch(() => '').then(t => t.slice(0, 8000))
      }

      if (!texte.trim()) { setGabaritStatus('error'); return }

      // 2. Analyser avec Claude (BLOC 14)
      let analyseStr = texte
      try {
        const ar = await fetch('/api/ia/analyser-gabarit', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ contenu_texte: texte }),
        })
        if (ar.ok) {
          const aj = await ar.json()
          analyseStr = JSON.stringify(aj.analyse || {})
        }
      } catch { }

      setGabaritAnalyse(analyseStr)
      setGabaritStatus('done')
    } catch {
      setGabaritStatus('error')
    }
  }

  const handleSaveEcran2 = async () => {
    if (!profil || !province || !matiere || !niveau) return
    setSaving2(true)
    const updates: Record<string, any> = {
      province, matiere,
      niveau_enseignement: niveau,
      onboarding_etape: 2,
    }

    if (gabaritStatus === 'done' && gabaritAnalyse && gabaritFile) {
      const path = `${profil.id}/gabarit_${Date.now()}_${gabaritFile.name}`
      const { data: up } = await supabase.storage
        .from('ressources').upload(path, gabaritFile, { upsert: true })
      if (up?.path) {
        const { data: urlData } = supabase.storage.from('ressources').getPublicUrl(up.path)
        updates.gabarit_lecon_url     = urlData.publicUrl
        updates.gabarit_lecon_analyse = gabaritAnalyse
        await supabase.from('studio_ia_ressources').insert({
          enseignant_id: profil.id,
          titre:         `Gabarit de leçon — ${gabaritFile.name}`,
          source:        'upload_personnel',
          type_contenu:  'document',
          contenu_texte: gabaritAnalyse,
          url:           urlData.publicUrl,
          portee:        'generale',
        })
      }
    }
    await supabase.from('utilisateurs').update(updates).eq('id', profil.id)
    setSaving2(false)
    setEcran(3)
  }

  const handleCreerClasse = async () => {
    if (!profil || !nomClasse.trim()) return
    setCreerLoad(true)
    const COULEURS = ['#60A5FA', '#34D399', '#A78BFA', '#F87171', '#FBC34A', '#22D3EE']
    const couleur  = COULEURS[Math.floor(Math.random() * COULEURS.length)]
    const yr = new Date().getFullYear()

    const { data: cls } = await supabase.from('classes').insert({
      enseignant_id: profil.id,
      nom:           nomClasse.trim(),
      niveau,
      matiere,
      nombre_eleves: parseInt(nbEleves) || 25,
      couleur,
      langue:        langueClasse,
      annee_scolaire:`${yr}-${yr + 1}`,
      curriculum_charge: false,
    }).select().single()

    if (cls) {
      setClasseId(cls.id)
      await supabase.from('utilisateurs').update({ onboarding_etape: 3 }).eq('id', profil.id)
    }
    setCreerLoad(false)
    setEcran(4)
  }

  const handleGenererCurriculum = async () => {
    if (!classeId || !profil) return
    setCurrMode('ia')
    setGenerating(true)
    setGenSteps([])
    setGenError('')

    const steps = [
      '✓ Lecture du curriculum officiel...',
      '✓ Identification des compétences clés...',
      '✓ Création des unités d\'apprentissage...',
      '✓ Placement sur le calendrier scolaire...',
    ]
    steps.slice(0, 3).forEach((s, i) =>
      setTimeout(() => setGenSteps(prev => [...prev, s]), (i + 1) * 850)
    )

    try {
      const res = await fetch('/api/ia/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classe_id:           classeId,
          curriculum_officiel: province,
          matiere,
          niveau,
          nb_semaines: 36,
          langue:      langueClasse,
        }),
      })
      if (res.ok) {
        setGenSteps(prev => [...prev, steps[3]])
        setGenDone(true)
        await supabase.from('classes').update({ curriculum_charge: true }).eq('id', classeId)
      } else {
        setGenError("Impossible de générer le programme pour l'instant. Vous pourrez le faire depuis vos classes.")
      }
    } catch {
      setGenError("Connexion IA indisponible. Continuez — vous génèrerez le programme depuis vos classes.")
    }
    setGenerating(false)
  }

  const handleFinish = async () => {
    if (!profil) return
    setFinishing(true)
    await supabase.from('utilisateurs').update({
      onboarding_complete_v2: true,
      onboarding_etape:       4,
    }).eq('id', profil.id)
    router.push('/dashboard')
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (!profil) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #EEF2FF, #F5F0FF, #EDF9F4)',
      }}>
        <div style={{
          width: 32, height: 32,
          border: '3px solid #6B3FA0', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const canNext2 = !!(province && matiere && niveau) && !saving2
  const canNext3 = nomClasse.trim().length >= 2

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F0FF 50%, #EDF9F4 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
    }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        .onb-fade { animation: fadeUp 0.28s ease-out; }
        .onb-input {
          width:100%; padding:11px 14px;
          border:1.5px solid #E2E8F0; border-radius:10px;
          font-size:14px; color:#1A1A2E; background:white;
          transition:border-color 0.15s; outline:none; box-sizing:border-box;
          appearance:none;
        }
        .onb-input:focus { border-color:#6B3FA0; box-shadow:0 0 0 3px rgba(107,63,160,0.1); }
        .onb-btn {
          padding:12px 28px; border-radius:12px; border:none;
          font-size:15px; font-weight:600; cursor:pointer; transition:all 0.18s;
          font-family:inherit;
        }
        .onb-primary {
          background:linear-gradient(135deg,#6B3FA0,#4F46E5); color:white;
        }
        .onb-primary:hover:not(:disabled) { opacity:0.9; transform:translateY(-1px); }
        .onb-primary:disabled { opacity:0.45; cursor:not-allowed; }
        .onb-ghost {
          background:white; color:#64748B;
          border:1.5px solid #E2E8F0;
        }
        .onb-ghost:hover { border-color:#CBD5E1; background:#F8FAFC; }
        .onb-card-opt {
          padding:18px 20px; border:2px solid #EDE9FE;
          border-radius:14px; background:#FAFAFF; cursor:pointer;
          text-align:left; transition:all 0.18s; width:100%;
          font-family:inherit;
        }
        .onb-card-opt:hover { border-color:#6B3FA0; background:#F5F0FF; }
        .onb-card-skip {
          padding:14px 20px; border:1.5px solid #E2E8F0;
          border-radius:12px; background:white; cursor:pointer;
          text-align:left; transition:all 0.18s; width:100%;
          font-family:inherit;
        }
        .onb-card-skip:hover { background:#F8FAFC; }
      `}</style>

      {/* Logo */}
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: '#1A1A2E', letterSpacing: '-0.5px' }}>
          Klass<span style={{ color: '#6B3FA0' }}>IA</span>
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, color: '#A78BFA',
          padding: '2px 8px',
          background: 'rgba(167,139,250,0.15)',
          borderRadius: 99, marginLeft: 6, verticalAlign: 'middle',
        }}>+</span>
      </div>

      {/* Indicateur de progression */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28 }}>
        {([1, 2, 3, 4] as const).map((n, idx) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: n === ecran ? 26 : 10, height: 10, borderRadius: 99,
              background: n < ecran ? '#34D399' : n === ecran ? '#6B3FA0' : '#E2E8F0',
              transition: 'all 0.3s ease',
            }} />
            {idx < 3 && (
              <div style={{
                width: 20, height: 2, borderRadius: 99,
                background: n < ecran ? '#34D399' : '#E2E8F0',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Carte principale */}
      <div className="onb-fade" key={ecran} style={{
        width: '100%', maxWidth: 560,
        background: 'white', borderRadius: 20,
        boxShadow: '0 8px 40px rgba(107,63,160,0.1), 0 2px 8px rgba(0,0,0,0.05)',
        padding: '36px 40px',
      }}>

        {/* ── Écran 1 : Bienvenue ──────────────────────────────────────── */}
        {ecran === 1 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>👋</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1A1A2E', margin: '0 0 10px' }}>
              Bienvenue, {profil.prenom}&nbsp;!
            </h1>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, marginBottom: 26 }}>
              Configurons votre espace en moins de 3 minutes.<br />
              Un profil complet = une IA qui vous ressemble vraiment.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, textAlign: 'left' }}>
              {[
                { e: '🏫', t: 'Votre province et votre matière' },
                { e: '📚', t: 'Votre première classe en 30 secondes' },
                { e: '✦',  t: 'Un programme annuel IA (facultatif)' },
              ].map(({ e, t }) => (
                <div key={t} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', background: '#F8FAFF', borderRadius: 10,
                  fontSize: 14, color: '#374151',
                }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>{e}</span>
                  {t}
                </div>
              ))}
            </div>
            <button className="onb-btn onb-primary" onClick={() => setEcran(2)}
              style={{ width: '100%', fontSize: 16 }}>
              Commencer →
            </button>
          </div>
        )}

        {/* ── Écran 2 : Votre profil ───────────────────────────────────── */}
        {ecran === 2 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A2E', margin: '0 0 6px' }}>
              Votre profil d&apos;enseignant
            </h2>
            <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>
              Ces informations personnalisent votre IA
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Province / Territoire *
                </label>
                <select className="onb-input" value={province} onChange={e => setProvince(e.target.value)}>
                  <option value="">Sélectionnez votre province</option>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Matière principale *
                </label>
                <select className="onb-input" value={matiere} onChange={e => setMatiere(e.target.value)}>
                  <option value="">Sélectionnez votre matière</option>
                  {MATIERES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Niveau d&apos;enseignement *
                </label>
                <select className="onb-input" value={niveau} onChange={e => setNiveau(e.target.value)}>
                  <option value="">Sélectionnez le niveau</option>
                  {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {/* Gabarit facultatif */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Gabarit de leçon <span style={{ fontWeight: 400, color: '#94A3B8' }}>(facultatif)</span>
                </label>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 10px', lineHeight: 1.5 }}>
                  Importez un .docx que vous utilisez déjà. L&apos;IA apprendra votre style.
                </p>

                {gabaritStatus === 'idle' && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                      width: '100%', padding: '14px',
                      border: '2px dashed #E2E8F0', borderRadius: 12,
                      background: '#FAFBFF', cursor: 'pointer',
                      fontSize: 14, color: '#94A3B8',
                      transition: 'border-color 0.15s, color 0.15s',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#6B3FA0'; e.currentTarget.style.color = '#6B3FA0' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#94A3B8' }}
                  >
                    📄 Importer un fichier .docx
                  </button>
                )}
                {gabaritStatus === 'parsing' && (
                  <div style={{ padding: '14px', background: '#F8FAFF', borderRadius: 12, fontSize: 13, color: '#6B3FA0', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <div style={{ width: 14, height: 14, border: '2px solid #6B3FA0', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Analyse en cours…
                  </div>
                )}
                {gabaritStatus === 'done' && (
                  <div style={{ padding: '12px 14px', background: '#ECFDF5', border: '1.5px solid #6EE7B7', borderRadius: 12, fontSize: 13, color: '#065F46' }}>
                    <div style={{ fontWeight: 600 }}>✓ Gabarit analysé — {gabaritFile?.name}</div>
                    <div style={{ fontSize: 11, color: '#10B981', marginTop: 2 }}>Votre style pédagogique sera appris par l&apos;IA</div>
                  </div>
                )}
                {gabaritStatus === 'error' && (
                  <div style={{ padding: '12px 14px', background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 12, fontSize: 13, color: '#991B1B' }}>
                    ⚠️ Impossible de lire ce fichier. Continuez sans gabarit.
                  </div>
                )}

                <input ref={fileRef} type="file" accept=".docx" style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && handleGabaritSelect(e.target.files[0])} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <button className="onb-btn onb-ghost" onClick={() => setEcran(1)}>← Retour</button>
              <button className="onb-btn onb-primary" style={{ flex: 1 }}
                onClick={handleSaveEcran2} disabled={!canNext2}>
                {saving2 ? '⏳ Enregistrement…' : 'Continuer →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Écran 3 : Première classe ────────────────────────────────── */}
        {ecran === 3 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A2E', margin: '0 0 6px' }}>
              Votre première classe
            </h2>
            <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>
              Vous pourrez en ajouter d&apos;autres depuis le tableau de bord
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Nom de la classe *
                </label>
                <input className="onb-input"
                  placeholder="Ex : 4B Mathématiques, CE2 – Dupont"
                  value={nomClasse} onChange={e => setNomClasse(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                    Nombre d&apos;élèves
                  </label>
                  <select className="onb-input" value={nbEleves} onChange={e => setNbEleves(e.target.value)}>
                    {NB_ELEVES_OPTIONS.map(n => <option key={n} value={n}>{n} élèves</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                    Langue d&apos;enseignement
                  </label>
                  <div style={{ display: 'flex', border: '1.5px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', height: 42 }}>
                    {(['fr', 'en'] as const).map(l => (
                      <button key={l} onClick={() => setLangueClasse(l)} style={{
                        flex: 1, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        background: langueClasse === l ? '#6B3FA0' : 'white',
                        color: langueClasse === l ? 'white' : '#64748B',
                        transition: 'all 0.15s', fontFamily: 'inherit',
                      }}>
                        {l === 'fr' ? 'Français' : 'English'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ padding: '11px 14px', background: '#F8FAFF', border: '1px solid #EDE9FE', borderRadius: 10, fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
                📌 <strong>{matiere || '—'}</strong> · <strong>{niveau || '—'}</strong> · <strong>{province || '—'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <button className="onb-btn onb-ghost" onClick={() => setEcran(2)}>← Retour</button>
              <button className="onb-btn onb-primary" style={{ flex: 1 }}
                onClick={handleCreerClasse} disabled={!canNext3 || creerLoad}>
                {creerLoad ? '⏳ Création…' : 'Créer la classe →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Écran 4 : Curriculum ─────────────────────────────────────── */}
        {ecran === 4 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A2E', margin: '0 0 6px' }}>
              Votre programme annuel
            </h2>
            <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>
              KlassIA+ peut générer un programme complet aligné sur le curriculum officiel
            </p>

            {/* Sélection du mode */}
            {currMode === null && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <button className="onb-card-opt" onClick={handleGenererCurriculum}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>✦</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>
                    Générer mon programme avec l&apos;IA
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                    36 semaines · aligné sur le curriculum {province} · {matiere} · {niveau}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <span style={{ padding: '2px 10px', background: 'rgba(167,139,250,0.15)', color: '#6B3FA0', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                      Recommandé
                    </span>
                  </div>
                </button>

                <button className="onb-card-skip" onClick={() => { setCurrMode('skip'); handleFinish() }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Passer pour l&apos;instant</div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>
                    Vous pourrez générer le programme depuis vos classes
                  </div>
                </button>
              </div>
            )}

            {/* Animation de génération */}
            {currMode === 'ia' && (
              <div>
                <div style={{
                  padding: '20px', background: '#F8FAFF',
                  border: '1.5px solid #EDE9FE', borderRadius: 14, marginBottom: 20,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 16 }}>
                    {generating && !genDone && '⏳ Génération en cours…'}
                    {genDone   && '✅ Programme généré avec succès !'}
                    {genError  && '⚠️ Génération interrompue'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {genSteps.map((step, i) => (
                      <div key={i} style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#34D399', fontWeight: 700, flexShrink: 0 }}>✓</span>
                        {step.replace('✓ ', '')}
                      </div>
                    ))}
                    {generating && !genDone && (
                      <div style={{ fontSize: 13, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 12, height: 12, border: '2px solid #6B3FA0', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                        Traitement en cours…
                      </div>
                    )}
                  </div>
                  {genError && (
                    <div style={{ marginTop: 12, fontSize: 13, color: '#991B1B' }}>{genError}</div>
                  )}
                </div>

                {(genDone || genError) && (
                  <button className="onb-btn onb-primary" style={{ width: '100%' }}
                    onClick={handleFinish} disabled={finishing}>
                    {finishing ? '⏳ Finalisation…' : 'Accéder à mon tableau de bord →'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lien "Passer" depuis l'écran 1 */}
      {ecran === 1 && (
        <button
          onClick={() => router.push('/dashboard')}
          style={{ marginTop: 18, fontSize: 13, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Accéder directement au tableau de bord →
        </button>
      )}
    </div>
  )
}
