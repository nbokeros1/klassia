'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ScorgiaLogo } from '@/components/branding/scorgia-logo'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMsg {
  id:          string
  role:        'user' | 'ia'
  content:     string
  isStreaming?: boolean
}

interface ActionSuggestion {
  type:            string
  action:          'sauvegarder'
  type_contenu:    string
  titre:           string
  dossier_suggere: string
  contenu:         string
  iaMessageId:     string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACTIONS_DELIMITER = '\n__KLASSIA_ACTIONS__\n'
const ACTION_TAG         = '\n\n__ACTION__'
function uid() { return Math.random().toString(36).substring(2, 10) }

function contextFromPath(pathname: string): { label: string; message: string } {
  if (pathname.includes('/classes/') && pathname.includes('/lecons/')) {
    return {
      label:   'Éditeur de leçon',
      message: 'Je vois que vous éditez une leçon. Voulez-vous que je modifie ou améliore quelque chose ?',
    }
  }
  if (pathname.includes('/classes/') && !pathname.includes('/lecons')) {
    return {
      label:   'Classe',
      message: 'Je vois que vous êtes dans une classe. Que puis-je générer pour vous ?',
    }
  }
  if (pathname.includes('/classes')) {
    return { label: 'Classes', message: 'Que voulez-vous faire avec vos classes ?' }
  }
  if (pathname.includes('/calendrier')) {
    return { label: 'Calendrier', message: 'Je peux ajouter des événements à votre calendrier. Que voulez-vous planifier ?' }
  }
  if (pathname.includes('/profil')) {
    return { label: 'Profil', message: 'Vous configurez votre profil. Comment puis-je vous aider ?' }
  }
  if (pathname.includes('/gerer/preparer')) {
    return { label: 'Préparation', message: 'Je peux vous aider à préparer vos leçons. Que créons-nous ?' }
  }
  if (pathname.includes('/gerer/enseigner')) {
    return { label: 'Enseigner', message: 'Vous êtes en mode enseignement. Besoin d\'aide ?' }
  }
  if (pathname.includes('/communaute')) {
    return { label: 'Communauté', message: 'Vous explorez la communauté ScorgIA. Que cherchez-vous ?' }
  }
  return { label: 'ScorgIA', message: 'Comment puis-je vous aider ?' }
}

// ─── Helpers contextuels ──────────────────────────────────────────────────────

function extractClasseId(pathname: string): string | null {
  const m = pathname.match(/\/classes\/([a-zA-Z0-9-]+)/)
  return m ? m[1] : null
}

interface Suggestion { label: string; prompt: string }

function suggestionsFromPath(pathname: string): Suggestion[] {
  if (pathname.match(/\/classes\/[^/]+/) && !pathname.includes('/lecons/')) {
    return [
      { label: '📋 Générer un plan pour cette classe',   prompt: 'Génère un plan de leçon complet pour cette classe en tenant compte de son niveau et de sa matière.' },
      { label: '🔍 Voir les élèves en difficulté',        prompt: 'Quels élèves de cette classe pourraient être en difficulté et comment puis-je les aider concrètement ?' },
      { label: '📝 Créer une activité différenciée',      prompt: 'Propose une activité différenciée adaptée aux différents profils d\'élèves de cette classe.' },
    ]
  }
  if (pathname.includes('/calendrier')) {
    return [
      { label: '📅 Planifier la semaine prochaine',     prompt: 'Aide-moi à planifier ma semaine prochaine : quelles leçons et activités devrais-je prioriser ?' },
      { label: '📊 Résumer les évaluations à venir',    prompt: 'Résume les évaluations à venir dans mon calendrier et propose un plan de révision pour mes élèves.' },
      { label: '⚡ Ajouter un rappel important',         prompt: 'Aide-moi à identifier les événements importants à ajouter à mon calendrier cette semaine.' },
    ]
  }
  if (pathname.includes('/classes/') && pathname.includes('/lecons/')) {
    return [
      { label: '✨ Améliorer cette leçon',              prompt: 'Analyse cette leçon et propose des améliorations pédagogiques concrètes.' },
      { label: '🎮 Créer un quiz pour cette leçon',     prompt: 'Crée un quiz de 5 questions pour évaluer la compréhension de cette leçon.' },
      { label: '🔄 Adapter pour élèves en difficulté',  prompt: 'Adapte le contenu de cette leçon pour les élèves qui ont des difficultés d\'apprentissage.' },
    ]
  }
  if (pathname.includes('/gerer/preparer')) {
    return [
      { label: '📋 Plan de leçon rapide',    prompt: 'Génère un plan de leçon structuré en 3 moments (avant, pendant, après) pour ma prochaine classe.' },
      { label: '📚 Séquence d\'apprentissage', prompt: 'Aide-moi à créer une séquence d\'apprentissage sur 2 semaines pour un nouveau thème.' },
      { label: '📊 Grille d\'évaluation',      prompt: 'Crée une grille d\'évaluation formative avec critères et indicateurs.' },
    ]
  }
  return [
    { label: '✨ Générer un contenu',  prompt: 'Que peux-tu générer pour moi en tant qu\'enseignant ?' },
    { label: '📝 Créer un plan',       prompt: 'Aide-moi à créer un plan de leçon pour ma prochaine classe.' },
    { label: '🎮 Créer un quiz',       prompt: 'Crée un quiz pour évaluer la compréhension de mes élèves.' },
    { label: '💌 Email parents',       prompt: 'Aide-moi à rédiger un email professionnel pour les parents d\'élèves.' },
  ]
}

// ─── Rendu Markdown (mise en forme façon Claude) ──────────────────────────────

const ASST_MD_COMPONENTS = {
  p:      ({ children }: any) => <p style={{ margin: '0 0 8px', fontSize: 13, lineHeight: 1.6 }}>{children}</p>,
  strong: ({ children }: any) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
  h1:     ({ children }: any) => <h1 style={{ fontSize: 16, fontWeight: 800, margin: '10px 0 6px' }}>{children}</h1>,
  h2:     ({ children }: any) => <h2 style={{ fontSize: 14, fontWeight: 800, margin: '10px 0 6px' }}>{children}</h2>,
  h3:     ({ children }: any) => <h3 style={{ fontSize: 13, fontWeight: 700, margin: '8px 0 4px' }}>{children}</h3>,
  ul:     ({ children }: any) => <ul style={{ paddingLeft: 18, margin: '0 0 8px' }}>{children}</ul>,
  ol:     ({ children }: any) => <ol style={{ paddingLeft: 18, margin: '0 0 8px' }}>{children}</ol>,
  li:     ({ children }: any) => <li style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 2 }}>{children}</li>,
  code:   ({ children }: any) => <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 4px', borderRadius: 3, fontSize: 11, fontFamily: 'monospace', color: 'var(--color-accent-violet)' }}>{children}</code>,
  pre:    ({ children }: any) => <pre style={{ background: 'var(--color-bg-tertiary)', padding: 8, borderRadius: 6, overflowX: 'auto', fontSize: 11, margin: '0 0 8px' }}>{children}</pre>,
  table:  ({ children }: any) => <div style={{ overflowX: 'auto', margin: '0 0 8px' }}><table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>{children}</table></div>,
  th:     ({ children }: any) => <th style={{ border: '1px solid var(--color-border)', padding: '4px 7px', background: 'var(--color-bg-tertiary)', textAlign: 'left', fontWeight: 700 }}>{children}</th>,
  td:     ({ children }: any) => <td style={{ border: '1px solid var(--color-border)', padding: '4px 7px' }}>{children}</td>,
  blockquote: ({ children }: any) => <blockquote style={{ borderLeft: '3px solid var(--color-accent-violet)', margin: '0 0 8px', paddingLeft: 10, color: 'var(--color-text-secondary)' }}>{children}</blockquote>,
}

