'use client'

import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import PedagogiqueExplorer from '@/components/preparer/explorer/PedagogiqueExplorer'
import KlassIAFilePicker, { type FichierKlassia } from '@/components/preparer/KlassIAFilePicker'
import { WorkspaceHeader } from '@/components/preparer/workspace/WorkspaceHeader'
import { WorkspaceLayout } from '@/components/preparer/workspace/WorkspaceLayout'
import { AIAssistantPanel, type IaTimestamp } from '@/components/preparer/assistant/AIAssistantPanel'
import { ActionBar } from '@/components/preparer/toolbar/ActionBar'
import { PreparationCanvas } from '@/components/preparer/canvas/PreparationCanvas'
import { InspectorPanel } from '@/components/preparer/inspector/InspectorPanel'
import {
  NoClassesState,
  ClassPickerState,
  LoadingConversationState,
  WelcomeState,
} from '@/components/preparer/workspace/WorkspaceStates'
import LoadingScreen from '@/components/LoadingScreen'
import VoiceWaveform from '@/components/ui/VoiceWaveform'
import MarkdownMessage from '@/components/ui/MarkdownMessage'
import PlanLeconView, { buildPlanLeconPrintHtml } from '@/components/PlanLeconView'
import { nourrirIA } from '@/lib/utils/nourrir-ia'
import { ScorgiaLogo } from '@/components/branding/scorgia-logo'
import { contentToHtml } from '@/lib/utils/parser-svg-schema'
import { Z } from '@/lib/constants/z-index'
import type { ConversationIA, ConversationIAResume } from '@/lib/types/database'
import { DOSSIER_PAR_TYPE_CONTENU } from '@/lib/constants/mapping-dossiers'
// Types centralisés — définis dans workspace.ts, importés ici pour éviter la duplication
import type {
  ChatMessage,
  ActionSuggestion,
  PieceJointeMsg,
  FichierKlassiaRef,
  FichierKlassiaIgnore,
} from '@/lib/types/workspace'
// Constantes centralisées — définis dans preparer.ts
import { ACTION_TAG, TYPE_FICHIER } from '@/lib/constants/preparer'
import { buildPedagogyContextWithPlan } from '@/lib/ia/teacher-reasoning-engine'
import { buildMemoryContext, extractMemoriesFromGeneration } from '@/lib/ia/teacher-memory-engine'
import type { MemoryEntry } from '@/lib/ia/teacher-memory-engine'

// ─── Constants & helpers ──────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).substring(2, 10) }

function getMissionBandeauLabel(action: string | null, sujet: string | null, isFr: boolean): string {
  if (!action) return ''
  if (isFr) {
    switch (action) {
      case 'create_annual_plan':   return 'Créer le programme annuel'
      case 'prepare_first_lesson': return sujet ? `Préparer : ${sujet}` : 'Préparer la première leçon'
      case 'prepare_next_lesson':  return sujet ? `Préparer : ${sujet}` : 'Préparer la prochaine leçon'
      default: return action
    }
  }
  switch (action) {
    case 'create_annual_plan':   return 'Create annual plan'
    case 'prepare_first_lesson': return sujet ? `Prepare: ${sujet}` : 'Prepare first lesson'
    case 'prepare_next_lesson':  return sujet ? `Prepare: ${sujet}` : 'Prepare next lesson'
    default: return action
  }
}

