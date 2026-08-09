'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'

// ── Storage helpers ───────────────────────────────────────────────────────
type FileItem = {
  name: string
  id: string
  updated_at: string
  metadata?: { size?: number; mimetype?: string }
}
const BUCKET = 'ressources'

function nettoyerNomFichier(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

function formatSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function fileMime(f: FileItem) { return f.metadata?.mimetype || '' }
function fileExt(f: FileItem)  { return f.name.split('.').pop()?.toLowerCase() || '' }

function fileType(f: FileItem): 'image' | 'video' | 'pdf' | 'office' | 'autre' {
  const m = fileMime(f); const e = fileExt(f)
  if (m.startsWith('image/') || ['png','jpg','jpeg','gif','webp','svg'].includes(e)) return 'image'
  if (m.startsWith('video/') || ['mp4','mov','avi','webm'].includes(e)) return 'video'
  if (m === 'application/pdf' || e === 'pdf') return 'pdf'
  if (['doc','docx','ppt','pptx','xls','xlsx'].includes(e)) return 'office'
  return 'autre'
}

function fileIcon(f: FileItem) {
  const t = fileType(f)
  if (t === 'image')  return '🖼️'
  if (t === 'video')  return '🎬'
  if (t === 'pdf')    return '📕'
  if (t === 'office') return '📝'
  return '📄'
}

const FILE_TYPE_FILTERS = [
  { id: 'tous',   label: 'Tous',      icon: '📁' },
  { id: 'image',  label: 'Images',    icon: '🖼️' },
  { id: 'video',  label: 'Vidéos',    icon: '🎬' },
  { id: 'pdf',    label: 'PDF',       icon: '📕' },
  { id: 'office', label: 'Documents', icon: '📝' },
  { id: 'autre',  label: 'Autres',    icon: '📄' },
]

// ── Ressources DB ─────────────────────────────────────────────────────────
const RES_TYPES = [
  { id: 'tous',     label: 'Tous',      icon: '📁' },
  { id: 'document', label: 'Documents', icon: '📄' },
  { id: 'lien',     label: 'Liens web', icon: '🔗' },
  { id: 'video',    label: 'Vidéos',    icon: '▶️' },
  { id: 'image',    label: 'Images',    icon: '🖼️' },
]

function resIcon(type: string) { return RES_TYPES.find(t => t.id === type)?.icon || '📁' }

// ── Documents IA helpers ──────────────────────────────────────────────────
const DOC_TYPE_LABELS: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  lecon_complete:       { label: 'Leçon complète',     icon: '✨', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  plan_lecon:           { label: 'Plan de leçon',      icon: '📝', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)'  },
  plan_annuel:          { label: 'Programme annuel',   icon: '📅', color: '#34D399', bg: 'rgba(52,211,153,0.12)'  },
  evaluation_sommative: { label: 'Évaluation',         icon: '📊', color: '#FBC34A', bg: 'rgba(251,195,74,0.12)'  },
  quiz:                 { label: 'Quiz',               icon: '🎮', color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  activite:             { label: 'Activité',           icon: '🎯', color: '#34D399', bg: 'rgba(52,211,153,0.12)'  },
  curriculum:           { label: 'Curriculum',         icon: '📘', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)'  },
  communication:        { label: 'Communication',      icon: '📧', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  ressource:            { label: 'Ressource',          icon: '📄', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  autre:                { label: 'Autre',              icon: '📄', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
}

function docTypeInfo(type: string) {
  return DOC_TYPE_LABELS[type] || DOC_TYPE_LABELS['autre']
}

const DOC_TYPE_FILTERS = [
  { id: 'tous',   label: 'Tous' },
  { id: 'lecon_complete', label: 'Leçons' },
  { id: 'plan_lecon', label: 'Plans' },
  { id: 'evaluation_sommative', label: 'Évaluations' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'activite', label: 'Activités' },
  { id: 'plan_annuel', label: 'Programmes' },
]

type ActiveTab = 'fichiers' | 'ressources' | 'documents-ia'

export default function BibliothequePage() {
  const [profil, setProfil]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ActiveTab>('documents-ia')
  const router   = useRouter()
  const supabase = createClient()

  // ── Fichiers state ────────────────────────────────────────────────────
  const [files, setFiles]           = useState<FileItem[]>([])
  const [uploading, setUploading]   = useState(false)
  const [fileError, setFileError]   = useState('')
  const [filter, setFilter]         = useState('')
  const [typeFiltre, setTypeFiltre] = useState('tous')
  const [bucketReady, setBucketReady] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Ressources state ──────────────────────────────────────────────────
  const [classes, setClasses]       = useState<any[]>([])
  const [ressources, setRessources] = useState<any[]>([])
  const [filtre, setFiltre]         = useState('tous')
  const [classeFiltre, setClasseFiltre] = useState('')
  const [showForm, setShowForm]     = useState(false)
  const [resUploading, setResUploading] = useState(false)
  const [fichier, setFichier]       = useState<File | null>(null)
  const [form, setForm] = useState({
    titre: '', type: 'document', url: '', description: '', classe_id: '', tags: '',
  })

  // ── "Utiliser dans une leçon" modal ───────────────────────────────────
  const [utilisRes, setUtilisRes]           = useState<any | null>(null)
  const [utilisClasseId, setUtilisClasseId] = useState('')
  const [utilisLecons, setUtilisLecons]     = useState<any[]>([])
  const [utilisLoading, setUtilisLoading]   = useState(false)

  // ── "Lier à une classe" inline picker ────────────────────────────────
  const [lierResId, setLierResId]   = useState<string | null>(null)
  const [lierClasseId, setLierClasseId] = useState('')

  // ── Copied feedback ───────────────────────────────────────────────────
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ── Documents IA state ────────────────────────────────────────────────
  const [fichiersDocs, setFichiersDocs]         = useState<any[]>([])
  const [docsLoading, setDocsLoading]           = useState(false)
  const [docSearch, setDocSearch]               = useState('')
  const [docClasseFiltre, setDocClasseFiltre]   = useState('')
  const [docTypeFiltre, setDocTypeFiltre]       = useState('tous')
  const [previewDoc, setPreviewDoc]             = useState<any | null>(null)
  const [previewLecon, setPreviewLecon]         = useState<any | null>(null)
  const [previewLoading, setPreviewLoading]     = useState(false)
  const [exportingDocx, setExportingDocx]       = useState(false)
  const [exportingPptx, setExportingPptx]       = useState(false)
  const [leconContenuMap, setLeconContenuMap]   = useState<Record<string, any>>({})
  const [sharingLoading, setSharingLoading]     = useState(false)
  const [partageActif, setPartageActif]         = useState(false)
  const [lienPartage, setLienPartage]           = useState<string | null>(null)
  const [copiedLink, setCopiedLink]             = useState(false)

  // ── Mode édition inline ───────────────────────────────────────────────────
  const [editMode, setEditMode]         = useState(false)
  const [editContent, setEditContent]   = useState('')
  const [editFetching, setEditFetching] = useState(false)
  const [editSaving, setEditSaving]     = useState(false)
  const [editError, setEditError]       = useState('')
  const [hasUnsaved, setHasUnsaved]     = useState(false)

  // Prévenir la perte de modifications non sauvegardées
  useEffect(() => {
    if (!hasUnsaved) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsaved])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await supabase.from('utilisateurs').select('*').eq('user_id', session.user.id).single()
      if (!p) { router.push('/login'); return }
      setProfil(p)

      const [{ data: cls }, { data: res }] = await Promise.all([
        supabase.from('classes').select('*').eq('enseignant_id', p.id).order('nom'),
        supabase.from('ressources').select('*').eq('enseignant_id', p.id).order('created_at', { ascending: false }),
      ])
      setClasses(cls || [])
      setRessources(res || [])

      await loadFiles(p.id)
      await loadDocumentsIA(p.id)

      setLoading(false)
    }
    init()
  }, [])

  const loadFiles = async (userId?: string) => {
    const uid = userId || profil?.id
    if (!uid) return
    const { data, error: e } = await supabase.storage.from(BUCKET).list(`${uid}/`, { sortBy: { column: 'name', order: 'asc' } })
    if (e) {
      const msg = e.message || ''
      if (msg.toLowerCase().includes('bucket') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('does not exist')) {
        setBucketReady(false)
      } else {
        setFileError(`Erreur Storage : ${msg}`)
      }
      return
    }
    setFiles((data as FileItem[]) || [])
  }

  const loadDocumentsIA = async (userId?: string) => {
    const uid = userId || profil?.id
    if (!uid) return
    setDocsLoading(true)
    const { data } = await supabase
      .from('fichiers_dossier')
      .select('id, nom, type_fichier, classe_id, statut, lecon_id, created_at, updated_at, lien_partage, partage_actif')
      .eq('enseignant_id', uid)
      .order('updated_at', { ascending: false })
      .limit(200)
    const docs = data || []
    setFichiersDocs(docs)
    setDocsLoading(false)
    const leconIds = docs.filter((d: any) => d.lecon_id).map((d: any) => d.lecon_id)
    if (leconIds.length > 0) {
      const { data: leconData } = await supabase
        .from('lecons')
        .select('id, contenu_json')
        .in('id', leconIds)
      const map: Record<string, any> = {}
      for (const l of (leconData || [])) { map[l.id] = l.contenu_json }
      setLeconContenuMap(map)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profil) return
    setUploading(true); setFileError('')
    const path = `${profil.id}/${Date.now()}-${nettoyerNomFichier(file.name)}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
    if (upErr) { setFileError(upErr.message); setUploading(false); return }
    await loadFiles()
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (name: string) => {
    if (!profil) return
    await supabase.storage.from(BUCKET).remove([`${profil.id}/${name}`])
    await loadFiles()
  }

  const handleDownload = async (name: string) => {
    if (!profil) return
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(`${profil.id}/${name}`, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleProjecerFile = async (name: string) => {
    if (!profil) return
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(`${profil.id}/${name}`, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleAddRessource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profil?.id) return
    setResUploading(true)
    let url = form.url; let type = form.type
    if (fichier) {
      const fileName = `${profil.id}/${Date.now()}_${nettoyerNomFichier(fichier.name)}`
      const { data: uploadData, error: uploadError } = await supabase.storage.from(BUCKET).upload(fileName, fichier)
      if (!uploadError) {
        const { data: urlData } = await supabase.storage.from(BUCKET).createSignedUrl(fileName, 3600)
        url = urlData?.signedUrl || ''
        if (fichier.type.includes('pdf')) type = 'document'
        else if (fichier.type.includes('image')) type = 'image'
        else if (fichier.type.includes('video')) type = 'video'
        else type = 'document'
      }
    }
    const { data, error } = await supabase.from('ressources').insert({
      enseignant_id: profil.id,
      classe_id: form.classe_id || null,
      titre: form.titre || fichier?.name || 'Sans titre',
      type, url,
      description: form.description,
      tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
    }).select().single()
    if (!error && data) {
      setRessources(prev => [data, ...prev])
      setShowForm(false)
      setForm({ titre: '', type: 'document', url: '', description: '', classe_id: '', tags: '' })
      setFichier(null)
    }
    setResUploading(false)
  }

  const handleDeleteRessource = async (id: string) => {
    await supabase.from('ressources').delete().eq('id', id)
    setRessources(prev => prev.filter(r => r.id !== id))
  }

  const handleLierClasse = async (resId: string) => {
    if (!lierClasseId) return
    await supabase.from('ressources').update({ classe_id: lierClasseId }).eq('id', resId)
    setRessources(prev => prev.map(r => r.id === resId ? { ...r, classe_id: lierClasseId } : r))
    setLierResId(null); setLierClasseId('')
  }

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const handleUtiliserDansLecon = async (res: any) => {
    setUtilisRes(res)
    setUtilisClasseId('')
    setUtilisLecons([])
  }

  const handleUtilisClasseChange = async (classeId: string) => {
    setUtilisClasseId(classeId)
    if (!classeId) { setUtilisLecons([]); return }
    setUtilisLoading(true)
    const { data } = await supabase.from('lecons').select('id, titre, statut').eq('classe_id', classeId).order('updated_at', { ascending: false })
    setUtilisLecons(data || [])
    setUtilisLoading(false)
  }

  // ── Fermer le modal (avec garde non-sauvegardé) ──────────────────────────
  const handleCloseModal = () => {
    if (hasUnsaved) {
      if (!window.confirm('Des modifications non sauvegardées seront perdues. Continuer ?')) return
    }
    setPreviewDoc(null)
    setPreviewLecon(null)
    setEditMode(false)
    setEditContent('')
    setHasUnsaved(false)
    setEditError('')
  }

  // ── Démarrer l'édition inline ─────────────────────────────────────────────
  const handleStartEdit = async () => {
    if (!previewDoc) return
    setEditFetching(true)
    setEditError('')
    const { data } = await supabase
      .from('fichiers_dossier')
      .select('contenu_html')
      .eq('id', previewDoc.id)
      .single()
    setEditContent(data?.contenu_html || '')
    setEditFetching(false)
    setEditMode(true)
    setHasUnsaved(false)
  }

  // ── Sauvegarder les modifications ─────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!previewDoc || editSaving) return
    setEditSaving(true)
    setEditError('')
    try {
      const res = await fetch('/api/documents/update', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fichier_id: previewDoc.id, contenu: editContent }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Erreur de sauvegarde')
      if (data.contenu_json) {
        setPreviewLecon((prev: any) => prev
          ? { ...prev, contenu_json: data.contenu_json }
          : { contenu_json: data.contenu_json }
        )
        if (previewDoc.lecon_id) {
          setLeconContenuMap(prev => ({ ...prev, [previewDoc.lecon_id]: data.contenu_json }))
        }
      }
      setFichiersDocs(prev => prev.map(f =>
        f.id === previewDoc.id ? { ...f, updated_at: new Date().toISOString() } : f
      ))
      setEditMode(false)
      setHasUnsaved(false)
    } catch (err: any) {
      setEditError(err?.message || 'Erreur inattendue')
    }
    setEditSaving(false)
  }

  // ── Annuler l'édition ─────────────────────────────────────────────────────
  const handleCancelEdit = () => {
    if (hasUnsaved) {
      if (!window.confirm('Annuler les modifications ?')) return
    }
    setEditMode(false)
    setEditContent('')
    setHasUnsaved(false)
    setEditError('')
  }

  const handleOpenPreview = async (doc: any) => {
    setEditMode(false)
    setEditContent('')
    setHasUnsaved(false)
    setEditError('')
    setPreviewDoc(doc)
    setPreviewLecon(null)
    setPartageActif(doc.partage_actif ?? false)
    setLienPartage(doc.lien_partage ?? null)
    setCopiedLink(false)
    setPreviewLoading(true)
    if (doc.lecon_id) {
      const { data } = await supabase
        .from('lecons')
        .select('contenu_json, statut, duree_minutes, date_prevue, titre')
        .eq('id', doc.lecon_id)
        .single()
      setPreviewLecon(data || null)
    } else {
      // Fichier généré par le pipeline Construire — lire contenu_html
      const { data } = await supabase
        .from('fichiers_dossier')
        .select('contenu_html')
        .eq('id', doc.id)
        .single()
      setPreviewLecon(data?.contenu_html ? { contenu_html: data.contenu_html } : null)
    }
    setPreviewLoading(false)
  }

  const handleExportDocxPreview = async () => {
    if (!previewDoc || exportingDocx) return
    setExportingDocx(true)
    try {
      const classe = classes.find(c => c.id === previewDoc.classe_id)
      const res = await fetch('/api/export/docx', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contenu:      previewLecon?.contenu_json
            ? Object.values(previewLecon.contenu_json).filter(Boolean).join('\n\n')
            : '',
          contenu_json: previewLecon?.contenu_json ?? undefined,
          type_contenu: previewDoc.type_fichier,
          titre:        previewDoc.nom || 'Document',
          matiere:      classe?.matiere,
          niveau:       classe?.niveau,
        }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `${(previewDoc.nom || 'klassia').replace(/\s+/g, '_')}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('[biblio] export docx:', err?.message)
    }
    setExportingDocx(false)
  }

  const handleExportPptxPreview = async () => {
    if (!previewDoc || !previewLecon?.contenu_json || exportingPptx) return
    setExportingPptx(true)
    try {
      const classe = classes.find((c: any) => c.id === previewDoc.classe_id)
      const res = await fetch('/api/export/pptx', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contenu_json: previewLecon.contenu_json,
          titre:        previewDoc.nom || 'Document',
          matiere:      classe?.matiere,
          niveau:       classe?.niveau,
        }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `${(previewDoc.nom || 'klassia').replace(/\s+/g, '_')}.pptx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('[biblio] export pptx:', err?.message)
    }
    setExportingPptx(false)
  }

  const handleTogglePartage = async () => {
    if (!previewDoc || sharingLoading) return
    setSharingLoading(true)
    try {
      const res = await fetch('/api/documents/share', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fichier_id: previewDoc.id, activer: !partageActif }),
      })
      const data = await res.json()
      if (data.ok) {
        setPartageActif(data.partage_actif)
        setLienPartage(data.lien_partage)
        setFichiersDocs(prev => prev.map(f =>
          f.id === previewDoc.id
            ? { ...f, partage_actif: data.partage_actif, lien_partage: data.lien_partage }
            : f
        ))
      }
    } catch (err: any) {
      console.error('[biblio] toggle partage:', err?.message)
    }
    setSharingLoading(false)
  }

  const handleCopyLink = async () => {
    if (!lienPartage) return
    const url = `${window.location.origin}/partage/${lienPartage}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    } catch {}
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <LoadingScreen />

  const visibleFiles = files.filter(f => f.name !== '.emptyFolderPlaceholder')
  const filteredFiles = visibleFiles.filter(f => {
    if (filter && !f.name.toLowerCase().includes(filter.toLowerCase())) return false
    if (typeFiltre !== 'tous' && fileType(f) !== typeFiltre) return false
    return true
  })
  const filteredRes = ressources.filter(r => {
    if (filtre !== 'tous' && r.type !== filtre) return false
    if (classeFiltre && r.classe_id !== classeFiltre) return false
    return true
  })

  const filteredDocs = fichiersDocs.filter(d => {
    if (docSearch && !d.nom?.toLowerCase().includes(docSearch.toLowerCase())) return false
    if (docClasseFiltre && d.classe_id !== docClasseFiltre) return false
    if (docTypeFiltre !== 'tous' && d.type_fichier !== docTypeFiltre) return false
    return true
  })

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/bibliotheque" onLogout={handleLogout} />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Bibliothèque</div>
            <div className="topbar-sub">Tes ressources et documents pédagogiques</div>
          </div>
          {activeTab === 'fichiers' && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text" value={filter} onChange={e => setFilter(e.target.value)}
                placeholder="Rechercher…"
                style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-1)', fontSize: '12px', width: '160px' }}
              />
              <label style={{
                padding: '8px 16px', borderRadius: 'var(--radius-md)',
                background: uploading ? 'rgba(167,139,250,0.1)' : 'var(--violet)',
                color: 'white', fontSize: '13px', fontWeight: 600,
                cursor: uploading ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
              }}>
                {uploading ? '⏳ Envoi…' : '⬆ Téléverser'}
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading || !bucketReady} />
              </label>
            </div>
          )}
          {activeTab === 'ressources' && (
            <button className="btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Ajouter</button>
          )}
          {activeTab === 'documents-ia' && (
            <button className="btn-primary btn-sm" onClick={() => router.push('/dashboard/gerer/preparer')}>
              ✨ Nouveau document IA
            </button>
          )}
        </div>

        <div className="page-content fade-in">

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '18px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)', width: 'fit-content' }}>
            {([
              { id: 'documents-ia' as ActiveTab, label: 'Documents IA',      icon: '✦' },
              { id: 'fichiers'     as ActiveTab, label: 'Fichiers',           icon: '🗂️' },
              { id: 'ressources'   as ActiveTab, label: 'Ressources & liens', icon: '🔗' },
            ] as { id: ActiveTab; label: string; icon: string }[]).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: '7px 16px', borderRadius: '7px', border: 'none',
                background: activeTab === tab.id ? 'var(--violet)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--text-3)',
                fontSize: '12px', fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ══ Tab: Documents IA ══ */}
          {activeTab === 'documents-ia' && (
            <>
              {/* Filters */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text" value={docSearch} onChange={e => setDocSearch(e.target.value)}
                  placeholder="Rechercher un document…"
                  style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-1)', fontSize: '12px', width: '200px', flexShrink: 0 }}
                />
                <select
                  value={docClasseFiltre}
                  onChange={e => setDocClasseFiltre(e.target.value)}
                  style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
                  <option value="">Toutes les classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {DOC_TYPE_FILTERS.map(t => (
                    <button key={t.id} onClick={() => setDocTypeFiltre(t.id)} style={{
                      padding: '5px 12px', borderRadius: '99px',
                      border: `1.5px solid ${docTypeFiltre === t.id ? 'var(--violet)' : 'var(--border)'}`,
                      background: docTypeFiltre === t.id ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
                      color: docTypeFiltre === t.id ? '#A78BFA' : 'var(--text-3)',
                      fontSize: '11px', fontWeight: docTypeFiltre === t.id ? 600 : 400,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => loadDocumentsIA()}
                  style={{ marginLeft: 'auto', padding: '5px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-4)', fontSize: '11px', cursor: 'pointer' }}>
                  ↺ Actualiser
                </button>
              </div>

              {docsLoading ? (
                <div style={{ padding: '48px', textAlign: 'center', fontSize: '13px', color: 'var(--text-4)' }}>Chargement…</div>
              ) : fichiersDocs.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '14px' }}>✦</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '6px' }}>Aucun document IA encore</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-4)', marginBottom: '20px' }}>
                    Prépare ta première leçon avec ScorgIA — elle apparaîtra ici automatiquement.
                  </div>
                  <button
                    onClick={() => router.push('/dashboard/gerer/preparer')}
                    className="btn-primary">
                    ✨ Ouvrir ScorgIA
                  </button>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-4)' }}>Aucun résultat pour ces filtres</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '12px', color: 'var(--text-4)', marginBottom: '12px' }}>
                    {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
                    {fichiersDocs.length !== filteredDocs.length ? ` sur ${fichiersDocs.length}` : ''}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                    {filteredDocs.map(doc => {
                      const info   = docTypeInfo(doc.type_fichier)
                      const classe = classes.find(c => c.id === doc.classe_id)
                      const date   = new Date(doc.updated_at || doc.created_at).toLocaleDateString('fr-CA')
                      return (
                        <div key={doc.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {/* Header */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <div style={{
                              width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '18px', background: info.bg,
                            }}>
                              {info.icon}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {doc.nom || 'Document sans titre'}
                              </div>
                              <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '99px', background: info.bg, color: info.color, fontWeight: 600 }}>
                                  {info.label}
                                </span>
                                {classe && (
                                  <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '99px', background: 'rgba(96,165,250,0.1)', color: '#60A5FA' }}>
                                    {classe.nom}
                                  </span>
                                )}
                                {doc.lecon_id && (
                                  <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '99px', background: 'rgba(52,211,153,0.1)', color: '#34D399' }}>
                                    ✓ Leçon
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* RAS excerpt from contenu_json */}
                          {(() => {
                            const cj = doc.lecon_id ? leconContenuMap[doc.lecon_id] : null
                            const ras = cj?.ras || cj?.intention
                            if (!ras) return null
                            const firstLine = String(ras).split('\n')[0].replace(/^[-•*]\s*/, '').trim()
                            if (!firstLine) return null
                            return (
                              <div style={{ fontSize: '11px', color: 'var(--text-4)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                                {firstLine}
                              </div>
                            )
                          })()}

                          {/* Date */}
                          <div style={{ fontSize: '10px', color: 'var(--text-4)' }}>
                            Mis à jour le {date}
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => handleOpenPreview(doc)}
                              style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer' }}>
                              👁 Aperçu
                            </button>
                            {doc.classe_id && (
                              <button
                                onClick={() => router.push(`/dashboard/classes/${doc.classe_id}`)}
                                style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', color: '#60A5FA', cursor: 'pointer' }}>
                                🎓 Classes
                              </button>
                            )}
                            <button
                              onClick={() => router.push(
                                doc.classe_id
                                  ? `/dashboard/gerer/preparer?classe_id=${doc.classe_id}`
                                  : '/dashboard/gerer/preparer'
                              )}
                              style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', color: '#A78BFA', cursor: 'pointer' }}>
                              ✨ Préparer
                            </button>
                            {doc.lecon_id && doc.classe_id && (
                              <button
                                onClick={() => router.push(`/dashboard/gerer/enseigner?classe=${doc.classe_id}`)}
                                style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', color: '#34D399', cursor: 'pointer' }}>
                                ▶ Enseigner
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* ══ Tab: Fichiers ══ */}
          {activeTab === 'fichiers' && (
            <>
              {fileError && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#F87171', fontSize: '12px', marginBottom: '16px' }}>
                  {fileError}
                </div>
              )}

              {!bucketReady ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '14px' }}>🪣</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '8px' }}>Bucket de stockage non configuré</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-4)', maxWidth: '420px', margin: '0 auto 20px' }}>
                    Crée un bucket nommé <strong style={{ color: 'var(--text-2)' }}>ressources</strong> dans Supabase Storage.
                  </div>
                  <div style={{ padding: '10px 14px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '8px', fontSize: '12px', color: '#A78BFA', fontFamily: 'monospace', maxWidth: '360px', margin: '0 auto' }}>
                    Nom : <strong>ressources</strong> · Accès : Privé
                  </div>
                </div>
              ) : (
                <>
                  {/* File type filter chips */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    {FILE_TYPE_FILTERS.map(t => {
                      const count = t.id === 'tous' ? visibleFiles.length : visibleFiles.filter(f => fileType(f) === t.id).length
                      if (t.id !== 'tous' && count === 0) return null
                      return (
                        <button key={t.id} onClick={() => setTypeFiltre(t.id)} style={{
                          padding: '5px 12px', borderRadius: '99px',
                          border: `1.5px solid ${typeFiltre === t.id ? 'var(--violet)' : 'var(--border)'}`,
                          background: typeFiltre === t.id ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
                          color: typeFiltre === t.id ? '#A78BFA' : 'var(--text-3)',
                          fontSize: '12px', fontWeight: typeFiltre === t.id ? 600 : 400,
                          cursor: 'pointer', transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', gap: '5px',
                        }}>
                          {t.icon} {t.label}
                          <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '99px', padding: '0 5px', fontSize: '10px' }}>{count}</span>
                        </button>
                      )
                    })}
                  </div>

                  {visibleFiles.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '14px' }}>📚</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '6px' }}>Aucun fichier encore</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-4)', marginBottom: '24px' }}>Téléverse tes PDF, images, vidéos, documents…</div>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-md)', background: 'var(--violet)', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                        ⬆ Téléverser un fichier
                        <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
                      </label>
                    </div>
                  ) : (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-4)' }}>
                        {filteredFiles.length} fichier{filteredFiles.length !== 1 ? 's' : ''}
                        {(filter || typeFiltre !== 'tous') && ` · filtrés sur ${visibleFiles.length}`}
                      </div>
                      {filteredFiles.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', fontSize: '12px', color: 'var(--text-4)' }}>
                          Aucun résultat
                        </div>
                      ) : (
                        filteredFiles.map(f => {
                          const projectable = ['image','video','pdf'].includes(fileType(f))
                          return (
                            <div key={f.id || f.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              <span style={{ fontSize: '20px', flexShrink: 0 }}>{fileIcon(f)}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-4)' }}>
                                  {formatSize(f.metadata?.size)}{f.metadata?.size ? ' · ' : ''}{new Date(f.updated_at).toLocaleDateString('fr-CA')}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                {projectable && (
                                  <button onClick={() => handleProjecerFile(f.name)} style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#A78BFA', cursor: 'pointer' }}>
                                    ▶ Projeter
                                  </button>
                                )}
                                <button onClick={() => handleDownload(f.name)} style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: '#60A5FA', cursor: 'pointer' }}>
                                  ⬇ Télécharger
                                </button>
                                <button onClick={() => { if (window.confirm('Supprimer ce fichier ?')) handleDelete(f.name) }} style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', cursor: 'pointer' }}>
                                  🗑
                                </button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ══ Tab: Ressources & liens ══ */}
          {activeTab === 'ressources' && (
            <>
              {/* Add form */}
              {showForm && (
                <div className="card fade-in" style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3>Nouvelle ressource</h3>
                    <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-4)', cursor: 'pointer' }}>✕</button>
                  </div>
                  <form onSubmit={handleAddRessource}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Titre</label>
                        <input value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} placeholder="Ex: Vidéo pronoms personnels" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Type</label>
                        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                          <option value="document">📄 Document</option>
                          <option value="lien">🔗 Lien web</option>
                          <option value="video">▶️ Vidéo</option>
                          <option value="image">🖼️ Image</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">URL / Lien web</label>
                        <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Classe associée</label>
                        <select value={form.classe_id} onChange={e => setForm({ ...form, classe_id: e.target.value })}>
                          <option value="">Toutes les classes</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ou téléverse un fichier</label>
                      <div style={{ border: `2px dashed ${fichier ? 'var(--green)' : 'var(--border-mid)'}`, borderRadius: 'var(--radius-md)', padding: '20px', textAlign: 'center', background: fichier ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.04)', transition: 'all 0.2s' }}>
                        <input type="file" id="res-fichier-upload" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.mp4,.mov,.txt,.csv" onChange={e => { const f = e.target.files?.[0] || null; setFichier(f); if (f && !form.titre) setForm(prev => ({ ...prev, titre: f.name.replace(/\.[^/.]+$/, '') })) }} style={{ display: 'none' }} />
                        <label htmlFor="res-fichier-upload" style={{ cursor: 'pointer', display: 'block' }}>
                          {fichier ? (
                            <div>
                              <div style={{ fontSize: '28px', marginBottom: '6px' }}>✅</div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#34D399' }}>{fichier.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{(fichier.size / 1024 / 1024).toFixed(2)} MB</div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📎</div>
                              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-2)' }}>Clique pour choisir un fichier</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-4)' }}>PDF · Word · PowerPoint · Excel · Image · Vidéo</div>
                            </div>
                          )}
                        </label>
                        {fichier && <button type="button" onClick={() => setFichier(null)} style={{ marginTop: '8px', background: 'none', border: 'none', fontSize: '12px', color: 'var(--text-3)', cursor: 'pointer' }}>✕ Retirer</button>}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description courte…" />
                    </div>
                    <div className="form-group" style={{ marginBottom: '18px' }}>
                      <label className="form-label">Tags (virgules)</label>
                      <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="grammaire, pronoms, 9e année" />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit" className="btn-primary btn-sm" disabled={resUploading} style={{ opacity: resUploading ? 0.7 : 1 }}>
                        {resUploading ? '⟳ Envoi…' : '💾 Ajouter'}
                      </button>
                      <button type="button" className="btn-ghost btn-sm" onClick={() => { setShowForm(false); setFichier(null); setForm({ titre: '', type: 'document', url: '', description: '', classe_id: '', tags: '' }) }}>
                        Annuler
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Filters */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                {RES_TYPES.map(t => (
                  <button key={t.id} onClick={() => setFiltre(t.id)} style={{
                    padding: '6px 14px', borderRadius: '99px',
                    border: `1.5px solid ${filtre === t.id ? 'var(--blue)' : 'var(--border)'}`,
                    background: filtre === t.id ? 'var(--blue-pale)' : 'rgba(255,255,255,0.04)',
                    color: filtre === t.id ? 'var(--blue)' : 'var(--text-3)',
                    fontSize: '12px', fontWeight: filtre === t.id ? 600 : 400,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    {t.icon} {t.label}
                  </button>
                ))}
                <select value={classeFiltre} onChange={e => setClasseFiltre(e.target.value)} style={{ padding: '6px 12px', borderRadius: '99px', border: '1.5px solid var(--border)', fontSize: '12px', background: 'var(--bg-elevated)', cursor: 'pointer', outline: 'none' }}>
                  <option value="">Toutes les classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
                {ressources.length > 0 && (
                  <span style={{ fontSize: '12px', color: 'var(--text-4)', marginLeft: 'auto' }}>
                    {filteredRes.length} résultat{filteredRes.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Resource cards grid */}
              {filteredRes.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '14px' }}>📁</div>
                  <h3 style={{ marginBottom: '8px' }}>Aucune ressource</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>Ajoute tes premiers documents, liens ou vidéos</p>
                  <button className="btn-primary" onClick={() => setShowForm(true)}>+ Ajouter une ressource</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {filteredRes.map(r => {
                    const classeR = classes.find(c => c.id === r.classe_id)
                    const isLinking = lierResId === r.id
                    return (
                      <div key={r.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                            background: r.type === 'image' ? 'rgba(252,211,77,0.12)' : r.type === 'video' ? 'rgba(248,113,113,0.1)' : r.type === 'lien' ? 'rgba(167,139,250,0.12)' : 'rgba(96,165,250,0.12)',
                          }}>
                            {resIcon(r.type)}
                          </div>
                          <button onClick={() => handleDeleteRessource(r.id)} style={{ background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', fontSize: '14px', padding: '2px' }}>✕</button>
                        </div>

                        {/* Info */}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '3px' }}>{r.titre}</div>
                          {r.description && <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.5 }}>{r.description}</div>}
                        </div>

                        {/* Image preview */}
                        {r.type === 'image' && r.url && (
                          <div style={{ borderRadius: '6px', overflow: 'hidden', height: '72px' }}>
                            <img src={r.url} alt={r.titre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}

                        {/* Tags + classe */}
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          {classeR ? (
                            <span style={{ fontSize: '10px', padding: '2px 7px', background: 'rgba(96,165,250,0.12)', color: '#60A5FA', borderRadius: '99px', border: '1px solid rgba(96,165,250,0.2)' }}>{classeR.nom}</span>
                          ) : !isLinking && (
                            <button onClick={() => { setLierResId(r.id); setLierClasseId('') }} style={{ fontSize: '10px', padding: '2px 7px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-4)', borderRadius: '99px', border: '1px dashed var(--border)', cursor: 'pointer' }}>
                              + Lier à une classe
                            </button>
                          )}
                          {(r.tags || []).map((tag: string, i: number) => (
                            <span key={i} style={{ fontSize: '10px', padding: '2px 7px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)', borderRadius: '99px', border: '1px solid var(--border)' }}>{tag}</span>
                          ))}
                        </div>

                        {/* Inline class linker */}
                        {isLinking && (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <select value={lierClasseId} onChange={e => setLierClasseId(e.target.value)} style={{ flex: 1, padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', fontSize: '11px', color: 'var(--text-1)' }}>
                              <option value="">Choisir…</option>
                              {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                            </select>
                            <button onClick={() => handleLierClasse(r.id)} disabled={!lierClasseId} style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'var(--violet)', color: 'white', border: 'none', cursor: lierClasseId ? 'pointer' : 'not-allowed', opacity: lierClasseId ? 1 : 0.5 }}>OK</button>
                            <button onClick={() => setLierResId(null)} style={{ padding: '5px 8px', borderRadius: '6px', fontSize: '11px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-4)', cursor: 'pointer' }}>✕</button>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                          {r.url && (
                            <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', fontSize: '11px', color: '#60A5FA', textDecoration: 'none', padding: '6px', background: 'rgba(96,165,250,0.1)', borderRadius: '6px', fontWeight: 500 }}>
                              ▶ Projeter
                            </a>
                          )}
                          {r.url && (
                            <button onClick={() => handleCopyUrl(r.url, r.id)} style={{ flex: 1, padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, background: copiedId === r.id ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${copiedId === r.id ? 'rgba(52,211,153,0.3)' : 'var(--border)'}`, color: copiedId === r.id ? '#34D399' : 'var(--text-3)', cursor: 'pointer', transition: 'all 0.2s' }}>
                              {copiedId === r.id ? '✓ Copié' : '🔗 Copier'}
                            </button>
                          )}
                          <button onClick={() => handleUtiliserDansLecon(r)} style={{ flex: 1, padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#A78BFA', cursor: 'pointer' }}>
                            📎 Utiliser
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Modal aperçu Document IA ── */}
      {previewDoc && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={e => { if (e.target === e.currentTarget) handleCloseModal() }}>
          <div className="card" style={{ width: '100%', maxWidth: '680px', padding: '24px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>
                  {previewDoc.nom || 'Document sans titre'}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '99px', background: docTypeInfo(previewDoc.type_fichier).bg, color: docTypeInfo(previewDoc.type_fichier).color, fontWeight: 600 }}>
                    {docTypeInfo(previewDoc.type_fichier).label}
                  </span>
                  {previewLecon?.statut && (() => {
                    const STATUT_COLOR: Record<string, { bg: string; color: string; label: string }> = {
                      brouillon: { bg: 'rgba(148,163,184,.15)', color: '#94A3B8', label: 'Brouillon' },
                      prete:     { bg: 'rgba(96,165,250,.15)',  color: '#60A5FA', label: 'Prête'     },
                      en_cours:  { bg: 'rgba(251,195,74,.15)',  color: '#FBC34A', label: 'En cours'  },
                      enseignee: { bg: 'rgba(167,139,250,.15)', color: '#A78BFA', label: 'Enseignée' },
                      complete:  { bg: 'rgba(52,211,153,.15)',  color: '#34D399', label: 'Terminée'  },
                      a_revoir:  { bg: 'rgba(248,113,113,.15)', color: '#F87171', label: 'À revoir'  },
                      archivee:  { bg: 'rgba(71,85,105,.15)',   color: '#475569', label: 'Archivée'  },
                    }
                    const s = STATUT_COLOR[previewLecon.statut] || STATUT_COLOR['brouillon']
                    return (
                      <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '99px', background: s.bg, color: s.color, fontWeight: 600 }}>
                        {s.label}
                      </span>
                    )
                  })()}
                  {previewLecon?.duree_minutes && (
                    <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '99px', background: 'rgba(255,255,255,0.07)', color: 'var(--text-4)' }}>
                      {previewLecon.duree_minutes} min
                    </span>
                  )}
                </div>
              </div>
              <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-4)', cursor: 'pointer', flexShrink: 0 }}>✕</button>
            </div>

            {/* Contenu */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '200px' }}>
              {editMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {editFetching ? (
                    <div style={{ padding: '32px', textAlign: 'center', fontSize: '12px', color: 'var(--text-4)' }}>Chargement du contenu…</div>
                  ) : (
                    <>
                      <div style={{ fontSize: '11px', color: 'var(--text-4)', marginBottom: '2px' }}>
                        Format Markdown — les sections seront restructurées automatiquement à l&apos;enregistrement
                      </div>
                      <textarea
                        value={editContent}
                        onChange={e => { setEditContent(e.target.value); setHasUnsaved(true) }}
                        style={{
                          width: '100%', minHeight: '320px', padding: '12px',
                          borderRadius: '8px', border: '1px solid var(--border)',
                          background: 'rgba(255,255,255,0.03)', color: 'var(--text-1)',
                          fontSize: '12px', lineHeight: '1.6', fontFamily: 'monospace',
                          resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                        }}
                        placeholder="Contenu Markdown de la leçon…"
                      />
                      {editError && (
                        <div style={{ fontSize: '11px', color: '#F87171', padding: '8px 10px', background: 'rgba(248,113,113,0.08)', borderRadius: '6px', border: '1px solid rgba(248,113,113,0.2)' }}>
                          {editError}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : previewLoading ? (
                <div style={{ padding: '32px', textAlign: 'center', fontSize: '12px', color: 'var(--text-4)' }}>Chargement…</div>
              ) : previewLecon?.contenu_html ? (
                <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '8px 0' }}>
                  {previewLecon.contenu_html}
                </pre>
              ) : previewLecon?.contenu_json ? (() => {
                const c = previewLecon.contenu_json
                const Section = ({ label, content, color = 'var(--text-4)' }: { label: string; content?: string; color?: string }) => (
                  content ? (
                    <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '9px', fontWeight: 700, color, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{content}</div>
                    </div>
                  ) : null
                )
                return (
                  <>
                    <Section label="Intention pédagogique" content={c.intention} color="#A78BFA" />
                    <Section label="Programme (RAG/RAS)" content={[c.rag, c.ras].filter(Boolean).join(' — ')} color="#60A5FA" />
                    <Section label="AVANT — Amorce" content={c.avant_amorce} color="#FBC34A" />
                    <Section label="PENDANT — Modélisation" content={c.pendant_modelisation} color="#60A5FA" />
                    <Section label="PENDANT — Pratique guidée" content={c.pendant_pratique_guidee} color="#60A5FA" />
                    <Section label="PENDANT — Pratique autonome" content={c.pendant_pratique_autonome} color="#60A5FA" />
                    <Section label="APRÈS — Clôture" content={c.apres_cloture} color="#34D399" />
                    <Section label="Évaluation formative" content={c.evaluation_formative} color="#34D399" />
                    <Section label="Différenciation" content={[c.differentiation_universelle, c.differentiation_ciblee, c.differentiation_specialisee].filter(Boolean).join(' • ')} color="#F87171" />
                  </>
                )
              })() : (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--text-4)', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                  {previewDoc.lecon_id
                    ? 'Contenu non encore structuré — ouvrez dans Préparer pour voir le document complet.'
                    : 'Aucun contenu disponible pour ce document.'}
                </div>
              )}
            </div>

            {/* Actions — mode édition ou mode normal */}
            {editMode ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={handleSaveEdit}
                  disabled={editSaving || editFetching}
                  style={{ padding: '6px 16px', borderRadius: '7px', fontSize: '12px', fontWeight: 700, background: 'var(--violet)', color: 'white', border: 'none', cursor: editSaving ? 'wait' : 'pointer', opacity: editSaving ? 0.7 : 1 }}>
                  {editSaving ? '⏳ Enregistrement…' : '💾 Enregistrer'}
                </button>
                <button onClick={handleCancelEdit} disabled={editSaving} className="btn-ghost btn-sm">
                  Annuler
                </button>
                <div style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-4)' }}>
                  Les sections seront restructurées via IA
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { router.push(previewDoc.classe_id ? `/dashboard/gerer/preparer?classe_id=${previewDoc.classe_id}` : '/dashboard/gerer/preparer'); handleCloseModal() }}
                  className="btn-primary btn-sm">
                  ✨ Préparer
                </button>
                <button
                  onClick={handleStartEdit}
                  disabled={editFetching}
                  style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, background: 'rgba(251,195,74,0.1)', border: '1px solid rgba(251,195,74,0.25)', color: '#FBC34A', cursor: editFetching ? 'wait' : 'pointer', opacity: editFetching ? 0.6 : 1 }}>
                  {editFetching ? '⏳…' : '✏️ Modifier'}
                </button>
                {previewLecon?.contenu_json && (
                  <button
                    onClick={handleExportDocxPreview}
                    disabled={exportingDocx}
                    style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: '#60A5FA', cursor: exportingDocx ? 'wait' : 'pointer', opacity: exportingDocx ? 0.6 : 1 }}>
                    {exportingDocx ? '⏳…' : '📝 Word'}
                  </button>
                )}
                {previewLecon?.contenu_json && (
                  <button
                    onClick={handleExportPptxPreview}
                    disabled={exportingPptx}
                    style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: '#8B5CF6', cursor: exportingPptx ? 'wait' : 'pointer', opacity: exportingPptx ? 0.6 : 1 }}>
                    {exportingPptx ? '⏳…' : '📊 PowerPoint'}
                  </button>
                )}
                <button
                  onClick={handleTogglePartage}
                  disabled={sharingLoading}
                  style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, background: partageActif ? 'rgba(34,197,94,0.12)' : 'rgba(91,107,133,0.1)', border: `1px solid ${partageActif ? 'rgba(34,197,94,0.3)' : 'rgba(91,107,133,0.2)'}`, color: partageActif ? '#22C55E' : 'var(--text-secondary)', cursor: sharingLoading ? 'wait' : 'pointer', opacity: sharingLoading ? 0.6 : 1 }}>
                  {sharingLoading ? '⏳…' : partageActif ? '🔗 Partagé' : '🔗 Partager'}
                </button>
                {previewDoc.lecon_id && previewDoc.classe_id && (
                  <button
                    onClick={() => { router.push(`/dashboard/classes/${previewDoc.classe_id}/lecons/${previewDoc.lecon_id}/presenter`); handleCloseModal() }}
                    style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', color: '#A78BFA', cursor: 'pointer' }}>
                    📽 Présenter
                  </button>
                )}
                {previewDoc.lecon_id && previewDoc.classe_id && (
                  <button
                    onClick={() => { router.push(`/dashboard/gerer/enseigner?classe=${previewDoc.classe_id}`); handleCloseModal() }}
                    className="btn-ghost btn-sm">
                    ▶ Enseigner
                  </button>
                )}
                {previewDoc.classe_id && (
                  <button
                    onClick={() => { router.push(`/dashboard/classes/${previewDoc.classe_id}`); handleCloseModal() }}
                    className="btn-ghost btn-sm">
                    🎓 Classes
                  </button>
                )}
              </div>
            )}

            {/* Share link display */}
            {partageActif && lienPartage && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {`${typeof window !== 'undefined' ? window.location.origin : ''}/partage/${lienPartage}`}
                </span>
                <button
                  onClick={handleCopyLink}
                  style={{ flexShrink: 0, padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: copiedLink ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', cursor: 'pointer', transition: 'background 0.15s' }}>
                  {copiedLink ? '✓ Copié' : '📋 Copier'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── "Utiliser dans une leçon" modal ── */}
      {utilisRes && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={e => { if (e.target === e.currentTarget) setUtilisRes(null) }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>Utiliser dans une leçon</div>
                <div style={{ fontSize: '12px', color: 'var(--text-4)', marginTop: '2px' }}>{utilisRes.titre}</div>
              </div>
              <button onClick={() => setUtilisRes(null)} style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-4)', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">1. Choisir une classe</label>
              <select value={utilisClasseId} onChange={e => handleUtilisClasseChange(e.target.value)} style={{ width: '100%' }}>
                <option value="">Sélectionner une classe…</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>

            {utilisClasseId && (
              <div className="form-group">
                <label className="form-label">2. Choisir une leçon</label>
                {utilisLoading ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-4)', padding: '8px 0' }}>Chargement…</div>
                ) : utilisLecons.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-4)', padding: '8px 0' }}>Aucune leçon dans cette classe</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                    {utilisLecons.map(l => (
                      <button key={l.id} onClick={() => { router.push(`/dashboard/classes/${utilisClasseId}/lecons/${l.id}`); setUtilisRes(null) }} style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                        borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                        background: 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(167,139,250,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}>
                        <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '99px', background: 'rgba(167,139,250,0.12)', color: '#A78BFA', fontWeight: 600, flexShrink: 0 }}>{l.statut}</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{l.titre || 'Sans titre'}</span>
                        <span style={{ color: 'var(--text-4)', fontSize: '14px' }}>→</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '8px' }}>
              Tu seras redirigé vers l'éditeur de leçon pour y intégrer cette ressource.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
