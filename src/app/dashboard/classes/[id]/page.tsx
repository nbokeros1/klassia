'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import LoadingScreen from '@/components/LoadingScreen'
import MarkdownRenderer from '@/components/ui/MarkdownRenderer'
import CadenasForFait from '@/components/ui/CadenasForFait'
import { peutAjouterMatiere } from '@/lib/hooks/useForfait'
import { nourrirIA } from '@/lib/utils/nourrir-ia'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { renderToStaticMarkup } from 'react-dom/server'

// ─── Constants ───────────────────────────────────────────────────────────────

const DOSSIER_COLORS: Record<string, string> = {
  preparation: '#7F77DD', curriculum: '#7F77DD', plan_annuel: '#9B8CE0',
  plans_lecons: '#EF9F27', lecons: '#EF9F27', evaluations_sommatives: '#F87171',
  eleves: '#34D399', ressources: '#60A5FA', administration: '#94A3B8',
  parents: '#F472B6', evenements: '#FB923C', sequence: '#A78BFA',
  matiere: '#7F77DD', custom: '#94A3B8',
}

const STATUT_INFO: Record<string, { bg: string; color: string; label: string }> = {
  brouillon: { bg: 'rgba(148,163,184,.18)', color: '#94A3B8', label: 'Brouillon' },
  valide:    { bg: 'rgba(96,165,250,.18)',  color: '#60A5FA', label: 'Validé'    },
  prete:     { bg: 'rgba(96,165,250,.18)',  color: '#60A5FA', label: 'Prête'     },
  en_cours:  { bg: 'rgba(251,195,74,.18)',  color: '#FBC34A', label: 'En cours'  },
  enseignee: { bg: 'rgba(167,139,250,.18)', color: '#A78BFA', label: 'Enseignée' },
  enseigne:  { bg: 'rgba(167,139,250,.18)', color: '#A78BFA', label: 'Enseigné'  },
  complete:  { bg: 'rgba(52,211,153,.18)',  color: '#34D399', label: 'Terminée'  },
  a_revoir:  { bg: 'rgba(248,113,113,.18)', color: '#F87171', label: 'À revoir'  },
  archivee:  { bg: 'rgba(71,85,105,.18)',   color: '#475569', label: 'Archivée'  },
  archive:   { bg: 'rgba(71,85,105,.18)',   color: '#475569', label: 'Archivé'   },
}

const FILE_ICONS: Record<string, string> = {
  curriculum: '📄', plan_lecon: '📝', lecon_complete: '✨', lecon: '✨',
  fiche_lecon: '✨', activite: '🎯', devoir: '🏠', quiz: '🎮',
  evaluation: '📊', ressource: '📎', image: '🖼️', pdf: '📕',
  video: '🎥', audio: '🎵', document: '📄', plan_sequence: '📅',
  plan_annuel: '📅', gabarit: '📐', lien: '🔗', corrige: '🔑',
}

const FILE_COLORS: Record<string, string> = {
  curriculum: '#60A5FA', plan_lecon: '#7F77DD', lecon_complete: '#EF9F27',
  lecon: '#EF9F27', fiche_lecon: '#EF9F27', activite: '#34D399',
  devoir: '#F472B6', quiz: '#FB923C', evaluation: '#F87171',
  ressource: '#94A3B8',
}

