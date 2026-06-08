'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Etat = 'attente' | 'question' | 'resultats' | 'classement' | 'revision' | 'podium'

type Question = {
  id: string
  ordre: number
  type: string
  enonce: string
  options: string[]
  bonne_reponse: string
  explication: string
  points: number
  duree_secondes: number
  image_url: string | null
}

type Participant = {
  id: string
  pseudo: string
  avatar: string
  score: number
  equipe_id: number | null
}

type Reponse = {
  participant_id: string
  reponse: string
  est_correcte: boolean
  points_gagnes: number
}

const AVATAR_LIST = ['🦁','🐯','🦊','🐺','🦝','🦄','🐸','🐧','🦋','🐬','🦅','🐲']
const OPTION_COLORS = ['#F87171','#60A5FA','#34D399','#F59E0B']
const OPTION_SHAPES = ['△','○','□','☆']

// ── Confetti canvas ───────────────────────────────────────────────────────────

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const pieces = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: 8 + Math.random() * 8,
      h: 4 + Math.random() * 4,
      color: ['#A78BFA','#60A5FA','#34D399','#F59E0B','#F87171','#C084FC'][Math.floor(Math.random() * 6)],
      rot: Math.random() * 360,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      vr: (Math.random() - 0.5) * 4,
    }))
    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pieces.forEach(p => {
        ctx.save()
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2)
        ctx.rotate((p.rot * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
        p.x  += p.vx
        p.y  += p.vy
        p.rot += p.vr
        if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width }
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10 }} />
}

// ── Inner page (needs useSearchParams) ───────────────────────────────────────

