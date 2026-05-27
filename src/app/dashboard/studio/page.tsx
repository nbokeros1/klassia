'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'

const TYPES = [
  { id: 'fiche_lecon', label: 'Fiche de leçon', emoji: '📄', desc: 'AVANT / PENDANT / APRÈS' },
  { id: 'quiz', label: 'Quiz', emoji: '❓', desc: 'Avec corrigé' },
  { id: 'evaluation', label: 'Évaluation', emoji: '📊', desc: 'Grille critères' },
  { id: 'differentiation', label: 'Différenciation', emoji: '🎯', desc: 'Adapté aux besoins' },
  { id: 'activite', label: 'Activité', emoji: '🧩', desc: 'Inclusive' },
  { id: 'plan_cours', label: 'Plan de cours', emoji: '🗓️', desc: 'Vue semaine' },
]

export default function StudioPage() {
  const [profil, setProfil] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [classeId, setClasseId] = useState('')
  const [typeContenu, setTypeContenu] = useState('fiche_lecon')
  const [sujet, setSujet] = useState('')
  const [duree, setDuree] = useState('75')
  const [instructions, setInstructions] = useState('')
  const [adapterBesoins, setAdapterBesoins] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [resultat, setResultat] = useState('')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const user = session.user
            const { data: profil } = await supabase
        .from('utilisateurs').select('*')
        .eq('user_id', user.id).single()
      setProfil(profil)
      const { data: cls } = await supabase
        .from('classes').select('*')
        .eq('enseignant_id', profil?.id)
      setClasses(cls || [])
      if (cls && cls.length > 0) setClasseId(cls[0].id)
    }
    init()
  }, [])

  const classeSelectionnee = classes.find(c => c.id === classeId)

  const handleGenerer = async () => {
    if (!sujet.trim()) { alert('Entre un sujet ou titre de leçon'); return }
    setGenerating(true)
    setResultat('')
    setSaved(false)

    try {
      const res = await fetch('/api/ia/generer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_contenu: typeContenu,
          sujet,
          duree,
          instructions,
          adapter_besoins: adapterBesoins,
          contexte: {
            classe: classeSelectionnee ? {
              nom: classeSelectionnee.nom,
              niveau: classeSelectionnee.niveau,
              matiere: classeSelectionnee.matiere,
              nombre_eleves: classeSelectionnee.nombre_eleves,
              langue: classeSelectionnee.langue,
            } : null,
          },
          langue: classeSelectionnee?.langue || 'fr',
        }),
      })
      const data = await res.json()
      setResultat(data.contenu || 'Erreur lors de la génération. Vérifiez votre clé API.')
    } catch {
      setResultat('Erreur de connexion. Réessayez.')
    }
    setGenerating(false)
  }

  const handleSauvegarder = async () => {
    if (!resultat || !profil) return
    await supabase.from('generations_ia').insert({
      enseignant_id: profil.id,
      classe_id: classeId || null,
      type_contenu: typeContenu,
      contenu_genere: resultat,
      langue: classeSelectionnee?.langue || 'fr',
      sauvegarde: true,
    })
    setSaved(true)
  }

  const handleCopier = () => {
    navigator.clipboard.writeText(resultat)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="app-layout">

      {/* Sidebar */}
      <Sidebar profil={profil} activeHref="/dashboard/studio" />

      {/* Main */}
      <div className="main-content">

        {/* Header IA */}
        <div className="ia-header">
          <div>
            <div className="ia-header-title">✦ Studio IA — KlassIA</div>
            <div className="ia-header-sub">Génération contextuelle · Données anonymisées · FR + EN</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', fontSize: '11px' }}>
              🧠 Mémoire active
            </span>
            <span className="badge" style={{ background: 'rgba(46,204,113,0.15)', color: '#6EFFA8', fontSize: '11px' }}>
              🔒 Données anonymisées
            </span>
          </div>
        </div>

        {/* Layout studio */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 73px)' }}>

          {/* Panneau gauche */}
          <div style={{
            width: '310px', flexShrink: 0,
            borderRight: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            overflow: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}>

            {/* 1. Classe */}
            <div>
              <label className="form-label" style={{ letterSpacing: '1.5px', fontSize: '10px', color: 'var(--text-4)' }}>
                1 · CLASSE CIBLÉE
              </label>
              {classes.length === 0 ? (
                <div className="alert alert-info" style={{ marginBottom: 0 }}>
                  <span>ℹ</span>
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Aucune classe</div>
                    <button className="btn-ghost btn-sm" onClick={() => router.push('/dashboard/classes')}>
                      Créer une classe
                    </button>
                  </div>
                </div>
              ) : (
                <select value={classeId} onChange={e => setClasseId(e.target.value)}>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.nom} · {c.niveau}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Contexte anonyme */}
            {classeSelectionnee && (
              <div style={{
                background: 'var(--violet-light)',
                border: '1px solid rgba(107,63,160,0.15)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
              }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--violet)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Contexte envoyé à l'IA
                </div>
                {[
                  `📚 ${classeSelectionnee.matiere} · ${classeSelectionnee.niveau}`,
                  `👥 ${classeSelectionnee.nombre_eleves} élèves · ${classeSelectionnee.langue === 'fr' ? 'Français' : 'English'}`,
                  '🔒 Aucun nom réel transmis',
                ].map((line, i) => (
                  <div key={i} style={{ fontSize: '11px', color: 'var(--violet)', opacity: 0.8, marginBottom: '3px' }}>
                    {line}
                  </div>
                ))}
              </div>
            )}

            {/* 2. Type */}
            <div>
              <label className="form-label" style={{ letterSpacing: '1.5px', fontSize: '10px', color: 'var(--text-4)' }}>
                2 · TYPE DE CONTENU
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {TYPES.map(t => (
                  <div key={t.id}
                    onClick={() => setTypeContenu(t.id)}
                    style={{
                      border: `1.5px solid ${typeContenu === t.id ? 'var(--violet)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      background: typeContenu === t.id ? 'var(--violet-light)' : 'rgba(255,255,255,0.04)',
                      transition: 'all 0.15s',
                    }}>
                    <div style={{ fontSize: '18px', marginBottom: '4px' }}>{t.emoji}</div>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: typeContenu === t.id ? 'var(--violet)' : 'var(--text-2)' }}>
                      {t.label}
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--text-4)' }}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Précisions */}
            <div>
              <label className="form-label" style={{ letterSpacing: '1.5px', fontSize: '10px', color: 'var(--text-4)' }}>
                3 · PRÉCISIONS
              </label>
              <div className="form-group">
                <label className="form-label">Sujet ou titre *</label>
                <input value={sujet} onChange={e => setSujet(e.target.value)}
                  placeholder="Ex: La nouvelle littéraire" />
              </div>
              <div className="form-group">
                <label className="form-label">Durée</label>
                <select value={duree} onChange={e => setDuree(e.target.value)}>
                  {['45', '60', '75', '90', '120'].map(d => (
                    <option key={d} value={d}>{d} minutes</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Instructions supplémentaires</label>
                <textarea value={instructions} onChange={e => setInstructions(e.target.value)}
                  placeholder="Ex: inclure un exemple de texte..."
                  style={{ height: '70px', resize: 'none', fontSize: '12px' }} />
              </div>
            </div>

            {/* 4. Options */}
            <div>
              <label className="form-label" style={{ letterSpacing: '1.5px', fontSize: '10px', color: 'var(--text-4)', marginBottom: '10px' }}>
                4 · OPTIONS
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div onClick={() => setAdapterBesoins(!adapterBesoins)}
                  style={{
                    width: '36px', height: '20px', borderRadius: '99px',
                    background: adapterBesoins ? 'var(--violet)' : 'var(--border)',
                    display: 'flex', alignItems: 'center', padding: '3px',
                    cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
                  }}>
                  <div style={{
                    width: '14px', height: '14px', borderRadius: '50%', background: 'white',
                    transform: adapterBesoins ? 'translateX(16px)' : 'translateX(0)',
                    transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-1)' }}>
                    Adapter pour élèves à besoins
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-4)' }}>Dyslexie · TDAH · Allophone</div>
                </div>
              </div>
            </div>

            {/* Bouton générer */}
            <button
              onClick={handleGenerer}
              disabled={generating || classes.length === 0}
              className="btn-violet"
              style={{
                width: '100%', justifyContent: 'center',
                padding: '13px', fontSize: '14px',
                opacity: (generating || classes.length === 0) ? 0.7 : 1,
              }}>
              {generating ? '⟳ Génération en cours...' : '✦ Générer le contenu'}
            </button>
          </div>

          {/* Panneau droit — Résultat */}
          <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: 'var(--bg-base)' }}>

            {!resultat && !generating && (
              <div style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-4)', textAlign: 'center',
              }}>
                <div style={{ fontSize: '56px', marginBottom: '16px', opacity: 0.4 }}>✦</div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '8px' }}>
                  Prêt à générer
                </div>
                <div style={{ fontSize: '13px', maxWidth: '280px', lineHeight: '1.6' }}>
                  Sélectionne une classe, un type de contenu et un sujet, puis clique sur Générer
                </div>
              </div>
            )}

            {generating && (
              <div style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '16px',
              }}>
                <div style={{ fontSize: '48px', animation: 'pulse 1.5s infinite', color: 'var(--violet)' }}>✦</div>
                <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--violet)' }}>
                  KlassIA génère ton contenu...
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>Quelques secondes</div>
                <div style={{ width: '120px', height: '3px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: 'var(--violet)',
                    borderRadius: '99px', animation: 'loading 1.5s ease-in-out infinite',
                    width: '40%',
                  }} />
                </div>
              </div>
            )}

            {resultat && (
              <div className="fade-in">

                {/* Header résultat */}
                <div style={{
                  background: 'var(--violet-light)',
                  border: '1px solid rgba(107,63,160,0.15)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '14px 18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '16px',
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--violet)', marginBottom: '2px' }}>
                      ✦ {TYPES.find(t => t.id === typeContenu)?.label} — {sujet}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                      {classeSelectionnee?.nom} · {duree} min · Généré par KlassIA
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleCopier} className="btn-ghost btn-sm">
                      {copied ? '✓ Copié !' : '📋 Copier'}
                    </button>
                    <button
                      onClick={handleSauvegarder}
                      className={saved ? 'btn-ghost btn-sm' : 'btn-violet btn-sm'}
                      style={{ opacity: saved ? 0.7 : 1 }}>
                      {saved ? '✓ Sauvegardé' : '💾 Sauvegarder'}
                    </button>
                  </div>
                </div>

                {/* Contenu généré */}
                <div className="card" style={{
                  fontSize: '13px', lineHeight: '1.8',
                  whiteSpace: 'pre-wrap', color: 'var(--text-1)',
                  fontFamily: 'inherit',
                }}>
                  {resultat}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <span className="badge badge-violet">✦ Généré par KlassIA</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>
                    Vérifie le contenu avant utilisation en classe
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}