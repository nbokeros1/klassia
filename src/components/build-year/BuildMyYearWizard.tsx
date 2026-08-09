'use client'

import { useState, useRef, useCallback } from 'react'
import type {
  BuildYearWizardInput, SchoolCalendar, PackGabarits,
  BuildYearEvent, BuildYearStep, BuildYearStepStatut,
} from '@/lib/types/teaching-pack'
import { getEntitlementSummary } from '@/lib/entitlements'
import type { ForfaitType } from '@/lib/types/database'

// ─── Types internes ───────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4 | 5

interface WizardProps {
  classeId: string
  classeNom: string
  niveauInitial?: string
  matiereInitiale?: string
  langueInitiale?: string
  provinceInitiale?: string
  anneeInitiale?: string
  forfait?: ForfaitType
  onDone: (teachingPackId: string, progId: string) => void
}

// ─── Provinces disponibles ────────────────────────────────────────────────────

const PROVINCES = [
  { value: 'alberta',        label: 'Alberta' },
  { value: 'ontario',        label: 'Ontario' },
  { value: 'quebec',         label: 'Québec' },
  { value: 'bc',             label: 'Colombie-Britannique' },
  { value: 'saskatchewan',   label: 'Saskatchewan' },
  { value: 'manitoba',       label: 'Manitoba' },
  { value: 'nouvelle_ecosse',label: 'Nouvelle-Écosse' },
  { value: 'nb',             label: 'Nouveau-Brunswick' },
  { value: 'pei',            label: 'Île-du-Prince-Édouard' },
  { value: 'autre',          label: 'Autre / International' },
]

// ─── Calendrier par défaut selon l'année scolaire ────────────────────────────

function defaultCalendar(annee: string): SchoolCalendar {
  const [debut] = annee.split('-')
  const y = parseInt(debut)
  return {
    date_debut:            `${y}-09-02`,
    date_fin:              `${y + 1}-06-25`,
    jours_enseignement:    [1, 2, 3, 4, 5],
    periodes_par_semaine:  5,
    duree_periode_minutes: 60,
    vacances_noel:         { titre: 'Vacances de Noël', date_debut: `${y}-12-22`, date_fin: `${y + 1}-01-03` },
    relache_printemps:     { titre: 'Relâche de printemps', date_debut: `${y + 1}-03-16`, date_fin: `${y + 1}-03-21` },
    journees_pedagogiques: [
      { titre: 'Journée pédagogique', date_debut: `${y}-09-01` },
      { titre: 'Journée pédagogique', date_debut: `${y}-11-07` },
      { titre: 'Journée pédagogique', date_debut: `${y + 1}-02-14` },
    ],
    jours_feries:          [],
    examens:               [],
    semaines_tampon:       2,
  }
}

// ─── Étiquettes des étapes du pipeline ───────────────────────────────────────