function LancerInner() {
  const router       = useRouter()
  const params       = useParams()
  const searchParams = useSearchParams()
  const quizId       = params.id as string
  const sessionId    = searchParams.get('session') || ''
  const supabase     = createClient()

  const [etat,           setEtat]           = useState<Etat>('attente')
  const [quiz,           setQuiz]           = useState<any>(null)
  const [questions,      setQuestions]      = useState<Question[]>([])
  const [participants,   setParticipants]   = useState<Participant[]>([])
  const [currentIdx,     setCurrentIdx]     = useState(0)
  const [reponses,       setReponses]       = useState<Reponse[]>([])
  const [timer,          setTimer]          = useState(0)
  const [timerRunning,   setTimerRunning]   = useState(false)
  const [reponsesCount,  setReponsesCount]  = useState(0)
  const [revisionQs,     setRevisionQs]     = useState<Question[]>([])
  const [revisionIdx,    setRevisionIdx]    = useState(0)
  const [podiumVisible,  setPodiumVisible]  = useState<number>(0)
  const [loading,        setLoading]        = useState(true)

  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const channelRef = useRef<any>(null)

  // ── Fetch initial ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data: q }  = await supabase.from('quiz').select('*').eq('id', quizId).single()
      const { data: qs } = await supabase.from('questions_quiz').select('*').eq('quiz_id', quizId).order('ordre')
      const { data: ps } = await supabase.from('participants_quiz').select('*').eq('session_id', sessionId).order('joined_at')
      setQuiz(q)
      setQuestions(qs || [])
      setParticipants(ps || [])
      setLoading(false)
    }
    if (quizId && sessionId) load()
  }, [quizId, sessionId])

  // ── Realtime : nouveaux participants + réponses ───────────────────────────
  useEffect(() => {
    if (!sessionId) return

    const channel = supabase
      .channel(`quiz-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'participants_quiz',
        filter: `session_id=eq.${sessionId}`,
      }, payload => {
        setParticipants(p => [...p, payload.new as Participant])
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'reponses_quiz',
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        setReponsesCount(c => c + 1)
      })
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRunning && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            setTimerRunning(false)
            handleTimerEnd()
            return 0
          }
          return t - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerRunning])

  // ── Broadcast helpers ─────────────────────────────────────────────────────
  const broadcast = useCallback(async (event: string, payload: any) => {
    await supabase.channel(`quiz-${sessionId}`).send({ type: 'broadcast', event, payload })
  }, [sessionId])

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleLancer = async () => {
    await supabase.from('sessions_quiz').update({ statut: 'en_cours', question_actuelle: 0, started_at: new Date().toISOString() }).eq('id', sessionId)
    launchQuestion(0)
  }

  const launchQuestion = (idx: number) => {
    const q = questions[idx]
    if (!q) return
    setCurrentIdx(idx)
    setEtat('question')
    setReponsesCount(0)
    setReponses([])
    setTimer(q.duree_secondes)
    setTimerRunning(true)
    supabase.from('sessions_quiz').update({ question_actuelle: idx }).eq('id', sessionId)
    broadcast('question_start', {
      question_id:    q.id,
      ordre:          idx,
      total:          questions.length,
      duree_secondes: q.duree_secondes,
      type:           q.type,
      enonce:         q.enonce,
      options:        q.options || [],
    })
  }

  const handleTimerEnd = () => {
    fetchReponses()
    setEtat('resultats')
    const q = questions[currentIdx]
    if (q) broadcast('question_end', { question_id: q.id, bonne_reponse: q.bonne_reponse, stats: {} })
  }

  const handleNextFromResultats = () => {
    setEtat('classement')
  }

  const handleNextFromClassement = () => {
    const next = currentIdx + 1
    if (next < questions.length) {
      launchQuestion(next)
    } else if (quiz?.mode_revision && revisionQs.length > 0) {
      setRevisionIdx(0)
      setEtat('revision')
    } else {
      finishQuiz()
    }
  }

  const handleNextRevision = () => {
    const next = revisionIdx + 1
    if (next < revisionQs.length) {
      setRevisionIdx(next)
    } else {
      finishQuiz()
    }
  }

  const finishQuiz = async () => {
    await supabase.from('sessions_quiz').update({
      statut: 'termine',
      ended_at: new Date().toISOString(),
      scores: Object.fromEntries(participants.map(p => [p.id, p.score])),
    }).eq('id', sessionId)
    const cl = classement().map((p, i) => ({ participant_id: p.id, pseudo: p.pseudo, avatar: p.avatar, score: p.score, rang: i + 1 }))
    broadcast('scores_update', { classement: cl })
    broadcast('quiz_end', { classement_final: cl, badges: {}, recompense: quiz?.recompense_physique || '' })
    setEtat('podium')
    animatePodium()
  }

  const fetchReponses = async () => {
    const q = questions[currentIdx]
    if (!q) return
    const { data } = await supabase
      .from('reponses_quiz')
      .select('*, participants_quiz(score)')
      .eq('session_id', sessionId)
      .eq('question_id', q.id)
    setReponses((data || []).map((r: any) => ({
      participant_id: r.participant_id,
      reponse:        r.reponse,
      est_correcte:   r.est_correcte,
      points_gagnes:  r.points_gagnes,
    })))
    // Calculer les scores
    const scoreMap: Record<string, number> = {}
    ;(data || []).forEach((r: any) => {
      if (r.est_correcte && r.participant_id) {
        scoreMap[r.participant_id] = (scoreMap[r.participant_id] || 0) + r.points_gagnes
      }
    })
    // Mettre à jour les scores participants
    for (const [pid, pts] of Object.entries(scoreMap)) {
      const current = participants.find(p => p.id === pid)?.score || 0
      await supabase.from('participants_quiz').update({ score: current + pts }).eq('id', pid)
    }
    setParticipants(prev => prev.map(p => ({
      ...p,
      score: p.score + (scoreMap[p.id] || 0),
    })))
    // Détecter questions ratées pour révision
    if (quiz?.mode_revision) {
      const total = data?.length || 0
      const correct = data?.filter((r: any) => r.est_correcte).length || 0
      if (total > 0 && correct / total < 0.6) {
        setRevisionQs(prev => {
          if (prev.find(q2 => q2.id === questions[currentIdx].id)) return prev
          return [...prev, questions[currentIdx]]
        })
      }
    }
  }

  const animatePodium = () => {
    setTimeout(() => setPodiumVisible(1), 1500)
    setTimeout(() => setPodiumVisible(2), 3000)
    setTimeout(() => setPodiumVisible(3), 4500)
  }

  const classement = () => [...participants].sort((a, b) => b.score - a.score)

  // ── Calculs résultats question ────────────────────────────────────────────
  const currentQ = etat === 'revision' ? revisionQs[revisionIdx] : questions[currentIdx]
  const totalReponses = reponses.length || 1
  const optionCounts = currentQ?.options.map(opt => reponses.filter(r => r.reponse === opt).length) || []
  const pctCorrect = reponses.length > 0
    ? Math.round((reponses.filter(r => r.est_correcte).length / reponses.length) * 100)
    : 0

  const top5 = classement().slice(0, 5)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://klassia.ca'
  const quizUrl = `${baseUrl}/quiz/${quiz?.code_session}`

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: '#050D1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18 }}>
      Chargement...
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050D1A', color: 'white', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>

      {/* ── ÉTAT 1 : SALLE D'ATTENTE ──────────────────────────────────────── */}
      {etat === 'attente' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24, background: 'linear-gradient(160deg, #0D1B35 0%, #1A0533 100%)' }}>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase' }}>
            {quiz?.titre}
          </div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>Rejoins sur klassia.ca/quiz</div>
          <div style={{ fontSize: 88, fontWeight: 900, letterSpacing: 12, color: '#A78BFA', fontVariantNumeric: 'tabular-nums', textShadow: '0 0 60px rgba(167,139,250,0.5)' }}>
            {quiz?.code_session}
          </div>
          {quiz?.code_session && (
            <div style={{ background: 'white', padding: 16, borderRadius: 16 }}>
              <QRCodeSVG value={quizUrl} size={180} />
            </div>
          )}
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: -8 }}>
            {participants.length} participant{participants.length !== 1 ? 's' : ''} connecté{participants.length !== 1 ? 's' : ''}
          </div>

          {/* Avatars participants */}
          {participants.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 600, justifyContent: 'center' }}>
              {participants.map(p => (
                <div key={p.id} style={{ textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
                  <div style={{ fontSize: 28 }}>{p.avatar || '🦁'}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.pseudo}</div>
                </div>
              ))}
            </div>
          )}

          {participants.length >= 1 && (
            <button onClick={handleLancer}
              style={{ padding: '16px 48px', background: 'linear-gradient(135deg,#6B3FA0,#A78BFA)', color: 'white', border: 'none', borderRadius: 16, fontSize: 18, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 32px rgba(167,139,250,0.4)', animation: 'pulse 2s ease-in-out infinite' }}>
              Lancer le quiz ▶
            </button>
          )}

          <button onClick={() => router.push(`/dashboard/outils/quiz/${quizId}`)}
            style={{ position: 'absolute', top: 20, right: 20, padding: '8px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}>
            ✕ Quitter
          </button>
        </div>
      )}

      {/* ── ÉTATS 2+5 : QUESTION ACTIVE ───────────────────────────────────── */}
      {(etat === 'question' || etat === 'revision') && currentQ && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: etat === 'revision' ? 'linear-gradient(160deg, #1A0D00 0%, #2D1200 100%)' : 'linear-gradient(160deg, #0D1B35 0%, #0D0D35 100%)' }}>
          {/* Barre timer */}
          <div style={{ height: 6, background: 'rgba(255,255,255,0.1)' }}>
            <div style={{
              height: '100%',
              width: `${currentQ ? (timer / currentQ.duree_secondes) * 100 : 0}%`,
              background: timer <= 5 ? '#F87171' : '#A78BFA',
              transition: 'width 1s linear, background 0.3s',
            }} />
          </div>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px' }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              {etat === 'revision' ? `🔄 Révision · Q${revisionIdx + 1}/${revisionQs.length}` : `Question ${currentIdx + 1} / ${questions.length}`}
            </div>
            <div style={{ fontSize: 48, fontWeight: 900, color: timer <= 5 ? '#F87171' : '#A78BFA', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {timer}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              {reponsesCount}/{participants.length} réponses
            </div>
          </div>

          {/* Énoncé */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 80px', gap: 32 }}>
            <div style={{ fontSize: 36, fontWeight: 700, textAlign: 'center', lineHeight: 1.4, maxWidth: 900 }}>
              {currentQ.enonce}
            </div>
            {currentQ.image_url && (
              <img src={currentQ.image_url} alt="" style={{ maxHeight: '30vh', maxWidth: '60%', borderRadius: 12, objectFit: 'contain' }} />
            )}
          </div>

          {/* Options */}
          {currentQ.type !== 'reponse_courte' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 32px 32px' }}>
              {currentQ.options.map((opt, i) => (
                <div key={i} style={{ padding: '20px 24px', background: `${OPTION_COLORS[i]}22`, border: `2px solid ${OPTION_COLORS[i]}55`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24, color: OPTION_COLORS[i] }}>{OPTION_SHAPES[i]}</span>
                  <span style={{ fontSize: 18, fontWeight: 600 }}>{opt}</span>
                </div>
              ))}
            </div>
          )}
          {currentQ.type === 'reponse_courte' && (
            <div style={{ padding: '0 32px 32px', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', padding: '14px 32px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>
                ✏ Réponse courte à taper
              </div>
            </div>
          )}

          {/* Bouton passer (enseignant) */}
          <button onClick={() => { setTimerRunning(false); fetchReponses(); setEtat('resultats') }}
            style={{ position: 'absolute', bottom: 24, right: 24, padding: '10px 20px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>
            Passer →
          </button>
        </div>
      )}

      {/* ── ÉTAT 3 : RÉSULTATS QUESTION ───────────────────────────────────── */}
      {etat === 'resultats' && currentQ && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'linear-gradient(160deg, #0D1B35 0%, #0D0D35 100%)', padding: '40px 64px' }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
            Question {currentIdx + 1} / {questions.length} — Résultats
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 32, lineHeight: 1.4 }}>{currentQ.enonce}</div>

          {/* Barres */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            {currentQ.options.map((opt, i) => {
              const count = optionCounts[i] || 0
              const pct   = Math.round((count / totalReponses) * 100)
              const correct = opt === currentQ.bonne_reponse
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 28, color: OPTION_COLORS[i], fontSize: 20 }}>{OPTION_SHAPES[i]}</span>
                  <span style={{ width: 200, fontSize: 15, color: correct ? '#34D399' : 'rgba(255,255,255,0.7)' }}>
                    {opt} {correct && '✓'}
                  </span>
                  <div style={{ flex: 1, height: 36, background: 'rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: correct ? '#34D39955' : `${OPTION_COLORS[i]}44`, borderRadius: 8, transition: 'width 0.8s ease', display: 'flex', alignItems: 'center', paddingLeft: 12, fontSize: 14, fontWeight: 700, color: correct ? '#34D399' : OPTION_COLORS[i] }}>
                      {pct > 8 ? `${pct}%` : ''}
                    </div>
                  </div>
                  <span style={{ width: 36, textAlign: 'right', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{count}</span>
                </div>
              )
            })}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
            <div style={{ padding: '12px 24px', background: pctCorrect >= 70 ? 'rgba(52,211,153,0.15)' : pctCorrect >= 40 ? 'rgba(245,158,11,0.15)' : 'rgba(248,113,113,0.15)', border: `1px solid ${pctCorrect >= 70 ? '#34D399' : pctCorrect >= 40 ? '#F59E0B' : '#F87171'}44`, borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: pctCorrect >= 70 ? '#34D399' : pctCorrect >= 40 ? '#F59E0B' : '#F87171' }}>{pctCorrect}%</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>ont répondu correctement</div>
            </div>
          </div>

          {/* Explication */}
          {quiz?.afficher_explication && currentQ.explication && (
            <div style={{ marginTop: 20, padding: '16px 20px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 12 }}>
              <div style={{ fontSize: 11, color: '#60A5FA', fontWeight: 700, marginBottom: 6 }}>EXPLICATION</div>
              <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)' }}>{currentQ.explication}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
            <button onClick={handleNextFromResultats}
              style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#6B3FA0,#A78BFA)', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Classement →
            </button>
          </div>
        </div>
      )}

      {/* ── ÉTAT 4 : CLASSEMENT INTERMÉDIAIRE ────────────────────────────── */}
      {etat === 'classement' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'linear-gradient(160deg, #0D1B35 0%, #1A0533 100%)', padding: '40px 80px', alignItems: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 40 }}>
            Classement
          </div>
          <div style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {top5.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', background: i === 0 ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 0 ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, transition: 'all 0.5s ease' }}>
                <span style={{ fontSize: 22, width: 36 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
                <span style={{ fontSize: 28 }}>{p.avatar || '🦁'}</span>
                <span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>{p.pseudo}</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#F59E0B' }}>{p.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <button onClick={handleNextFromClassement}
            style={{ marginTop: 40, padding: '14px 36px', background: 'linear-gradient(135deg,#6B3FA0,#A78BFA)', color: 'white', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            {currentIdx + 1 < questions.length ? 'Question suivante →' : quiz?.mode_revision && revisionQs.length > 0 ? '🔄 Mode révision →' : '🏆 Voir le podium'}
          </button>
        </div>
      )}

      {/* ── ÉTAT 6 : PODIUM FINAL ─────────────────────────────────────────── */}
      {etat === 'podium' && (
        <>
          <ConfettiCanvas />
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'linear-gradient(160deg, #050D1A 0%, #1A0533 100%)', alignItems: 'center', justifyContent: 'center', gap: 32, position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: 3, textTransform: 'uppercase' }}>🏆 Podium Final</div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
              {/* 2e place */}
              {podiumVisible >= 2 && classement()[1] && (
                <div style={{ textAlign: 'center', animation: 'slideUp 0.8s ease' }}>
                  <div style={{ fontSize: 40 }}>{classement()[1].avatar || '🦁'}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{classement()[1].pseudo}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#C0C0C0', marginBottom: 8 }}>{classement()[1].score.toLocaleString()} pts</div>
                  <div style={{ width: 120, height: 140, background: 'rgba(192,192,192,0.2)', border: '2px solid #C0C0C0', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🥈</div>
                </div>
              )}
              {/* 1re place */}
              {podiumVisible >= 3 && classement()[0] && (
                <div style={{ textAlign: 'center', animation: 'slideUp 0.8s ease' }}>
                  <div style={{ fontSize: 52 }}>{classement()[0].avatar || '🦁'}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#F59E0B' }}>{classement()[0].pseudo}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#F59E0B', marginBottom: 8 }}>{classement()[0].score.toLocaleString()} pts</div>
                  <div style={{ width: 140, height: 180, background: 'rgba(245,158,11,0.25)', border: '2px solid #F59E0B', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🥇</div>
                </div>
              )}
              {/* 3e place */}
              {podiumVisible >= 1 && classement()[2] && (
                <div style={{ textAlign: 'center', animation: 'slideUp 0.8s ease' }}>
                  <div style={{ fontSize: 36 }}>{classement()[2].avatar || '🦁'}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{classement()[2].pseudo}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#CD7F32', marginBottom: 8 }}>{classement()[2].score.toLocaleString()} pts</div>
                  <div style={{ width: 100, height: 110, background: 'rgba(205,127,50,0.2)', border: '2px solid #CD7F32', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🥉</div>
                </div>
              )}
            </div>

            {/* Récompense */}
            {quiz?.recompense_physique && podiumVisible >= 3 && (
              <div style={{ padding: '16px 32px', background: 'rgba(245,158,11,0.15)', border: '2px solid rgba(245,158,11,0.4)', borderRadius: 16, fontSize: 18, fontWeight: 700, color: '#F59E0B' }}>
                🎁 Récompense : {quiz.recompense_physique}
              </div>
            )}

            {podiumVisible >= 3 && (
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => router.push(`/dashboard/outils/quiz/${quizId}/resultats?session=${sessionId}`)}
                  style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#6B3FA0,#A78BFA)', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  Voir le rapport complet →
                </button>
                <button onClick={() => router.push('/dashboard/outils/quiz')}
                  style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer' }}>
                  Mes quiz
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn   { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideUp  { from { opacity: 0; transform: translateY(60px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse    { 0%,100% { box-shadow: 0 8px 32px rgba(167,139,250,0.4); } 50% { box-shadow: 0 8px 48px rgba(167,139,250,0.7); } }
      `}</style>
    </div>
  )
}

export default function LancerPage() {
  return <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#050D1A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement...</div>}><LancerInner /></Suspense>
}
