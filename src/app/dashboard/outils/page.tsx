'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import LoadingScreen from '@/components/LoadingScreen'
import { useAuth } from '@/lib/hooks/useAuth'
import { useForfait } from '@/lib/hooks/useForfait'
import type { ForfaitType } from '@/lib/types/database'

// ─── Presets timer ────────────────────────────────────────────────────────────
const TIMER_PRESETS = [5, 10, 15, 20, 25, 30]

// ─── Carte outil générique ────────────────────────────────────────────────────
function OutilBlock({
  children,
  accent = 'var(--violet, #6C5CE7)',
  onClick,
}: {
  children: React.ReactNode
  accent?: string
  onClick?: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--card-bg-light, rgba(255,255,255,0.88))',
        backdropFilter: 'blur(var(--card-blur-light, 9px))',
        WebkitBackdropFilter: 'blur(var(--card-blur-light, 9px))',
        border: `1.5px solid ${hov && onClick ? accent + '66' : 'rgba(108,92,231,0.1)'}`,
        borderRadius: 'var(--radius-md, 16px)',
        padding: '22px 20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
        transform: hov && onClick ? 'translateY(-3px)' : 'none',
        boxShadow: hov && onClick
          ? `0 12px 32px rgba(108,92,231,0.14)`
          : '0 2px 10px rgba(15,35,65,0.05)',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 14,
        position: 'relative' as const,
      }}>
      {children}
    </div>
  )
}

function BlockHeader({ icon, title, badge }: { icon: string; title: string; badge?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--violet-soft, #EDE9FE)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #0F1B2D)' }}>{title}</span>
      </div>
      {badge}
    </div>
  )
}

function ProBadge() {
  return (
    <span style={{ padding: '3px 9px', background: 'var(--violet-soft, #EDE9FE)', color: 'var(--violet, #6C5CE7)', borderRadius: 99, fontSize: 10, fontWeight: 700, letterSpacing: '.4px', flexShrink: 0 }}>
      Pro+
    </span>
  )
}

