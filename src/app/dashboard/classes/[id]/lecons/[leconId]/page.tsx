'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import RichEditor from '@/components/RichEditor'
import EditorToolbar from '@/components/EditorToolbar'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'
import type { Editor } from '@tiptap/core'
import PrintPanel from '@/components/PrintPanel'
import DocumentEditor from '@/components/editor/DocumentEditor'

export default function LeconPage() {
  const [profil, setProfil] = useState<any>(null)
  const [classe, setClasse] = useState<any>(null)
  const [lecon, setLecon] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [leconStatut, setLeconStatut] = useState('brouillon')
  const [autoSaveMsg, setAutoSaveMsg] = useState('')
  const [exportingPptx, setExportingPptx] = useState(false)
  const [isPrintOpen, setIsPrintOpen] = useState(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [exportMsg, setExportMsg] = useState('')
  const [iaGenerating, setIaGenerating] = useState(false)
  const [iaMsg, setIaMsg] = useState('')
  const [quizContent, setQuizContent] = useState('')
  const [showQuiz, setShowQuiz] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importHtml, setImportHtml] = useState('')
  const [importPdfUrl, setImportPdfUrl] = useState('')
  const [importField, setImportField] = useState('pendant_modelisation')
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null)
  const [editorView, setEditorView] = useState<'plan' | 'presentation'>('plan')
  const [docMode, setDocMode] = useState<'plan' | 'complet'>('plan')
  const [form, setForm] = useState({
    titre: '',
    intention: '',
    objectifs: '',
    avant_amorce: '',
    avant_duree: '10',
    pendant_modelisation: '',
    pendant_pratique_guidee: '',
    pendant_pratique_autonome: '',
    pendant_duree: '50',
    apres_cloture: '',
    apres_billet: '',
    apres_duree: '10',
    materiel: '',
    criteres: '',
    differentiation: '',
    vocabulaire: '',
  })
  const supabase = createClient()
  const router = useRouter()

  const uploadImageFn = useCallback(async (file: File): Promise<string> => {
    const nomNettoye = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const chemin = `${profil?.id || 'anon'}/images/${Date.now()}_${nomNettoye}`
    const { error } = await supabase.storage.from('ressources').upload(chemin, file)
    if (error) throw new Error('Erreur upload image')
    const { data } = await supabase.storage.from('ressources').createSignedUrl(chemin, 60 * 60 * 24 * 365)
    if (!data?.signedUrl) throw new Error('URL introuvable')
    return data.signedUrl
  }, [profil?.id, supabase])
  const params = useParams()
  const classeId = params.id as string
  const leconId = params.leconId as string

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const user = session.user
      const { data: profil } = await supabase
        .from('utilisateurs').select('*').eq('user_id', user.id).single()
      setProfil(profil)
      const { data: classe } = await supabase
        .from('classes').select('*').eq('id', classeId).single()
      setClasse(classe)
      const { data: lecon } = await supabase
        .from('lecons').select('*').eq('id', leconId).single()
      if (lecon) {
        setLecon(lecon)
        setLeconStatut(lecon.statut || 'brouillon')
        if (lecon.type_document === 'lecon_complete') setDocMode('complet')
        const c = lecon.contenu_json || {}
        setForm({
          titre: lecon.titre || '',
          intention: c.intention || '',
          objectifs: Array.isArray(c.objectifs) ? c.objectifs.map((o: string) => `<p>${o}</p>`).join('') : (c.objectifs || ''),
          avant_amorce: c.avant_amorce || '',
          avant_duree: c.avant_duree || '10',
          pendant_modelisation: c.pendant_modelisation || '',
          pendant_pratique_guidee: c.pendant_pratique_guidee || '',
          pendant_pratique_autonome: c.pendant_pratique_autonome || '',
          pendant_duree: c.pendant_duree || '50',
          apres_cloture: c.apres_cloture || '',
          apres_billet: c.apres_billet || '',
          apres_duree: c.apres_duree || '10',
          materiel: Array.isArray(c.materiel) ? c.materiel.map((m: string) => `<p>${m}</p>`).join('') : (c.materiel || ''),
          criteres: Array.isArray(c.criteres) ? c.criteres.map((cr: string) => `<p>${cr}</p>`).join('') : (c.criteres || ''),
          differentiation: c.differentiation || '',
          vocabulaire: Array.isArray(c.vocabulaire) ? c.vocabulaire.map((v: string) => `<p>${v}</p>`).join('') : (c.vocabulaire || ''),
        })
      }
      setLoading(false)
    }
    init()
  }, [classeId, leconId])

  const htmlToLines = (html: string): string[] => {
    const text = html
      .replace(/<\/li>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    return text.split('\n').map(s => s.trim()).filter(Boolean)
  }

  const buildContenujson = () => ({
    intention: form.intention,
    objectifs: form.objectifs,
    avant_amorce: form.avant_amorce,
    avant_duree: form.avant_duree,
    pendant_modelisation: form.pendant_modelisation,
    pendant_pratique_guidee: form.pendant_pratique_guidee,
    pendant_pratique_autonome: form.pendant_pratique_autonome,
    pendant_duree: form.pendant_duree,
    apres_cloture: form.apres_cloture,
    apres_billet: form.apres_billet,
    apres_duree: form.apres_duree,
    materiel: form.materiel,
    criteres: form.criteres,
    differentiation: form.differentiation,
    vocabulaire: form.vocabulaire,
  })

  const handleSave = async () => {
    setSaving(true)
    const contenu_json = buildContenujson()
    await supabase.from('lecons').update({ titre: form.titre, contenu_json }).eq('id', leconId)
    setLecon({ ...lecon, titre: form.titre, contenu_json })
    setEditing(false)
    setSaving(false)
  }

  const handleStatutChange = async (newStatut: string) => {
    setLeconStatut(newStatut)
    await supabase.from('lecons').update({ statut: newStatut }).eq('id', leconId)
  }

  const handleSwitchDocMode = async (mode: 'plan' | 'complet') => {
    setDocMode(mode)
    const newType = mode === 'complet' ? 'lecon_complete' : 'plan_lecon'
    await supabase.from('lecons').update({ type_document: newType }).eq('id', leconId)
    setLecon((prev: any) => ({ ...prev, type_document: newType }))
  }

  // Auto-save with 2.5s debounce while editing
  useEffect(() => {
    if (!editing || loading) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      const contenu_json = buildContenujson()
      await supabase.from('lecons').update({ titre: form.titre, contenu_json }).eq('id', leconId)
      setAutoSaveMsg('✓ Sauvegardé')
      setTimeout(() => setAutoSaveMsg(''), 2000)
    }, 2500)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [form, editing])

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim()

  const handleExportPptx = async () => {
    setExportingPptx(true)
    setExportMsg('Génération du PowerPoint...')
    try {
      const res = await fetch('/api/export/pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lecon: {
            titre: form.titre,
            intention: stripHtml(form.intention),
            objectifs: htmlToLines(form.objectifs),
            avant_amorce: stripHtml(form.avant_amorce),
            avant_duree: form.avant_duree,
            pendant_modelisation: stripHtml(form.pendant_modelisation),
            pendant_pratique_guidee: stripHtml(form.pendant_pratique_guidee),
            pendant_pratique_autonome: stripHtml(form.pendant_pratique_autonome),
            pendant_duree: form.pendant_duree,
            apres_cloture: stripHtml(form.apres_cloture),
            apres_billet: stripHtml(form.apres_billet),
            apres_duree: form.apres_duree,
            criteres: htmlToLines(form.criteres),
            differentiation: stripHtml(form.differentiation),
          },
          classe: {
            nom: classe?.nom,
            niveau: classe?.niveau,
            matiere: classe?.matiere,
          },
          enseignant: {
            prenom: profil?.prenom,
            nom: profil?.nom,
            ecole: profil?.ecole,
          },
        }),
      })
      if (!res.ok) throw new Error('Erreur export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `KlassIA+_${form.titre.replace(/\s+/g, '_')}.pptx`
      a.click()
      URL.revokeObjectURL(url)
      setExportMsg('✓ PowerPoint téléchargé !')
    } catch {
      setExportMsg('Erreur lors de la génération')
    }
    setExportingPptx(false)
    setTimeout(() => setExportMsg(''), 4000)
  }
