'use client'

import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LoadingScreen from '@/components/LoadingScreen'
import { nourrirIA } from '@/lib/utils/nourrir-ia'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ApercuModal from '@/components/ui/ApercuModal'
import MarkdownRenderer from '@/components/ui/MarkdownRenderer'
import Sidebar from '@/components/Sidebar'

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'ia' | 'system'

interface Message {
  id:          string
  role:        MessageRole
  content:     string
  timestamp:   Date
  type?:       string
  filename?:   string
  isStreaming?: boolean
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const TYPE_KEYWORDS: [string[], string][] = [
  [['quiz', 'questionnaire', 'vrai ou faux'],                                    'quiz'             ],
  [['évaluation', 'examen', 'test sommati', 'correction de test'],               'evaluation'       ],
  [['plan de leçon', 'plan détaillé', 'plan de cours', 'plan pédago'],           'plan_lecon'       ],
  [['plan annuel', 'programme annuel', 'progression annuelle'],                  'plan_annuel'      ],
  [['kit complet', 'kit pédago', 'kit de leçon'],                                'kit_complet'      ],
  [['leçon', 'fiche leçon', 'cours sur', 'enseign'],                            'lecon_complete'   ],
  [['email', 'courriel', 'parents', 'lettre aux parents'],                       'email_parents'    ],
  [['devoir', 'travail à la maison', 'homework'],                                'devoir'           ],
  [['activité', 'exercice', 'atelier', 'travail en groupe'],                     'activite_groupe'  ],
  [['note rapide', 'mémo', 'annotation'],                                        'note_automatique' ],
  [['rapport', 'bulletin', 'commentaire d\'élève'],                              'rapport_eleve'    ],
  [['courrier', 'lettre officielle'],                                             'courrier_officiel'],
]

function detecterType(msg: string): string {
  const m = msg.toLowerCase()
  for (const [kws, type] of TYPE_KEYWORDS) {
    if (kws.some(k => m.includes(k))) return type
  }
  return 'lecon_complete'
}

const TYPE_INFO: Record<string, { icon: string; label: string; color: string }> = {
  lecon_complete:    { icon: '📚', label: 'Leçon complète',   color: '#A78BFA' },
  plan_lecon:        { icon: '📝', label: 'Plan de leçon',    color: '#60A5FA' },
  plan_annuel:       { icon: '📅', label: 'Plan annuel',      color: '#7F77DD' },
  kit_complet:       { icon: '🎒', label: 'Kit complet',      color: '#9B8CE0' },
  quiz:              { icon: '🎮', label: 'Quiz',             color: '#F472B6' },
  evaluation:        { icon: '📊', label: 'Évaluation',       color: '#F87171' },
  email_parents:     { icon: '💌', label: 'Email parents',    color: '#FB923C' },
  devoir:            { icon: '📓', label: 'Devoir',           color: '#FBC34A' },
  activite_groupe:   { icon: '🎯', label: 'Activité',         color: '#34D399' },
  note_automatique:  { icon: '⚡', label: 'Note rapide',      color: '#FDE68A' },
  rapport_eleve:     { icon: '👤', label: 'Rapport élève',    color: '#E879F9' },
  courrier_officiel: { icon: '📋', label: 'Courrier',         color: '#94A3B8' },
}

const SUGGESTIONS = [
  { icon: '✨', label: 'Générer une leçon complète', prompt: 'Génère une leçon complète sur ' },
  { icon: '📝', label: 'Créer un plan de leçon',    prompt: 'Crée un plan de leçon pour '    },
  { icon: '🎮', label: 'Créer un quiz',             prompt: 'Crée un quiz sur '               },
  { icon: '💌', label: 'Rédiger un email parents',  prompt: 'Rédige un email aux parents concernant ' },
  { icon: '📊', label: 'Créer une évaluation',      prompt: 'Crée une évaluation sur '        },
  { icon: '⚡', label: 'Note rapide',              prompt: 'Note rapide : '                  },
]

const FOLLOW_UP: Record<string, Array<{ icon: string; label: string; prompt: string }>> = {
  lecon_complete: [
    { icon: '🎮', label: 'Quiz sur ce sujet',   prompt: 'Crée un quiz sur le même sujet'         },
    { icon: '📓', label: 'Générer les devoirs', prompt: 'Génère des devoirs pour cette leçon'     },
    { icon: '💌', label: 'Email aux parents',   prompt: 'Rédige un email aux parents pour cette leçon' },
  ],
  fiche_lecon: [
    { icon: '🎮', label: 'Quiz sur ce sujet',   prompt: 'Crée un quiz sur le même sujet'         },
    { icon: '📓', label: 'Générer les devoirs', prompt: 'Génère des devoirs pour cette leçon'     },
    { icon: '💌', label: 'Email aux parents',   prompt: 'Rédige un email aux parents pour cette leçon' },
  ],
  quiz: [
    { icon: '📋', label: 'Grille de correction', prompt: 'Génère la grille de correction pour ce quiz' },
    { icon: '📚', label: 'Créer la leçon',       prompt: 'Génère la leçon complète pour ce sujet'     },
    { icon: '📊', label: 'Évaluation sommative', prompt: 'Crée une évaluation sommative sur ce sujet' },
  ],
  evaluation: [
    { icon: '📚', label: 'Leçon de révision',   prompt: 'Génère une leçon de révision pour ce sujet' },
    { icon: '📓', label: 'Devoirs de prépa',    prompt: 'Génère des devoirs de préparation'          },
    { icon: '💌', label: 'Informer les parents', prompt: 'Rédige un email informant les parents de l\'évaluation' },
  ],
}

const FOLLOW_UP_DEFAULT = [
  { icon: '🎮', label: 'Créer un quiz',    prompt: 'Crée un quiz sur ce sujet'              },
  { icon: '📚', label: 'Créer une leçon', prompt: 'Génère une leçon complète sur ce sujet' },
  { icon: '💌', label: 'Email parents',   prompt: 'Rédige un email aux parents'             },
]

const MESSAGES_VAGUES = ['slt', 'salut', 'bonjour', 'hello', 'hi', 'ok', 'oui', 'non', 'test', 'allo', 'aide', 'help', 'quoi']

function estMessageVague(message: string): boolean {
  const msg = message.toLowerCase().trim()
  return msg.length < 10 || MESSAGES_VAGUES.includes(msg)
}

const REP_VAGUE = `Bonjour ! 👋 Je suis prêt à vous aider.

Que souhaitez-vous créer ?
- Une **leçon** sur quel sujet ?
- Un **quiz** ou une **évaluation** ?
- Un **email** pour les parents ?
- Un **plan de leçon** ou plan annuel ?

Dites-moi votre besoin et je génère le contenu immédiatement !`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).substring(2, 10)
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