function BlockDesc({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12.5, color: 'var(--text-secondary, #5B6B85)', lineHeight: 1.6 }}>{children}</div>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OutilsPage() {
  const { profil, loading: authLoading, logout } = useAuth()
  const { peutUtiliser } = useForfait((profil?.forfait || 'gratuit') as ForfaitType)
  const [classes,       setClasses]       = useState<any[]>([])
  const [dataLoading,   setDataLoading]   = useState(true)
  const [activeSondages, setActiveSondages] = useState(0)
  const [nbQuiz,        setNbQuiz]        = useState(0)

  // Timer
  const [timerDuration,   setTimerDuration]   = useState(0)
  const [timerRemaining,  setTimerRemaining]  = useState(0)
  const [timerRunning,    setTimerRunning]    = useState(false)
  const [timerFullscreen, setTimerFullscreen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Projection TBI
  const [projClasse,  setProjClasse]  = useState('')
  const [projLecons,  setProjLecons]  = useState<any[]>([])
  const [projLecon,   setProjLecon]   = useState('')
  const [projLoading, setProjLoading] = useState(false)

  const supabase = createClient()
  const router   = useRouter()
  const isFr     = (profil as any)?.langue_interface !== 'en'
  const initiales = `${profil?.prenom?.[0] || ''}${profil?.nom?.[0] || ''}`.toUpperCase() || '?'

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

  // ── Leçons projection ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!projClasse) { setProjLecons([]); setProjLecon(''); return }
    const doFetch = async () => {
      setProjLoading(true)
      const { data } = await supabase
        .from('lecons').select('id,titre,statut')
        .eq('classe_id', projClasse).order('updated_at', { ascending: false }).limit(20)
      const list = data || []
      setProjLecons(list)
      if (list[0]) setProjLecon(list[0].id)
      setProjLoading(false)
    }
    doFetch()
  }, [projClasse])

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRunning && timerRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimerRemaining(r => {
          if (r <= 1) { setTimerRunning(false); return 0 }
          return r - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerRunning])

  const startTimer = useCallback((mins: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    const secs = mins * 60
    setTimerDuration(secs)
    setTimerRemaining(secs)
    setTimerRunning(true)
  }, [])

  const timerMins    = Math.floor(timerRemaining / 60).toString().padStart(2, '0')
  const timerSecs    = (timerRemaining % 60).toString().padStart(2, '0')
  const timerProgress = timerDuration > 0 ? ((timerDuration - timerRemaining) / timerDuration) * 100 : 0
  const timerExpired  = timerDuration > 0 && timerRemaining === 0
  const timerActive   = timerDuration > 0

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (authLoading || dataLoading) return <LoadingScreen />

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    background: 'rgba(255,255,255,0.8)',
    border: '1.5px solid rgba(108,92,231,0.14)',
    borderRadius: 10,
    fontSize: 12.5,
    color: 'var(--text-primary, #0F1B2D)',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'linear-gradient(160deg, #EEF5FF 0%, #FFFFFF 100%)' }}>

      <Sidebar profil={profil} activeHref="/dashboard/outils" onLogout={handleLogout} />

      {/* Plein écran timer */}
      {timerFullscreen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,45,0.97)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          <div style={{ fontSize: 100, fontWeight: 800, color: timerExpired ? '#EF4444' : 'var(--violet, #6C5CE7)', fontVariantNumeric: 'tabular-nums', letterSpacing: -4, fontFamily: 'var(--font-display)' }}>
            {timerMins}:{timerSecs}
          </div>
          {timerExpired && (
            <div style={{ fontSize: 16, color: '#EF4444', fontWeight: 700, letterSpacing: '.5px' }}>
              ⏰ {isFr ? 'Temps écoulé !' : 'Time is up!'}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setTimerRunning(r => !r)}
              style={{ padding: '12px 28px', background: 'var(--violet)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              {timerRunning ? '⏸ Pause' : '▶ Reprendre'}
            </button>
            <button onClick={() => { setTimerRunning(false); setTimerRemaining(timerDuration) }}
              style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: '#fff', fontSize: 14, cursor: 'pointer' }}>
              ↺ Reset
            </button>
            <button onClick={() => setTimerFullscreen(false)}
              style={{ padding: '12px 20px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: '#EF4444', fontSize: 14, cursor: 'pointer' }}>
              ✕ Quitter
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {TIMER_PRESETS.map(m => (
              <button key={m} onClick={() => startTimer(m)}
                style={{ padding: '8px 18px', background: timerDuration === m * 60 ? 'var(--violet)' : 'rgba(255,255,255,0.06)', border: `1px solid ${timerDuration === m * 60 ? 'transparent' : 'rgba(255,255,255,0.12)'}`, borderRadius: 8, color: timerDuration === m * 60 ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                {m} min
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <Topbar notifCount={0} initiales={initiales} isFr={isFr} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

          {/* En-tête */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              🛠️ {isFr ? 'Outils du prof' : 'Teaching Tools'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {isFr ? 'Timer · Sondage QR · Quiz live · Projection TBI · Tableau blanc' : 'Timer · QR Poll · Live Quiz · Smart Board · Whiteboard'}
            </div>
          </div>

          {/* Grille 3 colonnes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>

            {/* ── 1 — Timer ─────────────────────────────────────────────────── */}
            <OutilBlock accent="var(--violet)">
              <BlockHeader icon="⏱️" title={isFr ? 'Timer' : 'Timer'} />
              <BlockDesc>{isFr ? 'Minuteur par phases pour structurer votre leçon.' : 'Phase timer to structure your lesson.'}</BlockDesc>

              {/* Affichage */}
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{
                  fontSize: timerActive ? 48 : 36,
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: -1,
                  color: timerExpired ? '#EF4444' : timerActive ? 'var(--violet)' : 'var(--text-muted)',
                  transition: 'color 0.3s',
                }}>
                  {timerActive ? `${timerMins}:${timerSecs}` : '– – : – –'}
                </div>
                {timerExpired && (
                  <div style={{ fontSize: 12, color: '#EF4444', marginTop: 4, fontWeight: 700 }}>
                    ⏰ {isFr ? 'Temps écoulé !' : 'Time is up!'}
                  </div>
                )}
                {timerActive && !timerExpired && (
                  <div style={{ height: 5, background: 'rgba(108,92,231,0.1)', borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${timerProgress}%`, background: 'linear-gradient(90deg, var(--violet), #8B77F0)', borderRadius: 99, transition: 'width 1s linear' }} />
                  </div>
                )}
              </div>

              {/* Presets */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
                {TIMER_PRESETS.map(m => (
                  <button key={m} onClick={() => startTimer(m)}
                    style={{
                      padding: '5px 12px', borderRadius: 8,
                      border: `1.5px solid ${timerDuration === m * 60 && timerActive ? 'var(--violet)' : 'rgba(108,92,231,0.14)'}`,
                      background: timerDuration === m * 60 && timerActive ? 'var(--violet-soft)' : 'rgba(255,255,255,0.7)',
                      color: timerDuration === m * 60 && timerActive ? 'var(--violet)' : 'var(--text-secondary)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    }}>
                    {m} min
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                {timerActive && (
                  <>
                    <button onClick={() => setTimerRunning(r => !r)}
                      style={{ flex: 1, padding: '8px', background: 'var(--violet-soft)', border: '1.5px solid rgba(108,92,231,0.25)', borderRadius: 9, color: 'var(--violet)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {timerRunning ? '⏸ Pause' : '▶ Reprendre'}
                    </button>
                    <button onClick={() => { setTimerRunning(false); setTimerRemaining(timerDuration) }}
                      style={{ padding: '8px 12px', background: 'rgba(15,35,65,0.05)', border: '1px solid rgba(15,35,65,0.1)', borderRadius: 9, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
                      ↺
                    </button>
                  </>
                )}
                <button onClick={() => setTimerFullscreen(true)}
                  style={{ padding: '8px 12px', background: 'rgba(108,92,231,0.06)', border: '1px solid rgba(108,92,231,0.14)', borderRadius: 9, color: 'var(--violet)', fontSize: 12, cursor: 'pointer' }}
                  title={isFr ? 'Plein écran' : 'Fullscreen'}>
                  ⛶
                </button>
              </div>
            </OutilBlock>

            {/* ── 2 — Sondage QR ────────────────────────────────────────────── */}
            <OutilBlock accent="#10B981" onClick={() => router.push('/dashboard/sondage')}>
              <BlockHeader icon="📲" title={isFr ? 'Sondage QR' : 'QR Poll'}
                badge={activeSondages > 0
                  ? <span style={{ padding: '3px 9px', background: 'rgba(16,185,129,0.1)', color: '#10B981', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>{activeSondages} actif{activeSondages > 1 ? 's' : ''}</span>
                  : undefined} />
              <BlockDesc>{isFr ? 'Créez un sondage et affichez le QR code pour que vos élèves répondent depuis leur téléphone.' : 'Create a poll and display the QR code so students can respond from their phone.'}</BlockDesc>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: '#10B981', fontSize: 12, fontWeight: 700 }}>
                <span>→</span>
                <span>{isFr ? 'Ouvrir les sondages' : 'Open polls'}</span>
              </div>
            </OutilBlock>

            {/* ── 3 — Quiz live ─────────────────────────────────────────────── */}
            <OutilBlock accent="var(--violet)" onClick={() => router.push('/dashboard/outils/quiz')}>
              <BlockHeader icon="🎮" title={isFr ? 'Quiz live' : 'Live Quiz'}
                badge={nbQuiz > 0
                  ? <span style={{ padding: '3px 9px', background: 'var(--violet-soft)', color: 'var(--violet)', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>{nbQuiz} quiz</span>
                  : undefined} />
              <BlockDesc>{isFr ? 'Créez et lancez des quiz interactifs en temps réel avec tableau de scores et participation instantanée.' : 'Create and launch real-time interactive quizzes with live scoreboards.'}</BlockDesc>
              <div style={{ marginTop: 'auto', color: 'var(--violet)', fontSize: 12, fontWeight: 700 }}>
                → {nbQuiz === 0 ? (isFr ? 'Créer mon premier quiz' : 'Create my first quiz') : (isFr ? 'Gérer mes quiz' : 'Manage my quizzes')}
              </div>
            </OutilBlock>

            {/* ── 4 — Projection TBI ────────────────────────────────────────── */}
            <OutilBlock accent="#3B82F6">
              <BlockHeader icon="📺" title={isFr ? 'Projection TBI' : 'Smart Board'} />
              <BlockDesc>{isFr ? 'Sélectionnez une leçon et lancez le mode présentation plein écran.' : 'Select a lesson and launch fullscreen presentation mode.'}</BlockDesc>

              <select value={projClasse} onChange={e => setProjClasse(e.target.value)} style={inputStyle}>
                <option value="">{isFr ? 'Choisir une classe…' : 'Choose a class…'}</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.nom}{c.niveau ? ` — ${c.niveau}` : ''}</option>)}
              </select>

              {projClasse && (
                <select value={projLecon} onChange={e => setProjLecon(e.target.value)} style={inputStyle}>
                  <option value="">{isFr ? 'Choisir une leçon…' : 'Choose a lesson…'}</option>
                  {projLecons.map(l => <option key={l.id} value={l.id}>{l.titre}</option>)}
                </select>
              )}

              <button
                disabled={!projClasse || !projLecon || projLoading}
                onClick={() => router.push(`/dashboard/classes/${projClasse}/lecons/${projLecon}/presenter`)}
                style={{
                  padding: '10px', borderRadius: 10,
                  background: !projClasse || !projLecon ? 'rgba(15,35,65,0.05)' : 'linear-gradient(135deg, #1B3F6E, #3B82F6)',
                  color: !projClasse || !projLecon ? 'var(--text-muted)' : '#fff',
                  border: 'none', fontSize: 13, fontWeight: 700,
                  cursor: !projClasse || !projLecon ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}>
                {projLoading ? '…' : `▶ ${isFr ? 'Lancer le mode TBI' : 'Launch Smart Board'}`}
              </button>
            </OutilBlock>

            {/* ── 5 — Tableau blanc ─────────────────────────────────────────── */}
            <OutilBlock accent="#06B6D4" onClick={() => router.push('/dashboard/gerer/enseigner')}>
              <BlockHeader icon="🖊️" title={isFr ? 'Tableau blanc' : 'Whiteboard'} />
              <BlockDesc>{isFr ? 'Canvas numérique pour annoter, dessiner et partager en temps réel avec votre classe.' : 'Digital canvas to annotate, draw and share in real time with your class.'}</BlockDesc>
              <div style={{ padding: '8px 12px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.18)', borderRadius: 8, fontSize: 11, color: '#06B6D4' }}>
                {isFr ? '🖥️ Disponible dans Mode Enseigner · Onglet Tableau blanc' : '🖥️ Available in Teach Mode · Whiteboard tab'}
              </div>
              <div style={{ marginTop: 'auto', color: '#06B6D4', fontSize: 12, fontWeight: 700 }}>
                → {isFr ? 'Ouvrir Mode Enseigner' : 'Open Teach Mode'}
              </div>
            </OutilBlock>

            {/* ── 6 — Podium Quiz Pro+ ──────────────────────────────────────── */}
            <OutilBlock accent="#F59E0B">
              <BlockHeader icon="🏆" title={isFr ? 'Podium Quiz' : 'Quiz Leaderboard'} badge={<ProBadge />} />
              <BlockDesc>{isFr ? 'Affichez le classement en direct après un Quiz live — gamification et engagement maximum.' : 'Display live leaderboard after a Quiz — maximum gamification and engagement.'}</BlockDesc>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', padding: '4px 0', opacity: 0.45 }}>
                {[{ place: '🥇', name: 'Emma L.', pts: 980 }, { place: '🥈', name: 'Liam T.', pts: 865 }, { place: '🥉', name: 'Sofia M.', pts: 740 }].map((p, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22 }}>{p.place}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: '#F59E0B', fontWeight: 700 }}>{p.pts} pts</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--violet-soft)', borderRadius: 8, fontSize: 11, color: 'var(--violet)', textAlign: 'center', fontWeight: 600 }}>
                🔒 {isFr ? 'Disponible en Pro+ · Lié au Quiz live' : 'Available in Pro+ · Linked to Live Quiz'}
              </div>
            </OutilBlock>

          </div>
        </div>
      </div>
    </div>
  )
}
