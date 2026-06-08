'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'
import { useAuth } from '@/lib/hooks/useAuth'
import { useForfait } from '@/lib/hooks/useForfait'
import ApercuGeneration from '@/components/ApercuGeneration'
import GabaritUpload from '@/components/GabaritUpload'
import type { ForfaitType } from '@/lib/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'memoire' | 'nourrir' | 'generer' | 'historique'

// ─── Constants ────────────────────────────────────────────────────────────────

const STYLES_PEDA = [
  { id: 'explicite',            label: 'Enseignement explicite',   desc: 'Modélisation claire, étapes structurées, exemples concrets' },
  { id: 'socioconstructiviste', label: 'Socioconstructiviste',     desc: 'Apprentissage collaboratif, travail en équipe, discussion' },
  { id: 'differentie',         label: 'Différencié',              desc: 'Adaptation selon les besoins, niveaux multiples' },
  { id: 'par_projet',          label: 'Par projet',               desc: "Apprentissage par l'expérience et la création" },
  { id: 'mixte',               label: 'Mixte / Flexible',         desc: 'Combinaison selon le contexte et les besoins' },
]
const NIVEAUX = [
  'Maternelle','1re année','2e année','3e année','4e année','5e année','6e année',
  '7e année','8e année','9e année','10e année','11e année','12e année',
  'Secondaire 1','Secondaire 2','Secondaire 3','Secondaire 4','Secondaire 5',
  'Cégep','Université',
]
const MATIERES = [
  'Français','English','Mathématiques','Sciences','Histoire','Géographie',
  'Arts plastiques','Musique','Éducation physique','Informatique','Philosophie','Autre',
]
const TYPES_CONTENU_HIST = [
  { id: 'tous',            label: 'Tous',           icon: '✦'  },
  { id: 'lecon_complete',  label: 'Leçon',          icon: '📚' },
  { id: 'plan_lecon',      label: 'Plan',           icon: '📝' },
  { id: 'quiz',            label: 'Quiz',           icon: '❓' },
  { id: 'activite',        label: 'Activité',       icon: '🧩' },
  { id: 'email_parents',   label: 'Email',          icon: '💌' },
  { id: 'rapport_eleve',   label: 'Rapport',        icon: '👤' },
  { id: 'compte_rendu',    label: 'Compte-rendu',   icon: '📊' },
]
const TYPES_GENERATION = [
  { id: 'lecon_complete',    icon: '📚', label: 'Leçon complète',     desc: 'AVANT / PENDANT / APRÈS',    color: '#A78BFA' },
  { id: 'plan_lecon',        icon: '📝', label: 'Plan de leçon',      desc: 'Plan structuré et concis',   color: '#60A5FA' },
  { id: 'activite',          icon: '🧩', label: 'Activité',           desc: 'Activité pédagogique',       color: '#34D399' },
  { id: 'devoir',            icon: '📓', label: 'Devoir',             desc: 'Travail à la maison',        color: '#FBC34A' },
  { id: 'quiz',              icon: '❓', label: 'Quiz',               desc: 'Questions avec corrigé',     color: '#F472B6' },
  { id: 'email_parents',     icon: '💌', label: 'Email parents',      desc: 'Communication familles',     color: '#FB923C' },
  { id: 'courrier_officiel', icon: '📋', label: 'Courrier officiel',  desc: 'Document formel',            color: '#94A3B8' },
  { id: 'rapport_eleve',     icon: '👤', label: 'Rapport élève',      desc: 'Commentaires bulletin',      color: '#E879F9' },
  { id: 'image_peda',        icon: '🖼️', label: 'Image pédagogique', desc: 'Description de visuel',      color: '#22D3EE' },
  { id: 'script_video',      icon: '🎬', label: 'Script vidéo',       desc: 'Capsule pédagogique',        color: '#F87171' },
  { id: 'compte_rendu',      icon: '📊', label: 'Compte-rendu',       desc: 'Synthèse de réunion',        color: '#A3E635' },
  { id: 'note_auto',         icon: '⚡', label: 'Note automatique',   desc: 'Annotation rapide',          color: '#FDE68A' },
]
const MEMOIRE_GROUPES: Record<string, { label: string; icon: string }> = {
  gabarit:       { label: 'Gabarits et style',        icon: '📐' },
  style:         { label: 'Gabarits et style',        icon: '📐' },
  ressource:     { label: 'Ressources pédagogiques',  icon: '📚' },
  lecon_exemple: { label: 'Leçons exemples',          icon: '✨' },
  instruction:   { label: 'Instructions personnelles',icon: '⚙️' },
  image:         { label: 'Images',                   icon: '🖼️' },
  lien:          { label: 'Liens',                    icon: '🔗' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudioIAPage() {
  const { profil, loading: authLoading, logout } = useAuth()
  useForfait((profil?.forfait || 'gratuit') as ForfaitType)
  const [classes, setClasses]         = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [tab, setTab]                 = useState<Tab>('memoire')
  const supabase = createClient()
  const router   = useRouter()

  // ── Profil IA ─────────────────────────────────────────────────────────────────
  const [profilForm, setProfilForm] = useState({
    style_peda: 'explicite', niveaux: [] as string[], matieres: [] as string[],
    duree_typique: '75', groupes_typiques: '25', langue_ia: 'fr', ton_ia: 'professionnel',
    inclure_differentiation: true, inclure_evaluation: true,
    inclure_vocabulaire: true, inclure_perspective_autochtone: false,
    instructions_perso: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  // ── Mémoire IA ────────────────────────────────────────────────────────────────
  const [memoires,    setMemoires]    = useState<any[]>([])
  const [memoireLoad, setMemoireLoad] = useState(false)

  // ── Ressources upload ─────────────────────────────────────────────────────────
  const [studioRessources, setStudioRessources] = useState<any[]>([])
  const [ressourcesLoad,   setRessourcesLoad]   = useState(false)
  const [uploadFile,       setUploadFile]       = useState<File | null>(null)
  const [uploadTitre,      setUploadTitre]      = useState('')
  const [uploadLink,       setUploadLink]       = useState('')
  const [uploadCible,      setUploadCible]      = useState<'generale' | 'specifique'>('generale')
  const [uploadClasseId,   setUploadClasseId]   = useState('')
  const [uploadDoing,      setUploadDoing]      = useState(false)
  const [dragOver,         setDragOver]         = useState(false)

  // ── Générer ───────────────────────────────────────────────────────────────────
  const [genType,        setGenType]        = useState('')
  const [genClasse,      setGenClasse]      = useState('')
  const [genLecon,       setGenLecon]       = useState('')
  const [genLecons,      setGenLecons]      = useState<any[]>([])
  const [genLeconData,   setGenLeconData]   = useState<any>(null)
  const [genSujet,       setGenSujet]       = useState('')
  const [genDuree,       setGenDuree]       = useState('75')
  const [genNbQuestions, setGenNbQuestions] = useState('8')
  const [genEleve,       setGenEleve]       = useState('')
  const [genDestinataire,setGenDestinataire]= useState('')
  const [genContexte,    setGenContexte]    = useState('')
  const [genDiff,        setGenDiff]        = useState(false)
  const [generating,     setGenerating]     = useState(false)
  const [apercuData,     setApercuData]     = useState<{ content: string; type: string } | null>(null)

  // ── Historique ────────────────────────────────────────────────────────────────
  const [generations,  setGenerations]  = useState<any[]>([])
  const [filtre,       setFiltre]       = useState('tous')
  const [classeFiltre, setClasseFiltre] = useState('')
  const [recherche,    setRecherche]    = useState('')
  const [selectionne,  setSelectionne]  = useState<any>(null)
  const [histCopied,   setHistCopied]   = useState(false)

  // ── Init ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profil) return
    const load = async () => {
      if (profil.profil_ia) setProfilForm(f => ({ ...f, ...(profil.profil_ia as any) }))
      const { data: cls } = await supabase.from('classes').select('*').eq('enseignant_id', profil.id).order('created_at', { ascending: false })
      const list = cls || []
      setClasses(list)
      if (list[0]) setGenClasse(list[0].id)
      const { data: gens } = await supabase.from('generations_ia').select('*').eq('enseignant_id', profil.id).order('created_at', { ascending: false }).limit(100)
      setGenerations(gens || [])
      setDataLoading(false)
    }
    load()
  }, [profil])

  useEffect(() => {
    if (tab === 'memoire' && profil) loadMemoires()
    if (tab === 'nourrir'  && profil) loadRessources()
  }, [tab, profil])

  useEffect(() => {
    if (!genClasse) { setGenLecons([]); setGenLecon(''); setGenLeconData(null); return }
    supabase.from('lecons').select('id,titre,sujet,statut,duree_minutes,contenu_json')
      .eq('classe_id', genClasse).order('updated_at', { ascending: false }).limit(30)
      .then(({ data }) => setGenLecons(data || []))
  }, [genClasse])

  useEffect(() => {
    setGenLeconData(genLecon ? genLecons.find(l => l.id === genLecon) || null : null)
  }, [genLecon, genLecons])

  // ── Mémoire IA ────────────────────────────────────────────────────────────────
  const loadMemoires = useCallback(async () => {
    if (!profil) return
    setMemoireLoad(true)
    const { data } = await supabase.from('studio_ia_memoire').select('*').eq('enseignant_id', profil.id).order('created_at', { ascending: false })
    setMemoires(data || [])
    setMemoireLoad(false)
  }, [profil, supabase])

  const handleDeleteMemoire = async (id: string) => {
    await supabase.from('studio_ia_memoire').delete().eq('id', id)
    setMemoires(prev => prev.filter(m => m.id !== id))
  }

  // ── Ressources IA ─────────────────────────────────────────────────────────────
  const loadRessources = useCallback(async () => {
    if (!profil) return
    setRessourcesLoad(true)
    const { data } = await supabase.from('studio_ia_ressources').select('*, classe:classes(nom)').eq('enseignant_id', profil.id).order('created_at', { ascending: false })
    setStudioRessources(data || [])
    setRessourcesLoad(false)
  }, [profil, supabase])

  const handleDeleteRessource = async (id: string) => {
    await supabase.from('studio_ia_ressources').delete().eq('id', id)
    setStudioRessources(prev => prev.filter((r: any) => r.id !== id))
  }

  const handleUploadRessource = async () => {
    if (!profil) return
    setUploadDoing(true)
    let contenu_texte = ''
    if (uploadFile) { try { contenu_texte = await uploadFile.text() } catch { contenu_texte = '' } }
    await supabase.from('studio_ia_ressources').insert({
      enseignant_id: profil.id,
      classe_id:     uploadCible === 'specifique' ? (uploadClasseId || null) : null,
      source:        'upload_personnel',
      type_contenu:  uploadFile?.type || (uploadLink ? 'lien' : 'document'),
      titre:         uploadTitre || uploadFile?.name || uploadLink || 'Sans titre',
      contenu_texte: contenu_texte.slice(0, 10000),
      est_general:   uploadCible === 'generale',
    })
    setUploadDoing(false)
    setUploadFile(null); setUploadTitre(''); setUploadLink(''); setUploadCible('generale'); setUploadClasseId('')
    loadRessources()
  }

  // ── Profil save ───────────────────────────────────────────────────────────────
  const handleSaveProfil = async (e?: React.FormEvent) => {
    e?.preventDefault(); setSaving(true)
    await supabase.from('utilisateurs').update({ profil_ia: profilForm }).eq('id', profil!.id)
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  const toggleItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]

  // ── Build system prompt ───────────────────────────────────────────────────────
  const buildSystemPrompt = useCallback(() => {
    const classe = classes.find(c => c.id === genClasse)
    const pf = profilForm
    let ctx = `Tu es KlassIA+, un assistant pédagogique expert dédié à l'enseignement francophone canadien.\n\nStyle pédagogique : ${pf.style_peda}\nTon : ${pf.ton_ia}\n`
    if (classe) ctx += `\nClasse : ${classe.nom} · ${classe.matiere || ''} · ${classe.niveau || ''} · ${classe.nombre_eleves || pf.groupes_typiques} élèves · ${pf.duree_typique} min`
    if (genLeconData) ctx += `\nLeçon : ${genLeconData.titre} (${genLeconData.sujet || ''})`
    if (pf.inclure_differentiation)        ctx += '\nInclure des stratégies de différenciation.'
    if (pf.inclure_perspective_autochtone) ctx += '\nIntégrer la perspective autochtone si pertinent.'
    if (pf.instructions_perso)             ctx += `\nInstructions : ${pf.instructions_perso}`
    ctx += '\n\nRéponds de manière structurée, concrète et directement utilisable.'
    return ctx
  }, [classes, genClasse, genLeconData, profilForm])

  // ── Generate ──────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!genType || generating) return
    setGenerating(true)
    const typeInfo = TYPES_GENERATION.find(t => t.id === genType)
    const demandes: Record<string, string> = {
      lecon_complete:    `Génère une leçon complète avec les phases AVANT / PENDANT / APRÈS. Sujet : ${genSujet}. Durée : ${genDuree} min.${genDiff ? ' Inclure différenciation.' : ''}`,
      plan_lecon:        `Génère un plan de leçon structuré. Sujet : ${genSujet}. Durée : ${genDuree} min.${genDiff ? ' Inclure différenciation.' : ''}`,
      activite:          `Crée une activité pédagogique engageante. Sujet : ${genSujet}. Durée : ${genDuree} min.`,
      devoir:            `Crée un devoir ou travail à la maison. Sujet : ${genSujet}.`,
      quiz:              `Crée un quiz de ${genNbQuestions} questions à choix multiples avec corrigé. Sujet : ${genSujet}.`,
      email_parents:     `Rédige un email professionnel pour les familles. Objet / contexte : ${genContexte}.`,
      courrier_officiel: `Rédige un courrier officiel formel. Destinataire : ${genDestinataire}. Objet : ${genContexte}.`,
      rapport_eleve:     `Rédige des commentaires de bulletin pour l'élève : ${genEleve}. Contexte : ${genContexte}.`,
      image_peda:        `Décris en détail une image pédagogique conceptuelle sur : ${genSujet}. Format adapté au niveau enseigné.`,
      script_video:      `Rédige un script de capsule vidéo pédagogique. Sujet : ${genSujet}. Durée : ${genDuree} minutes.`,
      compte_rendu:      `Rédige un compte-rendu structuré. Contexte / réunion : ${genContexte}.`,
      note_auto:         `Génère une note pédagogique rapide et structurée. Contenu : ${genContexte}.`,
    }
    const instructions = buildSystemPrompt() + '\n\n' + (demandes[genType] || `Génère : ${typeInfo?.label}`)
    try {
      const classe = classes.find(c => c.id === genClasse)
      const res = await fetch('/api/ia/generer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_contenu: genType,
          sujet: genSujet || genContexte || typeInfo?.label,
          duree: parseInt(genDuree) || 75,
          instructions,
          contexte: classe ? { classe: { nom: classe.nom, niveau: classe.niveau, matiere: classe.matiere, nombre_eleves: classe.nombre_eleves } } : {},
          langue: profilForm.langue_ia || 'fr',
          profil_ia: profilForm,
        }),
      })
      const data = await res.json()
      const content = data.contenu || '(pas de réponse)'
      setApercuData({ content, type: genType })
      if (profil?.id && !content.startsWith('⚠')) {
        const { data: newGen } = await supabase.from('generations_ia').insert({
          enseignant_id: profil.id, classe_id: genClasse || null,
          type_contenu: genType, contenu_genere: content, langue: profilForm.langue_ia || 'fr',
        }).select().single()
        if (newGen) setGenerations(prev => [newGen, ...prev])
      }
    } catch {
      alert('Erreur de génération. Vérifiez votre clé API Anthropic dans .env.local.')
    }
    setGenerating(false)
  }

  // ── Historique handlers ───────────────────────────────────────────────────────
  const handleDeleteGen = async (id: string) => {
    await supabase.from('generations_ia').delete().eq('id', id)
    setGenerations(prev => prev.filter(g => g.id !== id))
    if (selectionne?.id === id) setSelectionne(null)
  }
  const handleToggleSave = async (gen: any) => {
    const newVal = !gen.sauvegarde
    await supabase.from('generations_ia').update({ sauvegarde: newVal }).eq('id', gen.id)
    setGenerations(prev => prev.map(g => g.id === gen.id ? { ...g, sauvegarde: newVal } : g))
    if (selectionne?.id === gen.id) setSelectionne({ ...gen, sauvegarde: newVal })
  }
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text); setHistCopied(true); setTimeout(() => setHistCopied(false), 2000)
  }

  const formatDate = (d: string) => {
    const dt = new Date(d), now = new Date(), diff = Math.floor((now.getTime() - dt.getTime()) / 60000)
    if (diff < 60)   return `Il y a ${diff} min`
    if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`
    return dt.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const Toggle = ({ val, onChange, label, desc }: { val: boolean; onChange: () => void; label: string; desc?: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{desc}</div>}
      </div>
      <div onClick={onChange} style={{ width: 40, height: 22, borderRadius: 99, background: val ? 'var(--violet)' : 'var(--border)', display: 'flex', alignItems: 'center', padding: 3, cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', transform: val ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
      </div>
    </div>
  )

  if (authLoading || dataLoading) return <LoadingScreen />

  const forfait    = (profil?.forfait || 'gratuit') as ForfaitType
  const genTypeInfo= TYPES_GENERATION.find(t => t.id === genType)
  const selClasse  = classes.find(c => c.id === genClasse)
  const genFiltered = generations
    .filter(g => filtre === 'tous' || g.type_contenu === filtre)
    .filter(g => !classeFiltre || g.classe_id === classeFiltre)
    .filter(g => !recherche || g.contenu_genere?.toLowerCase().includes(recherche.toLowerCase()))

  const memoiresByGroup: Record<string, any[]> = {}
  for (const m of memoires) {
    const label = MEMOIRE_GROUPES[m.type]?.label || 'Autres'
    if (!memoiresByGroup[label]) memoiresByGroup[label] = []
    memoiresByGroup[label].push(m)
  }

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/studio-ia" onLogout={logout} />

      {apercuData && (
        <ApercuGeneration
          titre={genSujet || genTypeInfo?.label || 'Contenu généré'}
          type="lecon"
          contenu_html={apercuData.content.replace(/\n/g, '<br/>')}
          forfait={forfait}
          onValider={() => setApercuData(null)}
          onModifier={() => setApercuData(null)}
          onRegenerer={() => { setApercuData(null); handleGenerate() }}
          onClose={() => setApercuData(null)}
        />
      )}

      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div className="topbar" style={{ flexShrink: 0 }}>
          <div>
            <div className="topbar-title">✦ Studio IA</div>
            <div className="topbar-sub">Mémoire · Nourrir · Générer · Historique</div>
          </div>
          {saved && <span style={{ fontSize: 12, padding: '6px 12px', background: 'var(--green-pale)', color: 'var(--green)', borderRadius: 'var(--radius-sm)' }}>✓ Profil sauvegardé</span>}
        </div>

        {/* Onglets */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px', flexShrink: 0 }}>
          {([
            { id: 'memoire',    label: '🧠 Ma mémoire IA'  },
            { id: 'nourrir',    label: '📥 Nourrir mon IA' },
            { id: 'generer',    label: '✦ Générer'          },
            { id: 'historique', label: '🕐 Historique'      },
          ] as { id: Tab; label: string }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '14px 20px', border: 'none', background: 'transparent',
              fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? '#A78BFA' : 'var(--text-3)',
              borderBottom: `2px solid ${tab === t.id ? '#A78BFA' : 'transparent'}`,
              cursor: 'pointer', transition: 'all 0.15s', marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        {/* ══════════════════ MA MÉMOIRE IA ════════════════════════════════════ */}
        {tab === 'memoire' && (
          <div className="page-content fade-in">
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Ce que votre IA connaît</h2>
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Toutes les ressources, gabarits et instructions qui personnalisent vos générations.</p>
            </div>

            {memoireLoad ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-4)', fontSize: 13 }}>Chargement…</div>
            ) : memoires.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 64 }}>
                <div style={{ fontSize: 56, marginBottom: 14, opacity: 0.3 }}>🧠</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>Aucune mémoire encore</div>
                <div style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 20 }}>
                  Nourrissez votre IA en uploadant des ressources, décrivant votre style ou ajoutant des instructions permanentes.
                </div>
                <button className="btn-violet" onClick={() => setTab('nourrir')}>📥 Nourrir mon IA →</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {Object.entries(memoiresByGroup).map(([groupe, items]) => {
                  const icon = Object.values(MEMOIRE_GROUPES).find(g => g.label === groupe)?.icon || '📁'
                  return (
                    <div key={groupe}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 15 }}>{icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{groupe}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-4)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 99 }}>{items.length}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {items.map(m => (
                          <div key={m.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ fontSize: 20, flexShrink: 0 }}>{MEMOIRE_GROUPES[m.type]?.icon || '📁'}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{m.cle || 'Sans titre'}</span>
                                <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: 'rgba(167,139,250,0.15)', color: '#A78BFA', flexShrink: 0 }}>✦ Actif</span>
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{formatDate(m.created_at)}</div>
                            </div>
                            <button onClick={() => handleDeleteMemoire(m.id)} style={{ flexShrink: 0, padding: '5px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, color: '#F87171', fontSize: 11, cursor: 'pointer' }}>
                              🗑 Retirer
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ NOURRIR MON IA ═══════════════════════════════════ */}
        {tab === 'nourrir' && (
          <div className="page-content fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

              {/* Gauche: Style pédagogique + Niveaux/Matières + Paramètres + Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="card">
                  <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📐 Mon style pédagogique</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {STYLES_PEDA.map(s => (
                      <div key={s.id} onClick={() => setProfilForm({ ...profilForm, style_peda: s.id })} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: `2px solid ${profilForm.style_peda === s.id ? 'var(--violet)' : 'var(--border)'}`, background: profilForm.style_peda === s.id ? 'var(--violet-pale)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${profilForm.style_peda === s.id ? 'var(--violet)' : 'var(--border)'}`, background: profilForm.style_peda === s.id ? 'var(--violet)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {profilForm.style_peda === s.id && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: profilForm.style_peda === s.id ? 'var(--violet)' : 'var(--text-1)' }}>{s.label}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{s.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Niveaux enseignés</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                    {NIVEAUX.map(n => (
                      <button key={n} type="button" onClick={() => setProfilForm({ ...profilForm, niveaux: toggleItem(profilForm.niveaux, n) })} style={{ padding: '4px 10px', borderRadius: 99, border: `1.5px solid ${profilForm.niveaux.includes(n) ? '#60A5FA' : 'var(--border)'}`, background: profilForm.niveaux.includes(n) ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.04)', color: profilForm.niveaux.includes(n) ? '#60A5FA' : 'var(--text-3)', fontSize: 11, fontWeight: profilForm.niveaux.includes(n) ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>{n}</button>
                    ))}
                  </div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Matières enseignées</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {MATIERES.map(m => (
                      <button key={m} type="button" onClick={() => setProfilForm({ ...profilForm, matieres: toggleItem(profilForm.matieres, m) })} style={{ padding: '4px 10px', borderRadius: 99, border: `1.5px solid ${profilForm.matieres.includes(m) ? 'var(--violet)' : 'var(--border)'}`, background: profilForm.matieres.includes(m) ? 'var(--violet-pale)' : 'rgba(255,255,255,0.04)', color: profilForm.matieres.includes(m) ? '#A78BFA' : 'var(--text-3)', fontSize: 11, fontWeight: profilForm.matieres.includes(m) ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>{m}</button>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Paramètres typiques</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Durée typique',   key: 'duree_typique',     opts: ['45','50','60','75','80','90','100','120'].map(d => ({ v: d, l: `${d} min` })) },
                      { label: 'Groupe typique',  key: 'groupes_typiques',  opts: ['10','15','20','25','28','30','32','35'].map(n => ({ v: n, l: `${n} élèves` })) },
                      { label: 'Langue IA',        key: 'langue_ia',         opts: [{ v: 'fr', l: '🇫🇷 Français' }, { v: 'en', l: '🇨🇦 English' }] },
                      { label: 'Ton',              key: 'ton_ia',            opts: [{ v: 'professionnel', l: 'Professionnel' }, { v: 'chaleureux', l: 'Chaleureux' }, { v: 'concis', l: 'Concis' }, { v: 'detaille', l: 'Détaillé' }] },
                    ].map(field => (
                      <div key={field.key} className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 10 }}>{field.label}</label>
                        <select value={(profilForm as any)[field.key]} onChange={e => setProfilForm({ ...profilForm, [field.key]: e.target.value })} style={{ fontSize: 12 }}>
                          {field.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Inclus automatiquement</h3>
                  <Toggle val={profilForm.inclure_differentiation} onChange={() => setProfilForm({ ...profilForm, inclure_differentiation: !profilForm.inclure_differentiation })} label="Stratégies de différenciation" desc="Dyslexie, TDAH, Allophone" />
                  <Toggle val={profilForm.inclure_evaluation}      onChange={() => setProfilForm({ ...profilForm, inclure_evaluation: !profilForm.inclure_evaluation })}           label="Critères d'évaluation"       desc="Grilles et critères de réussite" />
                  <Toggle val={profilForm.inclure_vocabulaire}     onChange={() => setProfilForm({ ...profilForm, inclure_vocabulaire: !profilForm.inclure_vocabulaire })}           label="Vocabulaire clé"             desc="Liste des termes importants" />
                  <Toggle val={profilForm.inclure_perspective_autochtone} onChange={() => setProfilForm({ ...profilForm, inclure_perspective_autochtone: !profilForm.inclure_perspective_autochtone })} label="Perspective autochtone" desc="Alberta, Saskatchewan, C.-B." />
                </div>

                <button type="button" onClick={() => handleSaveProfil()} disabled={saving} className="btn-violet" style={{ opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Sauvegarde...' : '✦ Sauvegarder mon profil IA'}
                </button>
              </div>

              {/* Droite: Upload + Gabarit + Instructions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="card">
                  <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>📥 Uploader des ressources</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>DOCX, PDF, TXT, images, vidéos, liens — KlassIA+ analysera et mémorisera.</p>

                  {/* Zone drag & drop */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => {
                      e.preventDefault(); setDragOver(false)
                      const f = e.dataTransfer.files[0]
                      if (f) { setUploadFile(f); if (!uploadTitre) setUploadTitre(f.name.replace(/\.[^.]+$/, '')) }
                    }}
                    onClick={() => document.getElementById('studio-file-input')?.click()}
                    style={{ border: `2px dashed ${dragOver ? 'var(--violet)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', padding: '20px 14px', textAlign: 'center' as const, cursor: 'pointer', transition: 'all 0.2s', background: dragOver ? 'var(--violet-pale)' : 'rgba(255,255,255,0.02)', marginBottom: 10 }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{uploadFile ? '📄' : '📁'}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: dragOver ? '#A78BFA' : 'var(--text-2)', marginBottom: 3 }}>
                      {uploadFile ? uploadFile.name : 'Glisser un fichier ici'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-4)' }}>
                      {uploadFile ? `${(uploadFile.size / 1024).toFixed(0)} ko` : 'ou cliquer pour choisir · DOCX, PDF, TXT, images'}
                    </div>
                    <input id="studio-file-input" type="file" accept=".txt,.md,.pdf,.docx,.csv,.jpg,.jpeg,.png" onChange={e => {
                      const f = e.target.files?.[0] ?? null
                      setUploadFile(f)
                      if (f && !uploadTitre) setUploadTitre(f.name.replace(/\.[^.]+$/, ''))
                    }} style={{ display: 'none' }} />
                  </div>

                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="form-label" style={{ fontSize: 10 }}>Ou coller un lien</label>
                    <input value={uploadLink} onChange={e => setUploadLink(e.target.value)} placeholder="https://..." style={{ fontSize: 12 }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="form-label" style={{ fontSize: 10 }}>Titre</label>
                    <input value={uploadTitre} onChange={e => setUploadTitre(e.target.value)} placeholder="Titre de la ressource" style={{ fontSize: 12 }} />
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {(['generale', 'specifique'] as const).map(v => (
                      <div key={v} onClick={() => setUploadCible(v)} style={{ flex: 1, padding: '7px 8px', borderRadius: 8, border: `1.5px solid ${uploadCible === v ? 'var(--violet)' : 'var(--border)'}`, background: uploadCible === v ? 'var(--violet-pale)' : 'rgba(255,255,255,0.04)', cursor: 'pointer', textAlign: 'center' as const }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: uploadCible === v ? '#A78BFA' : 'var(--text-3)' }}>
                          {v === 'generale' ? '🌍 Toutes les classes' : '🏫 Classe spécifique'}
                        </div>
                      </div>
                    ))}
                  </div>
                  {uploadCible === 'specifique' && (
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <select value={uploadClasseId} onChange={e => setUploadClasseId(e.target.value)} style={{ fontSize: 12 }}>
                        <option value="">Choisir une classe…</option>
                        {classes.map((c: any) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                    </div>
                  )}
                  <button onClick={handleUploadRessource} disabled={uploadDoing || (!uploadFile && !uploadLink) || !uploadTitre.trim()} className="btn-violet" style={{ width: '100%', fontSize: 12, opacity: uploadDoing || (!uploadFile && !uploadLink) || !uploadTitre.trim() ? 0.5 : 1 }}>
                    {uploadDoing ? '✦ Analyse en cours…' : '✦ Analyser et mémoriser'}
                  </button>

                  {/* Liste */}
                  {ressourcesLoad ? null : studioRessources.length > 0 && (
                    <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 8 }}>
                        {studioRessources.length} ressource{studioRessources.length !== 1 ? 's' : ''} indexée{studioRessources.length !== 1 ? 's' : ''}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 180, overflowY: 'auto' }}>
                        {studioRessources.slice(0, 10).map((r: any) => (
                          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: 13 }}>📄</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{r.titre || 'Sans titre'}</div>
                              <div style={{ fontSize: 9, color: 'var(--text-4)' }}>{formatDate(r.created_at)}</div>
                            </div>
                            <button onClick={() => handleDeleteRessource(r.id)} style={{ fontSize: 10, color: '#F87171', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="card" style={{ background: 'var(--violet-light)', border: '1px solid rgba(107,63,160,0.15)' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--violet)', marginBottom: 4 }}>📂 Mon gabarit de leçon</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>Importez votre propre gabarit (DOCX ou PDF). KlassIA+ reproduira sa structure à chaque génération.</p>
                  {profil && (
                    <GabaritUpload
                      profilId={profil.id}
                      currentUrl={(profil as any).gabarit_lecon_url}
                      onAnalysed={(analyse) => { console.info('Gabarit analysé:', analyse) }}
                    />
                  )}
                </div>

                <div className="card" style={{ background: 'var(--violet-light)', border: '1px solid rgba(107,63,160,0.15)' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--violet)', marginBottom: 4 }}>⚙️ Instructions permanentes</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>Contexte spécifique toujours injecté — vos élèves, votre école, vos contraintes particulières.</p>
                  <textarea
                    value={profilForm.instructions_perso}
                    onChange={e => setProfilForm({ ...profilForm, instructions_perso: e.target.value })}
                    rows={5}
                    placeholder="Ex: Toujours proposer des activités de mouvement pour les élèves TDAH. Inclure une connexion avec la vie réelle..."
                    style={{ width: '100%', padding: '12px', border: '1.5px solid rgba(107,63,160,0.3)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6, outline: 'none', resize: 'vertical' as const, background: 'rgba(255,255,255,0.05)', boxSizing: 'border-box' as const }}
                  />
                  <button type="button" onClick={() => handleSaveProfil()} disabled={saving} className="btn-violet" style={{ marginTop: 10, opacity: saving ? 0.7 : 1, fontSize: 12 }}>
                    {saving ? 'Sauvegarde...' : '✦ Sauvegarder les instructions'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ GÉNÉRER ══════════════════════════════════════════ */}
        {tab === 'generer' && (
          <div className="page-content fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

              {/* Gauche: grille 12 types + champs contextuels */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 12 }}>Choisir un type de contenu</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                  {TYPES_GENERATION.map(t => (
                    <div key={t.id} onClick={() => setGenType(t.id)} style={{ padding: '14px 10px', borderRadius: 'var(--radius-md)', border: `2px solid ${genType === t.id ? t.color : 'var(--border)'}`, background: genType === t.id ? `${t.color}18` : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' as const }}>
                      <div style={{ fontSize: 20, marginBottom: 5 }}>{t.icon}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: genType === t.id ? t.color : 'var(--text-1)', marginBottom: 2 }}>{t.label}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-4)', lineHeight: 1.3 }}>{t.desc}</div>
                    </div>
                  ))}
                </div>

                {genType && (
                  <div className="card fade-in">
                    <div style={{ fontSize: 14, fontWeight: 700, color: genTypeInfo?.color || 'var(--text-1)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{genTypeInfo?.icon}</span>
                      <span>{genTypeInfo?.label}</span>
                    </div>

                    {/* Classe */}
                    {!['courrier_officiel', 'note_auto'].includes(genType) && (
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>Classe</label>
                        <select value={genClasse} onChange={e => { setGenClasse(e.target.value); setGenLecon('') }} style={{ fontSize: 12 }}>
                          <option value="">Aucune classe</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Leçon associée */}
                    {['lecon_complete','plan_lecon','activite','quiz','devoir'].includes(genType) && genClasse && (
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>Leçon associée (optionnel)</label>
                        <select value={genLecon} onChange={e => setGenLecon(e.target.value)} style={{ fontSize: 12 }}>
                          <option value="">Aucune</option>
                          {genLecons.map(l => <option key={l.id} value={l.id}>{l.titre}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Sujet */}
                    {['lecon_complete','plan_lecon','activite','devoir','quiz','image_peda','script_video'].includes(genType) && (
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>Sujet</label>
                        <input value={genSujet} onChange={e => setGenSujet(e.target.value)} placeholder={`Sujet de ${genTypeInfo?.label.toLowerCase()}…`} style={{ fontSize: 12 }} />
                      </div>
                    )}

                    {/* Durée */}
                    {['lecon_complete','plan_lecon','activite','script_video'].includes(genType) && (
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>{genType === 'script_video' ? 'Durée de la vidéo' : 'Durée'}</label>
                        <select value={genDuree} onChange={e => setGenDuree(e.target.value)} style={{ fontSize: 12 }}>
                          {(genType === 'script_video'
                            ? [['1','1 min'],['2','2 min'],['3','3 min'],['5','5 min'],['10','10 min']]
                            : [['45','45 min'],['60','60 min'],['75','75 min'],['90','90 min'],['120','2h']]
                          ).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Nb questions */}
                    {genType === 'quiz' && (
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>Nombre de questions</label>
                        <select value={genNbQuestions} onChange={e => setGenNbQuestions(e.target.value)} style={{ fontSize: 12 }}>
                          {['5','8','10','15','20'].map(n => <option key={n} value={n}>{n} questions</option>)}
                        </select>
                      </div>
                    )}

                    {/* Élève */}
                    {genType === 'rapport_eleve' && (
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>Prénom de l'élève</label>
                        <input value={genEleve} onChange={e => setGenEleve(e.target.value)} placeholder="Prénom…" style={{ fontSize: 12 }} />
                      </div>
                    )}

                    {/* Destinataire */}
                    {genType === 'courrier_officiel' && (
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>Destinataire</label>
                        <input value={genDestinataire} onChange={e => setGenDestinataire(e.target.value)} placeholder="Ex: Direction de l'école…" style={{ fontSize: 12 }} />
                      </div>
                    )}

                    {/* Contexte */}
                    {['email_parents','courrier_officiel','rapport_eleve','compte_rendu','note_auto'].includes(genType) && (
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>
                          {genType === 'email_parents' ? 'Objet / contexte' :
                           genType === 'courrier_officiel' ? 'Objet du courrier' :
                           genType === 'rapport_eleve' ? 'Contexte / période' :
                           genType === 'compte_rendu' ? 'Type de réunion / contexte' :
                           'Contenu à noter'}
                        </label>
                        <textarea value={genContexte} onChange={e => setGenContexte(e.target.value)}
                          rows={genType === 'note_auto' ? 4 : 2}
                          placeholder={genType === 'email_parents' ? 'Ex: Sortie scolaire du 15 mars…' : ''}
                          style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12, fontFamily: 'inherit', outline: 'none', resize: 'vertical' as const, background: 'rgba(255,255,255,0.05)', boxSizing: 'border-box' as const }} />
                      </div>
                    )}

                    {/* Toggle différenciation */}
                    {['lecon_complete','plan_lecon'].includes(genType) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div onClick={() => setGenDiff(!genDiff)} style={{ width: 36, height: 20, borderRadius: 99, background: genDiff ? 'var(--violet)' : 'var(--border)', display: 'flex', alignItems: 'center', padding: 2, cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                          <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', transform: genDiff ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Inclure différenciation</span>
                      </div>
                    )}

                    <button onClick={handleGenerate} disabled={generating} className="btn-violet" style={{ width: '100%', opacity: generating ? 0.7 : 1 }}>
                      {generating ? '⟳ Génération en cours…' : `✦ Générer ${genTypeInfo?.label}`}
                    </button>
                  </div>
                )}

                {!genType && (
                  <div style={{ textAlign: 'center' as const, padding: '32px 0', color: 'var(--text-4)', fontSize: 13 }}>
                    ↑ Choisissez un type de contenu pour commencer
                  </div>
                )}
              </div>

              {/* Droite: Profil actif + Classe active + Dernières générations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="card" style={{ background: 'linear-gradient(135deg, var(--violet-light), var(--violet-pale))', border: '1px solid rgba(107,63,160,0.15)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--violet)', marginBottom: 8 }}>✦ Votre profil IA actif</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-2)' }}>
                    <div>Style : <strong style={{ color: 'var(--text-1)' }}>{STYLES_PEDA.find(s => s.id === profilForm.style_peda)?.label || profilForm.style_peda}</strong></div>
                    <div>Durée : <strong style={{ color: 'var(--text-1)' }}>{profilForm.duree_typique} min</strong></div>
                    <div>Ton : <strong style={{ color: 'var(--text-1)' }}>{profilForm.ton_ia}</strong></div>
                    {profilForm.matieres.length > 0 && <div>Matières : <strong style={{ color: 'var(--text-1)' }}>{profilForm.matieres.slice(0, 2).join(', ')}{profilForm.matieres.length > 2 ? '…' : ''}</strong></div>}
                  </div>
                  <button onClick={() => setTab('nourrir')} style={{ marginTop: 10, width: '100%', padding: '7px', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 8, color: '#A78BFA', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    ✎ Modifier le profil →
                  </button>
                </div>

                {selClasse && (
                  <div className="card">
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8 }}>CLASSE ACTIVE</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: selClasse.couleur || 'var(--violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 14 }}>
                        {selClasse.nom?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{selClasse.nom}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{selClasse.niveau} · {selClasse.matiere}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="card">
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 10 }}>Dernières générations</div>
                  {generations.slice(0, 4).map(g => {
                    const ti = TYPES_GENERATION.find(t => t.id === g.type_contenu)
                    return (
                      <div key={g.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{ti?.icon || '✦'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{g.contenu_genere?.substring(0, 45)}…</div>
                          <div style={{ fontSize: 9, color: 'var(--text-4)' }}>{formatDate(g.created_at)}</div>
                        </div>
                      </div>
                    )
                  })}
                  {generations.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-4)', textAlign: 'center' as const, padding: '10px 0' }}>Aucune génération encore</div>}
                  {generations.length > 0 && (
                    <button onClick={() => setTab('historique')} style={{ marginTop: 8, width: '100%', padding: '6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-3)', fontSize: 11, cursor: 'pointer' }}>
                      Voir tout l'historique →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ HISTORIQUE ════════════════════════════════════════ */}
        {tab === 'historique' && (
          <div className="page-content fade-in">
            {generations.length === 0 ? (
              <div className="card" style={{ textAlign: 'center' as const, padding: 64 }}>
                <div style={{ fontSize: 56, marginBottom: 14, opacity: 0.4 }}>✦</div>
                <h3 style={{ marginBottom: 8 }}>Aucune génération encore</h3>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>Utilisez l'onglet Générer pour créer vos premiers contenus pédagogiques</p>
                <button className="btn-violet" onClick={() => setTab('generer')}>✦ Générer du contenu</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <div style={{ marginBottom: 14 }}>
                    <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="🔍 Rechercher dans les générations..." style={{ marginBottom: 10 }} />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {TYPES_CONTENU_HIST.map(t => (
                        <button key={t.id} onClick={() => setFiltre(t.id)} style={{ padding: '5px 12px', borderRadius: 99, border: `1.5px solid ${filtre === t.id ? 'var(--violet)' : 'var(--border)'}`, background: filtre === t.id ? 'var(--violet-pale)' : 'rgba(255,255,255,0.04)', color: filtre === t.id ? 'var(--violet)' : 'var(--text-3)', fontSize: 11, fontWeight: filtre === t.id ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                          {t.icon} {t.label}
                        </button>
                      ))}
                      <select value={classeFiltre} onChange={e => setClasseFiltre(e.target.value)} style={{ padding: '5px 10px', borderRadius: 99, border: '1.5px solid var(--border)', fontSize: 11, background: 'rgba(255,255,255,0.04)', cursor: 'pointer', outline: 'none' }}>
                        <option value="">Toutes les classes</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 8 }}>{genFiltered.length} résultat{genFiltered.length !== 1 ? 's' : ''}</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
                    {genFiltered.map(gen => {
                      const ti = TYPES_GENERATION.find(t => t.id === gen.type_contenu) || { icon: '✦', label: gen.type_contenu || 'Contenu', color: '#A78BFA' }
                      const cls = classes.find(c => c.id === gen.classe_id)
                      const isSel = selectionne?.id === gen.id
                      return (
                        <div key={gen.id} onClick={() => setSelectionne(gen)} style={{ background: isSel ? 'var(--violet-light)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${isSel ? 'var(--violet)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', padding: 14, cursor: 'pointer', transition: 'all 0.15s' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 18 }}>{ti.icon}</span>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: isSel ? 'var(--violet)' : 'var(--text-1)' }}>{ti.label}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{formatDate(gen.created_at)}</div>
                              </div>
                            </div>
                            {gen.sauvegarde && <span style={{ fontSize: 10, padding: '2px 7px', background: 'var(--green-pale)', color: 'var(--green)', borderRadius: 99, fontWeight: 600 }}>★ Sauvegardé</span>}
                          </div>
                          {cls && <span className="badge badge-blue" style={{ fontSize: 10, marginBottom: 6, display: 'inline-block' }}>{cls.nom}</span>}
                          <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>{gen.contenu_genere?.substring(0, 120)}...</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  {!selectionne ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', textAlign: 'center' as const, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 48, minHeight: 400 }}>
                      <div style={{ fontSize: 48, marginBottom: 14, opacity: 0.3 }}>✦</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-3)' }}>Sélectionne une génération</div>
                    </div>
                  ) : (
                    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'sticky', top: 80 }}>
                      <div style={{ background: 'linear-gradient(135deg, var(--violet), #4A2882)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 3 }}>
                            {TYPES_GENERATION.find(t => t.id === selectionne.type_contenu)?.icon || '✦'} {TYPES_GENERATION.find(t => t.id === selectionne.type_contenu)?.label || selectionne.type_contenu}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                            {formatDate(selectionne.created_at)}{classes.find(c => c.id === selectionne.classe_id) && ` · ${classes.find(c => c.id === selectionne.classe_id)?.nom}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handleCopy(selectionne.contenu_genere)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                            {histCopied ? '✓ Copié' : '📋 Copier'}
                          </button>
                          <button onClick={() => handleToggleSave(selectionne)} style={{ padding: '6px 12px', background: selectionne.sauvegarde ? 'rgba(46,204,113,0.3)' : 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                            {selectionne.sauvegarde ? '★ Sauvegardé' : '☆ Sauvegarder'}
                          </button>
                          <button onClick={() => handleDeleteGen(selectionne.id)} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.7)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>✕</button>
                        </div>
                      </div>
                      <div style={{ padding: 20, maxHeight: 'calc(100vh - 360px)', overflowY: 'auto', fontSize: 13, lineHeight: 1.8, color: 'var(--text-1)', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                        {selectionne.contenu_genere}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
