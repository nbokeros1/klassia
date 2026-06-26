'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import LoadingScreen from '@/components/LoadingScreen'
import VoiceWaveform from '@/components/ui/VoiceWaveform'
import MarkdownMessage from '@/components/ui/MarkdownMessage'
import { nourrirIA } from '@/lib/utils/nourrir-ia'
import LogoKlassIA from '@/components/ui/LogoKlassIA'
import { contentToHtml } from '@/lib/utils/parser-svg-schema'
import { Z } from '@/lib/constants/z-index'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id:          string
  role:        'user' | 'ia'
  content:     string
  isStreaming?: boolean
}

interface ActionSuggestion {
  type:            string
  action:          string
  type_contenu:    string
  titre:           string
  dossier_suggere: string
  contenu:         string
}

// ─── Constants ────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).substring(2, 10) }

// Délimiteurs que la route envoie après le contenu principal
const ACTION_TAG   = '\n\n__ACTION__'
const TRUNCATED_TAG = '\n\n__TRUNCATED__'

// type_contenu → type_fichier (schéma fichiers_dossier)
const TYPE_FICHIER: Record<string, string> = {
  lecon_complete: 'lecon_complete',
  plan_lecon:     'plan_lecon',
  quiz:           'quiz',
  evaluation:     'evaluation_sommative',
  activite:       'activite',
  email_parents:  'communication',
  curriculum:     'curriculum',
  ressource:      'ressource',
}

// type_contenu → nom du dossier pré-sélectionné
const DOSSIER_SUGGERE: Record<string, string> = {
  lecon_complete: 'Plans de leçons',
  plan_lecon:     'Plans de leçons',
  quiz:           'Évaluations sommatives',
  evaluation:     'Évaluations sommatives',
  curriculum:     'Curriculum',
  email_parents:  'Parents',
  activite:       'Leçons',
  ressource:      'Ressources',
}

const SUGGESTIONS = (isFr: boolean) => [
  { id: 'curriculum', emoji: '📘', label: isFr ? 'Curriculum'      : 'Curriculum',   prompt: isFr ? 'Génère le curriculum pour ma classe cette année.'           : 'Generate the curriculum for my class this year.'           },
  { id: 'plan_lecon', emoji: '📝', label: isFr ? 'Plan de leçon'   : 'Lesson Plan',  prompt: isFr ? 'Crée un plan de leçon détaillé pour ma prochaine leçon.'    : 'Create a detailed lesson plan for my next lesson.'          },
  { id: 'lecon',      emoji: '✨', label: isFr ? 'Leçon complète'  : 'Full Lesson',  prompt: isFr ? 'Génère une leçon complète avec activités et évaluation.'     : 'Generate a complete lesson with activities and assessment.'  },
  { id: 'quiz',       emoji: '🎮', label: isFr ? 'Quiz'            : 'Quiz',         prompt: isFr ? 'Crée un quiz formatif sur la matière actuelle.'              : 'Create a formative quiz on the current topic.'              },
  { id: 'evaluation', emoji: '📊', label: isFr ? 'Évaluation'      : 'Assessment',   prompt: isFr ? 'Crée une évaluation sommative avec grille de correction.'    : 'Create a summative assessment with a marking grid.'         },
  { id: 'email',      emoji: '📧', label: isFr ? 'Email parents'   : 'Parent Email', prompt: isFr ? 'Rédige un email professionnel destiné aux parents d\'élèves.' : 'Write a professional email for parents.'                    },
]

// ─── Page inner ───────────────────────────────────────────────────────────────

function PreparerPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  const [profil,      setProfil]      = useState<any>(null)
  const [classes,     setClasses]     = useState<any[]>([])
  const [classeId,    setClasseId]    = useState<string>('')
  const [loading,     setLoading]     = useState(true)
  const [notifCount,  setNotifCount]  = useState(0)

  // Chat
  const [messages,    setMessages]    = useState<ChatMessage[]>([])
  const [inputValue,  setInputValue]  = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showVoice,   setShowVoice]   = useState(false)

  // Actions / Sauvegarde
  const [actionSug,        setActionSug]        = useState<ActionSuggestion | null>(null)
  const [saveModal,        setSaveModal]        = useState(false)
  const [dossiers,         setDossiers]         = useState<any[]>([])
  const [selectedDossier,  setSelectedDossier]  = useState<string>('')
  const [saveLoading,      setSaveLoading]      = useState(false)
  const [toast,            setToast]            = useState<{ msg: string; ok: boolean } | null>(null)

  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef       = useRef<AbortController | null>(null)

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await supabase.from('utilisateurs').select('*').eq('user_id', session.user.id).single()
      if (!p) return
      setProfil(p)
      const { data: cls } = await supabase.from('classes').select('*').eq('enseignant_id', p.id).order('created_at', { ascending: false })
      const list = cls || []
      setClasses(list)
      const storedId  = typeof window !== 'undefined' ? (localStorage.getItem('klassia_active_classe') || '') : ''
      const fromUrl   = searchParams?.get('classe_id') || searchParams?.get('classe') || ''
      const candidate = fromUrl || storedId
      // Valider que l'ID provient bien d'une classe réelle de l'enseignant
      const initClasse = list.find(c => c.id === candidate)?.id || list[0]?.id || ''
      setClasseId(initClasse)
      const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('enseignant_id', p.id).eq('est_lue', false)
      setNotifCount(count || 0)
      setLoading(false)
    }
    init()
  }, [])

  // ── Persist classe active ─────────────────────────────────────────────────
  useEffect(() => {
    if (classeId && typeof window !== 'undefined') localStorage.setItem('klassia_active_classe', classeId)
  }, [classeId])

  // ── Pre-fill from URL ?type= or ?prompt= ─────────────────────────────────
  useEffect(() => {
    if (!profil || !classeId) return
    const isFr = (profil as any)?.langue_interface !== 'en'
    const type   = searchParams?.get('type')
    const prompt = searchParams?.get('prompt')
    if (type) {
      const map: Record<string, string> = {
        quiz:       isFr ? 'Crée un quiz formatif pour ma classe.' : 'Create a formative quiz for my class.',
        evaluation: isFr ? 'Crée une évaluation sommative avec grille de correction.' : 'Create a summative assessment with a marking grid.',
        lecon:      isFr ? 'Génère une leçon complète avec activités.' : 'Generate a complete lesson with activities.',
      }
      if (map[type]) { setInputValue(map[type]); textareaRef.current?.focus() }
    } else if (prompt) {
      setInputValue(prompt); textareaRef.current?.focus()
    }
  }, [profil, classeId])

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Auto-resize textarea ──────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'
  }, [inputValue])

  // ── Auto-dismiss toast ────────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const isFr    = (profil as any)?.langue_interface !== 'en'
  const prenom  = profil?.prenom ?? (profil as any)?.first_name ?? ''
  const initiales = prenom ? prenom[0].toUpperCase() : (profil?.email?.[0] ?? 'E').toUpperCase()
  const classe  = classes.find(c => c.id === classeId)

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string, ok: boolean) => setToast({ msg, ok }), [])

  // ── Charger dossiers pour la classe active ────────────────────────────────
  const loadDossiers = useCallback(async (suggestion?: ActionSuggestion | null, forceClasseId?: string) => {
    const cid = forceClasseId ?? classeId
    if (!cid) return
    const { data } = await supabase.from('dossiers_systeme')
      .select('*')
      .eq('classe_id', cid)
      .order('ordre')
    const ds = data || []
    setDossiers(ds)
    const nomCible = DOSSIER_SUGGERE[(suggestion ?? actionSug)?.type_contenu ?? ''] ?? ''
    const found = ds.find((d: any) => d.nom === nomCible)
    setSelectedDossier(found?.id || ds.find((d: any) => d.nom === 'Plans de leçons')?.id || ds[0]?.id || '')
  }, [classeId, actionSug])

  // ── Ouvrir le modal de sauvegarde ─────────────────────────────────────────
  const handleSaveOpen = useCallback(async () => {
    await loadDossiers(actionSug)
    setSaveModal(true)
  }, [loadDossiers, actionSug])

  // ── Confirmer la sauvegarde ───────────────────────────────────────────────
  const handleSaveConfirm = useCallback(async () => {
    if (!selectedDossier || !actionSug || !profil?.id) return
    setSaveLoading(true)
    try {
      const { error } = await supabase.from('fichiers_dossier').insert({
        dossier_id:    selectedDossier,
        classe_id:     classeId || null,
        enseignant_id: profil.id,
        nom:           actionSug.titre,
        type_fichier:  TYPE_FICHIER[actionSug.type_contenu] || 'autre',
        contenu_html:  actionSug.contenu,
        statut:        'brouillon',
      })
      if (error) throw error

      const dossierNom = dossiers.find(d => d.id === selectedDossier)?.nom || ''

      // Nourrir mémoire IA après confirmation de sauvegarde
      nourrirIA({
        enseignant_id: profil.id,
        classe_id:     classeId || undefined,
        source:        'generation_ia',
        titre:         actionSug.titre,
        type:          actionSug.type_contenu,
        contenu_texte: actionSug.contenu?.substring(0, 1200),
      }).catch(() => {})

      setSaveModal(false)
      setActionSug(null)
      showToast(`✓ Sauvegardé dans ${dossierNom}`, true)
    } catch {
      showToast('Erreur lors de la sauvegarde', false)
    } finally {
      setSaveLoading(false)
    }
  }, [selectedDossier, actionSug, profil?.id, classeId, dossiers, showToast])

  // ── Export Word ───────────────────────────────────────────────────────────
  const handleExportWord = useCallback(async () => {
    if (!actionSug || !profil) return
    try {
      const res = await fetch('/api/export/docx', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contenu:        actionSug.contenu,
          type_contenu:   actionSug.type_contenu,
          titre:          actionSug.titre,
          langue:         profil.langue ?? 'fr',
          enseignant_nom: `${profil.prenom ?? ''} ${profil.nom ?? ''}`.trim(),
          classe:         classe?.nom,
          matiere:        classe?.matiere,
          niveau:         classe?.niveau,
        }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${actionSug.titre ?? 'klassia'}.docx`
      a.click()
      URL.revokeObjectURL(url)
      showToast('✓ Document Word téléchargé', true)
    } catch {
      showToast("Erreur lors de l'export Word", false)
    }
  }, [actionSug, profil, classe, showToast])

  // ── Imprimer ──────────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    if (!actionSug) return
    const fenetre = window.open('', '_blank')
    if (!fenetre) return
    const date = new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    fenetre.document.write(`<!DOCTYPE html><html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>KlassIA+ — ${actionSug.titre}</title>
  <style>
    @page { margin: 2cm; }
    body { font-family: Georgia,'Times New Roman',serif; font-size: 11pt; color: #000; margin: 0; }
    h1 { font-size: 18pt; border-bottom: 2pt solid #333; padding-bottom: 6pt; margin-bottom: 12pt; }
    h2 { font-size: 14pt; color: #1a1a1a; margin-top: 14pt; }
    h3 { font-size: 12pt; color: #5B21B6; margin-top: 10pt; }
    p  { margin: 0 0 8pt; line-height: 1.6; }
    ul, ol { padding-left: 20pt; margin: 0 0 8pt; }
    li { line-height: 1.6; margin-bottom: 3pt; }
    blockquote { border-left: 4pt solid #7C3AED; padding: 6pt 12pt; margin: 8pt 0; background: #f5f0ff; font-style: italic; }
    table { width: 100%; border-collapse: collapse; margin: 10pt 0; }
    th { background: #1E1B4B; color: #fff; padding: 8pt 10pt; text-align: left; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    td { padding: 7pt 10pt; border-bottom: 1pt solid #e5e7eb; }
    strong { font-weight: 700; }
    .header { display: flex; justify-content: space-between; margin-bottom: 20pt; padding-bottom: 8pt; border-bottom: 2pt solid #333; }
    .logo   { font-size: 10pt; color: #7C3AED; font-weight: 800; font-family: system-ui; }
    .footer { margin-top: 24pt; padding-top: 6pt; border-top: 1pt solid #ccc; font-size: 8pt; color: #888; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:18pt;font-weight:800;color:#1e1b4b;">${actionSug.titre}</div>
      <div style="font-size:10pt;color:#9ca3af;margin-top:4pt;">${date}</div>
    </div>
    <div class="logo">✦ KlassIA+</div>
  </div>
  <div id="content" style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;">${contentToHtml(actionSug.contenu)}</div>
  <div class="footer">Généré par KlassIA+ — klassia.app</div>
</body></html>`)
    fenetre.document.close()
    setTimeout(() => fenetre.print(), 350)
  }, [actionSug])

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? inputValue).trim()
    if (!text || isStreaming || !profil?.id) return
    setInputValue('')
    setShowVoice(false)
    setActionSug(null)

    const iaId = uid()
    setMessages(prev => [...prev,
      { id: uid(), role: 'user', content: text },
      { id: iaId,  role: 'ia',   content: '', isStreaming: true },
    ])
    setIsStreaming(true)
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/ia/assistant', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:   text,
          contexte:  { page_courante: 'preparer', classe_id: classeId || undefined, classe_nom: classe?.nom, matiere: classe?.matiere, niveau: classe?.niveau },
          historique: messages.slice(-8).map(m => ({ role: m.role === 'ia' ? 'assistant' : 'user', content: m.content })),
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error(`Erreur ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        // Masquer les payloads __ACTION__ et __TRUNCATED__ du rendu chat
        const actionIdx  = buffer.indexOf(ACTION_TAG)
        const truncIdx   = buffer.indexOf(TRUNCATED_TAG)
        const firstEnd   = [actionIdx, truncIdx].filter(i => i >= 0).reduce((a, b) => Math.min(a, b), buffer.length)
        const display    = buffer.substring(0, firstEnd)
        setMessages(prev => prev.map(m => m.id === iaId ? { ...m, content: display } : m))
      }

      // Extraire les payloads action / truncated après la fin du stream
      const actionIdx    = buffer.indexOf(ACTION_TAG)
      const truncIdx     = buffer.indexOf(TRUNCATED_TAG)
      const isTruncated  = truncIdx >= 0
      const firstEnd     = [actionIdx, truncIdx].filter(i => i >= 0).reduce((a, b) => Math.min(a, b), buffer.length)
      let   finalDisplay = buffer.substring(0, firstEnd)
      const actionRaw    = actionIdx >= 0 ? buffer.substring(actionIdx + ACTION_TAG.length) : ''

      if (isTruncated) {
        finalDisplay += isFr
          ? '\n\n> ⚠️ *La génération a atteint sa limite de longueur. La leçon peut être incomplète. Demandez à KlassIA+ de continuer si nécessaire.*'
          : '\n\n> ⚠️ *Generation reached the length limit. The lesson may be incomplete. Ask KlassIA+ to continue if needed.*'
      }

      setMessages(prev => prev.map(m => m.id === iaId ? { ...m, content: finalDisplay, isStreaming: false } : m))

      if (actionRaw) {
        try { setActionSug(JSON.parse(actionRaw) as ActionSuggestion) } catch {}
      }

    } catch (err: any) {
      const msg = err.name === 'AbortError'
        ? (isFr ? 'Génération interrompue.' : 'Generation stopped.')
        : `⚠️ ${err.message || (isFr ? 'Erreur serveur' : 'Server error')}`
      setMessages(prev => prev.map(m => m.id === iaId ? { ...m, content: msg, isStreaming: false } : m))
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [inputValue, isStreaming, profil?.id, classeId, classe, messages, isFr])

  const handleStop   = () => { abortRef.current?.abort() }
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (loading) return <LoadingScreen />

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'linear-gradient(160deg, #EEF5FF 0%, #FFFFFF 100%)' }}>

      <Sidebar profil={profil} activeHref="/dashboard/gerer/preparer" onLogout={handleLogout} notifCount={notifCount} />

      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <Topbar notifCount={notifCount} initiales={initiales} creditsIa={{ used: 0, total: 20 }} isFr={isFr} />

        {/* ── No classes at all ── */}
        {classes.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div className="glass-strong" style={{ padding: '48px 44px', borderRadius: 'var(--radius-lg)', maxWidth: 480, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏫</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                {isFr ? 'Créez d\'abord une classe' : 'Create a class first'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
                {isFr ? 'Vous pourrez ensuite préparer des leçons pour vos élèves.' : 'You\'ll then be able to prepare lessons for your students.'}
              </div>
              <button onClick={() => router.push('/dashboard/classes')}
                style={{ padding: '10px 24px', fontSize: 13, fontWeight: 600, background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', boxShadow: '0 4px 12px var(--violet-glow)', fontFamily: 'inherit' }}>
                {isFr ? '+ Créer ma première classe' : '+ Create my first class'}
              </button>
            </div>
          </div>

        ) : !classeId ? (
          /* ── Class picker ── */
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div className="glass-strong" style={{ padding: '40px 44px', borderRadius: 'var(--radius-lg)', maxWidth: 540, width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>🎓</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.3 }}>
                {isFr ? 'Pour quelle classe préparez-vous du contenu ?' : 'Which class are you preparing content for?'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>
                {isFr ? 'Choisissez une classe pour ouvrir KlassIA+' : 'Choose a class to open KlassIA+'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 10, justifyContent: 'center' }}>
                {classes.map(c => (
                  <button key={c.id} onClick={() => setClasseId(c.id)}
                    style={{ padding: '10px 22px', borderRadius: 'var(--radius-md)', border: `2px solid ${c.couleur || 'var(--violet)'}`, background: 'transparent', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = c.couleur || 'var(--violet)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}>
                    {c.nom}{c.niveau ? ` · ${c.niveau}` : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>

        ) : (
          /* ── Chat interface ── */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Sticky chat header — glass */}
            <div style={{ flexShrink: 0, padding: '10px 20px', borderBottom: '1px solid rgba(15,35,65,0.07)', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
              <select
                value={classeId}
                onChange={e => { setClasseId(e.target.value); setMessages([]); setActionSug(null) }}
                style={{ padding: '6px 12px', borderRadius: 20, border: '1.5px solid rgba(108,92,231,0.2)', background: 'var(--violet-soft, #EDE9FE)', color: 'var(--violet)', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'inherit', maxWidth: 220 }}>
                {classes.map(c => <option key={c.id} value={c.id}>{c.nom}{c.niveau ? ` · ${c.niveau}` : ''}</option>)}
              </select>
              {classe?.matiere && (
                <span style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(15,35,65,0.05)', border: '1px solid rgba(15,35,65,0.08)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {classe.matiere}
                </span>
              )}
              <div style={{ flex: 1 }} />
              {messages.length > 0 && (
                <button onClick={() => { setMessages([]); setActionSug(null) }}
                  style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: 8, fontFamily: 'inherit' }}>
                  {isFr ? 'Effacer ✕' : 'Clear ✕'}
                </button>
              )}
            </div>

            {/* Messages area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>

              {messages.length === 0 ? (
                /* Welcome state */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 56, gap: 20, maxWidth: 680, margin: '0 auto' }}>
                  <LogoKlassIA variant="icone" taille={60} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                      {isFr ? `Bonjour${prenom ? ` ${prenom}` : ''} ! Que préparez-vous aujourd'hui ?` : `Hello${prenom ? ` ${prenom}` : ''}! What are you preparing today?`}
                    </div>
                    {classe && (
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {classe.nom}{classe.niveau ? ` · ${classe.niveau}` : ''}{classe.matiere ? ` · ${classe.matiere}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="prep-suggestion-grid" style={{ width: '100%', marginTop: 8 }}>
                    {SUGGESTIONS(isFr).map(s => (
                      <button key={s.id}
                        onClick={() => handleSend(s.prompt)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1.5px solid rgba(108,92,231,0.12)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', boxShadow: '0 2px 8px rgba(15,35,65,0.05)', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--violet)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(108,92,231,0.12)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(108,92,231,0.12)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(15,35,65,0.05)'; (e.currentTarget as HTMLElement).style.transform = 'none' }}>
                        <span style={{ fontSize: 20 }}>{s.emoji}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

              ) : (
                /* Messages list */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 780, margin: '0 auto' }}>
                  {messages.map(msg => (
                    <div key={msg.id} className="prep-msg-in"
                      style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-start' }}>

                      {msg.role === 'ia' && (
                        <div style={{ flexShrink: 0, marginTop: 2 }}>
                          <LogoKlassIA variant="icone" taille={32} />
                        </div>
                      )}

                      <div style={{
                        maxWidth: msg.role === 'user' ? '72%' : '100%',
                        padding: msg.role === 'user' ? '10px 16px' : '4px 0 16px',
                        borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : 0,
                        background: msg.role === 'user' ? 'var(--violet, #6C5CE7)' : 'transparent',
                        color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                        fontSize: 14,
                        lineHeight: 1.65,
                      }}>
                        {msg.role === 'ia' && msg.isStreaming && !msg.content ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                            <span style={{ fontStyle: 'italic', marginRight: 4 }}>KlassIA+ {isFr ? 'rédige' : 'is writing'}</span>
                            <span className="prep-dot" />
                            <span className="prep-dot" />
                            <span className="prep-dot" />
                          </span>
                        ) : msg.role === 'ia' ? (
                          <MarkdownMessage content={msg.content} isStreaming={!!msg.isStreaming} />
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  ))}

                  {/* ── Barre d'actions après fin de génération ── */}
                  {actionSug && !isStreaming && (
                    <div className="prep-msg-in" style={{ paddingLeft: 42 }}>
                      <div className="glass-light" style={{
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const,
                        boxShadow: '0 2px 8px rgba(15,35,65,0.05)',
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginRight: 4 }}>
                          {isFr ? '✦ Généré :' : '✦ Generated:'}
                        </span>
                        {[
                          { label: '📥 Word',    onClick: handleExportWord },
                          { label: '🖨️ Imprimer', onClick: handlePrint },
                          { label: '💾 Sauvegarder', onClick: handleSaveOpen, primary: true },
                        ].map(btn => (
                          <button
                            key={btn.label}
                            onClick={btn.onClick}
                            style={{
                              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                              border: btn.primary ? 'none' : '1px solid rgba(15,35,65,0.1)',
                              background: btn.primary ? 'linear-gradient(135deg, #6B3FA0, #4F46E5)' : 'rgba(255,255,255,0.85)',
                              color: btn.primary ? '#fff' : 'var(--text-secondary)',
                              boxShadow: btn.primary ? '0 3px 10px rgba(108,92,231,0.25)' : 'none',
                            }}
                            onMouseEnter={e => { if (!btn.primary) (e.currentTarget as HTMLElement).style.background = '#fff' }}
                            onMouseLeave={e => { if (!btn.primary) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.85)' }}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input area — glass */}
            <div style={{ flexShrink: 0, padding: '10px 24px 16px', borderTop: '1px solid rgba(15,35,65,0.07)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>

              {/* Voice waveform */}
              {showVoice && (
                <div style={{ marginBottom: 10, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(108,92,231,0.05)', border: '1px solid rgba(108,92,231,0.15)' }}>
                  <VoiceWaveform onStop={transcript => { setShowVoice(false); if (transcript) setInputValue(transcript) }} />
                </div>
              )}

              {/* Glass input pill */}
              <div className="glass-strong"
                style={{ borderRadius: 'var(--radius-md)', padding: '10px 14px', display: 'flex', alignItems: 'flex-end', gap: 8, boxShadow: 'var(--shadow-card)' }}
                onFocusCapture={e  => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px var(--violet-glow, rgba(108,92,231,0.25))' }}
                onBlurCapture={e   => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)' }}>

                {/* Mic */}
                <button
                  onClick={() => setShowVoice(v => !v)}
                  style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, background: showVoice ? 'rgba(239,68,68,0.1)' : 'rgba(15,35,65,0.05)', color: showVoice ? '#EF4444' : 'var(--text-muted)', transition: 'all 0.15s' }}
                  title={isFr ? 'Dicter' : 'Dictate'}>
                  🎤
                </button>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder={isFr ? `Demandez à KlassIA+ pour ${classe?.nom || 'votre classe'}…` : `Ask KlassIA+ for ${classe?.nom || 'your class'}…`}
                  rows={1}
                  style={{ flex: 1, resize: 'none', minHeight: 28, maxHeight: 140, fontSize: 14, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'inherit', lineHeight: 1.5, overflowY: 'auto', padding: '3px 0' }}
                />

                {/* Send / Stop */}
                <button
                  onClick={isStreaming ? handleStop : () => handleSend()}
                  disabled={!isStreaming && !inputValue.trim()}
                  style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: isStreaming || inputValue.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', flexShrink: 0, transition: 'background 0.15s', background: isStreaming ? '#EF4444' : !inputValue.trim() ? 'rgba(15,35,65,0.12)' : 'var(--violet)' }}>
                  {isStreaming ? '⬛' : '▶'}
                </button>
              </div>

              <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: '6px 0 0' }}>
                KlassIA+ · {isFr ? 'Contenu éducatif généré par IA · Vérifiez avant d\'utiliser' : 'AI-generated educational content · Review before using'}
              </p>
            </div>

          </div>
        )}

      </div>

      {/* ── Modal de sauvegarde ── */}
      {saveModal && (
        <>
          <div
            onClick={() => setSaveModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: Z.modal_overlay }}
          />
          <div style={{
            position: 'fixed', left: '50%', top: '50%',
            transform: 'translate(-50%,-50%)',
            width: 'min(520px, 95vw)',
            background: 'var(--card-bg, rgba(255,255,255,0.96))',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--card-border, rgba(255,255,255,0.9))',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 24px 64px rgba(15,35,65,0.18)',
            zIndex: Z.modal_contenu,
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(15,35,65,0.08)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {isFr ? 'Où ranger cette leçon ?' : 'Where to save this lesson?'}
                </div>
                {actionSug?.titre && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'normal' }}>{isFr ? 'Leçon :' : 'Lesson:'} </span>« {actionSug.titre} »
                  </div>
                )}
                {classe && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                    <span>{isFr ? 'Classe :' : 'Class:'} </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{classe.nom}{classe.niveau ? ` · ${classe.niveau}` : ''}</strong>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSaveModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1, flexShrink: 0, marginTop: -2 }}>
                ×
              </button>
            </div>

            {/* Folder tree */}
            <div style={{ maxHeight: 340, overflowY: 'auto', padding: '10px 14px' }}>
              {dossiers.length === 0 ? (
                <div style={{ padding: '12px 0' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                    {isFr ? 'Aucun dossier trouvé. Choisissez une classe pour sauvegarder :' : 'No folders found. Choose a class to save to:'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                    {classes.map(c => (
                      <button key={c.id}
                        onClick={() => { setClasseId(c.id); loadDossiers(actionSug, c.id) }}
                        style={{
                          padding: '9px 14px', borderRadius: 10, textAlign: 'left',
                          border: `1.5px solid ${classeId === c.id ? 'var(--violet)' : 'rgba(15,35,65,0.1)'}`,
                          background: classeId === c.id ? 'var(--violet-soft, #EDE9FE)' : 'transparent',
                          cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                          color: classeId === c.id ? 'var(--violet)' : 'var(--text-primary)',
                          transition: 'all 0.12s',
                        }}>
                        📚 {c.nom}{c.niveau ? ` · ${c.niveau}` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                dossiers.filter(d => !d.parent_id).map(parent => (
                  <div key={parent.id} style={{ marginBottom: 4 }}>
                    {/* Dossier racine */}
                    <button
                      onClick={() => setSelectedDossier(parent.id)}
                      style={{
                        width: '100%', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px', borderRadius: 10,
                        border: selectedDossier === parent.id ? '1.5px solid var(--violet)' : '1.5px solid transparent',
                        background: selectedDossier === parent.id ? 'var(--violet-soft, #EDE9FE)' : 'transparent',
                        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => { if (selectedDossier !== parent.id) (e.currentTarget as HTMLElement).style.background = 'rgba(108,92,231,0.04)' }}
                      onMouseLeave={e => { if (selectedDossier !== parent.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <span style={{ fontSize: 18 }}>{parent.icone || '📁'}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: selectedDossier === parent.id ? 'var(--violet)' : 'var(--text-primary)' }}>
                        {parent.nom}
                      </span>
                    </button>

                    {/* Sous-dossiers */}
                    {dossiers.filter(d => d.parent_id === parent.id).map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setSelectedDossier(sub.id)}
                        style={{
                          width: '100%', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 12px 7px 40px', borderRadius: 10,
                          border: selectedDossier === sub.id ? '1.5px solid var(--violet)' : '1.5px solid transparent',
                          background: selectedDossier === sub.id ? 'var(--violet-soft, #EDE9FE)' : 'transparent',
                          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => { if (selectedDossier !== sub.id) (e.currentTarget as HTMLElement).style.background = 'rgba(108,92,231,0.04)' }}
                        onMouseLeave={e => { if (selectedDossier !== sub.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        <span style={{ fontSize: 15 }}>{sub.icone || '📄'}</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: selectedDossier === sub.id ? 'var(--violet)' : 'var(--text-secondary)' }}>
                          {sub.nom}
                        </span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(15,35,65,0.08)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSaveModal(false)}
                style={{ padding: '9px 16px', borderRadius: 10, border: '1.5px solid rgba(15,35,65,0.12)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                {isFr ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveConfirm}
                disabled={!selectedDossier || saveLoading}
                style={{
                  padding: '9px 20px', borderRadius: 10,
                  background: !selectedDossier || saveLoading ? 'rgba(108,92,231,0.5)' : 'linear-gradient(135deg, #6B3FA0, #4F46E5)',
                  border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: !selectedDossier || saveLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(108,92,231,0.3)',
                }}>
                {saveLoading
                  ? (isFr ? '⟳ Sauvegarde…' : '⟳ Saving…')
                  : (isFr ? '✓ Confirmer et sauvegarder' : '✓ Confirm & save')
                }
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          padding: '10px 20px', borderRadius: 'var(--radius-pill, 30px)',
          background: toast.ok ? 'rgba(34,197,94,0.94)' : 'rgba(239,68,68,0.94)',
          color: '#fff', fontSize: 13, fontWeight: 600,
          boxShadow: '0 6px 24px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: Z.toast,
          whiteSpace: 'nowrap',
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}

    </div>
  )
}

// ─── Page (with Suspense for useSearchParams) ─────────────────────────────────

export default function PreparerPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PreparerPageInner />
    </Suspense>
  )
}
