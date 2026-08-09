'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Z } from '@/lib/constants/z-index'

// ─── Types exportés ───────────────────────────────────────────────────────────

export interface FichierKlassia {
  id:                 string
  nom:                string
  type_fichier:       string
  mime_type?:         string | null
  classe_id:          string
  classe_nom:         string
  matiere?:           string | null
  dossier_id:         string
  dossier_nom:        string
  statut_indexation?: string | null
  source:             'klassia'
}

// ─── Types internes ───────────────────────────────────────────────────────────

interface ClasseInfo {
  id:       string
  nom:      string
  niveau?:  string
  matiere?: string
  matieres?: string[]
}

interface DossierItem {
  id:        string
  nom:       string
  type:      string
  est_commun: boolean
  matiere:   string | null
  parent_id: string | null
  icone:     string | null
  ordre:     number
}

interface FichierPickerItem {
  id:           string
  nom:          string
  nom_auto:     string | null
  type_fichier: string
  mime_type:    string | null
  taille_bytes: number | null
  statut:       string
  created_at:   string
  updated_at:   string
  classe_id:    string | null
  dossier_id:   string | null
  url_storage:  string | null
  est_ia:       boolean
  indexation_statut: string | null
  indexation_erreur: string | null
}

type FilterType = 'all' | 'pdf' | 'word' | 'presentation' | 'tableur' | 'image' | 'audio' | 'video' | 'klassia'

interface Props {
  classeId:            string
  matiere:             string
  maxFiles?:           number
  initialSelectedIds?: string[]
  classes:             ClasseInfo[]
  onConfirm:           (fichiers: FichierKlassia[]) => void
  onClose:             () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',          label: 'Tous' },
  { key: 'pdf',          label: 'PDF' },
  { key: 'word',         label: 'Word' },
  { key: 'presentation', label: 'Présentations' },
  { key: 'tableur',      label: 'Tableurs' },
  { key: 'image',        label: 'Images' },
  { key: 'audio',        label: 'Audio' },
  { key: 'video',        label: 'Vidéo' },
  { key: 'klassia',      label: '✦ ScorgIA' },
]

function getFileEmoji(f: FichierPickerItem): string {
  const mime = f.mime_type || ''
  const nom  = f.nom.toLowerCase()
  if (f.est_ia)                                                  return '✦'
  if (mime === 'application/pdf'   || nom.endsWith('.pdf'))      return '📄'
  if (mime.includes('wordprocessingml') || nom.endsWith('.docx')) return '📝'
  if (mime.includes('presentationml')   || nom.endsWith('.pptx')) return '📊'
  if (mime.includes('spreadsheetml')    || nom.endsWith('.xlsx')) return '📈'
  if (nom.endsWith('.csv'))                                       return '📋'
  if (mime.startsWith('image/'))                                  return '🖼️'
  if (mime.startsWith('audio/'))                                  return '🎵'
  if (mime.startsWith('video/'))                                  return '🎬'
  return '📁'
}

function getFileTypeLabel(f: FichierPickerItem): string {
  const mime = f.mime_type || ''
  const nom  = f.nom.toLowerCase()
  if (f.est_ia)                                                   return 'Généré par ScorgIA'
  if (mime === 'application/pdf'   || nom.endsWith('.pdf'))       return 'PDF'
  if (mime.includes('wordprocessingml') || nom.endsWith('.docx')) return 'Word'
  if (mime.includes('presentationml')   || nom.endsWith('.pptx')) return 'Présentation'
  if (mime.includes('spreadsheetml')    || nom.endsWith('.xlsx')) return 'Tableur'
  if (nom.endsWith('.csv'))                                        return 'CSV'
  if (mime.startsWith('image/'))                                   return 'Image'
  if (mime.startsWith('audio/'))                                   return 'Audio'
  if (mime.startsWith('video/'))                                   return 'Vidéo'
  return 'Document'
}