const CALLOUT_MAP: [string, string][] = [
  ['🎯', 'callout-blue'],
  ['💡', 'callout-yellow'],
  ['✏️', 'callout-green'],
  ['⚠️', 'callout-orange'],
  ['📝', 'callout-violet'],
  ['📚', 'callout-violet'],
]

function processCallouts(html: string): string {
  let out = html
  for (const [emoji, cls] of CALLOUT_MAP) {
    out = out.replace(new RegExp(`<p>(\\s*${emoji})`, 'g'), `<p class="${cls}">$1`)
  }
  return out
}

// ─── Composants ReactMarkdown ─────────────────────────────────────────────────

const MD_BUBBLE = {
  h1: ({ children }: any) => <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', margin: '8px 0 4px' }}>{children}</h1>,
  h2: ({ children }: any) => <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: '6px 0 3px' }}>{children}</h2>,
  h3: ({ children }: any) => <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', margin: '5px 0 2px' }}>{children}</h3>,
  p:  ({ children }: any) => <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>{children}</p>,
  strong: ({ children }: any) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
  ul: ({ children }: any) => <ul style={{ paddingLeft: 18, margin: '0 0 6px' }}>{children}</ul>,
  ol: ({ children }: any) => <ol style={{ paddingLeft: 18, margin: '0 0 6px' }}>{children}</ol>,
  li: ({ children }: any) => <li style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 2 }}>{children}</li>,
  code: ({ children }: any) => <code style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: 4, padding: '1px 5px', fontSize: 11, fontFamily: 'monospace', color: 'var(--color-accent-violet)' }}>{children}</code>,
  blockquote: ({ children }: any) => <blockquote style={{ borderLeft: '3px solid var(--color-accent-violet)', paddingLeft: 10, margin: '4px 0', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>{children}</blockquote>,
  table: ({ children }: any) => <div style={{ overflowX: 'auto', margin: '6px 0' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>{children}</table></div>,
  th: ({ children }: any) => <th style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', padding: '6px 8px', fontWeight: 600, textAlign: 'left', border: '1px solid var(--color-border)' }}>{children}</th>,
  td: ({ children }: any) => <td style={{ padding: '6px 8px', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>{children}</td>,
}

// ─── Dots animés ─────────────────────────────────────────────────────────────

function Dots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', marginLeft: 4 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 4, height: 4, borderRadius: '50%',
          background: 'var(--color-accent-violet)',
          display: 'inline-block',
          animation: `dotBlink 1.2s ${i * 0.2}s ease-in-out infinite`,
        }} />
      ))}
    </span>
  )
}

// ─── Contenu principal ────────────────────────────────────────────────────────

function StudioContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  // Redirect to Préparer — Studio IA génération is now centralised there
  useEffect(() => {
    const params = new URLSearchParams()
    const classeId = searchParams.get('classe_id')
    const type     = searchParams.get('type')
    const prompt   = searchParams.get('prompt')
    if (classeId) params.set('classe_id', classeId)
    if (type)     params.set('type', type)
    if (prompt)   params.set('prompt', prompt)
    const qs = params.toString()
    router.replace(`/dashboard/gerer/preparer${qs ? `?${qs}` : ''}`)
  }, [])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const abortRef       = useRef<AbortController | null>(null)
  const saveDataRef    = useRef<{ content: string; type: string; filename: string }>({ content: '', type: '', filename: '' })

  // ── Data ───────────────────────────────────────────────────────────────────
  const [profil,  setProfil]  = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // ── Conversation ───────────────────────────────────────────────────────────
  const [messages,    setMessages]    = useState<Message[]>([])
  const [estEnCours,  setEstEnCours]  = useState(false)
  const [previewType, setPreviewType] = useState('')

  // ── Input ──────────────────────────────────────────────────────────────────
  const [inputValue,   setInputValue]   = useState('')
  const [selectedMode, setSelectedMode] = useState('auto')

  // ── Contexte ───────────────────────────────────────────────────────────────
  const [selectedClasseId, setSelectedClasseId] = useState('')
  const [selectedMatiere,  setSelectedMatiere]  = useState('')

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [showHistory,      setShowHistory]      = useState(false)
  const [showSaveModal,    setShowSaveModal]    = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [contenuModal,     setContenuModal]     = useState('')
  const [typeModal,        setTypeModal]        = useState('')
  const [historyItems,     setHistoryItems]     = useState<any[]>([])
  const [saveDossiers,     setSaveDossiers]     = useState<any[]>([])
  const [saveDossierSel,   setSaveDossierSel]   = useState('')
  const [saveFileName,     setSaveFileName]     = useState('')
  const [isSaving,         setIsSaving]         = useState(false)
  const [toast,            setToast]            = useState<{ msg: string; ok: boolean; action?: { label: string; onClick: () => void } } | null>(null)

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }
        const { data: p } = await supabase.from('utilisateurs').select('*').eq('user_id', session.user.id).single()
        if (!p) { router.push('/login'); return }
        setProfil(p)

        const { data: cls } = await supabase
          .from('classes').select('*').eq('enseignant_id', p.id).order('created_at', { ascending: false })
        const list = cls || []
        setClasses(list)

        const cParam = searchParams.get('classe_id')
        const tParam = searchParams.get('type')
        const cible  = cParam && list.find((c: any) => c.id === cParam) ? cParam : list[0]?.id || ''
        setSelectedClasseId(cible)
        const classeObj = list.find((c: any) => c.id === cible)
        if (classeObj?.matiere) setSelectedMatiere(classeObj.matiere)
        if (tParam && TYPE_INFO[tParam]) setInputValue(`Génère ${TYPE_INFO[tParam].label.toLowerCase()} `)

        setLoading(false)
      } catch (e) {
        console.error('Studio IA init:', e)
        setLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [inputValue])

  useEffect(() => {
    const c = classes.find(c => c.id === selectedClasseId)
    if (c?.matiere) setSelectedMatiere(c.matiere)
  }, [selectedClasseId, classes])

  const selectedClasse = useMemo(() => classes.find(c => c.id === selectedClasseId), [classes, selectedClasseId])

  const showToast = (msg: string, ok: boolean, action?: { label: string; onClick: () => void }) => {
    setToast({ msg, ok, action })
    setTimeout(() => setToast(null), 5000)
  }

  // ── Sauvegarde automatique dans la classe ─────────────────────────────────
  const DOSSIER_MAP: Record<string, string> = {
    lecon_complete:    'lecons',
    fiche_lecon:       'lecons',
    plan_lecon:        'plans_lecons',
    quiz:              'lecons',
    activite_groupe:   'lecons',
    evaluation:        'evaluations_sommatives',
    ressource:         'ressources',
    email_parents:     'parents',
    courrier_officiel: 'administration',
    devoir:            'lecons',
    rapport_eleve:     'ressources',
    note_automatique:  'ressources',
  }

  // Map type_contenu (Studio IA) → type_fichier autorisé par le CHECK de fichiers_dossier
  const TYPE_FICHIER_MAP: Record<string, string> = {
    fiche_lecon:       'lecon_complete',
    activite_groupe:   'activite',
    evaluation:        'evaluation_sommative',
    email_parents:     'communication',
    courrier_officiel: 'courrier',
    rapport_eleve:     'rapport',
    note_automatique:  'note',
  }

  const sauvegarderDansClasse = useCallback(async (contenu: string, type_contenu: string, nom: string) => {
    if (!selectedClasseId || !profil?.id || !contenu) return

    try {
      const type_dossier = DOSSIER_MAP[type_contenu] ?? 'ressources'

      const { data: dossier } = await supabase
        .from('dossiers_systeme')
        .select('id, nom')
        .eq('classe_id', selectedClasseId)
        .eq('type', type_dossier)
        .maybeSingle()

      if (!dossier) return

      const isQuiz = type_contenu === 'quiz'
      let contenu_json: any = {}
      if (isQuiz) {
        try { contenu_json = JSON.parse(contenu.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')) } catch { /* keep {} */ }
      }

      const { data: fichier, error: insertErr } = await supabase
        .from('fichiers_dossier')
        .insert({
          dossier_id:       dossier.id,
          classe_id:        selectedClasseId,
          enseignant_id:    profil.id,
          nom,
          type_fichier:     TYPE_FICHIER_MAP[type_contenu] || type_contenu,
          statut:           'brouillon',
          contenu_html:     isQuiz ? null : contenu,
          contenu_json:     isQuiz ? contenu_json : {},
          indexe_studio_ia: true,
        } as any)
        .select('id')
        .single()

      if (insertErr) { showToast('Erreur sauvegarde : ' + insertErr.message, false); return }

      void nourrirIA({
        enseignant_id: profil.id,
        classe_id:     selectedClasseId,
        source:        'generation_ia',
        titre:         nom,
        type:          type_contenu,
        contenu_texte: !isQuiz ? contenu.substring(0, 1200) : undefined,
      }).catch(() => {})

      const classeNom = classes.find(c => c.id === selectedClasseId)?.nom || 'la classe'
      showToast(
        `✓ Sauvegardé dans ${classeNom} → ${dossier.nom}`,
        true,
        {
          label: 'Voir le dossier →',
          onClick: () => router.push(`/dashboard/classes/${selectedClasseId}?dossier=${dossier.id}`),
        }
      )

      return (fichier as any)?.id
    } catch { /* sauvegarde silencieuse — ignorer les erreurs */ }
  }, [selectedClasseId, profil?.id, supabase, classes, router])

  // ── Envoi ──────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputValue.trim()
    if (!text || estEnCours) return

    setInputValue('')
    const userMsg: Message = { id: uid(), role: 'user', content: text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])

    if (estMessageVague(text)) {
      setMessages(prev => [...prev, { id: uid(), role: 'ia', content: REP_VAGUE, timestamp: new Date() }])
      return
    }

    const typeContenu = selectedMode !== 'auto' ? selectedMode : detecterType(text)
    setPreviewType(typeContenu)

    const iaId    = uid()
    const filename = text.substring(0, 50).replace(/[^a-zA-ZÀ-ÿ0-9\s-]/g, '').trim()

    setMessages(prev => [...prev, { id: iaId, role: 'ia', content: '', timestamp: new Date(), type: typeContenu, filename, isStreaming: true }])
    setEstEnCours(true)

    const convCtx = messages
      .filter(m => m.role !== 'system')
      .slice(-4)
      .map(m => `${m.role === 'user' ? 'Enseignant' : 'IA'}: ${stripHtml(m.content).substring(0, 250)}`)
      .join('\n')

    const instructions = convCtx
      ? `Contexte de la conversation :\n${convCtx}\n\nNouvelle demande : ${text}`
      : text

    const body = {
      type_contenu:  typeContenu,
      sujet:         text,
      streaming:     true,
      profil_ia:     profil?.profil_ia || {},
      instructions,
      contexte: selectedClasse ? {
        classe: {
          nom:           selectedClasse.nom,
          niveau:        selectedClasse.niveau,
          matiere:       selectedMatiere || selectedClasse.matiere,
          nombre_eleves: selectedClasse.nombre_eleves,
        }
      } : undefined,
    }

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/ia/generer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error('Réponse serveur invalide')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   full    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setMessages(prev => prev.map(m => m.id === iaId ? { ...m, content: full } : m))
      }

      setMessages(prev => prev.map(m => m.id === iaId ? { ...m, isStreaming: false } : m))

      saveDataRef.current = { content: full, type: typeContenu, filename }
      setSaveFileName(filename)

      // Auto-sauvegarde dans le dossier de la classe
      void sauvegarderDansClasse(full, typeContenu, filename)

      if (profil?.id && full) {
        void supabase.from('generations_ia').insert({
          enseignant_id: profil.id,
          classe_id:     selectedClasseId || null,
          type_contenu:  typeContenu,
          sujet:         text,
          contenu_html:  full,
        } as any)

        nourrirIA({
          enseignant_id: profil.id,
          classe_id:     selectedClasseId || undefined,
          source:        'generation_ia',
          titre:         text.substring(0, 180),
          type:          typeContenu,
          contenu_texte: stripHtml(full).substring(0, 1200),
        }).catch(() => {})
      }

    } catch (err: any) {
      const patch = err.name === 'AbortError'
        ? (msgs: Message[]) => msgs.map(m => m.id === iaId ? { ...m, content: m.content || 'Génération interrompue.', isStreaming: false } : m)
        : (msgs: Message[]) => msgs.map(m => m.id === iaId ? { ...m, content: `⚠️ ${err.message || 'Erreur de génération'}`, isStreaming: false } : m)
      setMessages(patch)
    } finally {
      setEstEnCours(false)
      abortRef.current = null
    }
  }, [inputValue, estEnCours, selectedMode, messages, profil, selectedClasseId, selectedClasse, selectedMatiere, supabase, sauvegarderDansClasse])

  const handleStop    = () => { abortRef.current?.abort() }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Historique ─────────────────────────────────────────────────────────────
  const openHistory = async () => {
    if (!profil?.id) return
    const { data } = await supabase.from('generations_ia').select('*').eq('enseignant_id', profil.id)
      .order('created_at', { ascending: false }).limit(50)
    setHistoryItems(data || [])
    setShowHistory(true)
  }

  const loadFromHistory = (item: any) => {
    const fn = item.sujet?.substring(0, 50) || 'Document rechargé'
    setMessages([
      { id: uid(), role: 'system', content: `Conversation rechargée · ${new Date(item.created_at).toLocaleDateString('fr-CA')}`, timestamp: new Date() },
      { id: uid(), role: 'user',   content: item.sujet || 'Demande rechargée', timestamp: new Date(item.created_at) },
      { id: uid(), role: 'ia',     content: item.contenu_html || '', timestamp: new Date(item.created_at), type: item.type_contenu, filename: fn },
    ])
    saveDataRef.current = { content: item.contenu_html || '', type: item.type_contenu || '', filename: fn }
    setSaveFileName(fn)
    setPreviewType(item.type_contenu || '')
    setShowHistory(false)
  }

  const deleteHistoryItem = async (id: string) => {
    await supabase.from('generations_ia').delete().eq('id', id)
    setHistoryItems(prev => prev.filter(h => h.id !== id))
  }

  // ── Sauvegarder ────────────────────────────────────────────────────────────
  const openSaveModalForMsg = async (content: string, type: string, filename: string) => {
    if (!selectedClasseId) { showToast("Sélectionnez une classe d'abord.", false); return }
    saveDataRef.current = { content, type, filename }
    setSaveFileName(filename)
    const { data } = await supabase.from('dossiers_systeme').select('*')
      .eq('classe_id', selectedClasseId).order('ordre', { ascending: true })
    setSaveDossiers(data || [])
    setSaveDossierSel('')
    setShowSaveModal(true)
  }

  const handleSave = async () => {
    const sd = saveDataRef.current
    if (!saveDossierSel || !profil?.id || !sd.content) {
      showToast('Sélectionnez un dossier de destination.', false); return
    }
    setIsSaving(true)
    try {
      const nom = saveFileName || sd.filename || 'Contenu généré'
      await supabase.from('fichiers_dossier').insert({
        dossier_id:       saveDossierSel,
        enseignant_id:    profil.id,
        classe_id:        selectedClasseId || null,
        nom,
        type_fichier:     sd.type || 'lecon_complete',
        statut:           'brouillon',
        contenu_html:     sd.content,
        indexe_studio_ia: true,
      } as any)

      void supabase.from('studio_ia_memoire').upsert({
        enseignant_id: profil.id,
        classe_id:     selectedClasseId || null,
        cle:           `gen_${Date.now()}`,
        contenu:       { nom, type: sd.type, extrait: stripHtml(sd.content).substring(0, 400) },
        type:          sd.type || 'lecon_complete',
      }, { onConflict: 'enseignant_id,cle,type' })

      const dosNom = saveDossiers.find(d => d.id === saveDossierSel)?.nom || 'le dossier'
      showToast(`✓ Sauvegardé dans "${dosNom}"`, true)
      setShowSaveModal(false)
    } catch (err: any) {
      showToast(`⚠️ ${err.message}`, false)
    }
    setIsSaving(false)
  }

  if (loading) return <LoadingScreen />

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Sidebar
        profil={profil}
        activeHref="/dashboard/studio-ia"
        onLogout={async () => { await supabase.auth.signOut(); router.push('/connexion') }}
      />
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg-primary)',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, sans-serif",
        marginLeft: 'var(--sidebar-w)',
      }}
      onClick={() => {}}
    >
      <style>{`
        @keyframes dotBlink {
          0%, 80%, 100% { opacity: .25; transform: scale(.8); }
          40%            { opacity: 1;   transform: scale(1);   }
        }
        @keyframes blink {
          0%, 50%  { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .streaming-cursor::after {
          content: '▋';
          animation: blink 1s step-start infinite;
          color: var(--color-accent-violet);
          font-size: .9em; margin-left: 2px;
        }
        .preview-area { font-size: 13px; line-height: 1.7; color: var(--color-text-primary); }
        .preview-area h1 { font-size: 20px; font-weight: 700; color: var(--color-accent-violet); margin: 16px 0 8px; padding-bottom: 6px; }
        .preview-area h2 { font-size: 16px; font-weight: 600; color: var(--color-text-primary); margin: 14px 0 6px; border-bottom: 2px solid var(--color-border); padding-bottom: 4px; }
        .preview-area h3 { font-size: 14px; font-weight: 600; color: var(--color-text-secondary); margin: 10px 0 4px; }
        .preview-area p  { margin: 0 0 10px; }
        .preview-area ul, .preview-area ol { padding-left: 22px; margin: 0 0 10px; }
        .preview-area li { margin-bottom: 4px; }
        .preview-area strong { font-weight: 700; }
        .preview-area hr { border: none; border-top: 1px solid var(--color-border); margin: 12px 0; }
        .preview-area code { background: var(--color-bg-tertiary); border: 1px solid var(--color-border); border-radius: 4px; padding: 1px 6px; font-size: 12px; font-family: monospace; color: var(--color-accent-violet); }
        .preview-area blockquote { border-left: 3px solid var(--color-accent-violet); padding-left: 12px; margin-left: 0; color: var(--color-text-secondary); font-style: italic; }
        .preview-area table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
        .preview-area th { background: #7F77DD; color: #FFF; padding: 7px 10px; font-weight: 600; text-align: left; border: 1px solid var(--color-border); }
        .preview-area td { padding: 6px 10px; border: 1px solid var(--color-border); }
        .preview-area tr:nth-child(even) td { background: var(--color-bg-card); }
        .preview-area tr:nth-child(odd)  td { background: var(--color-bg-tertiary); }
        .preview-area .callout-blue   { background: rgba(96,165,250,.1);  border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; }
        .preview-area .callout-yellow { background: rgba(251,191,36,.1);  border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; }
        .preview-area .callout-green  { background: rgba(52,211,153,.1);  border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; }
        .preview-area .callout-orange { background: rgba(251,146,60,.1);  border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; }
        .preview-area .callout-violet { background: rgba(167,139,250,.1); border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; }
        .ctx-select {
          padding: 4px 9px; border-radius: 8px;
          border: 1px solid var(--color-border);
          background: var(--color-input-bg);
          color: var(--color-text-primary);
          font-size: 12px; cursor: pointer; outline: none; font-family: inherit;
        }
        .ctx-select:focus { border-color: var(--color-accent-violet); }
        .chip-btn {
          padding: 8px 16px; border-radius: 99px;
          border: 1.5px solid var(--color-border);
          background: var(--color-bg-card);
          color: var(--color-text-secondary);
          font-size: 13px; cursor: pointer; font-family: inherit;
          display: flex; align-items: center; gap: 6px; font-weight: 500;
          transition: all .15s;
        }
        .chip-btn:hover { border-color: var(--color-accent-violet); color: var(--color-accent-violet); }
        .chip-sm {
          padding: 5px 12px; border-radius: 99px;
          border: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
          color: var(--color-text-secondary);
          font-size: 11px; cursor: pointer; font-family: inherit;
          display: flex; align-items: center; gap: 5px; font-weight: 500;
          transition: all .15s;
        }
        .chip-sm:hover { border-color: var(--color-accent-violet); color: var(--color-accent-violet); }
        .hdr-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 8px;
          border: 1px solid var(--color-border);
          background: transparent; color: var(--color-text-secondary);
          font-size: 12px; cursor: pointer; font-family: inherit;
          transition: border-color .15s;
        }
        .hdr-btn:hover { border-color: var(--color-border-strong); }
        .card-action-btn {
          padding: 5px 11px; border-radius: 7px;
          border: 1px solid var(--color-border);
          background: transparent; color: var(--color-text-secondary);
          font-size: 11px; cursor: pointer; font-family: inherit;
          display: flex; align-items: center; gap: 4px;
          transition: all .12s;
        }
        .card-action-btn:hover { border-color: var(--color-accent-violet); color: var(--color-accent-violet); }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ height: 56, flexShrink: 0, background: 'var(--color-bg-secondary)', borderBottom: '1.5px solid var(--color-border)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14 }}>
        <button onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}>
          <span style={{ fontSize: 18, color: 'var(--color-accent-violet)' }}>✦</span>
          <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
            ScorgIA <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>Studio</span>
          </span>
        </button>

        <div style={{ width: 1, height: 20, background: 'var(--color-border)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px' }}>Classe</span>
          <select value={selectedClasseId} onChange={e => setSelectedClasseId(e.target.value)} className="ctx-select" style={{ minWidth: 160 }}>
            <option value="">Choisir une classe…</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>

          {selectedClasse && (
            <>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', marginLeft: 6 }}>Matière</span>
              <input value={selectedMatiere} onChange={e => setSelectedMatiere(e.target.value)} placeholder="Matière…"
                className="ctx-select" style={{ width: 110 }} />
            </>
          )}
        </div>

        <div style={{ flex: 1 }} />

        <button className="hdr-btn" onClick={() => { setMessages([]); setPreviewType('') }}>
          🗑 Nouvelle conversation
        </button>
        <button className="hdr-btn" onClick={openHistory}>🕐 Historique</button>
        <button className="hdr-btn" onClick={() => router.push('/dashboard/profil?tab=ia')}
          style={{ borderColor: 'var(--color-border-accent)', color: 'var(--color-accent-violet)' }}>
          ⚙️ Profil IA
        </button>
      </div>

      {/* ── CORPS ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* ── CONVERSATION ──────────────────────────────────────────────── */}
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px', maxWidth: 860, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

            {/* État vide */}
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 18, textAlign: 'center' }}>
                <div style={{ fontSize: 52, color: 'var(--color-accent-violet)', lineHeight: 1 }}>✦</div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 6, letterSpacing: '-0.4px' }}>
                    Bonjour{profil?.prenom ? `, ${profil.prenom}` : ''} !
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Que voulez-vous créer aujourd'hui ?</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 520, marginTop: 6 }}>
                  {SUGGESTIONS.map(s => (
                    <button key={s.label} className="chip-btn"
                      onClick={() => { setInputValue(s.prompt); textareaRef.current?.focus() }}>
                      <span>{s.icon}</span>{s.label}
                    </button>
                  ))}
                </div>
                {selectedClasse && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    {selectedClasse.nom}{selectedMatiere ? ` · ${selectedMatiere}` : selectedClasse.matiere ? ` · ${selectedClasse.matiere}` : ''}
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            {messages.map(msg => {
              if (msg.role === 'system') {
                return (
                  <div key={msg.id} style={{ textAlign: 'center', margin: '14px 0' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--color-bg-secondary)', padding: '3px 14px', borderRadius: 99, border: '1px solid var(--color-border)' }}>
                      {msg.content}
                    </span>
                  </div>
                )
              }

              if (msg.role === 'user') {
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <div style={{ background: 'var(--color-accent-violet)', color: '#FFF', borderRadius: '18px 18px 4px 18px', padding: '10px 16px', maxWidth: '78%', fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>
                      {msg.content}
                    </div>
                  </div>
                )
              }

              // ── Message IA ────────────────────────────────────────────────
              const ti        = TYPE_INFO[msg.type || '']
              const isSt      = !!msg.isStreaming
              const isError   = msg.content.startsWith('⚠️') || msg.content === 'Génération interrompue.'
              const summary   = msg.content.substring(0, 420)
              const showMore  = !isSt && msg.content.length > 420
              const followUps = !isError && msg.type ? (FOLLOW_UP[msg.type] ?? FOLLOW_UP_DEFAULT) : []

              return (
                <div key={msg.id} style={{ display: 'flex', gap: 10, marginBottom: 28, alignItems: 'flex-start' }}>
                  {/* Avatar */}
                  <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #7F77DD, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#FFF', fontWeight: 700 }}>✦</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Badge type + indicateur streaming */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>ScorgIA</span>
                      {ti && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 700, background: `${ti.color}22`, color: ti.color }}>
                          {ti.icon} {ti.label}
                        </span>
                      )}
                      {isSt && (
                        <span style={{ fontSize: 11, color: 'var(--color-accent-violet)', display: 'flex', alignItems: 'center' }}>
                          ✦ génère <Dots />
                        </span>
                      )}
                    </div>

                    {/* Bulle de conversation */}
                    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '4px 18px 18px 18px', padding: '12px 16px', fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-primary)', maxWidth: '88%' }}>
                      {isSt ? (
                        msg.content ? (
                          <MarkdownRenderer content={msg.content} />
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Génération en cours…</span>
                        )
                      ) : msg.content ? (
                        <>
                          <MarkdownRenderer content={summary + (showMore ? '\n\n…' : '')} />
                          {showMore && (
                            <button
                              onClick={() => { setContenuModal(msg.content); setTypeModal(msg.type || ''); setShowPreviewModal(true) }}
                              style={{ display: 'block', marginTop: 6, fontSize: 11, color: 'var(--color-accent-violet)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 2 }}
                            >
                              → Voir le document complet
                            </button>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Génération en cours…</span>
                      )}
                    </div>

                    {/* File card — après streaming, si contenu valide */}
                    {!isSt && msg.content && !isError && ti && (
                      <div style={{ marginTop: 10, border: `1.5px solid ${ti.color}44`, borderRadius: 12, overflow: 'hidden', background: 'var(--color-bg-secondary)', maxWidth: 440 }}>
                        {/* Card header */}
                        <div style={{ padding: '10px 14px', background: `${ti.color}10`, display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${ti.color}22` }}>
                          <span style={{ fontSize: 22, flexShrink: 0 }}>{ti.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {msg.filename || 'Document généré'}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 1 }}>
                              {ti.label} · {msg.content.length.toLocaleString('fr-CA')} car.
                            </div>
                          </div>
                        </div>
                        {/* Boutons d'action */}
                        <div style={{ padding: '8px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="card-action-btn"
                            onClick={() => { setContenuModal(msg.content); setTypeModal(msg.type || ''); setShowPreviewModal(true) }}>
                            👁 Aperçu
                          </button>
                          <button className="card-action-btn"
                            onClick={() => openSaveModalForMsg(msg.content, msg.type || 'lecon_complete', msg.filename || 'Contenu généré')}>
                            💾 Sauvegarder
                          </button>
                          <button className="card-action-btn"
                            onClick={() => window.print()}>
                            📥 Exporter
                          </button>
                          {msg.type === 'quiz' && (
                            <button
                              style={{ padding: '5px 11px', borderRadius: 7, border: '1.5px solid #F472B6', background: '#F472B610', color: '#F472B6', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                              🎮 Quiz Live
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Chips de suite */}
                    {!isSt && msg.content && !isError && followUps.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                        {followUps.map(s => (
                          <button key={s.label} className="chip-sm"
                            onClick={() => { setInputValue(s.prompt); textareaRef.current?.focus() }}>
                            <span>{s.icon}</span>{s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* ── INPUT ZONE ──────────────────────────────────────────────────── */}
          <div style={{ padding: '12px 20px 16px', background: 'var(--color-bg-secondary)', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
            <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Demandez à ScorgIA de générer du contenu…\nEx: Génère une leçon sur les fractions pour ${selectedClasse?.niveau || 'votre classe'}`}
                rows={1}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '12px 52px 12px 16px', borderRadius: 16,
                  border: '1.5px solid var(--color-input-border)',
                  background: 'var(--color-input-bg)', color: 'var(--color-text-primary)',
                  fontSize: 14, lineHeight: 1.5, resize: 'none',
                  minHeight: 48, maxHeight: 200, outline: 'none', fontFamily: 'inherit',
                  transition: 'border-color .15s, box-shadow .15s', overflowY: 'auto',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-accent-violet)'; e.target.style.boxShadow = '0 0 0 3px var(--color-accent-violet-glow)' }}
                onBlur={e =>  { e.target.style.borderColor = 'var(--color-input-border)';  e.target.style.boxShadow = 'none' }}
              />
              <button
                onClick={estEnCours ? handleStop : handleSend}
                disabled={!estEnCours && !inputValue.trim()}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  width: 36, height: 36, borderRadius: '50%',
                  background: estEnCours ? '#F87171' : !inputValue.trim() ? 'var(--color-border)' : 'var(--color-accent-violet)',
                  border: 'none', cursor: estEnCours ? 'pointer' : !inputValue.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: '#FFF', transition: 'background .15s',
                }}
              >
                {estEnCours ? '⬛' : '▶'}
              </button>
            </div>

            <div style={{ maxWidth: 800, margin: '8px auto 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }} />
              <select value={selectedMode} onChange={e => setSelectedMode(e.target.value)}
                style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-input-bg)', color: 'var(--color-text-muted)', fontSize: 11, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                <option value="auto">✦ Auto-détection</option>
                <option value="lecon_complete">📚 Leçon complète</option>
                <option value="plan_lecon">📝 Plan de leçon</option>
                <option value="quiz">🎮 Quiz</option>
                <option value="evaluation">📊 Évaluation</option>
                <option value="email_parents">💌 Email parents</option>
                <option value="devoir">📓 Devoir</option>
                <option value="activite_groupe">🎯 Activité</option>
                <option value="note_automatique">⚡ Note rapide</option>
                <option value="rapport_eleve">👤 Rapport élève</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL APERÇU ────────────────────────────────────────────────────── */}
      <ApercuModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        titre={saveFileName || 'Document généré'}
        type_contenu={typeModal}
        contenu={contenuModal}
        classe_id={selectedClasseId || undefined}
        onModifier={() => setShowPreviewModal(false)}
        onSauvegarder={() => {
          setShowPreviewModal(false)
          openSaveModalForMsg(contenuModal, typeModal, saveFileName || 'Document généré')
        }}
      />

      {/* ── MODAL SAUVEGARDER ───────────────────────────────────────────────── */}
      {showSaveModal && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 499 }} onClick={() => setShowSaveModal(false)} />
          <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', background: 'var(--color-bg-card)', border: '1.5px solid var(--color-border)', borderRadius: 16, zIndex: 500, width: 'min(400px, calc(100vw - 32px))', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>💾 Où sauvegarder ?</span>
              <button onClick={() => setShowSaveModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 5 }}>Nom du fichier</label>
                <input value={saveFileName} onChange={e => setSaveFileName(e.target.value)} placeholder="Nom du contenu…"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 8 }}>Dossier de destination</label>
              {saveDossiers.filter(d => !d.parent_id).map(d => {
                const isSel = saveDossierSel === d.id
                const col   = d.couleur || '#7F77DD'
                const subs  = saveDossiers.filter(s => s.parent_id === d.id)
                return (
                  <div key={d.id}>
                    <div onClick={() => setSaveDossierSel(d.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, background: isSel ? `${col}18` : 'transparent', border: `1.5px solid ${isSel ? col : 'transparent'}`, transition: 'all .12s' }}
                      onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-hover)' }}
                      onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                      <span style={{ fontSize: 14 }}>📁</span>
                      <span style={{ fontSize: 13, color: isSel ? col : 'var(--color-text-primary)', fontWeight: isSel ? 600 : 400, flex: 1 }}>{d.nom}</span>
                      {isSel && <span style={{ color: col }}>✓</span>}
                    </div>
                    {subs.map(s => {
                      const ss = saveDossierSel === s.id
                      return (
                        <div key={s.id} onClick={() => setSaveDossierSel(s.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', paddingLeft: 32, borderRadius: 8, cursor: 'pointer', marginBottom: 2, background: ss ? `${col}12` : 'transparent', border: `1px solid ${ss ? col : 'transparent'}` }}
                          onMouseEnter={e => { if (!ss) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-hover)' }}
                          onMouseLeave={e => { if (!ss) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                          <span style={{ fontSize: 12 }}>📂</span>
                          <span style={{ fontSize: 12, color: ss ? col : 'var(--color-text-secondary)', fontWeight: ss ? 600 : 400, flex: 1 }}>{s.nom}</span>
                          {ss && <span style={{ color: col, fontSize: 12 }}>✓</span>}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-separator)', display: 'flex', gap: 8 }}>
              <button onClick={() => setShowSaveModal(false)}
                style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Annuler
              </button>
              <button onClick={handleSave} disabled={!saveDossierSel || isSaving}
                style={{ flex: 2, padding: 8, borderRadius: 8, background: !saveDossierSel ? 'var(--color-border)' : 'linear-gradient(135deg, #6B3FA0, #4F46E5)', border: 'none', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: !saveDossierSel ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {isSaving ? '⟳ Sauvegarde…' : '💾 Sauvegarder ici'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── MODAL HISTORIQUE ────────────────────────────────────────────────── */}
      {showHistory && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 499 }} onClick={() => setShowHistory(false)} />
          <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(380px, 100dvw)', background: 'var(--color-bg-card)', borderLeft: '1.5px solid var(--color-border)', zIndex: 500, display: 'flex', flexDirection: 'column', boxShadow: '-12px 0 40px rgba(0,0,0,.4)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>🕐 Historique</span>
              <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
              {historyItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>Aucune génération sauvegardée</div>
              ) : historyItems.map(h => {
                const ti = TYPE_INFO[h.type_contenu || '']
                return (
                  <div key={h.id}
                    style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)', marginBottom: 6, background: 'var(--color-bg-card)', transition: 'border-color .12s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-strong)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      {ti && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 700, background: `${ti.color}20`, color: ti.color }}>{ti.icon} {ti.label}</span>}
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{new Date(h.created_at).toLocaleDateString('fr-CA')}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 8 }}>
                      {h.sujet || 'Sans titre'}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => loadFromHistory(h)}
                        style={{ flex: 1, padding: '5px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                        ↩ Recharger
                      </button>
                      <button onClick={() => deleteHistoryItem(h.id)}
                        style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(248,113,113,.3)', background: 'transparent', color: '#F87171', fontSize: 11, cursor: 'pointer' }}>
                        🗑
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── TOAST ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', padding: '10px 16px 10px 20px', borderRadius: 10, zIndex: 999, background: toast.ok ? 'rgba(20,83,45,.95)' : 'rgba(127,29,29,.95)', color: '#FFF', fontSize: 13, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', gap: 12, maxWidth: 460 }}>
          <span style={{ fontWeight: 600 }}>{toast.msg}</span>
          {toast.action && (
            <button
              onClick={() => { toast.action!.onClick(); setToast(null) }}
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6, padding: '3px 10px', color: '#FFF', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, flexShrink: 0 }}>
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
    </>
  )
}

// ─── Export avec Suspense ─────────────────────────────────────────────────────

export default function StudioIAPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <StudioContent />
    </Suspense>
  )
}