const handleExportDocx = async () => {
  try {
    const res = await fetch('/api/export/docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lecon: {
          titre: form.titre,
          intention: stripHtml(form.intention),
          objectifs: htmlToLines(form.objectifs),
          avant_amorce: stripHtml(form.avant_amorce),
          avant_duree: form.avant_duree,
          pendant_modelisation: stripHtml(form.pendant_modelisation),
          pendant_pratique_guidee: stripHtml(form.pendant_pratique_guidee),
          pendant_pratique_autonome: stripHtml(form.pendant_pratique_autonome),
          pendant_duree: form.pendant_duree,
          apres_cloture: stripHtml(form.apres_cloture),
          apres_billet: stripHtml(form.apres_billet),
          apres_duree: form.apres_duree,
          criteres: htmlToLines(form.criteres),
          differentiation: stripHtml(form.differentiation),
          materiel: htmlToLines(form.materiel),
        },
        classe: { nom: classe?.nom, niveau: classe?.niveau, matiere: classe?.matiere, nombre_eleves: classe?.nombre_eleves },
        enseignant: { prenom: profil?.prenom, nom: profil?.nom, ecole: profil?.ecole },
      }),
    })
    if (!res.ok) throw new Error('Erreur')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `KlassIA+_${form.titre.replace(/\s+/g, '_')}.docx`
    a.click()
    URL.revokeObjectURL(url)
    setExportMsg('✓ Word téléchargé !')
    setTimeout(() => setExportMsg(''), 4000)
  } catch {
    setExportMsg('Erreur export Word')
  }
}

