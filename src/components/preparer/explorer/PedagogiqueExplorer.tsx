'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ScorgiaLogo } from '@/components/branding/scorgia-logo'
import type { ConversationIAResume } from '@/lib/types/database'

// ─── Data types ───────────────────────────────────────────────────────────────

type PackItem     = { id: string; classe_id: string; programme_annuel_id: string | null; statut: string }
type ProgrammeData = { id: string; classe_id: string; contenu_json: any; syllabus_json: any }
type FichierItem  = { id: string; nom: string; type_fichier: string; classe_id: string; statut: string; created_at: string }

// ─── Conversation folder taxonomy ────────────────────────────────────────────

const TYPE_TO_FOLDER: Record<string, string> = {
  curriculum:     'curriculum',
  plan_annuel:    'plan_annuel',
  plan_lecon:     'plans_lecons',
  fiche_lecon:    'plans_lecons',
  lecon_complete: 'lecons',
  quiz:           'quiz',
  evaluation:     'evaluations',
  email_parents:  'emails',
  autre:          'brouillons',
}

const CONV_FOLDERS = [
  { id: 'curriculum',   emoji: '📘', label: 'Curriculum',     color: '#60A5FA', promptFr: 'Génère le curriculum officiel pour ma classe cette année.' },
  { id: 'plan_annuel',  emoji: '📅', label: 'Plan annuel',    color: '#A78BFA', promptFr: 'Crée un plan annuel complet pour mon année scolaire.' },
  { id: 'plans_lecons', emoji: '📝', label: 'Plans de leçon', color: '#34D399', promptFr: 'Crée un plan de leçon détaillé pour ma prochaine leçon.' },
  { id: 'lecons',       emoji: '📖', label: 'Leçons',         color: '#FBC34A', promptFr: 'Génère une leçon complète avec activités et évaluation.' },
  { id: 'quiz',         emoji: '🎮', label: 'Quiz',           color: '#FB923C', promptFr: 'Crée un quiz formatif sur la matière actuelle.' },
  { id: 'evaluations',  emoji: '📊', label: 'Évaluations',   color: '#F87171', promptFr: 'Crée une évaluation sommative avec grille de correction.' },
  { id: 'emails',       emoji: '📧', label: 'Emails parents', color: '#F472B6', promptFr: 'Rédige un email professionnel destiné aux parents.' },
  { id: 'brouillons',   emoji: '💬', label: 'Brouillons',    color: 'rgba(255,255,255,0.35)', promptFr: '' },
]

const TYPE_META: Record<string, { emoji: string; label: string; color: string }> = {
  curriculum:     { emoji: '📘', label: 'Curriculum',     color: '#60A5FA' },
  plan_annuel:    { emoji: '📅', label: 'Plan annuel',    color: '#A78BFA' },
  plan_lecon:     { emoji: '📝', label: 'Plan de leçon',  color: '#34D399' },
  fiche_lecon:    { emoji: '📄', label: 'Fiche de leçon', color: '#34D399' },
  lecon_complete: { emoji: '📖', label: 'Leçon complète', color: '#FBC34A' },
  quiz:           { emoji: '🎮', label: 'Quiz',           color: '#FB923C' },
  evaluation:     { emoji: '📊', label: 'Évaluation',     color: '#F87171' },
  email_parents:  { emoji: '📧', label: 'Email parents',  color: '#F472B6' },
  autre:          { emoji: '💬', label: 'Conversation',   color: 'rgba(255,255,255,0.35)' },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  profil:               any
  classes:              any[]
  activeConversationId: string | null
  refreshKey:           number
  isFr:                 boolean
  explorerOpen:         boolean
  onSelectConversation: (conv: ConversationIAResume) => void
  onNewDocument:        (prompt: string, classeId?: string) => void
  onToggleExplorer:     () => void
  onLogout?:            () => void
  notifCount?:          number
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const EXPLORER_STATE_KEY = 'scorgia_explorer_expanded'

function loadExpandedKeys(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(EXPLORER_STATE_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

function saveExpandedKeys(keys: Set<string>) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(EXPLORER_STATE_KEY, JSON.stringify([...keys])) } catch {}
}

function formatRelativeDate(date: string, isFr: boolean): string {
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return isFr ? "Aujourd'hui" : 'Today'
  if (days === 1) return isFr ? 'Hier' : 'Yesterday'
  if (days < 7)   return isFr ? `il y a ${days} j` : `${days}d ago`
  return new Date(date).toLocaleDateString(isFr ? 'fr-CA' : 'en-CA', { month: 'short', day: 'numeric' })
}

// ─── Reusable row ─────────────────────────────────────────────────────────────

function DocRow({
  icon, label, sublabel, isActive, onClick,
}: {
  icon: string; label: string; sublabel?: string; isActive?: boolean; onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 6,
        padding: '5px 8px', borderRadius: '0 5px 5px 0',
        borderLeft: isActive ? '2px solid #7C3AED' : '2px solid transparent',
        background: isActive ? 'rgba(108,92,231,0.2)' : 'transparent',
        cursor: 'pointer', marginBottom: 1, transition: 'all 0.1s',
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
      <span style={{ fontSize: 10, flexShrink: 0, marginTop: 1, opacity: 0.75 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 10, fontWeight: isActive ? 600 : 400,
          color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.65)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.35,
        }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>{sublabel}</div>
        )}
      </div>
    </div>
  )
}

