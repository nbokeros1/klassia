'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'
import { useAuth } from '@/lib/hooks/useAuth'
import { useForfait } from '@/lib/hooks/useForfait'
import type { ForfaitType } from '@/lib/types/database'

// ─── Timer presets (minutes) ──────────────────────────────────────────────────
const TIMER_PRESETS = [5, 10, 15, 20, 25, 30]

// ─── Tuile helper ─────────────────────────────────────────────────────────────
function Tile({ children, accent = '#60A5FA', onClick }: {
  children: React.ReactNode
  accent?: string
  onClick?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1.5px solid ${hovered ? `${accent}44` : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 16, padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
        transform: hovered && onClick ? 'translateY(-3px)' : 'none',
        boxShadow: hovered && onClick ? `0 12px 32px ${accent}18` : 'none',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
      {children}
    </div>
  )
}

function TileTitle({ icon, title, badge }: { icon: string; title: string; badge?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{title}</span>
      </div>
      {badge}
    </div>
  )
}

function ProBadge() {
  return (
    <span style={{ padding: '2px 8px', background: 'rgba(167,139,250,0.2)', color: '#A78BFA', borderRadius: 99, fontSize: 9, fontWeight: 700, letterSpacing: '0.5px' }}>
      Pro+
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OutilsPage() {
  const { profil, loading: authLoading, logout } = useAuth()
  const { peutUtiliser, forfaitRequis } = useForfait((profil?.forfait || 'gratuit') as ForfaitType)
  const [classes, setClasses]             = useState<any[]>([])
  const [dataLoading, setDataLoading]     = useState(true)
  const [activeSondages, setActiveSondages] = useState(0)
  const [nbQuiz,         setNbQuiz]         = useState(0)

  // Timer
  const [timerDuration,  setTimerDuration]  = useState(0)
  const [timerRemaining, setTimerRemaining] = useState(0)
  const [timerRunning,   setTimerRunning]   = useState(false)
  const [timerFullscreen, setTimerFullscreen] = useState(false)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // TBI projection
  const [projClasse,  setProjClasse]  = useState('')
  const [projLecons,  setProjLecons]  = useState<any[]>([])
  const [projLecon,   setProjLecon]   = useState('')
  const [projLoading, setProjLoading] = useState(false)

  const supabase = createClient()
  const router   = useRouter()

  // ── Data fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profil) return
    const load = async () => {
      const { data: cls } = await supabase
        .from('classes').select('id,nom,niveau,matiere,couleur')
        .eq('enseignant_id', profil.id).order('created_at', { ascending: false })
      const list = cls || []
      setClasses(list)
      if (list[0]) setProjClasse(list[0].id)

      const { data: sondages } = await supabase
        .from('sondages').select('id').eq('enseignant_id', profil.id).eq('statut', 'ouvert')
      setActiveSondages((sondages || []).length)
      const { count: qCount } = await supabase
        .from('quiz').select('*', { count: 'exact', head: true }).eq('enseignant_id', profil.id)
      setNbQuiz(qCount || 0)
      setDataLoading(false)
    }
    load()
  }, [profil])

  // ── Leçons when projection class changes ───────────────────────────────────
  useEffect(() => {
    if (!projClasse) { setProjLecons([]); setProjLecon(''); return }
    const fetch = async () => {
      setProjLoading(true)
      const { data } = await supabase
        .from('lecons').select('id,titre,statut')
        .eq('classe_id', projClasse).order('updated_at', { ascending: false }).limit(20)
      const list = data || []
      setProjLecons(list)
      if (list[0]) setProjLecon(list[0].id)
      setProjLoading(false)
    }
    fetch()
  }, [projClasse])

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRunning && timerRemaining > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerRemaining(r => {
          if (r <= 1) { setTimerRunning(false); return 0 }
          return r - 1
        })
      }, 1000)
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current) }
  }, [timerRunning])

  const startTimer = useCallback((mins: number) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    const secs = mins * 60
    setTimerDuration(secs)
    setTimerRemaining(secs)
    setTimerRunning(true)
  }, [])

  const timerMins = Math.floor(timerRemaining / 60).toString().padStart(2, '0')
  const timerSecs = (timerRemaining % 60).toString().padStart(2, '0')
  const timerProgress = timerDuration > 0 ? ((timerDuration - timerRemaining) / timerDuration) * 100 : 0
  const timerExpired  = timerDuration > 0 && timerRemaining === 0
  const timerActive   = timerDuration > 0

  if (authLoading || dataLoading) return <LoadingScreen />

  const selectedClasse = classes.find(c => c.id === projClasse)

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/outils" onLogout={logout} />

      {/* Plein écran timer */}
      {timerFullscreen && (
        <div style={{ position: 'fixed', inset: 0, background: '#050D1A', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          <div style={{ fontSize: 96, fontWeight: 800, color: timerExpired ? '#F87171' : '#A78BFA', fontVariantNumeric: 'tabular-nums', letterSpacing: -2 }}>
            {timerMins}:{timerSecs}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => timerRunning ? setTimerRunning(false) : setTimerRunning(true)}
              style={{ padding: '12px 28px', background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.4)', borderRadius: 10, color: '#A78BFA', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              {timerRunning ? '⏸ Pause' : '▶ Reprendre'}
            </button>
            <button onClick={() => { setTimerRunning(false); setTimerRemaining(timerDuration) }}
              style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--text-3)', fontSize: 14, cursor: 'pointer' }}>
              ↺ Reset
            </button>
            <button onClick={() => setTimerFullscreen(false)}
              style={{ padding: '12px 20px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, color: '#F87171', fontSize: 14, cursor: 'pointer' }}>
              ✕ Quitter
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {TIMER_PRESETS.map(m => (
              <button key={m} onClick={() => startTimer(m)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text-3)', fontSize: 13, cursor: 'pointer' }}>
                {m} min
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Outils du prof</div>
            <div className="topbar-sub">Timer · Sondages · TBI · Tableau blanc</div>
          </div>
        </div>

        <div className="page-content fade-in">
          <style>{`
            @media (max-width: 900px) { .outils-grid { grid-template-columns: 1fr 1fr !important; } }
            @media (max-width: 600px) { .outils-grid { grid-template-columns: 1fr !important; } }
          `}</style>
          <div className="outils-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

            {/* ── Tuile 1 — Timer ─────────────────────────────────────────── */}
            <Tile accent="#A78BFA">
              <TileTitle icon="⏱️" title="Timer" />

              {/* Affichage */}
              <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
                <div style={{ fontSize: timerActive ? 48 : 36, fontWeight: 800, letterSpacing: -1, color: timerExpired ? '#F87171' : timerActive ? '#A78BFA' : 'var(--text-3)', fontVariantNumeric: 'tabular-nums', transition: 'color 0.3s' }}>
                  {timerActive ? `${timerMins}:${timerSecs}` : '– – : – –'}
                </div>
                {timerExpired && <div style={{ fontSize: 12, color: '#F87171', marginTop: 4, fontWeight: 600 }}>Temps écoulé !</div>}
                {timerActive && !timerExpired && (
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${timerProgress}%`, background: 'linear-gradient(90deg, #A78BFA, #6B3FA0)', borderRadius: 99, transition: 'width 1s linear' }} />
                  </div>
                )}
              </div>

              {/* Presets */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
                {TIMER_PRESETS.map(m => (
                  <button key={m} onClick={() => startTimer(m)}
                    style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${timerDuration === m * 60 && timerActive ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.1)'}`, background: timerDuration === m * 60 && timerActive ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)', color: timerDuration === m * 60 && timerActive ? '#A78BFA' : 'var(--text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {m} min
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                {timerActive && (
                  <>
                    <button onClick={() => setTimerRunning(r => !r)}
                      style={{ flex: 1, padding: '8px', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 8, color: '#A78BFA', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {timerRunning ? '⏸ Pause' : '▶ Reprendre'}
                    </button>
                    <button onClick={() => { setTimerRunning(false); setTimerRemaining(timerDuration) }}
                      style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text-4)', fontSize: 12, cursor: 'pointer' }}>
                      ↺
                    </button>
                  </>
                )}
                <button onClick={() => setTimerFullscreen(true)}
                  style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--text-4)', fontSize: 12, cursor: 'pointer' }}
                  title="Plein écran">
                  ⛶
                </button>
              </div>
            </Tile>

            {/* ── Tuile 2 — Sondage QR ────────────────────────────────────── */}
            <Tile accent="#34D399" onClick={() => router.push('/dashboard/sondage')}>
              <TileTitle icon="📲" title="Sondage QR"
                badge={activeSondages > 0
                  ? <span style={{ padding: '2px 8px', background: 'rgba(52,211,153,0.2)', color: '#34D399', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>{activeSondages} actif{activeSondages > 1 ? 's' : ''}</span>
                  : undefined} />
              <div style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.6 }}>
                Créez un sondage et affichez le QR code pour que vos élèves répondent depuis leur téléphone.
              </div>
              <div style={{ fontSize: 12, color: '#34D399', fontWeight: 600, marginTop: 'auto' }}>
                Ouvrir → Sondages
              </div>
            </Tile>

            {/* ── Tuile 3 — Quiz live ─────────────────────────────────────── */}
            <Tile accent="#A78BFA" onClick={() => router.push('/dashboard/outils/quiz')}>
              <TileTitle icon="🎮" title="Quiz live"
                badge={nbQuiz > 0
                  ? <span style={{ padding: '2px 8px', background: 'rgba(167,139,250,0.2)', color: '#A78BFA', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>{nbQuiz} quiz</span>
                  : undefined} />
              <div style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.6 }}>
                Créez et lancez des quiz interactifs en temps réel avec tableau de scores et participation instantanée.
              </div>
              <div style={{ fontSize: 12, color: '#A78BFA', fontWeight: 600, marginTop: 'auto' }}>
                {nbQuiz === 0 ? 'Créer mon premier quiz →' : 'Gérer mes quiz →'}
              </div>
            </Tile>

            {/* ── Tuile 4 — Projection TBI ────────────────────────────────── */}
            <Tile accent="#60A5FA">
              <TileTitle icon="📺" title="Projection TBI" />
              <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 4 }}>
                Sélectionnez une leçon et lancez le mode présentation plein écran.
              </div>

              {/* Sélecteur classe */}
              <select value={projClasse} onChange={e => setProjClasse(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: 'var(--text-1)', outline: 'none' }}>
                <option value="">Choisir une classe...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.nom} — {c.niveau}</option>)}
              </select>

              {/* Sélecteur leçon */}
              {projClasse && (
                <select value={projLecon} onChange={e => setProjLecon(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: 'var(--text-1)', outline: 'none' }}>
                  <option value="">Choisir une leçon...</option>
                  {projLecons.map(l => <option key={l.id} value={l.id}>{l.titre}</option>)}
                </select>
              )}

              <button
                disabled={!projClasse || !projLecon || projLoading}
                onClick={() => router.push(`/dashboard/classes/${projClasse}/lecons/${projLecon}/presenter`)}
                style={{ padding: '9px', background: !projClasse || !projLecon ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #1B3F6E, #2563EB)', color: !projClasse || !projLecon ? 'rgba(255,255,255,0.25)' : 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: !projClasse || !projLecon ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
                {projLoading ? '...' : '▶ Lancer le mode TBI'}
              </button>
            </Tile>

            {/* ── Tuile 5 — Tableau blanc ──────────────────────────────────── */}
            <Tile accent="#22D3EE" onClick={() => router.push('/dashboard/enseigner')}>
              <TileTitle icon="🖊️" title="Tableau blanc" />
              <div style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.6 }}>
                Canvas numérique pour annoter, dessiner et partager en temps réel avec votre classe.
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)', borderRadius: 8, fontSize: 11, color: 'rgba(34,211,238,0.7)' }}>
                Disponible dans le Mode Classe · Onglet Tableau blanc
              </div>
              <div style={{ fontSize: 12, color: '#22D3EE', fontWeight: 600, marginTop: 'auto' }}>
                Ouvrir → Mode Classe
              </div>
            </Tile>

            {/* ── Tuile 6 — Podium Quiz ────────────────────────────────────── */}
            <Tile accent="#F59E0B">
              <TileTitle icon="🏆" title="Podium Quiz" badge={<ProBadge />} />
              <div style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.6 }}>
                Affichez le classement en direct après un Quiz live — gamification et engagement maximum.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', padding: '8px 0' }}>
                {[
                  { place: '🥇', name: 'Emma L.', pts: 980 },
                  { place: '🥈', name: 'Liam T.', pts: 865 },
                  { place: '🥉', name: 'Sofia M.', pts: 740 },
                ].map((p, i) => (
                  <div key={i} style={{ textAlign: 'center', opacity: 0.45 }}>
                    <div style={{ fontSize: 18 }}>{p.place}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: '#F59E0B', fontWeight: 700 }}>{p.pts} pts</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                Disponible en Pro+ · Lié au Quiz live
              </div>
            </Tile>

          </div>
        </div>
      </div>
    </div>
  )
}
