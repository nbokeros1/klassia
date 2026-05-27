'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import RichEditor from '@/components/RichEditor'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'

export default function LeconPage() {
  const [profil, setProfil] = useState<any>(null)
  const [classe, setClasse] = useState<any>(null)
  const [lecon, setLecon] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exportingPptx, setExportingPptx] = useState(false)
  const [exportMsg, setExportMsg] = useState('')
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
        const c = lecon.contenu_json || {}
        setForm({
          titre: lecon.titre || '',
          intention: c.intention || '',
          objectifs: Array.isArray(c.objectifs) ? c.objectifs.join('\n') : '',
          avant_amorce: c.avant_amorce || '',
          avant_duree: c.avant_duree || '10',
          pendant_modelisation: c.pendant_modelisation || '',
          pendant_pratique_guidee: c.pendant_pratique_guidee || '',
          pendant_pratique_autonome: c.pendant_pratique_autonome || '',
          pendant_duree: c.pendant_duree || '50',
          apres_cloture: c.apres_cloture || '',
          apres_billet: c.apres_billet || '',
          apres_duree: c.apres_duree || '10',
          materiel: Array.isArray(c.materiel) ? c.materiel.join('\n') : '',
          criteres: Array.isArray(c.criteres) ? c.criteres.join('\n') : '',
          differentiation: c.differentiation || '',
          vocabulaire: Array.isArray(c.vocabulaire) ? c.vocabulaire.join('\n') : '',
        })
      }
      setLoading(false)
    }
    init()
  }, [classeId, leconId])

  const handleSave = async () => {
    setSaving(true)
    const contenu_json = {
      intention: form.intention,
      objectifs: form.objectifs.split('\n').filter(Boolean),
      avant_amorce: form.avant_amorce,
      avant_duree: form.avant_duree,
      pendant_modelisation: form.pendant_modelisation,
      pendant_pratique_guidee: form.pendant_pratique_guidee,
      pendant_pratique_autonome: form.pendant_pratique_autonome,
      pendant_duree: form.pendant_duree,
      apres_cloture: form.apres_cloture,
      apres_billet: form.apres_billet,
      apres_duree: form.apres_duree,
      materiel: form.materiel.split('\n').filter(Boolean),
      criteres: form.criteres.split('\n').filter(Boolean),
      differentiation: form.differentiation,
      vocabulaire: form.vocabulaire.split('\n').filter(Boolean),
    }
    await supabase.from('lecons').update({
      titre: form.titre,
      contenu_json,
      statut: 'complete',
    }).eq('id', leconId)
    setLecon({ ...lecon, titre: form.titre, contenu_json })
    setEditing(false)
    setSaving(false)
  }

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
            objectifs: form.objectifs.split('\n').filter(Boolean),
            avant_amorce: stripHtml(form.avant_amorce),
            avant_duree: form.avant_duree,
            pendant_modelisation: stripHtml(form.pendant_modelisation),
            pendant_pratique_guidee: stripHtml(form.pendant_pratique_guidee),
            pendant_pratique_autonome: stripHtml(form.pendant_pratique_autonome),
            pendant_duree: form.pendant_duree,
            apres_cloture: stripHtml(form.apres_cloture),
            apres_billet: stripHtml(form.apres_billet),
            apres_duree: form.apres_duree,
            criteres: form.criteres.split('\n').filter(Boolean),
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
      a.download = `KlassIA_${form.titre.replace(/\s+/g, '_')}.pptx`
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
          objectifs: form.objectifs.split('\n').filter(Boolean),
          avant_amorce: stripHtml(form.avant_amorce),
          avant_duree: form.avant_duree,
          pendant_modelisation: stripHtml(form.pendant_modelisation),
          pendant_pratique_guidee: stripHtml(form.pendant_pratique_guidee),
          pendant_pratique_autonome: stripHtml(form.pendant_pratique_autonome),
          pendant_duree: form.pendant_duree,
          apres_cloture: stripHtml(form.apres_cloture),
          apres_billet: stripHtml(form.apres_billet),
          apres_duree: form.apres_duree,
          criteres: form.criteres.split('\n').filter(Boolean),
          differentiation: stripHtml(form.differentiation),
          materiel: form.materiel.split('\n').filter(Boolean),
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
    a.download = `KlassIA_${form.titre.replace(/\s+/g, '_')}.docx`
    a.click()
    URL.revokeObjectURL(url)
    setExportMsg('✓ Word téléchargé !')
    setTimeout(() => setExportMsg(''), 4000)
  } catch {
    setExportMsg('Erreur export Word')
  }
}

