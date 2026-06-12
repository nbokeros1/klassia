'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'

// ─── Config dossiers & fichiers ───────────────────────────────────────────────

const DOSSIER_CFG: Record<string, { icon: string; couleur: string; nom: string }> = {
  preparation:            { icon: '📚', couleur: '#7F77DD', nom: 'Préparation'          },
  curriculum:             { icon: '📋', couleur: '#7F77DD', nom: 'Curriculum'           },
  plan_annuel:            { icon: '📅', couleur: '#7F77DD', nom: 'Plan annuel'          },
  plans_lecons:           { icon: '📝', couleur: '#7F77DD', nom: 'Plans de leçons'      },
  lecons:                 { icon: '✨', couleur: '#EF9F27', nom: 'Leçons'               },
  lecon:                  { icon: '📖', couleur: '#EF9F27', nom: 'Leçon'                },
  sequence:               { icon: '📁', couleur: '#A78BFA', nom: 'Séquence'             },
  evaluations_sommatives: { icon: '📊', couleur: '#F87171', nom: 'Évaluations'          },
  eleves:                 { icon: '👥', couleur: '#34D399', nom: 'Élèves'               },
  ressources:             { icon: '📚', couleur: '#60A5FA', nom: 'Ressources'           },
  administration:         { icon: '🗂️', couleur: '#94A3B8', nom: 'Administration'       },
  parents:                { icon: '👨‍👩‍👧', couleur: '#F472B6', nom: 'Parents'              },
  evenements:             { icon: '🎉', couleur: '#FB923C', nom: 'Événements'           },
  custom:                 { icon: '📁', couleur: '#94A3B8', nom: 'Dossier'              },
}

const FICHIER_CFG: Record<string, { icon: string; couleur: string }> = {
  plan_lecon:     { icon: '📝', couleur: '#60A5FA' },
  lecon_complete: { icon: '📖', couleur: '#A78BFA' },
  activite:       { icon: '🎯', couleur: '#34D399' },
  devoir:         { icon: '🏠', couleur: '#F472B6' },
  quiz:           { icon: '🎮', couleur: '#EF9F27' },
  evaluation:     { icon: '📊', couleur: '#F87171' },
  curriculum:     { icon: '📋', couleur: '#3B82F6' },
  ressource:      { icon: '📚', couleur: '#94A3B8' },
  document:       { icon: '📄', couleur: '#94A3B8' },
  image:          { icon: '🖼️', couleur: '#8B5CF6' },
  audio:          { icon: '🎵', couleur: '#10B981' },
  video:          { icon: '🎬', couleur: '#EF4444' },
  lien:           { icon: '🔗', couleur: '#0EA5E9' },
  gabarit:        { icon: '📐', couleur: '#F59E0B' },
  autre:          { icon: '📄', couleur: '#64748B' },
}

const STATUT_CFG: Record<string, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: '#94A3B8' },
  valide:    { label: 'Validé',    color: '#60A5FA'  },
  enseigne:  { label: 'Enseigné',  color: '#A78BFA'  },
  archive:   { label: 'Archivé',   color: '#475569'  },
  prete:     { label: 'Prête',     color: '#34D399'  },
  en_cours:  { label: 'En cours',  color: '#FBC34A'  },
  enseignee: { label: 'Enseignée', color: '#A78BFA'  },
  complete:  { label: 'Terminée',  color: '#34D399'  },
  a_revoir:  { label: 'À revoir',  color: '#F87171'  },
}

// Root dossiers in display order (8 fixed)
const ROOT_TYPES = ['preparation', 'lecons', 'evaluations_sommatives', 'eleves', 'ressources', 'administration', 'parents', 'evenements']

// Sub-folders of "preparation"
const PREP_TYPES = ['curriculum', 'plan_annuel', 'plans_lecons']

// ─── Types navigation ─────────────────────────────────────────────────────────

type Nav =
  | { level: 'racine' }
  | { level: 'dossier';      d: any }
  | { level: 'sous_dossier'; parent: any; d: any }