// ─── Carte de sauvegarde inline ────────────────────────────────────────────────

function SaveMiniCard({ action, classes, onSauvegarde, onDismiss }: {
  action: ActionSuggestion
  classes: { id: string; nom: string }[]
  onSauvegarde: (classeId: string) => Promise<void>
  onDismiss: () => void
}) {
  const [classeId, setClasseId] = useState(classes[0]?.id || '')
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(false)

  useEffect(() => { if (!classeId && classes[0]) setClasseId(classes[0].id) }, [classes])

  if (done) return (
    <div style={{ marginLeft: 34, marginTop: 6, fontSize: 11, color: '#34D399', fontWeight: 600 }}>
      ✓ Sauvegardé dans {classes.find(c => c.id === classeId)?.nom || 'la classe'} → {action.dossier_suggere}
    </div>
  )

  return (
    <div style={{ marginLeft: 34, marginTop: 6, padding: 10, borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
        💾 Sauvegarder « <strong>{action.titre}</strong> » dans <strong>{action.dossier_suggere}</strong>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <select value={classeId} onChange={e => setClasseId(e.target.value)}
          style={{ flex: 1, fontSize: 11, padding: '5px 6px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-input-bg)', color: 'var(--color-text-primary)' }}>
          {classes.length === 0 && <option value="">Aucune classe</option>}
          {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <button
          disabled={!classeId || saving}
          onClick={async () => { setSaving(true); await onSauvegarde(classeId); setSaving(false); setDone(true) }}
          style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: 'var(--color-accent-violet)', color: '#FFF', fontSize: 11, fontWeight: 700, cursor: classeId ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
          {saving ? '…' : 'Sauvegarder'}
        </button>
        <button onClick={onDismiss}
          style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
          ✕
        </button>
      </div>
    </div>
  )
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function AssistantFlottant() {
  const pathname = usePathname()

  // Ne pas afficher sur le dashboard principal (déjà une conversation) ni Studio IA
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/studio-ia')) return null

  return <AssistantFlottantInner pathname={pathname} />
}

function AssistantFlottantInner({ pathname }: { pathname: string }) {
  const ctx    = contextFromPath(pathname)
  const [open, setOpen]        = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [messages, setMessages]   = useState<ChatMsg[]>([])
  const [input, setInput]         = useState('')
  const [streaming, setStreaming]  = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [actionEnAttente, setActionEnAttente] = useState<ActionSuggestion | null>(null)
  const [classes, setClasses] = useState<{ id: string; nom: string }[]>([])
  const [showBtn, setShowBtn]  = useState(true)

  useEffect(() => {
    setShowBtn(localStorage.getItem('scorgia_show_assistant_btn') !== 'false')
  }, [])

  const endRef   = useRef<HTMLDivElement>(null)
  const taRef    = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const recRef   = useRef<any>(null)
  const supabase = createClient()

  // Charger les classes pour le sélecteur de sauvegarde
  useEffect(() => {
    if (!open || classes.length > 0) return
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profil } = await supabase.from('utilisateurs').select('id').eq('user_id', user.id).single()
      if (!profil) return
      const { data } = await supabase.from('classes').select('id, nom').eq('enseignant_id', profil.id).order('created_at', { ascending: false })
      setClasses(data || [])
    })()
  }, [open])

  const sauvegarderContenu = useCallback(async (classeId: string) => {
    if (!actionEnAttente) return
    try {
      await fetch('/api/ia/action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sauvegarder', classe_id: classeId, type_contenu: actionEnAttente.type_contenu, titre: actionEnAttente.titre, contenu: actionEnAttente.contenu }),
      })
    } catch {}
  }, [actionEnAttente])

  // Message de bienvenue contextuel
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ id: uid(), role: 'ia', content: ctx.message, isStreaming: false }])
    }
  }, [open])

  // Reset à chaque navigation
  useEffect(() => {
    setMessages([])
    setHasUnread(false)
  }, [pathname])

  // Scroll
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [input])

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || streaming) return
    setInput('')
    setLiveTranscript('')
    setActionEnAttente(null)

    const iaId = uid()
    setMessages(prev => [
      ...prev,
      { id: uid(), role: 'user', content: text },
      { id: iaId, role: 'ia', content: '', isStreaming: true },
    ])
    setStreaming(true)

    abortRef.current = new AbortController()
    try {
      const classeId    = extractClasseId(pathname)
      const dateCourante = new Date().toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      const res = await fetch('/api/ia/assistant', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message: text,
          contexte: {
            page_courante: pathname,
            ...(classeId    ? { classe_id: classeId }            : {}),
            ...(pathname.includes('/calendrier') ? { date_courante: dateCourante } : {}),
          },
          historique: messages.slice(-6).map(m => ({
            role:    m.role === 'ia' ? 'assistant' : 'user',
            content: m.content,
          })),
        }),
        signal: abortRef.current.signal,
      })

      if (!res.body) throw new Error('Pas de stream')
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buf     = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const delimIdx   = buf.indexOf(ACTIONS_DELIMITER)
        const actionIdx  = buf.indexOf(ACTION_TAG)
        let displayTxt   = delimIdx >= 0 ? buf.substring(0, delimIdx) : buf
        if (actionIdx >= 0) displayTxt = displayTxt.substring(0, actionIdx)
        setMessages(prev => prev.map(m => m.id === iaId ? { ...m, content: displayTxt } : m))
      }

      const actionIdx = buf.indexOf(ACTION_TAG)
      if (actionIdx >= 0) {
        try {
          const parsed = JSON.parse(buf.substring(actionIdx + ACTION_TAG.length))
          if (parsed?.type === 'ACTION_SUGGESTION') setActionEnAttente({ ...parsed, iaMessageId: iaId })
        } catch {}
      }

      setMessages(prev => prev.map(m => m.id === iaId ? { ...m, isStreaming: false } : m))
      if (!open) setHasUnread(true)

    } catch (err: any) {
      const msg = err.name === 'AbortError' ? 'Interrompu.' : `⚠️ ${err.message}`
      setMessages(prev => prev.map(m => m.id === iaId ? { ...m, content: msg, isStreaming: false } : m))
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [input, streaming, messages, pathname, open])

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
      setLiveTranscript(t); setInput(t)
      if (ev.results[0].isFinal) { rec.stop(); setIsListening(false); handleSend(t) }
    }
    rec.onerror = () => setIsListening(false)
    rec.onend   = () => setIsListening(false)
    rec.start(); setIsListening(true)
  }

  return (
    <>
      <style>{`
        @keyframes pulseRed {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.4); }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        @keyframes blinkCursor {
          0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; }
        }
        .asst-bubble-ia::after {
          content: '|'; animation: blinkCursor .9s step-start infinite;
          color: var(--color-accent-violet); margin-left: 1px;
        }
      `}</style>

      {/* ── Bouton flottant ──────────────────────────────────────────────── */}
      {showBtn && <div
        title="Parler à ScorgIA"
        onClick={() => { setOpen(true); setHasUnread(false) }}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 900,
          width: 56, height: 56, borderRadius: '50%', cursor: 'pointer',
          background:  'linear-gradient(135deg, #7F77DD, #9B5DE5)',
          boxShadow:   '0 4px 20px rgba(127,119,221,0.55)',
          display:     open ? 'none' : 'flex',
          alignItems:  'center', justifyContent: 'center',
          fontSize: 22, color: '#FFF',
          transition:  'transform .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        ✦
        {hasUnread && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 10, height: 10, borderRadius: '50%',
            background: '#F87171', border: '2px solid var(--color-bg-primary)',
            animation: 'pulseRed 1.4s ease-in-out infinite',
          }} />
        )}
      </div>}

      {/* ── Overlay ───────────────────────────────────────────────────────── */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 999 }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Panneau slide-in ─────────────────────────────────────────────── */}
      {open && (
        <div style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, width: 'min(380px, 100dvw)',
          background: 'var(--color-bg-secondary)',
          borderRight: '1px solid var(--color-border)',
          zIndex: 1000, display: 'flex', flexDirection: 'column',
          animation: 'slideInLeft .25s ease both',
          boxShadow: '4px 0 32px rgba(0,0,0,.3)',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>

          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #7F77DD, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#FFF', fontWeight: 800 }}>✦</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>ScorgIA</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Vous êtes dans : <strong>{ctx.label}</strong></div>
            </div>
            <button onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 20, lineHeight: 1, padding: 4 }}>
              ×
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflow: 'auto', padding: '14px 14px' }}>
            {messages.map(msg => {
              if (msg.role === 'user') return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <div style={{ background: 'var(--color-accent-violet)', color: '#FFF', borderRadius: '14px 14px 3px 14px', padding: '8px 13px', maxWidth: '82%', fontSize: 13, lineHeight: 1.5 }}>
                    {msg.content}
                  </div>
                </div>
              )

              return (
                <div key={msg.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <ScorgiaLogo variant="icon" width={26} height={26} />
                    <div className={msg.isStreaming && msg.content ? 'asst-bubble-ia' : ''}
                      style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '3px 14px 14px 14px', padding: '10px 13px', maxWidth: '85%', fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-primary)', overflowX: 'auto' }}>
                      {msg.content ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={ASST_MD_COMPONENTS}>
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Génération…</span>
                      )}
                    </div>
                  </div>
                  {!msg.isStreaming && actionEnAttente?.iaMessageId === msg.id && (
                    <SaveMiniCard action={actionEnAttente} classes={classes} onSauvegarde={sauvegarderContenu} onDismiss={() => setActionEnAttente(null)} />
                  )}
                </div>
              )
            })}
            <div ref={endRef} />
          </div>

          {/* Suggestions contextuelles */}
          {messages.length <= 1 && !streaming && (
            <div style={{ padding: '0 14px 10px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 6 }}>
                Suggestions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {suggestionsFromPath(pathname).map(s => (
                  <button key={s.label}
                    onClick={() => handleSend(s.prompt)}
                    style={{
                      padding: '8px 12px', borderRadius: 9,
                      border: '1.5px solid var(--color-border)',
                      background: 'var(--color-bg-card)',
                      color: 'var(--color-text-secondary)',
                      fontSize: 12, cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'left' as const,
                      transition: 'all .15s',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--color-accent-violet)'
                      e.currentTarget.style.color = 'var(--color-accent-violet)'
                      e.currentTarget.style.background = 'var(--color-accent-violet-bg)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.color = 'var(--color-text-secondary)'
                      e.currentTarget.style.background = 'var(--color-bg-card)'
                    }}>
                    <span style={{ flex: 1, lineHeight: 1.35 }}>{s.label}</span>
                    <span style={{ fontSize: 10, opacity: 0.45, flexShrink: 0 }}>▶</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input zone */}
          <div style={{ padding: '10px 12px 14px', background: 'var(--color-bg-secondary)', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
            {isListening && (
              <div style={{ marginBottom: 6, fontSize: 11, color: 'var(--color-accent-violet)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F87171', display: 'inline-block', animation: 'pulseRed 1.2s ease-in-out infinite' }} />
                Écoute… {liveTranscript && `"${liveTranscript.substring(0, 40)}"`}
              </div>
            )}
            <div style={{ background: 'var(--color-input-bg)', border: '1.5px solid var(--color-border)', borderRadius: 14, padding: '8px 10px', display: 'flex', alignItems: 'flex-end', gap: 6 }}>
              {/* Micro */}
              <button onClick={toggleVoice}
                style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: isListening ? '#FEE2E2' : 'var(--color-bg-tertiary)', color: isListening ? '#F87171' : 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                {isListening ? '⬛' : '🎤'}
              </button>

              <textarea
                ref={taRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Parlez ou écrivez…"
                rows={1}
                style={{ flex: 1, resize: 'none', border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'inherit', lineHeight: 1.5, minHeight: 22, maxHeight: 120, overflowY: 'auto', padding: '3px 0' }}
              />

              <button
                onClick={streaming ? () => abortRef.current?.abort() : () => handleSend()}
                disabled={!streaming && !input.trim()}
                style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: streaming ? 'pointer' : !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#FFF', flexShrink: 0, background: streaming ? '#F87171' : !input.trim() ? 'var(--color-border)' : 'var(--color-accent-violet)' }}>
                {streaming ? '⬛' : '▶'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
