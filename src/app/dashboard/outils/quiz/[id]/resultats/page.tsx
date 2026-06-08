'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'
import { useAuth } from '@/lib/hooks/useAuth'

// ── Types ─────────────────────────────────────────────────────────────────────

type QuestionStat = {
  id: string
  ordre: number
  enonce: string
  bonne_reponse: string
  options: string[]
  nb_correct: number
  nb_incorrect: number
  pct_correct: number
  reponse_plus_choisie: string
  distribution: Record<string, number>
}

type ParticipantStat = {
  id: string
  pseudo: string
  avatar: string
  score: number
  rang: number
  nb_correct: number
  nb_incorrect: number
}

// ── Inner page ────────────────────────────────────────────────────────────────

function ResultatsInner() {
  const { profil, loading: authLoading, logout } = useAuth()
  const router       = useRouter()
  const params       = useParams()
  const searchParams = useSearchParams()
  const quizId       = params.id as string
  const sessionId    = searchParams.get('session') || ''
  const supabase     = createClient()

  const [tab,           setTab]           = useState<'resume'|'questions'|'eleves'|'ia'>('resume')
  const [quiz,          setQuiz]          = useState<any>(null)
  const [session,       setSession]       = useState<any>(null)
  const [questions,     setQuestions]     = useState<any[]>([])
  const [participants,  setParticipants]  = useState<ParticipantStat[]>([])
  const [qStats,        setQStats]        = useState<QuestionStat[]>([])
  const [loading,       setLoading]       = useState(true)
  const [iaLoading,     setIaLoading]     = useState(false)
  const [iaResult,      setIaResult]      = useState('')
  const [expandedQ,     setExpandedQ]     = useState<string | null>(null)

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profil) return
    const load = async () => {
      const { data: q }  = await supabase.from('quiz').select('*, classes(nom,niveau)').eq('id', quizId).single()
      const { data: qs } = await supabase.from('questions_quiz').select('*').eq('quiz_id', quizId).order('ordre')
      setQuiz(q)
      setQuestions(qs || [])

      // Chercher la dernière session si pas de sessionId dans l'URL
      const targetSession = sessionId
        ? (await supabase.from('sessions_quiz').select('*').eq('id', sessionId).single()).data
        : (await supabase.from('sessions_quiz').select('*').eq('quiz_id', quizId).order('ended_at', { ascending: false }).limit(1).single()).data
      setSession(targetSession)

      if (targetSession) {
        const { data: parts } = await supabase
          .from('participants_quiz').select('*')
          .eq('session_id', targetSession.id).order('score', { ascending: false })

        const ranked = (parts || []).map((p, i) => ({
          id:           p.id,
          pseudo:       p.pseudo,
          avatar:       p.avatar || '🦁',
          score:        p.score,
          rang:         i + 1,
          nb_correct:   0,
          nb_incorrect: 0,
        }))
        setParticipants(ranked)

        // Stats par question
        const stats: QuestionStat[] = await Promise.all(
          (qs || []).map(async (q: any) => {
            const { data: reps } = await supabase
              .from('reponses_quiz').select('*')
              .eq('session_id', targetSession.id).eq('question_id', q.id)
            const list = reps || []
            const nbCorrect   = list.filter((r: any) => r.est_correcte).length
            const nbIncorrect = list.length - nbCorrect
            const dist: Record<string, number> = {}
            list.forEach((r: any) => { dist[r.reponse] = (dist[r.reponse] || 0) + 1 })
            const reponse_plus_choisie = Object.entries(dist).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
            return {
              id:                   q.id,
              ordre:                q.ordre,
              enonce:               q.enonce,
              bonne_reponse:        q.bonne_reponse,
              options:              q.options || [],
              nb_correct:           nbCorrect,
              nb_incorrect:         nbIncorrect,
              pct_correct:          list.length ? Math.round((nbCorrect / list.length) * 100) : 0,
              reponse_plus_choisie,
              distribution:         dist,
            }
          })
        )
        setQStats(stats)

        // Corriger nb_correct par participant
        const { data: allReps } = await supabase
          .from('reponses_quiz').select('participant_id, est_correcte')
          .eq('session_id', targetSession.id)
        const correctMap: Record<string, number> = {}
        const incorrectMap: Record<string, number> = {}
        ;(allReps || []).forEach((r: any) => {
          if (r.est_correcte) correctMap[r.participant_id] = (correctMap[r.participant_id] || 0) + 1
          else incorrectMap[r.participant_id] = (incorrectMap[r.participant_id] || 0) + 1
        })
        setParticipants(prev => prev.map(p => ({
          ...p,
          nb_correct:   correctMap[p.id]   || 0,
          nb_incorrect: incorrectMap[p.id] || 0,
        })))
      }
      setLoading(false)
    }
    load()
  }, [profil, quizId, sessionId])

  // ── CSV export ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const rows = [
      ['Rang', 'Pseudo', 'Avatar', 'Score', 'Correctes', 'Incorrectes'],
      ...participants.map(p => [p.rang, p.pseudo, p.avatar, p.score, p.nb_correct, p.nb_incorrect]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `quiz-${quiz?.titre || quizId}-resultats.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Analyse IA ────────────────────────────────────────────────────────────
  const handleAnalyseIA = async () => {
    setIaLoading(true)
    const resume = qStats.map(q => `Q${q.ordre}: "${q.enonce}" — ${q.pct_correct}% corrects`).join('\n')
    const res = await fetch('/api/ia/generer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type_contenu: 'quiz',
        sujet:        `Analyse de quiz : ${quiz?.titre}`,
        instructions: `Tu es un enseignant expert. Analyse ces résultats de quiz et fournis :
1. Les 3 principaux points à retravailler (questions ratées)
2. Des suggestions de remédiation concrètes
3. Des recommandations pour les prochaines leçons

Résultats par question :
${resume}

Classe : ${quiz?.classes?.nom || 'N/A'} — ${quiz?.classes?.niveau || 'N/A'}
Score moyen : ${participants.length ? Math.round(participants.reduce((s, p) => s + p.score, 0) / participants.length) : 0} pts
Participation : ${participants.length} élèves`,
        langue: 'fr',
      }),
    })
    const data = await res.json()
    setIaResult(data.contenu || 'Erreur lors de l\'analyse')
    setIaLoading(false)
  }

  // ── Calculs résumé ────────────────────────────────────────────────────────
  const scoreMoyen  = participants.length ? Math.round(participants.reduce((s, p) => s + p.score, 0) / participants.length) : 0
  const scoreMax    = participants.length ? Math.max(...participants.map(p => p.score)) : 0
  const tauxPartic  = quiz ? `${participants.length} participant${participants.length !== 1 ? 's' : ''}` : '—'
  const bestQ       = qStats.length ? qStats.reduce((a, b) => a.pct_correct > b.pct_correct ? a : b) : null
  const worstQ      = qStats.length ? qStats.reduce((a, b) => a.pct_correct < b.pct_correct ? a : b) : null

  if (authLoading || loading) return <LoadingScreen />

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/outils" onLogout={logout} />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Rapport de quiz</div>
            <div className="topbar-sub">
              <span style={{ color: 'var(--text-4)', cursor: 'pointer' }} onClick={() => router.push('/dashboard/outils/quiz')}>
                ← Mes quiz
              </span>
              {quiz && <> · <span style={{ color: 'var(--text-3)' }}>{quiz.titre}</span></>}
            </div>
          </div>
          <button onClick={() => router.push(`/dashboard/outils/quiz/${quizId}`)}
            style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: 'var(--text-3)', fontSize: 13, cursor: 'pointer' }}>
            ✏ Éditer le quiz
          </button>
        </div>

        <div className="page-content fade-in">
          {/* Onglets */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
            {(['resume', 'questions', 'eleves', 'ia'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '9px 18px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? '#A78BFA' : 'transparent'}`, color: tab === t ? '#A78BFA' : 'var(--text-4)', fontSize: 13, fontWeight: tab === t ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s', marginBottom: -1 }}>
                {t === 'resume' ? '📊 Résumé' : t === 'questions' ? '❓ Par question' : t === 'eleves' ? '👤 Par élève' : '✦ Insights IA'}
              </button>
            ))}
          </div>

          {/* ── RÉSUMÉ ──────────────────────────────────────────────────────── */}
          {tab === 'resume' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { label: 'Score moyen',       value: `${scoreMoyen.toLocaleString()} pts`, color: '#A78BFA' },
                  { label: 'Score max',          value: `${scoreMax.toLocaleString()} pts`,   color: '#F59E0B' },
                  { label: 'Participation',      value: tauxPartic,                           color: '#60A5FA' },
                  { label: 'Questions',          value: `${qStats.length}`,                   color: '#34D399' },
                ].map((s, i) => (
                  <div key={i} style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-5)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {bestQ && worstQ && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: '16px 20px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 12 }}>
                    <div style={{ fontSize: 11, color: '#34D399', fontWeight: 700, marginBottom: 6 }}>✓ QUESTION LA PLUS RÉUSSIE</div>
                    <div style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.4 }}>{bestQ.enonce}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#34D399', marginTop: 8 }}>{bestQ.pct_correct}% corrects</div>
                  </div>
                  <div style={{ padding: '16px 20px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12 }}>
                    <div style={{ fontSize: 11, color: '#F87171', fontWeight: 700, marginBottom: 6 }}>✗ QUESTION LA PLUS RATÉE</div>
                    <div style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.4 }}>{worstQ.enonce}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#F87171', marginTop: 8 }}>{worstQ.pct_correct}% corrects</div>
                  </div>
                </div>
              )}

              {session && (
                <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, fontSize: 12, color: 'var(--text-4)' }}>
                  Session lancée le {new Date(session.started_at || session.created_at).toLocaleString('fr-CA')}
                  {session.ended_at && ` · Durée : ${Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)} min`}
                </div>
              )}
            </div>
          )}

          {/* ── PAR QUESTION ─────────────────────────────────────────────── */}
          {tab === 'questions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {qStats.map(q => {
                const color = q.pct_correct >= 70 ? '#34D399' : q.pct_correct >= 40 ? '#F59E0B' : '#F87171'
                const isOpen = expandedQ === q.id
                return (
                  <div key={q.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
                      onClick={() => setExpandedQ(isOpen ? null : q.id)}>
                      <span style={{ width: 24, height: 24, borderRadius: 6, background: `${color}22`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {q.ordre}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-1)' }}>{q.enonce}</span>
                      <div style={{ width: 140, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${q.pct_correct}%`, background: color, borderRadius: 99, transition: 'width 0.8s' }} />
                      </div>
                      <span style={{ width: 44, textAlign: 'right', fontSize: 14, fontWeight: 700, color }}>{q.pct_correct}%</span>
                      <span style={{ fontSize: 10, color: 'var(--text-5)', width: 32, textAlign: 'right' }}>{isOpen ? '▲' : '▼'}</span>
                    </div>

                    {isOpen && (
                      <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', gap: 16, marginTop: 12, marginBottom: 12, fontSize: 12 }}>
                          <span style={{ color: '#34D399' }}>✓ {q.nb_correct} corrects</span>
                          <span style={{ color: '#F87171' }}>✗ {q.nb_incorrect} incorrects</span>
                          <span style={{ color: 'var(--text-5)' }}>Réponse la + choisie : <strong>{q.reponse_plus_choisie}</strong></span>
                        </div>
                        {q.options.map((opt, i) => {
                          const count = q.distribution[opt] || 0
                          const total = q.nb_correct + q.nb_incorrect || 1
                          const pct   = Math.round((count / total) * 100)
                          const isCorrect = opt === q.bonne_reponse
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                              <span style={{ width: 14, fontSize: 11, color: isCorrect ? '#34D399' : 'var(--text-5)' }}>{isCorrect ? '✓' : '·'}</span>
                              <span style={{ width: 160, fontSize: 12, color: isCorrect ? '#34D399' : 'var(--text-3)' }}>{opt}</span>
                              <div style={{ flex: 1, height: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 6, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: isCorrect ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.12)', borderRadius: 6 }} />
                              </div>
                              <span style={{ width: 36, fontSize: 11, color: 'var(--text-5)', textAlign: 'right' }}>{count}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── PAR ÉLÈVE ────────────────────────────────────────────────── */}
          {tab === 'eleves' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                <button onClick={handleExportCSV}
                  style={{ padding: '7px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  ⬇ Télécharger CSV
                </button>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['Rang','Avatar','Pseudo','Score','Correctes','Incorrectes'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '10px 14px', color: i < 3 ? ['#F59E0B','#C0C0C0','#CD7F32'][i] : 'var(--text-4)', fontWeight: 700 }}>
                          {i < 3 ? ['🥇','🥈','🥉'][i] : p.rang}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 20 }}>{p.avatar}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-1)', fontWeight: 500 }}>{p.pseudo}</td>
                        <td style={{ padding: '10px 14px', color: '#F59E0B', fontWeight: 700 }}>{p.score.toLocaleString()}</td>
                        <td style={{ padding: '10px 14px', color: '#34D399' }}>{p.nb_correct}</td>
                        <td style={{ padding: '10px 14px', color: '#F87171' }}>{p.nb_incorrect}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {participants.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-5)' }}>Aucune donnée de participation</div>
                )}
              </div>
            </div>
          )}

          {/* ── INSIGHTS IA ──────────────────────────────────────────────── */}
          {tab === 'ia' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800 }}>
              <div style={{ padding: '16px 20px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 12, fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7 }}>
                L&apos;IA analysera les questions ratées, identifiera les lacunes de compréhension et proposera des stratégies de remédiation adaptées à votre classe.
              </div>

              {!iaResult && (
                <button onClick={handleAnalyseIA} disabled={iaLoading || qStats.length === 0}
                  style={{ padding: '14px 28px', background: iaLoading ? 'rgba(167,139,250,0.1)' : 'linear-gradient(135deg,#6B3FA0,#A78BFA)', color: iaLoading ? '#A78BFA' : 'white', border: iaLoading ? '1px solid rgba(167,139,250,0.3)' : 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: iaLoading || qStats.length === 0 ? 'wait' : 'pointer', alignSelf: 'flex-start' }}>
                  {iaLoading ? '✦ Analyse en cours...' : '✦ Analyser avec l\'IA'}
                </button>
              )}

              {iaLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ height: 14, background: 'rgba(167,139,250,0.12)', borderRadius: 6, width: `${100 - i * 12}%`, animation: 'pulse 1.5s ease-in-out infinite' }} />
                  ))}
                </div>
              )}

              {iaResult && (
                <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#A78BFA' }}>✦ Analyse IA</div>
                    <button onClick={() => setIaResult('')}
                      style={{ background: 'none', border: 'none', color: 'var(--text-5)', fontSize: 12, cursor: 'pointer' }}>
                      ↺ Relancer
                    </button>
                  </div>
                  <pre style={{ fontSize: 13, color: 'var(--text-2)', whiteSpace: 'pre-wrap', lineHeight: 1.8, margin: 0, fontFamily: 'inherit' }}>
                    {iaResult}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResultatsPage() {
  return <Suspense fallback={<LoadingScreen />}><ResultatsInner /></Suspense>
}