function nettoyerNomFichier(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ACTION_TAG et TYPE_FICHIER importés depuis @/lib/constants/preparer

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
  const [matiereActive, setMatiereActive] = useState<string>('')
  const [loading,     setLoading]     = useState(true)
  const [notifCount,  setNotifCount]  = useState(0)

  // Mission bandeau (depuis ?mission= + ?sujet= + ?mission_key= URL params)
  const missionParam    = searchParams?.get('mission')     ?? null
  const sujetParam      = searchParams?.get('sujet')       ?? null
  const missionKeyParam = searchParams?.get('mission_key')
    ? decodeURIComponent(searchParams.get('mission_key')!)
    : null
  const [showMissionBandeau,   setShowMissionBandeau]   = useState(() => !!searchParams?.get('mission'))
  const [missionCompleting,    setMissionCompleting]    = useState(false)
  const [missionCompleteToast, setMissionCompleteToast] = useState<string | null>(null)

  // Chat
  const [messages,    setMessages]    = useState<ChatMessage[]>([])
  const [inputValue,  setInputValue]  = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showVoice,   setShowVoice]   = useState(false)

  // Actions / Sauvegarde
  const [pendingSave,        setPendingSave]        = useState<{ action: ActionSuggestion; msgId: string; autosave_fichier_id?: string | null; indexation_ok?: boolean | null } | null>(null)
  const [saveModal,          setSaveModal]          = useState(false)
  const [dossiers,           setDossiers]           = useState<any[]>([])
  const [selectedDossier,    setSelectedDossier]    = useState<string>('')
  const [saveLoading,        setSaveLoading]        = useState(false)
  const [toast,              setToast]              = useState<{ msg: string; ok: boolean; persist?: boolean } | null>(null)
  // Persistance conversations en base — ref pour éviter les race conditions
  const conversationIdRef = useRef<string | null>(null)
  const [conversationId,          setConversationId]          = useState<string | null>(null)
  const [conversationRefreshKey,  setConversationRefreshKey]  = useState(0)
  const [loadingConversation,     setLoadingConversation]     = useState(false)

  // Fichiers joints (local) + sélecteur KlassIA
  const [fichiersJoints,   setFichiersJoints]   = useState<File[]>([])
  const [fichiersKlassia,  setFichiersKlassia]  = useState<FichierKlassia[]>([])
  const [showAttachMenu,   setShowAttachMenu]    = useState(false)
  const [showKlassIAPicker, setShowKlassIAPicker] = useState(false)
  const fileInputRef   = useRef<HTMLInputElement>(null)
  const attachMenuRef  = useRef<HTMLDivElement>(null)

  const textareaRef        = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef     = useRef<HTMLDivElement>(null)
  const messagesScrollRef  = useRef<HTMLDivElement>(null)
  const abortRef           = useRef<AbortController | null>(null)
  const [showScrollBtn,    setShowScrollBtn]    = useState(false)
  const [aiPanelOpen,       setAiPanelOpen]       = useState(() =>
    typeof window === 'undefined' ? false : localStorage.getItem('ws_copilot_open') === 'true'
  )
  const [inspectorOpen,     setInspectorOpen]     = useState(false)
  const [explorerOpen,      setExplorerOpen]      = useState(() =>
    typeof window === 'undefined' ? true : localStorage.getItem('ws_focus_mode') !== 'true'
  )
  const [focusMode,         setFocusMode]         = useState(() =>
    typeof window === 'undefined' ? false : localStorage.getItem('ws_focus_mode') === 'true'
  )

  // SC-02H — Teacher Memory
  const [teacherMemory, setTeacherMemory] = useState<MemoryEntry[]>([])

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

      const matiereParam = searchParams?.get('matiere') || ''
      if (matiereParam) {
        const foundClasse = list.find(c => c.id === initClasse)
        const validMatieres: string[] = Array.isArray(foundClasse?.matieres) && (foundClasse.matieres as string[]).length > 0
          ? foundClasse.matieres as string[]
          : foundClasse?.matiere ? [foundClasse.matiere] : []
        if (validMatieres.includes(matiereParam)) setMatiereActive(matiereParam)
      }

      // Charger une conversation existante depuis URL param ?conversation=UUID
      const convId = searchParams?.get('conversation')
      if (convId) {
        const { data: conv } = await supabase.from('conversations_ia').select('*').eq('id', convId).single()
        if (conv) {
          conversationIdRef.current = conv.id
          setConversationId(conv.id)
          if (conv.classe_id) setClasseId(conv.classe_id)
          const msgs: ChatMessage[] = ((conv.messages as any[]) || []).map((m: any) => ({
            id:          uid(),
            role:        (m.role === 'assistant' ? 'ia' : 'user') as 'ia' | 'user',
            content:     m.content || '',
            isStreaming: false,
          }))
          setMessages(msgs)
        }
      }

      const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('enseignant_id', p.id).eq('est_lue', false)
      setNotifCount(count || 0)

      // SC-02H — Charger la mémoire pédagogique (fire-and-forget, ne bloque pas)
      fetch('/api/ia/memory')
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.memories) setTeacherMemory(d.memories) })
        .catch(() => {})

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

  // ── Scroll to bottom — seulement si l'utilisateur est déjà en bas ────────
  useEffect(() => {
    const el = messagesScrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distFromBottom < 120) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // ── Détecter si l'utilisateur a scrollé vers le haut ─────────────────────
  useEffect(() => {
    const el = messagesScrollRef.current
    if (!el) return
    const handler = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      setShowScrollBtn(isStreaming && distFromBottom > 200)
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [isStreaming])

  // ── Auto-resize textarea ──────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'
  }, [inputValue])

  // ── Auto-dismiss toast (les erreurs persist:true restent jusqu'au clic) ──
  useEffect(() => {
    if (!toast || toast.persist) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // Fermer le menu pièce jointe si streaming démarre ou si la classe change
  useEffect(() => { setShowAttachMenu(false) }, [isStreaming, classeId])

  // Fermer le picker KlassIA si la classe change
  useEffect(() => { setShowKlassIAPicker(false) }, [classeId])

  // Fermer le menu pièce jointe au clic extérieur et avec Escape
  useEffect(() => {
    if (!showAttachMenu) return
    const onOutside = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) setShowAttachMenu(false)
    }
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowAttachMenu(false) }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('keydown',   onEscape)
    return () => { document.removeEventListener('mousedown', onOutside); document.removeEventListener('keydown', onEscape) }
  }, [showAttachMenu])

  const isFr    = (profil as any)?.langue_interface !== 'en'
  const missionBandeauLabel = getMissionBandeauLabel(missionParam, sujetParam, isFr)

  const handleCompleteMission = async () => {
    if (!missionKeyParam || missionCompleting) return
    setMissionCompleting(true)
    try {
      const { updateMissionAction } = await import('@/lib/mission-engine/client')
      const result = await updateMissionAction(missionKeyParam, 'complete')
      if (result.ok) {
        setShowMissionBandeau(false)
        setMissionCompleteToast(isFr ? '✓ Mission marquée comme terminée.' : '✓ Mission marked complete.')
        setTimeout(() => setMissionCompleteToast(null), 3500)
      } else {
        setMissionCompleteToast(
          result.status === 409
            ? (isFr ? 'Cette mission a déjà changé d\'état.' : 'This mission already changed state.')
            : (isFr ? 'Impossible de terminer la mission.' : 'Unable to complete mission.'),
        )
        setTimeout(() => setMissionCompleteToast(null), 4000)
      }
    } catch {
      setMissionCompleteToast(isFr ? 'Erreur réseau.' : 'Network error.')
      setTimeout(() => setMissionCompleteToast(null), 4000)
    } finally {
      setMissionCompleting(false)
    }
  }

  const prenom  = profil?.prenom ?? (profil as any)?.first_name ?? ''
  const initiales = prenom ? prenom[0].toUpperCase() : (profil?.email?.[0] ?? 'E').toUpperCase()
  const classe  = classes.find(c => c.id === classeId)
  const matiereEffective = (() => {
    const validMats: string[] = Array.isArray(classe?.matieres) && (classe.matieres as string[]).length > 0
      ? classe.matieres as string[]
      : classe?.matiere ? [classe.matiere] : []
    return validMats.includes(matiereActive) ? matiereActive : (classe?.matiere || '')
  })()

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string, ok: boolean) => setToast({ msg, ok }), [])

  // ── Persistance conversations IA en base ──────────────────────────────────
  const createOrUpdateConversation = useCallback(async (
    msgs: ChatMessage[],
    typeContenu?: string,
    titre?: string,
  ) => {
    if (!profil?.id) return
    const dbMsgs = msgs.map(m => ({
      role:      m.role === 'ia' ? 'assistant' : 'user',
      content:   m.content,
      timestamp: new Date().toISOString(),
      ...(m.piecesJointes?.length        ? { pieces_jointes:      m.piecesJointes }        : {}),
      ...(m.fichiersKlassiaRefs?.length  ? { fichiers_klassia_refs: m.fichiersKlassiaRefs.map(r => ({ fichier_id: r.fichier_id, nom: r.nom, source: 'klassia' })) } : {}),
    }))
    const currentId = conversationIdRef.current
    if (!currentId) {
      const titreInitial = titre || msgs.find(m => m.role === 'user')?.content.substring(0, 80) || 'Conversation'
      const { data } = await supabase.from('conversations_ia').insert({
        enseignant_id: profil.id,
        classe_id:     classeId || null,
        type_contenu:  typeContenu || 'autre',
        titre:         titreInitial,
        messages:      dbMsgs,
        contexte_page: 'preparer',
      }).select('id').single()
      if (data?.id) {
        conversationIdRef.current = data.id
        setConversationId(data.id)
      }
    } else {
      await supabase.from('conversations_ia').update({
        messages: dbMsgs,
        ...(typeContenu && typeContenu !== 'autre' ? { type_contenu: typeContenu } : {}),
        ...(titre ? { titre } : {}),
      }).eq('id', currentId)
    }
    setConversationRefreshKey(k => k + 1)
  }, [profil?.id, classeId])

  // ── Charger une conversation existante (depuis le menu ou URL param) ──────
  // HistoriquePreparer ne sélectionne pas `messages` (trop lourd pour 200 items).
  // On re-fetch la conversation complète au clic pour obtenir les messages.
  const handleLoadConversation = useCallback(async (conv: ConversationIAResume) => {
    setLoadingConversation(true)
    setMessages([])
    setPendingSave(null)
    setToast(null)

    const { data: full, error } = await supabase
      .from('conversations_ia')
      .select('*')
      .eq('id', conv.id)
      .single()

    if (error || !full) {
      console.error('[handleLoadConversation] fetch failed:', error?.message)
      setToast({
        msg:     isFr ? 'Impossible de charger cette conversation.' : 'Could not load this conversation.',
        ok:      false,
        persist: true,
      })
      setLoadingConversation(false)
      return
    }

    conversationIdRef.current = full.id
    setConversationId(full.id)
    if (full.classe_id) setClasseId(full.classe_id)
    const msgs: ChatMessage[] = ((full.messages as any[]) || []).map((m: any) => ({
      id:            uid(),
      role:          (m.role === 'assistant' ? 'ia' : 'user') as 'ia' | 'user',
      content:       m.content || '',
      isStreaming:   false,
      piecesJointes: m.pieces_jointes?.length ? (m.pieces_jointes as PieceJointeMsg[]) : undefined,
    }))

    // Reconstruire action_sug pour le dernier message IA si c'était un document
    if (full.type_contenu && full.type_contenu !== 'autre') {
      const lastIaIdx = msgs.reduceRight((acc: number, m, i) => acc === -1 && m.role === 'ia' ? i : acc, -1)
      if (lastIaIdx >= 0) {
        const c = msgs[lastIaIdx].content
        const looksLikeDoc = (c.match(/^\|.+\|.*$/gm) || []).length >= 2 || c.length > 300
        if (looksLikeDoc) {
          msgs[lastIaIdx] = {
            ...msgs[lastIaIdx],
            type_contenu: full.type_contenu,
            action_sug: {
              type:            'document',
              action:          'sauvegarder',
              type_contenu:    full.type_contenu,
              titre:           (full as any).titre || 'Document',
              dossier_suggere: DOSSIER_PAR_TYPE_CONTENU[full.type_contenu] || 'Documents',
              contenu:         c,
            },
          }
        }
      }
    }

    setMessages(msgs)
    setLoadingConversation(false)
  }, [isFr])

  // ── Gestion des fichiers joints ───────────────────────────────────────────
  const handleFileAttach = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const MAX = 5 * 1024 * 1024 // 5 Mo par fichier
    for (const f of files) {
      if (f.size > MAX) {
        setToast({ msg: isFr ? `"${f.name}" dépasse la limite de 5 Mo.` : `"${f.name}" exceeds the 5 MB limit.`, ok: false })
        e.target.value = ''
        return
      }
    }
    setFichiersJoints(prev => {
      const combined = [...prev, ...files]
      if (combined.length > 3) {
        setToast({ msg: isFr ? 'Maximum 3 fichiers par message.' : 'Maximum 3 files per message.', ok: false })
      }
      return combined.slice(0, 3)
    })
    e.target.value = ''
  }, [isFr])

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
    const nomCible = DOSSIER_PAR_TYPE_CONTENU[suggestion?.type_contenu ?? ''] ?? ''
    const found = ds.find((d: any) => d.nom === nomCible)
    setSelectedDossier(found?.id || ds.find((d: any) => d.nom === 'Plans de leçons')?.id || ds[0]?.id || '')
  }, [classeId])

  // ── Ouvrir le modal de sauvegarde ─────────────────────────────────────────
  const handleSaveOpen = useCallback(async (action: ActionSuggestion, msgId: string, autosave_fichier_id?: string | null, indexation_ok?: boolean | null) => {
    setPendingSave({ action, msgId, autosave_fichier_id: autosave_fichier_id ?? null, indexation_ok: indexation_ok ?? null })
    await loadDossiers(action)
    setSaveModal(true)
  }, [loadDossiers])

  // ── Confirmer la sauvegarde ───────────────────────────────────────────────
  const handleSaveConfirm = useCallback(async () => {
    if (!selectedDossier || !pendingSave?.action || !profil?.id) return
    const { action: actionSug, msgId, autosave_fichier_id, indexation_ok: savedIndexationOk } = pendingSave
    setSaveLoading(true)
    let fichierId: string | null = autosave_fichier_id ?? null
    // Pour le chemin UPDATE (autosave existant), on hérite du statut réel de l'auto-save.
    // Pour le chemin INSERT (fallback), indexationOk sera mis à jour par l'upsert.
    let indexationOk = autosave_fichier_id ? (savedIndexationOk ?? true) : true
    try {
      if (autosave_fichier_id) {
        // Le fichier existe déjà en brouillon auto-sauvegardé : on le déplace
        const { error } = await supabase.from('fichiers_dossier')
          .update({ dossier_id: selectedDossier, classe_id: classeId || null, statut: 'brouillon' })
          .eq('id', autosave_fichier_id)
        if (error) throw error
      } else {
        // Fallback si l'auto-sauvegarde n'a pas encore abouti
        const { data: fd, error } = await supabase.from('fichiers_dossier').insert({
          dossier_id:    selectedDossier,
          classe_id:     classeId || null,
          enseignant_id: profil.id,
          nom:           actionSug.titre,
          type_fichier:  TYPE_FICHIER[actionSug.type_contenu] || 'autre',
          contenu_html:  actionSug.contenu,
          statut:        'brouillon',
        }).select('id').single()
        if (error) throw error
        fichierId = fd?.id || null
        if (fd?.id) {
          const { error: errIdx } = await supabase
            .from('fichiers_indexation')
            .upsert({
              fichier_id:         fd.id,
              enseignant_id:      profil.id,
              mime_type:          'text/markdown',
              statut:             'indexe',
              texte_extrait:      actionSug.contenu || '',
              version_extracteur: 'html-direct-1.0',
              processed_at:       new Date().toISOString(),
            }, { onConflict: 'fichier_id' })
          if (errIdx) {
            console.error('[KLASSIA][DOCUMENTS][INDEXATION_GENERATED]', errIdx.message)
            indexationOk = false
          }
        }
      }

      const dossierNom = dossiers.find(d => d.id === selectedDossier)?.nom || ''

      nourrirIA({
        enseignant_id: profil.id,
        classe_id:     classeId || undefined,
        source:        'generation_ia',
        titre:         actionSug.titre,
        type:          actionSug.type_contenu,
        contenu_texte: actionSug.contenu?.substring(0, 1200),
      }).catch(() => {})

      // Lier la conversation à ce fichier (titre définitif)
      if (conversationIdRef.current && fichierId) {
        supabase.from('conversations_ia').update({
          fichier_dossier_id: fichierId,
          titre:              actionSug.titre,
        }).eq('id', conversationIdRef.current)
          .then(() => setConversationRefreshKey(k => k + 1))
      }

      setSaveModal(false)
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_saved: true } : m))
      if (indexationOk) {
        showToast(`✓ Sauvegardé dans ${dossierNom}`, true)
      } else {
        showToast('Document sauvegardé, mais son contexte IA sera disponible plus tard.', false)
      }
    } catch (err: any) {
      console.error('[preparer] erreur sauvegarde:', err)
      setToast({ msg: `Erreur : ${err?.message || 'Sauvegarde impossible — réessayez'}`, ok: false, persist: true })
    } finally {
      setSaveLoading(false)
    }
  }, [selectedDossier, pendingSave, profil?.id, classeId, dossiers, showToast])

  // ── Export Word ───────────────────────────────────────────────────────────
  const handleExportWord = useCallback(async (action: ActionSuggestion, contenuJson?: Record<string, unknown> | null) => {
    if (!profil) return
    try {
      const res = await fetch('/api/export/docx', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contenu:        action.contenu,
          contenu_json:   contenuJson ?? undefined,
          type_contenu:   action.type_contenu,
          titre:          action.titre,
          langue:         profil.langue ?? 'fr',
          enseignant_nom: `${profil.prenom ?? ''} ${profil.nom ?? ''}`.trim(),
          classe:         classe?.nom,
          matiere:        matiereEffective,
          niveau:         classe?.niveau,
        }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${action.titre ?? 'klassia'}.docx`
      a.click()
      URL.revokeObjectURL(url)
      showToast('✓ Document Word téléchargé', true)
    } catch {
      showToast("Erreur lors de l'export Word", false)
    }
  }, [profil, classe, showToast])

  // ── Export PowerPoint ────────────────────────────────────────────────────
  const handleExportPptx = useCallback(async (action: ActionSuggestion, contenuJson?: Record<string, unknown> | null) => {
    if (!profil || !contenuJson) return
    try {
      const res = await fetch('/api/export/pptx', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contenu_json:   contenuJson,
          titre:          action.titre,
          enseignant_nom: `${profil.prenom ?? ''} ${profil.nom ?? ''}`.trim(),
          classe:         classe?.nom,
          matiere:        matiereEffective,
          niveau:         classe?.niveau,
        }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${action.titre ?? 'klassia'}.pptx`
      a.click()
      URL.revokeObjectURL(url)
      showToast('✓ Présentation téléchargée', true)
    } catch {
      showToast("Erreur lors de l'export PowerPoint", false)
    }
  }, [profil, classe, showToast])

  // ── Imprimer ──────────────────────────────────────────────────────────────
  const handlePrint = useCallback((action: ActionSuggestion) => {
    const fenetre = window.open('', '_blank')
    if (!fenetre) return

    const estPlan = ['plan_lecon', 'plan_de_lecon', 'fiche_lecon', 'lecon_complete'].includes(action.type_contenu)

    if (estPlan) {
      fenetre.document.write(buildPlanLeconPrintHtml(action.contenu, action.titre))
    } else {
      const date = new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })
      fenetre.document.write(`<!DOCTYPE html><html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>ScorgIA — ${action.titre}</title>
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
      <div style="font-size:18pt;font-weight:800;color:#1e1b4b;">${action.titre}</div>
      <div style="font-size:10pt;color:#9ca3af;margin-top:4pt;">${date}</div>
    </div>
    <div class="logo">✦ ScorgIA</div>
  </div>
  <div id="content" style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;">${contentToHtml(action.contenu)}</div>
  <div class="footer">Généré par ScorgIA — scorgia.app</div>
</body></html>`)
    }
    fenetre.document.close()
    setTimeout(() => fenetre.print(), 350)
  }, [])

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async (overrideText?: string) => {
    const text     = (overrideText ?? inputValue).trim()
    const hasFiles = fichiersJoints.length > 0
    if ((!text && !hasFiles) || isStreaming || !profil?.id) return

    // Capturer et vider les fichiers avant tout traitement asynchrone
    const filesSnapshot         = [...fichiersJoints]
    const fichiersKlassiaSnap   = [...fichiersKlassia]
    setInputValue('')
    setShowVoice(false)
    setToast(null)
    setFichiersJoints([])
    setFichiersKlassia([])

    // ── Traiter les fichiers : base64 + upload Storage ──────────────────────
    const fichiersAPI:   Array<{nom: string, type_mime: string, contenu_base64: string}> = []
    const piecesJointes: PieceJointeMsg[] = []

    for (const file of filesSnapshot) {
      const nom = nettoyerNomFichier(file.name) || file.name
      try {
        const base64 = await fileToBase64(file)
        fichiersAPI.push({ nom, type_mime: file.type, contenu_base64: base64 })

        const path = `${profil.id}/chat/${uid()}_${nom}`
        const { error: uploadErr } = await supabase.storage
          .from('ressources')
          .upload(path, file, { upsert: false })

        let urlStorage: string | undefined
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('ressources').getPublicUrl(path)
          urlStorage = urlData.publicUrl
          nourrirIA({
            enseignant_id: profil.id,
            classe_id:     classeId || undefined,
            source:        'fichier_joint_chat',
            titre:         file.name,
            type:          file.type.startsWith('image/') ? 'image' : 'document',
            url_storage:   urlStorage,
          }).catch(() => {})
        }

        piecesJointes.push({ nom: file.name, type_mime: file.type, url_storage: urlStorage })
      } catch {
        piecesJointes.push({ nom: file.name, type_mime: file.type })
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    const userMsgId = uid()
    const iaId      = uid()
    const klassiaRefs: FichierKlassiaRef[] = fichiersKlassiaSnap.map(f => ({ fichier_id: f.id, nom: f.nom }))
    setMessages(prev => [...prev,
      {
        id:                   userMsgId,
        role:                 'user',
        content:              text,
        piecesJointes:        piecesJointes.length ? piecesJointes : undefined,
        fichiersKlassiaRefs:  klassiaRefs.length   ? klassiaRefs   : undefined,
      },
      { id: iaId, role: 'ia', content: '', isStreaming: true },
    ])
    setIsStreaming(true)
    abortRef.current = new AbortController()

    try {
      // ── SC-02G : Teacher Reasoning Engine ────────────────────────────────
      // ── SC-02H : Teacher Memory Engine ───────────────────────────────────
      const { text: pedagogyCtx, methode: lastMethode, duree: lastDuree } =
        buildPedagogyContextWithPlan(text, {
          classe_nom: classe?.nom,
          matiere:    matiereEffective,
          niveau:     classe?.niveau,
        }, isFr)
      const memoryCtx    = buildMemoryContext(teacherMemory, { classeId: classeId || null, matiere: matiereEffective || null })
      const enrichedMessage = [memoryCtx, pedagogyCtx, text].filter(Boolean).join('\n')
      // ─────────────────────────────────────────────────────────────────────

      const res = await fetch('/api/ia/assistant', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:   enrichedMessage,
          contexte:  { page_courante: 'preparer', classe_id: classeId || undefined, classe_nom: classe?.nom, matiere: matiereEffective, niveau: classe?.niveau },
          historique: messages.slice(-8).map(m => ({ role: m.role === 'ia' ? 'assistant' : 'user', content: m.content })),
          ...(fichiersAPI.length     ? { fichiers_joints:   fichiersAPI }                                                : {}),
          ...(klassiaRefs.length     ? { fichiers_klassia:  klassiaRefs.map(r => ({ fichier_id: r.fichier_id, source: 'klassia' })) } : {}),
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error(`Erreur ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''
      const CTX_TAG = '__KLASSIA_CTX__'
      let   ctxParsed = false
      let   ctxResult: { fichiers_utilises?: any[]; fichiers_ignores?: any[] } | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Stripping du header CONTEXT (première ligne du flux, uniquement quand des fichiers KlassIA ont été envoyés)
        if (!ctxParsed) {
          if (buffer.startsWith(CTX_TAG)) {
            const nlIdx = buffer.indexOf('\n')
            if (nlIdx >= 0) {
              try { ctxResult = JSON.parse(buffer.substring(CTX_TAG.length, nlIdx)) } catch {}
              buffer = buffer.substring(nlIdx + 1)
              ctxParsed = true
            } else {
              // Header pas encore complet — ne pas afficher
              continue
            }
          } else {
            ctxParsed = true // pas de header CTX dans ce flux
          }
        }

        // Masquer le payload __ACTION__ du rendu chat (continuation gérée côté serveur)
        const actionIdx = buffer.indexOf(ACTION_TAG)
        const display   = actionIdx >= 0 ? buffer.substring(0, actionIdx) : buffer
        setMessages(prev => prev.map(m => m.id === iaId ? { ...m, content: display } : m))
      }

      // Extraire le payload __ACTION__ après la fin du stream
      const actionIdx    = buffer.indexOf(ACTION_TAG)
      const finalDisplay = actionIdx >= 0 ? buffer.substring(0, actionIdx) : buffer
      const actionRaw    = actionIdx >= 0 ? buffer.substring(actionIdx + ACTION_TAG.length) : ''

      setMessages(prev => prev.map(m => m.id === iaId ? {
        ...m,
        content:                  finalDisplay,
        isStreaming:              false,
        fichiersKlassiaIgnores:   ctxResult?.fichiers_ignores?.map((f: any) => ({
          fichier_id: f.fichier_id,
          raison:     f.raison,
          nom:        klassiaRefs.find(r => r.fichier_id === f.fichier_id)?.nom || '',
        })) || [],
        fichiersKlassiaUtilises:  ctxResult?.fichiers_utilises?.map((f: any) => ({
          fichier_id: f.fichier_id,
          nom:        f.nom || klassiaRefs.find(r => r.fichier_id === f.fichier_id)?.nom || '',
        })) || [],
      } : m))

      let parsedAction: ActionSuggestion | undefined

      if (actionRaw) {
        try {
          parsedAction = JSON.parse(actionRaw) as ActionSuggestion
          // Stocker action_sug + type_contenu sur le message directement (pas d'état global)
          setMessages(prev => prev.map(m => m.id === iaId
            ? { ...m, action_sug: parsedAction, type_contenu: parsedAction!.type_contenu }
            : m
          ))

          // Auto-sauvegarde — filet de sécurité non-bloquant
          if (profil?.id) {
            fetch('/api/ia/action', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action:       'sauvegarder',
                classe_id:    classeId || undefined,
                type_contenu: parsedAction.type_contenu,
                titre:        parsedAction.titre,
                contenu:      parsedAction.contenu,
              }),
            })
              .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
              .then(data => {
                if (data?.fichier_id) {
                  setMessages(prev => prev.map(m => m.id === iaId
                    ? {
                        ...m,
                        autosave_fichier_id: data.fichier_id,
                        indexation_ok:       data.indexation_ok ?? true,
                        contenu_json:        data.contenu_json ?? null,
                      }
                    : m
                  ))
                }
                if (data?.indexation_ok === false) {
                  console.error('[KLASSIA][DOCUMENTS][INDEXATION_GENERATED] auto-save: indexation échouée pour', data?.fichier_id)
                  showToast('Document sauvegardé, mais son contexte IA sera disponible plus tard.', false)
                }
              })
              .catch(err => console.error('[auto-save] échec silencieux résolu:', err?.error ?? err))
          }
        } catch {}
      }

      // RÈGLE ABSOLUE — Persister la conversation en base après chaque échange
      const allMsgs: ChatMessage[] = [
        ...messages,
        { id: userMsgId, role: 'user' as const, content: text, piecesJointes: piecesJointes.length ? piecesJointes : undefined },
        { id: iaId,      role: 'ia'   as const, content: finalDisplay, isStreaming: false },
      ]
      createOrUpdateConversation(allMsgs, parsedAction?.type_contenu, parsedAction?.titre)
        .catch(() => {})

      // SC-02H — Extraire la mémoire et l'enrichir (fire-and-forget)
      if (parsedAction?.type_contenu) {
        const deltas = extractMemoriesFromGeneration(
          parsedAction.type_contenu,
          lastMethode,
          lastDuree,
          classeId || null,
          matiereEffective || null,
          classe?.niveau || null,
        )
        if (deltas.length > 0) {
          fetch('/api/ia/memory', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ deltas }),
          })
            .then(r => r.ok ? r.json() : null)
            .then(() => {
              // Recharger silencieusement la mémoire mise à jour
              fetch('/api/ia/memory')
                .then(r => r.ok ? r.json() : null)
                .then(d => { if (d?.memories) setTeacherMemory(d.memories) })
                .catch(() => {})
            })
            .catch(() => {})
        }
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
  }, [inputValue, fichiersJoints, fichiersKlassia, isStreaming, profil?.id, classeId, classe, messages, isFr, createOrUpdateConversation])

  const handleStop   = () => { abortRef.current?.abort() }
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  const handleToggleFocus = () => {
    setFocusMode(prev => {
      const next = !prev
      localStorage.setItem('ws_focus_mode', String(next))
      if (next) {
        setExplorerOpen(false)
        setAiPanelOpen(false)
      } else {
        setExplorerOpen(true)
      }
      return next
    })
  }

  const handleToggleAssistant = useCallback(() => {
    setAiPanelOpen(prev => {
      const next = !prev
      localStorage.setItem('ws_copilot_open', String(next))
      return next
    })
  }, [])

  // ── Dérivés export global (dernière réponse IA exportable) ───────────────
  const lastExportableMsg = useMemo(
    () => [...messages].reverse().find(m => m.role === 'ia' && m.action_sug && !m.isStreaming),
    [messages],
  )
  const canExport     = !!lastExportableMsg
  const canExportPptx = !!(
    lastExportableMsg?.contenu_json &&
    ['plan_lecon', 'fiche_lecon', 'lecon_complete', 'lecon_developpee', 'activite'].includes(
      lastExportableMsg?.action_sug?.type_contenu ?? '',
    )
  )
  // ── M1 — Context Bar ─────────────────────────────────────────────────────
  const contextBar = useMemo(() => {
    if (!classeId || !classe) return null
    return [classe.nom, classe.niveau, matiereEffective].filter(Boolean).join(' · ')
  }, [classeId, classe, matiereEffective])

  // ── M8 — docType pour actions contextuelles ───────────────────────────────
  const docType = lastExportableMsg?.action_sug?.type_contenu ?? null

  // ── M3 — Suggestion Strip ─────────────────────────────────────────────────
  const [ignoredSuggestionDocType, setIgnoredSuggestionDocType] = useState<string | null>(null)
  const rawSuggestion = useMemo(() => {
    if (!classeId || isStreaming || !docType) return null
    if (docType === 'plan_lecon') return isFr
      ? { text: 'Ce plan est prêt. Développer en leçon complète ?', action: 'Développe ce plan en une leçon complète avec activités et exemples concrets.', reason: 'Votre plan contient des objectifs structurés — une leçon complète peut être générée directement.' }
      : { text: 'This plan is ready. Expand into a full lesson?', action: 'Expand this plan into a full lesson with activities and concrete examples.', reason: 'Your plan has structured objectives — a full lesson can be generated directly.' }
    if (['fiche_lecon', 'lecon_complete', 'lecon_developpee'].includes(docType)) return isFr
      ? { text: 'Votre leçon est prête. Créer un quiz formatif ?', action: 'Crée un quiz formatif de 5 questions basé sur cette leçon.', reason: 'Une leçon avec des objectifs clairs se prête naturellement à un quiz formatif.' }
      : { text: 'Your lesson is ready. Create a formative quiz?', action: 'Create a 5-question formative quiz based on this lesson.', reason: 'A lesson with clear objectives naturally leads to a formative quiz.' }
    return null
  }, [classeId, isStreaming, docType, isFr])
  const activeSuggestion = ignoredSuggestionDocType === docType ? null : rawSuggestion

  const handleGlobalExportWord = useCallback(() => {
    if (lastExportableMsg?.action_sug) handleExportWord(lastExportableMsg.action_sug, lastExportableMsg.contenu_json)
  }, [lastExportableMsg, handleExportWord])
  const handleGlobalExportPptx = useCallback(() => {
    if (lastExportableMsg?.action_sug && lastExportableMsg.contenu_json)
      handleExportPptx(lastExportableMsg.action_sug, lastExportableMsg.contenu_json)
  }, [lastExportableMsg, handleExportPptx])

  // ── DESIGN-14: iaTimestamps + lastSaveTime (display-only) ────────────────
  const [iaTimestamps, setIaTimestamps] = useState<IaTimestamp[]>([])
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)
  const seenIaMsgIds   = useRef(new Set<string>())
  const prevSavedRef   = useRef(false)

  useEffect(() => {
    for (const msg of messages) {
      if (msg.role === 'ia' && msg.action_sug && !msg.isStreaming && !seenIaMsgIds.current.has(msg.id)) {
        seenIaMsgIds.current.add(msg.id)
        const label = msg.action_sug.titre || (isFr ? 'Document généré' : 'Document generated')
        setIaTimestamps(prev => [...prev, { id: msg.id, time: new Date(), label }])
      }
    }
  }, [messages])

  useEffect(() => {
    const saved = !!lastExportableMsg?.is_saved
    if (saved && !prevSavedRef.current) setLastSaveTime(new Date())
    prevSavedRef.current = saved
  }, [lastExportableMsg?.is_saved])

  const handleHeaderSave = useCallback(() => {
    if (!lastExportableMsg?.action_sug) return
    handleSaveOpen(lastExportableMsg.action_sug, lastExportableMsg.id, lastExportableMsg.autosave_fichier_id, lastExportableMsg.indexation_ok)
  }, [lastExportableMsg, handleSaveOpen])

  // ── DESIGN-13: streaming phase (display only) ──────────────────────────────
  const [streamingPhase, setStreamingPhase] = useState(0)
  const STREAMING_PHASES_FR = ['Analyse en cours…', 'Construction…', 'Rédaction…', 'Finalisation…']
  const STREAMING_PHASES_EN = ['Analysing…', 'Building…', 'Writing…', 'Finalising…']
  useEffect(() => {
    if (!isStreaming) { setStreamingPhase(0); return }
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg?.isStreaming) return
    const len = lastMsg.content.length
    if (len < 100)      setStreamingPhase(0)
    else if (len < 400) setStreamingPhase(1)
    else if (len < 900) setStreamingPhase(2)
    else                setStreamingPhase(3)
  }, [isStreaming, messages])

  if (loading) return <LoadingScreen />

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F8FAFC' }}>

      <PedagogiqueExplorer
        profil={profil}
        classes={classes}
        activeConversationId={conversationId}
        refreshKey={conversationRefreshKey}
        isFr={isFr}
        explorerOpen={explorerOpen}
        onSelectConversation={handleLoadConversation}
        onNewDocument={(prompt, classeIdHint) => {
          if (classeIdHint && classeIdHint !== classeId) setClasseId(classeIdHint)
          setInputValue(prompt)
          setTimeout(() => textareaRef.current?.focus(), 80)
        }}
        onToggleExplorer={() => setExplorerOpen(v => !v)}
        onLogout={handleLogout}
        notifCount={notifCount}
      />

      <WorkspaceLayout
        explorerOpen={explorerOpen}
        explorerWidth={300}
        isFr={isFr}
        onOpenExplorer={() => setExplorerOpen(true)}
        header={
          <WorkspaceHeader
            classes={classes}
            classeId={classeId || null}
            matiere={matiereEffective || null}
            hasMessages={messages.length > 0}
            isStreaming={isStreaming}
            isFr={isFr}
            notifCount={notifCount}
            initiales={initiales}
            canExport={canExport}
            canExportPptx={canExportPptx}
            assistantOpen={aiPanelOpen}
            inspectorOpen={inspectorOpen}
            hasDocument={!!lastExportableMsg}
            focusMode={focusMode}
            onToggleFocus={handleToggleFocus}
            contextBar={contextBar}
            suggestion={activeSuggestion}
            isSaved={!!lastExportableMsg?.is_saved}
            onSave={canExport ? handleHeaderSave : undefined}
            onClasseChange={id => { setClasseId(id); setMessages([]); setPendingSave(null); conversationIdRef.current = null; setConversationId(null); setIaTimestamps([]); setLastSaveTime(null); seenIaMsgIds.current.clear() }}
            onClear={() => { setMessages([]); setPendingSave(null); conversationIdRef.current = null; setConversationId(null); setToast(null); setInspectorOpen(false); setIaTimestamps([]); setLastSaveTime(null); seenIaMsgIds.current.clear() }}
            onToggleAssistant={handleToggleAssistant}
            onToggleInspector={() => setInspectorOpen(v => !v)}
            onExportWord={handleGlobalExportWord}
            onExportPptx={handleGlobalExportPptx}
            onApplySuggestion={action => { handleSend(action); setIgnoredSuggestionDocType(docType) }}
            onIgnoreSuggestion={() => setIgnoredSuggestionDocType(docType)}
          />
        }
        inspectorPanel={inspectorOpen && lastExportableMsg ? (
          <InspectorPanel
            lastGenerated={lastExportableMsg}
            classe={classe ?? null}
            matiere={matiereEffective || null}
            conversationId={conversationId}
            messageCount={messages.length}
            isFr={isFr}
            onClose={() => setInspectorOpen(false)}
          />
        ) : undefined}
        rightPanel={aiPanelOpen ? (
          <AIAssistantPanel
            messages={messages}
            contextFiles={fichiersKlassia.map(f => ({ id: f.id, nom: f.nom }))}
            isFr={isFr}
            isStreaming={isStreaming}
            docType={docType}
            iaTimestamps={iaTimestamps}
            onQuickAction={prompt => handleSend(prompt)}
            onClose={() => { setAiPanelOpen(false); localStorage.setItem('ws_copilot_open', 'false') }}
          />
        ) : undefined}
      >

        {/* ── No classes at all ── */}
        {classes.length === 0 ? (
          <NoClassesState
            isFr={isFr}
            onCreateClass={() => router.push('/dashboard/classes')}
          />

        ) : !classeId ? (
          <ClassPickerState
            isFr={isFr}
            classes={classes}
            onSelectClasse={id => setClasseId(id)}
          />

        ) : (
          /* ── Chat interface ── */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* ── DESIGN-13 Document zone — L'IA écrit directement dans le document ── */}
            <div ref={messagesScrollRef} className="c13-doc-zone">

              {/* Streaming phase indicator */}
              {isStreaming && (
                <div className="c13-phase-bar">
                  <div className="c13-phase-pill">
                    <div className="c13-phase-dot" />
                    <div className="c13-phase-dot" />
                    <div className="c13-phase-dot" />
                    <span>{(isFr ? STREAMING_PHASES_FR : STREAMING_PHASES_EN)[streamingPhase]}</span>
                  </div>
                </div>
              )}

              <div className="c13-doc-scroll">
                <div className="c13-doc-inner">

                  {/* ── DESIGN-14: Document header ── */}
                  {!loadingConversation && messages.length > 0 && (lastExportableMsg?.action_sug || isStreaming) && (
                    <div className="c14-doc-hd">
                      <h1 className="c14-doc-title">
                        {lastExportableMsg?.action_sug?.titre || (isFr ? 'Document en cours…' : 'Document in progress…')}
                      </h1>
                      <div className="c14-doc-meta">
                        <span className={`c14-doc-status ${
                          isStreaming ? 'c14-status-gen' :
                          lastExportableMsg?.is_saved ? 'c14-status-saved' : 'c14-status-unsaved'
                        }`}>
                          {isStreaming
                            ? (isFr ? '✦ Génération…' : '✦ Generating…')
                            : lastExportableMsg?.is_saved
                              ? (isFr ? '✓ Enregistré' : '✓ Saved')
                              : (isFr ? '● Non enregistré' : '● Unsaved')}
                        </span>
                        {lastSaveTime && !isStreaming && (
                          <span className="c14-doc-save-time">
                            {isFr
                              ? `Enregistré à ${lastSaveTime.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}`
                              : `Saved at ${lastSaveTime.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}`}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Canvas pédagogique (document structuré) ── */}
                  {lastExportableMsg?.action_sug && !loadingConversation ? (
                    <PreparationCanvas
                      content={lastExportableMsg.action_sug.contenu}
                      titre={lastExportableMsg.action_sug.titre}
                      typeContenu={lastExportableMsg.action_sug.type_contenu}
                      isFr={isFr}
                      isStreaming={isStreaming}
                      onSuggestPrompt={prompt => setInputValue(prompt)}
                    />
                  ) : loadingConversation ? (
                    <LoadingConversationState isFr={isFr} />

                  ) : messages.length === 0 ? (
                    <WelcomeState
                      isFr={isFr}
                      prenom={prenom}
                      classe={classe ?? null}
                      matiere={matiereEffective}
                      suggestions={SUGGESTIONS(isFr)}
                      onSend={handleSend}
                    />

                  ) : (
                    /* ── Document view — last IA response, direct (no chat bubbles) ── */
                    (() => {
                      const lastIa = [...messages].reverse().find(m => m.role === 'ia')
                      if (!lastIa) return (
                        <div className="c13-welcome">
                          <div className="c13-welcome-icon">✦</div>
                          <p className="c13-welcome-sub">
                            {isFr ? 'ScorgIA prépare votre document…' : 'ScorgIA is preparing your document…'}
                          </p>
                        </div>
                      )
                      if (lastIa.isStreaming && !lastIa.content) return (
                        <div className="c13-welcome">
                          <div className="c13-welcome-icon" style={{ opacity: 0.4 }}>✦</div>
                          <p className="c13-welcome-sub">
                            {isFr ? 'Rédaction en cours…' : 'Writing in progress…'}
                          </p>
                        </div>
                      )
                      return (
                        <div className="c13-doc-body">
                          {!lastIa.isStreaming && ['plan_lecon', 'plan_de_lecon', 'fiche_lecon', 'lecon_complete'].includes(lastIa.type_contenu || '') ? (
                            <PlanLeconView content={lastIa.content} />
                          ) : (
                            <MarkdownMessage content={lastIa.content} isStreaming={!!lastIa.isStreaming} />
                          )}

                          {/* Fichiers ignorés */}
                          {!lastIa.isStreaming && lastIa.fichiersKlassiaIgnores?.length ? (
                            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                              {lastIa.fichiersKlassiaIgnores.map(f => (
                                <div key={f.fichier_id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#F59E0B' }}>
                                  <span>⚠</span>
                                  <span>
                                    {f.nom ? `« ${f.nom} » — ` : ''}
                                    {isFr ? 'Ce document n\'a pas encore pu être utilisé par l\'IA.' : 'This document could not be used by the AI yet.'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {/* Action chips sous le document */}
                          {!lastIa.isStreaming && lastIa.action_sug && (
                            <div className="c13-action-chips">
                              <button className="c13-chip" onClick={() => handleExportWord(lastIa.action_sug!, lastIa.contenu_json)}>
                                📥 Word
                              </button>
                              {lastIa.contenu_json && ['plan_lecon','fiche_lecon','lecon_complete','lecon_developpee','activite'].includes(lastIa.action_sug?.type_contenu ?? '') && (
                                <button className="c13-chip" onClick={() => handleExportPptx(lastIa.action_sug!, lastIa.contenu_json)}>
                                  📊 PowerPoint
                                </button>
                              )}
                              <button className="c13-chip" onClick={() => handlePrint(lastIa.action_sug!)}>
                                🖨️ Imprimer
                              </button>
                              <button
                                className={lastIa.is_saved ? 'c13-chip c13-chip-saved' : 'c13-chip c13-chip-save'}
                                onClick={lastIa.is_saved ? undefined : () => handleSaveOpen(lastIa.action_sug!, lastIa.id, lastIa.autosave_fichier_id, lastIa.indexation_ok)}
                                disabled={!!lastIa.is_saved}>
                                {lastIa.is_saved ? (isFr ? '✓ Sauvegardé' : '✓ Saved') : (isFr ? '💾 Sauvegarder' : '💾 Save')}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })()
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Scroll-to-bottom button */}
              {showScrollBtn && (
                <div style={{ position: 'sticky', bottom: 12, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                  <button
                    onClick={() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); setShowScrollBtn(false) }}
                    style={{
                      pointerEvents: 'all',
                      padding: '7px 16px', borderRadius: 99,
                      background: '#6D5DF6', color: '#fff', border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, boxShadow: '0 4px 16px rgba(109,93,246,0.4)',
                      display: 'flex', alignItems: 'center', gap: 6, transition: 'transform 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                    ↓ Revenir au contenu en cours
                  </button>
                </div>
              )}
            </div>

            {/* ── ActionBar contextuelle (visible avec des messages) ── */}
            {messages.length > 0 && !isStreaming && (
              <ActionBar
                isFr={isFr}
                isStreaming={isStreaming}
                onAction={prompt => handleSend(prompt)}
              />
            )}

            {/* Input area — glass */}
            <div style={{ flexShrink: 0, padding: '10px 24px 16px', borderTop: '1px solid rgba(15,35,65,0.07)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>

              {/* Input file caché */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.doc,.docx,image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileAttach}
              />

              {/* Voice waveform */}
              {showVoice && (
                <div style={{ marginBottom: 10, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(108,92,231,0.05)', border: '1px solid rgba(108,92,231,0.15)' }}>
                  <VoiceWaveform onStop={transcript => { setShowVoice(false); if (transcript) setInputValue(transcript) }} />
                </div>
              )}

              {/* Chips fichiers locaux en attente */}
              {fichiersJoints.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 8 }}>
                  {fichiersJoints.map((file, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '4px 8px 4px 6px',
                      borderRadius: 8,
                      border: '1px solid rgba(108,92,231,0.22)',
                      background: 'rgba(108,92,231,0.07)',
                      fontSize: 11, color: 'var(--text-secondary)',
                      maxWidth: 200,
                    }}>
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          style={{ width: 20, height: 20, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }}
                          alt=""
                        />
                      ) : (
                        <span style={{ fontSize: 13, flexShrink: 0 }}>
                          {file.name.toLowerCase().endsWith('.pdf') ? '📄' : '📝'}
                        </span>
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {file.name}
                      </span>
                      <button
                        onClick={() => setFichiersJoints(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Chips fichiers KlassIA sélectionnés */}
              {fichiersKlassia.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 8 }}>
                  {fichiersKlassia.map((fk, i) => (
                    <div key={fk.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '4px 8px 4px 8px',
                      borderRadius: 8,
                      border: '1px solid rgba(108,92,231,0.35)',
                      background: 'rgba(108,92,231,0.1)',
                      fontSize: 11, color: 'var(--violet)',
                      maxWidth: 220,
                    }}>
                      <span style={{ fontSize: 12, flexShrink: 0, fontWeight: 700 }}>✦</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: 600 }}>
                        {fk.nom}
                      </span>
                      <button
                        onClick={() => setFichiersKlassia(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--violet)', fontSize: 14, padding: '0 2px', lineHeight: 1, flexShrink: 0, opacity: 0.7 }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Bandeau Mission KlassIA */}
              {showMissionBandeau && missionParam && missionBandeauLabel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(108,92,231,0.07)', border: '1px solid rgba(108,92,231,0.18)' }}>
                  {/* Label + badge En cours si mission_key présent */}
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet)', letterSpacing: '0.04em', flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                    ✦ Mission ScorgIA — {missionBandeauLabel}
                    {missionKeyParam && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '1px 7px', borderRadius: 99, letterSpacing: '0.04em', whiteSpace: 'nowrap' as const }}>
                        {isFr ? 'En cours' : 'In progress'}
                      </span>
                    )}
                  </span>
                  {/* Marquer terminée (seulement si mission_key connu) */}
                  {missionKeyParam && (
                    <button
                      onClick={handleCompleteMission}
                      disabled={missionCompleting}
                      style={{ fontSize: 11, fontWeight: 600, color: '#10B981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 6, padding: '3px 10px', cursor: missionCompleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: missionCompleting ? 0.5 : 1, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                      {missionCompleting ? '…' : (isFr ? '✓ Terminée' : '✓ Done')}
                    </button>
                  )}
                  <button
                    onClick={() => setShowMissionBandeau(false)}
                    aria-label={isFr ? 'Ignorer la mission' : 'Dismiss mission'}
                    style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, fontFamily: 'inherit', opacity: 0.7, flexShrink: 0 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7' }}>
                    {isFr ? 'Ignorer' : 'Dismiss'}
                  </button>
                </div>
              )}

              {/* Toast terminaison mission */}
              {missionCompleteToast && (
                <div style={{ marginBottom: 8, padding: '7px 12px', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  {missionCompleteToast}
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

                {/* Ajouter un contexte — point d'entrée V1 */}
                <div ref={attachMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    onClick={() => setShowAttachMenu(v => !v)}
                    disabled={isStreaming || fichiersJoints.length >= 3}
                    aria-label={isFr ? 'Ajouter un contexte' : 'Add context'}
                    title={isFr ? 'Ajouter un contexte' : 'Add context'}
                    style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: isStreaming || fichiersJoints.length >= 3 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, background: showAttachMenu || fichiersJoints.length > 0 ? 'rgba(108,92,231,0.12)' : 'rgba(15,35,65,0.05)', color: showAttachMenu || fichiersJoints.length > 0 ? 'var(--violet)' : 'var(--text-muted)', transition: 'all 0.15s', opacity: isStreaming ? 0.4 : 1 }}>
                    📎
                  </button>

                  {showAttachMenu && (
                    <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, zIndex: 120, minWidth: 240, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(15,35,65,0.1)', borderRadius: 'var(--radius-md)', boxShadow: '0 8px 32px rgba(15,35,65,0.12)', overflow: 'hidden' }}>
                      <div style={{ padding: '8px 14px 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                        {isFr ? 'Ajouter un contexte' : 'Add context'}
                      </div>

                      {/* 1 — Mes fichiers KlassIA */}
                      <button
                        onClick={() => { setShowAttachMenu(false); setShowKlassIAPicker(true) }}
                        disabled={fichiersKlassia.length >= 5}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: fichiersKlassia.length >= 5 ? 'not-allowed' : 'pointer', textAlign: 'left' as const, fontSize: 13, color: 'var(--text-secondary)', transition: 'background 0.1s', opacity: fichiersKlassia.length >= 5 ? 0.5 : 1 }}
                        onMouseEnter={e => { if (fichiersKlassia.length < 5) (e.currentTarget.style.background = 'rgba(108,92,231,0.06)') }}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        <span style={{ fontSize: 16 }}>📂</span>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{isFr ? 'Mes fichiers ScorgIA' : 'My ScorgIA files'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                            {fichiersKlassia.length >= 5
                              ? (isFr ? 'Limite atteinte (5)' : 'Limit reached (5)')
                              : (isFr ? `${fichiersKlassia.length}/5 sélectionné${fichiersKlassia.length !== 1 ? 's' : ''}` : `${fichiersKlassia.length}/5 selected`)
                            }
                          </div>
                        </div>
                      </button>

                      <div style={{ height: 1, background: 'rgba(15,35,65,0.06)', margin: '0 14px' }} />

                      {/* 2 — Mon ordinateur */}
                      <button
                        onClick={() => { setShowAttachMenu(false); fileInputRef.current?.click() }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const, fontSize: 13, color: 'var(--text-secondary)', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(108,92,231,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        <span style={{ fontSize: 16 }}>🖥️</span>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{isFr ? 'Mon ordinateur' : 'My computer'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>PDF, Word, image — max 5 Mo</div>
                        </div>
                      </button>
                      <div style={{ height: 6 }} />
                    </div>
                  )}
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder={isFr ? `Demandez à ScorgIA pour ${classe?.nom || 'votre classe'}…` : `Ask ScorgIA for ${classe?.nom || 'your class'}…`}
                  rows={1}
                  style={{ flex: 1, resize: 'none', minHeight: 28, maxHeight: 140, fontSize: 14, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'inherit', lineHeight: 1.5, overflowY: 'auto', padding: '3px 0' }}
                />

                {/* Send / Stop */}
                <button
                  onClick={isStreaming ? handleStop : () => handleSend()}
                  disabled={!isStreaming && !inputValue.trim() && fichiersJoints.length === 0}
                  style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: isStreaming || inputValue.trim() || fichiersJoints.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', flexShrink: 0, transition: 'background 0.15s', background: isStreaming ? '#EF4444' : (!inputValue.trim() && fichiersJoints.length === 0) ? 'rgba(15,35,65,0.12)' : 'var(--violet)' }}>
                  {isStreaming ? '⬛' : '▶'}
                </button>
              </div>

              <p style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', margin: '4px 0 0', opacity: 0.38 }}>
                ScorgIA · {isFr ? 'Contenu généré par IA · Vérifiez avant d\'utiliser' : 'AI-generated content · Review before using'}
              </p>
            </div>

          </div>
        )}

      </WorkspaceLayout>

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
                {pendingSave?.action.titre && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'normal' }}>{isFr ? 'Leçon :' : 'Lesson:'} </span>« {pendingSave.action.titre} »
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
                        onClick={() => { setClasseId(c.id); loadDossiers(pendingSave?.action, c.id) }}
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

      {/* ── Sélecteur fichiers KlassIA (DCE-03) ── */}
      {showKlassIAPicker && classeId && (
        <KlassIAFilePicker
          classeId={classeId}
          matiere={matiereEffective}
          maxFiles={5}
          initialSelectedIds={fichiersKlassia.map(f => f.id)}
          classes={classes.map(c => ({ id: c.id, nom: c.nom, niveau: c.niveau, matiere: c.matiere, matieres: c.matieres }))}
          onConfirm={selection => {
            setFichiersKlassia(selection)
            setShowKlassIAPicker(false)
          }}
          onClose={() => setShowKlassIAPicker(false)}
        />
      )}

      {/* ── Toast (persist:true = erreur qui reste jusqu'au clic ✕) ── */}
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
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span>{toast.msg}</span>
          {toast.persist && (
            <button onClick={() => setToast(null)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: 0, opacity: 0.85 }}>
              ✕
            </button>
          )}
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