const handlePrint = () => {
  setIsPrintOpen(true)
}

const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  e.target.value = ''

  setImportHtml('')
  setImportPdfUrl('')
  setShowImport(true)

  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'pdf') {
    const url = URL.createObjectURL(file)
    setImportPdfUrl(url)
    return
  }

  if (ext === 'docx') {
    setImportLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/import/docx', { method: 'POST', body: fd })
      const { html } = await res.json()
      setImportHtml(html || '')
    } catch {
      setImportHtml('<p style="color:#F87171">Erreur lors de la conversion. Vérifiez que le fichier est bien un .docx valide.</p>')
    }
    setImportLoading(false)
    return
  }

  setImportHtml('<p style="color:#FBC34A">Format non supporté. Utilisez un fichier .docx ou .pdf.</p>')
}

const applyImport = () => {
  setForm(f => ({ ...f, [importField]: importHtml }))
  setEditing(true)
  setShowImport(false)
  setImportHtml('')
}
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const callIA = async (instructions: string, type_contenu = 'fiche_lecon') => {
    return fetch('/api/ia/generer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type_contenu,
        sujet: form.titre || lecon?.titre || 'Leçon',
        duree: (parseInt(form.avant_duree) + parseInt(form.pendant_duree) + parseInt(form.apres_duree)) || 75,
        contexte: {
          classe: classe ? { nom: classe.nom, niveau: classe.niveau, matiere: classe.matiere, nombre_eleves: classe.nombre_eleves } : null,
        },
        langue: classe?.langue || 'fr',
        profil_ia: profil?.profil_ia || null,
        instructions,
      }),
    }).then(r => r.json())
  }

  const handleGenererIA = async () => {
    setIaGenerating(true)
    setIaMsg('✦ Génération en cours...')
    try {
      const data = await callIA(
        `Génère une fiche de leçon complète au format JSON strict (sans markdown) pour "${form.titre || 'cette leçon'}". Format attendu :
{"intention":"...","objectifs":"<ul><li>...</li></ul>","avant_amorce":"...","pendant_modelisation":"...","pendant_pratique_guidee":"...","pendant_pratique_autonome":"...","apres_cloture":"...","apres_billet":"...","materiel":"<ul><li>...</li></ul>","differentiation":"...","criteres":"<ul><li>...</li></ul>"}
Réponds UNIQUEMENT avec le JSON valide, sans aucun markdown.`
      )
      if (data.contenu) {
        try {
          const raw = data.contenu.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          const parsed = JSON.parse(raw)
          setForm(f => ({
            ...f,
            intention:                  parsed.intention               || f.intention,
            objectifs:                  parsed.objectifs               || f.objectifs,
            avant_amorce:               parsed.avant_amorce            || f.avant_amorce,
            pendant_modelisation:       parsed.pendant_modelisation     || f.pendant_modelisation,
            pendant_pratique_guidee:    parsed.pendant_pratique_guidee  || f.pendant_pratique_guidee,
            pendant_pratique_autonome:  parsed.pendant_pratique_autonome || f.pendant_pratique_autonome,
            apres_cloture:              parsed.apres_cloture            || f.apres_cloture,
            apres_billet:               parsed.apres_billet             || f.apres_billet,
            materiel:                   parsed.materiel                 || f.materiel,
            differentiation:            parsed.differentiation          || f.differentiation,
            criteres:                   parsed.criteres                 || f.criteres,
          }))
          setEditing(true)
          setIaMsg('✓ Leçon générée — vérifiez et ajustez le contenu')
        } catch {
          // Fallback: put content in modélisation if JSON parse fails
          setForm(f => ({ ...f, pendant_modelisation: `<p>${data.contenu}</p>` }))
          setEditing(true)
          setIaMsg('✓ Contenu généré dans Modélisation')
        }
      }
    } catch { setIaMsg('Erreur de génération') }
    setIaGenerating(false)
    setTimeout(() => setIaMsg(''), 5000)
  }

  const handleAdapterDiff = async () => {
    setIaGenerating(true)
    setIaMsg('✦ Adaptation en cours...')
    try {
      const contenuActuel = stripHtml(form.pendant_modelisation || form.avant_amorce || '')
      const data = await callIA(
        `Sur la base de cette leçon sur "${form.titre}", génère des stratégies de différenciation concrètes pour : dyslexie, TDAH, élèves allophones, douance. Format HTML avec titres et listes.${contenuActuel ? `\n\nContexte de la leçon :\n${contenuActuel.substring(0, 500)}` : ''}`,
        'differentiation'
      )
      if (data.contenu) {
        setForm(f => ({ ...f, differentiation: `<p>${data.contenu.replace(/\n/g, '</p><p>')}</p>` }))
        setEditing(true)
        setIaMsg('✓ Différenciation générée')
      }
    } catch { setIaMsg('Erreur') }
    setIaGenerating(false)
    setTimeout(() => setIaMsg(''), 4000)
  }

  const handleCreerQuiz = async () => {
    setIaGenerating(true)
    setIaMsg('✦ Création du quiz...')
    try {
      const data = await callIA(
        `Crée un quiz de 8 questions à choix multiples sur "${form.titre}". Pour chaque question : énoncé, 4 choix (A B C D), réponse correcte, explication courte. Format markdown lisible.`,
        'quiz'
      )
      if (data.contenu) {
        setQuizContent(data.contenu)
        setShowQuiz(true)
        setIaMsg('✓ Quiz créé')
      }
    } catch { setIaMsg('Erreur') }
    setIaGenerating(false)
    setTimeout(() => setIaMsg(''), 3000)
  }

  if (loading) return <LoadingScreen />

  const totalDuree = parseInt(form.avant_duree) + parseInt(form.pendant_duree) + parseInt(form.apres_duree)

  return (
    <div className="app-layout">

      {/* Volet impression */}
      <PrintPanel
        open={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        lecon={lecon}
        classe={classe}
        profil={profil}
        form={form}
      />

      {/* Sidebar */}
      <Sidebar profil={profil} activeHref="/dashboard/classes" onLogout={handleLogout} />

      {/* Main */}
      <div className="main-content">

        {/* Topbar */}
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => router.push(`/dashboard/classes/${classeId}`)}
              className="btn-ghost btn-sm">
              ← {classe?.nom}
            </button>
            <div>
              <div className="topbar-title">{form.titre || 'Plan de leçon'}</div>
              <div className="topbar-sub">
                {classe?.matiere} · {classe?.niveau} · {totalDuree} min
              </div>
            </div>
          </div>
         <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
  {/* Status selector */}
  <select value={leconStatut} onChange={e => handleStatutChange(e.target.value)}
    style={{ padding: '5px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 600, border: '1.5px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-2)', cursor: 'pointer', outline: 'none' }}>
    {[
      { v: 'brouillon', l: 'Brouillon'  },
      { v: 'prete',     l: 'Prête'      },
      { v: 'en_cours',  l: 'En cours'   },
      { v: 'enseignee', l: 'Enseignée'  },
      { v: 'complete',  l: 'Terminée'   },
      { v: 'a_revoir',  l: 'À revoir'   },
      { v: 'archivee',  l: 'Archivée'   },
    ].map(s => <option key={s.v} value={s.v} style={{ background: '#0D0D1A' }}>{s.l}</option>)}
  </select>
  {autoSaveMsg && <span style={{ fontSize: '11px', color: '#34D399' }}>{autoSaveMsg}</span>}
  {exportMsg && (
    <span style={{
      fontSize: '12px', padding: '6px 12px',
      background: exportMsg.includes('✓') ? 'var(--green-pale)' : 'var(--blue-pale)',
      color: exportMsg.includes('✓') ? 'var(--green)' : '#60A5FA',
      borderRadius: 'var(--radius-sm)',
    }}>{exportMsg}</span>
  )}
  <button onClick={handleExportDocx} className="btn-ghost btn-sm">
    📝 Word
  </button>
  <label className="btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
    📁 Importer
    <input type="file" accept=".docx,.pdf" style={{ display: 'none' }} onChange={handleImportFile} />
  </label>
  <button onClick={handlePrint} className="btn-ghost btn-sm">
    🖨️ Imprimer
  </button>
  <button onClick={handleExportPptx} disabled={exportingPptx}
    className="btn-ghost btn-sm"
    style={{ opacity: exportingPptx ? 0.7 : 1 }}>
    📊 {exportingPptx ? 'Export...' : 'PowerPoint'}
  </button>
  <button
    onClick={() => router.push(`/dashboard/classes/${classeId}/lecons/${leconId}/presenter`)}
    style={{
      padding: '7px 16px', background: 'linear-gradient(135deg, #6B3FA0, #4F46E5)',
      color: 'white', border: 'none', borderRadius: 'var(--radius-sm)',
      fontSize: '13px', fontWeight: 700, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '6px',
    }}>
    ▶ Mode TBI
  </button>
  {editing ? (
    <>
      <button onClick={() => setEditing(false)} className="btn-ghost btn-sm">Annuler</button>
      <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm"
        style={{ opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Sauvegarde...' : '✓ Sauvegarder'}
      </button>
    </>
  ) : (
    <button onClick={() => setEditing(true)} className="btn-primary btn-sm">✏️ Modifier</button>
  )}
</div>
        </div>

        {/* Contenu */}
        <div className="page-content fade-in" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>

          {/* ── Barre de l'éditeur partagée (sticky) ── */}
          <div style={{ position: 'sticky', top: 0, zIndex: 200, background: 'var(--surface-elevated, #0A1628)', borderBottom: '1px solid var(--border)' }}>
            <EditorToolbar editor={editing ? activeEditor : null} uploadImage={uploadImageFn} />
          </div>

          {/* ── Onglets Plan / Présentation + IA tools ── */}
          <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 }}>
              {/* Mode document */}
              {[{ v: 'plan', l: '📋 Plan de leçon' }, { v: 'complet', l: '📄 Leçon complète' }].map(tab => (
                <button key={tab.v} onClick={() => handleSwitchDocMode(tab.v as any)}
                  style={{ padding: '6px 16px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: docMode === tab.v ? (tab.v === 'complet' ? '#2563EB' : 'var(--violet, #7C3AED)') : 'transparent',
                    color: docMode === tab.v ? 'white' : 'var(--text-3)', transition: 'all 0.15s' }}>
                  {tab.l}
                </button>
              ))}
              {docMode === 'plan' && (
                <>
                  <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', alignSelf: 'center', margin: '0 3px' }} />
                  {[{ v: 'plan', l: '📋 Plan' }, { v: 'presentation', l: '🖥️ TBI' }].map(tab => (
                    <button key={tab.v} onClick={() => setEditorView(tab.v as any)}
                      style={{ padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        background: editorView === tab.v ? 'rgba(255,255,255,0.1)' : 'transparent',
                        color: editorView === tab.v ? 'var(--text-1)' : 'var(--text-4)', transition: 'all 0.15s' }}>
                      {tab.l}
                    </button>
                  ))}
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {iaMsg && <span style={{ fontSize: '11px', padding: '4px 10px', background: iaMsg.startsWith('✓') ? 'rgba(52,211,153,0.12)' : 'rgba(167,139,250,0.12)', color: iaMsg.startsWith('✓') ? '#34D399' : '#A78BFA', borderRadius: 6 }}>{iaMsg}</span>}
              {iaGenerating && <span style={{ width: 14, height: 14, border: '2px solid rgba(167,139,250,0.3)', borderTopColor: '#A78BFA', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />}
              <button onClick={handleGenererIA} disabled={iaGenerating || !editing} title="Générer toutes les sections avec IA"
                style={{ padding: '6px 12px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 7, fontSize: 11, fontWeight: 700, color: '#A78BFA', cursor: iaGenerating || !editing ? 'not-allowed' : 'pointer', opacity: !editing ? 0.5 : 1 }}>
                ✦ Générer IA
              </button>
              <button onClick={handleAdapterDiff} disabled={iaGenerating || !editing} title="Différenciation"
                style={{ padding: '6px 12px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 7, fontSize: 11, fontWeight: 600, color: '#60A5FA', cursor: iaGenerating || !editing ? 'not-allowed' : 'pointer', opacity: !editing ? 0.5 : 1 }}>
                ♿ Adapter
              </button>
              <button onClick={handleCreerQuiz} disabled={iaGenerating}
                style={{ padding: '6px 12px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 7, fontSize: 11, fontWeight: 600, color: '#34D399', cursor: iaGenerating ? 'not-allowed' : 'pointer' }}>
                ❓ Quiz IA
              </button>
            </div>
          </div>

          {/* ══════════════════════ MODE LEÇON COMPLÈTE ════════════════════ */}
          {docMode === 'complet' && lecon && (
            <DocumentEditor
              lecon={lecon}
              classe={classe}
              profil={profil}
              leconId={leconId}
              onValidate={async () => {
                await supabase.from('lecons').update({ statut: 'prete', updated_at: new Date().toISOString() }).eq('id', leconId)
                setLecon((prev: any) => prev ? { ...prev, statut: 'prete' } : prev)
                setTimeout(() => router.push(`/dashboard/classes/${classeId}`), 1800)
              }}
            />
          )}

          {/* ══════════════════════ PLAN DE LEÇON — TABLE ══════════════════ */}
          {docMode === 'plan' && editorView === 'plan' && (
          <div style={{ padding: '16px 20px', overflowY: 'auto' }}>

            {/* Titre */}
            <div style={{ marginBottom: 12 }}>
              <input value={form.titre} onChange={e => { setForm({ ...form, titre: e.target.value }); if (!editing) setEditing(true) }}
                placeholder="Titre de la leçon"
                style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '2px solid var(--border)', fontSize: 20, fontWeight: 700, color: 'var(--text-1)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
            </div>

            {/* Table principale */}
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '140px' }} />
                <col />
                <col style={{ width: '88px' }} />
              </colgroup>

              {/* ─ En-tête ─ */}
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.8px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Section</th>
                  <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.8px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Contenu</th>
                  <th style={{ padding: '7px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.8px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Durée</th>
                </tr>
              </thead>
              <tbody>

                {/* Intention */}
                <tr>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)' }}>Intention</div>
                    <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>pédagogique</div>
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: '#FFFFFF08' }}>
                    <RichEditor value={form.intention} onChange={v => setForm({ ...form, intention: v })} rows={2} placeholder="Les élèves seront capables de..." disabled={!editing} showToolbar={false} lightBackground onFocus={setActiveEditor} uploadImage={uploadImageFn} />
                  </td>
                  <td style={{ borderBottom: '1px solid var(--border)' }} />
                </tr>

                {/* Objectifs */}
                <tr>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)' }}>Objectifs</div>
                    <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>d'apprentissage</div>
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: '#FFFFFF08' }}>
                    <RichEditor value={form.objectifs} onChange={v => setForm({ ...form, objectifs: v })} rows={3} placeholder="• Objectif 1&#10;• Objectif 2" disabled={!editing} showToolbar={false} lightBackground onFocus={setActiveEditor} uploadImage={uploadImageFn} />
                  </td>
                  <td style={{ borderBottom: '1px solid var(--border)' }} />
                </tr>

                {/* Phase AVANT */}
                <tr>
                  <td colSpan={3} style={{ padding: '8px 12px', background: 'rgba(251,195,74,0.07)', borderTop: '2px solid rgba(251,195,74,0.4)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#FBC34A', letterSpacing: '1px' }}>🔶 AVANT — Mise en route</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="number" value={form.avant_duree} onChange={e => setForm({ ...form, avant_duree: e.target.value })} disabled={!editing}
                          style={{ width: 44, padding: '3px 6px', background: 'rgba(251,195,74,0.15)', border: '1px solid rgba(251,195,74,0.3)', borderRadius: 5, fontSize: 11, fontWeight: 700, color: '#FBC34A', textAlign: 'center', outline: 'none' }} />
                        <span style={{ fontSize: 10, color: 'var(--text-4)' }}>min</span>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#FBC34A' }}>Amorce</div>
                    <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>mise en route</div>
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'rgba(251,195,74,0.03)' }}>
                    <RichEditor value={form.avant_amorce} onChange={v => setForm({ ...form, avant_amorce: v })} rows={4} placeholder="Question déclenchante, activité d'activation des connaissances..." disabled={!editing} showToolbar={false} lightBackground onFocus={setActiveEditor} uploadImage={uploadImageFn} />
                  </td>
                  <td style={{ borderBottom: '1px solid var(--border)' }} />
                </tr>

                {/* Phase PENDANT */}
                <tr>
                  <td colSpan={3} style={{ padding: '8px 12px', background: 'rgba(96,165,250,0.07)', borderTop: '2px solid rgba(96,165,250,0.4)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#60A5FA', letterSpacing: '1px' }}>🔵 PENDANT — Enseignement</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="number" value={form.pendant_duree} onChange={e => setForm({ ...form, pendant_duree: e.target.value })} disabled={!editing}
                          style={{ width: 44, padding: '3px 6px', background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 5, fontSize: 11, fontWeight: 700, color: '#60A5FA', textAlign: 'center', outline: 'none' }} />
                        <span style={{ fontSize: 10, color: 'var(--text-4)' }}>min</span>
                      </div>
                    </div>
                  </td>
                </tr>
                {[
                  { key: 'pendant_modelisation',    label: 'Modélisation',    sub: 'enseignement explicite', ph: "Ce que l'enseignant explique et démontre..." },
                  { key: 'pendant_pratique_guidee', label: 'Pratique guidée', sub: 'en groupe / dyades',     ph: 'Activité guidée, exercice avec support...' },
                  { key: 'pendant_pratique_autonome',label: 'Autonome',       sub: 'individuel',              ph: 'Exercice individuel, tâche autonome...' },
                ].map(row => (
                  <tr key={row.key}>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#60A5FA' }}>{row.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>{row.sub}</div>
                    </td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'rgba(96,165,250,0.03)' }}>
                      <RichEditor value={(form as any)[row.key]} onChange={v => setForm({ ...form, [row.key]: v })} rows={4} placeholder={row.ph} disabled={!editing} showToolbar={false} lightBackground onFocus={setActiveEditor} uploadImage={uploadImageFn} />
                    </td>
                    <td style={{ borderBottom: '1px solid var(--border)' }} />
                  </tr>
                ))}

                {/* Phase APRÈS */}
                <tr>
                  <td colSpan={3} style={{ padding: '8px 12px', background: 'rgba(52,211,153,0.06)', borderTop: '2px solid rgba(52,211,153,0.4)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#34D399', letterSpacing: '1px' }}>🟢 APRÈS — Clôture</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="number" value={form.apres_duree} onChange={e => setForm({ ...form, apres_duree: e.target.value })} disabled={!editing}
                          style={{ width: 44, padding: '3px 6px', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 5, fontSize: 11, fontWeight: 700, color: '#34D399', textAlign: 'center', outline: 'none' }} />
                        <span style={{ fontSize: 10, color: 'var(--text-4)' }}>min</span>
                      </div>
                    </div>
                  </td>
                </tr>
                {[
                  { key: 'apres_cloture', label: 'Clôture',       sub: 'retour apprentissages', ph: 'Discussion, synthèse, retour collectif...' },
                  { key: 'apres_billet',  label: 'Billet sortie',  sub: 'évaluation rapide',     ph: 'Question courte pour vérifier la compréhension...' },
                ].map(row => (
                  <tr key={row.key}>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#34D399' }}>{row.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>{row.sub}</div>
                    </td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'rgba(52,211,153,0.025)' }}>
                      <RichEditor value={(form as any)[row.key]} onChange={v => setForm({ ...form, [row.key]: v })} rows={3} placeholder={row.ph} disabled={!editing} showToolbar={false} lightBackground onFocus={setActiveEditor} uploadImage={uploadImageFn} />
                    </td>
                    <td style={{ borderBottom: '1px solid var(--border)' }} />
                  </tr>
                ))}

                {/* Section ressources */}
                <tr>
                  <td colSpan={3} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderTop: '2px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '1px' }}>📦 RESSOURCES & ÉVALUATION</div>
                  </td>
                </tr>
                {[
                  { key: 'materiel',        label: 'Matériel',       sub: 'ressources requises', ph: 'Tableau, feuilles, crayons, tablettes...'  },
                  { key: 'criteres',         label: 'Critères',       sub: 'de réussite',         ph: "L'élève est capable de... / démontre..."   },
                  { key: 'differentiation',  label: 'Différenciation',sub: 'TDAH, dyslexie...',   ph: 'Adaptations, supports visuels, aide...'    },
                  { key: 'vocabulaire',      label: 'Vocabulaire',    sub: 'termes clés',          ph: 'Terme 1, Terme 2...'                       },
                ].map(row => (
                  <tr key={row.key}>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>{row.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>{row.sub}</div>
                    </td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: '#FFFFFF06' }}>
                      <RichEditor value={(form as any)[row.key]} onChange={v => setForm({ ...form, [row.key]: v })} rows={3} placeholder={row.ph} disabled={!editing} showToolbar={false} lightBackground onFocus={setActiveEditor} uploadImage={uploadImageFn} />
                    </td>
                    <td style={{ borderBottom: '1px solid var(--border)' }} />
                  </tr>
                ))}

              </tbody>
            </table>

            {/* Actions bas de page */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleExportDocx} className="btn-ghost btn-sm">📝 Word</button>
                <button onClick={handleExportPptx} disabled={exportingPptx} className="btn-ghost btn-sm">📊 {exportingPptx ? '...' : 'PowerPoint'}</button>
                <label className="btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                  📁 Importer
                  <input type="file" accept=".docx,.pdf" style={{ display: 'none' }} onChange={handleImportFile} />
                </label>
                <button onClick={handlePrint} className="btn-ghost btn-sm">🖨️ Imprimer</button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {autoSaveMsg && <span style={{ fontSize: '11px', color: '#34D399' }}>{autoSaveMsg}</span>}
                {exportMsg && <span style={{ fontSize: '12px', color: exportMsg.includes('✓') ? '#34D399' : '#60A5FA' }}>{exportMsg}</span>}
                <button onClick={() => router.push(`/dashboard/classes/${classeId}/lecons/${leconId}/tableau`)} className="btn-ghost btn-sm">🖍 Tableau blanc</button>
                <button onClick={() => router.push(`/dashboard/classes/${classeId}/lecons/${leconId}/presenter`)}
                  style={{ padding: '7px 16px', background: 'linear-gradient(135deg, #6B3FA0, #4F46E5)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  ▶ Mode TBI
                </button>
              </div>
            </div>
          </div>
          )}

          {/* ══════════════════════ PRÉSENTATION TBI — Aperçu ════════════════ */}
          {docMode === 'plan' && editorView === 'presentation' && (
          <div style={{ padding: '20px', overflowY: 'auto' }}>
            <div style={{ maxWidth: 820, margin: '0 auto' }}>
              <div style={{ padding: '12px 18px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 10, marginBottom: 20, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                🖥️ Aperçu de la présentation. La présentation plein écran s'ouvre dans un onglet séparé via le bouton <strong style={{ color: '#A78BFA' }}>Lancer</strong>.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Intention pédagogique', tag: 'INTENTION', content: form.intention, color: '#A78BFA' },
                  { label: "Objectifs d'apprentissage", tag: 'OBJECTIFS', content: form.objectifs, color: '#60A5FA' },
                  { label: 'Amorce — AVANT', tag: 'AVANT', content: form.avant_amorce, color: '#FBC34A' },
                  { label: 'Modélisation — PENDANT', tag: 'PENDANT', content: form.pendant_modelisation, color: '#60A5FA' },
                  { label: 'Pratique guidée — PENDANT', tag: 'PENDANT', content: form.pendant_pratique_guidee, color: '#60A5FA' },
                  { label: 'Autonome — PENDANT', tag: 'PENDANT', content: form.pendant_pratique_autonome, color: '#60A5FA' },
                  { label: 'Clôture — APRÈS', tag: 'APRÈS', content: form.apres_cloture, color: '#34D399' },
                  { label: 'Billet de sortie — APRÈS', tag: 'APRÈS', content: form.apres_billet, color: '#34D399' },
                ].filter(s => s.content && s.content.length > 7).map((s, i) => (
                  <div key={i} style={{ background: 'var(--surface)', border: `1px solid ${s.color}30`, borderLeft: `4px solid ${s.color}`, borderRadius: 10, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ padding: '2px 10px', background: `${s.color}18`, color: s.color, borderRadius: 99, fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>{s.tag}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}
                      dangerouslySetInnerHTML={{ __html: s.content }} />
                  </div>
                ))}
                <button onClick={() => router.push(`/dashboard/classes/${classeId}/lecons/${leconId}/presenter`)}
                  style={{ padding: '14px', background: 'linear-gradient(135deg, #6B3FA0, #4F46E5)', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
                  ▶ Lancer la présentation plein écran (TBI)
                </button>
              </div>
            </div>
          </div>
          )}

        </div>
      </div>


      {/* Import modal */}
      {showImport && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }} onClick={e => { if (e.target === e.currentTarget) setShowImport(false) }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: '760px',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)' }}>📁 Cours importé</div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>Prévisualisez et choisissez où insérer le contenu</div>
              </div>
              <button onClick={() => setShowImport(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-3)' }}>×</button>
            </div>

            {importLoading && (
              <div style={{ padding: '32px', textAlign: 'center' as const, color: 'var(--text-3)' }}>
                ⟳ Conversion en cours...
              </div>
            )}

            {importPdfUrl && (
              <iframe src={importPdfUrl} style={{ flex: 1, minHeight: '400px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} />
            )}

            {importHtml && !importLoading && (
              <>
                <div style={{
                  flex: 1, overflowY: 'auto' as const, padding: '16px',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)', fontSize: '13px', lineHeight: '1.7',
                  color: 'var(--text-1)', maxHeight: '340px',
                }} dangerouslySetInnerHTML={{ __html: importHtml }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)', flexShrink: 0 }}>Insérer dans :</span>
                  <select
                    value={importField}
                    onChange={e => setImportField(e.target.value)}
                    style={{ flex: 1, minWidth: '200px', padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', background: 'var(--bg-elevated)', color: 'var(--text-1)', outline: 'none' }}
                  >
                    <option value="intention">Intention pédagogique</option>
                    <option value="avant_amorce">AVANT — Amorce</option>
                    <option value="pendant_modelisation">PENDANT — Modélisation</option>
                    <option value="pendant_pratique_guidee">PENDANT — Pratique guidée</option>
                    <option value="pendant_pratique_autonome">PENDANT — Pratique autonome</option>
                    <option value="apres_cloture">APRÈS — Clôture</option>
                    <option value="apres_billet">APRÈS — Billet de sortie</option>
                  </select>
                  <button onClick={applyImport} className="btn-primary btn-sm">
                    ✓ Insérer dans la leçon
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Quiz ── */}
      {showQuiz && quizContent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={e => { if (e.target === e.currentTarget) setShowQuiz(false) }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: '680px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)' }}>❓ Quiz généré par IA</div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>{form.titre}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => navigator.clipboard.writeText(quizContent)} className="btn-ghost btn-sm">📋 Copier</button>
                <button onClick={() => setShowQuiz(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-4)' }}>×</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '13px', lineHeight: '1.8', color: 'var(--text-1)', whiteSpace: 'pre-wrap' }}>
              {quizContent}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { navigator.clipboard.writeText(quizContent); setShowQuiz(false) }} className="btn-primary btn-sm">📋 Copier et fermer</button>
              <button onClick={() => setShowQuiz(false)} className="btn-ghost btn-sm">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}