function matchFilter(f: FichierPickerItem, filter: FilterType): boolean {
  const mime = f.mime_type || ''
  const nom  = f.nom.toLowerCase()
  switch (filter) {
    case 'all':          return true
    case 'pdf':          return mime === 'application/pdf' || nom.endsWith('.pdf')
    case 'word':         return mime.includes('wordprocessingml') || nom.endsWith('.docx')
    case 'presentation': return mime.includes('presentationml') || nom.endsWith('.pptx')
    case 'tableur':      return mime.includes('spreadsheetml') || nom.endsWith('.xlsx') || nom.endsWith('.csv')
    case 'image':        return mime.startsWith('image/')
    case 'audio':        return mime.startsWith('audio/')
    case 'video':        return mime.startsWith('video/')
    case 'klassia':      return f.est_ia
    default:             return true
  }
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024)           return `${bytes} o`
  if (bytes < 1024 * 1024)    return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

function formatDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric' }) }
  catch { return dateStr }
}

function getIndexationInfo(statut: string | null): { label: string; color: string; dot: string } {
  switch (statut) {
    case 'indexe':       return { label: 'Disponible pour l\'IA', color: '#22C55E', dot: '●' }
    case 'traitement':   return { label: 'Indexation en cours',   color: '#F59E0B', dot: '●' }
    case 'echec':        return { label: 'Extraction échouée',    color: '#EF4444', dot: '●' }
    case 'non_supporte': return { label: 'Non pris en charge',    color: '#8B97AC', dot: '●' }
    case 'en_attente':   return { label: 'En attente',            color: '#8B97AC', dot: '○' }
    default:             return { label: 'Non indexé',            color: '#CBD5E1', dot: '○' }
  }
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function KlassIAFilePicker({
  classeId,
  matiere,
  maxFiles = 5,
  initialSelectedIds = [],
  classes,
  onConfirm,
  onClose,
}: Props) {
  const supabase = createClient()

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [viewClasseId,  setViewClasseId]  = useState(classeId || classes[0]?.id || '')
  const [viewMatiere,   setViewMatiere]   = useState<string>('')   // nom du conteneur matière actif
  const [viewDossierId, setViewDossierId] = useState<string | null>(null)

  // ── Data ────────────────────────────────────────────────────────────────────
  const [loadingDossiers, setLoadingDossiers] = useState(false)
  const [loadingFichiers, setLoadingFichiers] = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [allDossiers,     setAllDossiers]     = useState<DossierItem[]>([])
  const [fichiers,        setFichiers]        = useState<FichierPickerItem[]>([])

  // ── Selection ───────────────────────────────────────────────────────────────
  // Cache des items sélectionnés pour pouvoir les inclure dans onConfirm
  const selectedCacheRef = useRef<Map<string, FichierPickerItem>>(new Map())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds))

  // ── Search & filter ─────────────────────────────────────────────────────────
  const [searchQuery,  setSearchQuery]  = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  // ── Preview ─────────────────────────────────────────────────────────────────
  const [previewItem,    setPreviewItem]    = useState<FichierPickerItem | null>(null)
  const [previewHtml,    setPreviewHtml]    = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // ── Escape key ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewItem) { setPreviewItem(null); setPreviewHtml(null) }
        else onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [previewItem, onClose])

  // ── Charger dossiers quand la classe change ─────────────────────────────────
  useEffect(() => {
    if (!viewClasseId) return
    setLoadingDossiers(true)
    setError(null)
    setAllDossiers([])
    setFichiers([])
    setViewDossierId(null)
    supabase
      .from('dossiers_systeme')
      .select('id, nom, type, est_commun, matiere, parent_id, icone, ordre')
      .eq('classe_id', viewClasseId)
      .order('ordre')
      .then(({ data, error: e }) => {
        setLoadingDossiers(false)
        if (e) { setError('Impossible de charger les dossiers.'); return }
        const list: DossierItem[] = (data || []).map((d: any) => ({
          id:        d.id,
          nom:       d.nom,
          type:      d.type,
          est_commun: d.est_commun ?? false,
          matiere:   d.matiere ?? null,
          parent_id: d.parent_id ?? null,
          icone:     d.icone ?? null,
          ordre:     d.ordre ?? 0,
        }))
        setAllDossiers(list)

        // Initialiser viewMatiere : chercher un conteneur matière correspondant à `matiere` prop
        const conteneurs = list.filter(d => d.type === 'matiere')
        const match = conteneurs.find(d => d.nom === matiere || d.matiere === matiere)
        setViewMatiere(match?.nom || conteneurs[0]?.nom || '')
      })
  }, [viewClasseId])

  // ── Charger fichiers quand le dossier actif change ──────────────────────────
  useEffect(() => {
    if (!viewDossierId) { setFichiers([]); return }
    setLoadingFichiers(true)
    setError(null)
    supabase
      .from('fichiers_dossier')
      .select(`
        id, nom, nom_auto, type_fichier, mime_type, taille_bytes, statut,
        created_at, updated_at, classe_id, dossier_id, url_storage,
        fichiers_indexation(statut, erreur)
      `)
      .eq('dossier_id', viewDossierId)
      .order('updated_at', { ascending: false })
      .then(({ data, error: e }) => {
        setLoadingFichiers(false)
        if (e) { setError('Impossible de charger les fichiers.'); return }
        const items: FichierPickerItem[] = (data || []).map((f: any) => ({
          id:           f.id,
          nom:          f.nom || '',
          nom_auto:     f.nom_auto ?? null,
          type_fichier: f.type_fichier || '',
          mime_type:    f.mime_type ?? null,
          taille_bytes: f.taille_bytes ?? null,
          statut:       f.statut || '',
          created_at:   f.created_at,
          updated_at:   f.updated_at,
          classe_id:    f.classe_id ?? null,
          dossier_id:   f.dossier_id ?? null,
          url_storage:  f.url_storage ?? null,
          est_ia:       f.nom_auto != null,
          indexation_statut: (f.fichiers_indexation as any[])?.[0]?.statut ?? null,
          indexation_erreur: (f.fichiers_indexation as any[])?.[0]?.erreur ?? null,
        }))
        setFichiers(items)
      })
  }, [viewDossierId])

  // ── Preview — charger contenu_html à la demande ─────────────────────────────
  const handlePreview = useCallback(async (f: FichierPickerItem) => {
    setPreviewItem(f)
    setPreviewHtml(null)
    if (f.est_ia) {
      setLoadingPreview(true)
      const { data } = await supabase
        .from('fichiers_dossier')
        .select('contenu_html')
        .eq('id', f.id)
        .single()
      setPreviewHtml(data?.contenu_html ?? null)
      setLoadingPreview(false)
    }
  }, [supabase])

  // ── Derived data ─────────────────────────────────────────────────────────────
  const classe        = classes.find(c => c.id === viewClasseId)
  const conteneurs    = allDossiers.filter(d => d.type === 'matiere')
  const dossierActif  = conteneurs.find(d => d.nom === viewMatiere)
  const sousDossiers  = dossierActif
    ? allDossiers.filter(d => d.parent_id === dossierActif.id && !d.est_commun)
    : []
  const dossiersCommunsVisible = viewMatiere === '__communs__'
    ? allDossiers.filter(d => d.est_commun)
    : []
  const dossiersVus = viewMatiere === '__communs__' ? dossiersCommunsVisible : sousDossiers

  const dossierNomActuel = allDossiers.find(d => d.id === viewDossierId)?.nom ?? ''

  const filteredFichiers = fichiers.filter(f => {
    const q = searchQuery.toLowerCase()
    const matchSearch = !q || (f.nom || '').toLowerCase().includes(q) || (f.nom_auto || '').toLowerCase().includes(q)
    return matchSearch && matchFilter(f, activeFilter)
  })

  // ── Helpers sélection ────────────────────────────────────────────────────────
  const toggleSelect = useCallback((f: FichierPickerItem) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(f.id)) {
        next.delete(f.id)
        selectedCacheRef.current.delete(f.id)
      } else {
        if (next.size >= maxFiles) return prev
        next.add(f.id)
        selectedCacheRef.current.set(f.id, f)
      }
      return next
    })
  }, [maxFiles])

  const handleConfirm = useCallback(() => {
    const classe = classes.find(c => c.id === viewClasseId)
    const result: FichierKlassia[] = Array.from(selectedIds).map(id => {
      const f = selectedCacheRef.current.get(id)
      const dossier = allDossiers.find(d => d.id === f?.dossier_id)
      return {
        id,
        nom:                f?.nom || '',
        type_fichier:       f?.type_fichier || '',
        mime_type:          f?.mime_type ?? null,
        classe_id:          viewClasseId,
        classe_nom:         classe?.nom || '',
        matiere:            viewMatiere || null,
        dossier_id:         f?.dossier_id || '',
        dossier_nom:        dossier?.nom || '',
        statut_indexation:  f?.indexation_statut ?? null,
        source:             'klassia',
      }
    })
    onConfirm(result)
  }, [selectedIds, viewClasseId, classes, allDossiers, viewMatiere, onConfirm])

  const handleChangeClasse = (newId: string) => {
    setViewClasseId(newId)
    setViewDossierId(null)
    setFichiers([])
    setSearchQuery('')
    if (selectedIds.size > 0) {
      setSelectedIds(new Set())
      selectedCacheRef.current.clear()
    }
  }

  const handleChangeMatiere = (nom: string) => {
    setViewMatiere(nom)
    setViewDossierId(null)
    setFichiers([])
  }

  // ── Styles partagés ──────────────────────────────────────────────────────────
  const S = {
    card: {
      background: 'rgba(255,255,255,0.72)',
      border:     '1px solid rgba(255,255,255,0.9)',
      borderRadius: 12,
      boxShadow:  '0 2px 8px rgba(15,35,65,0.06)',
    } as React.CSSProperties,
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          zIndex:   Z.modal_overlay,
          background: 'rgba(15,35,65,0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', inset: 0,
        zIndex:   Z.modal_contenu,
        display:  'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(0px, 3vw, 20px)',
        pointerEvents: 'none',
      }}>
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 880,
            maxHeight: 'calc(100dvh - clamp(0px, 6vw, 40px))',
            background: '#F8FAFF',
            borderRadius: 'clamp(0px, 3vw, 22px)',
            boxShadow: '0 24px 64px rgba(15,35,65,0.2)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >

          {/* ── Header ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 20px',
            background: 'rgba(255,255,255,0.9)',
            borderBottom: '1px solid rgba(15,35,65,0.07)',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 18 }}>📂</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                Mes fichiers ScorgIA
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                Sélectionnez jusqu'à {maxFiles} document{maxFiles > 1 ? 's' : ''} à ajouter comme contexte
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: 'none', background: 'rgba(15,35,65,0.06)',
                cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
              ✕
            </button>
          </div>

          {/* ── Toolbar classe + matière ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.7)',
            borderBottom: '1px solid rgba(15,35,65,0.06)',
            flexShrink: 0,
          }}>
            {/* Sélecteur de classe */}
            <select
              value={viewClasseId}
              onChange={e => handleChangeClasse(e.target.value)}
              style={{
                padding: '5px 10px', borderRadius: 20,
                border: '1.5px solid rgba(108,92,231,0.2)',
                background: 'var(--violet-soft, #EDE9FE)', color: 'var(--violet)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                outline: 'none', fontFamily: 'inherit', maxWidth: 220,
              }}>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.nom}{c.niveau ? ` · ${c.niveau}` : ''}</option>
              ))}
            </select>

            {/* Tabs matière */}
            {conteneurs.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {conteneurs.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleChangeMatiere(c.nom)}
                    style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${viewMatiere === c.nom ? 'var(--violet)' : 'rgba(15,35,65,0.12)'}`,
                      background: viewMatiere === c.nom ? 'var(--violet)' : 'transparent',
                      color: viewMatiere === c.nom ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                    }}>
                    {c.nom}
                  </button>
                ))}
                {allDossiers.some(d => d.est_commun) && (
                  <button
                    onClick={() => handleChangeMatiere('__communs__')}
                    style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${viewMatiere === '__communs__' ? 'var(--violet)' : 'rgba(15,35,65,0.12)'}`,
                      background: viewMatiere === '__communs__' ? 'var(--violet)' : 'transparent',
                      color: viewMatiere === '__communs__' ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                    }}>
                    Communs
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Corps ── */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {previewItem ? (
              /* ── VUE APERÇU ── */
              <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => { setPreviewItem(null); setPreviewHtml(null) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--violet)', fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                    ← Retour
                  </button>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>·</span>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{previewItem.nom}</span>
                </div>

                {/* Info rapide */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(108,92,231,0.08)', color: 'var(--violet)' }}>
                    {getFileTypeLabel(previewItem)}
                  </span>
                  {previewItem.taille_bytes && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatBytes(previewItem.taille_bytes)}</span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(previewItem.updated_at)}</span>
                </div>

                {/* Contenu aperçu */}
                <div style={{ ...S.card, flex: 1, padding: 16, overflow: 'auto' }}>
                  {previewItem.est_ia && loadingPreview && (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                      Chargement de l'aperçu…
                    </div>
                  )}
                  {previewItem.est_ia && !loadingPreview && previewHtml && (
                    <div
                      style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  )}
                  {previewItem.est_ia && !loadingPreview && !previewHtml && (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                      Aperçu non disponible pour ce document.
                    </div>
                  )}
                  {!previewItem.est_ia && previewItem.mime_type?.startsWith('image/') && previewItem.url_storage && (
                    <img src={previewItem.url_storage} alt={previewItem.nom} style={{ maxWidth: '100%', borderRadius: 8 }} />
                  )}
                  {!previewItem.est_ia && previewItem.mime_type?.startsWith('audio/') && previewItem.url_storage && (
                    <audio controls src={previewItem.url_storage} style={{ width: '100%' }} />
                  )}
                  {!previewItem.est_ia && previewItem.mime_type?.startsWith('video/') && previewItem.url_storage && (
                    <video controls src={previewItem.url_storage} style={{ maxWidth: '100%', borderRadius: 8 }} />
                  )}
                  {!previewItem.est_ia && previewItem.mime_type === 'application/pdf' && previewItem.url_storage && (
                    <div style={{ textAlign: 'center', padding: 32 }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                        Aperçu PDF — ouvrir dans un nouvel onglet pour visualiser
                      </div>
                      <a
                        href={previewItem.url_storage}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block', padding: '8px 20px',
                          borderRadius: 10, background: 'var(--violet)', color: '#fff',
                          fontSize: 13, fontWeight: 600, textDecoration: 'none',
                        }}>
                        Ouvrir le PDF
                      </a>
                    </div>
                  )}
                  {!previewItem.est_ia &&
                    !previewItem.mime_type?.startsWith('image/') &&
                    !previewItem.mime_type?.startsWith('audio/') &&
                    !previewItem.mime_type?.startsWith('video/') &&
                    previewItem.mime_type !== 'application/pdf' && (
                    <div style={{ textAlign: 'center', padding: 32 }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>{getFileEmoji(previewItem)}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{previewItem.nom}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                        {getFileTypeLabel(previewItem)}{previewItem.taille_bytes ? ` · ${formatBytes(previewItem.taille_bytes)}` : ''}
                      </div>
                      {previewItem.url_storage && (
                        <a
                          href={previewItem.url_storage}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block', padding: '8px 20px',
                            borderRadius: 10, border: '1.5px solid var(--violet)',
                            color: 'var(--violet)', fontSize: 13, fontWeight: 600,
                            textDecoration: 'none',
                          }}>
                          Ouvrir / Télécharger
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

            ) : (
              /* ── VUE NAVIGATION + LISTE ── */
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

                {/* Colonne dossiers */}
                <div style={{
                  width: 200, flexShrink: 0,
                  borderRight: '1px solid rgba(15,35,65,0.07)',
                  overflowY: 'auto',
                  padding: '12px 0',
                }}>
                  <div style={{ padding: '0 12px 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                    Dossiers
                  </div>
                  {loadingDossiers && (
                    <div style={{ padding: '20px 16px', fontSize: 12, color: 'var(--text-muted)' }}>Chargement…</div>
                  )}
                  {!loadingDossiers && dossiersVus.length === 0 && (
                    <div style={{ padding: '16px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {viewMatiere ? 'Aucun dossier dans cette matière.' : 'Sélectionnez une matière.'}
                    </div>
                  )}
                  {dossiersVus.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setViewDossierId(d.id === viewDossierId ? null : d.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '8px 14px',
                        background: viewDossierId === d.id ? 'rgba(108,92,231,0.1)' : 'none',
                        border: 'none',
                        borderLeft: viewDossierId === d.id ? '3px solid var(--violet)' : '3px solid transparent',
                        textAlign: 'left', cursor: 'pointer',
                        fontSize: 12, fontWeight: viewDossierId === d.id ? 600 : 400,
                        color: viewDossierId === d.id ? 'var(--violet)' : 'var(--text-secondary)',
                        transition: 'all 0.1s',
                      }}>
                      <span style={{ fontSize: 14 }}>{d.icone || '📁'}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nom}</span>
                    </button>
                  ))}
                </div>

                {/* Zone documents */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                  {/* Barre search + filtres */}
                  <div style={{
                    padding: '10px 16px 8px',
                    borderBottom: '1px solid rgba(15,35,65,0.06)',
                    flexShrink: 0,
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)', pointerEvents: 'none' }}>🔍</span>
                      <input
                        type="text"
                        placeholder="Rechercher par nom…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                          width: '100%', padding: '7px 12px 7px 32px',
                          borderRadius: 10, border: '1.5px solid rgba(15,35,65,0.12)',
                          background: '#fff', fontSize: 12, color: 'var(--text-primary)',
                          outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {FILTERS.map(f => (
                        <button
                          key={f.key}
                          onClick={() => setActiveFilter(f.key)}
                          style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            border: `1px solid ${activeFilter === f.key ? 'var(--violet)' : 'rgba(15,35,65,0.12)'}`,
                            background: activeFilter === f.key ? 'var(--violet)' : 'transparent',
                            color: activeFilter === f.key ? '#fff' : 'var(--text-muted)',
                            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s',
                            whiteSpace: 'nowrap',
                          }}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Liste documents */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                    {!viewDossierId && (
                      <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        <div style={{ fontSize: 32, marginBottom: 10 }}>📁</div>
                        Sélectionnez un dossier pour voir ses fichiers.
                      </div>
                    )}

                    {viewDossierId && loadingFichiers && (
                      <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        Chargement des fichiers…
                      </div>
                    )}

                    {viewDossierId && !loadingFichiers && fichiers.length === 0 && (
                      <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>🗂️</div>
                        Ce dossier est vide.
                      </div>
                    )}

                    {viewDossierId && !loadingFichiers && fichiers.length > 0 && filteredFichiers.length === 0 && (
                      <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        Aucun résultat pour cette recherche.
                      </div>
                    )}

                    {error && (
                      <div style={{ padding: '16px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF4444', fontSize: 12, margin: '8px 0' }}>
                        {error}
                      </div>
                    )}

                    {filteredFichiers.map(f => {
                      const isSelected  = selectedIds.has(f.id)
                      const atLimit     = !isSelected && selectedIds.size >= maxFiles
                      const idxInfo     = getIndexationInfo(f.indexation_statut)
                      const isIaReady   = f.indexation_statut === 'indexe'

                      return (
                        <div
                          key={f.id}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '10px 10px',
                            borderRadius: 10,
                            marginBottom: 4,
                            background: isSelected ? 'rgba(108,92,231,0.08)' : 'rgba(255,255,255,0.7)',
                            border: `1.5px solid ${isSelected ? 'var(--violet)' : 'rgba(15,35,65,0.07)'}`,
                            opacity: atLimit ? 0.5 : 1,
                            cursor: atLimit ? 'not-allowed' : 'default',
                            transition: 'all 0.1s',
                          }}>

                          {/* Checkbox */}
                          <button
                            onClick={() => !atLimit && toggleSelect(f)}
                            disabled={atLimit && !isSelected}
                            style={{
                              width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                              border: `2px solid ${isSelected ? 'var(--violet)' : 'rgba(15,35,65,0.2)'}`,
                              background: isSelected ? 'var(--violet)' : 'transparent',
                              cursor: atLimit ? 'not-allowed' : 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontSize: 11, marginTop: 1,
                            }}>
                            {isSelected && '✓'}
                          </button>

                          {/* Icône format */}
                          <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{getFileEmoji(f)}</span>

                          {/* Infos */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                maxWidth: 280,
                              }}>
                                {f.nom}
                              </span>
                              {f.est_ia && (
                                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: 'rgba(108,92,231,0.1)', color: 'var(--violet)', fontWeight: 700, flexShrink: 0 }}>
                                  ✦ ScorgIA
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 3 }}>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{getFileTypeLabel(f)}</span>
                              {f.taille_bytes != null && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatBytes(f.taille_bytes)}</span>}
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(f.updated_at)}</span>

                              {/* Statut indexation */}
                              <span
                                style={{ fontSize: 10, color: idxInfo.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}
                                title={f.indexation_erreur || idxInfo.label}>
                                <span>{idxInfo.dot}</span>
                                {idxInfo.label}
                              </span>

                              {!isIaReady && !f.est_ia && f.indexation_statut !== null && (
                                <span style={{ fontSize: 10, color: '#F59E0B' }}>
                                  (non disponible pour l'IA)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Aperçu */}
                          <button
                            onClick={() => handlePreview(f)}
                            title="Aperçu"
                            style={{
                              padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(15,35,65,0.1)',
                              background: 'rgba(255,255,255,0.8)', cursor: 'pointer',
                              fontSize: 12, color: 'var(--text-muted)', flexShrink: 0,
                            }}>
                            👁
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px',
            background: 'rgba(255,255,255,0.95)',
            borderTop: '1px solid rgba(15,35,65,0.07)',
            flexShrink: 0, gap: 12,
          }}>
            <div style={{ fontSize: 13, color: selectedIds.size > 0 ? 'var(--violet)' : 'var(--text-muted)', fontWeight: selectedIds.size > 0 ? 600 : 400 }}>
              {selectedIds.size === 0
                ? 'Aucun document sélectionné'
                : `${selectedIds.size} document${selectedIds.size > 1 ? 's' : ''} sélectionné${selectedIds.size > 1 ? 's' : ''}`}
              {selectedIds.size >= maxFiles && (
                <span style={{ color: '#F59E0B', marginLeft: 6, fontSize: 11 }}>· Limite atteinte</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 18px', borderRadius: 10,
                  border: '1.5px solid rgba(15,35,65,0.15)',
                  background: 'transparent', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
                  fontFamily: 'inherit',
                }}>
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedIds.size === 0}
                style={{
                  padding: '8px 20px', borderRadius: 10,
                  border: 'none',
                  background: selectedIds.size > 0 ? 'var(--violet)' : 'rgba(15,35,65,0.1)',
                  color: selectedIds.size > 0 ? '#fff' : 'var(--text-muted)',
                  cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                  boxShadow: selectedIds.size > 0 ? '0 4px 12px rgba(108,92,231,0.3)' : 'none',
                  transition: 'all 0.15s',
                }}>
                Ajouter au contexte
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