const handlePrint = () => {
  window.print()
}
  if (loading) return <LoadingScreen />

  const totalDuree = parseInt(form.avant_duree) + parseInt(form.pendant_duree) + parseInt(form.apres_duree)

  const ta = (val: string, onChange: (v: string) => void, rows = 3, placeholder = '') => (
    <textarea
      value={val}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      disabled={!editing}
      style={{
        width: '100%', padding: '10px 13px',
        border: `1.5px solid ${editing ? 'var(--border)' : 'transparent'}`,
        borderRadius: 'var(--radius-sm)', fontSize: '13px',
        color: 'var(--text-1)', background: editing ? 'rgba(255,255,255,0.06)' : 'transparent',
        outline: 'none', resize: 'none' as const,
        fontFamily: 'inherit', lineHeight: '1.65',
        transition: 'all 0.15s',
      }}
    />
  )

  return (
    <div className="app-layout">

      {/* Sidebar */}
      <Sidebar profil={profil} activeHref="/dashboard/classes" />

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
        <div className="page-content fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>

            {/* Colonne principale */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Titre + intention */}
              <div className="card">
                <div style={{ marginBottom: '14px' }}>
                  <div className="form-label">Titre de la leçon</div>
                  <input value={form.titre}
                    onChange={e => setForm({ ...form, titre: e.target.value })}
                    disabled={!editing}
                    placeholder="Titre de la leçon"
                    style={{
                      width: '100%', padding: '10px 13px',
                      border: `1.5px solid ${editing ? 'var(--border)' : 'transparent'}`,
                      borderRadius: 'var(--radius-sm)', fontSize: '14px', fontWeight: 600,
                      color: 'var(--text-1)', background: editing ? 'rgba(255,255,255,0.06)' : 'transparent',
                      outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div>
                  <div className="form-label">Intention pédagogique</div>
                  <RichEditor value={form.intention} onChange={v => setForm({ ...form, intention: v })} rows={2} placeholder="Les élèves seront capables de..." disabled={!editing} />
                </div>
              </div>

              {/* Objectifs */}
              <div className="card">
                <div className="form-label" style={{ marginBottom: '8px' }}>
                  🎯 Objectifs d'apprentissage
                  <span style={{ fontSize: '10px', color: 'var(--text-4)', fontWeight: 400, marginLeft: '8px' }}>
                    (un objectif par ligne)
                  </span>
                </div>
                {ta(form.objectifs, v => setForm({ ...form, objectifs: v }), 4, "Objectif 1\nObjectif 2\nObjectif 3")}
              </div>

              {/* AVANT */}
              <div className="card" style={{ borderLeft: '4px solid var(--amber)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      background: 'var(--amber-pale)', color: 'var(--amber)',
                      padding: '4px 12px', borderRadius: '99px',
                      fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px',
                    }}>AVANT</div>
                    <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>Amorce & activation</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="number" value={form.avant_duree}
                      onChange={e => setForm({ ...form, avant_duree: e.target.value })}
                      disabled={!editing}
                      style={{ width: '52px', padding: '4px 8px', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '12px', textAlign: 'center' as const, background: editing ? 'rgba(255,255,255,0.06)' : 'transparent', outline: 'none', fontFamily: 'inherit' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>min</span>
                  </div>
                </div>
                <div className="form-label">Amorce / Question de départ</div>
                <RichEditor value={form.avant_amorce} onChange={v => setForm({ ...form, avant_amorce: v })} rows={4} placeholder="Description de l'amorce, question de départ, activité de mise en route..." disabled={!editing} />
              </div>

              {/* PENDANT */}
              <div className="card" style={{ borderLeft: '4px solid #60A5FA' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      background: 'var(--blue-pale)', color: '#60A5FA',
                      padding: '4px 12px', borderRadius: '99px',
                      fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px',
                    }}>PENDANT</div>
                    <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>Enseignement & pratique</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="number" value={form.pendant_duree}
                      onChange={e => setForm({ ...form, pendant_duree: e.target.value })}
                      disabled={!editing}
                      style={{ width: '52px', padding: '4px 8px', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '12px', textAlign: 'center' as const, background: editing ? 'rgba(255,255,255,0.06)' : 'transparent', outline: 'none', fontFamily: 'inherit' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>min</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <div className="form-label">
                      <span style={{ background: 'var(--blue-pale)', color: '#60A5FA', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, marginRight: '6px' }}>Modélisation</span>
                      Enseignement explicite
                    </div>
                    <RichEditor value={form.pendant_modelisation} onChange={v => setForm({ ...form, pendant_modelisation: v })} rows={4} placeholder="Ce que l'enseignant explique et démontre..." disabled={!editing} />
                  </div>
                  <div style={{ height: '1px', background: 'var(--border)' }} />
                  <div>
                    <div className="form-label">
                      <span style={{ background: 'var(--blue-pale)', color: '#60A5FA', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, marginRight: '6px' }}>Pratique guidée</span>
                      En groupe ou en dyades
                    </div>
                    <RichEditor value={form.pendant_pratique_guidee} onChange={v => setForm({ ...form, pendant_pratique_guidee: v })} rows={4} placeholder="Activité guidée avec l'enseignant..." disabled={!editing} />
                  </div>
                  <div style={{ height: '1px', background: 'var(--border)' }} />
                  <div>
                    <div className="form-label">
                      <span style={{ background: 'var(--violet-light)', color: 'var(--violet)', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, marginRight: '6px' }}>Pratique autonome</span>
                      Individuellement
                    </div>
                    <RichEditor value={form.pendant_pratique_autonome} onChange={v => setForm({ ...form, pendant_pratique_autonome: v })} rows={4} placeholder="Exercice individuel, tâche autonome..." disabled={!editing} />
                  </div>
                </div>
              </div>

              {/* APRÈS */}
              <div className="card" style={{ borderLeft: '4px solid var(--green)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      background: 'var(--green-pale)', color: 'var(--green)',
                      padding: '4px 12px', borderRadius: '99px',
                      fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px',
                    }}>APRÈS</div>
                    <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>Clôture & évaluation</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="number" value={form.apres_duree}
                      onChange={e => setForm({ ...form, apres_duree: e.target.value })}
                      disabled={!editing}
                      style={{ width: '52px', padding: '4px 8px', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '12px', textAlign: 'center' as const, background: editing ? 'rgba(255,255,255,0.06)' : 'transparent', outline: 'none', fontFamily: 'inherit' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>min</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <div className="form-label">Clôture de la leçon</div>
                    <RichEditor value={form.apres_cloture} onChange={v => setForm({ ...form, apres_cloture: v })} rows={3} placeholder="Retour sur les apprentissages, discussion, synthèse..." disabled={!editing} />
                  </div>
                  <div style={{ height: '1px', background: 'var(--border)' }} />
                  <div>
                    <div className="form-label">Billet de sortie</div>
                    <RichEditor value={form.apres_billet} onChange={v => setForm({ ...form, apres_billet: v })} rows={2} placeholder="Question ou tâche courte pour évaluer la compréhension..." disabled={!editing} />
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne droite */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Durée */}
              <div className="card">
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '12px' }}>⏱ Durée totale</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  {[
                    { label: 'Avant', duree: form.avant_duree, color: 'var(--amber)' },
                    { label: 'Pendant', duree: form.pendant_duree, color: '#60A5FA' },
                    { label: 'Après', duree: form.apres_duree, color: 'var(--green)' },
                  ].map((d, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center' as const }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: d.color }}>{d.duree}</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-4)', marginTop: '2px' }}>{d.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden', display: 'flex', gap: '2px' }}>
                  {[
                    { val: parseInt(form.avant_duree), c: 'var(--amber)' },
                    { val: parseInt(form.pendant_duree), c: '#60A5FA' },
                    { val: parseInt(form.apres_duree), c: 'var(--green)' },
                  ].map((s, i) => (
                    <div key={i} style={{ height: '100%', background: s.c, flex: s.val, borderRadius: '99px', transition: 'flex 0.3s' }} />
                  ))}
                </div>
                <div style={{ textAlign: 'center' as const, marginTop: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>
                  {totalDuree} minutes au total
                </div>
              </div>

              {/* Matériel */}
              <div className="card">
                <div className="form-label" style={{ marginBottom: '8px' }}>📦 Matériel requis</div>
                {ta(form.materiel, v => setForm({ ...form, materiel: v }), 4, "Tableau\nFeuilles de travail\nCrayons...")}
              </div>

              {/* Critères */}
              <div className="card">
                <div className="form-label" style={{ marginBottom: '8px' }}>✓ Critères de réussite</div>
                {ta(form.criteres, v => setForm({ ...form, criteres: v }), 4, "L'élève est capable de...\nL'élève démontre...")}
              </div>

              {/* Différenciation */}
              <div className="card" style={{ background: 'var(--violet-light)', border: '1px solid rgba(107,63,160,0.12)' }}>
                <div className="form-label" style={{ marginBottom: '8px', color: 'var(--violet)' }}>✦ Différenciation</div>
                <RichEditor value={form.differentiation} onChange={v => setForm({ ...form, differentiation: v })} rows={4} placeholder="Dyslexie, TDAH, Allophone..." disabled={!editing} />
              </div>

              {/* Vocabulaire */}
              <div className="card">
                <div className="form-label" style={{ marginBottom: '8px' }}>📚 Vocabulaire clé</div>
                {ta(form.vocabulaire, v => setForm({ ...form, vocabulaire: v }), 3, "Terme 1\nTerme 2\nTerme 3")}
              </div>

              {/* Mode TBI */}
              <div style={{
                background: 'linear-gradient(135deg, #3B1F6E, #4F46E5)',
                borderRadius: 'var(--radius-lg)', padding: '18px',
                textAlign: 'center' as const,
              }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>🖥️</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '5px' }}>Mode TBI</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '14px' }}>
                  Présentation plein écran avec timer intégré
                </div>
                <button
                  onClick={() => router.push(`/dashboard/classes/${classeId}/lecons/${leconId}/presenter`)}
                  style={{
                    width: '100%', padding: '11px', background: 'white', color: '#4F46E5',
                    border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '13px',
                    fontWeight: 700, cursor: 'pointer',
                  }}>
                  ▶ Lancer la présentation
                </button>
              </div>

              {/* Export PowerPoint */}
              <div style={{
                background: 'linear-gradient(135deg, #1B3F6E, #2D5FA0)',
                borderRadius: 'var(--radius-lg)', padding: '18px',
                textAlign: 'center' as const,
              }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '5px' }}>Export PowerPoint</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '14px' }}>
                  Présentation prête à projeter
                </div>
                <button onClick={handleExportPptx} disabled={exportingPptx}
                  style={{
                    width: '100%', padding: '11px', background: 'white', color: '#1B3F6E',
                    border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '13px',
                    fontWeight: 700, cursor: 'pointer', opacity: exportingPptx ? 0.7 : 1,
                  }}>
                  {exportingPptx ? '⟳ Génération...' : '📥 Télécharger .pptx'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}