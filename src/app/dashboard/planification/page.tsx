'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'
import { STATUT_LECON } from '@/lib/constants/statuts'
import { CURRICULA_IA as CURRICULA } from '@/lib/constants/curricula'

const STATUT_LABEL: Record<string, { label: string; color: string; bg: string }> = STATUT_LECON as any

type GenStep = 'idle' | 'options' | 'loading' | 'done'

export default function PlanificationPage() {
  const [profil, setProfil]           = useState<any>(null)
  const [classes, setClasses]         = useState<any[]>([])
  const [programmes, setProgrammes]   = useState<any[]>([])
  const [classeActive, setClasseActive] = useState<string>('')
  const [lecons, setLecons]           = useState<any[]>([])        // real lecons in DB
  const [loading, setLoading]         = useState(true)

  // Generation state
  const [genStep, setGenStep]             = useState<GenStep>('idle')
  const [genCurriculum, setGenCurriculum] = useState('quebec')
  const [genStatus, setGenStatus]         = useState('')
  const [genError, setGenError]           = useState('')
  const [genProgress, setGenProgress]     = useState(0)

  // Lesson creation
  const [creatingLecon, setCreatingLecon] = useState<string | null>(null)
  const [expandedUnite, setExpandedUnite] = useState<number | null>(0)

  const supabase = createClient()
  const router   = useRouter()

  // ─── Init ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await supabase.from('utilisateurs').select('*').eq('user_id', session.user.id).single()
      setProfil(p)
      const { data: cls } = await supabase.from('classes').select('*').eq('enseignant_id', p?.id).order('created_at', { ascending: false })
      const list = cls || []
      setClasses(list)
      if (list.length > 0) {
        setClasseActive(list[0].id)
        await loadClasseData(list[0].id)
      }
      setLoading(false)
    }
    init()
  }, [])

  const loadClasseData = async (classeId: string) => {
    const [progRes, leconRes] = await Promise.all([
      supabase.from('programme_annuel').select('*').eq('classe_id', classeId).order('created_at', { ascending: false }),
      supabase.from('lecons').select('id, titre, statut').eq('classe_id', classeId),
    ])
    setProgrammes(progRes.data || [])
    setLecons(leconRes.data || [])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const chargerClasse = async (classeId: string) => {
    setClasseActive(classeId)
    setGenStep('idle')
    setGenError('')
    await loadClasseData(classeId)
  }

  // ─── Curriculum generation ────────────────────────────────────────────────

  const handleGenerer = async () => {
    const classe = classes.find(c => c.id === classeActive)
    if (!classe) return
    setGenStep('loading')
    setGenError('')
    setGenProgress(10)
    setGenStatus('Connexion à l\'IA...')

    const steps = [
      { pct: 20, msg: 'Analyse du curriculum officiel...' },
      { pct: 40, msg: 'Structuration des unités thématiques...' },
      { pct: 60, msg: 'Génération des séquences de leçons...' },
      { pct: 80, msg: 'Alignement sur les objectifs du programme...' },
    ]
    steps.forEach(({ pct, msg }, i) =>
      setTimeout(() => { setGenProgress(pct); setGenStatus(msg) }, (i + 1) * 900)
    )

    try {
      const res = await fetch('/api/ia/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classe_id: classeActive,
          curriculum_officiel: genCurriculum,
          matiere: classe.matiere,
          niveau: classe.niveau,
          nb_semaines: 36,
          langue: classe.langue || profil?.langue || 'fr',
        }),
      })
      const data = await res.json()

      if (data.success) {
        setGenProgress(100)
        setGenStatus('Programme généré avec succès !')
        await loadClasseData(classeActive)
        setGenStep('done')
        setExpandedUnite(0)
      } else {
        setGenError(data.error || 'Erreur lors de la génération')
        setGenStep('options')
      }
    } catch {
      setGenError('Impossible de contacter l\'IA. Vérifiez ANTHROPIC_API_KEY dans .env.local')
      setGenStep('options')
    }
  }

  // ─── Lesson creation + navigation ─────────────────────────────────────────

  const leconExists = (titre: string) =>
    lecons.find(l => l.titre.trim().toLowerCase() === titre.trim().toLowerCase())

  const handleOuvrirLecon = async (leconPlan: any) => {
    const key = leconPlan.titre
    setCreatingLecon(key)

    // Check if already created
    const existing = leconExists(leconPlan.titre)
    if (existing) {
      router.push(`/dashboard/classes/${classeActive}/lecons/${existing.id}`)
      return
    }

    // Create it
    const { data } = await supabase.from('lecons').insert({
      classe_id: classeActive,
      titre: leconPlan.titre,
      duree_minutes: leconPlan.duree_minutes || 75,
      statut: 'brouillon',
      contenu_json: { intention: leconPlan.sujet || '' },
    }).select().single()

    setCreatingLecon(null)
    if (data) router.push(`/dashboard/classes/${classeActive}/lecons/${data.id}`)
  }

  const handleCreerToutesLecons = async (unite: any) => {
    for (const leconPlan of unite.lecons || []) {
      if (!leconExists(leconPlan.titre)) {
        await supabase.from('lecons').insert({
          classe_id: classeActive,
          titre: leconPlan.titre,
          duree_minutes: leconPlan.duree_minutes || 75,
          statut: 'brouillon',
          contenu_json: { intention: leconPlan.sujet || '' },
        })
      }
    }
    await loadClasseData(classeActive)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return <LoadingScreen />

  const programme    = programmes[0]
  const unites       = programme?.contenu_json?.unites || []
  const classeActive_ = classes.find(c => c.id === classeActive)

  const totalLeconsPlan = unites.reduce((a: number, u: any) => a + (u.lecons?.length || 0), 0)
  const leconsCreees    = unites.reduce((a: number, u: any) =>
    a + (u.lecons || []).filter((l: any) => leconExists(l.titre)).length, 0)

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/planification" onLogout={handleLogout} />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Planification annuelle</div>
            <div className="topbar-sub">Curriculum · Séquences · Leçons</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {classeActive && programme && (
              <button onClick={() => { setGenStep('options'); setGenError('') }}
                style={{ padding: '7px 14px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#A78BFA', cursor: 'pointer' }}>
                ↺ Regénérer
              </button>
            )}
            {classeActive && !programme && (
              <button onClick={() => { setGenStep('options'); setGenError('') }}
                style={{ padding: '7px 18px', background: 'linear-gradient(135deg, #6B3FA0, #4F46E5)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(107,63,160,0.4)' }}>
                ✦ Générer curriculum
              </button>
            )}
          </div>
        </div>

        <div className="page-content fade-in">
          {classes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
              <div style={{ fontSize: '48px', marginBottom: '14px' }}>📋</div>
              <h3 style={{ marginBottom: '8px' }}>Aucune classe</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>Crée une classe pour commencer la planification</p>
              <button className="btn-primary" onClick={() => router.push('/dashboard/classes')}>Créer une classe</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>

              {/* ── Sélecteur de classes ── */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-4)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>
                  Mes classes
                </div>
                {classes.map(c => (
                  <div key={c.id} onClick={() => chargerClasse(c.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 6,
                      background: classeActive === c.id ? 'rgba(107,63,160,0.12)' : 'var(--card)',
                      border: `1px solid ${classeActive === c.id ? 'rgba(167,139,250,0.3)' : 'var(--border)'}`,
                      transition: 'all 0.15s' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: c.couleur || '#1B3F6E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                      {c.nom?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: classeActive === c.id ? '#A78BFA' : 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nom}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{c.niveau}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Zone principale ── */}
              <div>

                {/* ═══ GÉNÉRATION — panneau options ══════════════════════════ */}
                {genStep === 'options' && (
                  <div className="card fade-in" style={{ marginBottom: 20, background: 'linear-gradient(135deg, rgba(107,63,160,0.1), rgba(79,70,229,0.06))', border: '1px solid rgba(167,139,250,0.25)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 4 }}>✦ Générer le curriculum</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                          {classeActive_?.nom} · {classeActive_?.matiere} · {classeActive_?.niveau}
                        </div>
                      </div>
                      <button onClick={() => setGenStep('idle')} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-4)', cursor: 'pointer' }}>×</button>
                    </div>

                    {/* Profil de l'enseignant */}
                    <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, marginBottom: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Profil enseignant (auto-détecté)</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {[
                          { l: 'Matière', v: classeActive_?.matiere || profil?.matiere || '—' },
                          { l: 'Niveau',  v: classeActive_?.niveau  || profil?.niveau_enseignement || '—' },
                          { l: 'Élèves',  v: `${classeActive_?.nombre_eleves || 25}` },
                          { l: 'Langue',  v: classeActive_?.langue || profil?.langue || 'fr' },
                        ].map(x => (
                          <div key={x.l} style={{ padding: '5px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 99, fontSize: 11 }}>
                            <span style={{ color: 'var(--text-4)' }}>{x.l} : </span>
                            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{x.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sélecteur curriculum */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 10, letterSpacing: '0.5px' }}>Programme officiel de référence</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {CURRICULA.map(c => (
                          <label key={c.v} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: genCurriculum === c.v ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${genCurriculum === c.v ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}>
                            <input type="radio" name="curriculum" value={c.v} checked={genCurriculum === c.v} onChange={() => setGenCurriculum(c.v)} style={{ accentColor: '#A78BFA', width: 15, height: 15, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: genCurriculum === c.v ? '#A78BFA' : 'var(--text-2)', fontWeight: genCurriculum === c.v ? 600 : 400 }}>{c.l}</span>
                            {genCurriculum === c.v && <span style={{ marginLeft: 'auto', color: '#A78BFA', fontSize: 14 }}>✓</span>}
                          </label>
                        ))}
                      </div>
                    </div>

                    {genError && (
                      <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, fontSize: 12, color: '#F87171', marginBottom: 14 }}>
                        ⚠ {genError}
                      </div>
                    )}

                    <button onClick={handleGenerer}
                      style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #6B3FA0, #4F46E5)', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 24px rgba(107,63,160,0.4)' }}>
                      ✦ Générer le programme annuel complet
                    </button>
                    <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                      L'IA va générer 5-7 unités avec 4-7 leçons chacune, alignées sur le curriculum sélectionné.
                    </div>
                  </div>
                )}

                {/* ═══ GÉNÉRATION — chargement ═══════════════════════════════ */}
                {genStep === 'loading' && (
                  <div className="card fade-in" style={{ marginBottom: 20, textAlign: 'center', padding: '48px 32px', background: 'linear-gradient(135deg, rgba(107,63,160,0.1), rgba(79,70,229,0.06))', border: '1px solid rgba(167,139,250,0.25)' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 24px', background: 'linear-gradient(135deg, #6B3FA0, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: '0 0 48px rgba(107,63,160,0.6)', animation: 'pulse 1.5s ease-in-out infinite' }}>✦</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 8 }}>Génération en cours...</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>{genStatus}</div>
                    <div style={{ maxWidth: 400, margin: '0 auto', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${genProgress}%`, background: 'linear-gradient(90deg, #6B3FA0, #A78BFA)', borderRadius: 99, transition: 'width 0.8s ease' }} />
                    </div>
                    <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>{genProgress}%</div>
                    <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 48px rgba(107,63,160,0.6)}50%{box-shadow:0 0 72px rgba(107,63,160,0.9)}}`}</style>
                  </div>
                )}

                {/* ═══ PAS DE PROGRAMME — invite ════════════════════════════ */}
                {genStep === 'idle' && !programme && (
                  <div className="card" style={{ textAlign: 'center', padding: '56px 32px', background: 'linear-gradient(135deg, rgba(107,63,160,0.06), rgba(79,70,229,0.04))', border: '1px solid rgba(167,139,250,0.15)' }}>
                    <div style={{ fontSize: '52px', marginBottom: 18 }}>📋</div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-1)' }}>
                      Aucun programme pour {classeActive_?.nom}
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 28, maxWidth: 480, margin: '0 auto 28px' }}>
                      Génère le curriculum officiel en un clic — l'IA structure automatiquement ton programme annuel en séquences et leçons, aligné sur le programme de {classeActive_?.province || 'ta province'}.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 420, margin: '0 auto 28px' }}>
                      {[
                        { icon: '📚', t: '5 à 7 unités', s: 'structurées par thème' },
                        { icon: '📄', t: '30–40 leçons', s: 'prêtes à enseigner' },
                        { icon: '🎯', t: 'Objectifs officiels', s: 'alignés sur le curriculum' },
                        { icon: '⏱', t: 'Durées estimées', s: 'par leçon (75 min par défaut)' },
                      ].map((x, i) => (
                        <div key={i} style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start', textAlign: 'left' }}>
                          <span style={{ fontSize: 22, flexShrink: 0 }}>{x.icon}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{x.t}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{x.s}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => { setGenStep('options'); setGenError('') }}
                      style={{ padding: '14px 48px', background: 'linear-gradient(135deg, #6B3FA0, #4F46E5)', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 32px rgba(107,63,160,0.45)' }}>
                      ✦ Générer le curriculum officiel
                    </button>
                  </div>
                )}

                {/* ═══ PROGRAMME EXISTANT ═══════════════════════════════════ */}
                {programme && genStep !== 'loading' && (
                  <div>
                    {/* Header programme */}
                    <div className="card" style={{ marginBottom: 16, background: 'rgba(27,63,110,0.12)', border: '1px solid rgba(96,165,250,0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#60A5FA', marginBottom: 4 }}>{programme.titre}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
                            {programme.nb_semaines} sem. · {unites.length} unités · {totalLeconsPlan} leçons planifiées
                            {programme.contenu_json?.source_curriculum && (
                              <span style={{ marginLeft: 10, padding: '2px 8px', background: 'rgba(96,165,250,0.1)', color: '#60A5FA', borderRadius: 99, fontSize: 10, fontWeight: 600 }}>
                                {CURRICULA.find(c => c.v === programme.contenu_json.source_curriculum)?.l || programme.contenu_json.source_curriculum}
                              </span>
                            )}
                          </div>
                          {/* Barre de progression */}
                          <div style={{ maxWidth: 360 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                              <span style={{ fontSize: 10, color: 'var(--text-4)' }}>Leçons créées</span>
                              <span style={{ fontSize: 10, color: '#60A5FA', fontWeight: 600 }}>{leconsCreees} / {totalLeconsPlan}</span>
                            </div>
                            <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${totalLeconsPlan ? (leconsCreees / totalLeconsPlan) * 100 : 0}%`, background: 'linear-gradient(90deg, #60A5FA, #A78BFA)', borderRadius: 99, transition: 'width 0.5s' }} />
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <span style={{ padding: '3px 10px', background: 'rgba(52,211,153,0.1)', color: '#34D399', borderRadius: 99, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>✦ Généré par IA</span>
                          <button onClick={() => router.push(`/dashboard/classes/${classeActive}`)} className="btn-ghost btn-sm">Dossier →</button>
                        </div>
                      </div>
                    </div>

                    {/* ── Unités et leçons ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {unites.map((unite: any, i: number) => {
                        const open = expandedUnite === i
                        const nbCreees = (unite.lecons || []).filter((l: any) => leconExists(l.titre)).length
                        const nbTotal  = unite.lecons?.length || 0

                        return (
                          <div key={i} className="card" style={{ padding: 0, overflow: 'hidden', border: `1px solid ${open ? (classeActive_?.couleur + '40' || 'rgba(167,139,250,0.2)') : 'var(--border)'}`, transition: 'border-color 0.2s' }}>

                            {/* Header unité — cliquable */}
                            <div onClick={() => setExpandedUnite(open ? null : i)}
                              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', cursor: 'pointer', background: open ? `${classeActive_?.couleur || '#1B3F6E'}12` : 'transparent', transition: 'background 0.2s', userSelect: 'none' }}>
                              <div style={{ width: 34, height: 34, borderRadius: 9, background: classeActive_?.couleur || '#1B3F6E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                                {unite.numero}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{unite.titre}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>
                                  Sem. {unite.semaine_debut}–{unite.semaine_fin} · {nbTotal} leçons
                                  {unite.theme && ` · ${unite.theme}`}
                                </div>
                              </div>
                              {/* Mini progress bar */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${nbTotal ? (nbCreees / nbTotal) * 100 : 0}%`, background: classeActive_?.couleur || '#60A5FA', borderRadius: 99 }} />
                                </div>
                                <span style={{ fontSize: 10, color: 'var(--text-4)', whiteSpace: 'nowrap' }}>{nbCreees}/{nbTotal}</span>
                                <span style={{ fontSize: 14, color: 'var(--text-4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
                              </div>
                            </div>

                            {/* Contenu déplié */}
                            {open && (
                              <div style={{ borderTop: '1px solid var(--border)' }}>

                                {/* Objectifs */}
                                {(unite.objectifs || []).length > 0 && (
                                  <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)' }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', marginRight: 4, alignSelf: 'center' }}>OBJECTIFS :</span>
                                    {unite.objectifs.slice(0, 4).map((obj: string, j: number) => (
                                      <span key={j} style={{ fontSize: 11, padding: '3px 9px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-2)', borderRadius: 99, border: '1px solid var(--border)' }}>{obj}</span>
                                    ))}
                                  </div>
                                )}

                                {/* Bouton créer toutes les leçons */}
                                <div style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.015)' }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                    {nbTotal} leçons · {nbCreees} créées
                                  </span>
                                  {nbCreees < nbTotal && (
                                    <button onClick={() => handleCreerToutesLecons(unite)}
                                      style={{ padding: '5px 12px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#60A5FA', cursor: 'pointer' }}>
                                      + Créer toutes les leçons
                                    </button>
                                  )}
                                </div>

                                {/* Liste des leçons */}
                                <div style={{ padding: '8px 12px 12px' }}>
                                  {(unite.lecons || []).map((leconPlan: any, k: number) => {
                                    const dbLecon  = leconExists(leconPlan.titre)
                                    const statut   = dbLecon ? STATUT_LABEL[dbLecon.statut] : null
                                    const creating = creatingLecon === leconPlan.titre

                                    return (
                                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, marginBottom: 4,
                                        background: dbLecon ? 'rgba(52,211,153,0.04)' : 'rgba(255,255,255,0.025)',
                                        border: `1px solid ${dbLecon ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)'}`,
                                        transition: 'all 0.15s' }}>

                                        {/* Numéro */}
                                        <div style={{ width: 26, height: 26, borderRadius: 6, background: dbLecon ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: dbLecon ? '#34D399' : 'var(--text-4)', flexShrink: 0 }}>
                                          {dbLecon ? '✓' : leconPlan.numero}
                                        </div>

                                        {/* Titre + info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {leconPlan.titre}
                                          </div>
                                          {leconPlan.sujet && (
                                            <div style={{ fontSize: 11, color: 'var(--text-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {leconPlan.sujet}
                                            </div>
                                          )}
                                        </div>

                                        {/* Durée + type */}
                                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{leconPlan.duree_minutes || 75} min</span>
                                          {leconPlan.type && (
                                            <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, color: 'var(--text-4)', textTransform: 'capitalize' }}>
                                              {leconPlan.type}
                                            </span>
                                          )}
                                        </div>

                                        {/* Statut badge */}
                                        {statut && (
                                          <span style={{ padding: '2px 8px', background: statut.bg, color: statut.color, borderRadius: 99, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                                            {statut.label}
                                          </span>
                                        )}

                                        {/* Action button */}
                                        <button
                                          onClick={() => handleOuvrirLecon(leconPlan)}
                                          disabled={creating}
                                          style={{ padding: '6px 14px', borderRadius: 7, border: 'none', fontSize: 11, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', flexShrink: 0, transition: 'all 0.15s', whiteSpace: 'nowrap',
                                            background: dbLecon
                                              ? 'rgba(96,165,250,0.12)'
                                              : 'linear-gradient(135deg, #6B3FA0, #4F46E5)',
                                            color: dbLecon ? '#60A5FA' : 'white',
                                            opacity: creating ? 0.6 : 1,
                                            boxShadow: dbLecon ? 'none' : '0 3px 12px rgba(107,63,160,0.3)',
                                          }}>
                                          {creating ? '⟳' : dbLecon ? '→ Ouvrir' : '✦ Commencer'}
                                        </button>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 10 }}>
                      <button onClick={() => { setGenStep('options'); setGenError('') }}
                        style={{ padding: '8px 18px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#A78BFA', cursor: 'pointer' }}>
                        ↺ Regénérer le curriculum
                      </button>
                      <button onClick={() => router.push(`/dashboard/classes/${classeActive}`)}
                        style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer' }}>
                        Voir le dossier de classe →
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
