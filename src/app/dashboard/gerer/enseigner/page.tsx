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

// ─── Timer ────────────────────────────────────────────────────────────────────

function Timer({ phaseLabel }: { phaseLabel?: string }) {
  const [preset, setPreset] = useState(0)
  const [remaining, setRemaining] = useState(0)
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
        const { data: f } = await supabase.from('fichiers_dossier').select('*').eq('enseignant_id', profil?.id).order('created_at', { ascending: false }).limit(10)
        setFichiersLecon(f || [])
      }
    }
    if (profil) load()
  }, [classeId, profil])

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

          {/* ── Section 1 : Leçon active ────────────────────────────────── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12 }}>📚 Leçon active</div>
            {!leconDuJour ? (
              <div style={{ padding: '28px 24px', border: '1.5px dashed rgba(255,255,255,0.1)', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📭</div>
                <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 6 }}>Aucune leçon planifiée aujourd&apos;hui</div>
                <button onClick={() => router.push(`/dashboard/gerer/preparer?classe=${classeId}`)}
                  style={{ padding: '8px 18px', borderRadius: 9, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', color: '#A78BFA', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
                  → Planifier une leçon
                </button>
              </div>
            ) : (
              <div className="lecon-card">
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>{leconDuJour.titre}</div>
                      {leconDuJour.sujet && <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{leconDuJour.sujet}</div>}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', background: leconDuJour.statut === 'prete' ? 'rgba(52,211,153,0.15)' : 'rgba(251,195,74,0.15)', color: leconDuJour.statut === 'prete' ? '#34D399' : '#FBC34A', borderRadius: 99, flexShrink: 0 }}>
                      {leconDuJour.statut === 'prete' ? 'Prête' : 'En cours'}
                    </span>
                  </div>
                </div>
                <div style={{ padding: '16px 24px', display: 'flex', gap: 10 }}>
                  <button onClick={() => router.push(`/dashboard/classes/${classeId}/lecons/${leconDuJour.id}/presenter`)}
                    style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#6B3FA0,#4F46E5)', border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    ▶ Lancer la leçon
                  </button>
                  <button onClick={() => router.push(`/dashboard/classes/${classeId}/lecons/${leconDuJour.id}`)}
                    style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer' }}>
                    📄 Voir la leçon
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Section 2 : Ressources de la leçon ─────────────────────── */}
          {leconDuJour && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12 }}>📎 Ressources de la leçon</div>
              {fichiersLecon.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '12px 0' }}>Aucune ressource attachée</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {fichiersLecon.map((f: any) => (
                    <div key={f.id} className="fichier-pill">
                      <span style={{ fontSize: 14 }}>📄</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{f.nom}</span>
                      {f.url && <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--text-4)' }}>📥</a>}
                    </div>
                  ))}
                </div>
              )}
              <button style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 12, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-4)'}>
                ➕ Ajouter une ressource
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

                {toolActive === 'timer' && (
                  <Timer phaseLabel={leconDuJour ? 'Phase AVANT → PENDANT → APRÈS' : undefined} />
                )}

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
