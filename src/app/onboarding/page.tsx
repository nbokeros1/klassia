'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────

const NIVEAUX_PROFIL = ['Primaire', 'Secondaire', 'Collégial', 'Universitaire']
const NIVEAUX_CLASSE = [
  'Maternelle', 'Préscolaire',
  '1re année', '2e année', '3e année', '4e année', '5e année', '6e année',
  'Secondaire 1', 'Secondaire 2', 'Secondaire 3', 'Secondaire 4', 'Secondaire 5',
  'Cégep', 'Université', 'Autre',
]
const MATIERES = [
  'Mathématiques', 'Français', 'Anglais', 'Sciences', 'Études sociales',
  'Histoire', 'Géographie', 'Arts', 'Éducation physique', 'Musique',
  'Informatique', 'Physique', 'Chimie', 'Biologie', 'Philosophie', 'Autre',
]
const PAYS_OPTIONS = [
  { v: 'canada', l: '🇨🇦 Canada' },
  { v: 'usa', l: '🇺🇸 États-Unis' },
  { v: 'autre', l: '🌍 Autre' },
]
const PROVINCES_CA = [
  'Alberta', 'Colombie-Britannique', 'Manitoba', 'Nouveau-Brunswick',
  'Terre-Neuve-et-Labrador', 'Nouvelle-Écosse', 'Ontario',
  'Île-du-Prince-Édouard', 'Québec', 'Saskatchewan',
]
const STATES_US = [
  'California', 'Texas', 'New York', 'Florida', 'Illinois',
  'Pennsylvania', 'Ohio', 'Georgia', 'Washington', 'Autre',
]
const CURRICULA_OFFICIELS = [
  { v: 'alberta', l: '🇨🇦 Alberta (Programme d\'études)' },
  { v: 'ontario', l: '🇨🇦 Ontario (Curriculum de l\'Ontario)' },
  { v: 'quebec', l: '🇨🇦 Québec (Programme de formation MELS)' },
  { v: 'bc', l: '🇨🇦 Colombie-Britannique' },
  { v: 'common_core', l: '🇺🇸 Common Core (USA)' },
  { v: 'ib', l: '🌍 Baccalauréat International (IB)' },
]
const COULEURS_CLASSE = [
  '#1B3F6E', '#6B3FA0', '#2D5FA0', '#0F766E', '#B45309',
  '#BE185D', '#4338CA', '#047857', '#7C3AED', '#D97706',
]

