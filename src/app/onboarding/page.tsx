'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LoadingScreen from '@/components/LoadingScreen'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import AuthBranding from '@/components/auth/AuthBranding'

// ─── Données de référence ─────────────────────────────────────────────────────

const PAYS_OPTIONS = [
  { v: 'Canada',     l: '🇨🇦 Canada' },
  { v: 'États-Unis', l: '🇺🇸 États-Unis' },
  { v: 'Autre',      l: '🌍 Autre pays' },
]

const PROVINCES_CA = [
  'Alberta', 'Colombie-Britannique', 'Manitoba', 'Nouveau-Brunswick',
  'Nouvelle-Écosse', 'Ontario', 'Île-du-Prince-Édouard', 'Québec',
  'Saskatchewan', 'Terre-Neuve-et-Labrador', 'Yukon',
  'Territoires du Nord-Ouest', 'Nunavut',
]

const STATES_US = [
  'California', 'Texas', 'New York', 'Florida', 'Illinois',
  'Pennsylvania', 'Ohio', 'Georgia', 'Washington', 'Autre',
]

const NIVEAUX_CLASSE = [
  'Maternelle', 'Préscolaire',
  '1re année', '2e année', '3e année', '4e année', '5e année', '6e année',
  'Secondaire 1', 'Secondaire 2', 'Secondaire 3', 'Secondaire 4', 'Secondaire 5',
  'Cégep', 'Université', 'Autre',
]