// Collapsible section row (for folders within a class)
function FolderRow({
  icon, label, count, color, isExpanded, onClick,
}: {
  icon: string; label: string; count?: number; color?: string; isExpanded: boolean; onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
        fontSize: 11, fontWeight: 600,
        color: (count ?? 0) === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.6)',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <span style={{ fontSize: 12, opacity: (count ?? 0) === 0 ? 0.45 : 0.85, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
        {(count ?? 0) > 0 && (
          <span style={{ fontSize: 9, color: color || 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 10 }}>
            {count}
          </span>
        )}
        <span style={{ fontSize: 8, opacity: (count ?? 0) === 0 ? 0.25 : 0.4 }}>{isExpanded ? '▾' : '▸'}</span>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function PedagogiqueExplorer({
  profil, classes, activeConversationId, refreshKey,
  isFr, explorerOpen,
  onSelectConversation, onNewDocument, onToggleExplorer,
}: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const [packByClasse,      setPackByClasse]      = useState<Record<string, PackItem>>({})
  const [programmeByClasse, setProgrammeByClasse] = useState<Record<string, ProgrammeData>>({})
  const [fichiersByClasse,  setFichiersByClasse]  = useState<Record<string, FichierItem[]>>({})
  const [conversations,     setConversations]     = useState<ConversationIAResume[]>([])
  const [loading,           setLoading]           = useState(true)
  const [searchQuery,       setSearchQuery]       = useState('')
  const [expandedKeys,      setExpandedKeys]      = useState<Set<string>>(() => loadExpandedKeys())

  // ── Load all data ────────────────────────────────────────────────────────────
  const loadAllData = useCallback(async () => {
    if (!profil?.id) { setLoading(false); return }
    const classIds = classes.map((c: any) => c.id)
    if (classIds.length === 0) { setLoading(false); return }

    try {
      // Parallel: packs, fichiers, conversations
      const [{ data: packs }, { data: fichiers }, { data: convs }] = await Promise.all([
        supabase
          .from('teaching_packs')
          .select('id, classe_id, programme_annuel_id, statut')
          .in('classe_id', classIds),
        supabase
          .from('fichiers_dossier')
          .select('id, nom, type_fichier, classe_id, statut, created_at')
          .eq('enseignant_id', profil.id)
          .in('classe_id', classIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('conversations_ia')
          .select('id, enseignant_id, classe_id, type_contenu, titre, fichier_dossier_id, est_archivee, contexte_page, created_at, updated_at')
          .eq('enseignant_id', profil.id)
          .eq('est_archivee', false)
          .order('updated_at', { ascending: false })
          .limit(300),
      ])

      // Build packs map
      const newPackByClasse: Record<string, PackItem> = {}
      for (const p of (packs || [])) newPackByClasse[p.classe_id] = p
      setPackByClasse(newPackByClasse)

      // Build fichiers map
      const newFichiersByClasse: Record<string, FichierItem[]> = {}
      for (const f of (fichiers || [])) {
        if (!newFichiersByClasse[f.classe_id]) newFichiersByClasse[f.classe_id] = []
        newFichiersByClasse[f.classe_id].push(f)
      }
      setFichiersByClasse(newFichiersByClasse)

      setConversations((convs || []) as ConversationIAResume[])

      // Fetch programme_annuel for classes with packs
      const packProgIds = (packs || []).filter(p => p.programme_annuel_id).map(p => p.programme_annuel_id as string)
      const newProgByClasse: Record<string, ProgrammeData> = {}

      if (packProgIds.length > 0) {
        const { data: progs } = await supabase
          .from('programme_annuel')
          .select('id, classe_id, contenu_json, syllabus_json')
          .in('id', packProgIds)
        for (const prog of (progs || [])) newProgByClasse[prog.classe_id] = prog
      }

      // Fallback: classes with a pack but no linked programme → query by classe_id
      const needFallback = (packs || [])
        .filter(p => !p.programme_annuel_id && !newProgByClasse[p.classe_id])
        .map(p => p.classe_id)
      if (needFallback.length > 0) {
        const { data: fallbackProgs } = await supabase
          .from('programme_annuel')
          .select('id, classe_id, contenu_json, syllabus_json')
          .in('classe_id', needFallback)
          .order('created_at', { ascending: false })
        for (const prog of (fallbackProgs || [])) {
          if (!newProgByClasse[prog.classe_id]) newProgByClasse[prog.classe_id] = prog
        }
      }

      setProgrammeByClasse(newProgByClasse)

      // Auto-expand classes with data
      setExpandedKeys(prev => {
        const next = new Set(prev)
        for (const cid of classIds) {
          if (newPackByClasse[cid] || (convs || []).some((c: any) => c.classe_id === cid)) {
            next.add(`classe:${cid}`)
          }
        }
        saveExpandedKeys(next)
        return next
      })
    } finally {
      setLoading(false)
    }
  }, [profil?.id, classes])

  useEffect(() => { loadAllData() }, [loadAllData, refreshKey])

  // ── Toggle ───────────────────────────────────────────────────────────────────
  const toggle = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      saveExpandedKeys(next)
      return next
    })
  }, [])

  // ── Navigate to programme tab ─────────────────────────────────────────────
  const goTab = (classeId: string, tab: string) => {
    router.push(`/dashboard/classes/${classeId}/programme?tab=${tab}`)
  }

  // ── Sidebar width ─────────────────────────────────────────────────────────
  const sidebarW = 272

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <aside style={{
      width:      explorerOpen ? sidebarW : 0,
      minWidth:   explorerOpen ? sidebarW : 0,
      height:     '100vh',
      background: 'linear-gradient(160deg, #0c1829 0%, #1a0a38 100%)',
      display:    'flex',
      flexDirection: 'column',
      overflow:   'hidden',
      flexShrink: 0,
      position:   'fixed',
      left:       0, top: 0,
      zIndex:     100,
      borderRight: '1px solid rgba(255,255,255,0.06)',
      transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)',
    }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '13px 14px 11px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, minWidth: sidebarW,
      }}>
        <div
          onClick={() => router.push('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer', minWidth: 0 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          <ScorgiaLogo variant="icon" width={26} height={26} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
              Mon Espace
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
              ← {isFr ? 'Tableau de bord' : 'Dashboard'}
            </div>
          </div>
        </div>
        <button
          onClick={onToggleExplorer}
          title={isFr ? 'Réduire l\'explorateur' : 'Collapse explorer'}
          style={{
            width: 26, height: 26, borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.45)',
            cursor: 'pointer', fontSize: 11, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}>
          ◁
        </button>
      </div>

      {/* ── CTA Construire mon année ───────────────────────────────────────── */}
      <div style={{ padding: '10px 10px 6px', flexShrink: 0, minWidth: sidebarW }}>
        <button
          onClick={() => onNewDocument(
            isFr
              ? 'Construis toute mon année scolaire : génère le curriculum, le plan annuel, les séquences et les plans de leçon pour ma classe.'
              : 'Build my entire school year: curriculum, annual plan, sequences and lesson plans for my class.',
          )}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(108,92,231,0.25) 0%, rgba(79,70,229,0.35) 100%)',
            border: '1px solid rgba(108,92,231,0.35)',
            color: '#c4b5fd', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 7,
            transition: 'all 0.15s', textAlign: 'left',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(108,92,231,0.35) 0%, rgba(79,70,229,0.5) 100%)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(108,92,231,0.25) 0%, rgba(79,70,229,0.35) 100%)' }}>
          <span style={{ fontSize: 14 }}>📚</span>
          <div>
            <div style={{ lineHeight: 1.2 }}>{isFr ? 'Construire mon année' : 'Build my school year'}</div>
            <div style={{ fontSize: 9, fontWeight: 500, color: 'rgba(196,181,253,0.6)', marginTop: 1 }}>
              {isFr ? 'Curriculum → Séquences → Leçons' : 'Curriculum → Sequences → Lessons'}
            </div>
          </div>
        </button>
      </div>

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '4px 10px 6px', flexShrink: 0, minWidth: sidebarW }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 7, padding: '5px 10px',
        }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>🔍</span>
          <input
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder={isFr ? 'Rechercher…' : 'Search…'}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'inherit' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
          )}
        </div>
      </div>

      {/* ── Section label ─────────────────────────────────────────────────── */}
      <div style={{
        padding: '3px 14px 5px', fontSize: 9, fontWeight: 700,
        color: 'rgba(255,255,255,0.25)', letterSpacing: '0.8px',
        textTransform: 'uppercase', flexShrink: 0, minWidth: sidebarW,
      }}>
        {isFr ? 'Mes classes' : 'My classes'}
      </div>

      {/* ── Tree ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 20px', minWidth: sidebarW }}>

        {loading ? (
          <div style={{ padding: '20px 14px', fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
            {isFr ? 'Chargement…' : 'Loading…'}
          </div>

        ) : classes.length === 0 ? (
          <div style={{ padding: '24px 12px', fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.6 }}>
            {isFr ? 'Créez une classe pour commencer.' : 'Create a class to get started.'}
          </div>

        ) : (
          <>
            {classes.map((classe: any) => {
              const classeKey    = `classe:${classe.id}`
              const isExpanded   = expandedKeys.has(classeKey)

              const pack        = packByClasse[classe.id] || null
              const programme   = programmeByClasse[classe.id] || null
              const fichiers    = fichiersByClasse[classe.id] || []
              const leconFich   = fichiers.filter(f => f.type_fichier === 'lecon_complete')
              const quizFich    = fichiers.filter(f => f.type_fichier === 'quiz')

              // Conversations for this class
              const classeConvs = conversations.filter(c => c.classe_id === classe.id)
              // Search: filter conversations, keep pack items always
              const filteredConvs = searchQuery.trim()
                ? classeConvs.filter(c =>
                    (c.titre || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (TYPE_META[c.type_contenu || '']?.label || '').toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : classeConvs

              // Group conversations by folder
              const convByFolder: Record<string, ConversationIAResume[]> = {}
              for (const conv of filteredConvs) {
                const folder = TYPE_TO_FOLDER[conv.type_contenu || ''] || 'brouillons'
                if (!convByFolder[folder]) convByFolder[folder] = []
                convByFolder[folder].push(conv)
              }
              const totalConvs = filteredConvs.length

              // In search mode: skip class if no conversations matched and no pack
              if (searchQuery && totalConvs === 0 && !pack) return null

              const matiere = classe.matiere || (Array.isArray(classe.matieres) && classe.matieres[0]) || ''

              // Derived keys
              const anneeKey    = `annee:${classe.id}`
              const seqKey      = `seq:${classe.id}`
              const leconFKey   = `leconf:${classe.id}`
              const quizFKey    = `quizf:${classe.id}`
              const convSectKey = `convsect:${classe.id}`

              const isAnneeExp  = expandedKeys.has(anneeKey)
              const isSeqExp    = expandedKeys.has(seqKey)
              const isLeconFExp = expandedKeys.has(leconFKey)
              const isQuizFExp  = expandedKeys.has(quizFKey)
              const isConvExp   = expandedKeys.has(convSectKey)

              const unites: any[] = programme?.contenu_json?.unites || []
              const hasSyllabus   = !!programme?.syllabus_json
              const hasPlanAnnuel = !!programme?.contenu_json

              return (
                <div key={classe.id} style={{ marginBottom: 4 }}>

                  {/* ── Classe header ──────────────────────────────────── */}
                  <div
                    onClick={() => toggle(classeKey)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 8px', borderRadius: 8,
                      cursor: 'pointer', fontSize: 11, fontWeight: 700,
                      color: 'rgba(255,255,255,0.75)', transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontSize: 12, flexShrink: 0 }}>{isExpanded ? '📂' : '📁'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{classe.nom}</div>
                      {matiere && (
                        <div style={{ fontSize: 9, fontWeight: 500, color: 'rgba(255,255,255,0.35)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {matiere}{classe.niveau ? ` · ${classe.niveau}` : ''}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {pack && (
                        <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 99, background: 'rgba(52,211,153,0.12)', color: '#34D399', fontWeight: 700 }}>✓</span>
                      )}
                      <span style={{ fontSize: 9, opacity: 0.4 }}>{isExpanded ? '▾' : '▸'}</span>
                    </div>
                  </div>

                  {/* ── Classe content ─────────────────────────────────── */}
                  {isExpanded && (
                    <div style={{ paddingLeft: 12, borderLeft: '1px solid rgba(255,255,255,0.06)', marginLeft: 12, marginBottom: 4 }}>

                      {/* ── Section: Mon Année Scolaire (Teaching Pack) ── */}
                      {pack ? (
                        <div style={{ marginBottom: 2 }}>
                          <div
                            onClick={() => toggle(anneeKey)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                              fontSize: 11, fontWeight: 700,
                              color: 'rgba(255,255,255,0.75)', transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <span style={{ fontSize: 13, flexShrink: 0 }}>📚</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              Mon Année Scolaire
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                              {pack.statut === 'pret' && (
                                <span style={{ fontSize: 8, color: '#34D399', fontWeight: 700 }}>Prêt</span>
                              )}
                              {pack.statut === 'partiellement_genere' && (
                                <span style={{ fontSize: 8, color: '#FBC34A', fontWeight: 700 }}>Partiel</span>
                              )}
                              <span style={{ fontSize: 8, opacity: 0.4 }}>{isAnneeExp ? '▾' : '▸'}</span>
                            </div>
                          </div>

                          {isAnneeExp && (
                            <div style={{ paddingLeft: 10, borderLeft: '1px solid rgba(255,255,255,0.05)', marginLeft: 10 }}>

                              {/* Curriculum */}
                              <DocRow
                                icon="📘"
                                label="Curriculum"
                                sublabel={isFr ? 'Voir le curriculum' : 'View curriculum'}
                                onClick={() => goTab(classe.id, 'curriculum')}
                              />

                              {/* Syllabus */}
                              <DocRow
                                icon="📋"
                                label="Syllabus"
                                sublabel={hasSyllabus ? (isFr ? 'Généré' : 'Generated') : (isFr ? 'Non généré' : 'Not generated')}
                                onClick={() => goTab(classe.id, 'syllabus')}
                              />

                              {/* Plan annuel */}
                              <DocRow
                                icon="📅"
                                label={isFr ? 'Plan annuel' : 'Annual plan'}
                                sublabel={hasPlanAnnuel ? `${unites.length} séquence${unites.length !== 1 ? 's' : ''}` : (isFr ? 'Non généré' : 'Not generated')}
                                onClick={() => goTab(classe.id, 'plan_annuel')}
                              />

                              {/* Séquences */}
                              <div style={{ marginBottom: 1 }}>
                                <FolderRow
                                  icon="🗂️"
                                  label={isFr ? 'Séquences' : 'Sequences'}
                                  count={unites.length}
                                  color="#A78BFA"
                                  isExpanded={isSeqExp}
                                  onClick={() => toggle(seqKey)}
                                />
                                {isSeqExp && (
                                  <div style={{ paddingLeft: 10, borderLeft: '1px solid rgba(255,255,255,0.04)', marginLeft: 10 }}>
                                    {unites.length === 0 ? (
                                      <div style={{ padding: '6px 8px', fontSize: 10, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
                                        {isFr ? 'Aucune séquence générée.' : 'No sequences generated.'}
                                      </div>
                                    ) : unites.map((u: any, i: number) => (
                                      <DocRow
                                        key={i}
                                        icon="▸"
                                        label={`${u.numero || i + 1}. ${u.titre}`}
                                        sublabel={`${(u.lecons || []).length} leçon${(u.lecons || []).length !== 1 ? 's' : ''} · sem. ${u.semaine_debut}–${u.semaine_fin}`}
                                        onClick={() => goTab(classe.id, 'sequences')}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Leçons développées */}
                              <div style={{ marginBottom: 1 }}>
                                <FolderRow
                                  icon="📖"
                                  label={isFr ? 'Leçons développées' : 'Detailed lessons'}
                                  count={leconFich.length}
                                  color="#FBC34A"
                                  isExpanded={isLeconFExp}
                                  onClick={() => toggle(leconFKey)}
                                />
                                {isLeconFExp && (
                                  <div style={{ paddingLeft: 10, borderLeft: '1px solid rgba(255,255,255,0.04)', marginLeft: 10 }}>
                                    {leconFich.length === 0 ? (
                                      <div style={{ padding: '6px 8px', fontSize: 10, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
                                        {isFr ? 'Aucune leçon développée.' : 'No detailed lessons.'}
                                      </div>
                                    ) : leconFich.map(f => (
                                      <DocRow
                                        key={f.id}
                                        icon="📄"
                                        label={f.nom}
                                        sublabel={formatRelativeDate(f.created_at, isFr)}
                                        onClick={() => goTab(classe.id, 'plans_lecon')}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Quiz */}
                              <div style={{ marginBottom: 1 }}>
                                <FolderRow
                                  icon="🎮"
                                  label="Quiz"
                                  count={quizFich.length}
                                  color="#FB923C"
                                  isExpanded={isQuizFExp}
                                  onClick={() => toggle(quizFKey)}
                                />
                                {isQuizFExp && (
                                  <div style={{ paddingLeft: 10, borderLeft: '1px solid rgba(255,255,255,0.04)', marginLeft: 10 }}>
                                    {quizFich.length === 0 ? (
                                      <div style={{ padding: '6px 8px', fontSize: 10, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
                                        {isFr ? 'Aucun quiz généré.' : 'No quiz generated.'}
                                      </div>
                                    ) : quizFich.map(f => (
                                      <DocRow
                                        key={f.id}
                                        icon="🎮"
                                        label={f.nom}
                                        sublabel={formatRelativeDate(f.created_at, isFr)}
                                        onClick={() => goTab(classe.id, 'quiz')}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>

                            </div>
                          )}
                        </div>
                      ) : (
                        /* No pack: CTA */
                        <div style={{ padding: '6px 8px 10px' }}>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5, marginBottom: 6 }}>
                            {isFr ? 'Aucune année scolaire construite.' : 'No school year built yet.'}
                          </div>
                          <button
                            onClick={() => router.push(`/dashboard/classes/${classe.id}/programme`)}
                            style={{
                              fontSize: 9, fontWeight: 600, padding: '3px 8px',
                              borderRadius: 4, border: '1px solid rgba(108,92,231,0.35)',
                              background: 'transparent', color: '#c4b5fd',
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                            📚 {isFr ? 'Construire mon année' : 'Build my year'}
                          </button>
                        </div>
                      )}

                      {/* ── Section: Anciens contenus / Conversations ───── */}
                      {totalConvs > 0 && (
                        <div style={{ marginTop: pack ? 4 : 0 }}>
                          <FolderRow
                            icon="💬"
                            label={pack ? (isFr ? 'Anciens contenus' : 'Legacy content') : (isFr ? 'Préparations IA' : 'AI preparations')}
                            count={totalConvs}
                            color="rgba(255,255,255,0.35)"
                            isExpanded={isConvExp}
                            onClick={() => toggle(convSectKey)}
                          />
                          {isConvExp && (
                            <div style={{ paddingLeft: 10, borderLeft: '1px solid rgba(255,255,255,0.04)', marginLeft: 10 }}>
                              {CONV_FOLDERS.map(folder => {
                                const docs = convByFolder[folder.id] || []
                                if (docs.length === 0) return null
                                const fKey    = `convfolder:${classe.id}:${folder.id}`
                                const isFExp  = expandedKeys.has(fKey)
                                return (
                                  <div key={folder.id} style={{ marginBottom: 1 }}>
                                    <FolderRow
                                      icon={folder.emoji}
                                      label={folder.label}
                                      count={docs.length}
                                      color={folder.color}
                                      isExpanded={isFExp}
                                      onClick={() => toggle(fKey)}
                                    />
                                    {isFExp && docs.map(conv => {
                                      const isActive = conv.id === activeConversationId
                                      return (
                                        <div key={conv.id} style={{ paddingLeft: 10, borderLeft: '1px solid rgba(255,255,255,0.04)', marginLeft: 10 }}>
                                          <DocRow
                                            icon={TYPE_META[conv.type_contenu || '']?.emoji || '💬'}
                                            label={conv.titre || (isFr ? 'Sans titre' : 'Untitled')}
                                            sublabel={formatRelativeDate(conv.updated_at, isFr)}
                                            isActive={isActive}
                                            onClick={() => onSelectConversation(conv)}
                                          />
                                        </div>
                                      )
                                    })}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── New document CTA ──────────────────────────────── */}
                      {!searchQuery && (
                        <button
                          onClick={() => onNewDocument(
                            isFr
                              ? 'Crée un nouveau document pédagogique pour cette classe.'
                              : 'Create a new pedagogical document for this class.',
                            classe.id,
                          )}
                          style={{
                            margin: '6px 8px 4px',
                            padding: '4px 10px',
                            fontSize: 9, fontWeight: 600,
                            borderRadius: 5,
                            border: '1px solid rgba(108,92,231,0.25)',
                            background: 'transparent',
                            color: 'rgba(196,181,253,0.55)',
                            cursor: 'pointer', fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', gap: 4,
                            transition: 'all 0.12s',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(108,92,231,0.1)'
                            ;(e.currentTarget as HTMLElement).style.color = 'rgba(196,181,253,0.9)'
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent'
                            ;(e.currentTarget as HTMLElement).style.color = 'rgba(196,181,253,0.55)'
                          }}>
                          <span>+</span>
                          <span>{isFr ? 'Nouveau document' : 'New document'}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* ── Documents sans classe (conversations non liées) ────────── */}
            {(() => {
              const noClasse = searchQuery
                ? conversations.filter(c => !c.classe_id && (c.titre || '').toLowerCase().includes(searchQuery.toLowerCase()))
                : conversations.filter(c => !c.classe_id)
              if (noClasse.length === 0) return null
              const key = 'classe:none'
              const isExp = expandedKeys.has(key)
              return (
                <div style={{ marginTop: 8 }}>
                  <div
                    onClick={() => toggle(key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 8px 4px', fontSize: 9, fontWeight: 700,
                      color: 'rgba(255,255,255,0.22)', letterSpacing: '0.5px',
                      textTransform: 'uppercase', cursor: 'pointer', borderRadius: 6,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontSize: 10 }}>📋</span>
                    <span style={{ flex: 1 }}>{isFr ? 'Sans classe' : 'No class'}</span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', padding: '0 5px', borderRadius: 10 }}>{noClasse.length}</span>
                    <span style={{ fontSize: 8, opacity: 0.3, marginLeft: 2 }}>{isExp ? '▾' : '▸'}</span>
                  </div>
                  {isExp && noClasse.map(conv => {
                    const isActive = conv.id === activeConversationId
                    const meta = TYPE_META[conv.type_contenu || ''] || TYPE_META.autre
                    return (
                      <DocRow
                        key={conv.id}
                        icon={meta.emoji}
                        label={conv.titre || (isFr ? 'Sans titre' : 'Untitled')}
                        sublabel={formatRelativeDate(conv.updated_at, isFr)}
                        isActive={isActive}
                        onClick={() => onSelectConversation(conv)}
                      />
                    )
                  })}
                </div>
              )
            })()}
          </>
        )}
      </div>
    </aside>
  )
}