type ViewMode = 'large' | 'small' | 'list' | 'details'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nettoyerNom(nom: string): string {
  return nom.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

function getDossierColor(type: string, couleur?: string): string {
  return couleur || DOSSIER_COLORS[type] || '#F5A623'
}

function getFileIcon(type: string): string { return FILE_ICONS[type] || '📄' }
function getFileColor(type: string): string { return FILE_COLORS[type] || '#94A3B8' }

function formatBytes(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / 1048576).toFixed(1)} Mo`
}

function formatDate(d?: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function buildTree(dossiers: any[], parentId: string | null = null): any[] {
  return dossiers
    .filter(d => (d.parent_id ?? null) === parentId)
    .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
    .map(d => ({ ...d, children: buildTree(dossiers, d.id) }))
}

function flattenVisible(nodes: any[], expanded: Set<string>, level = 0): { node: any; level: number }[] {
  const r: { node: any; level: number }[] = []
  for (const n of nodes) {
    r.push({ node: n, level })
    if (expanded.has(n.id) && n.children?.length > 0)
      r.push(...flattenVisible(n.children, expanded, level + 1))
  }
  return r
}

function getPath(dossiers: any[], targetId: string | null): any[] {
  if (!targetId) return []
  const path: any[] = []
  let cur = dossiers.find(d => d.id === targetId)
  while (cur) { path.unshift(cur); cur = cur.parent_id ? dossiers.find(d => d.id === cur.parent_id) : null }
  return path
}

async function readDirRecursive(entry: any): Promise<File[]> {
  if (entry.isFile) {
    const f = await new Promise<File>((res, rej) => entry.file(res, rej))
    return [f]
  }
  const reader = entry.createReader()
  const entries: any[] = await new Promise((res, rej) => reader.readEntries(res, rej))
  const results: File[] = []
  for (const child of entries) {
    const files = await readDirRecursive(child)
    results.push(...files)
  }
  return results
}

// ─── SVG Dossier ─────────────────────────────────────────────────────────────

function FolderSVG({ color = '#F5A623', size = 44 }: { color?: string; size?: number }) {
  return (
    <svg viewBox="0 0 48 42" width={size} height={Math.round(size * 42 / 48)} style={{ display: 'block', flexShrink: 0 }}>
      <path d="M2 14 Q2 10 6 10 L19 10 Q23 10 25 14 L25 16 L2 16 Z" fill={color} opacity="0.85" />
      <rect x="2" y="14" width="44" height="26" rx="3" fill={color} />
      <rect x="2" y="14" width="44" height="9" rx="3" fill="rgba(255,255,255,0.14)" />
    </svg>
  )
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: type === 'success' ? '#1A2935' : '#2A1A1A',
      border: `1px solid ${type === 'success' ? '#34D399' : '#F87171'}`,
      color: type === 'success' ? '#34D399' : '#F87171',
      padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
      zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,.5)',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {type === 'success' ? '✓' : '✗'} {message}
    </div>
  )
}

// ─── Menu Windows Item ────────────────────────────────────────────────────────

type MenuItem = { label: string; shortcut?: string; onClick?: () => void; danger?: boolean } | 'separator'

function WinMenuPopup({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 498 }} onClick={onClose} />
      <div style={{
        position: 'absolute', top: '100%', left: 0,
        background: 'var(--color-dropdown-bg)',
        border: '1.5px solid var(--color-dropdown-border)',
        borderRadius: 8, minWidth: 230, zIndex: 499,
        boxShadow: '0 8px 32px rgba(0,0,0,.5)',
        overflow: 'hidden', paddingTop: 3, paddingBottom: 3,
      }} onClick={e => e.stopPropagation()}>
        {items.map((item, i) =>
          item === 'separator' ? (
            <div key={i} style={{ height: 1, background: 'var(--color-separator)', margin: '3px 0' }} />
          ) : (
            <button key={i} onClick={() => { item.onClick?.(); onClose() }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 16, width: '100%', padding: '7px 14px',
                background: 'none', border: 'none', fontFamily: 'inherit',
                color: item.danger ? '#F87171' : 'var(--color-text-secondary)',
                fontSize: 12, cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <span>{item.label}</span>
              {item.shortcut && <span style={{ fontSize: 10, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{item.shortcut}</span>}
            </button>
          )
        )}
      </div>
    </>
  )
}

// ─── Context Menu ────────────────────────────────────────────────────────────

function ContextMenuPopup({ x, y, items, onClose }: {
  x: number; y: number; items: MenuItem[]; onClose: () => void
}) {
  const safeX = Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 220)
  const safeY = Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 800) - (items.length * 32 + 20))
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 598 }} onClick={onClose} />
      <div style={{
        position: 'fixed', left: safeX, top: safeY,
        background: 'var(--color-dropdown-bg)',
        border: '1.5px solid var(--color-dropdown-border)',
        borderRadius: 10, minWidth: 200, zIndex: 599,
        boxShadow: '0 8px 32px rgba(0,0,0,.5)',
        overflow: 'hidden', paddingTop: 3, paddingBottom: 3,
      }} onClick={e => e.stopPropagation()}>
        {items.map((item, i) =>
          item === 'separator' ? (
            <div key={i} style={{ height: 1, background: 'var(--color-separator)', margin: '3px 0' }} />
          ) : (
            <button key={i} onClick={() => { item.onClick?.(); onClose() }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, width: '100%', padding: '8px 14px',
                background: 'none', border: 'none', fontFamily: 'inherit',
                color: item.danger ? '#F87171' : 'var(--color-dropdown-text)',
                fontSize: 12, cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <span>{item.label}</span>
              {item.shortcut && <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{item.shortcut}</span>}
            </button>
          )
        )}
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClasseExplorateur() {
  const params   = useParams()
  const id       = params?.id as string
  const router   = useRouter()
  const supabase = createClient()

  const fileInputRef    = useRef<HTMLInputElement>(null)
  const folderInputRef  = useRef<HTMLInputElement>(null)
  const curriculumRef   = useRef<HTMLInputElement>(null)
  const contentAreaRef  = useRef<HTMLDivElement>(null)
  const activeDossierRef = useRef<string>('')
  const renameInputRef  = useRef<HTMLInputElement>(null)
  const lastClickedIdx  = useRef<number>(-1)

  // ── Données ────────────────────────────────────────────────────────────────
  const [profil,   setProfil]   = useState<any>(null)
  const [classe,   setClasse]   = useState<any>(null)
  const [dossiers, setDossiers] = useState<any[]>([])
  const [fichiers, setFichiers] = useState<any[]>([])
  const [lecons,   setLecons]   = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)

  // ── Explorateur ────────────────────────────────────────────────────────────
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null)
  const [expandedIds,       setExpandedIds]       = useState<Set<string>>(new Set())
  const [selectedItems,     setSelectedItems]     = useState<Set<string>>(new Set())
  const [previewItem,       setPreviewItem]       = useState<any>(null)
  const [viewMode,          setViewMode]          = useState<ViewMode>('large')
  const [sortBy,            setSortBy]            = useState<'nom' | 'date' | 'type' | 'taille'>('nom')
  const [searchQuery,       setSearchQuery]       = useState('')

  // ── Rename ─────────────────────────────────────────────────────────────────
  const [renamingId,   setRenamingId]   = useState<string | null>(null)
  const [renameValue,  setRenameValue]  = useState('')
  const [isFolder_ren, setIsFolderRen]  = useState(false)

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [isDragOver,        setIsDragOver]        = useState(false)
  const [uploading,         setUploading]         = useState(false)
  const [contextMenu,       setContextMenu]       = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)
  const [activeMenu,        setActiveMenu]        = useState<string | null>(null)
  const [toast,             setToast]             = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showAddMatiere,    setShowAddMatiere]    = useState(false)
  const [newMatiere,        setNewMatiere]        = useState('')
  const [newMatiereColor,   setNewMatiereColor]   = useState('#7F77DD')
  const [clipboard,         setClipboard]         = useState<{ items: any[]; mode: 'cut' | 'copy' } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const closeMenus = () => { setActiveMenu(null); setContextMenu(null) }

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await supabase.from('utilisateurs').select('*').eq('user_id', session.user.id).single()
      if (!p) { router.push('/login'); return }
      setProfil(p)

      const { data: cls } = await supabase.from('classes').select('*').eq('id', id).single()
      if (!cls) { router.push('/dashboard/classes'); return }
      setClasse(cls)

      const { data: dos } = await supabase.from('dossiers_systeme').select('*').eq('classe_id', id).order('ordre', { ascending: true })
      const dosList = dos || []
      setDossiers(dosList)

      const { data: lecs } = await supabase.from('lecons')
        .select('id,titre,sujet,statut,updated_at,type_document,duree_minutes,contenu_json,classe_id')
        .eq('classe_id', id).order('updated_at', { ascending: false })
      setLecons(lecs || [])

      const roots = dosList.filter((d: any) => !d.parent_id)
      if (roots.length > 0) {
        const first = roots[0].id
        setSelectedDossierId(first)
        activeDossierRef.current = first
        setExpandedIds(new Set(roots.map((d: any) => d.id)))
        const { data: fics } = await supabase.from('fichiers_dossier').select('*').eq('dossier_id', first).order('created_at', { ascending: false })
        setFichiers(fics || [])
      }
      setLoading(false)
    }
    init().catch(console.error)
  }, [id])

  // ── Setup webkitdirectory ──────────────────────────────────────────────────
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '')
      folderInputRef.current.setAttribute('directory', '')
    }
  }, [])

  // Focus rename input when activated
  useEffect(() => {
    if (renamingId) setTimeout(() => renameInputRef.current?.focus(), 50)
  }, [renamingId])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'F2' && selectedItems.size === 1) {
        const selId = Array.from(selectedItems)[0]
        const dos = dossiers.find(d => d.id === selId)
        if (dos) { setRenameValue(dos.nom); setIsFolderRen(true); setRenamingId(selId) }
        else {
          const fic = fileItems.find(f => f.id === selId)
          if (fic) { setRenameValue(fic.nom || fic.titre || ''); setIsFolderRen(false); setRenamingId(selId) }
        }
      }
      if (e.key === 'F5') loadFichiers(selectedDossierId || '')
      if (e.key === 'Escape') { setRenamingId(null); setContextMenu(null) }
      if (e.ctrlKey && e.key === 'a') { e.preventDefault(); setSelectedItems(new Set(fileItems.map(f => f.id))) }
      if (e.ctrlKey && e.key === 'c' && selectedItems.size > 0) {
        setClipboard({ items: fileItems.filter(f => selectedItems.has(f.id)), mode: 'copy' })
      }
      if (e.ctrlKey && e.key === 'x' && selectedItems.size > 0) {
        setClipboard({ items: fileItems.filter(f => selectedItems.has(f.id)), mode: 'cut' })
      }
      if (e.key === 'Delete' && selectedItems.size > 0) {
        fileItems.filter(f => selectedItems.has(f.id)).forEach(f => supprimerFichier(f))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedItems, dossiers, selectedDossierId])

  // ── Charger fichiers ───────────────────────────────────────────────────────
  const loadFichiers = useCallback(async (dossierId: string) => {
    if (!dossierId) return
    const { data } = await supabase.from('fichiers_dossier').select('*').eq('dossier_id', dossierId).order('created_at', { ascending: false })
    setFichiers((data || []).map(d => ({ ...d, url: d.url_storage })))
  }, [supabase])

  // ── Sélectionner dossier ───────────────────────────────────────────────────
  const selectDossier = useCallback(async (dossierId: string) => {
    setSelectedDossierId(dossierId)
    activeDossierRef.current = dossierId
    setSelectedItems(new Set())
    setPreviewItem(null)
    setSearchQuery('')
    await loadFichiers(dossierId)
  }, [loadFichiers])

  const toggleExpand = useCallback((dossierId: string) => {
    setExpandedIds(prev => { const n = new Set(prev); n.has(dossierId) ? n.delete(dossierId) : n.add(dossierId); return n })
  }, [])

  // ── Computed ───────────────────────────────────────────────────────────────
  const tree            = useMemo(() => buildTree(dossiers), [dossiers])
  const visibleNodes    = useMemo(() => flattenVisible(tree, expandedIds), [tree, expandedIds])
  const selectedDossier = useMemo(() => dossiers.find(d => d.id === selectedDossierId), [dossiers, selectedDossierId])
  const currentPath     = useMemo(() => getPath(dossiers, selectedDossierId), [dossiers, selectedDossierId])
  const subDossiers     = useMemo(
    () => dossiers.filter(d => d.parent_id === selectedDossierId).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)),
    [dossiers, selectedDossierId]
  )

  const fileItems = useMemo(() => {
    const q = searchQuery.toLowerCase()
    let items: any[] = []
    const t = selectedDossier?.type
    if (t === 'lecons') {
      const leconItems = lecons
        .filter(l => !['plan_lecon','plan_sequence','plan_annuel'].includes(l.type_document||''))
        .map(l => ({ ...l, _source: 'lecon', type_fichier: l.type_document || 'lecon' }))
      items = [...leconItems, ...fichiers]
    } else if (t === 'plans_lecons') {
      const leconItems = lecons
        .filter(l => ['plan_lecon','plan_sequence'].includes(l.type_document||''))
        .map(l => ({ ...l, _source: 'lecon', type_fichier: l.type_document || 'plan_lecon' }))
      items = [...leconItems, ...fichiers]
    } else if (t === 'plan_annuel') {
      const leconItems = lecons
        .filter(l => l.type_document === 'plan_annuel')
        .map(l => ({ ...l, _source: 'lecon', type_fichier: 'plan_annuel' }))
      items = [...leconItems, ...fichiers]
    } else {
      items = fichiers
    }
    if (q) items = items.filter(f => (f.nom || f.titre || '').toLowerCase().includes(q))
    return [...items].sort((a, b) => {
      if (sortBy === 'nom')    return (a.nom || a.titre || '').localeCompare(b.nom || b.titre || '')
      if (sortBy === 'date')   return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
      if (sortBy === 'type')   return (a.type_fichier || '').localeCompare(b.type_fichier || '')
      if (sortBy === 'taille') return (b.taille_bytes || 0) - (a.taille_bytes || 0)
      return 0
    })
  }, [selectedDossier, lecons, fichiers, searchQuery, sortBy])

  // ── Sélection item ─────────────────────────────────────────────────────────
  const handleItemClick = useCallback((e: React.MouseEvent, itemId: string, idx: number) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedItems(prev => { const n = new Set(prev); n.has(itemId) ? n.delete(itemId) : n.add(itemId); return n })
    } else if (e.shiftKey && lastClickedIdx.current >= 0) {
      const from = Math.min(lastClickedIdx.current, idx)
      const to   = Math.max(lastClickedIdx.current, idx)
      setSelectedItems(new Set(fileItems.slice(from, to + 1).map(f => f.id)))
    } else {
      setSelectedItems(new Set([itemId]))
      setPreviewItem(fileItems[idx])
    }
    lastClickedIdx.current = idx
  }, [fileItems])

  // ── Upload fichier ─────────────────────────────────────────────────────────
  const uploadFile = useCallback(async (file: File): Promise<boolean> => {
    if (!profil || !activeDossierRef.current) return false
    const dossierId = activeDossierRef.current
    const dossier   = dossiers.find(d => d.id === dossierId)
    if (!dossier) return false

    const nomNettoye = nettoyerNom(file.name)
    const path = `${profil.id}/${id}/${dossier.type || 'fichiers'}/${Date.now()}_${nomNettoye}`
    const { error: storageErr } = await supabase.storage.from('ressources').upload(path, file, { upsert: true })
    if (storageErr) { showToast('Erreur upload : ' + storageErr.message, 'error'); return false }

    const { data: urlData } = await supabase.storage.from('ressources').createSignedUrl(path, 365 * 24 * 3600)
    const url = urlData?.signedUrl || ''

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const extMap: Record<string, string> = {
      pdf: 'pdf', doc: 'document', docx: 'document', txt: 'document',
      png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image',
      mp4: 'video', mov: 'video', mp3: 'audio', wav: 'audio', m4a: 'audio',
      pptx: 'document', xlsx: 'document',
    }
    const type_fichier = dossier.type === 'curriculum' ? 'curriculum' : (extMap[ext] || 'document')
    const isCurriculum = dossier.type === 'curriculum'

    const { data: f, error: insertErr } = await supabase.from('fichiers_dossier').insert({
      dossier_id: dossierId, enseignant_id: profil.id, classe_id: id,
      nom: file.name.replace(/\.[^.]+$/, ''), type_fichier,
      taille_bytes: file.size, statut: 'valide', url_storage: url,
      indexe_studio_ia: isCurriculum,
      storage_path: path, mime_type: file.type || null,
    }).select().single()

    if (insertErr) { showToast('Erreur sauvegarde : ' + insertErr.message, 'error'); return false }
    if (f) f.url = url

    if (f?.id) {
      const { error: idxErr } = await supabase.from('fichiers_indexation').insert({
        fichier_id:    f.id,
        enseignant_id: profil.id,
        mime_type:     file.type || null,
        statut:        'en_attente',
      })
      if (idxErr) {
        console.error('[KLASSIA][DOCUMENTS][INDEXATION_INIT]', idxErr.message)
        showToast('Fichier sauvegardé — indexation IA différée', 'error')
      } else {
        // Déclencher l'extraction côté serveur (fire-and-forget).
        // Le fichier n'est pas renvoyé depuis le navigateur : la route le récupère depuis Storage.
        fetch('/api/documents/indexer', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ fichier_id: f.id }),
        })
          .then(r => r.json())
          .then((data: any) => {
            if (!data?.succes) {
              console.error('[KLASSIA][DOCUMENTS][EXTRACTION]', data?.error)
              showToast('Fichier sauvegardé, mais son contenu n\'est pas encore disponible pour l\'IA.', 'error')
            }
          })
          .catch((err: any) => {
            console.error('[KLASSIA][DOCUMENTS][EXTRACTION]', err?.message ?? err)
            showToast('Fichier sauvegardé, mais son contenu n\'est pas encore disponible pour l\'IA.', 'error')
          })
      }
    }

    if (isCurriculum && f) {
      await supabase.from('classes').update({ curriculum_charge: true }).eq('id', id)
      setClasse((prev: any) => ({ ...prev, curriculum_charge: true }))
      await supabase.from('studio_ia_memoire').upsert({
        enseignant_id: profil.id, classe_id: id,
        cle: `curriculum_${id}`, contenu: { nom: f.nom, type: 'curriculum', fichier_id: f.id, url },
        type: 'curriculum',
      }, { onConflict: 'enseignant_id,cle,type' })
    }

    if (f && profil?.id) {
      nourrirIA({ enseignant_id: profil.id, classe_id: id as string, source: isCurriculum ? 'curriculum' : 'upload_fichier', titre: f.nom || file.name, type: type_fichier, url_storage: url }).catch(() => {})
    }
    return true
  }, [profil, dossiers, id, supabase, showToast])

  // ── Upload multiple ────────────────────────────────────────────────────────
  const handleFilesUpload = useCallback(async (files: File[]) => {
    if (!files.length) return
    setUploading(true)
    activeDossierRef.current = activeDossierRef.current || selectedDossierId || ''
    let succes = 0
    for (const f of files) { if (await uploadFile(f)) succes++ }
    await loadFichiers(activeDossierRef.current)
    setUploading(false)
    if (succes > 0) showToast(`✓ ${succes} fichier${succes > 1 ? 's' : ''} importé${succes > 1 ? 's' : ''}`)
  }, [uploadFile, loadFichiers, selectedDossierId, showToast])

  // ── Drag and drop ──────────────────────────────────────────────────────────
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }
  const onDragLeave = (e: React.DragEvent) => { if (!contentAreaRef.current?.contains(e.relatedTarget as Node)) setIsDragOver(false) }
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false)
    const allFiles: File[] = []
    const items = Array.from(e.dataTransfer.items)
    for (const item of items) {
      const entry = (item as any).webkitGetAsEntry?.()
      if (!entry) continue
      const files = await readDirRecursive(entry)
      allFiles.push(...files)
    }
    if (allFiles.length > 0) await handleFilesUpload(allFiles)
    else for (const f of Array.from(e.dataTransfer.files)) await handleFilesUpload([f])
  }

  // ── Supprimer ──────────────────────────────────────────────────────────────
  const supprimerFichier = useCallback(async (fichier: any) => {
    if (!confirm(`Supprimer "${fichier.nom || fichier.titre}" ?`)) return
    if (fichier._source === 'lecon') {
      await supabase.from('lecons').delete().eq('id', fichier.id)
      setLecons(prev => prev.filter(l => l.id !== fichier.id))
    } else {
      await supabase.from('fichiers_dossier').delete().eq('id', fichier.id)
      await loadFichiers(activeDossierRef.current)
    }
    setSelectedItems(prev => { const n = new Set(prev); n.delete(fichier.id); return n })
    if (previewItem?.id === fichier.id) setPreviewItem(null)
    showToast('Fichier supprimé')
  }, [supabase, loadFichiers, previewItem, showToast])

  const supprimerDossier = useCallback(async (dossier: any) => {
    if (!confirm(`Supprimer le dossier "${dossier.nom}" et tout son contenu ?`)) return
    await supabase.from('dossiers_systeme').delete().eq('id', dossier.id)
    setDossiers(prev => prev.filter(d => d.id !== dossier.id))
    if (selectedDossierId === dossier.id) {
      const roots = dossiers.filter(d => !d.parent_id && d.id !== dossier.id)
      if (roots[0]) selectDossier(roots[0].id)
    }
    showToast('Dossier supprimé')
  }, [supabase, selectedDossierId, dossiers, selectDossier, showToast])

  // ── Ouvrir ─────────────────────────────────────────────────────────────────
  const openItem = useCallback((item: any) => {
    if (item._source === 'lecon') router.push(`/dashboard/classes/${id}/lecons/${item.id}`)
    else if (item.url) window.open(item.url, '_blank')
    else setPreviewItem(item)
  }, [router, id])

  // ── Rename ─────────────────────────────────────────────────────────────────
  const startRename = useCallback((item: any, isFolder: boolean) => {
    setRenameValue(item.nom || item.titre || '')
    setIsFolderRen(isFolder)
    setRenamingId(item.id)
  }, [])

  const confirmRename = useCallback(async () => {
    if (!renamingId || !renameValue.trim()) { setRenamingId(null); return }
    if (isFolder_ren) {
      await supabase.from('dossiers_systeme').update({ nom: renameValue.trim() }).eq('id', renamingId)
      setDossiers(prev => prev.map(d => d.id === renamingId ? { ...d, nom: renameValue.trim() } : d))
    } else {
      await supabase.from('fichiers_dossier').update({ nom: renameValue.trim() }).eq('id', renamingId)
      await loadFichiers(selectedDossierId || '')
    }
    setRenamingId(null)
    showToast('Renommé')
  }, [renamingId, renameValue, isFolder_ren, supabase, loadFichiers, selectedDossierId, showToast])

  // ── Nouveau dossier ────────────────────────────────────────────────────────
  const creerDossier = useCallback(async () => {
    if (!profil) return
    if (!selectedDossierId) {
      showToast('Sélectionnez d\'abord un dossier dans la sidebar', 'error')
      return
    }
    const nom = prompt('Nom du nouveau dossier :')
    if (!nom?.trim()) return
    try {
      const siblings  = dossiers.filter(d => d.parent_id === selectedDossierId)
      const maxOrdre  = siblings.length > 0 ? Math.max(...siblings.map(d => d.ordre || 0)) : 0
      const { data: nd, error } = await supabase.from('dossiers_systeme').insert({
        classe_id: id, enseignant_id: profil.id, nom: nom.trim(),
        type: 'custom', icone: '📁', couleur: '#94A3B8',
        ordre: maxOrdre + 1, parent_id: selectedDossierId,
      }).select().single()
      if (error) throw error
      if (nd) {
        setDossiers(prev => [...prev, nd])
        setExpandedIds(prev => new Set([...prev, selectedDossierId]))
        showToast('Dossier créé')
      }
    } catch (err: any) {
      showToast('Impossible de créer le dossier : ' + (err.message || 'erreur inconnue'), 'error')
    }
  }, [profil, selectedDossierId, dossiers, id, supabase, showToast])

  // ── Export ZIP ─────────────────────────────────────────────────────────────
  // ── Rendu HTML imprimable (tableaux + multimédia) ──────────────────────────
  const PRINT_STYLES = `
    body { font-family: Georgia,'Times New Roman',serif; font-size: 11pt; color: #000; line-height: 1.6; margin: 0; padding: 2cm; }
    .print-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20pt; padding-bottom: 10pt; border-bottom: 2pt solid #333; }
    .print-header .title { font-size: 18pt; font-weight: bold; color: #1a1a1a; }
    .print-header .meta  { font-size: 9pt; color: #555; margin-top: 4pt; }
    .print-header .logo  { font-size: 11pt; color: #7F77DD; font-weight: bold; }
    h1 { font-size: 16pt; color: #1a1a1a; margin: 16pt 0 8pt; page-break-after: avoid; }
    h2 { font-size: 13pt; color: #333; margin: 12pt 0 6pt; page-break-after: avoid; }
    h3 { font-size: 11pt; color: #444; margin: 8pt 0 4pt; page-break-after: avoid; }
    p  { margin: 5pt 0; }
    ul, ol { padding-left: 16pt; margin: 4pt 0; }
    li { margin: 2pt 0; }
    table { width: 100%; border-collapse: collapse; margin: 8pt 0; page-break-inside: avoid; font-size: 10pt; }
    th, td { border: 1pt solid #999; padding: 5pt 8pt; text-align: left; }
    th { background: #f0f0f0; }
    img, video { max-width: 100%; border-radius: 8pt; }
    .print-footer { margin-top: 24pt; padding-top: 8pt; border-top: 1pt solid #ccc; font-size: 8pt; color: #888; text-align: center; }
  `

  const renduQuizHtml = useCallback((questions: any[], titre: string): string => {
    const questionsHtml = questions.map((q, i) => `
      <div style="margin:10pt 0;page-break-inside:avoid;">
        <div style="font-weight:bold;">Question ${q.ordre ?? i + 1}</div>
        <div style="margin:3pt 0;">${q.enonce ?? ''}</div>
        ${(q.options ?? []).map((opt: string) => {
          const bonne = opt === q.bonne_reponse || (q.bonne_reponse && opt.startsWith(`${q.bonne_reponse})`))
          return `<div style="padding-left:10pt;${bonne ? 'color:#1D9E75;font-weight:bold;' : ''}">${bonne ? '✓ ' : '○ '}${opt}</div>`
        }).join('')}
        ${q.explication ? `<div style="color:#666;font-style:italic;margin-top:3pt;">💡 ${q.explication}</div>` : ''}
      </div>
    `).join('')
    return `<p>${questions.length} question${questions.length > 1 ? 's' : ''}</p>${questionsHtml}`
  }, [])

  const renduItemHtml = useCallback((item: any): string => {
    if (item.contenu_html) {
      return renderToStaticMarkup(<ReactMarkdown remarkPlugins={[remarkGfm]}>{item.contenu_html}</ReactMarkdown>)
    }
    if (item.contenu_json?.questions?.length) {
      return renduQuizHtml(item.contenu_json.questions, item.nom || item.titre || 'Quiz')
    }
    if (item.url && (item.type_fichier === 'image' || item.url.match(/\.(png|jpg|jpeg|gif|webp)/i))) {
      return `<img src="${item.url}" alt="${item.nom || ''}" />`
    }
    if (item.url && (item.type_fichier === 'video' || item.url.match(/\.(mp4|mov|webm)/i))) {
      return `<video src="${item.url}" controls></video>`
    }
    if (item.url && (item.type_fichier === 'audio' || item.url.match(/\.(mp3|wav|m4a)/i))) {
      return `<audio src="${item.url}" controls style="width:100%"></audio>`
    }
    if (item.url && item.url.includes('.pdf')) {
      return `<iframe src="${item.url}" style="width:100%;height:90vh;border:none"></iframe>`
    }
    if (item.sujet) return `<p>${item.sujet}</p>`
    return `<p style="color:#888">Aucun contenu à afficher.</p>`
  }, [renduQuizHtml])

  const imprimerFichier = useCallback((item: any) => {
    const fenetre = window.open('', '_blank')
    if (!fenetre) return
    const titre = item.nom || item.titre || 'Document'
    const date  = new Date().toLocaleDateString('fr-CA')
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>ScorgIA — ${titre}</title><style>${PRINT_STYLES}</style></head>
<body>
  <div class="print-header"><div><div class="title">${titre}</div><div class="meta">${date}</div></div><div class="logo">✦ ScorgIA</div></div>
  ${renduItemHtml(item)}
  <div class="print-footer">Généré par ScorgIA — scorgia.app</div>
</body></html>`
    fenetre.document.write(html)
    fenetre.document.close()
    setTimeout(() => { fenetre.focus(); fenetre.print() }, 400)
  }, [renduItemHtml])

  const ajouterAuZip = useCallback(async (zip: JSZip, fichier: any) => {
    if (fichier.contenu_html || fichier.contenu_json?.questions?.length) {
      const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${fichier.nom || 'Document'}</title><style>${PRINT_STYLES}</style></head><body>${renduItemHtml(fichier)}</body></html>`
      zip.file(`${fichier.nom || fichier.titre || 'document'}.html`, html)
      return true
    }
    if (fichier.url) {
      try {
        const blob = await fetch(fichier.url).then(r => r.blob())
        const ext  = fichier.url.split('.').pop()?.split('?')[0] || 'dat'
        zip.file(`${fichier.nom || fichier.titre || 'fichier'}.${ext}`, blob)
        return true
      } catch { return false }
    }
    return false
  }, [renduItemHtml])

  const exporterSelection = useCallback(async () => {
    const selected = fileItems.filter(f => selectedItems.has(f.id) && (f.url || f.contenu_html || f.contenu_json?.questions?.length))
    if (selected.length === 0) { showToast('Aucun fichier exportable sélectionné', 'error'); return }
    if (selected.length === 1 && selected[0].url && !selected[0].contenu_html && !selected[0].contenu_json?.questions?.length) { window.open(selected[0].url, '_blank'); return }
    showToast('Création du ZIP…')
    const zip = new JSZip()
    let n = 0
    for (const fichier of selected) { if (await ajouterAuZip(zip, fichier)) n++ }
    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, 'export-scorgia.zip')
    showToast(`${n} fichiers exportés`)
  }, [selectedItems, fileItems, ajouterAuZip, showToast])

  const exporterToutDossier = useCallback(async () => {
    const toExport = fileItems.filter(f => f.url || f.contenu_html || f.contenu_json?.questions?.length)
    if (toExport.length === 0) { showToast('Aucun fichier à exporter', 'error'); return }
    showToast('Création du ZIP…')
    const zip = new JSZip()
    let n = 0
    for (const fichier of toExport) { if (await ajouterAuZip(zip, fichier)) n++ }
    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, `${selectedDossier?.nom || 'dossier'}.zip`)
    showToast(`${n} fichiers exportés`)
  }, [fileItems, selectedDossier, ajouterAuZip, showToast])

  // ── Ajouter matière ────────────────────────────────────────────────────────
  const ajouterMatiere = useCallback(async () => {
    const mat = newMatiere.trim()
    if (!mat || !profil?.id) return
    try {
      // 1. Conteneur matière
      const { data: maxOrdre } = await supabase
        .from('dossiers_systeme')
        .select('ordre')
        .eq('classe_id', id)
        .eq('type', 'matiere')
        .order('ordre', { ascending: false })
        .limit(1)
        .single()
      const prochainOrdre = (maxOrdre?.ordre ?? 0) + 1

      const { data: matDos, error: e1 } = await supabase
        .from('dossiers_systeme')
        .insert({ classe_id: id, enseignant_id: profil.id, nom: mat, type: 'matiere', icone: '📚', couleur: newMatiereColor, ordre: prochainOrdre, parent_id: null, est_commun: false, matiere: mat })
        .select().single()
      if (e1) throw e1

      // 2. Préparation
      const { data: prepDos, error: e2 } = await supabase
        .from('dossiers_systeme')
        .insert({ classe_id: id, enseignant_id: profil.id, nom: 'Préparation', type: 'preparation', icone: '📝', couleur: newMatiereColor, ordre: 1, parent_id: matDos.id, est_commun: false, matiere: mat })
        .select().single()
      if (e2) throw e2

      // 3. Sous-dossiers de Préparation
      const { error: e3 } = await supabase.from('dossiers_systeme').insert([
        { classe_id: id, enseignant_id: profil.id, nom: 'Curriculum',      type: 'curriculum',   icone: '📋', couleur: newMatiereColor, ordre: 1, parent_id: prepDos.id, est_commun: false, matiere: mat },
        { classe_id: id, enseignant_id: profil.id, nom: 'Plan annuel',     type: 'plan_annuel',  icone: '📅', couleur: newMatiereColor, ordre: 2, parent_id: prepDos.id, est_commun: false, matiere: mat },
        { classe_id: id, enseignant_id: profil.id, nom: 'Plans de leçons', type: 'plans_lecons', icone: '📄', couleur: newMatiereColor, ordre: 3, parent_id: prepDos.id, est_commun: false, matiere: mat },
      ])
      if (e3) throw e3

      // 4. Leçons, Évaluations, Ressources
      const { error: e4 } = await supabase.from('dossiers_systeme').insert([
        { classe_id: id, enseignant_id: profil.id, nom: 'Leçons',                 type: 'lecons',                icone: '🎓', couleur: newMatiereColor, ordre: 2, parent_id: matDos.id, est_commun: false, matiere: mat },
        { classe_id: id, enseignant_id: profil.id, nom: 'Évaluations sommatives', type: 'evaluations_sommatives', icone: '📊', couleur: newMatiereColor, ordre: 3, parent_id: matDos.id, est_commun: false, matiere: mat },
        { classe_id: id, enseignant_id: profil.id, nom: 'Ressources',             type: 'ressources',             icone: '📚', couleur: newMatiereColor, ordre: 4, parent_id: matDos.id, est_commun: false, matiere: mat },
      ])
      if (e4) throw e4

      // 5. Mettre à jour classes.matieres
      const curMatieres: string[] = classe?.matieres || []
      await supabase.from('classes').update({
        matieres: curMatieres.includes(mat) ? curMatieres : [...curMatieres, mat],
      }).eq('id', id)

      // 6. Refresh arbre + ouvrir la nouvelle matière
      const { data: dos } = await supabase.from('dossiers_systeme').select('*').eq('classe_id', id).order('ordre', { ascending: true })
      setDossiers(dos || [])
      setExpandedIds(prev => new Set([...prev, matDos.id]))
      selectDossier(prepDos.id)
      setShowAddMatiere(false)
      setNewMatiere('')
      showToast(`Matière "${mat}" ajoutée`)
    } catch (err: any) {
      showToast('Impossible d\'ajouter la matière : ' + (err.message || 'erreur inconnue'), 'error')
    }
  }, [newMatiere, newMatiereColor, profil, id, supabase, showToast, classe, selectDossier])

  // ── Context menus ─────────────────────────────────────────────────────────
  const openContextMenuFile = (e: React.MouseEvent, item: any) => {
    e.preventDefault(); e.stopPropagation()
    const isLec = !!item._source
    setContextMenu({
      x: e.clientX, y: e.clientY, items: [
        { label: isLec ? '✏️ Ouvrir dans l\'éditeur' : '🔍 Aperçu rapide', onClick: () => isLec ? openItem(item) : setPreviewItem(item) },
        ...(isLec ? [{ label: '📂 Ouvrir', onClick: () => openItem(item) }] : []),
        'separator',
        { label: '✂️ Couper', shortcut: 'Ctrl+X', onClick: () => setClipboard({ items: [item], mode: 'cut' }) },
        { label: '📋 Copier', shortcut: 'Ctrl+C', onClick: () => setClipboard({ items: [item], mode: 'copy' }) },
        'separator',
        { label: '✏️ Renommer', shortcut: 'F2', onClick: () => startRename(item, false) },
        'separator',
        ...(item.url ? [{ label: '📥 Télécharger', onClick: () => window.open(item.url, '_blank') }] : []),
        { label: '🖨️ Imprimer', onClick: () => imprimerFichier(item) },
        'separator',
        { label: '🗑 Supprimer', shortcut: 'Suppr', onClick: () => supprimerFichier(item), danger: true },
      ],
    })
  }

  const openContextMenuFolder = (e: React.MouseEvent, dos: any) => {
    e.preventDefault(); e.stopPropagation()
    setContextMenu({
      x: e.clientX, y: e.clientY, items: [
        { label: '📂 Ouvrir', onClick: () => selectDossier(dos.id) },
        'separator',
        { label: '✏️ Renommer', onClick: () => startRename(dos, true) },
        'separator',
        { label: '📁 Nouveau sous-dossier', onClick: () => { setSelectedDossierId(dos.id); creerDossier() } },
        { label: '📦 Exporter le dossier (ZIP)', onClick: exporterToutDossier },
        'separator',
        { label: '🗑 Supprimer', onClick: () => supprimerDossier(dos), danger: true },
      ],
    })
  }

  const openContextMenuEmpty = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX, y: e.clientY, items: [
        { label: '📁 Nouveau dossier', shortcut: 'Ctrl+Maj+N', onClick: creerDossier },
        'separator',
        { label: '⬆️ Importer des fichiers', onClick: () => fileInputRef.current?.click() },
        { label: '📂 Importer un dossier', onClick: () => folderInputRef.current?.click() },
        'separator',
        { label: '✦ Générer avec l\'IA', onClick: () => router.push(`/dashboard/studio-ia?classe_id=${id}`) },
        'separator',
        { label: '↕ Trier par nom',   onClick: () => setSortBy('nom')    },
        { label: '↕ Trier par date',  onClick: () => setSortBy('date')   },
        { label: '↕ Trier par type',  onClick: () => setSortBy('type')   },
        { label: '↕ Trier par taille',onClick: () => setSortBy('taille') },
        'separator',
        { label: '🔄 Actualiser', shortcut: 'F5', onClick: () => loadFichiers(selectedDossierId || '') },
      ],
    })
  }


  if (loading) return <LoadingScreen />

  // ── Menu bar items ────────────────────────────────────────────────────────
  const menuFichier: MenuItem[] = [
    { label: '📁 Nouveau dossier',             shortcut: 'Ctrl+Maj+N', onClick: creerDossier },
    { label: '📄 Nouveau fichier texte',                                onClick: async () => {
      const nom = prompt('Nom du fichier :'); if (!nom) return
      const blob = new Blob([''], { type: 'text/plain' })
      await handleFilesUpload([new File([blob], nom + '.txt', { type: 'text/plain' })])
    }},
    'separator',
    { label: '⬆️ Importer des fichiers…',                              onClick: () => fileInputRef.current?.click() },
    { label: '📂 Importer un dossier complet…',                        onClick: () => folderInputRef.current?.click() },
    'separator',
    { label: '✦ Générer avec l\'IA…',                                  onClick: () => router.push(`/dashboard/gerer/preparer?classe_id=${id}`) },
    'separator',
    { label: '📦 Exporter la sélection…',                              onClick: exporterSelection },
    { label: '📦 Exporter tout le dossier…',                           onClick: exporterToutDossier },
    'separator',
    { label: '🖨️ Imprimer',                   shortcut: 'Ctrl+P',     onClick: () => previewItem && imprimerFichier(previewItem) },
  ]

  const menuEdition: MenuItem[] = [
    { label: '✂️ Couper',          shortcut: 'Ctrl+X', onClick: () => { if (selectedItems.size > 0) setClipboard({ items: fileItems.filter(f => selectedItems.has(f.id)), mode: 'cut' }) } },
    { label: '📋 Copier',          shortcut: 'Ctrl+C', onClick: () => { if (selectedItems.size > 0) setClipboard({ items: fileItems.filter(f => selectedItems.has(f.id)), mode: 'copy' }) } },
    { label: '📌 Coller',          shortcut: 'Ctrl+V', onClick: () => showToast('Fonctionnalité à venir') },
    'separator',
    { label: '☑ Sélectionner tout', shortcut: 'Ctrl+A', onClick: () => setSelectedItems(new Set(fileItems.map(f => f.id))) },
    { label: '☐ Désélectionner',                       onClick: () => setSelectedItems(new Set()) },
    'separator',
    { label: '✏️ Renommer',         shortcut: 'F2',    onClick: () => { if (selectedItems.size === 1) { const sel = fileItems.find(f => f.id === Array.from(selectedItems)[0]); if (sel) startRename(sel, false) } } },
    { label: '🗑 Supprimer',        shortcut: 'Suppr', onClick: () => fileItems.filter(f => selectedItems.has(f.id)).forEach(supprimerFichier), danger: true },
  ]

  const menuAffichage: MenuItem[] = [
    { label: (viewMode === 'large'   ? '● ' : '○ ') + 'Grandes icônes', onClick: () => setViewMode('large')   },
    { label: (viewMode === 'small'   ? '● ' : '○ ') + 'Petites icônes', onClick: () => setViewMode('small')   },
    { label: (viewMode === 'list'    ? '● ' : '○ ') + 'Liste',           onClick: () => setViewMode('list')    },
    { label: (viewMode === 'details' ? '● ' : '○ ') + 'Détails',         onClick: () => setViewMode('details') },
    'separator',
    { label: (sortBy === 'nom'    ? '✓ ' : '') + 'Trier par : Nom',    onClick: () => setSortBy('nom')    },
    { label: (sortBy === 'date'   ? '✓ ' : '') + 'Trier par : Date',   onClick: () => setSortBy('date')   },
    { label: (sortBy === 'type'   ? '✓ ' : '') + 'Trier par : Type',   onClick: () => setSortBy('type')   },
    { label: (sortBy === 'taille' ? '✓ ' : '') + 'Trier par : Taille', onClick: () => setSortBy('taille') },
    'separator',
    { label: '🔄 Actualiser', shortcut: 'F5', onClick: () => loadFichiers(selectedDossierId || '') },
  ]

  const menuOutils: MenuItem[] = [
    { label: '✦ Générer avec l\'IA', onClick: () => router.push(`/dashboard/studio-ia?classe_id=${id}`) },
    'separator',
    { label: '📊 Statistiques', onClick: () => alert(`${lecons.length} leçons · ${fichiers.length} fichiers`) },
    { label: '➕ Ajouter une matière', onClick: () => setShowAddMatiere(true) },
  ]

  // ── Render item (avec rename inline) ──────────────────────────────────────
  const renderRenameInput = (item: any) => (
    <input
      ref={renameInputRef}
      value={renameValue}
      onChange={e => setRenameValue(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingId(null) }}
      onBlur={confirmRename}
      onClick={e => e.stopPropagation()}
      style={{ fontSize: 11, padding: '2px 5px', borderRadius: 4, border: '1.5px solid var(--color-accent-violet)', background: 'var(--color-input-bg)', color: 'var(--color-text-primary)', outline: 'none', width: '100%', fontFamily: 'inherit' }}
    />
  )

  // ── Large/small icons ──────────────────────────────────────────────────────
  const iconSize = viewMode === 'large' ? 96 : 64
  const fontSize = viewMode === 'large' ? 36 : 26

  return (
    <div
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-primary)', overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif" }}
      onClick={closeMenus}
    >

      {/* ══ BARRE DE MENUS WINDOWS ══════════════════════════════════════════ */}
      <div style={{ height: 26, flexShrink: 0, background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-separator)', display: 'flex', alignItems: 'center', padding: '0 4px', gap: 0 }}>
        {[
          { key: 'fichier',   label: 'Fichier',    items: menuFichier   },
          { key: 'edition',   label: 'Édition',    items: menuEdition   },
          { key: 'affichage', label: 'Affichage',  items: menuAffichage },
          { key: 'outils',    label: 'Outils',     items: menuOutils    },
        ].map(menu => (
          <div key={menu.key} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setActiveMenu(activeMenu === menu.key ? null : menu.key)}
              style={{
                padding: '3px 10px', fontSize: 12, background: activeMenu === menu.key ? 'var(--color-bg-active)' : 'none',
                border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
                borderRadius: 4, height: 22,
              }}
              onMouseEnter={e => { if (activeMenu && activeMenu !== menu.key) { setActiveMenu(menu.key); (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-active)' } else (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-hover)' }}
              onMouseLeave={e => { if (activeMenu !== menu.key) (e.currentTarget as HTMLElement).style.background = 'none' }}
            >
              {menu.label}
            </button>
            {activeMenu === menu.key && <WinMenuPopup items={menu.items} onClose={() => setActiveMenu(null)} />}
          </div>
        ))}
      </div>

      {/* ══ HEADER glass-strong bandeau ══════════════════════════════════════ */}
      <div className="glass-strong" style={{ flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.12)', position: 'relative', overflow: 'hidden' }}>
        {/* Color accent strip from classe.couleur */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: classe?.couleur || 'var(--violet)', opacity: 0.85 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 10px' }}>
          <button onClick={() => router.push('/dashboard/classes')}
            style={{ background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.15)', cursor: 'pointer', color: 'var(--violet)', fontWeight: 600, fontSize: 12, padding: '5px 10px', borderRadius: 8, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            ← Mes classes
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: 12, flexShrink: 0 }}>/</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: classe?.couleur || 'var(--violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#FFF', flexShrink: 0, boxShadow: `0 2px 8px ${classe?.couleur || 'var(--violet)'}44` }}>
              {classe?.nom?.[0]?.toUpperCase()}
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
              {classe?.nom}
            </span>
            {currentPath.map((d: any, i: number) => (
              <span key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>›</span>
                <span onClick={() => selectDossier(d.id)}
                  style={{ fontSize: 12, cursor: 'pointer', color: i === currentPath.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: i === currentPath.length - 1 ? 600 : 400 }}>
                  {d.nom}
                </span>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {classe?.curriculum_charge && (
              <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 99, background: 'rgba(52,211,153,.15)', color: '#34D399', border: '1px solid rgba(52,211,153,.25)', fontWeight: 700 }}>✓ Curriculum</span>
            )}
            {classe?.niveau && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{classe.niveau}{classe.matiere ? ` · ${classe.matiere}` : ''}</span>
            )}
            {selectedItems.size > 1 && (
              <span style={{ fontSize: 11, color: 'var(--violet)', fontWeight: 600 }}>{selectedItems.size} sélectionnés</span>
            )}
            {selectedItems.size > 0 && (
              <button onClick={exporterSelection}
                style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(15,35,65,0.1)', background: 'rgba(15,35,65,0.04)', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                📦 Exporter
              </button>
            )}
            {uploading && <span style={{ fontSize: 11, color: 'var(--violet)' }}>⏳ Import…</span>}
            <input
              type="text" placeholder="🔍 Rechercher…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12, border: '1px solid rgba(15,35,65,0.1)', background: 'rgba(255,255,255,0.7)', color: 'var(--text-primary)', outline: 'none', width: 160, fontFamily: 'inherit' }}
            />
            <button onClick={() => router.push(`/dashboard/classes/${id}/programme`)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(127,119,221,0.4)', background: 'rgba(127,119,221,0.08)', color: '#7F77DD', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              🗓️ Mon année
            </button>
            <button onClick={() => {
                const mat = selectedDossier?.matiere
                router.push(`/dashboard/gerer/preparer?classe_id=${id}${mat ? `&matiere=${encodeURIComponent(mat)}` : ''}`)
              }}
              style={{ padding: '6px 14px', borderRadius: 8, background: 'linear-gradient(135deg, #7F77DD, #4F46E5)', border: 'none', color: '#FFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(108,92,231,0.35)' }}>
              ✦ Préparer
            </button>
          </div>
        </div>
      </div>

      {/* ══ CORPS ════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── ARBRE GAUCHE ─────────────────────────────────────────────── */}
        <div style={{ width: 248, flexShrink: 0, background: 'var(--color-bg-secondary)', borderRight: '1.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--color-separator)', flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
              <FolderSVG color="#7F77DD" size={18} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{classe?.nom}</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 3 }}>
              {lecons.length} leçon{lecons.length !== 1 ? 's' : ''} · {dossiers.filter(d => !d.parent_id).length} dossiers
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
            {visibleNodes.map(({ node, level }) => {
              const isSel   = node.id === selectedDossierId
              const isExp   = expandedIds.has(node.id)
              const hasKids = node.children?.length > 0
              const color   = getDossierColor(node.type, node.couleur)
              return (
                <div key={node.id} style={{ paddingLeft: 8 + level * 14 }}>
                  <div onClick={() => { selectDossier(node.id); if (hasKids) toggleExpand(node.id) }}
                    onContextMenu={e => openContextMenuFolder(e, node)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px 5px 4px', margin: '1px 4px', borderRadius: 6, cursor: 'pointer', background: isSel ? 'var(--color-sidebar-active-bg)' : 'transparent', color: isSel ? 'var(--color-accent-violet)' : 'var(--color-sidebar-text)', fontWeight: isSel ? 600 : 400, fontSize: 12, transition: 'background .12s' }}
                    onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-hover)' }}
                    onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    <span onClick={e => { e.stopPropagation(); if (hasKids) toggleExpand(node.id) }} style={{ width: 11, flexShrink: 0, fontSize: 7, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                      {hasKids ? (isExp ? '▼' : '▶') : ''}
                    </span>
                    <FolderSVG color={color} size={16} />
                    {renamingId === node.id
                      ? renderRenameInput(node)
                      : <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.nom}</span>
                    }
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer sidebar */}
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--color-separator)', flexShrink: 0 }}>
            <CadenasForFait
              fonctionnalite="classes_illimitees"
              forfait_actuel={profil?.forfait || 'gratuit'}
              bloque={!peutAjouterMatiere(profil, dossiers.filter(d => d.type === 'matiere' && !d.parent_id).length)}
              messageCustom="Limite de matières atteinte pour votre forfait"
              forfait_cible="pro"
            >
              <button onClick={() => setShowAddMatiere(true)}
                style={{ width: '100%', padding: '6px', borderRadius: 7, border: '1px dashed var(--color-border)', background: 'none', color: 'var(--color-accent-violet)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                ➕ Ajouter une matière
              </button>
            </CadenasForFait>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 6, lineHeight: 1.7 }}>
              <div>{lecons.length} leçon{lecons.length !== 1 ? 's' : ''}</div>
              {classe?.curriculum_charge && <div style={{ color: '#34D399', fontWeight: 700 }}>✓ Curriculum chargé</div>}
            </div>
          </div>
        </div>

        {/* ── ZONE CONTENU ──────────────────────────────────────────────── */}
        <div
          ref={contentAreaRef}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onContextMenu={e => { if (e.target === contentAreaRef.current || (e.currentTarget as HTMLElement).contains(e.target as Node)) openContextMenuEmpty(e) }}
        >
          {/* Scrollable content */}
          <div style={{ flex: 1, overflow: 'auto', padding: 14 }} onClick={e => { if (e.target === e.currentTarget) setSelectedItems(new Set()) }}>

            {/* Sous-dossiers */}
            {subDossiers.length > 0 && (
              <div style={{ marginBottom: fileItems.length > 0 ? 16 : 0 }}>
                {viewMode === 'details' ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 8 }}>
                    <tbody>
                      {subDossiers.map(dos => {
                        const col = getDossierColor(dos.type, dos.couleur)
                        return (
                          <tr key={dos.id} onDoubleClick={() => selectDossier(dos.id)} onContextMenu={e => openContextMenuFolder(e, dos)}
                            style={{ cursor: 'pointer', borderBottom: '1px solid var(--color-separator)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <FolderSVG color={col} size={18} />
                              {renamingId === dos.id ? renderRenameInput(dos) : <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{dos.nom}</span>}
                            </td>
                            <td style={{ padding: '7px 10px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Dossier</td>
                            <td style={{ padding: '7px 10px', color: 'var(--color-text-muted)' }}>—</td>
                            <td style={{ padding: '7px 10px', color: 'var(--color-text-muted)' }}>—</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                ) : viewMode === 'list' ? (
                  subDossiers.map(dos => {
                    const col = getDossierColor(dos.type, dos.couleur)
                    return (
                      <div key={dos.id} onDoubleClick={() => selectDossier(dos.id)} onContextMenu={e => openContextMenuFolder(e, dos)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', marginBottom: 2 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <FolderSVG color={col} size={18} />
                        {renamingId === dos.id ? renderRenameInput(dos) : <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-primary)' }}>{dos.nom}</span>}
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Dossier</span>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${iconSize}px, 1fr))`, gap: 6, marginBottom: 8 }}>
                    {subDossiers.map(dos => {
                      const col = getDossierColor(dos.type, dos.couleur)
                      return (
                        <div key={dos.id} onDoubleClick={() => selectDossier(dos.id)} onContextMenu={e => openContextMenuFolder(e, dos)}
                          style={{ padding: viewMode === 'large' ? '10px 6px 8px' : '7px 5px 6px', textAlign: 'center', borderRadius: 8, cursor: 'pointer', border: '1.5px solid transparent', transition: 'all .12s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${col}10`; (e.currentTarget as HTMLElement).style.borderColor = `${col}55` }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 5 }}>
                            <FolderSVG color={col} size={viewMode === 'large' ? 44 : 30} />
                          </div>
                          {renamingId === dos.id
                            ? renderRenameInput(dos)
                            : <div style={{ fontSize: viewMode === 'large' ? 11 : 10, color: 'var(--color-text-primary)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{dos.nom}</div>
                          }
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Fichiers */}
            {fileItems.length === 0 && subDossiers.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <FolderSVG color={getDossierColor(selectedDossier?.type || '')} size={64} />
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8, marginTop: 14 }}>Ce dossier est vide</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                  Glissez-déposez des fichiers ici, ou utilisez le menu Fichier.
                </div>
              </div>

            ) : viewMode === 'details' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--color-border)' }}>
                    {['Nom', 'Type', 'Statut', 'Date modif.', 'Taille'].map(col => (
                      <th key={col} style={{ padding: '5px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '.5px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fileItems.map((file: any, idx: number) => {
                    const isSel  = selectedItems.has(file.id)
                    const nom    = file.nom || file.titre || 'Sans titre'
                    const icon   = getFileIcon(file.type_fichier || '')
                    const statut = STATUT_INFO[file.statut || '']
                    return (
                      <tr key={file.id}
                        onClick={e => handleItemClick(e, file.id, idx)}
                        onDoubleClick={() => openItem(file)}
                        onContextMenu={e => openContextMenuFile(e, file)}
                        style={{ borderBottom: '1px solid var(--color-separator)', cursor: 'pointer', background: isSel ? 'var(--color-bg-active)' : 'transparent', transition: 'background .12s' }}
                        onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--color-bg-hover)' }}
                        onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}>
                        <td style={{ padding: '7px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 15, color: getFileColor(file.type_fichier) }}>{icon}</span>
                            {renamingId === file.id ? renderRenameInput(file)
                              : <span style={{ color: 'var(--color-text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{nom}</span>}
                          </div>
                        </td>
                        <td style={{ padding: '7px 10px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{file.type_fichier || '—'}</td>
                        <td style={{ padding: '7px 10px' }}>
                          {statut ? <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: statut.bg, color: statut.color }}>{statut.label}</span>
                            : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding: '7px 10px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{formatDate(file.updated_at || file.created_at)}</td>
                        <td style={{ padding: '7px 10px', color: 'var(--color-text-muted)' }}>{formatBytes(file.taille_bytes)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

            ) : viewMode === 'list' ? (
              fileItems.map((file: any, idx: number) => {
                const isSel = selectedItems.has(file.id)
                const nom   = file.nom || file.titre || 'Sans titre'
                const icon  = getFileIcon(file.type_fichier || '')
                return (
                  <div key={file.id}
                    onClick={e => handleItemClick(e, file.id, idx)}
                    onDoubleClick={() => openItem(file)}
                    onContextMenu={e => openContextMenuFile(e, file)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', background: isSel ? 'var(--color-bg-active)' : 'transparent', marginBottom: 2, transition: 'background .12s' }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--color-bg-hover)' }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}>
                    <span style={{ fontSize: 15, color: getFileColor(file.type_fichier) }}>{icon}</span>
                    {renamingId === file.id ? renderRenameInput(file)
                      : <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nom}</span>}
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', flexShrink: 0 }}>{formatDate(file.updated_at || file.created_at)}</span>
                  </div>
                )
              })

            ) : (
              /* Grandes / petites icônes */
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${iconSize}px, 1fr))`, gap: 6 }}>
                {fileItems.map((file: any, idx: number) => {
                  const isSel  = selectedItems.has(file.id)
                  const nom    = file.nom || file.titre || 'Sans titre'
                  const icon   = getFileIcon(file.type_fichier || '')
                  const color  = getFileColor(file.type_fichier || '')
                  const statut = STATUT_INFO[file.statut || '']
                  return (
                    <div key={file.id}
                      onClick={e => handleItemClick(e, file.id, idx)}
                      onDoubleClick={() => openItem(file)}
                      onContextMenu={e => openContextMenuFile(e, file)}
                      style={{ padding: viewMode === 'large' ? '10px 6px 8px' : '7px 5px 6px', textAlign: 'center', borderRadius: 8, cursor: 'pointer', userSelect: 'none', border: `1.5px solid ${isSel ? 'var(--color-accent-violet)' : 'transparent'}`, background: isSel ? 'var(--color-sidebar-active-bg)' : 'transparent', transition: 'all .12s' }}
                      onMouseEnter={e => { if (!isSel) { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-hover)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)' } }}
                      onMouseLeave={e => { if (!isSel) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent' } }}>
                      <div style={{ fontSize, marginBottom: 6, color, lineHeight: 1 }}>{icon}</div>
                      {renamingId === file.id ? renderRenameInput(file) : (
                        <div style={{ fontSize: viewMode === 'large' ? 11 : 10, color: 'var(--color-text-primary)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{nom}</div>
                      )}
                      {statut && viewMode === 'large' && (
                        <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center' }}>
                          <span style={{ padding: '1px 6px', borderRadius: 99, fontSize: 8, fontWeight: 700, background: statut.bg, color: statut.color }}>{statut.label}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── PANNEAU APERÇU ───────────────────────────────────────────── */}
        {previewItem && (
          <div className="class-preview-panel" style={{ width: 300, flexShrink: 0, background: 'var(--color-bg-secondary)', borderLeft: '1.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-separator)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 24, color: getFileColor(previewItem.type_fichier || '') }}>{getFileIcon(previewItem.type_fichier || '')}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {previewItem.nom || previewItem.titre || 'Sans titre'}
                    </div>
                    {STATUT_INFO[previewItem.statut] && (
                      <span style={{ padding: '1px 7px', borderRadius: 99, fontSize: 9, fontWeight: 700, background: STATUT_INFO[previewItem.statut].bg, color: STATUT_INFO[previewItem.statut].color }}>
                        {STATUT_INFO[previewItem.statut].label}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => { setPreviewItem(null); setSelectedItems(new Set()) }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 18, padding: '0 2px', flexShrink: 0, lineHeight: 1 }}>×</button>
              </div>
            </div>

            {/* Méta */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-separator)', flexShrink: 0 }}>
              {[
                { label: 'Type',   value: previewItem.type_fichier || '—' },
                { label: 'Date',   value: formatDate(previewItem.updated_at || previewItem.created_at) },
                { label: 'Taille', value: formatBytes(previewItem.taille_bytes) },
              ].map(m => (
                <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11 }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{m.label}</span>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{m.value}</span>
                </div>
              ))}
            </div>

            {/* Contenu */}
            <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
              {previewItem.contenu_html ? (
                <MarkdownRenderer content={previewItem.contenu_html} />
              ) : previewItem.sujet ? (
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{previewItem.sujet}</div>
              ) : previewItem.url && (previewItem.type_fichier === 'image' || previewItem.url.match(/\.(png|jpg|jpeg|gif|webp)/i)) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewItem.url} alt={previewItem.nom} style={{ width: '100%', borderRadius: 8, objectFit: 'contain', maxHeight: 240 }} />
              ) : previewItem.url && (previewItem.type_fichier === 'video' || previewItem.url.match(/\.(mp4|mov|webm)/i)) ? (
                <video src={previewItem.url} controls style={{ width: '100%', borderRadius: 8, maxHeight: 240 }} />
              ) : previewItem.url && (previewItem.type_fichier === 'audio' || previewItem.url.match(/\.(mp3|wav|m4a)/i)) ? (
                <audio src={previewItem.url} controls style={{ width: '100%' }} />
              ) : previewItem.url && previewItem.url.includes('.pdf') ? (
                <iframe src={previewItem.url} style={{ width: '100%', height: 300, border: 'none', borderRadius: 8 }} />
              ) : (
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', padding: '30px 0' }}>Aucun aperçu disponible</div>
              )}
            </div>

            {/* Actions */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--color-separator)', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
              <button onClick={() => openItem(previewItem)}
                style={{ width: '100%', padding: '8px', borderRadius: 8, background: 'linear-gradient(135deg, #6B3FA0, #4F46E5)', border: 'none', color: '#FFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                ✏️ Ouvrir et modifier
              </button>
              <div style={{ display: 'flex', gap: 6 }}>
                {previewItem.url && (
                  <button onClick={() => window.open(previewItem.url, '_blank')}
                    style={{ flex: 1, padding: '6px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                    📥 Télécharger
                  </button>
                )}
                <button onClick={() => imprimerFichier(previewItem)}
                  style={{ flex: 1, padding: '6px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🖨️ Imprimer
                </button>
              </div>
              <button onClick={() => supprimerFichier(previewItem)}
                style={{ width: '100%', padding: '6px', borderRadius: 6, border: '1px solid rgba(248,113,113,.3)', background: 'rgba(248,113,113,.08)', color: '#F87171', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                🗑 Supprimer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Context menu ─────────────────────────────────────────────────── */}
      {contextMenu && (
        <ContextMenuPopup x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />
      )}

      {/* ── Drag overlay ──────────────────────────────────────────────────── */}
      {isDragOver && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 200, pointerEvents: 'none', background: 'rgba(127,119,221,.12)', border: '3px dashed var(--color-accent-violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 52 }}>📂</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-accent-violet)' }}>Déposez pour importer</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>dans {selectedDossier?.nom || 'ce dossier'}</div>
        </div>
      )}

      {/* ── Modal Ajouter matière ──────────────────────────────────────── */}
      {showAddMatiere && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 699 }} onClick={() => setShowAddMatiere(false)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--color-bg-card)', border: '1.5px solid var(--color-border)', borderRadius: 14, padding: 28, width: 'min(360px, calc(100vw - 32px))', zIndex: 700, boxShadow: 'var(--shadow-modal)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 20, margin: '0 0 20px' }}>➕ Ajouter une matière</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 5 }}>Nom de la matière</label>
              <input value={newMatiere} onChange={e => setNewMatiere(e.target.value)} onKeyDown={e => e.key === 'Enter' && ajouterMatiere()}
                placeholder="ex: Mathématiques, Français, Sciences…"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-input-bg)', color: 'var(--color-text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 5 }}>Couleur</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['#7F77DD', '#34D399', '#F87171', '#FB923C', '#60A5FA', '#F472B6', '#A78BFA', '#EF9F27'].map(c => (
                  <div key={c} onClick={() => setNewMatiereColor(c)}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: newMatiereColor === c ? '3px solid white' : '2px solid transparent', boxShadow: newMatiereColor === c ? `0 0 0 2px ${c}` : 'none', transition: 'all .15s' }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAddMatiere(false)}
                style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'none', color: 'var(--color-text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Annuler
              </button>
              <button onClick={ajouterMatiere} disabled={!newMatiere.trim()}
                style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #7F77DD, #4F46E5)', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: newMatiere.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: newMatiere.trim() ? 1 : .5 }}>
                Ajouter
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* ── Inputs cachés ──────────────────────────────────────────────────── */}
      <input ref={fileInputRef} type="file" multiple accept="*/*" style={{ display: 'none' }}
        onChange={async e => {
          activeDossierRef.current = activeDossierRef.current || selectedDossierId || ''
          await handleFilesUpload(Array.from(e.target.files || []))
          e.target.value = ''
        }} />
      <input ref={folderInputRef} type="file" multiple style={{ display: 'none' }}
        onChange={async e => {
          activeDossierRef.current = activeDossierRef.current || selectedDossierId || ''
          await handleFilesUpload(Array.from(e.target.files || []))
          e.target.value = ''
        }} />
      <input ref={curriculumRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
        onChange={async e => {
          const f = e.target.files?.[0]; if (f) await handleFilesUpload([f]); e.target.value = ''
        }} />
    </div>
  )
}