const TOTAL_STEPS = 11
const DISPLAY_TOTAL = 6   // étapes réelles affichées (sans welcome, terminé, et étapes IA supprimées)

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [profil, setProfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Step 2 — profil
  const [langue, setLangue] = useState<'fr' | 'en' | 'bilingue'>('fr')
  const [pays, setPays] = useState<'canada' | 'usa' | 'autre'>('canada')
  const [province, setProvince] = useState('Québec')
  const [niveau, setNiveau] = useState('')
  const [matieres, setMatieres] = useState<string[]>([])

  // Step 3 — classe
  const [classeNom, setClasseNom] = useState('')
  const [classeNiveau, setClasseNiveau] = useState('')
  const [classeMatiere, setClasseMatiere] = useState('')
  const [classeEleves, setClasseEleves] = useState('25')
  const [classeCouleur, setClasseCouleur] = useState(COULEURS_CLASSE[0])
  const [classeId, setClasseId] = useState('')
  const [firstLeconId, setFirstLeconId] = useState('')

  // Step 4 — curriculum
  const [curriculumMode, setCurriculumMode] = useState<'import' | 'officiel' | 'manuel' | 'auto' | ''>('')
  const [curriculumOfficiel, setCurriculumOfficiel] = useState('')
  const [curriculumFile, setCurriculumFile] = useState<File | null>(null)
  const [curriculumTexte, setCurriculumTexte] = useState('')

  // Step 5 — analyse results
  const [analyseRunning, setAnalyseRunning] = useState(false)
  const [analyseStep, setAnalyseStep] = useState(0)
  const [analyseDone, setAnalyseDone] = useState(false)
  const [analyseData, setAnalyseData] = useState({ unites: 0, objectifs: 0, lecons: 0 })

  // Step 6 — syllabus
  const [syllabusContent, setSyllabusContent] = useState('')
  const [syllabusLoading, setSyllabusLoading] = useState(false)
  const [syllabusEditing, setSyllabusEditing] = useState(false)

  // Step 7 — programme annuel
  const [programmeJson, setProgrammeJson] = useState<any>(null)
  const [programmeLoading, setProgrammeLoading] = useState(false)

  // Step 8 — génération leçons
  const [genMode, setGenMode] = useState<'une' | 'sequence' | 'tout' | ''>('')
  const [, setGenLeconsDone] = useState(false)
  const [genLeconsList, setGenLeconsList] = useState<any[]>([])

  const ANALYSE_STEPS = [
    'Lecture du curriculum...',
    'Extraction des résultats d\'apprentissage...',
    'Identification des objectifs...',
    'Détection des unités thématiques...',
    'Planification des leçons recommandées...',
  ]

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      let { data: p } = await supabase
        .from('utilisateurs').select('*').eq('user_id', session.user.id).single()

      // Si la ligne n'existe pas encore (trigger silencieux), on la crée
      if (!p) {
        const { data: created } = await supabase.from('utilisateurs').upsert({
          user_id: session.user.id,
          email: session.user.email,
          prenom: session.user.user_metadata?.prenom || '',
          nom: session.user.user_metadata?.nom || '',
          ecole: session.user.user_metadata?.ecole || '',
          type_compte: 'enseignant',
          langue: 'fr',
          onboarding_complete: false,
        }, { onConflict: 'user_id' }).select().single()
        p = created
      }

      if (p?.onboarding_complete) { router.push('/dashboard'); return }
      setProfil(p)
      if (p?.province) setProvince(p.province)
      if (p?.langue) setLangue(p.langue as any)
      if (p?.niveau_enseignement) setNiveau(p.niveau_enseignement)
      if (p?.matiere) setMatieres([p.matiere])
      setLoading(false)
    }
    init()
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleMatiere = (m: string) =>
    setMatieres(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])

  const provincesList = pays === 'usa' ? STATES_US : PROVINCES_CA

  // ── Handlers ──────────────────────────────────────────────────────────────

  // Résout le profil si null — crée la ligne utilisateurs si manquante
  const resolveProfilId = async (): Promise<string | null> => {
    if (profil?.id) return profil.id
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    // Cherche d'abord
    let { data: existing } = await supabase
      .from('utilisateurs').select('id').eq('user_id', session.user.id).maybeSingle()
    if (!existing) {
      // Crée si absent
      const { data: created } = await supabase.from('utilisateurs').upsert({
        user_id: session.user.id,
        email: session.user.email || '',
        prenom: session.user.user_metadata?.prenom || '',
        nom: session.user.user_metadata?.nom || '',
        type_compte: 'enseignant',
        langue: 'fr',
        onboarding_complete: false,
      }, { onConflict: 'user_id' }).select().single()
      if (created) { setProfil(created); return created.id }
      return null
    }
    setProfil(existing)
    return existing.id
  }

  const handleSaveProfil = async () => {
    setSaving(true)
    const pid = await resolveProfilId()
    if (pid) {
      await supabase.from('utilisateurs').update({
        langue: langue === 'bilingue' ? 'fr' : langue,
        province,
        niveau_enseignement: niveau,
        matiere: matieres[0] || '',
      }).eq('id', pid)
    }
    setSaving(false)
    setStep(3)
  }

  const handleCreateClasse = async () => {
    if (!classeNom || !classeNiveau) return
    setSaving(true)
    const pid = await resolveProfilId()
    if (!pid) { setSaving(false); return }
    const { data } = await supabase.from('classes').insert({
      enseignant_id: pid,
      nom: classeNom,
      niveau: classeNiveau,
      matiere: classeMatiere || matieres[0] || '',
      nombre_eleves: parseInt(classeEleves) || 25,
      couleur: classeCouleur,
      langue: langue === 'bilingue' ? 'fr' : langue,
    }).select().single()
    if (data) setClasseId(data.id)
    setSaving(false)
    setStep(5)
  }

  const handleStartAnalyse = async () => {
    setAnalyseRunning(true)
    setStep(6)
    for (let i = 1; i <= 4; i++) {
      setTimeout(() => setAnalyseStep(i), i * 900)
    }
    setTimeout(async () => {
      // Compute estimated values based on matière/niveau
      const nbUnites = curriculumTexte ? Math.ceil(curriculumTexte.split('\n').filter(Boolean).length / 3) || 8 : 8
      const nbObjectifs = nbUnites * 5 + Math.floor(Math.random() * 8)
      const nbLecons = nbUnites * 4 + Math.floor(Math.random() * 6)
      setAnalyseData({ unites: Math.max(nbUnites, 5), objectifs: nbObjectifs, lecons: Math.max(nbLecons, 20) })
      setAnalyseRunning(false)
      setAnalyseDone(true)
    }, 5200)
  }

  const handleGenerateSyllabus = async () => {
    setSyllabusLoading(true)
    try {
      const res = await fetch('/api/ia/generer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_contenu: 'plan_cours',
          sujet: `Syllabus annuel pour ${classeNom}`,
          contexte: {
            classe: { nom: classeNom, niveau: classeNiveau, matiere: classeMatiere || matieres[0] },
            curriculum: curriculumTexte || (curriculumOfficiel ? `Curriculum officiel : ${curriculumOfficiel}` : ''),
          },
          langue: langue === 'bilingue' ? 'fr' : langue,
          instructions: `Génère un syllabus annuel structuré pour une classe de ${classeNiveau} en ${classeMatiere || matieres[0] || 'matière générale'}. Inclus: description du cours, objectifs généraux (5-7), compétences visées, calendrier prévisionnel (36 semaines en 6 unités), méthodes pédagogiques, modes d'évaluation, ressources principales. Format professionnel et lisible.`,
        }),
      })
      const data = await res.json()
      setSyllabusContent(data.contenu || `# Syllabus — ${classeNom}\n\n## Description du cours\nCe cours de ${classeMatiere || matieres[0] || 'matière'} pour ${classeNiveau} couvre les objectifs du programme annuel.\n\n## Objectifs généraux\n1. Maîtriser les concepts fondamentaux\n2. Développer la pensée critique\n3. Appliquer les apprentissages\n\n## Calendrier\n36 semaines · 6 unités thématiques\n\n## Méthodes pédagogiques\nEnseignement explicite, pratique guidée, projets collaboratifs\n\n## Évaluation\nFormative continue + 2 évaluations sommatives par unité`)
    } catch {
      setSyllabusContent(`# Syllabus — ${classeNom}\n\n## Description\nCours de ${classeMatiere || matieres[0] || 'matière'} pour ${classeNiveau}.\n\n## Objectifs généraux\n• Maîtriser les concepts clés\n• Développer les compétences\n• Appliquer les apprentissages\n\n## Calendrier\n36 semaines · 6 unités\n\n## Évaluation\nFormative + sommative`)
    }
    setSyllabusLoading(false)
    setStep(7)
  }

  const handleAcceptSyllabus = async () => {
    // Save syllabus as IA generation
    if (syllabusContent && profil?.id) {
      await supabase.from('generations_ia').insert({
        enseignant_id: profil.id,
        classe_id: classeId || null,
        type_contenu: 'plan_cours',
        contenu_genere: syllabusContent,
        sauvegarde: true,
      })
    }
    handleGenerateProgramme()
  }

  const handleGenerateProgramme = async () => {
    setProgrammeLoading(true)
    setStep(8)
    try {
      const res = await fetch('/api/ia/generer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_contenu: 'plan_cours',
          sujet: `Programme annuel structuré pour ${classeNom}`,
          contexte: { classe: { nom: classeNom, niveau: classeNiveau, matiere: classeMatiere || matieres[0] } },
          langue: langue === 'bilingue' ? 'fr' : langue,
          instructions: `Génère UNIQUEMENT un JSON valide (sans markdown) avec ce format exact:
{"titre":"Programme ${classeNom}","nb_semaines":36,"unites":[{"numero":1,"titre":"Titre unité","semaine_debut":1,"semaine_fin":6,"objectifs":["objectif 1","objectif 2"],"lecons":[{"numero":1,"titre":"Titre leçon","duree_minutes":75},{"numero":2,"titre":"Titre leçon 2","duree_minutes":75}]}]}
Crée 6 unités avec 5-6 leçons chacune pour ${classeNiveau} en ${classeMatiere || matieres[0] || 'matière'}. JSON pur uniquement.`,
        }),
      })
      const d = await res.json()
      let progJson: any = null
      try {
        const raw = (d.contenu || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        progJson = JSON.parse(raw)
      } catch {
        progJson = {
          titre: `Programme ${classeNom}`,
          nb_semaines: 36,
          unites: Array.from({ length: 6 }, (_, i) => ({
            numero: i + 1,
            titre: `Unité ${i + 1}`,
            semaine_debut: i * 6 + 1,
            semaine_fin: (i + 1) * 6,
            objectifs: ['Objectif 1', 'Objectif 2'],
            lecons: Array.from({ length: 5 }, (_, j) => ({
              numero: i * 5 + j + 1,
              titre: `Leçon ${i * 5 + j + 1}`,
              duree_minutes: 75,
            })),
          })),
        }
      }
      setProgrammeJson(progJson)

      if (classeId) {
        await supabase.from('programme_annuel').insert({
          classe_id: classeId,
          titre: progJson.titre,
          nb_semaines: progJson.nb_semaines || 36,
          contenu_json: progJson,
        })
      }
    } catch {
      setProgrammeJson({
        titre: `Programme ${classeNom}`,
        nb_semaines: 36,
        unites: Array.from({ length: 6 }, (_, i) => ({
          numero: i + 1, titre: `Unité ${i + 1}`,
          semaine_debut: i * 6 + 1, semaine_fin: (i + 1) * 6,
          objectifs: [], lecons: Array.from({ length: 4 }, (_, j) => ({ numero: i * 4 + j + 1, titre: `Leçon ${i * 4 + j + 1}`, duree_minutes: 75 })),
        })),
      })
    }
    setProgrammeLoading(false)
  }

  const handleGenerateLecons = async () => {
    setGenLeconsDone(false)
    setSaving(true)
    const maxUnites = genMode === 'une' ? 1 : genMode === 'sequence' ? 2 : (programmeJson?.unites?.length || 6)
    const maxLecons = genMode === 'une' ? 1 : genMode === 'sequence' ? 5 : 10
    const lecons: any[] = []
    for (const unite of (programmeJson?.unites || []).slice(0, maxUnites)) {
      for (const lecon of (unite.lecons || []).slice(0, maxLecons)) {
        lecons.push({
          classe_id: classeId,
          titre: lecon.titre,
          duree_minutes: lecon.duree_minutes || 75,
          statut: 'brouillon',
          contenu_json: {},
        })
      }
    }
    if (lecons.length && classeId) {
      const { data: inserted } = await supabase.from('lecons').insert(lecons).select('id')
      if (inserted?.[0]) setFirstLeconId(inserted[0].id)
      setGenLeconsList(lecons.map((l, i) => ({ ...l, id: inserted?.[i]?.id })))
    }
    setSaving(false)
    setStep(10)
  }

  const handleFinish = async () => {
    setSaving(true)
    const pid = await resolveProfilId()
    if (pid) {
      await supabase.from('utilisateurs').update({ onboarding_complete: true }).eq('id', pid)
    }
    setSaving(false)
    router.push('/dashboard')
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#050D1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(107,63,160,0.3)', borderTopColor: '#A78BFA', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // Progression (étapes 6,7,8 supprimées du flux — flow : 1→2→3→4→5→9→10→11)
  const progressPercent =
    step <= 1 ? 0 : step === 2 ? 14 : step === 3 ? 14 :
    step === 4 ? 30 : step === 5 ? 46 : step === 9 ? 65 :
    step === 10 ? 83 : step >= 11 ? 100 : 0

  // Bouton "Passer cette étape" discret sous les boutons principaux
  const NavSkip = ({ next }: { next: number | 'finish' }) => (
    <div style={{ textAlign: 'center', marginTop: '14px' }}>
      <button type="button"
        onClick={() => next === 'finish' ? handleFinish() : setStep(next as number)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'rgba(255,255,255,0.32)', textDecoration: 'underline', padding: '4px 8px' }}>
        Passer cette étape →
      </button>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)', marginTop: '3px' }}>
        Vous pourrez compléter ceci depuis votre tableau de bord
      </div>
    </div>
  )

  // ── Style helpers ─────────────────────────────────────────────────────────
  const chipStyle = (active: boolean, color = '#A78BFA', bg = 'rgba(167,139,250,0.15)') => ({
    padding: '7px 14px', borderRadius: '99px', cursor: 'pointer', fontSize: '12px', fontWeight: active ? 700 : 400,
    border: `1.5px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
    background: active ? bg : 'rgba(255,255,255,0.03)',
    color: active ? color : 'rgba(255,255,255,0.45)',
    transition: 'all 0.15s', outline: 'none',
  } as React.CSSProperties)

  const input = (style?: React.CSSProperties) => ({
    width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', fontSize: '14px',
    color: 'white', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const,
    ...style,
  } as React.CSSProperties)

  const card = {
    background: 'rgba(13,21,37,0.92)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '22px', padding: '36px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
  } as React.CSSProperties

  const primaryBtn = (disabled = false): React.CSSProperties => ({
    padding: '13px 32px', fontSize: '14px', fontWeight: 700,
    background: disabled ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #6B3FA0, #4F46E5)',
    color: disabled ? 'rgba(255,255,255,0.25)' : 'white',
    border: 'none', borderRadius: '12px', cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : '0 6px 24px rgba(107,63,160,0.4)',
    transition: 'all 0.2s',
  })

  const backBtn = { background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '13px' } as React.CSSProperties
  const sectionLabel = { display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '10px', letterSpacing: '1px', textTransform: 'uppercase' as const }
  const nav = (stepNum: number) => (
    <div style={{ fontSize: '11px', fontWeight: 700, color: '#A78BFA', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>
      Étape {stepNum} / {DISPLAY_TOTAL}
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{
      minHeight: '100vh', background: '#050D1A',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '32px 24px 48px',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Aurora */}
      <div style={{ position: 'fixed', top: '-200px', right: '-100px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-200px', left: '-100px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(27,63,110,0.22) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header */}
      <div style={{ width: '100%', maxWidth: '640px', marginBottom: '28px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
            Klass<span style={{ color: '#A78BFA' }}>IA</span>
          </div>
          {step > 1 && step < TOTAL_STEPS && step !== 3 && (
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
              {step < TOTAL_STEPS - 1 ? `Étape ${[2,3,4,5,9,10].indexOf(step) + 1 || ''} / ${DISPLAY_TOTAL}` : 'Presque terminé'}
            </div>
          )}
          {step === 3 && (
            <div style={{ fontSize: '12px', color: '#34D399' }}>✓ Profil sauvegardé</div>
          )}
        </div>
        {step > 1 && step < TOTAL_STEPS && (
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPercent}%`, background: 'linear-gradient(90deg, #6B3FA0, #A78BFA)', borderRadius: '99px', transition: 'width 0.5s ease' }} />
          </div>
        )}
      </div>

      <div style={{ width: '100%', maxWidth: '640px', position: 'relative', zIndex: 1 }}>

        {/* ═══ STEP 1 — BIENVENUE ═══════════════════════════════════════════ */}
        {step === 1 && (
          <div style={{ textAlign: 'center', animation: 'fadeUp 0.5s ease' }}>
            <div style={{ width: 80, height: 80, borderRadius: '24px', margin: '0 auto 24px', background: 'linear-gradient(135deg, #1B3F6E, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 800, color: 'white', boxShadow: '0 0 48px rgba(124,58,237,0.5)' }}>K</div>
            <h1 style={{ fontSize: '34px', fontWeight: 800, color: 'white', marginBottom: '14px', letterSpacing: '-1px' }}>
              Bienvenue sur KlassIA+
            </h1>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.45)', marginBottom: '6px', lineHeight: 1.6 }}>
              Votre assistant pédagogique intelligent.
            </p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', marginBottom: '40px', lineHeight: 1.7 }}>
              Préparez, enseignez et suivez vos cours dans un seul espace.<br />
              En 5 minutes, votre classe sera prête à enseigner.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '40px', textAlign: 'left' }}>
              {[
                { icon: '🏫', t: 'Première classe créée',    s: 'Configurée et prête' },
                { icon: '📋', t: 'Syllabus généré',          s: 'Par IA en quelques secondes' },
                { icon: '🗓️', t: 'Programme annuel',         s: '36 semaines planifiées' },
                { icon: '📚', t: 'Premières leçons',         s: 'Plans structurés prêts' },
              ].map((x, i) => (
                <div key={i} style={{ padding: '16px', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', display: 'flex', gap: '12px' }}>
                  <div style={{ fontSize: '26px', flexShrink: 0 }}>{x.icon}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', marginBottom: '2px' }}>{x.t}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{x.s}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(2)} style={{ padding: '16px 56px', fontSize: '16px', fontWeight: 700, background: 'linear-gradient(135deg, #6B3FA0, #4F46E5)', color: 'white', border: 'none', borderRadius: '14px', cursor: 'pointer', boxShadow: '0 8px 32px rgba(107,63,160,0.5)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(107,63,160,0.6)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(107,63,160,0.5)' }}>
              COMMENCER →
            </button>
            <div style={{ marginTop: '14px', fontSize: '11px', color: 'rgba(255,255,255,0.18)' }}>
              Environ 5 minutes · Tout est modifiable ensuite
            </div>
          </div>
        )}

        {/* ═══ STEP 2 — PROFIL ENSEIGNANT ══════════════════════════════════ */}
        {step === 2 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <div style={card}>
              {nav(1)}
              <h2 style={{ fontSize: '26px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>Votre profil enseignant</h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '28px' }}>Ces informations permettent à l'IA de personnaliser tout le contenu</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Langue */}
                <div>
                  <label style={sectionLabel}>Langue d'enseignement</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[{ v: 'fr', l: '🇫🇷 Français' }, { v: 'en', l: '🇨🇦 English' }, { v: 'bilingue', l: '🌐 Bilingue' }].map(o => (
                      <button key={o.v} type="button" onClick={() => setLangue(o.v as any)}
                        style={{ ...chipStyle(langue === o.v), flex: 1, padding: '10px' }}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pays */}
                <div>
                  <label style={sectionLabel}>Pays</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {PAYS_OPTIONS.map(o => (
                      <button key={o.v} type="button" onClick={() => { setPays(o.v as any); setProvince(o.v === 'canada' ? 'Québec' : o.v === 'usa' ? 'California' : '') }}
                        style={{ ...chipStyle(pays === o.v, '#60A5FA', 'rgba(96,165,250,0.15)'), flex: 1, padding: '10px' }}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Province / État */}
                {pays !== 'autre' && (
                  <div>
                    <label style={sectionLabel}>{pays === 'usa' ? 'État' : 'Province'}</label>
                    <select value={province} onChange={e => setProvince(e.target.value)}
                      style={{ ...input(), color: 'white' }}>
                      {provincesList.map(p => <option key={p} value={p} style={{ background: '#0D0D1A' }}>{p}</option>)}
                    </select>
                  </div>
                )}

                {/* Niveau */}
                <div>
                  <label style={sectionLabel}>Niveau enseigné principalement</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {NIVEAUX_PROFIL.map(n => (
                      <button key={n} type="button" onClick={() => setNiveau(n)}
                        style={chipStyle(niveau === n, '#A78BFA', 'rgba(167,139,250,0.15)')}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Matières */}
                <div>
                  <label style={sectionLabel}>Matière(s) enseignée(s)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                    {MATIERES.map(m => (
                      <button key={m} type="button" onClick={() => toggleMatiere(m)}
                        style={chipStyle(matieres.includes(m), '#60A5FA', 'rgba(96,165,250,0.15)')}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
                <button onClick={() => setStep(1)} style={backBtn}>← Retour</button>
                <button onClick={handleSaveProfil} disabled={saving || !niveau}
                  style={primaryBtn(saving || !niveau)}>
                  {saving ? 'Sauvegarde...' : 'Continuer →'}
                </button>
              </div>
              <NavSkip next={3} />
            </div>
          </div>
        )}

        {/* ═══ STEP 3 — CHOIX DU PARCOURS ════════════════════════════════ */}
        {step === 3 && (
          <div style={{ animation: 'fadeUp 0.5s ease', textAlign: 'center' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px', background: 'linear-gradient(135deg, #34D399, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', boxShadow: '0 0 32px rgba(52,211,153,0.4)' }}>✓</div>
              <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'white', marginBottom: '6px', letterSpacing: '-0.5px' }}>Votre profil est prêt !</h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>Comment voulez-vous continuer ?</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', maxWidth: '580px', margin: '0 auto 24px' }}>
              {/* Option A — Configuration complète */}
              <button onClick={() => setStep(4)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', padding: '22px', background: 'linear-gradient(135deg, rgba(107,63,160,0.2), rgba(79,70,229,0.15))', border: '2px solid rgba(167,139,250,0.4)', borderRadius: '18px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(107,63,160,0.35)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                <div style={{ fontSize: '32px' }}>🚀</div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#A78BFA', marginBottom: '6px' }}>Configurer ma classe maintenant</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                    Créer ma classe → Curriculum → Syllabus IA → Programme annuel → Premières leçons
                  </div>
                </div>
                <div style={{ marginTop: 'auto', fontSize: '12px', fontWeight: 700, color: '#A78BFA', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Commencer la configuration →
                </div>
              </button>

              {/* Option B — Accès rapide */}
              <button onClick={handleFinish}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', padding: '22px', background: 'rgba(255,255,255,0.04)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '18px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '32px' }}>⚡</div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>Accéder au tableau de bord</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                    Je crée ma classe plus tard depuis le dashboard. Tout reste accessible à tout moment.
                  </div>
                </div>
                <div style={{ marginTop: 'auto', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Entrer dans mon espace →
                </div>
              </button>
            </div>

            <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}>
              ← Modifier mon profil
            </button>
          </div>
        )}

        {/* ═══ STEP 4 — PREMIÈRE CLASSE ════════════════════════════════════ */}
        {step === 4 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <div style={card}>
              {nav(2)}
              <h2 style={{ fontSize: '26px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>Créons votre première classe</h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '28px' }}>Vous pourrez en ajouter d'autres après l'installation</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={sectionLabel}>Nom de la classe *</label>
                    <input value={classeNom} onChange={e => setClasseNom(e.target.value)}
                      placeholder="Ex : Français 4A, Groupe B..." style={input()} />
                  </div>
                  <div>
                    <label style={sectionLabel}>Nombre d'élèves</label>
                    <input type="number" value={classeEleves} onChange={e => setClasseEleves(e.target.value)}
                      style={input()} />
                  </div>
                </div>

                <div>
                  <label style={sectionLabel}>Niveau *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                    {NIVEAUX_CLASSE.map(n => (
                      <button key={n} type="button" onClick={() => setClasseNiveau(n)}
                        style={chipStyle(classeNiveau === n, '#60A5FA', 'rgba(96,165,250,0.15)')}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={sectionLabel}>Matière principale</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                    {MATIERES.map(m => (
                      <button key={m} type="button" onClick={() => setClasseMatiere(m)}
                        style={chipStyle(classeMatiere === m, '#A78BFA', 'rgba(167,139,250,0.15)')}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={sectionLabel}>Couleur de la classe</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {COULEURS_CLASSE.map(c => (
                      <button key={c} type="button" onClick={() => setClasseCouleur(c)}
                        style={{ width: 34, height: 34, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', outline: classeCouleur === c ? '3px solid white' : '3px solid transparent', outlineOffset: '2px', transition: 'all 0.15s' }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview */}
              {classeNom && (
                <div style={{ marginTop: '20px', padding: '14px 18px', background: `${classeCouleur}18`, border: `1px solid ${classeCouleur}40`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '10px', background: classeCouleur, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: 'white', flexShrink: 0 }}>{classeNom[0]?.toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{classeNom}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{classeNiveau || 'Niveau non sélectionné'} {classeMatiere ? `· ${classeMatiere}` : ''} · {classeEleves} élèves</div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px' }}>
                <button onClick={() => setStep(3)} style={backBtn}>← Retour</button>
                <button onClick={handleCreateClasse} disabled={saving || !classeNom || !classeNiveau}
                  style={primaryBtn(saving || !classeNom || !classeNiveau)}>
                  {saving ? 'Création...' : 'Créer la classe →'}
                </button>
              </div>
              <NavSkip next={5} />
            </div>
          </div>
        )}

        {/* ═══ STEP 5 — CURRICULUM ═════════════════════════════════════════ */}
        {step === 5 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <div style={card}>
              {nav(3)}
              <h2 style={{ fontSize: '26px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>Comment souhaitez-vous commencer ?</h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '28px' }}>L'IA analysera votre curriculum pour générer un programme adapté</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {[
                  { v: 'import',   icon: '📁', t: 'Importer un curriculum',        s: 'PDF, Word, PowerPoint' },
                  { v: 'officiel', icon: '🏛️', t: 'Choisir un curriculum officiel', s: 'Alberta, Ontario, Québec, Common Core...' },
                  { v: 'manuel',   icon: '✍️', t: 'Saisir les grandes lignes',     s: 'Décrivez vos unités et objectifs principaux' },
                ].map(opt => (
                  <button key={opt.v} type="button" onClick={() => setCurriculumMode(opt.v as any)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '16px',
                      padding: '16px 20px', borderRadius: '14px', cursor: 'pointer', textAlign: 'left',
                      border: `2px solid ${curriculumMode === opt.v ? '#60A5FA' : 'rgba(255,255,255,0.07)'}`,
                      background: curriculumMode === opt.v ? 'rgba(96,165,250,0.08)' : 'rgba(255,255,255,0.03)',
                      transition: 'all 0.15s', width: '100%',
                    }}>
                    <div style={{ fontSize: '28px', flexShrink: 0 }}>{opt.icon}</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: curriculumMode === opt.v ? '#60A5FA' : 'white', marginBottom: '2px' }}>{opt.t}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{opt.s}</div>
                    </div>
                    {curriculumMode === opt.v && <div style={{ marginLeft: 'auto', color: '#60A5FA', fontSize: '18px' }}>✓</div>}
                  </button>
                ))}
              </div>

              {/* Sub-form for each mode */}
              {curriculumMode === 'import' && (
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '20px', border: '2px dashed rgba(96,165,250,0.3)', borderRadius: '12px', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '14px', background: 'rgba(96,165,250,0.04)', marginBottom: '16px' }}>
                  📁 {curriculumFile ? curriculumFile.name : 'Cliquez pour importer (PDF, DOCX, PPTX)'}
                  <input type="file" accept=".pdf,.docx,.pptx,.txt" style={{ display: 'none' }} onChange={e => setCurriculumFile(e.target.files?.[0] || null)} />
                </label>
              )}

              {curriculumMode === 'officiel' && (
                <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {CURRICULA_OFFICIELS.map(c => (
                    <button key={c.v} type="button" onClick={() => setCurriculumOfficiel(c.v)}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', border: `1.5px solid ${curriculumOfficiel === c.v ? '#A78BFA' : 'rgba(255,255,255,0.08)'}`, background: curriculumOfficiel === c.v ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.02)' }}>
                      <span style={{ fontSize: '14px', color: curriculumOfficiel === c.v ? '#A78BFA' : 'rgba(255,255,255,0.6)', fontWeight: curriculumOfficiel === c.v ? 600 : 400 }}>{c.l}</span>
                      {curriculumOfficiel === c.v && <span style={{ marginLeft: 'auto', color: '#A78BFA' }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}

              {curriculumMode === 'manuel' && (
                <textarea value={curriculumTexte} onChange={e => setCurriculumTexte(e.target.value)}
                  placeholder="Décrivez vos grandes unités, objectifs généraux, ou collez le texte de votre curriculum..."
                  rows={6}
                  style={{ ...input(), resize: 'vertical', lineHeight: '1.6', marginBottom: '16px' }} />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setStep(4)} style={backBtn}>← Retour</button>
                <button onClick={() => setStep(9)} disabled={!curriculumMode}
                  style={primaryBtn(!curriculumMode)}>
                  Continuer →
                </button>
              </div>
              <NavSkip next={9} />
            </div>
          </div>
        )}

        {/* ═══ STEPS 6,7,8 — SUPPRIMÉS (génération IA curriculum déplacée dans le dashboard) ════ */}

        {step === 600 && null /* ancien step 6 supprimé */}
        {step === 700 && null /* ancien step 7 supprimé */}
        {step === 800 && null /* ancien step 8 supprimé */}

        {/* ═══ STEP 9 — GÉNÉRATION LEÇONS ══════════════════════════════════ */}
        {step === 6600 && (
          <div style={{ animation: 'fadeUp 0.4s ease', textAlign: 'center' }}>
            <div style={{ ...card, padding: '56px 36px' }}>
              {analyseRunning ? (
                <>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 28px', background: 'linear-gradient(135deg, #6B3FA0, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', boxShadow: '0 0 48px rgba(107,63,160,0.6)', animation: 'pulse 1.5s ease-in-out infinite' }}>✦</div>
                  <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Analyse du curriculum en cours...</h2>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '36px' }}>{ANALYSE_STEPS[analyseStep] || '...'}</p>
                  <div style={{ maxWidth: '380px', margin: '0 auto', textAlign: 'left' }}>
                    {ANALYSE_STEPS.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', opacity: i <= analyseStep ? 1 : 0.2, transition: 'opacity 0.5s' }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: i < analyseStep ? '#34D399' : i === analyseStep ? '#A78BFA' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white', transition: 'background 0.4s' }}>
                          {i < analyseStep ? '✓' : i + 1}
                        </div>
                        <div style={{ fontSize: '13px', color: i <= analyseStep ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)' }}>{s}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : analyseDone ? (
                <>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 24px', background: 'linear-gradient(135deg, #34D399, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', boxShadow: '0 0 40px rgba(52,211,153,0.4)', animation: 'pop 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>✓</div>
                  <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Curriculum analysé avec succès</h2>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '32px' }}>Détection automatique :</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', maxWidth: '440px', margin: '0 auto 36px' }}>
                    {[
                      { n: analyseData.unites, l: 'Unités détectées', c: '#60A5FA' },
                      { n: analyseData.objectifs, l: 'Objectifs identifiés', c: '#A78BFA' },
                      { n: analyseData.lecons, l: 'Leçons recommandées', c: '#34D399' },
                    ].map((d, i) => (
                      <div key={i} style={{ padding: '16px 12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${d.c}30`, borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: d.c, marginBottom: '4px' }}>{d.n}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>{d.l}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleGenerateSyllabus} disabled={syllabusLoading}
                    style={{ ...primaryBtn(syllabusLoading), padding: '14px 40px', fontSize: '15px' }}>
                    {syllabusLoading ? '⟳ Génération du syllabus...' : '✦ Générer le syllabus →'}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* step 7 désactivé */}
        {step === 700 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <div style={card}>
              {nav(4)}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>Syllabus proposé</h2>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>{classeNom} · {classeNiveau}</p>
                </div>
                <span style={{ padding: '4px 12px', background: 'rgba(167,139,250,0.15)', color: '#A78BFA', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>✦ Généré par IA</span>
              </div>

              {syllabusEditing ? (
                <textarea
                  value={syllabusContent}
                  onChange={e => setSyllabusContent(e.target.value)}
                  rows={16}
                  style={{ ...input(), resize: 'vertical', lineHeight: '1.7', fontFamily: 'monospace', fontSize: '12px', marginBottom: '16px' }}
                />
              ) : (
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', maxHeight: '360px', overflowY: 'auto', marginBottom: '16px' }}>
                  <pre style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.8', whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                    {syllabusContent}
                  </pre>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setSyllabusEditing(v => !v)}
                  style={{ padding: '9px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer' }}>
                  {syllabusEditing ? '👁 Voir' : '✏️ Modifier'}
                </button>
                <button type="button" onClick={handleGenerateSyllabus} disabled={syllabusLoading}
                  style={{ padding: '9px 18px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '8px', color: '#A78BFA', fontSize: '13px', cursor: 'pointer', opacity: syllabusLoading ? 0.6 : 1 }}>
                  {syllabusLoading ? '⟳ Génération...' : '↺ Régénérer'}
                </button>
              </div>

              <div style={{ padding: '14px 18px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>
                ✓ Le syllabus sera sauvegardé dans votre Historique IA et pourra être modifié à tout moment.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setStep(6)} style={backBtn}>← Retour</button>
                <button onClick={handleAcceptSyllabus}
                  style={{ ...primaryBtn(false), background: 'linear-gradient(135deg, #34D399, #059669)', boxShadow: '0 6px 24px rgba(52,211,153,0.3)' }}>
                  ✓ Accepter et continuer →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* step 8 désactivé */}
        {step === 800 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <div style={card}>
              {nav(5)}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>Programme annuel</h2>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>{programmeLoading ? 'Génération en cours...' : `${programmeJson?.unites?.length || 0} unités · ${programmeJson?.nb_semaines || 36} semaines`}</p>
                </div>
                {!programmeLoading && programmeJson && <span style={{ padding: '4px 12px', background: 'rgba(96,165,250,0.12)', color: '#60A5FA', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>✦ Généré par IA</span>}
              </div>

              {programmeLoading ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)' }}>
                  <div style={{ width: 48, height: 48, border: '3px solid rgba(167,139,250,0.2)', borderTopColor: '#A78BFA', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
                  <div style={{ fontSize: '14px' }}>Génération du programme annuel...</div>
                </div>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                  {(programmeJson?.unites || []).map((unite: any, i: number) => (
                    <div key={i} style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '7px', background: classeCouleur || '#1B3F6E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white', flexShrink: 0 }}>{unite.numero}</div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{unite.titre}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Sem. {unite.semaine_debut} – {unite.semaine_fin} · {(unite.lecons || []).length} leçons</div>
                        </div>
                      </div>
                      <div style={{ padding: '10px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px' }}>
                        {(unite.lecons || []).map((lecon: any, j: number) => (
                          <div key={j} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '7px', fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>
                            <span style={{ color: 'rgba(255,255,255,0.25)', marginRight: '4px' }}>{lecon.numero}.</span>{lecon.titre}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!programmeLoading && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={() => setStep(7)} style={backBtn}>← Retour</button>
                  <button onClick={() => setStep(9)} style={primaryBtn(false)}>
                    Générer les leçons →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ STEP 9 — GÉNÉRATION LEÇONS ══════════════════════════════════ */}
        {step === 9 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <div style={card}>
              {nav(4)}
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>Que souhaitez-vous générer ?</h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '24px' }}>Choisissez votre point de départ</p>

              {/* Plans */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                {[
                  { t: 'Plan gratuit', items: ['1 syllabus', '10 leçons par mois', 'Modifier librement'], c: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)', label: 'rgba(255,255,255,0.5)', badge: null },
                  { t: 'Plan premium', items: ['Tout le cours', 'Toutes les séquences', 'Toutes les leçons', 'Toutes les évaluations'], c: 'rgba(167,139,250,0.06)', border: 'rgba(167,139,250,0.25)', label: '#A78BFA', badge: '✦ Recommandé' },
                ].map((plan, i) => (
                  <div key={i} style={{ padding: '18px', background: plan.c, border: `1px solid ${plan.border}`, borderRadius: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: plan.label }}>{plan.t}</div>
                      {plan.badge && <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(167,139,250,0.2)', color: '#A78BFA', borderRadius: '99px' }}>{plan.badge}</span>}
                    </div>
                    {plan.items.map((item, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                        <span style={{ color: i === 1 ? '#A78BFA' : '#34D399', fontSize: '10px' }}>✓</span>{item}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0 20px' }} />

              <p style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>Commencer avec</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                {[
                  { v: 'une',      icon: '📄', t: 'Une seule leçon',       s: 'Découvrez l\'éditeur pédagogique' },
                  { v: 'sequence', icon: '📚', t: 'Une séquence complète', s: `${Math.min(5, programmeJson?.unites?.[0]?.lecons?.length || 5)} premières leçons de l'unité 1` },
                  { v: 'tout',     icon: '🗓️', t: 'Tout le cours',         s: `Les ${Math.min(10, (programmeJson?.unites || []).reduce((a: number, u: any) => a + (u.lecons?.length || 0), 0))} premières leçons (plan gratuit)` },
                ].map(opt => (
                  <button key={opt.v} type="button" onClick={() => setGenMode(opt.v as any)}
                    style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', border: `2px solid ${genMode === opt.v ? '#60A5FA' : 'rgba(255,255,255,0.07)'}`, background: genMode === opt.v ? 'rgba(96,165,250,0.07)' : 'rgba(255,255,255,0.02)', transition: 'all 0.15s', width: '100%' }}>
                    <div style={{ fontSize: '24px', flexShrink: 0 }}>{opt.icon}</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: genMode === opt.v ? '#60A5FA' : 'white' }}>{opt.t}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{opt.s}</div>
                    </div>
                    {genMode === opt.v && <div style={{ marginLeft: 'auto', color: '#60A5FA', fontSize: '18px' }}>✓</div>}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setStep(5)} style={backBtn}>← Retour</button>
                <button onClick={handleGenerateLecons} disabled={saving || !genMode}
                  style={primaryBtn(saving || !genMode)}>
                  {saving ? '⟳ Création des leçons...' : 'Créer les leçons →'}
                </button>
              </div>
              <NavSkip next={10} />
            </div>
          </div>
        )}

        {/* ═══ STEP 10 — ÉDITEUR INTRO ══════════════════════════════════════ */}
        {step === 10 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <div style={card}>
              {nav(5)}
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>Votre leçon est prête à être enseignée</h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '24px' }}>Découvrez l'éditeur pédagogique — bien plus qu'un éditeur de texte</p>

              {/* Editor structure preview */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {[
                  { icon: '🎯', t: 'Objectifs', s: 'Résultats d\'apprentissage' },
                  { icon: '📦', t: 'Matériel', s: 'Ressources requises' },
                  { icon: '🔶', t: 'AVANT — Amorce', s: 'Activation des connaissances' },
                  { icon: '🔵', t: 'PENDANT — Modélisation', s: 'Enseignement explicite' },
                  { icon: '🔵', t: 'PENDANT — Pratique guidée', s: 'En groupe ou dyades' },
                  { icon: '🔵', t: 'PENDANT — Autonome', s: 'Individuel' },
                  { icon: '🟢', t: 'APRÈS — Clôture', s: 'Retour sur les apprentissages' },
                  { icon: '✦', t: 'Différenciation IA', s: 'Dyslexie, TDAH, allophone' },
                ].map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '9px' }}>
                    <div style={{ fontSize: '16px', flexShrink: 0 }}>{b.icon}</div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{b.t}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{b.s}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tools row */}
              <div style={{ padding: '12px 16px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: '10px', marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#A78BFA', marginBottom: '8px', letterSpacing: '0.5px' }}>OUTILS DISPONIBLES</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['✦ Générer avec IA', '🎯 Simplifier', '♿ Adapter', '❓ Créer quiz', '📊 Évaluation', '🖥️ Mode TBI', '⏱ Timer', '📲 QR Sondage'].map((t, i) => (
                    <span key={i} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '99px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{t}</span>
                  ))}
                </div>
              </div>

              {genLeconsList.length > 0 && (
                <div style={{ padding: '12px 16px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '10px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#34D399', marginBottom: '6px' }}>✓ {genLeconsList.length} leçon{genLeconsList.length > 1 ? 's créées' : ' créée'}</div>
                  {genLeconsList.slice(0, 3).map((l, i) => (
                    <div key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>• {l.titre}</div>
                  ))}
                  {genLeconsList.length > 3 && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>+ {genLeconsList.length - 3} autres</div>}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                {firstLeconId && classeId && (
                  <button onClick={async () => {
                    setSaving(true)
                    const pid = await resolveProfilId()
                    if (pid) await supabase.from('utilisateurs').update({ onboarding_complete: true }).eq('id', pid)
                    setSaving(false)
                    router.push(`/dashboard/classes/${classeId}/lecons/${firstLeconId}`)
                  }}
                    style={{ padding: '13px 24px', fontSize: '14px', fontWeight: 600, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer' }}>
                    Ouvrir l'éditeur →
                  </button>
                )}
                <button onClick={handleFinish} disabled={saving}
                  style={{ ...primaryBtn(saving), background: saving ? undefined : 'linear-gradient(135deg, #34D399, #059669)', boxShadow: saving ? 'none' : '0 6px 24px rgba(52,211,153,0.3)' }}>
                  {saving ? '⟳ Finalisation...' : 'Accéder au tableau de bord →'}
                </button>
              </div>
              <NavSkip next={11} />
            </div>
          </div>
        )}

        {/* ═══ STEP 11 — TERMINÉ ═══════════════════════════════════════════ */}
        {step === 11 && (
          <div style={{ animation: 'fadeUp 0.5s ease', textAlign: 'center' }}>
            <div style={{ ...card, padding: '56px 36px' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px', background: 'linear-gradient(135deg, #34D399, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', boxShadow: '0 0 48px rgba(52,211,153,0.4)', animation: 'pop 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>✓</div>
              <h2 style={{ fontSize: '30px', fontWeight: 800, color: 'white', marginBottom: '10px', letterSpacing: '-0.5px' }}>Tout est prêt !</h2>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', marginBottom: '6px' }}>Bienvenue dans votre espace pédagogique.</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', marginBottom: '36px', lineHeight: 1.7 }}>
                La classe <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{classeNom}</strong> est configurée avec son programme annuel, son syllabus{genLeconsList.length > 0 ? ` et ${genLeconsList.length} leçon${genLeconsList.length > 1 ? 's' : ''}` : ''}.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '32px', textAlign: 'left' }}>
                {[
                  { icon: '📚', a: 'Aller à mes classes',       href: '/dashboard/classes' },
                  { icon: '✦',  a: 'Générer une leçon avec IA', href: '/dashboard/profil-ia' },
                  { icon: '🗓️', a: 'Voir la planification',     href: '/dashboard/planification' },
                  { icon: '🖥️', a: 'Lancer Mode Classe',        href: '/dashboard/enseigner' },
                ].map((item, i) => (
                  <button key={i} onClick={handleFinish}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}>
                    <div style={{ fontSize: '20px', flexShrink: 0 }}>{item.icon}</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{item.a}</div>
                  </button>
                ))}
              </div>

              <button onClick={handleFinish} disabled={saving}
                style={{ ...primaryBtn(saving), padding: '16px 64px', fontSize: '16px', boxShadow: '0 10px 40px rgba(107,63,160,0.5)' }}>
                {saving ? '⟳ Redirection...' : 'Accéder au tableau de bord →'}
              </button>

              <div style={{ marginTop: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>
                Tip : Entraînez votre IA dans <strong style={{ color: 'rgba(255,255,255,0.35)' }}>IA Enseignant</strong> pour qu'elle génère du contenu à votre image
              </div>
              <NavSkip next="finish" />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to { transform:rotate(360deg); } }
        @keyframes pulse  { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.85; transform:scale(1.06); } }
        @keyframes pop    { 0% { transform:scale(0); opacity:0; } 60% { transform:scale(1.18); } 100% { transform:scale(1); opacity:1; } }
        input::placeholder, textarea::placeholder { color:rgba(255,255,255,0.2) !important; }
        select option { background:#0D0D1A !important; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:transparent; } ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:99px; }
      `}</style>
    </div>
  )
}