const STEP_LABELS: Record<BuildYearStep, string> = {
  validation:       'Validation de la configuration',
  curriculum:       'Génération du plan annuel',
  syllabus:         'Création du syllabus',
  programme_annuel: 'Sauvegarde du plan annuel',
  sequences:        'Structuration des séquences',
  plans_lecon:      'Plans de leçon de la 1re séquence',
  premiere_lecon:   'Développement de la 1re leçon',
  quiz:             'Création du quiz',
  sauvegarde:       'Sauvegarde du Teaching Pack',
  indexation:       'Indexation dans la Bibliothèque',
  termine:          'Terminé',
  erreur:           'Erreur',
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function BuildMyYearWizard({
  classeId, classeNom, niveauInitial, matiereInitiale,
  langueInitiale, provinceInitiale, anneeInitiale, forfait, onDone,
}: WizardProps) {
  const anneeDefaut = anneeInitiale ?? '2026-2027'

  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [pipelineEvents, setPipelineEvents] = useState<BuildYearEvent[]>([])
  const [globalError, setGlobalError] = useState<string | null>(null)

  // ─── Données du formulaire ─────────────────────────────────────────────────
  const [province,    setProvince]    = useState(provinceInitiale ?? 'alberta')
  const [pays,        setPays]        = useState('Canada')
  const [juridiction, setJuridiction] = useState('')
  const [annee,       setAnnee]       = useState(anneeDefaut)
  const [niveau,      setNiveau]      = useState(niveauInitial ?? '')
  const [matiere,     setMatiere]     = useState(matiereInitiale ?? '')
  const [langue,      setLangue]      = useState(langueInitiale ?? 'fr')

  const [curriculumSource,   setCurriculumSource]   = useState<'televerse' | 'officiel'>('televerse')
  const [curriculumOfficiel, setCurriculumOfficiel] = useState('')
  const [fichierContenu,     setFichierContenu]     = useState('')
  const [fichierNom,         setFichierNom]         = useState('')
  const [uploadLoading,      setUploadLoading]      = useState(false)

  const [gabarits, setGabarits] = useState<PackGabarits>({
    plan_annuel:   'generique',
    plan_sequence: 'generique',
    plan_lecon:    'generique',
  })

  const [calendrier, setCalendrier] = useState<SchoolCalendar>(defaultCalendar(anneeDefaut))

  const fileRef = useRef<HTMLInputElement>(null)

  // ─── Upload de curriculum ──────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (file: File) => {
    setUploadLoading(true)
    setFichierNom(file.name)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/import/docx', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        setFichierContenu(data.texte ?? data.content ?? '')
      }
    } catch {
      // leave contenu empty — API will handle gracefully
    } finally {
      setUploadLoading(false)
    }
  }, [])

  // ─── Lancement du pipeline ─────────────────────────────────────────────────
  const handleBuild = useCallback(async () => {
    setIsGenerating(true)
    setGlobalError(null)
    setPipelineEvents([])

    const input: BuildYearWizardInput = {
      classe_id:                  classeId,
      province, pays, juridiction: juridiction || undefined,
      annee_scolaire:             annee,
      niveau, matiere, langue,
      curriculum_source:          curriculumSource,
      curriculum_officiel:        curriculumOfficiel || undefined,
      curriculum_fichier_contenu: fichierContenu || undefined,
      curriculum_fichier_nom:     fichierNom || undefined,
      gabarits,
      calendrier,
    }

    try {
      const res = await fetch('/api/spie/build-year', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(input),
      })
      if (!res.ok || !res.body) {
        setGlobalError('Erreur lors du démarrage de la génération.')
        setIsGenerating(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          try {
            const event: BuildYearEvent = JSON.parse(line.slice(5).trim())
            setPipelineEvents(prev => {
              // Replace if same step already exists, else append
              const idx = prev.findIndex(e => e.step === event.step)
              if (idx >= 0) { const next = [...prev]; next[idx] = event; return next }
              return [...prev, event]
            })
            if (event.step === 'termine' && event.teaching_pack_id) {
              onDone(event.teaching_pack_id, event.programme_annuel_id ?? '')
            }
            if (event.step === 'erreur') {
              setGlobalError(event.message)
            }
          } catch { /* ignore malformed */ }
        }
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setIsGenerating(false)
    }
  }, [classeId, province, pays, juridiction, annee, niveau, matiere, langue,
      curriculumSource, curriculumOfficiel, fichierContenu, fichierNom,
      gabarits, calendrier, onDone])

  // ─── Validation par étape ──────────────────────────────────────────────────
  const canProceed: Record<WizardStep, boolean> = {
    1: !!province && !!niveau.trim() && !!matiere.trim(),
    2: curriculumSource === 'officiel' ? !!curriculumOfficiel : true,
    3: true,
    4: !!calendrier.date_debut && !!calendrier.date_fin,
    5: true,
  }

  // ─── Résumé entitlements ──────────────────────────────────────────────────
  const { inclus, verrouille } = getEntitlementSummary(forfait)

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  if (isGenerating || pipelineEvents.some(e => e.step === 'termine')) {
    return <PipelineProgressView events={pipelineEvents} globalError={globalError} isRunning={isGenerating} />
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>{classeNom}</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)' }}>
          Construire mon année scolaire
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 8, marginBottom: 0 }}>
          ScorgIA construit votre plan annuel, vos séquences et votre première leçon complète.
        </p>
      </div>

      {/* Indicateur d'étapes */}
      <StepIndicator current={currentStep} />

      {/* Corps */}
      <div style={{ marginTop: 28, background: 'var(--color-bg-secondary)', borderRadius: 14, border: '1px solid var(--color-border)', padding: '28px 28px' }}>

        {currentStep === 1 && (
          <StepContexte
            province={province} setProvince={setProvince}
            pays={pays} setPays={setPays}
            juridiction={juridiction} setJuridiction={setJuridiction}
            annee={annee} setAnnee={v => { setAnnee(v); setCalendrier(defaultCalendar(v)) }}
            niveau={niveau} setNiveau={setNiveau}
            matiere={matiere} setMatiere={setMatiere}
            langue={langue} setLangue={setLangue}
          />
        )}

        {currentStep === 2 && (
          <StepCurriculum
            source={curriculumSource} setSource={setCurriculumSource}
            officiel={curriculumOfficiel} setOfficiel={setCurriculumOfficiel}
            fichierNom={fichierNom} fichierContenu={fichierContenu}
            uploadLoading={uploadLoading}
            province={province}
            onFileSelect={(f) => handleFileUpload(f)}
            fileRef={fileRef}
          />
        )}

        {currentStep === 3 && (
          <StepGabarits
            gabarits={gabarits} setGabarits={setGabarits}
            province={province}
          />
        )}

        {currentStep === 4 && (
          <StepCalendrier
            calendrier={calendrier} setCalendrier={setCalendrier}
          />
        )}

        {currentStep === 5 && (
          <StepResume
            province={province} niveau={niveau} matiere={matiere} annee={annee}
            curriculumSource={curriculumSource} curriculumOfficiel={curriculumOfficiel} fichierNom={fichierNom}
            gabarits={gabarits} calendrier={calendrier}
            inclus={inclus} verrouille={verrouille}
          />
        )}
      </div>

      {globalError && (
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', color: '#F87171', fontSize: 13 }}>
          {globalError}
        </div>
      )}

      {/* Navigation */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => setCurrentStep(s => Math.max(1, s - 1) as WizardStep)}
          disabled={currentStep === 1}
          style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid var(--color-border)', background: 'transparent', color: currentStep === 1 ? 'var(--text-muted)' : 'var(--text-secondary)', fontSize: 14, cursor: currentStep === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          ← Précédent
        </button>

        {currentStep < 5 ? (
          <button
            onClick={() => setCurrentStep(s => Math.min(5, s + 1) as WizardStep)}
            disabled={!canProceed[currentStep]}
            style={{ padding: '10px 28px', borderRadius: 9, border: 'none', background: canProceed[currentStep] ? 'linear-gradient(135deg, #7F77DD, #4F46E5)' : 'rgba(127,119,221,.3)', color: '#FFF', fontSize: 14, fontWeight: 700, cursor: canProceed[currentStep] ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
            Suivant →
          </button>
        ) : (
          <button
            onClick={handleBuild}
            style={{ padding: '12px 32px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg, #7F77DD, #4F46E5)', color: '#FFF', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-display)', boxShadow: '0 4px 18px rgba(79,70,229,.4)' }}>
            ✦ Construire mon année scolaire
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Indicateur d'étapes ──────────────────────────────────────────────────────

function StepIndicator({ current }: { current: WizardStep }) {
  const steps = ['Contexte', 'Curriculum', 'Gabarits', 'Calendrier', 'Résumé']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((label, i) => {
        const n = (i + 1) as WizardStep
        const done = n < current
        const active = n === current
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < 4 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: done ? '#34D399' : active ? 'linear-gradient(135deg,#7F77DD,#4F46E5)' : 'var(--color-bg-secondary)', border: done || active ? 'none' : '2px solid var(--color-border)', color: done || active ? '#FFF' : 'var(--text-muted)' }}>
                {done ? '✓' : n}
              </div>
              <span style={{ fontSize: 10, color: active ? 'var(--color-accent-violet)' : 'var(--text-muted)', fontWeight: active ? 700 : 400, whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {i < 4 && <div style={{ flex: 1, height: 2, background: done ? '#34D399' : 'var(--color-border)', margin: '0 6px', marginBottom: 18 }} />}
          </div>
        )
      })}
    </div>
  )
}

// ─── Étape 1 : Contexte ───────────────────────────────────────────────────────

function StepContexte({ province, setProvince, pays, setPays, juridiction, setJuridiction, annee, setAnnee, niveau, setNiveau, matiere, setMatiere, langue, setLangue }: {
  province: string; setProvince: (v: string) => void
  pays: string; setPays: (v: string) => void
  juridiction: string; setJuridiction: (v: string) => void
  annee: string; setAnnee: (v: string) => void
  niveau: string; setNiveau: (v: string) => void
  matiere: string; setMatiere: (v: string) => void
  langue: string; setLangue: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Étape 1 — Contexte pédagogique</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Province / Territoire *">
          <select value={province} onChange={e => setProvince(e.target.value)} style={selectStyle}>
            {PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Pays">
          <input value={pays} onChange={e => setPays(e.target.value)} placeholder="Canada" style={inputStyle} />
        </Field>
        <Field label="Juridiction / Conseil scolaire (optionnel)">
          <input value={juridiction} onChange={e => setJuridiction(e.target.value)} placeholder="ex. CSFCB, CSCM…" style={inputStyle} />
        </Field>
        <Field label="Année scolaire *">
          <select value={annee} onChange={e => setAnnee(e.target.value)} style={selectStyle}>
            {['2025-2026', '2026-2027', '2027-2028'].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Niveau *">
          <input value={niveau} onChange={e => setNiveau(e.target.value)} placeholder="ex. 5e année, Secondaire 3…" style={inputStyle} />
        </Field>
        <Field label="Matière *">
          <input value={matiere} onChange={e => setMatiere(e.target.value)} placeholder="ex. Mathématiques, Français…" style={inputStyle} />
        </Field>
        <Field label="Langue d'enseignement">
          <select value={langue} onChange={e => setLangue(e.target.value)} style={selectStyle}>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </Field>
      </div>
    </div>
  )
}

// ─── Étape 2 : Curriculum ─────────────────────────────────────────────────────

function StepCurriculum({ source, setSource, officiel, setOfficiel, fichierNom, fichierContenu, uploadLoading, province, onFileSelect, fileRef }: {
  source: 'televerse' | 'officiel'; setSource: (v: 'televerse' | 'officiel') => void
  officiel: string; setOfficiel: (v: string) => void
  fichierNom: string; fichierContenu: string
  uploadLoading: boolean; province: string
  onFileSelect: (f: File) => void
  fileRef: React.RefObject<HTMLInputElement | null>
}) {
  const hasOfficiel = false // Pour la bêta, aucun curriculum officiel n'est encore validé

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Étape 2 — Curriculum</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <CurriculumCard
          active={source === 'televerse'}
          onClick={() => setSource('televerse')}
          icon="📄"
          title="Téléverser mon curriculum"
          desc="PDF, Word ou texte — ScorgIA l'analyse automatiquement."
        />
        <CurriculumCard
          active={source === 'officiel'}
          onClick={() => setSource('officiel')}
          icon="🏛️"
          title="Curriculum officiel ScorgIA"
          desc="Curriculums validés et intégrés par l'équipe ScorgIA."
        />
      </div>

      {source === 'televerse' && (
        <div
          onClick={() => fileRef.current?.click()}
          style={{ border: '2px dashed var(--color-border)', borderRadius: 12, padding: '32px 24px', textAlign: 'center', cursor: 'pointer', transition: 'border-color .2s' }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFileSelect(f) }}
        >
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.md" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelect(f) }} />
          {uploadLoading ? (
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>⏳ Lecture du document…</span>
          ) : fichierNom ? (
            <div>
              <div style={{ fontSize: 20 }}>✅</div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, marginTop: 6 }}>{fichierNom}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{fichierContenu ? `${Math.round(fichierContenu.length / 100) / 10} ko extraits` : 'Cliquez pour changer'}</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 32 }}>📤</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>Glissez votre curriculum ici ou cliquez pour parcourir</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>PDF, Word, texte ou Markdown acceptés</div>
            </div>
          )}
        </div>
      )}

      {source === 'officiel' && !hasOfficiel && (
        <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(251,195,74,.1)', border: '1px solid rgba(251,195,74,.3)', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
          <strong>Aucun curriculum officiel ScorgIA n'est encore disponible pour cette combinaison.</strong>
          <br />Téléversez votre document pour continuer.
          <button onClick={() => setSource('televerse')} style={{ display: 'block', marginTop: 10, padding: '7px 16px', borderRadius: 8, border: 'none', background: 'rgba(127,119,221,.15)', color: 'var(--color-accent-violet)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
            ← Téléverser mon curriculum
          </button>
        </div>
      )}
    </div>
  )
}

