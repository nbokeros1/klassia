'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BadgeAnimation from '@/components/quiz/BadgeAnimation'

// ── Avatars ───────────────────────────────────────────────────────────────────

const AVATARS = ['🦁','🐯','🦊','🐺','🦝','🦄','🐸','🐧','🦋','🐬','🦅','🐲','🐻','🐼','🐨','🦒','🦓','🐘','🦔','🐙']

// ── Couleurs options ──────────────────────────────────────────────────────────

const OPT_COLORS  = ['#F87171','#60A5FA','#34D399','#F59E0B']
const OPT_SHAPES  = ['△','○','□','☆']
const OPT_BG      = ['rgba(248,113,113,0.15)','rgba(96,165,250,0.15)','rgba(52,211,153,0.15)','rgba(245,158,11,0.15)']

// ── Types ─────────────────────────────────────────────────────────────────────

type Etat = 'rejoindre' | 'attente' | 'question' | 'resultat' | 'classement' | 'revision' | 'fin'

type QuestionData = {
  question_id:    string
  ordre:          number
  total:          number
  duree_secondes: number
  type:           'qcm' | 'vrai_faux' | 'reponse_courte'
  enonce:         string
  options:        string[]
}

type RangItem = { pseudo: string; avatar: string; score: number; rang: number }

// ── Confetti léger (fin top 3) ────────────────────────────────────────────────

