'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import LoadingScreen from '@/components/LoadingScreen'
import CadenasForFait from '@/components/ui/CadenasForFait'
import { peutCreerClasse } from '@/lib/hooks/useForfait'

const COULEURS = [
  '#1B3F6E', '#6B3FA0', '#2D7DD2', '#2ECC71',
  '#E8634A', '#F39C12', '#C9A84C', '#0A7065',
]

function getMatieres(cls: any): string {
  if (Array.isArray(cls.matieres) && cls.matieres.length > 0) return cls.matieres.join(' · ')
  return cls.matiere || ''
}

// ─── Composant tag input ──────────────────────────────────────────────────────

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
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 99,
          background: 'var(--color-accent-violet-bg)',
          border: '1px solid var(--color-border-accent)',
          color: 'var(--color-accent-violet)', fontSize: 11, fontWeight: 600,
        }}>
          {t}
          <button
            type="button"
            onClick={() => remove(t)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0 1px', fontSize: 11, lineHeight: 1, opacity: .7 }}
          >×</button>
        </span>
      ))}
      <input
        ref={ref}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ',') && input.trim()) { e.preventDefault(); add(input) }
          if (e.key === 'Backspace' && !input && tags.length > 0) remove(tags[tags.length - 1])
        }}
        onBlur={() => { if (input.trim()) add(input) }}
        placeholder={tags.length === 0 ? 'Ex: Maths, Français… (Entrée pour ajouter)' : '+ Ajouter'}
        style={{ border: 'none', background: 'none', outline: 'none', fontSize: 12, color: 'var(--color-text-primary)', minWidth: 120, flex: 1, fontFamily: 'inherit' }}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClassesPage() {
  const [classes,         setClasses]         = useState<any[]>([])
  const [leconsByClass,   setLeconsByClass]   = useState<Record<string, any[]>>({})
  const [fichiersByClass, setFichiersByClass] = useState<Record<string, any[]>>({})
  const [packsByClass,    setPacksByClass]    = useState<Record<string, any>>({})
  const [profil,          setProfil]          = useState<any>(null)
  const [loading,         setLoading]         = useState(true)
  const [showForm,        setShowForm]        = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [createWarning,   setCreateWarning]   = useState<string | null>(null)

  const [form, setForm] = useState({
    nom:           '',
    niveau:        '',
    matieres:      [] as string[],
    nombre_eleves: '',
    couleur:       '#1B3F6E',
    langue:        'fr',
  })

  const supabase = createClient()
  const router   = useRouter()

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

      const { data: cls } = await supabase.from('classes').select('*').eq('enseignant_id', p.id).order('created_at', { ascending: false })
      const clsList = cls || []
      setClasses(clsList)

      if (clsList.length > 0) {
        const classIds = clsList.map((c: any) => c.id)

        // Leçons créées via l'éditeur (table lecons)
        const { data: lecons } = await supabase.from('lecons').select('classe_id, statut').in('classe_id', classIds)
        const grouped = (lecons || []).reduce((acc: Record<string, any[]>, l) => {
          if (!acc[l.classe_id]) acc[l.classe_id] = []
          acc[l.classe_id].push(l)
          return acc
        }, {})
        setLeconsByClass(grouped)

        // Fichiers générés via le pipeline Construire (fichiers_dossier)
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

        // Teaching Packs (statut de l'année scolaire construite)
        const { data: packs } = await supabase
          .from('teaching_packs').select('id, classe_id, created_at').in('classe_id', classIds)
        const groupedPacks = (packs || []).reduce((acc: Record<string, any>, p) => {
          acc[p.classe_id] = p
          return acc
        }, {})
        setPacksByClass(groupedPacks)
      }

      setLoading(false)
    }
    init()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profil?.id) return
    setSaving(true)

    const matieresPrimaire = form.matieres[0] || ''
    const { data, error } = await supabase.from('classes').insert({
      enseignant_id: profil.id,
      nom:           form.nom,
      niveau:        form.niveau,
      matiere:       matieresPrimaire,
      matieres:      form.matieres.length > 0 ? form.matieres : null,
      nombre_eleves: parseInt(form.nombre_eleves) || 0,
      couleur:       form.couleur,
      langue:        form.langue,
      annee_scolaire: '2025-2026',
    }).select().single()

    if (!error && data) {
      // Pour chaque matière au-delà de la première (déjà traitée par le trigger),
      // appeler le RPC qui crée la structure complète de dossiers.
      const matieresEnEchec: string[] = []
      for (const matiere of form.matieres.slice(1)) {
        const { error: rpcError } = await supabase.rpc('ajouter_matiere_classe', {
          p_classe_id:     data.id,
          p_enseignant_id: profil.id,
          p_matiere:       matiere,
          p_couleur:       form.couleur,
        })
        if (rpcError) {
          console.error(`[Classes] Échec création dossiers pour la matière "${matiere}" (classe ${data.id}) :`, rpcError.message)
          matieresEnEchec.push(matiere)
        }
      }
      setClasses(prev => [data, ...prev])
      setShowForm(false)
      setForm({ nom: '', niveau: '', matieres: [], nombre_eleves: '', couleur: '#1B3F6E', langue: 'fr' })
      if (matieresEnEchec.length > 0) {
        setCreateWarning(
          `Les dossiers de ${matieresEnEchec.map(m => `"${m}"`).join(', ')} n'ont pas pu être configurés. Ouvrez la classe et utilisez "➕ Ajouter une matière" pour les recréer.`
        )
      } else {
        setCreateWarning(null)
      }
    }
    setSaving(false)
  }

  if (loading) return <LoadingScreen />

  const isFr      = profil?.langue_interface !== 'en'
  const prenom    = profil?.prenom ?? profil?.email?.split('@')[0] ?? ''
  const initiales = prenom ? prenom[0].toUpperCase() : (profil?.email?.[0] ?? 'E').toUpperCase()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .cls-card { transition: transform 0.18s, box-shadow 0.18s; cursor: pointer; }
        .cls-card:hover { transform: translateY(-3px); }
        .cls-tag-chip {
          font-size: 10px; font-weight: 700;
          padding: 2px 7px; border-radius: 99px;
          background: rgba(108,92,231,0.1);
          color: var(--violet);
          border: 1px solid rgba(108,92,231,0.2);
        }
      `}</style>

      <Sidebar profil={profil} activeHref="/dashboard/classes" onLogout={async () => { await supabase.auth.signOut(); router.push('/login') }} />

      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar notifCount={0} initiales={initiales} isFr={isFr} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 32px' }}>

          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Mes classes</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
                {classes.length} classe{classes.length !== 1 ? 's' : ''} · Année 2025-2026
              </div>
            </div>
            <CadenasForFait
              fonctionnalite="classes_illimitees"
              forfait_actuel={profil?.forfait || 'gratuit'}
              bloque={!peutCreerClasse(profil, classes.length)}
              messageCustom="Limite de classes atteinte pour votre forfait"
              forfait_cible={profil?.forfait === 'pro' ? 'pro_plus' : 'pro'}
            >
              <button onClick={() => setShowForm(true)}
                style={{ padding: '10px 20px', fontSize: 13, fontWeight: 600, background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', boxShadow: '0 4px 12px var(--violet-glow)', fontFamily: 'inherit' }}>
                + Nouvelle classe
              </button>
            </CadenasForFait>
          </div>

          {/* ── Avertissement création partielle ──────────────────────── */}
          {createWarning && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', marginBottom: 16, borderRadius: 10, background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)', animation: 'fadeUp .2s ease both' }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
              <div style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{createWarning}</div>
              <button onClick={() => setCreateWarning(null)} style={{ background: 'none', border: 'none', fontSize: 16, color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}>✕</button>
            </div>
          )}

          {/* ── Formulaire ──────────────────────────────────────────────── */}
          {showForm && (
            <div className="glass-light" style={{ borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 24, boxShadow: 'var(--shadow-card)', animation: 'fadeUp .2s ease both' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Nouvelle classe</div>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
              </div>
              <form onSubmit={handleCreate}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Nom de la classe *</label>
                    <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Français 3e A" required
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid rgba(15,35,65,0.12)', background: 'rgba(255,255,255,0.8)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                  </div>
                  <div style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Niveau *</label>
                    <input value={form.niveau} onChange={e => setForm({ ...form, niveau: e.target.value })} placeholder="Ex: Secondaire 3" required
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid rgba(15,35,65,0.12)', background: 'rgba(255,255,255,0.8)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                  </div>
                  <div style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Nombre d&apos;élèves</label>
                    <input type="number" value={form.nombre_eleves} onChange={e => setForm({ ...form, nombre_eleves: e.target.value })} placeholder="Ex: 28"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid rgba(15,35,65,0.12)', background: 'rgba(255,255,255,0.8)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                  </div>
                  <div style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Langue d&apos;enseignement</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[{ v: 'fr', l: '🇫🇷 Français' }, { v: 'en', l: '🇨🇦 English' }].map(lang => (
                        <button key={lang.v} type="button"
                          onClick={() => setForm({ ...form, langue: lang.v })}
                          style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1.5px solid ${form.langue === lang.v ? 'var(--violet)' : 'rgba(15,35,65,0.12)'}`, background: form.langue === lang.v ? 'rgba(108,92,231,0.1)' : 'transparent', color: form.langue === lang.v ? 'var(--violet)' : 'var(--text-secondary)', fontSize: 12, fontWeight: form.langue === lang.v ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                          {lang.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Matières (multi-tags) ──────────────────────────────── */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Matières enseignées *</label>
                  <TagInput
                    tags={form.matieres}
                    onChange={matieres => setForm({ ...form, matieres })}
                  />
                  {form.matieres.length === 0 && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                      Appuyez sur Entrée ou virgule après chaque matière
                    </div>
                  )}
                </div>

                {/* ── Couleur ───────────────────────────────────────────── */}
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

          {/* ── État vide ──────────────────────────────────────────────── */}
          {classes.length === 0 && !showForm && (
            <div className="glass-light" style={{ textAlign: 'center', padding: '64px 24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>🏫</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Aucune classe encore</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
                Crée ta première classe pour organiser ton année scolaire et générer tes leçons
              </div>
              <button onClick={() => setShowForm(true)}
                style={{ padding: '10px 24px', fontSize: 13, fontWeight: 600, background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', boxShadow: '0 4px 12px var(--violet-glow)', fontFamily: 'inherit' }}>
                + Créer ma première classe
              </button>
            </div>
          )}

          {/* ── Grille des classes ─────────────────────────────────────── */}
          {classes.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {classes.map(cls => {
                const leconsTable   = leconsByClass[cls.id] || []
                const fichiers      = fichiersByClass[cls.id] || []
                const pack          = packsByClass[cls.id] || null
                // Leçons issues du pipeline Construire (plans_lecons, lecons)
                const fichiersLecons = fichiers.filter((f: any) =>
                  ['plan_lecon', 'fiche_lecon', 'lecon_complete'].includes(f.type_fichier)
                )
                // Quizzes issus du pipeline Construire
                const fichiersQuiz = fichiers.filter((f: any) => f.type_fichier === 'quiz')
                const totalLecons   = leconsTable.length + fichiersLecons.length
                const enseignees    = leconsTable.filter((l: any) => ['enseignee', 'complete'].includes(l.statut)).length
                // Prêtes = leçons éditeur prêtes + toutes les leçons générées (= prêtes à enseigner)
                const pretes        = leconsTable.filter((l: any) => l.statut === 'prete').length + fichiersLecons.length
                const pct           = totalLecons > 0 ? Math.round((enseignees / totalLecons) * 100) : 0
                const matieres      = getMatieres(cls)
                const accent        = cls.couleur || '#6C5CE7'

                return (
                  <div key={cls.id} className="glass-light cls-card"
                    onClick={() => router.push(`/dashboard/classes/${cls.id}`)}
                    style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 8px 32px ${accent}33`)}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}>

                    {/* Color band top */}
                    <div style={{ height: 5, background: accent }} />

                    <div style={{ padding: 16 }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#FFF', flexShrink: 0, boxShadow: `0 4px 10px ${accent}55` }}>
                            {cls.nom?.[0]?.toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{cls.nom}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{cls.niveau}{matieres ? ` · ${matieres}` : ''}</div>
                          </div>
                        </div>
                        {pack
                          ? <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)', flexShrink: 0, fontWeight: 700 }}>✓ Année construite</span>
                          : cls.curriculum_charge
                            ? <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)', flexShrink: 0, fontWeight: 700 }}>✓ Curriculum</span>
                            : <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: 'rgba(251,195,74,0.12)', color: '#FBC34A', border: '1px solid rgba(251,195,74,0.2)', flexShrink: 0 }}>Sans curriculum</span>
                        }
                      </div>

                      {/* Tags matières multiples */}
                      {Array.isArray(cls.matieres) && cls.matieres.length > 1 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 10 }}>
                          {cls.matieres.map((m: string) => (
                            <span key={m} className="cls-tag-chip">{m}</span>
                          ))}
                        </div>
                      )}

                      {/* Stats */}
                      <div style={{ display: 'grid', gridTemplateColumns: pack ? 'repeat(5,1fr)' : 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
                        {([
                          { icon: '👥', v: cls.nombre_eleves || 0,              l: 'Élèves',  c: '#60A5FA' },
                          { icon: '📄', v: totalLecons,                          l: 'Leçons',  c: '#A78BFA' },
                          ...(pack ? [{ icon: '🎮', v: fichiersQuiz.length,     l: 'Quiz',    c: '#FB923C' }] : []),
                          { icon: '✅', v: pretes,                               l: 'Prêtes',  c: '#FBC34A' },
                          { icon: '📊', v: `${pct}%`,                           l: 'Prog.',   c: pct >= 80 ? '#34D399' : pct >= 40 ? '#60A5FA' : '#94A3B8' },
                        ]).map((s, i) => (
                          <div key={i} style={{ textAlign: 'center', padding: '6px 4px', background: 'rgba(15,35,65,0.04)', borderRadius: 8 }}>
                            <div style={{ fontSize: 11, marginBottom: 2 }}>{s.icon}</div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.v}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{s.l}</div>
                          </div>
                        ))}
                      </div>

                      {/* Barre progression */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ height: 4, background: 'rgba(15,35,65,0.08)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#34D399' : `linear-gradient(90deg, ${accent}, #34D399)`, borderRadius: 99, transition: 'width 0.6s ease' }} />
                        </div>
                        {!cls.curriculum_charge && !pack ? (
                          <div style={{ fontSize: 11, color: '#F97316', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>⚠️</span><span>Construire mon année scolaire</span>
                          </div>
                        ) : totalLecons === 0 ? (
                          <div style={{ fontSize: 11, color: '#34D399', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>✓</span><span>Prêt à créer des leçons</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>✓</span>
                            <span>
                              {totalLecons} leçon{totalLecons !== 1 ? 's' : ''} planifiée{totalLecons !== 1 ? 's' : ''}
                              {fichiersQuiz.length > 0 ? ` · ${fichiersQuiz.length} quiz` : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/dashboard/classes/${cls.id}`) }}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(15,35,65,0.04)', border: '1px solid rgba(15,35,65,0.1)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}>
                          📂 Ouvrir
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/dashboard/gerer/enseigner?classe=${cls.id}`) }}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, background: `${accent}18`, border: `1px solid ${accent}44`, color: accent, cursor: 'pointer', fontFamily: 'inherit' }}>
                          ▶ Enseigner
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