function CurriculumCard({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: string; title: string; desc: string }) {
  return (
    <div onClick={onClick} style={{ padding: '20px 18px', borderRadius: 12, border: `2px solid ${active ? 'var(--color-accent-violet)' : 'var(--color-border)'}`, background: active ? 'rgba(127,119,221,.08)' : 'var(--color-bg-primary)', cursor: 'pointer', transition: 'all .15s' }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
    </div>
  )
}

// ─── Étape 3 : Gabarits ───────────────────────────────────────────────────────

function StepGabarits({ gabarits, setGabarits, province }: {
  gabarits: PackGabarits; setGabarits: (g: PackGabarits) => void
  province: string
}) {
  const hasAlberta = province === 'alberta'
  const types: Array<{ key: keyof PackGabarits; label: string; icon: string }> = [
    { key: 'plan_annuel',   label: 'Plan annuel',   icon: '📅' },
    { key: 'plan_sequence', label: 'Plan de séquence', icon: '🗂️' },
    { key: 'plan_lecon',    label: 'Plan de leçon', icon: '📝' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Étape 3 — Gabarits</h2>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
        Choisissez le format pour chaque type de document. Priorité : gabarit utilisateur → provincial ScorgIA → générique.
      </p>
      {types.filter(t => t.key !== 'gabarit_lecon_url').map(({ key, label, icon }) => (
        <div key={key}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{icon} {label}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {hasAlberta && (
              <GabaritOption label="ScorgIA Alberta" active={gabarits[key as 'plan_annuel'] === 'scorgia_alberta'}
                onClick={() => setGabarits({ ...gabarits, [key]: 'scorgia_alberta' })} />
            )}
            <GabaritOption label="Gabarit générique ScorgIA" active={gabarits[key as 'plan_annuel'] === 'generique'}
              onClick={() => setGabarits({ ...gabarits, [key]: 'generique' })} />
            <GabaritOption label="Mon gabarit" active={gabarits[key as 'plan_annuel'] === 'custom'}
              onClick={() => setGabarits({ ...gabarits, [key]: 'custom' })} />
          </div>
        </div>
      ))}
      {!hasAlberta && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Les gabarits provinciaux ScorgIA sont en cours de développement pour votre province.
        </p>
      )}
    </div>
  )
}

function GabaritOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: '8px 14px', borderRadius: 8, border: `2px solid ${active ? 'var(--color-accent-violet)' : 'var(--color-border)'}`, background: active ? 'rgba(127,119,221,.1)' : 'transparent', color: active ? 'var(--color-accent-violet)' : 'var(--text-secondary)', fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
      {active ? '✓ ' : ''}{label}
    </button>
  )
}