function MiniConfetti() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    c.width = window.innerWidth; c.height = window.innerHeight
    const COLORS = ['#A78BFA','#60A5FA','#34D399','#F59E0B','#F87171']
    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * c.width, y: Math.random() * -c.height,
      w: 6 + Math.random() * 6, h: 3 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * 360, vx: (Math.random() - 0.5) * 2.5,
      vy: 2 + Math.random() * 3.5, vr: (Math.random() - 0.5) * 4, alpha: 1,
    }))
    let tick = 0, raf: number
    const draw = () => {
      tick++; ctx.clearRect(0, 0, c.width, c.height)
      pts.forEach(p => {
        if (tick > 120) p.alpha = Math.max(0, p.alpha - 0.01)
        ctx.save(); ctx.globalAlpha = p.alpha
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2)
        ctx.rotate((p.rot * Math.PI) / 180)
        ctx.fillStyle = p.color; ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h)
        ctx.restore()
        p.x += p.vx; p.y += p.vy; p.rot += p.vr
        if (p.y > c.height + 10) { p.y = -10; p.x = Math.random() * c.width; p.alpha = 1 }
      })
      if (tick < 300) raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5 }} />
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function QuizElevePage() {
  const params   = useParams()
  const code     = (params.code as string).toUpperCase()
  const supabase = createClient()

  // ── États principaux ───────────────────────────────────────────────────────
  const [etat,         setEtat]         = useState<Etat>('rejoindre')
  const [quiz,         setQuiz]         = useState<any>(null)
  const [sessionId,    setSessionId]    = useState('')
  const [participantId,setParticipantId]= useState('')
  const [notFound,     setNotFound]     = useState(false)
  const [loading,      setLoading]      = useState(true)

  // ── Formulaire rejoindre ───────────────────────────────────────────────────
  const [pseudo,     setPseudo]     = useState('')
  const [avatar,     setAvatar]     = useState('')
  const [joining,    setJoining]    = useState(false)
  const [joinError,  setJoinError]  = useState('')

  // ── Question active ───────────────────────────────────────────────────────
  const [question,       setQuestion]       = useState<QuestionData | null>(null)
  const [timer,          setTimer]          = useState(0)
  const [reponseEnvoyee, setReponseEnvoyee] = useState<string | null>(null)
  const [shortInput,     setShortInput]     = useState('')

  // ── Résultat d'une question ───────────────────────────────────────────────
  const [bonneReponse,   setBonneReponse]   = useState('')
  const [pointsGagnes,   setPointsGagnes]   = useState(0)
  const [monScore,       setMonScore]       = useState(0)

  // ── Classement ────────────────────────────────────────────────────────────
  const [classement,     setClassement]     = useState<RangItem[]>([])

  // ── Participants salle d'attente ──────────────────────────────────────────
  const [participants,   setParticipants]   = useState<any[]>([])

  // ── Fin quiz ──────────────────────────────────────────────────────────────
  const [monBadge,       setMonBadge]       = useState('')
  const [monRang,        setMonRang]        = useState(0)
  const [recompense,     setRecompense]     = useState('')
  const [estTop3,        setEstTop3]        = useState(false)
  const [finalClassement,setFinalClassement]= useState<RangItem[]>([])

  // ── Mode révision ─────────────────────────────────────────────────────────
  const [isRevision,     setIsRevision]     = useState(false)

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const channelRef  = useRef<any>(null)
  const participantIdRef = useRef('')

  // ── Fetch quiz par code ───────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data: q } = await supabase
        .from('quiz')
        .select('id,titre,code_session,statut,recompense_physique,mode_revision,afficher_explication')
        .eq('code_session', code)
        .eq('statut', 'actif')
        .single()

      if (!q) { setNotFound(true); setLoading(false); return }
      setQuiz(q)

      // Trouver la session active
      const { data: sess } = await supabase
        .from('sessions_quiz')
        .select('id,statut')
        .eq('quiz_id', q.id)
        .in('statut', ['attente','en_cours'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (sess) setSessionId(sess.id)
      setLoading(false)
    }
    load()
  }, [code])

  // ── Realtime : events broadcast ───────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return

    // Participants entrants (salle d'attente)
    const dbChannel = supabase
      .channel(`quiz-db-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'participants_quiz',
        filter: `session_id=eq.${sessionId}`,
      }, payload => {
        setParticipants(prev => {
          if (prev.find(p => p.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
      })
      .subscribe()

    // Broadcast host
    const bChannel = supabase
      .channel(`quiz-${sessionId}`)
      .on('broadcast', { event: 'question_start' }, ({ payload }: { payload: any }) => {
        startQuestion(payload)
      })
      .on('broadcast', { event: 'question_end' }, ({ payload }: { payload: any }) => {
        handleQuestionEnd(payload)
      })
      .on('broadcast', { event: 'scores_update' }, ({ payload }: { payload: any }) => {
        setClassement(payload.classement || [])
        const mine = (payload.classement || []).find((r: RangItem) => {
          // Trouver par participant_id stocké
          return false // sera amélioré avec le classement final
        })
        if (mine) setMonScore(mine.score)
      })
      .on('broadcast', { event: 'revision_start' }, () => {
        setIsRevision(true)
      })
      .on('broadcast', { event: 'quiz_end' }, ({ payload }: { payload: any }) => {
        const pid = participantIdRef.current
        const final = payload.classement_final || []
        setFinalClassement(final)
        const moi = final.find((r: RangItem & { participant_id?: string }) => r.participant_id === pid)
        if (moi) {
          setMonRang(moi.rang)
          setMonScore(moi.score)
          setEstTop3(moi.rang <= 3)
        }
        const badgeType = payload.badges?.[pid] || 'participant'
        setMonBadge(badgeType)
        setRecompense(payload.recompense || quiz?.recompense_physique || '')
        setEtat('fin')
      })
      .subscribe()

    channelRef.current = bChannel

    return () => {
      supabase.removeChannel(dbChannel)
      supabase.removeChannel(bChannel)
    }
  }, [sessionId])

  // ── Timer question ────────────────────────────────────────────────────────
  useEffect(() => {
    if (timer <= 0 || !question) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          // Timeout sans réponse → passer à résultat
          if (!reponseEnvoyee) setEtat('resultat')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [question, timer > 0])

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleJoin = async () => {
    if (!pseudo.trim()) { setJoinError('Entre ton pseudo.'); return }
    if (!avatar)        { setJoinError('Choisis un avatar.'); return }
    if (!sessionId)     { setJoinError('Quiz non disponible.'); return }
    setJoining(true)
    setJoinError('')
    const { data, error } = await supabase
      .from('participants_quiz')
      .insert({ session_id: sessionId, pseudo: pseudo.trim(), avatar })
      .select()
      .single()
    if (error || !data) {
      setJoinError('Erreur lors de la connexion. Réessaie.')
      setJoining(false)
      return
    }
    setParticipantId(data.id)
    participantIdRef.current = data.id
    // Récupérer la liste actuelle des participants
    const { data: existants } = await supabase
      .from('participants_quiz').select('*').eq('session_id', sessionId)
    setParticipants(existants || [])
    setJoining(false)
    setEtat('attente')
  }

  const startQuestion = (payload: QuestionData) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setQuestion(payload)
    setTimer(payload.duree_secondes)
    setReponseEnvoyee(null)
    setShortInput('')
    setBonneReponse('')
    setPointsGagnes(0)
    setIsRevision(false)
    setEtat('question')
  }

  const handleRepondre = async (reponse: string) => {
    if (reponseEnvoyee || !question || !participantIdRef.current) return
    if (timerRef.current) clearInterval(timerRef.current)
    setReponseEnvoyee(reponse)

    // Insert réponse
    await supabase.from('reponses_quiz').insert({
      session_id:     sessionId,
      participant_id: participantIdRef.current,
      question_id:    question.question_id,
      reponse,
      est_correcte:   false,  // corrigé par le host via trigger ou query
      points_gagnes:  0,
    })
    setEtat('resultat')
  }

  const handleQuestionEnd = (payload: { bonne_reponse: string; stats?: Record<string, number> }) => {
    setBonneReponse(payload.bonne_reponse)
    const correct = reponseEnvoyee === payload.bonne_reponse
    if (correct) {
      const gained = question?.type === 'qcm' ? 1000 : 500
      setPointsGagnes(gained)
      setMonScore(s => s + gained)
    }
    setEtat('resultat')
  }

  // ── Loading / Not found ───────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050D1A' }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(167,139,250,0.2)', borderTopColor: '#A78BFA', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (notFound || !quiz) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050D1A', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 8 }}>Quiz introuvable</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Le code <b style={{ color: '#A78BFA' }}>{code}</b> ne correspond à aucun quiz actif.</div>
      </div>
    </div>
  )

  // ── Rendu selon état ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #050D1A 0%, #1A0533 100%)', color: 'white', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}>
      <style>{`
        @keyframes spin     { to   { transform: rotate(360deg); } }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse    { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes bounce   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── ÉTAT 1 : REJOINDRE ──────────────────────────────────────────── */}
      {etat === 'rejoindre' && (
        <div style={{ width: '100%', maxWidth: 440, animation: 'fadeUp 0.4s ease' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#6B3FA0,#A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, margin: '0 auto 12px' }}>K</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase' }}>KlassIA+ · Quiz Live</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6 }}>{quiz.titre}</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '24px 20px' }}>
            {/* Pseudo */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ton pseudo</label>
              <input
                value={pseudo}
                onChange={e => setPseudo(e.target.value.slice(0, 20))}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="Ex : Emma L."
                autoFocus
                maxLength={20}
                style={{ width: '100%', padding: '13px 14px', background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 16, color: 'white', outline: 'none', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = 'rgba(167,139,250,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4, textAlign: 'right' }}>{pseudo.length}/20</div>
            </div>

            {/* Avatars */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ton avatar</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {AVATARS.map(av => (
                  <button key={av} onClick={() => setAvatar(av)}
                    style={{ padding: '10px', fontSize: 28, background: avatar === av ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.04)', border: `2px solid ${avatar === av ? '#A78BFA' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', transform: avatar === av ? 'scale(1.1)' : 'scale(1)' }}>
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {joinError && <div style={{ color: '#F87171', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{joinError}</div>}

            <button onClick={handleJoin} disabled={joining}
              style={{ width: '100%', padding: '16px', background: pseudo.trim() && avatar ? 'linear-gradient(135deg,#6B3FA0,#A78BFA)' : 'rgba(255,255,255,0.07)', color: pseudo.trim() && avatar ? 'white' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: pseudo.trim() && avatar ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
              {joining ? '...' : 'Rejoindre le quiz →'}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Propulsé par KlassIA+</div>
        </div>
      )}

      {/* ── ÉTAT 2 : SALLE D'ATTENTE ────────────────────────────────────── */}
      {etat === 'attente' && (
        <div style={{ width: '100%', maxWidth: 440, textAlign: 'center', animation: 'fadeUp 0.4s ease' }}>
          {/* Mon profil */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 28, padding: '10px 18px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 12 }}>
            <span style={{ fontSize: 28 }}>{avatar}</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{pseudo}</span>
          </div>

          <div style={{ fontSize: 36, marginBottom: 16 }}>
            <div style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite', fontSize: 32 }}>⏳</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>En attente du professeur...</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>
            Le quiz démarrera bientôt
          </div>

          {/* Participants */}
          {participants.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '16px' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 12, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {participants.length} participant{participants.length !== 1 ? 's' : ''} connecté{participants.length !== 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                {participants.map((p, i) => (
                  <div key={p.id || i} style={{ textAlign: 'center', animation: 'fadeUp 0.3s ease' }}>
                    <div style={{ fontSize: 26 }}>{p.avatar || '🦁'}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.pseudo}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ÉTATS 3+6 : QUESTION ──────────────────────────────────────────── */}
      {(etat === 'question' || etat === 'revision') && question && (
        <div style={{ width: '100%', maxWidth: 480, animation: 'fadeUp 0.3s ease' }}>
          {/* Barre timer */}
          <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 99, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(timer / question.duree_secondes) * 100}%`,
              background: timer <= 5 ? '#F87171' : isRevision ? '#F59E0B' : '#A78BFA',
              transition: 'width 1s linear, background 0.3s',
              borderRadius: 99,
            }} />
          </div>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
              {isRevision ? '🔄 Révision' : `Q ${question.ordre + 1} / ${question.total}`}
            </div>
            <div style={{ fontSize: 44, fontWeight: 900, color: timer <= 5 ? '#F87171' : '#A78BFA', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {timer}
            </div>
          </div>

          {/* Énoncé */}
          <div style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', lineHeight: 1.5, marginBottom: 28, padding: '0 4px' }}>
            {question.enonce}
          </div>

          {/* QCM */}
          {question.type === 'qcm' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {question.options.map((opt, i) => (
                <button key={i} onClick={() => !reponseEnvoyee && handleRepondre(opt)}
                  disabled={!!reponseEnvoyee}
                  style={{
                    padding: '16px 20px', background: reponseEnvoyee === opt ? `${OPT_COLORS[i]}33` : OPT_BG[i],
                    border: `2px solid ${reponseEnvoyee === opt ? OPT_COLORS[i] : `${OPT_COLORS[i]}55`}`,
                    borderRadius: 14, fontSize: 16, fontWeight: 600, color: 'white',
                    cursor: reponseEnvoyee ? 'not-allowed' : 'pointer',
                    opacity: reponseEnvoyee && reponseEnvoyee !== opt ? 0.45 : 1,
                    display: 'flex', alignItems: 'center', gap: 12,
                    transition: 'all 0.15s', textAlign: 'left',
                  }}>
                  <span style={{ fontSize: 22, color: OPT_COLORS[i] }}>{OPT_SHAPES[i]}</span>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Vrai / Faux */}
          {question.type === 'vrai_faux' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {['Vrai','Faux'].map((opt, i) => (
                <button key={opt} onClick={() => !reponseEnvoyee && handleRepondre(opt)}
                  disabled={!!reponseEnvoyee}
                  style={{
                    padding: '32px 16px', background: i === 0 ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
                    border: `2px solid ${reponseEnvoyee === opt ? (i === 0 ? '#34D399' : '#F87171') : (i === 0 ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)')}`,
                    borderRadius: 16, fontSize: 22, fontWeight: 800,
                    color: i === 0 ? '#34D399' : '#F87171',
                    cursor: reponseEnvoyee ? 'not-allowed' : 'pointer',
                    opacity: reponseEnvoyee && reponseEnvoyee !== opt ? 0.4 : 1,
                    transition: 'all 0.15s',
                  }}>
                  {i === 0 ? '✓ VRAI' : '✗ FAUX'}
                </button>
              ))}
            </div>
          )}

          {/* Réponse courte */}
          {question.type === 'reponse_courte' && (
            <div>
              <input
                value={shortInput}
                onChange={e => setShortInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && shortInput.trim() && handleRepondre(shortInput.trim())}
                placeholder="Ta réponse..."
                disabled={!!reponseEnvoyee}
                autoFocus
                style={{ width: '100%', padding: '16px', background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(255,255,255,0.15)', borderRadius: 12, fontSize: 16, color: 'white', outline: 'none', marginBottom: 12, fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = 'rgba(167,139,250,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              />
              <button onClick={() => shortInput.trim() && handleRepondre(shortInput.trim())}
                disabled={!shortInput.trim() || !!reponseEnvoyee}
                style={{ width: '100%', padding: '14px', background: shortInput.trim() && !reponseEnvoyee ? 'linear-gradient(135deg,#6B3FA0,#A78BFA)' : 'rgba(255,255,255,0.07)', color: shortInput.trim() && !reponseEnvoyee ? 'white' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: shortInput.trim() && !reponseEnvoyee ? 'pointer' : 'not-allowed' }}>
                Envoyer →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ÉTAT 4 : RÉSULTAT QUESTION ──────────────────────────────────── */}
      {etat === 'resultat' && (
        <div style={{ width: '100%', maxWidth: 440, textAlign: 'center', animation: 'fadeUp 0.4s ease' }}>
          {bonneReponse ? (
            <>
              {reponseEnvoyee === bonneReponse ? (
                <>
                  <div style={{ fontSize: 80, marginBottom: 12, animation: 'bounce 0.6s ease' }}>✅</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#34D399', marginBottom: 8 }}>Bonne réponse !</div>
                  {pointsGagnes > 0 && (
                    <div style={{ fontSize: 32, fontWeight: 900, color: '#F59E0B', marginBottom: 4 }}>+{pointsGagnes} ⚡</div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 80, marginBottom: 12 }}>❌</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#F87171', marginBottom: 8 }}>
                    {reponseEnvoyee ? 'Mauvaise réponse' : 'Temps écoulé !'}
                  </div>
                </>
              )}
              <div style={{ padding: '12px 20px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 12, fontSize: 14, color: '#34D399', marginBottom: 16, marginTop: 8 }}>
                ✓ Bonne réponse : <strong>{bonneReponse}</strong>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                {reponseEnvoyee ? '📨' : '⏱'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                {reponseEnvoyee ? 'Réponse envoyée !' : 'Temps écoulé'}
              </div>
              {reponseEnvoyee && (
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                  Ta réponse : <strong style={{ color: 'white' }}>{reponseEnvoyee}</strong>
                </div>
              )}
            </>
          )}

          <div style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, marginTop: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#F59E0B' }}>{monScore.toLocaleString()} pts</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Score total</div>
          </div>

          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 20, animation: 'pulse 1.5s ease-in-out infinite' }}>
            Prochaine question en cours...
          </div>
        </div>
      )}

      {/* ── ÉTAT 5 : CLASSEMENT INTERMÉDIAIRE ───────────────────────────── */}
      {etat === 'classement' && (
        <div style={{ width: '100%', maxWidth: 440, animation: 'fadeUp 0.4s ease' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' }}>
            Classement
          </div>
          {classement.slice(0, 5).map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: p.pseudo === pseudo ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${p.pseudo === pseudo ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, marginBottom: 8, transition: 'all 0.5s' }}>
              <span style={{ width: 24, fontSize: 18 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
              <span style={{ fontSize: 24 }}>{p.avatar}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: p.pseudo === pseudo ? 700 : 400 }}>{p.pseudo}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#F59E0B' }}>{p.score.toLocaleString()}</span>
            </div>
          ))}
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.25)', animation: 'pulse 1.5s ease-in-out infinite' }}>
            Prochaine question...
          </div>
        </div>
      )}

      {/* ── ÉTAT 7 : FIN + BADGE ─────────────────────────────────────────── */}
      {etat === 'fin' && (
        <div style={{ width: '100%', maxWidth: 440, textAlign: 'center', animation: 'fadeUp 0.5s ease' }}>
          {estTop3 && <MiniConfetti />}

          {/* Badge */}
          {monBadge && (
            <div style={{ marginBottom: 32, position: 'relative', zIndex: 6 }}>
              <BadgeAnimation badge={monBadge} score={monScore} />
            </div>
          )}

          {/* Rang */}
          <div style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, marginBottom: 20, position: 'relative', zIndex: 6 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#F59E0B' }}>{monRang > 0 ? `#${monRang}` : '—'}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>sur {finalClassement.length} participants</div>
          </div>

          {/* Podium top 3 */}
          {finalClassement.length >= 3 && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16, position: 'relative', zIndex: 6 }}>
              {[finalClassement[1], finalClassement[0], finalClassement[2]].filter(Boolean).map((p, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: i === 1 ? 36 : 28 }}>{p.avatar}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.pseudo}</div>
                  <div style={{ fontSize: 10, color: '#F59E0B', fontWeight: 700 }}>{p.score.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}

          {/* Récompense */}
          {recompense && (
            <div style={{ padding: '12px 20px', background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.3)', borderRadius: 12, fontSize: 16, fontWeight: 700, color: '#F59E0B', marginBottom: 20, position: 'relative', zIndex: 6 }}>
              🎁 {recompense}
            </div>
          )}

          <button onClick={() => window.location.reload()}
            style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#6B3FA0,#A78BFA)', color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', position: 'relative', zIndex: 6 }}>
            🔄 Rejouer
          </button>

          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', marginTop: 16, position: 'relative', zIndex: 6 }}>Propulsé par KlassIA+</div>
        </div>
      )}
    </div>
  )
}