// Non-beta only — beta users skip forfait selection entirely.
const FORFAIT_CARTES = [
  { v: 'gratuit',     label: 'Commencer gratuitement', price: 'Gratuit',       desc: '1 classe · 5 générations IA', color: '#64748B', bg: 'rgba(100,116,139,0.08)' },
  { v: 'pro',         label: 'Pro',                    price: '14 $ CAD/mois', desc: '8 classes · 75 générations/mois', color: '#6C5CE7', bg: 'rgba(108,92,231,0.08)' },
  { v: 'pro_plus',    label: 'Pro+',                   price: '24 $ CAD/mois', desc: 'Classes et générations illimitées', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
  { v: 'institution', label: 'Institution',            price: 'Sur devis',     desc: 'Multi-enseignants + dashboard admin', color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type Etape =
  | 'bienvenue'
  | 'profil'
  | 'chemin'
  | 'chemin_a'
  | 'chemin_b_emploi'
  | 'chemin_b_curriculum'
  | 'generation'
  | 'complete'

interface ChatMsg {
  id:              string
  role:            'ia' | 'user' | 'progress'
  content:         string
  isStreaming?:    boolean
  progressEvents?: any[]
}

interface ClasseDetectee {
  nom:       string
  matiere:   string
  niveau:    string
  nb_eleves: number
  cours:     Array<{ jour: string; heure_debut: string; heure_fin: string; salle?: string }>
}

function uid() { return Math.random().toString(36).substring(2, 10) }

// ─── Barre de progression cascade ────────────────────────────────────────────

function ProgressCard({ events }: { events: any[] }) {
  const last = events[events.length - 1]
  if (!last) return null
  const pct = Math.max(0, last.progression ?? 0)
  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '16px 18px', maxWidth: 480 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>{last.etape === 'complete' ? '🎉' : last.etape === 'erreur' ? '❌' : '⚙️'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>
            {last.etape === 'complete' ? 'Votre espace est prêt !' : 'Préparation de votre espace…'}
          </div>
          <div style={{ fontSize: 11, color: '#6C5CE7', fontWeight: 700 }}>{pct}%</div>
        </div>
      </div>
      <div style={{ height: 8, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg, #7F77DD, #9B5DE5)', borderRadius: 99, width: `${pct}%`, transition: 'width .5s ease' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflow: 'auto' }}>
        {events.slice(-8).map((ev, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
            <span style={{ color: ev.etape === 'complete' ? '#34D399' : '#6C5CE7', fontSize: 10, marginTop: 1 }}>●</span>
            <span>{ev.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [profil,    setProfil]    = useState<any>(null)
  const [isBeta,    setIsBeta]    = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [etape,     setEtape]     = useState<Etape>('profil')

  // ── Champs profil (tous optionnels pour beta, sauvegardés au fur et à mesure) ─
  const [pays,     setPays]     = useState('Canada')
  const [province, setProvince] = useState('')
  const [palier,   setPalier]   = useState<'primaire' | 'secondaire' | ''>('')
  const [forfait,  setForfait]  = useState<string>('gratuit')

  // ── Chemin A ─────────────────────────────────────────────────────────────────
  const [nomClasse,        setNomClasse]        = useState('')
  const [niveauA,          setNiveauA]          = useState('')
  const [matiereA,         setMatiereA]         = useState('')
  const [nbElevesA,        setNbElevesA]        = useState('25')
  const [premiereClasseId, setPremiereClasseId] = useState<string | null>(null)

  // ── Chemin B ─────────────────────────────────────────────────────────────────
  const [messages,         setMessages]         = useState<ChatMsg[]>([])
  const [classesDetectees, setClassesDetectees] = useState<ClasseDetectee[]>([])
  const [progressEvents,   setProgressEvents]   = useState<any[]>([])
  const [inputValue,       setInputValue]       = useState('')
  const [isStreaming,      setIsStreaming]       = useState(false)
  const [isListening,      setIsListening]      = useState(false)
  const [transcript,       setTranscript]       = useState('')

  const endRef    = useRef<HTMLDivElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const currRef   = useRef<HTMLInputElement>(null)
  const taRef     = useRef<HTMLTextAreaElement>(null)
  const abortRef  = useRef<AbortController | null>(null)
  const recRef    = useRef<any>(null)
  const progMsgId = useRef<string | null>(null)

  // ── Auth + garde ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: p } = await supabase
        .from('utilisateurs').select('*').eq('user_id', session.user.id).single()
      if (!p) { router.push('/login'); return }

      // onboarding_complete = "permitted to use ScorgIA" → dashboard
      if (p.onboarding_complete) {
        router.push('/dashboard'); return
      }

      const beta = p.role === 'beta'
      setIsBeta(beta)
      setProfil(p)

      // Pré-remplir les champs déjà en base
      if (p.pays)            setPays(p.pays)
      if (p.province)        setProvince(p.province)
      if (p.palier_scolaire) setPalier(p.palier_scolaire)
      if (p.forfait)         setForfait(p.forfait)

      // Choisir l'étape de départ
      if (beta && !p.palier_scolaire) {
        // Beta fraîchement inscrit ou sans config → bienvenue
        setEtape('bienvenue')
      } else {
        // Beta avec config partielle OU non-beta → profil
        setEtape('profil')
      }

      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const regionsList = pays === 'États-Unis' ? STATES_US : pays === 'Canada' ? PROVINCES_CA : []

  // ── Persistance partielle : ne jamais écraser avec des chaines vides ─────────
  const buildProfileUpdates = useCallback((includesForfait: boolean) => {
    const updates: Record<string, any> = {}
    if (pays)   updates.pays = pays
    if (province) updates.province = province
    if (palier) updates.palier_scolaire = palier
    if (includesForfait && !isBeta && forfait) updates.forfait = forfait
    return updates
  }, [pays, province, palier, forfait, isBeta])

  // ── "Aller à mon tableau de bord" — sauvegarde partielle + onboarding_complete ─
  const goToDashboard = useCallback(async () => {
    if (!profil?.id) { router.push('/dashboard'); return }
    setSaving(true)
    setSaveError(null)
    const updates = { ...buildProfileUpdates(true), onboarding_complete: true }
    const { error } = await supabase.from('utilisateurs').update(updates).eq('id', profil.id)
    setSaving(false)
    if (error) {
      setSaveError('Erreur de sauvegarde. Vérifiez votre connexion et réessayez.')
      return
    }
    router.push('/dashboard')
  }, [profil, buildProfileUpdates, supabase, router])

  // ── "Continuer" depuis l'étape profil ────────────────────────────────────────
  const handleSaveProfil = useCallback(async () => {
    if (!profil?.id) return
    setSaving(true)
    setSaveError(null)
    const updates = buildProfileUpdates(true)
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('utilisateurs').update(updates).eq('id', profil.id)
      if (error) {
        setSaving(false)
        setSaveError('Erreur de sauvegarde. Vérifiez votre connexion et réessayez.')
        return
      }
    }
    setSaving(false)
    setEtape('chemin')
  }, [profil, buildProfileUpdates, supabase])

  // ── Validation profil (non-beta uniquement — beta peut toujours continuer) ───
  const profilValide = isBeta
    ? true
    : Boolean(pays && province && palier && forfait)

  // ── Chemin A ─────────────────────────────────────────────────────────────────
  const handleCheminA = useCallback(async () => {
    if (!nomClasse.trim() || !niveauA || !profil?.id) return
    setSaving(true)
    setSaveError(null)

    const emploiDuTemps: ClasseDetectee[] = [{
      nom:       nomClasse.trim(),
      matiere:   matiereA || 'Général',
      niveau:    niveauA,
      nb_eleves: parseInt(nbElevesA) || 25,
      cours:     [],
    }]

    const msgId = uid()
    progMsgId.current = msgId
    setProgressEvents([])
    setMessages([
      { id: uid(), role: 'ia',       content: `**Parfait !** Je prépare votre espace pour la classe **${nomClasse.trim()}**… ✨\n\nCela peut prendre 1-2 minutes.` },
      { id: msgId, role: 'progress', content: '', progressEvents: [] },
    ])
    setEtape('generation')
    setSaving(false)

    await lancerCascade(emploiDuTemps, '')
  }, [nomClasse, niveauA, matiereA, nbElevesA, profil])

  // ── Chemin B : upload emploi du temps ────────────────────────────────────────
  useEffect(() => {
    if (etape === 'chemin_b_emploi' && messages.length === 0) {
      setTimeout(() => {
        setMessages([{
          id:      uid(),
          role:    'ia',
          content: `Parfait ! Pour créer votre espace sur mesure, j'ai besoin de votre **emploi du temps**. 📅\n\nUploadez-le (image ou PDF) ou décrivez-le ci-dessous.`,
        }])
      }, 300)
    }
  }, [etape, messages.length])

  const handleEmploiFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setMessages(prev => [...prev,
      { id: uid(), role: 'user', content: `📎 ${file.name}` },
      { id: uid(), role: 'ia',   content: 'J\'analyse votre emploi du temps… 🔍', isStreaming: true },
    ])

    try {
      const isImage = file.type.startsWith('image/')
      const b64 = await new Promise<string>((res, rej) => {
        const fr = new FileReader()
        fr.onload  = () => res((fr.result as string).split(',')[1])
        fr.onerror = rej
        fr.readAsDataURL(file)
      })

      const payload = isImage
        ? { image_base64: b64, media_type: file.type }
        : { texte: await file.text() }
      const resp = await fetch('/api/ia/analyser-emploi-du-temps', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify(payload),
      })
      const data = await resp.json()
      const cls: ClasseDetectee[] = data.classes_detectees || []
      setClassesDetectees(cls)

      const apercu = cls.map((c, i) => {
        const ICONS = ['📚', '🔬', '🎨', '🏃', '🌍', '🔢']
        const cours = c.cours?.map(cr => `${cr.jour} ${cr.heure_debut}–${cr.heure_fin}`).join(', ') || ''
        return `${ICONS[i % ICONS.length]} **${c.nom}** — ${c.matiere} (${c.niveau})${cours ? `\n   ${cours}` : ''}`
      }).join('\n')

      setMessages(prev => prev.map((m, i) => i === prev.length - 1
        ? { ...m, content: `J'ai trouvé **${cls.length} classe${cls.length > 1 ? 's' : ''}** :\n\n${apercu}\n\nC'est correct ?`, isStreaming: false }
        : m))

      setEtape('chemin_b_curriculum')
    } catch (err: any) {
      setMessages(prev => prev.map((m, i) => i === prev.length - 1
        ? { ...m, content: `⚠️ ${err.message || 'Erreur d\'analyse'}`, isStreaming: false }
        : m))
    }
    e.target.value = ''
  }

  const confirmerClasses = () => {
    setMessages(prev => [...prev,
      { id: uid(), role: 'user', content: '✓ Oui, c\'est parfait !' },
      { id: uid(), role: 'ia',   content: `Excellent ! Uploadez votre **curriculum** pour que je génère les plans automatiquement 📚 — ou utilisez le **programme officiel** de ${province || 'votre province'}.` },
    ])
  }

  const handleCurriculumFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const texte = await file.text().catch(() => '')
    demarrerCascadeB(texte)
    e.target.value = ''
  }

  const utiliserProgrammeOfficiel = () => demarrerCascadeB('')

  const demarrerCascadeB = (curriculumTexte: string) => {
    if (classesDetectees.length === 0) return
    const msgId = uid()
    progMsgId.current = msgId
    setProgressEvents([])
    setMessages(prev => [...prev,
      { id: uid(), role: 'ia',       content: '**Parfait ! Je prépare tout pour vous…** ✨\n\nCela peut prendre 1-2 minutes.' },
      { id: msgId, role: 'progress', content: '', progressEvents: [] },
    ])
    setEtape('generation')
    lancerCascade(classesDetectees, curriculumTexte)
  }

  // ── Cascade commune A et B ────────────────────────────────────────────────────
  const lancerCascade = useCallback(async (emploiDuTemps: ClasseDetectee[], curriculumTexte: string) => {
    const res = await fetch('/api/ia/onboarding-auto', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        emploi_du_temps:  emploiDuTemps,
        curriculum_texte: curriculumTexte,
        annee_debut:      `${new Date().getFullYear()}-09-01`,
        annee_fin:        `${new Date().getFullYear() + 1}-06-30`,
      }),
    })

    if (!res.body) return
    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let   buf     = ''
    const evts: any[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n'); buf = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const ev = JSON.parse(line)
          evts.push(ev)
          setProgressEvents([...evts])
          setMessages(prev => prev.map(m =>
            m.id === progMsgId.current ? { ...m, progressEvents: [...evts] } : m
          ))
          if (ev.etape === 'complete') {
            const d = ev.details || {}
            const firstClassId = d.premiere_classe_id || null
            setPremiereClasseId(firstClassId)
            const prenom  = profil?.prenom || ''
            const contenu = `🎉 Votre espace est prêt, **${prenom}** !\n\nJ'ai créé :\n✓ **${d.classes_creees || emploiDuTemps.length} classe(s)** avec leurs dossiers\n✓ **${d.evenements_crees || 0} cours** planifiés dans l'agenda\n✓ **${d.sequences_creees || 0} séquences** d'apprentissage\n✓ **${d.plans_lecons_crees || 0} plans de leçons** prêts à enseigner\n\nVotre première leçon vous attend !`
            setMessages(prev => [...prev, { id: uid(), role: 'ia', content: contenu }])
            setEtape('complete')
          }
        } catch { /* ligne invalide */ }
      }
    }
  }, [profil])

  // ── Input libre Chemin B ──────────────────────────────────────────────────────
  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? inputValue).trim()
    if (!text || isStreaming) return
    setInputValue(''); setTranscript('')
    setMessages(prev => [...prev, { id: uid(), role: 'user', content: text }])

    const lower = text.toLowerCase()
    if (lower.includes('modifier') || lower.includes('ajouter une classe')) {
      setMessages(prev => [...prev, { id: uid(), role: 'ia', content: 'Dites-moi exactement ce qui est incorrect et je l\'ajuste.' }])
      return
    }

    const iaId = uid()
    setMessages(prev => [...prev, { id: iaId, role: 'ia', content: '', isStreaming: true }])
    setIsStreaming(true)
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/ia/assistant', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message:    text,
          contexte:   { page_courante: 'onboarding' },
          historique: messages.slice(-6).map(m => ({ role: m.role === 'ia' ? 'assistant' : 'user', content: m.content })),
        }),
        signal: abortRef.current.signal,
      })
      if (!res.body) throw new Error('Pas de réponse')
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += decoder.decode(value, { stream: true })
        const delimIdx = buf.indexOf('\n__KLASSIA_ACTIONS__\n')
        const txt = delimIdx >= 0 ? buf.substring(0, delimIdx) : buf
        setMessages(prev => prev.map(m => m.id === iaId ? { ...m, content: txt } : m))
      }
      setMessages(prev => prev.map(m => m.id === iaId ? { ...m, isStreaming: false } : m))
    } catch { /* ignore abort */ } finally { setIsStreaming(false) }
  }, [inputValue, isStreaming, messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const toggleVoice = () => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    if (isListening) { recRef.current?.stop(); setIsListening(false); return }
    const rec = new SR()
    rec.lang = 'fr-FR'; rec.continuous = false; rec.interimResults = true
    recRef.current = rec
    rec.onresult = (ev: any) => {
      const t = Array.from(ev.results as any[]).map((r: any) => r[0].transcript).join('')
      setTranscript(t); setInputValue(t)
      if (ev.results[0].isFinal) { rec.stop(); setIsListening(false); handleSend(t) }
    }
    rec.onerror = () => setIsListening(false)
    rec.onend   = () => setIsListening(false)
    rec.start(); setIsListening(true)
  }

  // ── Redirect final ────────────────────────────────────────────────────────────
  const handleEntrer = () => {
    if (premiereClasseId) {
      router.push(`/dashboard/classes/${premiereClasseId}`)
    } else {
      router.push('/dashboard')
    }
  }

  if (loading) return <LoadingScreen />

  // ─── Styles communs ───────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background:   'var(--color-bg-card)',
    border:       '1px solid var(--color-border)',
    borderRadius: 16,
    padding:      '28px 32px',
    width:        '100%',
    maxWidth:     560,
    boxShadow:    '0 4px 24px rgba(0,0,0,0.06)',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    border: '1.5px solid var(--color-input-border)',
    borderRadius: 9, fontSize: 14,
    color: 'var(--color-text-primary)',
    background: 'var(--color-input-bg)',
    outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700,
    color: 'var(--color-text-secondary)',
    display: 'block', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: '.4px',
  }

  const btnPrimary: React.CSSProperties = {
    padding: '12px 28px', borderRadius: 10, border: 'none',
    background: 'linear-gradient(135deg, #6C5CE7, #4F46E5)',
    color: '#FFF', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit', width: '100%',
  }

  const btnSecondary: React.CSSProperties = {
    padding: '11px 20px', borderRadius: 9,
    border: '1.5px solid var(--color-border)',
    background: 'var(--color-bg-card)',
    color: 'var(--color-text-secondary)',
    fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  }

  const btnGhost: React.CSSProperties = {
    padding: '10px 16px', borderRadius: 9, border: 'none',
    background: 'transparent', color: 'var(--color-text-muted)',
    fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
    textDecoration: 'underline', textUnderlineOffset: 3,
  }

  // ── Bouton "Aller à mon tableau de bord" commun ───────────────────────────────
  const GoToDashboardBtn = () => (
    <button
      type="button"
      onClick={goToDashboard}
      disabled={saving}
      style={{ ...btnGhost, display: 'block', margin: '8px auto 0', width: '100%', textAlign: 'center' }}
    >
      {saving ? 'Enregistrement…' : 'Aller à mon tableau de bord →'}
    </button>
  )

  // ── Message d'erreur de sauvegarde ───────────────────────────────────────────
  const SaveErrorBanner = () => saveError ? (
    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#EF4444', marginTop: 12 }}>
      ⚠️ {saveError}
    </div>
  ) : null

  // ─────────────────────────────────────────────────────────────────────────────
  // ÉTAPE BIENVENUE (beta uniquement)
  // ─────────────────────────────────────────────────────────────────────────────
  if (etape === 'bienvenue') {
    return (
      <div style={{
        minHeight: '100vh', background: '#050D1A',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '24px 16px',
        position: 'relative', overflow: 'hidden',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}>
        {/* Aurora */}
        <div style={{ position: 'absolute', top: '-200px', right: '-100px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-180px', left: '-130px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(27,63,110,0.28) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480 }}>

          <AuthBranding slogan="" logoHeight={110} style={{ marginBottom: 28 }} />

          {/* Badge bêta */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <span style={{ display: 'inline-block', padding: '4px 16px', background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 99, fontSize: 11, fontWeight: 700, color: '#A78BFA', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              ✦ Accès Bêta Privé ScorgIA
            </span>
          </div>

          <div style={{
            background: 'rgba(13,21,37,0.88)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 22, padding: '32px 28px',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
          }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 10, lineHeight: 1.3, textAlign: 'center' }}>
              Bienvenue dans la bêta privée ScorgIA{profil?.prenom ? `, ${profil.prenom}` : ''} !
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.7, marginBottom: 24 }}>
              Vous faites partie des enseignants sélectionnés pour découvrir ScorgIA avant son lancement public.<br />
              <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Votre accès bêta est inclus. Aucun forfait n'est à choisir.</strong>
            </p>

            {/* Fonctionnalités bêta */}
            <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
              {[
                'Construire mon année scolaire avec l\'IA',
                'Préparer et gérer mes classes',
                'Générer des leçons, séquences et évaluations',
                'Accéder aux exports Word & PowerPoint',
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: i < 3 ? 6 : 0 }}>
                  <span style={{ color: '#4ADE80', fontWeight: 700 }}>✓</span> {f}
                </div>
              ))}
            </div>

            {/* CTA primaire */}
            <button
              type="button"
              onClick={() => setEtape('profil')}
              style={{
                width: '100%', padding: '14px',
                background: 'linear-gradient(135deg, #2D5FA0, #7C3AED)',
                color: 'white', border: 'none', borderRadius: 11,
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 6px 24px rgba(124,58,237,0.4)',
                marginBottom: 10,
              }}
            >
              Configurer rapidement →
            </button>

            {/* CTA secondaire */}
            <button
              type="button"
              onClick={goToDashboard}
              disabled={saving}
              style={{
                width: '100%', padding: '12px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 11, color: 'rgba(255,255,255,0.55)',
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
              }}
            >
              {saving ? 'En cours…' : 'Aller directement à mon tableau de bord →'}
            </button>

            {saveError && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.12)', borderRadius: 8, fontSize: 12, color: '#F87171', textAlign: 'center' }}>
                ⚠️ {saveError}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ÉTAPE PROFIL
  // ─────────────────────────────────────────────────────────────────────────────
  if (etape === 'profil') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } } .onb-fade { animation: fadeUp .28s ease-out; }`}</style>

        <AuthBranding theme="dark" slogan="Configurons votre profil" logoHeight={110} style={{ marginBottom: 24 }} />

        <div className="onb-fade" style={cardStyle}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>
            Votre profil d'enseignant
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
            {isBeta
              ? 'Ces informations personnalisent votre IA — vous pouvez les compléter plus tard.'
              : 'Ces informations personnalisent votre expérience ScorgIA.'}
          </p>

          {isBeta && (
            <div style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#A78BFA' }}>
              ✦ <strong>Accès bêta actif.</strong> Vous pouvez passer les champs pour l'instant — aucun forfait à choisir.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* 1. Pays */}
            <div>
              <label style={labelStyle}>{isBeta ? 'Pays (optionnel)' : '1 — Pays *'}</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PAYS_OPTIONS.map(o => (
                  <button key={o.v} type="button" onClick={() => { setPays(o.v); setProvince('') }}
                    style={{ flex: '1 1 120px', padding: '9px 8px', borderRadius: 8, border: `2px solid ${pays === o.v ? '#6C5CE7' : 'var(--color-border)'}`, background: pays === o.v ? 'rgba(108,92,231,0.08)' : 'var(--color-bg-card)', color: pays === o.v ? '#6C5CE7' : 'var(--color-text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Province / État */}
            {regionsList.length > 0 && (
              <div>
                <label style={labelStyle}>{pays === 'États-Unis' ? (isBeta ? 'État (optionnel)' : '2 — État *') : (isBeta ? 'Province (optionnel)' : '2 — Province / Territoire *')}</label>
                <select value={province} onChange={e => setProvince(e.target.value)}
                  style={{ ...inputStyle, appearance: 'none' }}>
                  <option value="">Sélectionner…</option>
                  {regionsList.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}
            {pays === 'Autre' && (
              <div>
                <label style={labelStyle}>{isBeta ? 'Province / Région (optionnel)' : '2 — Province / Région *'}</label>
                <input type="text" value={province} onChange={e => setProvince(e.target.value)}
                  placeholder="Ex : Île-de-France, Genève…" style={inputStyle} />
              </div>
            )}

            {/* 3. Palier scolaire */}
            <div>
              <label style={labelStyle}>{isBeta ? 'Palier scolaire (optionnel)' : '3 — Palier scolaire *'}</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {(['primaire', 'secondaire'] as const).map(p => (
                  <button key={p} type="button" onClick={() => setPalier(p)}
                    style={{ flex: 1, padding: '16px 12px', borderRadius: 10, border: `2px solid ${palier === p ? '#6C5CE7' : 'var(--color-border)'}`, background: palier === p ? 'rgba(108,92,231,0.08)' : 'var(--color-bg-card)', color: palier === p ? '#6C5CE7' : 'var(--color-text-secondary)', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}>
                    {p === 'primaire' ? '🎒 Primaire' : '🎓 Secondaire'}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Forfait — affiché uniquement pour les non-beta */}
            {!isBeta && (
              <div>
                <label style={labelStyle}>4 — Forfait souhaité *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {FORFAIT_CARTES.map(f => (
                    <button key={f.v} type="button" onClick={() => setForfait(f.v)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 10, border: `2px solid ${forfait === f.v ? f.color : 'var(--color-border)'}`, background: forfait === f.v ? f.bg : 'var(--color-bg-card)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: forfait === f.v ? f.color : 'var(--color-text-primary)' }}>{f.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>{f.desc}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: forfait === f.v ? f.color : 'var(--color-text-muted)', flexShrink: 0 }}>{f.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <SaveErrorBanner />

          {/* Boutons navigation */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
            {/* Précédent — vers bienvenue (beta) ou n/a (non-beta) */}
            {isBeta && (
              <button type="button" onClick={() => setEtape('bienvenue')} style={btnSecondary}>
                ← Précédent
              </button>
            )}

            {/* Passer pour l'instant (beta) */}
            {isBeta && (
              <button type="button" onClick={() => setEtape('chemin')} style={{ ...btnSecondary, flex: 1 }}>
                Passer pour l'instant
              </button>
            )}

            {/* Continuer */}
            <button
              type="button"
              onClick={handleSaveProfil}
              disabled={!profilValide || saving}
              style={{ ...btnPrimary, flex: 2, opacity: profilValide && !saving ? 1 : 0.45, cursor: profilValide && !saving ? 'pointer' : 'not-allowed' }}
            >
              {saving ? 'Enregistrement…' : 'Continuer →'}
            </button>
          </div>

          <GoToDashboardBtn />
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ÉTAPE CHOIX A/B
  // ─────────────────────────────────────────────────────────────────────────────
  if (etape === 'chemin') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } } .onb-fade { animation: fadeUp .28s ease-out; }`}</style>

        <AuthBranding theme="dark" logoHeight={110} style={{ marginBottom: 20 }} />

        <div className="onb-fade" style={{ ...cardStyle, maxWidth: 640 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 6px', textAlign: 'center' }}>
            Comment souhaitez-vous configurer vos classes ?
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: 28 }}>
            Les deux chemins créent le même espace — seule la façon de démarrer diffère.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <button type="button" onClick={() => setEtape('chemin_a')}
              style={{ padding: '24px 20px', borderRadius: 14, border: '2px solid var(--color-border)', background: 'var(--color-bg-card)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'border-color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#6C5CE7')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>✏️</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 8 }}>Chemin A — Manuel</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                Je crée mes classes une par une. Rapide, simple, je garde le contrôle total.
              </div>
              <div style={{ marginTop: 16, fontSize: 12, fontWeight: 700, color: '#6C5CE7' }}>Choisir mes classes →</div>
            </button>

            <button type="button" onClick={() => setEtape('chemin_b_emploi')}
              style={{ padding: '24px 20px', borderRadius: 14, border: '2px solid #6C5CE7', background: 'rgba(108,92,231,0.05)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>⚡</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 8 }}>Chemin B — Automatique</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                J'uploade mon emploi du temps. ScorgIA crée tout automatiquement.
              </div>
              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#6C5CE7', background: 'rgba(108,92,231,0.12)', padding: '2px 8px', borderRadius: 99 }}>Recommandé</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: '#6C5CE7' }}>Uploader mes documents →</div>
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" onClick={() => setEtape('profil')} style={btnSecondary}>
              ← Précédent
            </button>
            <GoToDashboardBtn />
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CHEMIN A : formulaire manuel
  // ─────────────────────────────────────────────────────────────────────────────
  if (etape === 'chemin_a') {
    const canSubmit = nomClasse.trim().length >= 2 && niveauA && !saving
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } } .onb-fade { animation: fadeUp .28s ease-out; }`}</style>

        <div className="onb-fade" style={cardStyle}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>
            Créez votre première classe
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
            ScorgIA génèrera vos séquences et plans de leçons automatiquement.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Nom de la classe *</label>
              <input type="text" value={nomClasse} onChange={e => setNomClasse(e.target.value)}
                placeholder="Ex : 4B Mathématiques, CE2 Dupont…" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Niveau *</label>
              <select value={niveauA} onChange={e => setNiveauA(e.target.value)}
                style={{ ...inputStyle, appearance: 'none' }}>
                <option value="">Sélectionner…</option>
                {NIVEAUX_CLASSE.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Matière principale</label>
              <input type="text" value={matiereA} onChange={e => setMatiereA(e.target.value)}
                placeholder="Ex : Mathématiques, Français…" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Nombre d'élèves</label>
              <input type="number" value={nbElevesA} onChange={e => setNbElevesA(e.target.value)}
                min={1} max={60} style={{ ...inputStyle, width: 120 }} />
            </div>
          </div>

          <SaveErrorBanner />

          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setEtape('chemin')} style={btnSecondary}>
              ← Précédent
            </button>
            <button type="button" onClick={handleCheminA} disabled={!canSubmit}
              style={{ ...btnPrimary, flex: 1, opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
              {saving ? 'Génération en cours…' : 'Créer et générer →'}
            </button>
          </div>

          <GoToDashboardBtn />
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CHEMIN B + GÉNÉRATION + COMPLETE : interface chat
  // ─────────────────────────────────────────────────────────────────────────────
  const isChatEtape = ['chemin_b_emploi', 'chemin_b_curriculum', 'generation', 'complete'].includes(etape)
  if (isChatEtape) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-primary)', overflow: 'hidden' }}>
        <style>{`
          @keyframes glowPulse { 0%,100%{box-shadow:0 0 20px rgba(108,92,231,.4)} 50%{box-shadow:0 0 40px rgba(108,92,231,.8)} }
          @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
          @keyframes blinkCursor { 0%,50%{opacity:1} 51%,100%{opacity:0} }
          .msg-ia { animation: fadeUp .3s ease both; }
          .stream-cursor::after { content:'|'; animation:blinkCursor .9s step-start infinite; color:#6C5CE7; margin-left:1px; }
          .onb-upload { border:2px dashed var(--color-border); border-radius:14px; padding:18px 20px; cursor:pointer; transition:all .2s; background:var(--color-bg-card); display:inline-block; font-family:inherit; }
          .onb-upload:hover { border-color:#6C5CE7; background:rgba(108,92,231,0.05); }
          .onb-chip { padding:8px 16px; border-radius:99px; border:1.5px solid var(--color-border); background:var(--color-bg-card); color:var(--color-text-secondary); font-size:13px; cursor:pointer; font-family:inherit; font-weight:500; transition:all .15s; display:inline-flex; align-items:center; gap:6px; }
          .onb-chip:hover { border-color:#6C5CE7; color:#6C5CE7; }
        `}</style>

        {/* Header */}
        <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6C5CE7, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#FFF', fontWeight: 800, animation: 'glowPulse 3s ease-in-out infinite' }}>✦</div>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>ScorgIA</span>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: 99, padding: '3px 9px' }}>Configuration initiale</span>
          </div>

          {/* Navigation depuis le chat */}
          {['chemin_b_emploi'].includes(etape) && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setEtape('chemin')}
                style={{ ...btnSecondary, padding: '7px 14px', fontSize: 12 }}>
                ← Précédent
              </button>
              <button type="button" onClick={() => { setMessages([]); setEtape('chemin_a') }}
                style={{ ...btnSecondary, padding: '7px 14px', fontSize: 12 }}>
                Créer manuellement
              </button>
              <button type="button" onClick={goToDashboard}
                style={{ ...btnGhost, padding: '7px 14px', fontSize: 12, textDecoration: 'none' }}>
                Tableau de bord →
              </button>
            </div>
          )}

          {['chemin_b_curriculum'].includes(etape) && (
            <button type="button" onClick={goToDashboard}
              style={{ ...btnGhost, fontSize: 12, textDecoration: 'none' }}>
              Tableau de bord →
            </button>
          )}
        </div>

        {/* Conversation */}
        <div style={{ flex: 1, overflow: 'auto', padding: '32px 0' }}>
          <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px' }}>
            {messages.map((msg, idx) => {
              if (msg.role === 'progress') {
                return <div key={msg.id} style={{ marginBottom: 20 }}><ProgressCard events={progressEvents} /></div>
              }
              if (msg.role === 'user') return (
                <div key={msg.id} className="msg-ia" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <div style={{ background: '#6C5CE7', color: '#FFF', borderRadius: '18px 18px 4px 18px', padding: '10px 16px', maxWidth: '72%', fontSize: 14, lineHeight: 1.55 }}>
                    {msg.content}
                  </div>
                </div>
              )
              return (
                <div key={msg.id} className="msg-ia" style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg, #6C5CE7, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#FFF', fontWeight: 800, marginTop: 2 }}>✦</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={msg.isStreaming && msg.content ? 'stream-cursor' : ''}
                      style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '4px 18px 18px 18px', padding: '14px 18px', fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-primary)' }}>
                      {msg.content ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                          p:      ({ children }) => <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.7 }}>{children}</p>,
                          strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
                          ul:     ({ children }) => <ul style={{ paddingLeft: 20, margin: '0 0 8px' }}>{children}</ul>,
                          li:     ({ children }) => <li style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 4 }}>{children}</li>,
                        }}>
                          {msg.content}
                        </ReactMarkdown>
                      ) : <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Génération…</span>}
                    </div>

                    {!msg.isStreaming && idx === messages.length - 1 && (
                      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {etape === 'chemin_b_emploi' && (
                          <>
                            <button className="onb-upload" onClick={() => fileRef.current?.click()} style={{ fontSize: 13 }}>
                              📅 Uploader mon emploi du temps
                            </button>
                            <button className="onb-chip" onClick={() => { setInputValue('Mon emploi du temps : '); taRef.current?.focus() }}>
                              ✏️ Décrire à la place
                            </button>
                          </>
                        )}
                        {etape === 'chemin_b_curriculum' && classesDetectees.length > 0 && !msg.content.includes('curriculum') && (
                          <>
                            <button className="onb-chip" style={{ background: '#6C5CE7', color: '#FFF', border: 'none', fontWeight: 700 }} onClick={confirmerClasses}>
                              ✓ Oui, c'est parfait !
                            </button>
                            <button className="onb-chip" onClick={() => setInputValue('Modifier : ')}>✏️ Modifier</button>
                          </>
                        )}
                        {etape === 'chemin_b_curriculum' && msg.content.includes('curriculum') && (
                          <>
                            <button className="onb-upload" onClick={() => currRef.current?.click()} style={{ fontSize: 13 }}>
                              📚 Uploader le curriculum
                            </button>
                            <button className="onb-chip" onClick={utiliserProgrammeOfficiel}>
                              🇨🇦 Programme officiel
                            </button>
                          </>
                        )}
                        {etape === 'complete' && (
                          <button onClick={handleEntrer}
                            style={{ padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg, #6C5CE7, #4F46E5)', border: 'none', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(108,92,231,.4)' }}>
                            → Accéder à ma classe
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={endRef} />
          </div>
        </div>

        {/* Zone de saisie */}
        {etape !== 'generation' && etape !== 'complete' && (
          <div style={{ padding: '12px 24px 20px', background: 'var(--color-bg-secondary)', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              {isListening && (
                <div style={{ marginBottom: 6, fontSize: 12, color: '#6C5CE7', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F87171', display: 'inline-block' }} />
                  Écoute… {transcript && `"${transcript.substring(0, 50)}"`}
                </div>
              )}
              <div style={{ background: 'var(--color-input-bg)', border: '1.5px solid var(--color-border)', borderRadius: 16, padding: '10px 12px', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <button onClick={toggleVoice}
                  style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: isListening ? '#FEE2E2' : 'var(--color-bg-tertiary)', color: isListening ? '#F87171' : 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                  {isListening ? '⬛' : '🎤'}
                </button>
                <textarea ref={taRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Répondez à ScorgIA ou posez une question…"
                  rows={1}
                  style={{ flex: 1, resize: 'none', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--color-text-primary)', fontFamily: 'inherit', lineHeight: 1.5, minHeight: 24, maxHeight: 120, overflowY: 'auto', padding: '3px 0' }}
                />
                <button onClick={() => handleSend()} disabled={!inputValue.trim() || isStreaming}
                  style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: inputValue.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#FFF', background: inputValue.trim() ? '#6C5CE7' : 'var(--color-border)', flexShrink: 0 }}>
                  ▶
                </button>
              </div>
            </div>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*,.pdf,.txt" style={{ display: 'none' }} onChange={handleEmploiFile} />
        <input ref={currRef} type="file" accept=".pdf,.txt,.docx"   style={{ display: 'none' }} onChange={handleCurriculumFile} />
      </div>
    )
  }

  return null
}