type UploadModal = { dossierId: string; file: File; nom: string; classeUnique: boolean; indexerIA: boolean }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClassePage() {
  const router  = useRouter()
  const params  = useParams()
  const id      = params?.id as string
  const supabase = createClient()

  // ── State ─────────────────────────────────────────────────────────────────
  const [profil,    setProfil]    = useState<any>(null)
  const [classe,    setClasse]    = useState<any>(null)
  const [dossiers,  setDossiers]  = useState<any[]>([])
  const [fichiers,  setFichiers]  = useState<any[]>([])
  const [lecons,    setLecons]    = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)

  const [nav,       setNav]       = useState<Nav>({ level: 'racine' })
  const [apercu,    setApercu]    = useState<any | null>(null)
  const [upload,    setUpload]    = useState<UploadModal | null>(null)
  const [menuId,    setMenuId]    = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadingCurriculum, setUploadingCurriculum] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const curriculumInputRef = useRef<HTMLInputElement>(null)
  const activeDossierId = useRef<string>('')

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await supabase.from('utilisateurs').select('*').eq('user_id', session.user.id).single()
      if (!p) return
      setProfil(p)

      const [{ data: cls }, { data: dos }, { data: lec }] = await Promise.all([
        supabase.from('classes').select('*').eq('id', id).single(),
        supabase.from('dossiers_systeme').select('*').eq('classe_id', id).order('ordre'),
        supabase.from('lecons').select('id,titre,sujet,statut,type_document,duree_minutes,numero,updated_at').eq('classe_id', id).order('numero'),
      ])
      setClasse(cls)
      setDossiers(dos || [])
      setLecons(lec || [])
      setLoading(false)
    }
    init()
  }, [id])

  // ── Fetch fichiers for a dossier ──────────────────────────────────────────
  const loadFichiers = async (dossierId: string) => {
    const { data } = await supabase.from('fichiers_dossier').select('*').eq('dossier_id', dossierId).order('created_at', { ascending: false })
    setFichiers(data || [])
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  const openDossier = async (d: any) => {
    setNav({ level: 'dossier', d })
    if (d.type !== 'preparation' && d.type !== 'lecons') {
      activeDossierId.current = d.id
      loadFichiers(d.id)
    }
  }

  const openSousDossier = async (parent: any, d: any) => {
    setNav({ level: 'sous_dossier', parent, d })
    activeDossierId.current = d.id
    loadFichiers(d.id)
  }

  const goBack = () => {
    if (nav.level === 'sous_dossier') setNav({ level: 'dossier', d: nav.parent })
    else setNav({ level: 'racine' })
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleFileSelect = (dossierId: string) => {
    activeDossierId.current = dossierId
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUpload({ dossierId: activeDossierId.current, file, nom: file.name.replace(/\.[^.]+$/, ''), classeUnique: true, indexerIA: true })
    e.target.value = ''
  }

  const saveUpload = async () => {
    if (!upload || !profil) return
    if (upload.dossierId.startsWith('virtual_')) {
      alert('Ce dossier n\'existe pas encore en base. Veuillez recharger la page ou créer la classe d\'abord.')
      setUpload(null)
      return
    }
    const { data: dossier } = await supabase
      .from('dossiers_systeme')
      .select('id')
      .eq('id', upload.dossierId)
      .single()
    if (!dossier) {
      alert('Dossier introuvable. Veuillez recharger la page.')
      setUpload(null)
      return
    }
    setUploading(true)
    // Determine type from file extension
    const ext = upload.file.name.split('.').pop()?.toLowerCase() || ''
    const typeMap: Record<string, string> = { pdf: 'document', doc: 'document', docx: 'document', txt: 'document', png: 'image', jpg: 'image', jpeg: 'image', mp4: 'video', mp3: 'audio' }
    const type_fichier = typeMap[ext] || 'document'
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    const nomAuto = `${dateStr}_${classe?.nom || 'Classe'}_${type_fichier}_${upload.nom}`.replace(/\s+/g, '_')

    const { data: f } = await supabase.from('fichiers_dossier').insert({
      dossier_id: upload.dossierId,
      enseignant_id: profil.id,
      classe_id: upload.classeUnique ? id : null,
      nom: upload.nom || nomAuto,
      type_fichier,
      taille_bytes: upload.file.size,
      statut: 'brouillon',
      indexe_studio_ia: upload.indexerIA,
    }).select().single()

    if (f && upload.indexerIA) {
      await supabase.from('studio_ia_memoire').upsert({
        enseignant_id: profil.id,
        classe_id: upload.classeUnique ? id : null,
        cle: f.id,
        contenu: { nom: f.nom, type: f.type_fichier, fichier_id: f.id },
        type: 'ressource',
      }, { onConflict: 'enseignant_id,classe_id,cle' })
    }

    loadFichiers(upload.dossierId)
    setUpload(null)
    setUploading(false)
  }

  const saveCurriculumUpload = async (file: File) => {
    if (!profil || !classe) return
    const curriculumDossier = dossiers.find((d: any) => d.type === 'curriculum')
    if (!curriculumDossier) {
      alert('Dossier curriculum introuvable. Rechargez la page.')
      return
    }
    setUploadingCurriculum(true)
    const storageKey = `${profil.id}/${id}/curriculum/${Date.now()}_${file.name}`
    const { error: storageErr } = await supabase.storage.from('ressources').upload(storageKey, file, { upsert: true })
    if (storageErr) { alert('Erreur upload : ' + storageErr.message); setUploadingCurriculum(false); return }
    const { data: urlData } = await supabase.storage.from('ressources').createSignedUrl(storageKey, 365 * 24 * 3600)
    const url = urlData?.signedUrl || ''
    const { data: f } = await supabase.from('fichiers_dossier').insert({
      dossier_id: curriculumDossier.id,
      enseignant_id: profil.id,
      classe_id: id,
      nom: file.name.replace(/\.[^.]+$/, ''),
      type_fichier: 'curriculum',
      taille_bytes: file.size,
      statut: 'valide',
      url,
      indexe_studio_ia: true,
    }).select().single()
    await supabase.from('classes').update({ curriculum_charge: true }).eq('id', id)
    setClasse((prev: any) => ({ ...prev, curriculum_charge: true }))
    if (f) {
      await supabase.from('studio_ia_memoire').upsert({
        enseignant_id: profil.id,
        classe_id: id,
        cle: `curriculum_${id}`,
        contenu: { nom: f.nom, type: 'curriculum', fichier_id: f.id, url },
        type: 'curriculum',
      }, { onConflict: 'enseignant_id,cle,type' })
    }
    await loadFichiers(curriculumDossier.id)
    setUploadingCurriculum(false)
    alert('✓ Curriculum chargé avec succès !')
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (loading) return <LoadingScreen />

  // ── Current folder label for breadcrumb ──────────────────────────────────
  const getCfg = (type: string) => DOSSIER_CFG[type] || DOSSIER_CFG.custom

  // ── Root dossiers to show (from DB + virtual fallback) ────────────────────
  const rootDossiers = ROOT_TYPES.map(type => {
    const dbRecord = dossiers.find((d: any) => d.type === type && !d.parent_id)
    return dbRecord || { id: `virtual_${type}`, type, nom: getCfg(type).nom, nb_fichiers: 0, virtual: true }
  })

  // ── Leçons grouped for the leçons folder ─────────────────────────────────
  const sequences = lecons.filter(l => l.type_document === 'plan_sequence')
  const plansLecon = lecons.filter(l => l.type_document === 'plan_lecon')
  const leconsCompletes = lecons.filter(l => l.type_document === 'lecon_complete' || !l.type_document)

  // ── Compute breadcrumb ────────────────────────────────────────────────────
  const breadcrumb: { label: string; href?: string; onClick?: () => void }[] = (() => {
    if (nav.level === 'racine') return [{ label: 'Mes classes', href: '/dashboard/classes' }, { label: classe?.nom || '…' }]
    if (nav.level === 'dossier') return [{ label: 'Mes classes', href: '/dashboard/classes' }, { label: classe?.nom, onClick: () => setNav({ level: 'racine' }) }, { label: getCfg(nav.d.type).nom }]
    if (nav.level === 'sous_dossier') return [
      { label: 'Mes classes', href: '/dashboard/classes' },
      { label: classe?.nom, onClick: () => setNav({ level: 'racine' }) },
      { label: getCfg(nav.parent.type).nom, onClick: () => setNav({ level: 'dossier', d: nav.parent }) },
      { label: getCfg(nav.d.type).nom },
    ]
    return []
  })()

  return (
    <div className="app-layout">
      <style>{`
        .folder-grid   { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
        .folder-card   { padding:20px 16px; border-radius:14px; border:1.5px solid rgba(255,255,255,0.07); background:rgba(255,255,255,0.02); cursor:pointer; text-align:center; transition:all 0.18s; }
        .folder-card:hover { transform:translateY(-3px); background:rgba(255,255,255,0.04); }
        .file-grid     { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .file-card     { padding:14px; border-radius:12px; border:1px solid rgba(255,255,255,0.07); background:rgba(255,255,255,0.02); cursor:pointer; transition:all 0.15s; position:relative; }
        .file-card:hover { background:rgba(255,255,255,0.05); }
        .lecon-row     { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.02); cursor:pointer; transition:background 0.15s; margin-bottom:8px; }
        .lecon-row:hover { background:rgba(255,255,255,0.05); }
        .ctx-menu      { position:absolute; top:100%; right:0; background:var(--bg-surface); border:1px solid rgba(255,255,255,0.1); border-radius:10px; min-width:160px; z-index:200; box-shadow:0 8px 24px rgba(0,0,0,0.4); overflow:hidden; }
        .ctx-item      { display:flex; align-items:center; gap:8px; padding:9px 14px; font-size:12px; color:var(--text-2); cursor:pointer; transition:background 0.1s; width:100%; border:none; background:none; text-align:left; font-family:inherit; }
        .ctx-item:hover { background:rgba(255,255,255,0.06); color:var(--text-1); }
        .slide-panel   { position:fixed; top:0; right:0; width:420px; height:100vh; background:var(--bg-surface); border-left:1px solid rgba(255,255,255,0.1); z-index:300; display:flex; flex-direction:column; box-shadow:-12px 0 40px rgba(0,0,0,0.4); overflow-y:auto; }
        .upload-drop   { border:2px dashed rgba(255,255,255,0.15); border-radius:12px; padding:32px 16px; text-align:center; cursor:pointer; transition:all 0.15s; }
        .upload-drop:hover { border-color:rgba(167,139,250,0.5); background:rgba(167,139,250,0.05); }
        .breadcrumb-item { font-size:12px; color:var(--text-4); cursor:default; }
        .breadcrumb-link { color:var(--text-3); cursor:pointer; transition:color 0.15s; }
        .breadcrumb-link:hover { color:var(--text-1); }
      `}</style>

      <Sidebar profil={profil} activeHref={`/dashboard/classes/${id}`} onLogout={handleLogout} />

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.mp4,.mp3,.xlsx,.pptx" />
      <input ref={curriculumInputRef} type="file" style={{ display: 'none' }} accept=".pdf,.doc,.docx,.txt"
        onChange={async e => { const f = e.target.files?.[0]; if (f) await saveCurriculumUpload(f); e.target.value = '' }} />

      <div className="main-content">

        {/* ── Topbar / Header classe ─────────────────────────────────────── */}
        <div style={{ background: `linear-gradient(135deg, ${classe?.couleur || '#1B3F6E'}, ${classe?.couleur || '#1B3F6E'}88)`, padding: '20px 28px 16px' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            {breadcrumb.map((crumb, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>›</span>}
                {crumb.href ? (
                  <span className="breadcrumb-link breadcrumb-item" onClick={() => router.push(crumb.href!)}>{crumb.label}</span>
                ) : crumb.onClick ? (
                  <span className="breadcrumb-link breadcrumb-item" onClick={crumb.onClick}>{crumb.label}</span>
                ) : (
                  <span className="breadcrumb-item" style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{crumb.label}</span>
                )}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'white', margin: '0 0 4px' }}>{classe?.nom}</h1>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>{classe?.niveau}</span>
                <span>·</span>
                <span>{classe?.matiere}</span>
                <span>·</span>
                <span>{classe?.nombre_eleves || 0} élèves</span>
                {classe?.curriculum_charge
                  ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: 'rgba(52,211,153,0.25)', color: '#34D399', borderRadius: 99 }}>✓ Curriculum</span>
                  : <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: 'rgba(251,195,74,0.2)', color: '#FBC34A', borderRadius: 99 }}>⚠ Sans curriculum</span>
                }
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => router.push(`/dashboard/gerer/enseigner?classe=${id}`)}
                style={{ padding: '8px 16px', borderRadius: 9, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                ▶ Enseigner
              </button>
              <button onClick={() => router.push(`/dashboard/profil`)}
                style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', fontSize: 13, cursor: 'pointer' }}>
                ⚙️ Paramètres
              </button>
            </div>
          </div>
        </div>

        <div className="page-content fade-in" onClick={() => { setMenuId(null) }}>

          {/* ── Bouton retour ─────────────────────────────────────────────── */}
          {nav.level !== 'racine' && (
            <button onClick={goBack} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13, cursor: 'pointer', padding: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
              ← Retour
            </button>
          )}

          {/* ── VUE RACINE : grille de dossiers ───────────────────────────── */}
          {nav.level === 'racine' && (
            <>
              <div className="folder-grid">
                {rootDossiers.map(d => {
                  const cfg = getCfg(d.type)
                  const count = d.type === 'lecons' ? lecons.length
                    : d.type === 'preparation' ? 3
                    : d.nb_fichiers || 0
                  return (
                    <div key={d.id} className="folder-card"
                      onClick={() => openDossier(d)}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = `${cfg.couleur}55`)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                    >
                      <div style={{ fontSize: 32, marginBottom: 8 }}>{cfg.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>{cfg.nom}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 10 }}>
                        {count} élément{count !== 1 ? 's' : ''}
                      </div>
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 8 }} />
                      <div style={{ fontSize: 10, color: 'var(--text-4)' }}>
                        {d.created_at ? new Date(d.created_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' }) : '—'}
                      </div>
                    </div>
                  )
                })}
              </div>
              <button onClick={() => {/* TODO: create new folder */}}
                style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 10, border: '1.5px dashed rgba(255,255,255,0.1)', background: 'none', color: 'var(--text-4)', fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'var(--text-2)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-4)' }}>
                + Nouveau dossier
              </button>
            </>
          )}

          {/* ── VUE DOSSIER PRÉPARATION ─────────────────────────────────────── */}
          {nav.level === 'dossier' && nav.d.type === 'preparation' && (
            <div className="folder-grid">
              {PREP_TYPES.map(type => {
                const cfg = getCfg(type)
                const dbRec = dossiers.find(d => d.type === type)
                const d = dbRec || { id: `virtual_${type}`, type, nom: cfg.nom, virtual: true }
                return (
                  <div key={type} className="folder-card"
                    onClick={() => openSousDossier(nav.d, d)}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = `${cfg.couleur}55`)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{cfg.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>{cfg.nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 10 }}>—</div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
                  </div>
                )
              })}
            </div>
          )}

          {/* ── VUE DOSSIER LEÇONS ─────────────────────────────────────────── */}
          {nav.level === 'dossier' && nav.d.type === 'lecons' && (
            <>
              {/* Plans de séquences */}
              {sequences.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>Séquences</div>
                  {sequences.map((seq: any) => (
                    <div key={seq.id} className="lecon-row"
                      onClick={() => router.push(`/dashboard/classes/${id}/lecons/${seq.id}`)}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>📁</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seq.titre}</div>
                        {seq.sujet && <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{seq.sujet}</div>}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{seq.duree_minutes} min</span>
                    </div>
                  ))}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '14px 0' }} />
                </>
              )}
              {/* Leçons */}
              {lecons.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 24px', border: '1.5px dashed rgba(255,255,255,0.1)', borderRadius: 14 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                  <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 16 }}>Aucune leçon — créez-en une depuis Studio IA</div>
                  <button onClick={() => router.push('/dashboard/studio-ia')}
                    style={{ padding: '9px 20px', borderRadius: 9, background: 'linear-gradient(135deg,#6B3FA0,#4F46E5)', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    ✦ Générer une leçon
                  </button>
                </div>
              ) : (
                <div className="file-grid">
                  {leconsCompletes.map((l: any) => {
                    const cfg = FICHIER_CFG[l.type_document || 'lecon_complete'] || FICHIER_CFG.lecon_complete
                    const sc  = STATUT_CFG[l.statut] || STATUT_CFG.brouillon
                    return (
                      <div key={l.id} className="file-card">
                        <div style={{ fontSize: 28, marginBottom: 8, color: cfg.couleur }}>{cfg.icon}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                          {l.titre}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-4)', marginBottom: 8 }}>
                          {new Date(l.updated_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                        </div>
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 8 }} />
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', background: `${sc.color}22`, color: sc.color, borderRadius: 99 }}>{sc.label}</span>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button onClick={() => setApercu(l)} title="Voir" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, color: 'var(--text-3)', fontSize: 13, cursor: 'pointer', padding: '5px 0' }}>👁</button>
                          <button onClick={() => router.push(`/dashboard/classes/${id}/lecons/${l.id}`)} title="Modifier" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, color: 'var(--text-3)', fontSize: 13, cursor: 'pointer', padding: '5px 0' }}>✏️</button>
                          <button onClick={e => { e.stopPropagation(); setMenuId(menuId === l.id ? null : l.id) }} title="Plus" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, color: 'var(--text-3)', fontSize: 13, cursor: 'pointer', padding: '5px 0', position: 'relative' }}>
                            ⋯
                            {menuId === l.id && (
                              <div className="ctx-menu">
                                <button className="ctx-item" onClick={() => router.push(`/dashboard/classes/${id}/lecons/${l.id}`)}>✏️ Modifier</button>
                                <button className="ctx-item" onClick={() => router.push(`/dashboard/classes/${id}/lecons/${l.id}/presenter`)}>▶ Présenter</button>
                                <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '3px 0' }} />
                                <button className="ctx-item" style={{ color: '#F87171' }} onClick={async () => { if (confirm('Supprimer cette leçon ?')) { await supabase.from('lecons').delete().eq('id', l.id); setLecons(prev => prev.filter(ll => ll.id !== l.id)); setMenuId(null) } }}>🗑 Supprimer</button>
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <button onClick={() => router.push(`/dashboard/gerer/preparer`)}
                style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 10, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', color: '#A78BFA', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                ✦ Nouvelle leçon dans Studio IA
              </button>
            </>
          )}

          {/* ── VUE SOUS-DOSSIER CURRICULUM ───────────────────────────────── */}
          {nav.level === 'sous_dossier' && nav.d.type === 'curriculum' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>📋 Curriculum officiel</div>
                {fichiers.some((f: any) => f.type_fichier === 'curriculum') && (
                  <button onClick={() => curriculumInputRef.current?.click()}
                    style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: '#60A5FA', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    🔄 Remplacer
                  </button>
                )}
              </div>
              {fichiers.filter((f: any) => f.type_fichier === 'curriculum').length > 0 ? (
                fichiers.filter((f: any) => f.type_fichier === 'curriculum').map((f: any) => (
                  <div key={f.id} style={{ padding: '20px', borderRadius: 14, border: '1.5px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.05)', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ fontSize: 32, flexShrink: 0 }}>📋</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{f.nom}</div>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: 'rgba(52,211,153,0.2)', color: '#34D399', borderRadius: 99 }}>✓ Curriculum chargé</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
                          Ajouté le {new Date(f.created_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}
                          {f.taille_bytes ? ` · ${Math.round(f.taille_bytes / 1024)} Ko` : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      {f.url && (
                        <button onClick={() => window.open(f.url, '_blank')}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: '#60A5FA', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          👁 Voir
                        </button>
                      )}
                      <button onClick={() => curriculumInputRef.current?.click()}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer' }}>
                        🔄 Remplacer
                      </button>
                      {f.url && (
                        <button onClick={() => { const a = document.createElement('a'); a.href = f.url; a.download = f.nom; a.click() }}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer' }}>
                          📥 Télécharger
                        </button>
                      )}
                      <button onClick={async () => {
                        if (!confirm('Supprimer ce curriculum ?')) return
                        await supabase.from('fichiers_dossier').delete().eq('id', f.id)
                        await supabase.from('classes').update({ curriculum_charge: false }).eq('id', id)
                        setClasse((prev: any) => ({ ...prev, curriculum_charge: false }))
                        setFichiers((prev: any[]) => prev.filter(ff => ff.id !== f.id))
                      }}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.2)', color: '#F87171', fontSize: 12, cursor: 'pointer' }}>
                        🗑 Supprimer
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '40px 24px', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Aucun curriculum chargé</div>
                  <p style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 20, maxWidth: 340, margin: '0 auto 20px' }}>
                    Le curriculum guide l&apos;IA lors de la génération de leçons. Ajoutez le programme officiel de votre classe.
                  </p>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button onClick={() => curriculumInputRef.current?.click()} disabled={uploadingCurriculum}
                      style={{ padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#2D5FA0,#6B3FA0)', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: uploadingCurriculum ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, opacity: uploadingCurriculum ? 0.7 : 1 }}>
                      ⬆️ {uploadingCurriculum ? 'Chargement…' : 'Importer le curriculum'}
                    </button>
                    <button onClick={() => router.push(`/dashboard/studio-ia?type=curriculum&classe=${id}`)}
                      style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', color: '#A78BFA', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      ✦ Générer avec IA
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── VUE SOUS-DOSSIER / DOSSIER GÉNÉRIQUE ──────────────────────── */}
          {((nav.level === 'sous_dossier' && nav.d.type !== 'curriculum') || (nav.level === 'dossier' && nav.d.type !== 'preparation' && nav.d.type !== 'lecons')) && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                  {getCfg(nav.level === 'sous_dossier' ? nav.d.type : (nav as any).d.type).icon} {' '}
                  {getCfg(nav.level === 'sous_dossier' ? nav.d.type : (nav as any).d.type).nom}
                </div>
                <button onClick={() => handleFileSelect(nav.level === 'sous_dossier' ? nav.d.id : (nav as any).d.id)}
                  style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: '#60A5FA', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  ⬆️ Uploader
                </button>
              </div>

              {fichiers.length === 0 ? (
                <div className="upload-drop" onClick={() => handleFileSelect(nav.level === 'sous_dossier' ? nav.d.id : (nav as any).d.id)}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
                  <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 6 }}>Ce dossier est vide</div>
                  <div style={{ fontSize: 12, color: 'var(--text-4)' }}>Déposez des fichiers ici ou cliquez pour uploader</div>
                </div>
              ) : (
                <div className="file-grid">
                  {fichiers.map((f: any) => {
                    const cfg = FICHIER_CFG[f.type_fichier] || FICHIER_CFG.document
                    const sc  = STATUT_CFG[f.statut] || STATUT_CFG.brouillon
                    return (
                      <div key={f.id} className="file-card">
                        <div style={{ fontSize: 28, marginBottom: 8, color: cfg.couleur }}>{cfg.icon}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                          {(f.nom || '').slice(0, 20)}{(f.nom?.length || 0) > 20 ? '…' : ''}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-4)', marginBottom: 8 }}>
                          {new Date(f.created_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                        </div>
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 8 }} />
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', background: `${sc.color}22`, color: sc.color, borderRadius: 99 }}>{sc.label}</span>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button onClick={() => setApercu(f)} title="Voir" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, color: 'var(--text-3)', fontSize: 13, cursor: 'pointer', padding: '5px 0' }}>👁</button>
                          <button title="Modifier" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, color: 'var(--text-3)', fontSize: 13, cursor: 'pointer', padding: '5px 0' }}>✏️</button>
                          <button onClick={e => { e.stopPropagation(); setMenuId(menuId === f.id ? null : f.id) }} title="Plus" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, color: 'var(--text-3)', fontSize: 13, cursor: 'pointer', padding: '5px 0', position: 'relative' }}>
                            ⋯
                            {menuId === f.id && (
                              <div className="ctx-menu">
                                <button className="ctx-item">📝 Renommer</button>
                                <button className="ctx-item">📂 Déplacer vers…</button>
                                <button className="ctx-item">📑 Dupliquer</button>
                                <button className="ctx-item">🔗 Partager</button>
                                {f.url && <button className="ctx-item" onClick={() => window.open(f.url, '_blank')}>📥 Télécharger</button>}
                                <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '3px 0' }} />
                                <button className="ctx-item" style={{ color: '#F87171' }} onClick={async () => { if (confirm('Supprimer ?')) { await supabase.from('fichiers_dossier').delete().eq('id', f.id); setFichiers(prev => prev.filter(ff => ff.id !== f.id)); setMenuId(null) } }}>🗑 Supprimer</button>
                              </div>
                            )}
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

      {/* ── Panneau aperçu latéral ─────────────────────────────────────────── */}
      {apercu && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 299 }} onClick={() => setApercu(null)} />
          <div className="slide-panel">
            <div style={{ padding: '20px 20px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{apercu.titre || apercu.nom}</div>
                <button onClick={() => setApercu(null)} style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 20, cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {apercu.type_document && <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{apercu.type_document}</span>}
                {apercu.statut && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', background: `${(STATUT_CFG[apercu.statut]?.color || '#94A3B8')}22`, color: STATUT_CFG[apercu.statut]?.color || '#94A3B8', borderRadius: 99 }}>
                    {STATUT_CFG[apercu.statut]?.label || apercu.statut}
                  </span>
                )}
              </div>
            </div>
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
              {apercu.contenu_json ? (
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
                  {apercu.contenu_json.intention && <div style={{ marginBottom: 12 }}><strong>Intention :</strong><br /><span dangerouslySetInnerHTML={{ __html: apercu.contenu_json.intention }} /></div>}
                  {apercu.contenu_json.avant_amorce && <div style={{ marginBottom: 12 }}><strong>Avant — Amorce :</strong><br /><span dangerouslySetInnerHTML={{ __html: apercu.contenu_json.avant_amorce }} /></div>}
                  {apercu.contenu_json.pendant_modelisation && <div style={{ marginBottom: 12 }}><strong>Pendant — Modélisation :</strong><br /><span dangerouslySetInnerHTML={{ __html: apercu.contenu_json.pendant_modelisation }} /></div>}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-4)', textAlign: 'center', paddingTop: 32 }}>
                  Aucun aperçu disponible
                </div>
              )}
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8 }}>
              <button onClick={() => { apercu.classe_id ? router.push(`/dashboard/classes/${apercu.classe_id}/lecons/${apercu.id}`) : undefined; setApercu(null) }}
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', color: '#A78BFA', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                ✏️ Modifier
              </button>
              <button style={{ flex: 1, padding: '9px 0', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer' }}>
                📥 Télécharger
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Modal upload ──────────────────────────────────────────────────── */}
      {upload && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 399 }} onClick={() => setUpload(null)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-surface)', borderRadius: 16, padding: 28, width: 440, zIndex: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>⬆️ Configurer le fichier</div>
              <button onClick={() => setUpload(null)} style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Nom du fichier</label>
              <input value={upload.nom} onChange={e => setUpload({ ...upload, nom: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-1)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Cette ressource concerne</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ v: true, l: 'Cette classe uniquement' }, { v: false, l: 'Toutes mes classes' }].map(opt => (
                  <button key={String(opt.v)} type="button" onClick={() => setUpload({ ...upload, classeUnique: opt.v })}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `1.5px solid ${upload.classeUnique === opt.v ? '#60A5FA' : 'var(--border)'}`, background: upload.classeUnique === opt.v ? 'rgba(96,165,250,0.1)' : 'transparent', color: upload.classeUnique === opt.v ? '#60A5FA' : 'var(--text-3)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 10, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>Ajouter au Studio IA</div>
                <div style={{ fontSize: 11, color: 'var(--text-4)' }}>L&apos;IA tiendra compte de ce fichier</div>
              </div>
              <div onClick={() => setUpload({ ...upload, indexerIA: !upload.indexerIA })}
                style={{ width: 36, height: 20, borderRadius: 99, background: upload.indexerIA ? '#A78BFA' : 'rgba(255,255,255,0.15)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 2, left: upload.indexerIA ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
              </div>
            </div>

            <button onClick={saveUpload} disabled={uploading || !upload.nom}
              style={{ width: '100%', padding: '11px 0', borderRadius: 10, background: 'linear-gradient(135deg,#6B3FA0,#4F46E5)', border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
              {uploading ? '⟳ Sauvegarde...' : '💾 Sauvegarder'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
