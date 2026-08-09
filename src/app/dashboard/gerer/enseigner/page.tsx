'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import LoadingScreen from '@/components/LoadingScreen'
import { useForfait } from '@/lib/hooks/useForfait'
import type { ForfaitType } from '@/lib/types/database'
import OutilCard from '@/components/ui/OutilCard'

// ─── Calcul durée leçon depuis contenu_json ──────────────────────────────────

function calcDureeLecon(contenuJson: any): number {
  if (!contenuJson) return 0
  const parseMin = (v: any): number => {
    if (typeof v === 'number') return Math.max(0, Math.floor(v))
    if (typeof v === 'string') {
      const m = v.match(/\d+/)
      return m ? Math.max(0, parseInt(m[0], 10)) : 0
    }
    return 0
  }
  const avant   = parseMin(contenuJson.avant_duree)
  const pendant = parseMin(contenuJson.pendant_duree)
  const apres   = parseMin(contenuJson.apres_duree)
  const total   = avant + pendant + apres
  if (total > 0) return total
  return parseMin(contenuJson.duree ?? contenuJson.duree_totale)
}

// ─── Timer ────────────────────────────────────────────────────────────────────

function Timer({ phaseLabel, initialSeconds }: { phaseLabel?: string; initialSeconds?: number }) {
  const initSecs = initialSeconds && initialSeconds > 0 ? initialSeconds : 0
  const [preset, setPreset] = useState(initSecs)
  const [remaining, setRemaining] = useState(initSecs)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running || remaining <= 0) { if (remaining <= 0 && running) setRunning(false); return }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [running, remaining])

  const start = (secs: number) => { setPreset(secs); setRemaining(secs); setRunning(true) }
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <div style={{ textAlign: 'center' }}>
      {phaseLabel && <div style={{ fontSize: 10, color: 'var(--text-4)', marginBottom: 4 }}>{phaseLabel}</div>}
      <div style={{ fontSize: 36, fontWeight: 800, color: remaining > 0 && running ? '#34D399' : remaining === 0 && preset > 0 ? '#F87171' : 'var(--text-2)', fontVariantNumeric: 'tabular-nums', marginBottom: 8 }}>
        {mm}:{ss}
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 8 }}>
        {[5, 10, 15, 20, 30, 45].map(m => (
          <button key={m} onClick={() => start(m * 60)}
            style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${preset === m * 60 && running ? '#34D399' : 'var(--border)'}`, background: preset === m * 60 && running ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)', color: 'var(--text-3)', fontSize: 11, cursor: 'pointer' }}>
            {m}m
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        <button onClick={() => setRunning(r => !r)} disabled={remaining === 0 && preset === 0}
          style={{ padding: '6px 14px', borderRadius: 7, background: running ? 'rgba(251,195,74,0.1)' : 'rgba(52,211,153,0.1)', border: `1px solid ${running ? 'rgba(251,195,74,0.3)' : 'rgba(52,211,153,0.3)'}`, color: running ? '#FBC34A' : '#34D399', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {running ? '⏸ Pause' : '▶ Lancer'}
        </button>
        <button onClick={() => { setRunning(false); setRemaining(preset) }} style={{ padding: '6px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer' }}>
          ↺
        </button>
      </div>
    </div>
  )
}

// ─── Phase Section ────────────────────────────────────────────────────────────

function PhaseSection({ emoji, label, duree, color, accent, items }: {
  emoji: string; label: string; duree?: string; color: string; accent: string
  items: { title?: string; text: string }[]
}) {
  return (
    <div style={{ marginBottom: 10, borderRadius: 10, overflow: 'hidden', border: `1px solid ${accent}30` }}>
      <div style={{ padding: '9px 14px', background: color, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>{emoji}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: accent, letterSpacing: '0.06em' }}>{label}</span>
        {duree && <span style={{ fontSize: 11, color: accent, opacity: 0.7, marginLeft: 'auto' }}>{duree} min</span>}
      </div>
      <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.6)', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
        {items.map((item, i) => (
          <div key={i}>
            {item.title && <div style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 3 }}>{item.title}</div>}
            <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.65, whiteSpace: 'pre-wrap' as const }}>{item.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function EnseignerPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  const [profil,    setProfil]    = useState<any>(null)
  const [classes,   setClasses]   = useState<any[]>([])
  const [classeId,  setClasseId]  = useState('')
  const [leconDuJour, setLeconDuJour] = useState<any | null>(null)
  const [fichiersLecon, setFichiersLecon] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [toolActive, setToolActive] = useState<string | null>(null)
  const [sondageQ,  setSondageQ]  = useState('')
  const [sondageQR, setSondageQR] = useState(false)
  const [markingLoading, setMarkingLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [showPlan, setShowPlan] = useState(true)

  const { peutUtiliser } = useForfait((profil?.forfait || 'gratuit') as ForfaitType)

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await supabase.from('utilisateurs').select('*').eq('user_id', session.user.id).single()
      if (!p) return
      setProfil(p)
      const { data: cls } = await supabase.from('classes').select('*').eq('enseignant_id', p.id).order('created_at', { ascending: false })
      const list = cls || []
      setClasses(list)
      const initId = searchParams?.get('classe') || list[0]?.id || ''
      setClasseId(initId)
      setLoading(false)
    }
    init()
  }, [])

  // ── Leçon du jour ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!classeId) return
    const load = async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data: lec } = await supabase.from('lecons')
        .select('*').eq('classe_id', classeId)
        .or(`statut.eq.prete,statut.eq.en_cours`)
        .or(`date_prevue.eq.${today},date_prevue.is.null`)
        .order('numero').limit(1)
      const l = lec?.[0] || null
      setLeconDuJour(l)
      if (l) {
        // Charger les fichiers liés spécifiquement à cette leçon (via lecon_id)
        const { data: f } = await supabase
          .from('fichiers_dossier')
          .select('*')
          .eq('lecon_id', l.id)
          .order('created_at', { ascending: false })
          .limit(10)
        setFichiersLecon(f || [])
      } else {
        setFichiersLecon([])
      }
    }
    if (profil) load()
  }, [classeId, profil])

  // ── Auto-dismiss toast ────────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // ── Marquer la leçon comme enseignée ─────────────────────────────────────
  const handleMarquerEnseignee = async () => {
    if (!leconDuJour?.id || markingLoading) return
    setMarkingLoading(true)
    const { error } = await supabase
      .from('lecons')
      .update({ statut: 'enseignee', updated_at: new Date().toISOString() })
      .eq('id', leconDuJour.id)
    if (error) {
      setToast({ msg: 'Erreur lors de la mise à jour du statut.', ok: false })
    } else {
      setLeconDuJour((prev: any) => prev ? { ...prev, statut: 'enseignee' } : null)
      setToast({ msg: '✓ Leçon marquée comme enseignée. Le suivi et le tableau de bord ont été mis à jour.', ok: true })
    }
    setMarkingLoading(false)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (loading) return <LoadingScreen />

  const OUTILS = [
    { id: 'timer',    icon: '⏱️', label: 'Timer',        desc: 'Minuteur par phases',      locked: false  },
    { id: 'sondage',  icon: '📲', label: 'Sondage QR',   desc: 'Question + QR code',        locked: false  },
    { id: 'quiz',     icon: '🎮', label: 'Quiz Live',    desc: 'Quiz interactif',           locked: !peutUtiliser('quiz_live') },
    { id: 'tbi',      icon: '📺', label: 'Projection',   desc: 'TBI plein écran',           locked: false  },
    { id: 'tableau',  icon: '🖊️', label: 'Tableau blanc', desc: 'Canvas libre',             locked: false  },
    { id: 'nuage',    icon: '☁️', label: 'Nuage de mots', desc: 'Vocabulaire leçon',        locked: false  },
  ]

  return (
    <div className="app-layout">
      <style>{`
        .lecon-card { padding:0; border-radius:14px; border:1px solid var(--card-border-light); background:var(--card-bg-light); overflow:hidden; margin-bottom:20px; }
        .fichier-pill { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px; border:1px solid rgba(15,35,65,0.08); background:rgba(255,255,255,0.6); font-size:12px; color:var(--text-secondary); transition:background 0.12s; }
        .fichier-pill:hover { background:rgba(255,255,255,0.9); }
      `}</style>

      <Sidebar profil={profil} activeHref="/dashboard/gerer/enseigner" onLogout={handleLogout} />

      <div className="main-content">
        <Topbar
          classeActive={classes.find(c => c.id === classeId)?.nom}
          initiales={`${profil?.prenom?.[0] || ''}${profil?.nom?.[0] || ''}`.toUpperCase() || '?'}
          isFr={profil?.langue_interface !== 'en'}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 24px', borderBottom: '1px solid rgba(15,35,65,0.08)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>▶ Enseigner</span>
          <div style={{ flex: 1 }} />
          <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Classe :</label>
          <select value={classeId} onChange={e => setClasseId(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(15,35,65,0.1)', color: 'var(--text-primary)', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}>
            {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>

        <div className="page-content fade-in" style={{ maxWidth: 960 }}>

          {/* ── Toast feedback ─────────────────────────────────────────── */}
          {toast && (
            <div style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              zIndex: 9999, padding: '12px 20px', borderRadius: 10,
              background: toast.ok ? 'rgba(52,211,153,0.18)' : 'rgba(248,113,113,0.18)',
              border: `1px solid ${toast.ok ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'}`,
              color: toast.ok ? '#34D399' : '#F87171',
              fontSize: 13, fontWeight: 600, backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)', whiteSpace: 'nowrap',
            }}>
              {toast.msg}
            </div>
          )}

          {/* ── Section 1 : Leçon active ────────────────────────────────── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12 }}>📚 Leçon active</div>
            {!leconDuJour ? (
              <div style={{ padding: '28px 24px', border: '1.5px dashed rgba(255,255,255,0.1)', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📭</div>
                <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 6 }}>Aucune leçon planifiée aujourd&apos;hui</div>
                <button onClick={() => router.push(`/dashboard/gerer/preparer?classe_id=${classeId}`)}
                  style={{ padding: '8px 18px', borderRadius: 9, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', color: '#A78BFA', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
                  ✨ Préparer une leçon
                </button>
              </div>
            ) : (
              <div className="lecon-card">
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>{leconDuJour.titre}</div>
                      {leconDuJour.sujet && <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{leconDuJour.sujet}</div>}
                      {leconDuJour.type_document && (
                        <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 4 }}>
                          {leconDuJour.type_document === 'lecon_complete' ? 'Leçon complète' : 'Plan de leçon'} · Leçon #{leconDuJour.numero}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 10px',
                        background: leconDuJour.statut === 'enseignee' ? 'rgba(167,139,250,0.15)'
                                  : leconDuJour.statut === 'prete' ? 'rgba(52,211,153,0.15)'
                                  : 'rgba(251,195,74,0.15)',
                        color: leconDuJour.statut === 'enseignee' ? '#A78BFA'
                             : leconDuJour.statut === 'prete' ? '#34D399' : '#FBC34A',
                        borderRadius: 99, flexShrink: 0,
                      }}>
                        {leconDuJour.statut === 'enseignee' ? 'Enseignée ✓'
                         : leconDuJour.statut === 'prete' ? 'Prête' : 'En cours'}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '16px 24px', display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                  <button
                    onClick={() => router.push(`/dashboard/gerer/enseigner/${leconDuJour.id}`)}
                    style={{
                      padding: '10px 24px', borderRadius: 10, border: 'none',
                      background: 'linear-gradient(135deg, #6C5CE7, #8B5CF6)',
                      color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(108,92,231,0.35)',
                    }}>
                    🎯 Workspace Enseigner
                  </button>
                  <button onClick={() => router.push(`/dashboard/classes/${classeId}/lecons/${leconDuJour.id}/presenter`)}
                    style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#6B3FA0,#4F46E5)', border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    ▶ Lancer la leçon
                  </button>
                  <button onClick={() => router.push(`/dashboard/classes/${classeId}/lecons/${leconDuJour.id}`)}
                    style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer' }}>
                    📄 Voir
                  </button>
                  <button onClick={() => router.push(`/dashboard/classes/${classeId}`)}
                    style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer' }}>
                    📁 Classes
                  </button>
                  {leconDuJour.statut !== 'enseignee' && (
                    <button
                      onClick={handleMarquerEnseignee}
                      disabled={markingLoading}
                      style={{
                        padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                        cursor: markingLoading ? 'not-allowed' : 'pointer',
                        background: markingLoading ? 'rgba(167,139,250,0.06)' : 'rgba(167,139,250,0.12)',
                        border: '1px solid rgba(167,139,250,0.3)',
                        color: '#A78BFA', opacity: markingLoading ? 0.6 : 1,
                        transition: 'all 0.15s',
                      }}>
                      {markingLoading ? '…' : '✓ Marquer comme enseignée'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Section 1.5 : Déroulement pédagogique ───────────────────── */}
          {leconDuJour?.contenu_json && (
            leconDuJour.contenu_json.avant_amorce ||
            leconDuJour.contenu_json.pendant_modelisation ||
            leconDuJour.contenu_json.apres_cloture
          ) && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>📋 Déroulement pédagogique</div>
                <button
                  onClick={() => setShowPlan(p => !p)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 11, color: 'var(--text-4)', cursor: 'pointer', padding: 0 }}>
                  {showPlan ? '▲ Réduire' : '▼ Afficher'}
                </button>
              </div>
              {showPlan && (
                <>
                  {leconDuJour.contenu_json.intention && (
                    <div style={{ marginBottom: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(108,92,231,0.06)', border: '1px solid rgba(108,92,231,0.12)' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Intention pédagogique</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.6 }}>{leconDuJour.contenu_json.intention}</div>
                    </div>
                  )}
                  {leconDuJour.contenu_json.avant_amorce && (
                    <PhaseSection emoji="🚀" label="AVANT" duree={leconDuJour.contenu_json.avant_duree}
                      color="rgba(245,158,11,0.08)" accent="#F59E0B"
                      items={[{ text: leconDuJour.contenu_json.avant_amorce }]} />
                  )}
                  {(leconDuJour.contenu_json.pendant_modelisation || leconDuJour.contenu_json.pendant_pratique_guidee || leconDuJour.contenu_json.pendant_pratique_autonome) && (
                    <PhaseSection emoji="📚" label="PENDANT" duree={leconDuJour.contenu_json.pendant_duree}
                      color="rgba(34,197,94,0.07)" accent="#22C55E"
                      items={[
                        leconDuJour.contenu_json.pendant_modelisation
                          ? { title: 'Modélisation explicite', text: leconDuJour.contenu_json.pendant_modelisation } : null,
                        leconDuJour.contenu_json.pendant_pratique_guidee
                          ? { title: 'Pratique guidée', text: leconDuJour.contenu_json.pendant_pratique_guidee } : null,
                        leconDuJour.contenu_json.pendant_pratique_autonome
                          ? { title: 'Pratique autonome', text: leconDuJour.contenu_json.pendant_pratique_autonome } : null,
                      ].filter((x): x is { title: string; text: string } => x !== null)} />
                  )}
                  {(leconDuJour.contenu_json.apres_cloture || leconDuJour.contenu_json.apres_billet) && (
                    <PhaseSection emoji="🎯" label="APRÈS" duree={leconDuJour.contenu_json.apres_duree}
                      color="rgba(108,92,231,0.06)" accent="#6C5CE7"
                      items={[
                        leconDuJour.contenu_json.apres_cloture
                          ? { title: 'Clôture', text: leconDuJour.contenu_json.apres_cloture } : null,
                        leconDuJour.contenu_json.apres_billet
                          ? { title: 'Billet de sortie', text: leconDuJour.contenu_json.apres_billet } : null,
                      ].filter((x): x is { title: string; text: string } => x !== null)} />
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Section 2 : Ressources de la leçon ─────────────────────── */}
          {leconDuJour && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12 }}>📎 Ressources de la leçon</div>
              {fichiersLecon.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '12px 0' }}>Aucun document attaché à cette leçon</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {fichiersLecon.map((f: any) => (
                    <button
                      key={f.id}
                      onClick={() => router.push(`/dashboard/classes/${classeId}?fichier=${f.id}`)}
                      className="fichier-pill"
                      style={{ cursor: 'pointer', background: 'none', border: '1px solid rgba(15,35,65,0.08)', borderRadius: 8 }}>
                      <span style={{ fontSize: 14 }}>📄</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180, fontSize: 12, color: 'var(--text-secondary)' }}>{f.nom}</span>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => router.push(`/dashboard/gerer/preparer?classe_id=${classeId}`)}
                style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 12, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-4)'}>
                ✨ Préparer du contenu dans ScorgIA
              </button>
            </div>
          )}

          {/* ── Section 3 : Outils d'enseignement ──────────────────────── */}
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>🛠️ Outils d&apos;enseignement</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {OUTILS.map(outil => (
                <OutilCard
                  key={outil.id}
                  icone={outil.icon}
                  titre={outil.label}
                  description={outil.desc}
                  badge={outil.locked ? 'Pro+' : null}
                  active={toolActive === outil.id}
                  disabled={outil.locked}
                  onClick={() => setToolActive(t => t === outil.id ? null : outil.id)}
                />
              ))}
            </div>

            {/* Panel outil actif */}
            {toolActive && (
              <div style={{ marginTop: 16, padding: '20px 24px', borderRadius: 12, border: '1.5px solid rgba(167,139,250,0.25)', background: 'rgba(167,139,250,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
                    {OUTILS.find(o => o.id === toolActive)?.icon} {OUTILS.find(o => o.id === toolActive)?.label}
                  </div>
                  <button onClick={() => setToolActive(null)} style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 18, cursor: 'pointer' }}>✕</button>
                </div>

                {toolActive === 'timer' && (() => {
                  const totalMin = leconDuJour?.contenu_json ? calcDureeLecon(leconDuJour.contenu_json) : 0
                  return (
                    <>
                      {totalMin > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--text-4)', marginBottom: 8, textAlign: 'center' }}>
                          Durée de la leçon : {totalMin} min — préchargée
                        </div>
                      )}
                      <Timer
                        phaseLabel={leconDuJour ? 'Phase AVANT → PENDANT → APRÈS' : undefined}
                        initialSeconds={totalMin * 60}
                      />
                    </>
                  )
                })()}

                {toolActive === 'sondage' && (
                  <div style={{ maxWidth: 400 }}>
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label">Question rapide</label>
                      <input value={sondageQ} onChange={e => setSondageQ(e.target.value)} placeholder="Ex: Comment vous sentez-vous aujourd'hui ?" />
                    </div>
                    <button onClick={() => setSondageQR(true)} disabled={!sondageQ} className="btn-primary" style={{ fontSize: 13 }}>
                      Créer sondage →
                    </button>
                    {sondageQR && (
                      <div style={{ marginTop: 12, padding: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 10, textAlign: 'center' }}>
                        <div style={{ fontSize: 60, marginBottom: 8 }}>🔲</div>
                        <div style={{ fontSize: 12, color: 'var(--text-4)' }}>QR code généré — projetez-le</div>
                      </div>
                    )}
                  </div>
                )}

                {toolActive === 'tbi' && (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    {leconDuJour ? (
                      <button onClick={() => router.push(`/dashboard/classes/${classeId}/lecons/${leconDuJour.id}/presenter`)}
                        style={{ padding: '12px 32px', borderRadius: 10, background: 'linear-gradient(135deg,#6B3FA0,#4F46E5)', border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                        📺 Lancer en plein écran
                      </button>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text-4)' }}>Sélectionnez une leçon active pour projeter</div>
                    )}
                  </div>
                )}

                {toolActive === 'tableau' && (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <button onClick={() => router.push(`/dashboard/classes/${classeId}/lecons/${leconDuJour?.id || ''}/tableau`)}
                      style={{ padding: '12px 32px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-1)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                      🖊️ Ouvrir le tableau blanc
                    </button>
                  </div>
                )}

                {toolActive === 'nuage' && (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 12 }}>
                      {leconDuJour ? 'Vocabulaire extrait automatiquement du contenu de la leçon' : 'Sélectionnez une leçon active'}
                    </div>
                    {leconDuJour && (
                      <button style={{ padding: '10px 24px', borderRadius: 9, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: '#60A5FA', fontSize: 13, cursor: 'pointer' }}>
                        ☁️ Générer le nuage
                      </button>
                    )}
                  </div>
                )}

                {toolActive === 'quiz' && !peutUtiliser('quiz_live') && (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 12 }}>Quiz Live requiert le forfait Pro+</div>
                    <button onClick={() => router.push('/dashboard/forfaits')} style={{ padding: '8px 20px', borderRadius: 8, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', color: '#A78BFA', fontSize: 13, cursor: 'pointer' }}>
                      Voir les forfaits
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EnseignerPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <EnseignerPageInner />
    </Suspense>
  )
}
