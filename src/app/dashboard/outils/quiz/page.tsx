'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'
import { useAuth } from '@/lib/hooks/useAuth'

const MODE_LABEL: Record<string, string> = {
  individuel: 'Individuel',
  equipes:    'Équipes',
  defi:       'Défi',
}
const MODE_COLOR: Record<string, string> = {
  individuel: '#60A5FA',
  equipes:    '#34D399',
  defi:       '#F59E0B',
}
const STATUT_LABEL: Record<string, string> = {
  brouillon: 'Brouillon',
  actif:     'Actif',
  termine:   'Terminé',
}
const STATUT_COLOR: Record<string, string> = {
  brouillon: '#94A3B8',
  actif:     '#34D399',
  termine:   '#A78BFA',
}

type Quiz = {
  id: string
  titre: string
  statut: string
  mode: string
  source: string
  lien_ras: string | null
  created_at: string
  updated_at: string
  classe_id: string | null
  classes?: { nom: string; niveau: string } | null
  _nb_questions?: number
}

type Filter = 'tous' | 'brouillon' | 'actif' | 'termine'

export default function QuizListPage() {
  const { profil, loading: authLoading, logout } = useAuth()
  const router   = useRouter()
  const supabase = createClient()

  const [quiz,        setQuiz]        = useState<Quiz[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState<Filter>('tous')
  const [deleting,    setDeleting]    = useState<string | null>(null)
  const [duplicating, setDuplicating] = useState<string | null>(null)

  // ── Fetch ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profil) return
    const load = async () => {
      const { data } = await supabase
        .from('quiz')
        .select('*, classes(nom,niveau)')
        .eq('enseignant_id', profil.id)
        .order('updated_at', { ascending: false })
      const list = data || []

      // Compter les questions pour chaque quiz
      const withCounts = await Promise.all(
        list.map(async (q: any) => {
          const { count } = await supabase
            .from('questions_quiz')
            .select('*', { count: 'exact', head: true })
            .eq('quiz_id', q.id)
          return { ...q, _nb_questions: count || 0 }
        })
      )
      setQuiz(withCounts)
      setLoading(false)
    }
    load()
  }, [profil])

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce quiz définitivement ?')) return
    setDeleting(id)
    await supabase.from('quiz').delete().eq('id', id)
    setQuiz(q => q.filter(x => x.id !== id))
    setDeleting(null)
  }

  const handleDuplicate = async (q: Quiz) => {
    setDuplicating(q.id)
    const { data: newQuiz } = await supabase
      .from('quiz')
      .insert({
        enseignant_id:     profil!.id,
        classe_id:         q.classe_id,
        titre:             `${q.titre} (copie)`,
        statut:            'brouillon',
        mode:              q.mode,
        source:            q.source,
        lien_ras:          q.lien_ras,
      })
      .select()
      .single()

    if (newQuiz) {
      const { data: questions } = await supabase
        .from('questions_quiz')
        .select('*')
        .eq('quiz_id', q.id)
      if (questions?.length) {
        await supabase.from('questions_quiz').insert(
          questions.map(({ id: _id, quiz_id: _qid, ...rest }) => ({ ...rest, quiz_id: newQuiz.id }))
        )
      }
      router.refresh()
      setQuiz(prev => [{ ...newQuiz, _nb_questions: questions?.length || 0 }, ...prev])
    }
    setDuplicating(null)
  }

  const handleLancer = async (q: Quiz) => {
    // Créer une session si pas déjà active
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    await supabase.from('quiz').update({ statut: 'actif', code_session: code }).eq('id', q.id)
    const { data: session } = await supabase
      .from('sessions_quiz')
      .insert({ quiz_id: q.id, statut: 'attente', mode: q.mode })
      .select()
      .single()
    if (session) {
      router.push(`/dashboard/outils/quiz/${q.id}/lancer?session=${session.id}`)
    }
  }

  if (authLoading || loading) return <LoadingScreen />

  const filtered = filter === 'tous' ? quiz : quiz.filter(q => q.statut === filter)

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/outils" onLogout={logout} />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Mes Quiz</div>
            <div className="topbar-sub">{quiz.length} quiz créé{quiz.length !== 1 ? 's' : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => router.push('/dashboard/outils/quiz/nouveau')}
              style={{ padding: '9px 18px', background: 'linear-gradient(135deg,#6B3FA0,#A78BFA)', color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              ✦ Créer un quiz
            </button>
          </div>
        </div>

        <div className="page-content fade-in">
          {/* Filtres */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
            {(['tous', 'brouillon', 'actif', 'termine'] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '6px 14px', borderRadius: 99, border: `1.5px solid ${filter === f ? '#A78BFA' : 'rgba(255,255,255,0.1)'}`, background: filter === f ? 'rgba(167,139,250,0.15)' : 'transparent', color: filter === f ? '#A78BFA' : 'var(--text-4)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize' }}>
                {f === 'tous' ? 'Tous' : STATUT_LABEL[f]}
                {f !== 'tous' && (
                  <span style={{ marginLeft: 6, opacity: 0.7 }}>
                    {quiz.filter(q => q.statut === f).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* État vide */}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 32px' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🎮</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                {filter === 'tous' ? 'Aucun quiz pour l\'instant' : `Aucun quiz "${STATUT_LABEL[filter]}"`}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 24 }}>
                Créez votre premier quiz interactif en moins de 2 minutes.
              </div>
              {filter === 'tous' && (
                <button onClick={() => router.push('/dashboard/outils/quiz/nouveau')}
                  style={{ padding: '11px 24px', background: 'linear-gradient(135deg,#6B3FA0,#A78BFA)', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  ✦ Créer mon premier quiz
                </button>
              )}
            </div>
          )}

          {/* Grille */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {filtered.map(q => (
              <QuizCard
                key={q.id}
                quiz={q}
                deleting={deleting === q.id}
                duplicating={duplicating === q.id}
                onEdit={()    => router.push(`/dashboard/outils/quiz/${q.id}`)}
                onLancer={()  => handleLancer(q)}
                onResultats={() => router.push(`/dashboard/outils/quiz/${q.id}/resultats`)}
                onDuplicate={() => handleDuplicate(q)}
                onDelete={()  => handleDelete(q.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Carte quiz ────────────────────────────────────────────────────────────────

function QuizCard({ quiz, deleting, duplicating, onEdit, onLancer, onResultats, onDuplicate, onDelete }: {
  quiz: Quiz
  deleting: boolean
  duplicating: boolean
  onEdit: () => void
  onLancer: () => void
  onResultats: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1.5px solid ${hovered ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 14, padding: '18px',
        transition: 'border-color 0.18s, box-shadow 0.18s',
        boxShadow: hovered ? '0 8px 24px rgba(167,139,250,0.08)' : 'none',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>

      {/* Titre + statut */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.4, flex: 1 }}>
          {quiz.titre}
        </div>
        <span style={{ padding: '2px 8px', background: `${STATUT_COLOR[quiz.statut]}20`, color: STATUT_COLOR[quiz.statut], borderRadius: 99, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
          {STATUT_LABEL[quiz.statut] || quiz.statut}
        </span>
      </div>

      {/* Métadonnées */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ padding: '2px 8px', background: `${MODE_COLOR[quiz.mode] || '#60A5FA'}18`, color: MODE_COLOR[quiz.mode] || '#60A5FA', borderRadius: 99, fontSize: 10, fontWeight: 600 }}>
          {MODE_LABEL[quiz.mode] || quiz.mode}
        </span>
        <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-4)', borderRadius: 99, fontSize: 10 }}>
          {quiz._nb_questions} question{(quiz._nb_questions || 0) !== 1 ? 's' : ''}
        </span>
        {quiz.classes && (
          <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-4)', borderRadius: 99, fontSize: 10 }}>
            {quiz.classes.nom}
          </span>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-5)', marginTop: -4 }}>
        Modifié le {new Date(quiz.updated_at).toLocaleDateString('fr-CA')}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12, flexWrap: 'wrap' }}>
        <button onClick={onLancer}
          style={{ flex: 1, padding: '7px 10px', background: 'linear-gradient(135deg,#1B3F6E,#2563EB)', color: 'white', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          ▶ Lancer
        </button>
        <button onClick={onEdit}
          title="Éditer"
          style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, color: 'var(--text-3)', fontSize: 12, cursor: 'pointer' }}>
          ✏
        </button>
        <button onClick={onResultats}
          title="Résultats"
          style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, color: 'var(--text-3)', fontSize: 12, cursor: 'pointer' }}>
          📊
        </button>
        <button onClick={onDuplicate} disabled={duplicating}
          title="Dupliquer"
          style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, color: 'var(--text-3)', fontSize: 12, cursor: duplicating ? 'wait' : 'pointer' }}>
          {duplicating ? '…' : '⎘'}
        </button>
        <button onClick={onDelete} disabled={deleting}
          title="Supprimer"
          style={{ padding: '7px 10px', background: deleting ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${deleting ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 7, color: deleting ? '#F87171' : 'var(--text-4)', fontSize: 12, cursor: deleting ? 'wait' : 'pointer' }}>
          {deleting ? '…' : '🗑'}
        </button>
      </div>
    </div>
  )
}
