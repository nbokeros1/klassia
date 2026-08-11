'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import LoadingScreen from '@/components/LoadingScreen'
import CadenasForFait from '@/components/ui/CadenasForFait'
import { peutCreerClasse } from '@/lib/hooks/useForfait'

// ─── Constants ───────────────────────────────────────────────────────────────

const COULEURS = [
  '#1B3F6E', '#6B3FA0', '#2D7DD2', '#2ECC71',
  '#E8634A', '#F39C12', '#C9A84C', '#0A7065',
]

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterKey   = 'tous' | 'a_faire' | 'en_cours' | 'termines'
type SortKey     = 'recent' | 'activity' | 'name' | 'progress'
type CheckState  = 'done' | 'in_progress' | 'empty'
type SmartStatus = 'configuration' | 'construction' | 'pret' | 'termine'

interface CheckItem    { label: string; state: CheckState }
interface SubjectStyle { symbol: string; bg: string; accent: string }

// ─── Smart status config ─────────────────────────────────────────────────────

const STATUS_CFG: Record<SmartStatus, {
  color: string; bg: string; border: string; icon: string; label: string
}> = {
  configuration: { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', icon: '○', label: 'Configuration' },
  construction:  { color: '#6D5DF6', bg: '#EDE9FE', border: '#C4B5FD', icon: '◉', label: 'Construction'  },
  pret:          { color: '#059669', bg: '#D1FAE5', border: '#6EE7B7', icon: '✓', label: 'Prêt'          },
  termine:       { color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD', icon: '★', label: 'Terminé'       },
}

const FILTER_LABELS: Record<FilterKey, string> = {
  tous: 'Tous', a_faire: 'À faire', en_cours: 'En cours', termines: 'Terminées',
}
const SORT_LABELS: Record<SortKey, string> = {
  recent: 'Récentes', activity: 'Activité', progress: 'Progression', name: 'Nom',
}

// ─── Helpers purs ────────────────────────────────────────────────────────────

function getMatieres(cls: any): string {
  if (Array.isArray(cls.matieres) && cls.matieres.length > 0) return cls.matieres.join(' · ')
  return cls.matiere || ''
}

function formatRelative(date: Date): string {
  const diff    = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours   = Math.floor(diff / 3600000)
  const days    = Math.floor(diff / 86400000)
  if (minutes < 2)  return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  if (hours < 24)   return `il y a ${hours} h`
  if (days === 1)   return 'hier'
  if (days < 7)     return `il y a ${days} j`
  return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = (hex || '#6D5DF6').replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) || 109
  const g = parseInt(clean.slice(2, 4), 16) || 93
  const b = parseInt(clean.slice(4, 6), 16) || 246
  return `rgba(${r},${g},${b},${alpha})`
}

function getSubjectStyle(matiere: string): SubjectStyle {
  const m = (matiere || '').toLowerCase()
  if (m.includes('math'))
    return { symbol: '∑',  bg: '#EDE9FE', accent: '#7C3AED' }
  if (m.includes('sci') || m.includes('bio') || m.includes('chim') || m.includes('phys'))
    return { symbol: 'Sc', bg: '#DCFCE7', accent: '#16A34A' }
  if (m.includes('franç') || m.includes('franc') || m.includes('litt') || m.includes('compos'))
    return { symbol: 'Aa', bg: '#FEF3C7', accent: '#B45309' }
  if (m.includes('hist') || m.includes('civil') || m.includes('étude') || m.includes('etude'))
    return { symbol: 'Hs', bg: '#FEF9C3', accent: '#92400E' }
  if (m.includes('géo') || m.includes('geo') || m.includes('world'))
    return { symbol: 'Ge', bg: '#D1FAE5', accent: '#065F46' }
  if (m.includes('musi') || m.includes('choeur') || m.includes('chœur'))
    return { symbol: '♩',  bg: '#DBEAFE', accent: '#1D4ED8' }
  if (m.includes('art') || m.includes('dessin') || m.includes('plast') || m.includes('visuel'))
    return { symbol: '✦',  bg: '#FCE7F3', accent: '#9D174D' }
  if (m.includes('info') || m.includes('techno') || m.includes('num') || m.includes('program'))
    return { symbol: '⌘',  bg: '#E0E7FF', accent: '#3730A3' }
  if (m.includes('angl') || m.includes('engl'))
    return { symbol: 'En', bg: '#E0F2FE', accent: '#075985' }
  if (m.includes('sport') || m.includes('eps') || m.includes('physique'))
    return { symbol: 'Ep', bg: '#FFF7ED', accent: '#9A3412' }
  if (m.includes('soc') || m.includes('human') || m.includes('social'))
    return { symbol: 'Sh', bg: '#FEF9C3', accent: '#78350F' }
  return { symbol: '', bg: '', accent: '' }
}

function getSmartStatus(yearPct: number, cls: any, pack: any): SmartStatus {
  if (yearPct === 100) return 'termine'
  if (!cls.curriculum_charge && !pack) return 'configuration'
  if (yearPct >= 67)   return 'pret'
  return 'construction'
}

function getProgressTag(yearPct: number, checklist: CheckItem[]): string {
  if (yearPct === 100) return 'Terminé'
  if (yearPct === 0)   return 'Non commencé'
  const remaining = checklist.filter(i => i.state !== 'done').length
  if (remaining === 1) return '1 tâche restante'
  if (remaining === 2) return '2 tâches restantes'
  if (yearPct >= 80)   return 'Presque prêt'
  if (yearPct >= 50)   return 'En cours'
  return 'Démarré'
}

function getActionText(
  status: SmartStatus,
  cls: any,
  totalLecons: number,
  enseignees: number,
  fichiersQuiz: any[],
): string {
  switch (status) {
    case 'configuration':
      return !cls.curriculum_charge ? 'Construire le syllabus' : 'Construire le plan annuel'
    case 'construction':
      if (totalLecons === 0) return 'Préparer la première leçon'
      if (fichiersQuiz.length === 0 && enseignees >= totalLecons) return 'Préparer le quiz'
      if (enseignees < totalLecons) return `Reprendre la leçon ${enseignees + 1}`
      return 'Construire les séquences'
    case 'pret':
      return 'Classe prête pour demain'
    case 'termine':
      return 'Exporter le Teaching Pack'
  }
}

function getSubText(
  status: SmartStatus,
  totalLecons: number,
  enseignees: number,
  lastActivity: Date | null,
): string {
  if (status === 'termine') return 'Tous les objectifs sont terminés.'
  if (status === 'pret')    return 'Vous pouvez enseigner maintenant.'
  const remaining = totalLecons - enseignees
  if (remaining > 0) return `Il reste ${remaining} leçon${remaining !== 1 ? 's' : ''}.`
  if (lastActivity)  return `Dernière modification ${formatRelative(lastActivity)}.`
  return 'Compléter les informations de la classe.'
}

// ─── TagInput ────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  const add = (value: string) => {
    const v = value.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setInput('')
  }
  const remove = (tag: string) => onChange(tags.filter(t => t !== tag))

  return (
    <div
      onClick={() => ref.current?.focus()}
      style={{
        display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center',
        padding: '6px 10px', border: '1.5px solid var(--color-input-border)',
        borderRadius: 9, background: 'var(--color-input-bg)', cursor: 'text', minHeight: 40,
      }}
    >
      {tags.map(t => (
        <span key={t} style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px',
          borderRadius: 99, background: 'var(--color-accent-violet-bg)',
          border: '1px solid var(--color-border-accent)',
          color: 'var(--color-accent-violet)', fontSize: 11, fontWeight: 600,
        }}>
          {t}
          <button type="button" onClick={() => remove(t)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0 1px', fontSize: 11, lineHeight: 1, opacity: .7 }}>
            ×
          </button>
        </span>
      ))}
      <input
        ref={ref} value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ',') && input.trim()) { e.preventDefault(); add(input) }
          if (e.key === 'Backspace' && !input && tags.length > 0) remove(tags[tags.length - 1])
        }}
        onBlur={() => { if (input.trim()) add(input) }}
        placeholder={tags.length === 0 ? 'Ex: Maths, Français… (Entrée pour ajouter)' : '+ Ajouter'}
        style={{
          border: 'none', background: 'none', outline: 'none', fontSize: 12,
          color: 'var(--color-text-primary)', minWidth: 120, flex: 1, fontFamily: 'inherit',
        }}
      />
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ClassesPage() {
  // ── Données (logique métier intégralement préservée) ──────────────────────
  const [classes,         setClasses]         = useState<any[]>([])
  const [leconsByClass,   setLeconsByClass]   = useState<Record<string, any[]>>({})
  const [fichiersByClass, setFichiersByClass] = useState<Record<string, any[]>>({})
  const [packsByClass,    setPacksByClass]    = useState<Record<string, any>>({})
  const [profil,          setProfil]          = useState<any>(null)
  const [loading,         setLoading]         = useState(true)
  const [showForm,        setShowForm]        = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [createWarning,   setCreateWarning]   = useState<string | null>(null)

  // ── Micro feedback (infrastructure — branché par futures routes IA) ───────
  const [microFeedbackMap, setMicroFeedbackMap] = useState<Record<string, string | null>>({})
  const showMicro = useCallback((classId: string, message: string) => {
    setMicroFeedbackMap(prev => ({ ...prev, [classId]: message }))
    setTimeout(() => {
      setMicroFeedbackMap(prev => ({ ...prev, [classId]: null }))
    }, 2000)
  }, [])
  void showMicro

  // ── UI ────────────────────────────────────────────────────────────────────
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState<FilterKey>('tous')
  const [sortBy,     setSortBy]     = useState<SortKey>('recent')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const [form, setForm] = useState({
    nom: '', niveau: '', matieres: [] as string[],
    nombre_eleves: '', couleur: '#1B3F6E', langue: 'fr',
  })

  const supabase = createClient()
  const router   = useRouter()

  useEffect(() => {
    if (!activeMenu) return
    const close = () => setActiveMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [activeMenu])

  // ── Chargement données ────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const user = session.user

      let { data: p } = await supabase.from('utilisateurs').select('*').eq('user_id', user.id).single()
      if (!p) {
        const { data: nouveau } = await supabase.from('utilisateurs').upsert({
          user_id: user.id, email: user.email,
          prenom: user.user_metadata?.prenom || '',
          nom:    user.user_metadata?.nom    || '',
          ecole:  user.user_metadata?.ecole  || '',
          type_compte: 'enseignant', langue_interface: 'fr', langue_enseignement: 'fr',
        }, { onConflict: 'user_id' }).select().single()
        if (!nouveau) { router.push('/login'); return }
        p = nouveau
      }
      setProfil(p)

      const { data: cls } = await supabase
        .from('classes').select('*').eq('enseignant_id', p.id).order('created_at', { ascending: false })
      const clsList = cls || []
      setClasses(clsList)

      if (clsList.length > 0) {
        const classIds = clsList.map((c: any) => c.id)

        const { data: lecons } = await supabase
          .from('lecons').select('classe_id, statut, updated_at').in('classe_id', classIds)
        const grouped = (lecons || []).reduce((acc: Record<string, any[]>, l) => {
          if (!acc[l.classe_id]) acc[l.classe_id] = []
          acc[l.classe_id].push(l)
          return acc
        }, {})
        setLeconsByClass(grouped)

        const { data: dossiers } = await supabase
          .from('dossiers_systeme').select('id, classe_id').in('classe_id', classIds)
        if (dossiers && dossiers.length > 0) {
          const dossierIds = dossiers.map((d: any) => d.id)
          const dossierToClasse: Record<string, string> = Object.fromEntries(
            dossiers.map((d: any) => [d.id, d.classe_id])
          )
          const { data: fichiers } = await supabase
            .from('fichiers_dossier').select('dossier_id, type_fichier').in('dossier_id', dossierIds)
          const groupedFichiers = (fichiers || []).reduce((acc: Record<string, any[]>, f) => {
            const classeId = dossierToClasse[f.dossier_id]
            if (!classeId) return acc
            if (!acc[classeId]) acc[classeId] = []
            acc[classeId].push(f)
            return acc
          }, {})
          setFichiersByClass(groupedFichiers)
        }

        const { data: packs } = await supabase
          .from('teaching_packs').select('id, classe_id, created_at').in('classe_id', classIds)
        const groupedPacks = (packs || []).reduce((acc: Record<string, any>, p) => {
          acc[p.classe_id] = p; return acc
        }, {})
        setPacksByClass(groupedPacks)
      }

      setLoading(false)
    }
    init()
  }, [])

  // ── Création classe (inchangée) ───────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profil?.id) return
    setSaving(true)

    const matieresPrimaire = form.matieres[0] || ''
    const { data, error } = await supabase.from('classes').insert({
      enseignant_id: profil.id, nom: form.nom, niveau: form.niveau,
      matiere: matieresPrimaire,
      matieres: form.matieres.length > 0 ? form.matieres : null,
      nombre_eleves: parseInt(form.nombre_eleves) || 0,
      couleur: form.couleur, langue: form.langue, annee_scolaire: '2025-2026',
    }).select().single()

    if (!error && data) {
      const matieresEnEchec: string[] = []
      for (const matiere of form.matieres.slice(1)) {
        const { error: rpcError } = await supabase.rpc('ajouter_matiere_classe', {
          p_classe_id: data.id, p_enseignant_id: profil.id,
          p_matiere: matiere, p_couleur: form.couleur,
        })
        if (rpcError) matieresEnEchec.push(matiere)
      }
      setClasses(prev => [data, ...prev])
      setShowForm(false)
      setForm({ nom: '', niveau: '', matieres: [], nombre_eleves: '', couleur: '#1B3F6E', langue: 'fr' })
      setCreateWarning(matieresEnEchec.length > 0
        ? `Les dossiers de ${matieresEnEchec.map(m => `"${m}"`).join(', ')} n'ont pas pu être configurés.`
        : null
      )
    }
    setSaving(false)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getPct = useCallback((cls: any): number => {
    const leconsTable    = leconsByClass[cls.id]   || []
    const fichiers       = fichiersByClass[cls.id] || []
    const fichiersLecons = fichiers.filter((f: any) =>
      ['plan_lecon', 'fiche_lecon', 'lecon_complete'].includes(f.type_fichier)
    )
    const totalLecons = leconsTable.length + fichiersLecons.length
    const enseignees  = leconsTable.filter((l: any) => ['enseignee', 'complete'].includes(l.statut)).length
    return totalLecons > 0 ? Math.round((enseignees / totalLecons) * 100) : 0
  }, [leconsByClass, fichiersByClass])

  const lastActivityByClass = useMemo((): Record<string, Date | null> => {
    const map: Record<string, Date | null> = {}
    for (const cls of classes) {
      const lecons = leconsByClass[cls.id] || []
      const dates  = lecons
        .map((l: any) => l.updated_at ? new Date(l.updated_at) : null)
        .filter((d): d is Date => d !== null)
      map[cls.id] = dates.length > 0
        ? new Date(Math.max(...dates.map(d => d.getTime())))
        : null
    }
    return map
  }, [classes, leconsByClass])

  const filteredClasses = useMemo(() => {
    let list = [...classes]

    if (filter !== 'tous') {
      list = list.filter(cls => {
        const pack           = packsByClass[cls.id] || null
        const leconsTable    = leconsByClass[cls.id]   || []
        const fichiers       = fichiersByClass[cls.id] || []
        const fichiersLecons = fichiers.filter((f: any) =>
          ['plan_lecon', 'fiche_lecon', 'lecon_complete'].includes(f.type_fichier)
        )
        const totalLecons = leconsTable.length + fichiersLecons.length
        const enseignees  = leconsTable.filter((l: any) => ['enseignee', 'complete'].includes(l.statut)).length
        const pct = totalLecons > 0 ? Math.round((enseignees / totalLecons) * 100) : 0

        if (filter === 'a_faire')  return !pack && !cls.curriculum_charge
        if (filter === 'en_cours') return (pack || cls.curriculum_charge) && pct < 100
        if (filter === 'termines') return pct === 100
        return true
      })
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(cls =>
        cls.nom?.toLowerCase().includes(q) ||
        cls.niveau?.toLowerCase().includes(q) ||
        cls.annee_scolaire?.toLowerCase().includes(q) ||
        cls.matiere?.toLowerCase().includes(q) ||
        (Array.isArray(cls.matieres) && cls.matieres.some((m: string) => m.toLowerCase().includes(q)))
      )
    }

    if (sortBy === 'name') {
      list.sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'))
    } else if (sortBy === 'progress') {
      list.sort((a, b) => getPct(b) - getPct(a))
    } else if (sortBy === 'activity') {
      list.sort((a, b) => {
        const da = lastActivityByClass[a.id]
        const db = lastActivityByClass[b.id]
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        return db.getTime() - da.getTime()
      })
    }

    return list
  }, [classes, filter, search, sortBy, getPct, lastActivityByClass, packsByClass, leconsByClass, fichiersByClass])

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) return <LoadingScreen />

  const isFr      = profil?.langue_interface !== 'en'
  const prenom    = profil?.prenom ?? profil?.email?.split('@')[0] ?? ''
  const initiales = prenom ? prenom[0].toUpperCase() : (profil?.email?.[0] ?? 'E').toUpperCase()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }`}</style>

      <Sidebar profil={profil} activeHref="/dashboard/classes"
        onLogout={async () => { await supabase.auth.signOut(); router.push('/login') }} />

      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8FAFC' }}>
        <Topbar notifCount={0} initiales={initiales} isFr={isFr} />

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div className="c12-page">

            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="c12-page-header">
              <div>
                <h1 className="c12-page-title">Mes classes</h1>
                <p className="c12-page-sub">
                  {classes.length} classe{classes.length !== 1 ? 's' : ''} · Année scolaire 2025-2026
                </p>
              </div>
              <CadenasForFait
                fonctionnalite="classes_illimitees"
                forfait_actuel={profil?.forfait || 'gratuit'}
                bloque={!peutCreerClasse(profil, classes.length)}
                messageCustom="Limite de classes atteinte pour votre forfait"
                forfait_cible={profil?.forfait === 'pro' ? 'pro_plus' : 'pro'}
              >
                <button onClick={() => setShowForm(true)} className="c12-btn-new">
                  + Nouvelle classe
                </button>
              </CadenasForFait>
            </div>

            {/* ── Avertissement création partielle ────────────────────── */}
            {createWarning && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', marginBottom: 16, borderRadius: 12, background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)', animation: 'fadeUp .2s ease both' }}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
                <div style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{createWarning}</div>
                <button onClick={() => setCreateWarning(null)} style={{ background: 'none', border: 'none', fontSize: 16, color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px' }}>✕</button>
              </div>
            )}

            {/* ── Formulaire de création (inchangé) ───────────────────── */}
            {showForm && (
              <div className="glass-light" style={{ borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 32, boxShadow: 'var(--shadow-card)', animation: 'fadeUp .2s ease both' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Nouvelle classe</div>
                  <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                </div>
                <form onSubmit={handleCreate}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Nom de la classe *</label>
                      <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Français 3e A" required
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid rgba(15,35,65,0.12)', background: 'rgba(255,255,255,0.8)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Niveau *</label>
                      <input value={form.niveau} onChange={e => setForm({ ...form, niveau: e.target.value })} placeholder="Ex: Secondaire 3" required
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid rgba(15,35,65,0.12)', background: 'rgba(255,255,255,0.8)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Nombre d&apos;élèves</label>
                      <input type="number" value={form.nombre_eleves} onChange={e => setForm({ ...form, nombre_eleves: e.target.value })} placeholder="Ex: 28"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid rgba(15,35,65,0.12)', background: 'rgba(255,255,255,0.8)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Langue d&apos;enseignement</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[{ v: 'fr', l: 'Français' }, { v: 'en', l: 'English' }].map(lang => (
                          <button key={lang.v} type="button" onClick={() => setForm({ ...form, langue: lang.v })}
                            style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1.5px solid ${form.langue === lang.v ? 'var(--violet)' : 'rgba(15,35,65,0.12)'}`, background: form.langue === lang.v ? 'rgba(108,92,231,0.1)' : 'transparent', color: form.langue === lang.v ? 'var(--violet)' : 'var(--text-secondary)', fontSize: 12, fontWeight: form.langue === lang.v ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                            {lang.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Matières enseignées *</label>
                    <TagInput tags={form.matieres} onChange={matieres => setForm({ ...form, matieres })} />
                    {form.matieres.length === 0 && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Appuyez sur Entrée ou virgule après chaque matière</div>
                    )}
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Couleur</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                      {COULEURS.map(c => (
                        <div key={c} onClick={() => setForm({ ...form, couleur: c })}
                          style={{ width: 30, height: 30, borderRadius: '50%', background: c, cursor: 'pointer', border: form.couleur === c ? '3px solid var(--text-primary)' : '3px solid transparent', boxShadow: form.couleur === c ? `0 0 0 2px ${c}44` : 'none', transition: 'all 0.15s' }} />
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" disabled={saving || form.matieres.length === 0}
                      style={{ padding: '9px 20px', fontSize: 13, fontWeight: 600, background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: saving || form.matieres.length === 0 ? 'not-allowed' : 'pointer', opacity: saving || form.matieres.length === 0 ? 0.6 : 1, fontFamily: 'inherit' }}>
                      {saving ? 'Création...' : 'Créer la classe'}
                    </button>
                    <button type="button" onClick={() => setShowForm(false)}
                      style={{ padding: '9px 18px', fontSize: 13, color: 'var(--text-secondary)', background: 'transparent', border: '1px solid rgba(15,35,65,0.12)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── Empty state ──────────────────────────────────────────── */}
            {classes.length === 0 && !showForm && (
              <div className="c12-empty">
                <div className="c12-empty-illo" aria-hidden="true">
                  <svg width="80" height="64" viewBox="0 0 80 64" fill="none">
                    <rect x="2" y="14" width="34" height="38" rx="8" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="1"/>
                    <rect x="44" y="20" width="34" height="32" rx="8" fill="#D1FAE5" stroke="#6EE7B7" strokeWidth="1"/>
                    <rect x="10" y="22" width="10" height="10" rx="3" fill="#6D5DF6" opacity="0.35"/>
                    <rect x="10" y="36" width="18" height="3" rx="1.5" fill="#C4B5FD"/>
                    <rect x="10" y="43" width="12" height="3" rx="1.5" fill="#DDD6FE"/>
                    <rect x="52" y="28" width="18" height="3" rx="1.5" fill="#6EE7B7"/>
                    <rect x="52" y="35" width="12" height="3" rx="1.5" fill="#A7F3D0"/>
                    <rect x="52" y="42" width="15" height="3" rx="1.5" fill="#A7F3D0"/>
                  </svg>
                </div>
                <h2 className="c12-empty-title">Bienvenue dans ScorgIA.</h2>
                <p className="c12-empty-sub">Créons votre première classe.</p>
                <button onClick={() => setShowForm(true)} className="c12-btn-new">
                  Créer une classe
                </button>
              </div>
            )}

            {/* ── Toolbar ──────────────────────────────────────────────── */}
            {classes.length > 0 && (
              <>
                <div className="c12-search-bar">
                  <span className="c12-search-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                      <line x1="10.4" y1="10.4" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <input
                    className="c12-search-input"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher par nom, matière, niveau…"
                    aria-label="Rechercher une classe"
                  />
                  <kbd className="c12-search-kbd" aria-label="Raccourci clavier">⌘ K</kbd>
                </div>

                <div className="c12-controls">
                  <div className="c12-filters" role="group" aria-label="Filtrer les classes">
                    {(Object.keys(FILTER_LABELS) as FilterKey[]).map(key => (
                      <button
                        key={key}
                        className={`c12-filter${filter === key ? ' c12-filter--active' : ''}`}
                        onClick={() => setFilter(key)}
                        aria-pressed={filter === key}
                      >
                        {FILTER_LABELS[key]}
                      </button>
                    ))}
                  </div>
                  <div className="c12-sorts" role="group" aria-label="Trier les classes">
                    {(Object.keys(SORT_LABELS) as SortKey[]).map(key => (
                      <button
                        key={key}
                        className={`c12-sort${sortBy === key ? ' c12-sort--active' : ''}`}
                        onClick={() => setSortBy(key)}
                      >
                        {SORT_LABELS[key]}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── Aucun résultat ───────────────────────────────────────── */}
            {classes.length > 0 && filteredClasses.length === 0 && (
              <div className="c12-empty">
                <div className="c12-empty-illo" aria-hidden="true">
                  <svg width="64" height="48" viewBox="0 0 64 48" fill="none">
                    <rect x="4" y="8" width="56" height="32" rx="8" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1"/>
                    <line x1="20" y1="20" x2="44" y2="20" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="26" y1="28" x2="38" y2="28" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h2 className="c12-empty-title">Aucune classe trouvée</h2>
                <p className="c12-empty-sub">
                  {search
                    ? `Aucune classe ne correspond à « ${search} ».`
                    : 'Aucune classe ne correspond au filtre sélectionné.'}
                </p>
              </div>
            )}

            {/* ── Grille DESIGN-12 ─────────────────────────────────────── */}
            {filteredClasses.length > 0 && (
              <div className="c12-grid">
                {filteredClasses.map(cls => {
                  const leconsTable    = leconsByClass[cls.id]   || []
                  const fichiers       = fichiersByClass[cls.id] || []
                  const pack           = packsByClass[cls.id]    || null
                  const fichiersLecons = fichiers.filter((f: any) =>
                    ['plan_lecon', 'fiche_lecon', 'lecon_complete'].includes(f.type_fichier)
                  )
                  const fichiersQuiz   = fichiers.filter((f: any) => f.type_fichier === 'quiz')
                  const totalLecons    = leconsTable.length + fichiersLecons.length
                  const enseignees     = leconsTable.filter((l: any) => ['enseignee', 'complete'].includes(l.statut)).length
                  const matieres       = getMatieres(cls)
                  const lastActivity   = lastActivityByClass[cls.id]

                  // ── Identité visuelle ──────────────────────────────────
                  const rawStyle    = getSubjectStyle(matieres || cls.nom)
                  const iconBg      = rawStyle.bg     || hexToRgba(cls.couleur || '#6D5DF6', 0.12)
                  const accentColor = rawStyle.accent || (cls.couleur || '#6D5DF6')
                  const iconSymbol  = rawStyle.symbol || (matieres || cls.nom || '??').slice(0, 2).toUpperCase()

                  // ── Checklist 6 items ──────────────────────────────────
                  const checklist: CheckItem[] = [
                    { label: 'Curriculum',  state: cls.curriculum_charge ? 'done' : 'empty'                                                                           },
                    { label: 'Syllabus',    state: cls.curriculum_charge ? 'done' : 'empty'                                                                           },
                    { label: 'Plan annuel', state: pack ? 'done' : 'empty'                                                                                            },
                    { label: 'Séquences',   state: pack ? 'done' : 'empty'                                                                                            },
                    { label: 'Leçons',      state: totalLecons === 0 ? 'empty' : enseignees >= totalLecons ? 'done' : 'in_progress'                                    },
                    { label: 'Quiz',        state: fichiersQuiz.length === 0 ? 'empty' : 'done'                                                                       },
                  ]

                  // ── Métriques ─────────────────────────────────────────
                  const doneCount   = checklist.filter(i => i.state === 'done').length
                  const yearPct     = Math.round((doneCount / checklist.length) * 100)
                  const status      = getSmartStatus(yearPct, cls, pack)
                  const statusCfg   = STATUS_CFG[status]
                  const progressTag = getProgressTag(yearPct, checklist)
                  const actionText  = getActionText(status, cls, totalLecons, enseignees, fichiersQuiz)
                  const subText     = getSubText(status, totalLecons, enseignees, lastActivity)

                  // ── CTA — dérivé de l'état, aucun code dupliqué ────────
                  const { ctaLabel, ctaAction, ctaColor } = ((): {
                    ctaLabel: string; ctaAction: () => void; ctaColor: string
                  } => {
                    switch (status) {
                      case 'configuration':
                        return {
                          ctaLabel: 'Construire',
                          ctaAction: () => router.push(`/dashboard/classes/${cls.id}/programme`),
                          ctaColor: accentColor,
                        }
                      case 'construction':
                        return {
                          ctaLabel: totalLecons > 0 ? 'Continuer' : 'Préparer',
                          ctaAction: () => {
                            if (typeof window !== 'undefined') localStorage.setItem('klassia_active_classe', cls.id)
                            router.push('/dashboard/gerer/preparer')
                          },
                          ctaColor: accentColor,
                        }
                      case 'pret':
                        return {
                          ctaLabel: 'Enseigner',
                          ctaAction: () => router.push(`/dashboard/gerer/enseigner?classe=${cls.id}`),
                          ctaColor: '#059669',
                        }
                      case 'termine':
                        return {
                          ctaLabel: 'Exporter',
                          ctaAction: () => router.push(`/dashboard/classes/${cls.id}`),
                          ctaColor: '#2563EB',
                        }
                    }
                  })()

                  const isMenuOpen = activeMenu === cls.id

                  return (
                    <article
                      key={cls.id}
                      className="c12-card"
                      onClick={() => router.push(`/dashboard/classes/${cls.id}`)}
                      role="article"
                      aria-label={`Classe ${cls.nom} — ${statusCfg.label}`}
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && router.push(`/dashboard/classes/${cls.id}`)}
                    >

                      {/* Micro feedback — s'affiche 2 s quand une génération IA se termine */}
                      {microFeedbackMap[cls.id] && (
                        <div className="c12-micro" role="status" aria-live="polite">
                          <span className="c12-micro-icon" aria-hidden="true">✓</span>
                          <span>{microFeedbackMap[cls.id]}</span>
                        </div>
                      )}

                      {/* 1. Nom classe */}
                      <div className="c12-card-head">
                        <div className="c12-subject-icon" style={{ background: iconBg, color: accentColor }} aria-hidden="true">
                          {iconSymbol}
                        </div>
                        <div className="c12-card-info">
                          <h2 className="c12-card-name">{cls.nom}</h2>
                          <p className="c12-card-meta">
                            {cls.niveau}
                            {cls.nombre_eleves > 0
                              ? ` · ${cls.nombre_eleves} élève${cls.nombre_eleves !== 1 ? 's' : ''}`
                              : ''}
                          </p>
                        </div>
                        <div
                          className="c12-status-badge"
                          style={{ color: statusCfg.color, background: statusCfg.bg, borderColor: statusCfg.border }}
                          aria-label={`Statut : ${statusCfg.label}`}
                        >
                          <span className="c12-status-icon" aria-hidden="true">{statusCfg.icon}</span>
                          {statusCfg.label}
                        </div>
                        <div
                          className={`c12-menu-wrap${isMenuOpen ? ' c12-menu-open' : ''}`}
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            className="c12-menu-btn"
                            aria-label="Actions rapides"
                            aria-expanded={isMenuOpen}
                            aria-haspopup="menu"
                            onClick={() => setActiveMenu(prev => prev === cls.id ? null : cls.id)}
                          >
                            ⋮
                          </button>
                          {isMenuOpen && (
                            <div className="c12-menu-dd" role="menu">
                              <button className="c12-menu-item" role="menuitem"
                                onClick={() => { setActiveMenu(null); router.push(`/dashboard/classes/${cls.id}`) }}>
                                Renommer
                              </button>
                              <button className="c12-menu-item" role="menuitem"
                                onClick={() => { setActiveMenu(null); router.push('/dashboard/gerer/preparer') }}>
                                Préparer une leçon
                              </button>
                              <button className="c12-menu-item" role="menuitem"
                                onClick={() => { setActiveMenu(null); router.push(`/dashboard/gerer/enseigner?classe=${cls.id}`) }}>
                                Enseigner
                              </button>
                              <button className="c12-menu-item" role="menuitem"
                                onClick={() => { setActiveMenu(null); router.push(`/dashboard/classes/${cls.id}/programme`) }}>
                                Programme annuel
                              </button>
                              <div className="c12-menu-sep" role="separator" />
                              <button className="c12-menu-item c12-menu-item--danger" role="menuitem"
                                onClick={() => { setActiveMenu(null); router.push(`/dashboard/classes/${cls.id}`) }}>
                                Archiver
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2. Action principale — HERO */}
                      <div className="c12-action-zone">
                        <p className="c12-action-main">{actionText}</p>
                        <p className="c12-action-sub">{subText}</p>
                      </div>

                      {/* 3. Progression */}
                      <div className="c12-prog-section">
                        <div className="c12-prog-row">
                          <span className="c12-prog-pct" style={{ color: accentColor }}>{yearPct} %</span>
                          <span className="c12-prog-tag" style={{ background: hexToRgba(accentColor, 0.10), color: accentColor }}>
                            {progressTag}
                          </span>
                        </div>
                        <div className="c12-prog-track">
                          <div
                            className="c12-prog-fill"
                            style={{ width: `${yearPct}%`, background: accentColor }}
                            role="progressbar"
                            aria-valuenow={yearPct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Progression : ${yearPct}%`}
                          />
                        </div>
                      </div>

                      {/* 4. Checklist compact 2-col */}
                      <div className="c12-checklist" aria-label="Avancement pédagogique">
                        {checklist.map(item => (
                          <div key={item.label} className="c12-check-row">
                            <span className={`c12-check-sym c12-check-sym--${item.state}`} aria-hidden="true">
                              {item.state === 'done' ? '✓' : item.state === 'in_progress' ? '◉' : '○'}
                            </span>
                            <span className={`c12-check-label${item.state === 'empty' ? ' c12-check-label--empty' : ''}`}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* 5. CTA unique */}
                      <button
                        className="c12-cta"
                        style={{ background: ctaColor, color: '#fff' }}
                        onClick={e => { e.stopPropagation(); ctaAction() }}
                        aria-label={`${ctaLabel} — ${cls.nom}`}
                      >
                        {ctaLabel} →
                      </button>

                    </article>
                  )
                })}
              </div>
            )}

          </div>{/* /c12-page */}
        </div>
      </div>
    </div>
  )
}