// ─── Étape 4 : Calendrier ─────────────────────────────────────────────────────

function StepCalendrier({ calendrier, setCalendrier }: { calendrier: SchoolCalendar; setCalendrier: (c: SchoolCalendar) => void }) {
  const upd = <K extends keyof SchoolCalendar>(key: K, val: SchoolCalendar[K]) => setCalendrier({ ...calendrier, [key]: val })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Étape 4 — Calendrier scolaire</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Début de l'année *">
          <input type="date" value={calendrier.date_debut} onChange={e => upd('date_debut', e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Fin de l'année *">
          <input type="date" value={calendrier.date_fin} onChange={e => upd('date_fin', e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Périodes par semaine">
          <input type="number" min={1} max={30} value={calendrier.periodes_par_semaine}
            onChange={e => upd('periodes_par_semaine', Number(e.target.value))} style={inputStyle} />
        </Field>
        <Field label="Durée par période (min)">
          <input type="number" min={15} max={180} value={calendrier.duree_periode_minutes}
            onChange={e => upd('duree_periode_minutes', Number(e.target.value))} style={inputStyle} />
        </Field>
        <Field label="Vacances de Noël — début">
          <input type="date" value={calendrier.vacances_noel.date_debut}
            onChange={e => upd('vacances_noel', { ...calendrier.vacances_noel, date_debut: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Vacances de Noël — fin">
          <input type="date" value={calendrier.vacances_noel.date_fin ?? ''}
            onChange={e => upd('vacances_noel', { ...calendrier.vacances_noel, date_fin: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Relâche — début">
          <input type="date" value={calendrier.relache_printemps.date_debut}
            onChange={e => upd('relache_printemps', { ...calendrier.relache_printemps, date_debut: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Relâche — fin">
          <input type="date" value={calendrier.relache_printemps.date_fin ?? ''}
            onChange={e => upd('relache_printemps', { ...calendrier.relache_printemps, date_fin: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Semaines tampon (révision/exam)">
          <input type="number" min={0} max={6} value={calendrier.semaines_tampon}
            onChange={e => upd('semaines_tampon', Number(e.target.value))} style={inputStyle} />
        </Field>
      </div>
    </div>
  )
}

// ─── Étape 5 : Résumé ─────────────────────────────────────────────────────────

function StepResume({ province, niveau, matiere, annee, curriculumSource, curriculumOfficiel, fichierNom, gabarits, calendrier, inclus, verrouille }: {
  province: string; niveau: string; matiere: string; annee: string
  curriculumSource: 'televerse' | 'officiel'; curriculumOfficiel: string; fichierNom: string
  gabarits: PackGabarits; calendrier: SchoolCalendar
  inclus: string[]; verrouille: string[]
}) {
  const nbSemaines = calendrier.date_debut && calendrier.date_fin
    ? Math.round((new Date(calendrier.date_fin).getTime() - new Date(calendrier.date_debut).getTime()) / (7 * 24 * 3600 * 1000))
    : 36
  const heuresTotal = Math.round(nbSemaines * calendrier.periodes_par_semaine * calendrier.duree_periode_minutes / 60)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Étape 5 — Résumé avant génération</h2>

      <InfoBlock icon="📍" label="Contexte" value={`${matiere} · ${niveau} · ${PROVINCES.find(p => p.value === province)?.label ?? province} · ${annee}`} />
      <InfoBlock icon="📄" label="Curriculum" value={curriculumSource === 'officiel' ? `Officiel : ${curriculumOfficiel}` : fichierNom || 'Téléversé (générique si vide)'} />
      <InfoBlock icon="📐" label="Gabarits" value={`Plan annuel : ${gabarits.plan_annuel} · Séquence : ${gabarits.plan_sequence} · Leçon : ${gabarits.plan_lecon}`} />
      <InfoBlock icon="🗓️" label="Calendrier" value={`${nbSemaines} semaines · ${heuresTotal}h d'enseignement estimées · ${calendrier.semaines_tampon} semaines tampon`} />

      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>✅ Ce que vous obtiendrez :</div>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {inclus.map((item, i) => (
            <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item}</li>
          ))}
        </ul>
      </div>

      {verrouille.length > 0 && (
        <div style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(148,163,184,.08)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>🔒 Disponible selon votre forfait :</div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {verrouille.map((item, i) => (
              <li key={i} style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(52,211,153,.07)', border: '1px solid rgba(52,211,153,.2)', fontSize: 13, color: 'var(--text-secondary)' }}>
        <strong>Votre année est structurée. La première leçon est prête à enseigner.</strong>
        <br />Les autres contenus détaillés seront disponibles selon votre forfait.
      </div>
    </div>
  )
}

function InfoBlock({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{value}</div>
      </div>
    </div>
  )
}

// ─── Pipeline progress ────────────────────────────────────────────────────────

function PipelineProgressView({ events, globalError, isRunning }: {
  events: BuildYearEvent[]; globalError: string | null; isRunning: boolean
}) {
  const termineEvent = events.find(e => e.step === 'termine')
  const progress = termineEvent ? 100 : (events.at(-1)?.progress ?? 0)

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>
          {termineEvent ? '🎉' : isRunning ? '⚙️' : globalError ? '❌' : '⏳'}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          {termineEvent ? 'Votre année est construite !' : isRunning ? 'Génération en cours…' : globalError ? 'Erreur' : 'Préparation…'}
        </h2>
        {isRunning && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8, marginBottom: 0 }}>
            Cela peut prendre 1 à 2 minutes. Ne fermez pas cet onglet.
          </p>
        )}
      </div>

      {/* Barre de progression */}
      <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 99, marginBottom: 28, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg, #7F77DD, #34D399)', borderRadius: 99, width: `${progress}%`, transition: 'width .5s ease' }} />
      </div>

      {/* Étapes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {events.map((ev, i) => (
          <PipelineStepRow key={i} event={ev} />
        ))}
      </div>

      {globalError && !termineEvent && (
        <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 10, background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', color: '#F87171', fontSize: 13 }}>
          {globalError}
        </div>
      )}
    </div>
  )
}

function PipelineStepRow({ event }: { event: BuildYearEvent }) {
  const icon: Record<BuildYearStepStatut, string> = {
    en_attente: '⏳', en_cours: '🔄', termine: '✅', erreur: '❌', ignore: '—',
  }
  const color: Record<BuildYearStepStatut, string> = {
    en_attente: 'var(--text-muted)', en_cours: '#FBC34A', termine: '#34D399', erreur: '#F87171', ignore: 'var(--text-muted)',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 9, background: event.statut === 'en_cours' ? 'rgba(251,195,74,.07)' : 'transparent' }}>
      <span style={{ fontSize: 16 }}>{icon[event.statut]}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: color[event.statut] }}>{STEP_LABELS[event.step] ?? event.step}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{event.message}</div>
      </div>
    </div>
  )
}

// ─── Petits helpers UI ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--color-border)',
  background: 'var(--color-bg-primary)', color: 'var(--text-primary)', fontSize: 13,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer',
}
