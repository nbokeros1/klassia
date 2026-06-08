'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'
import { useAuth } from '@/lib/hooks/useAuth'

// ── Types ─────────────────────────────────────────────────────────────────────

type QuestionType = 'qcm' | 'vrai_faux' | 'reponse_courte'

type Question = {
  _tempId: string
  id?: string
  ordre: number
  type: QuestionType
  enonce: string
  image_url: string
  options: string[]
  bonne_reponse: string
  explication: string
  ras_lie: string
  points: number
  duree_secondes: number
  _open: boolean
}

type QuizForm = {
  titre: string
  classe_id: string
  mode: 'individuel' | 'equipes' | 'defi'
  nb_equipes: number
  mode_revision: boolean
  afficher_explication: boolean
  recompense_physique: string
  lien_rag: string
  lien_ras: string
  source: 'manuel' | 'ia_lecon' | 'ia_curriculum'
  lecon_id: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }

function emptyQuestion(ordre: number): Question {
  return {
    _tempId:         uid(),
    ordre,
    type:            'qcm',
    enonce:          '',
    image_url:       '',
    options:         ['', '', '', ''],
    bonne_reponse:   '',
    explication:     '',
    ras_lie:         '',
    points:          1000,
    duree_secondes:  20,
    _open:           true,
  }
}

const DEFAULT_FORM: QuizForm = {
  titre:               '',
  classe_id:           '',
  mode:                'individuel',
  nb_equipes:          2,
  mode_revision:       false,
  afficher_explication:false,
  recompense_physique: '',
  lien_rag:            '',
  lien_ras:            '',
  source:              'manuel',
  lecon_id:            '',
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function QuizEditorPage() {
  const { profil, loading: authLoading, logout } = useAuth()
  const router   = useRouter()
  const params   = useParams()
  const quizId   = params.id as string
  const isNew    = quizId === 'nouveau'
  const supabase = createClient()

  const [form,       setForm]       = useState<QuizForm>(DEFAULT_FORM)
  const [questions,  setQuestions]  = useState<Question[]>([emptyQuestion(1)])
  const [classes,    setClasses]    = useState<any[]>([])
  const [lecons,     setLecons]     = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genError,   setGenError]   = useState('')
  const [saved,      setSaved]      = useState(false)

  // IA params
  const [iaNb,         setIaNb]         = useState(10)
  const [iaTypes,      setIaTypes]      = useState<string[]>(['qcm', 'vrai_faux', 'reponse_courte'])
  const [iaDifficulte, setIaDifficulte] = useState('moyen')

  // ── Fetch initial ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profil) return
    const load = async () => {
      const { data: cls } = await supabase
        .from('classes').select('id,nom,niveau,matiere')
        .eq('enseignant_id', profil.id).order('nom')
      setClasses(cls || [])

      if (!isNew) {
        const { data: quiz } = await supabase
          .from('quiz').select('*').eq('id', quizId).single()
        if (quiz) {
          setForm({
            titre:               quiz.titre || '',
            classe_id:           quiz.classe_id || '',
            mode:                quiz.mode || 'individuel',
            nb_equipes:          quiz.nb_equipes || 2,
            mode_revision:       quiz.mode_revision || false,
            afficher_explication:quiz.afficher_explication || false,
            recompense_physique: quiz.recompense_physique || '',
            lien_rag:            quiz.lien_rag || '',
            lien_ras:            quiz.lien_ras || '',
            source:              quiz.source || 'manuel',
            lecon_id:            '',
          })
        }
        const { data: qs } = await supabase
          .from('questions_quiz').select('*')
          .eq('quiz_id', quizId).order('ordre')
        if (qs?.length) {
          setQuestions(qs.map(q => ({
            _tempId:        uid(),
            id:             q.id,
            ordre:          q.ordre,
            type:           q.type,
            enonce:         q.enonce,
            image_url:      q.image_url || '',
            options:        q.options || [],
            bonne_reponse:  q.bonne_reponse || '',
            explication:    q.explication || '',
            ras_lie:        q.ras_lie || '',
            points:         q.points || 1000,
            duree_secondes: q.duree_secondes || 20,
            _open:          false,
          })))
        }
      }
      setLoading(false)
    }
    load()
  }, [profil, quizId])

  // ── Fetch leçons quand classe change ──────────────────────────────────────
  useEffect(() => {
    if (!form.classe_id) { setLecons([]); return }
    const fetch = async () => {
      const { data } = await supabase
        .from('lecons').select('id,titre,contenu_json')
        .eq('classe_id', form.classe_id).order('updated_at', { ascending: false }).limit(30)
      setLecons(data || [])
    }
    fetch()
  }, [form.classe_id])

  // ── Mise à jour form ──────────────────────────────────────────────────────
  const setF = (k: keyof QuizForm, v: any) => setForm(f => ({ ...f, [k]: v }))

  // ── Questions helpers ─────────────────────────────────────────────────────
  const addQuestion = () =>
    setQuestions(qs => [...qs, emptyQuestion(qs.length + 1)])

  const updateQuestion = (tempId: string, patch: Partial<Question>) =>
    setQuestions(qs => qs.map(q => q._tempId === tempId ? { ...q, ...patch } : q))

  const removeQuestion = (tempId: string) =>
    setQuestions(qs => qs.filter(q => q._tempId !== tempId).map((q, i) => ({ ...q, ordre: i + 1 })))

  const moveQuestion = (tempId: string, dir: -1 | 1) => {
    setQuestions(qs => {
      const idx = qs.findIndex(q => q._tempId === tempId)
      const next = idx + dir
      if (next < 0 || next >= qs.length) return qs
      const arr = [...qs]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr.map((q, i) => ({ ...q, ordre: i + 1 }))
    })
  }

  const setOption = (tempId: string, optIdx: number, val: string) =>
    setQuestions(qs => qs.map(q => {
      if (q._tempId !== tempId) return q
      const opts = [...q.options]
      opts[optIdx] = val
      return { ...q, options: opts }
    }))

  // ── Génération IA ─────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setGenError('')
    try {
      const lecon = lecons.find(l => l.id === form.lecon_id)
      const contenuLecon = lecon?.contenu_json
        ? Object.values(lecon.contenu_json as Record<string, string>).join('\n')
        : ''
      const classe = classes.find(c => c.id === form.classe_id)

      const res = await fetch('/api/ia/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source:         form.source,
          lecon_id:       form.lecon_id || null,
          contenu_lecon:  contenuLecon,
          ras:            form.lien_ras,
          rag:            form.lien_rag,
          matiere:        classe?.matiere || '',
          niveau:         classe?.niveau  || '',
          nb_questions:   iaNb,
          types:          iaTypes,
          langue:         'fr',
          difficulte:     iaDifficulte,
          mode_revision:  form.mode_revision,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setGenError(data.error || 'Erreur lors de la génération')
        return
      }
      const generated: Question[] = (data.questions || []).map((q: any) => ({
        _tempId:        uid(),
        ordre:          q.ordre,
        type:           q.type,
        enonce:         q.enonce,
        image_url:      q.image_url || '',
        options:        q.type === 'vrai_faux' ? ['Vrai', 'Faux'] : (q.options || []),
        bonne_reponse:  q.bonne_reponse,
        explication:    q.explication || '',
        ras_lie:        q.ras_lie || '',
        points:         q.points || 1000,
        duree_secondes: q.duree_secondes || 20,
        _open:          false,
      }))
      setQuestions(generated)
    } catch (e: any) {
      setGenError(e.message || 'Erreur réseau')
    } finally {
      setGenerating(false)
    }
  }, [form, lecons, classes, iaNb, iaTypes, iaDifficulte])

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  const handleSave = async (andLaunch = false) => {
    if (!form.titre.trim()) { alert('Le titre est requis.'); return }
    setSaving(true)

    const quizPayload = {
      enseignant_id:        profil!.id,
      classe_id:            form.classe_id || null,
      titre:                form.titre.trim(),
      statut:               andLaunch ? 'actif' : 'brouillon',
      mode:                 form.mode,
      nb_equipes:           form.nb_equipes,
      mode_revision:        form.mode_revision,
      afficher_explication: form.afficher_explication,
      recompense_physique:  form.recompense_physique || null,
      lien_rag:             form.lien_rag || null,
      lien_ras:             form.lien_ras || null,
      source:               form.source,
    }

    let savedId = quizId
    if (isNew) {
      const { data } = await supabase.from('quiz').insert(quizPayload).select().single()
      if (!data) { setSaving(false); return }
      savedId = data.id
    } else {
      await supabase.from('quiz').update(quizPayload).eq('id', quizId)
      await supabase.from('questions_quiz').delete().eq('quiz_id', quizId)
    }

    // Insérer questions
    const qRows = questions.map(q => ({
      quiz_id:        savedId,
      ordre:          q.ordre,
      type:           q.type,
      enonce:         q.enonce,
      options:        q.options,
      bonne_reponse:  q.bonne_reponse,
      explication:    q.explication || null,
      ras_lie:        q.ras_lie || null,
      image_url:      q.image_url || null,
      points:         q.points,
      duree_secondes: q.duree_secondes,
    }))
    if (qRows.length) await supabase.from('questions_quiz').insert(qRows)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)

    if (andLaunch) {
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      await supabase.from('quiz').update({ code_session: code }).eq('id', savedId)
      const { data: session } = await supabase
        .from('sessions_quiz').insert({ quiz_id: savedId, statut: 'attente', mode: form.mode })
        .select().single()
      if (session) router.push(`/dashboard/outils/quiz/${savedId}/lancer?session=${session.id}`)
    } else if (isNew) {
      router.replace(`/dashboard/outils/quiz/${savedId}`)
    }
  }

  if (authLoading || loading) return <LoadingScreen />

  const selectedClasse = classes.find(c => c.id === form.classe_id)

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/outils" onLogout={logout} />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">{isNew ? 'Nouveau quiz' : 'Éditer le quiz'}</div>
            <div className="topbar-sub">
              <span style={{ color: 'var(--text-4)', cursor: 'pointer' }} onClick={() => router.push('/dashboard/outils/quiz')}>
                ← Mes quiz
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {saved && <span style={{ fontSize: 12, color: '#34D399', alignSelf: 'center' }}>✓ Sauvegardé</span>}
            <button onClick={() => handleSave(false)} disabled={saving}
              style={{ padding: '9px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? '...' : 'Sauvegarder brouillon'}
            </button>
            <button onClick={() => handleSave(true)} disabled={saving}
              style={{ padding: '9px 18px', background: 'linear-gradient(135deg,#6B3FA0,#A78BFA)', color: 'white', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? '...' : 'Sauvegarder et lancer ▶'}
            </button>
          </div>
        </div>

        <div className="page-content fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>

            {/* ── GAUCHE : Paramètres ──────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Titre */}
              <Card title="Informations">
                <Label>Titre du quiz *</Label>
                <input value={form.titre} onChange={e => setF('titre', e.target.value)}
                  placeholder="Ex : Quiz — Mitose et méiose"
                  style={inputStyle} />

                <Label>Classe liée</Label>
                <select value={form.classe_id} onChange={e => setF('classe_id', e.target.value)}
                  style={inputStyle}>
                  <option value="">— Aucune classe —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.nom} — {c.niveau}</option>)}
                </select>
              </Card>

              {/* Mode */}
              <Card title="Mode de jeu">
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['individuel', 'equipes', 'defi'] as const).map(m => (
                    <button key={m} onClick={() => setF('mode', m)}
                      style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: `1.5px solid ${form.mode === m ? '#A78BFA' : 'rgba(255,255,255,0.1)'}`, background: form.mode === m ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)', color: form.mode === m ? '#A78BFA' : 'var(--text-4)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
                      {m === 'individuel' ? '👤 Individuel' : m === 'equipes' ? '👥 Équipes' : '⚔ Défi'}
                    </button>
                  ))}
                </div>
                {form.mode === 'equipes' && (
                  <div style={{ marginTop: 8 }}>
                    <Label>Nombre d&apos;équipes</Label>
                    <input type="number" min={2} max={6} value={form.nb_equipes}
                      onChange={e => setF('nb_equipes', parseInt(e.target.value))}
                      style={{ ...inputStyle, width: 80 }} />
                  </div>
                )}
              </Card>

              {/* Options */}
              <Card title="Options">
                <Toggle label="Mode révision" sub="L'IA repose les questions ratées" value={form.mode_revision} onChange={v => setF('mode_revision', v)} />
                <Toggle label="Afficher explications" sub="Après chaque question" value={form.afficher_explication} onChange={v => setF('afficher_explication', v)} />

                <Label>Récompense physique (optionnel)</Label>
                <input value={form.recompense_physique} onChange={e => setF('recompense_physique', e.target.value)}
                  placeholder="Ex : Bonbon, devoir annulé..."
                  style={inputStyle} />
              </Card>

              {/* Curriculum */}
              <Card title="Lien curriculum">
                <Label>RAG (Résultat d&apos;apprentissage général)</Label>
                <input value={form.lien_rag} onChange={e => setF('lien_rag', e.target.value)}
                  placeholder="Ex : L'élève développera une compréhension de..."
                  style={inputStyle} />
                <Label>RAS (Résultat d&apos;apprentissage spécifique)</Label>
                <input value={form.lien_ras} onChange={e => setF('lien_ras', e.target.value)}
                  placeholder="Ex : 5.3.a – Décrire les phases de la mitose"
                  style={inputStyle} />
              </Card>

              {/* Source IA */}
              <Card title="Source des questions">
                {([
                  { val: 'manuel',        label: '✏ Manuel',          sub: 'Saisie manuelle' },
                  { val: 'ia_lecon',      label: '✦ Depuis une leçon', sub: 'IA analyse ton contenu' },
                  { val: 'ia_curriculum', label: '✦ Depuis RAS/RAG',   sub: 'IA aligne sur le curriculum' },
                ] as const).map(s => (
                  <label key={s.val} onClick={() => setF('source', s.val)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: form.source === s.val ? 'rgba(167,139,250,0.1)' : 'transparent', border: `1px solid ${form.source === s.val ? 'rgba(167,139,250,0.3)' : 'transparent'}`, transition: 'all 0.15s' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${form.source === s.val ? '#A78BFA' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {form.source === s.val && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#A78BFA' }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: form.source === s.val ? '#A78BFA' : 'var(--text-2)', lineHeight: 1.3 }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-5)', marginTop: 1 }}>{s.sub}</div>
                    </div>
                  </label>
                ))}

                {(form.source === 'ia_lecon' || form.source === 'ia_curriculum') && (
                  <div style={{ marginTop: 8, padding: '12px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 10 }}>
                    {form.source === 'ia_lecon' && (
                      <>
                        <Label>Leçon source</Label>
                        <select value={form.lecon_id} onChange={e => setF('lecon_id', e.target.value)}
                          style={{ ...inputStyle, marginBottom: 8 }}>
                          <option value="">— Choisir une leçon —</option>
                          {lecons.map(l => <option key={l.id} value={l.id}>{l.titre}</option>)}
                        </select>
                      </>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <Label>Nb de questions</Label>
                        <input type="number" min={5} max={20} value={iaNb}
                          onChange={e => setIaNb(parseInt(e.target.value))}
                          style={inputStyle} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Label>Difficulté</Label>
                        <select value={iaDifficulte} onChange={e => setIaDifficulte(e.target.value)}
                          style={inputStyle}>
                          <option value="facile">Facile</option>
                          <option value="moyen">Moyen</option>
                          <option value="difficile">Difficile</option>
                        </select>
                      </div>
                    </div>

                    <Label>Types de questions</Label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      {['qcm', 'vrai_faux', 'reponse_courte'].map(t => (
                        <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: iaTypes.includes(t) ? '#A78BFA' : 'var(--text-4)' }}>
                          <input type="checkbox" checked={iaTypes.includes(t)}
                            onChange={e => setIaTypes(prev => e.target.checked ? [...prev, t] : prev.filter(x => x !== t))}
                            style={{ accentColor: '#A78BFA' }} />
                          {t === 'qcm' ? 'QCM' : t === 'vrai_faux' ? 'Vrai/Faux' : 'Réponse courte'}
                        </label>
                      ))}
                    </div>

                    {genError && <div style={{ fontSize: 11, color: '#F87171', marginBottom: 8 }}>{genError}</div>}

                    <button onClick={handleGenerate} disabled={generating}
                      style={{ width: '100%', padding: '9px', background: generating ? 'rgba(167,139,250,0.1)' : 'linear-gradient(135deg,#6B3FA0,#A78BFA)', color: generating ? '#A78BFA' : 'white', border: generating ? '1px solid rgba(167,139,250,0.3)' : 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: generating ? 'wait' : 'pointer' }}>
                      {generating ? '✦ Génération en cours...' : '✦ Générer les questions'}
                    </button>

                    {/* Skeleton */}
                    {generating && (
                      <div style={{ marginTop: 10 }}>
                        {[1,2,3].map(i => (
                          <div key={i} style={{ height: 12, background: 'rgba(167,139,250,0.15)', borderRadius: 6, marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite', opacity: 1 - i * 0.2 }} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* ── DROITE : Éditeur questions ───────────────────────────────── */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
                  Questions ({questions.length})
                </div>
                <button onClick={addQuestion}
                  style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  + Ajouter une question
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {questions.map((q, idx) => (
                  <QuestionEditor
                    key={q._tempId}
                    q={q}
                    idx={idx}
                    total={questions.length}
                    onChange={patch => updateQuestion(q._tempId, patch)}
                    onRemove={() => removeQuestion(q._tempId)}
                    onMove={dir => moveQuestion(q._tempId, dir)}
                    onSetOption={(oi, v) => setOption(q._tempId, oi, v)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-4)', marginBottom: 4, marginTop: 8 }}>{children}</div>
}

function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-5)' }}>{sub}</div>}
      </div>
      <button onClick={() => onChange(!value)}
        style={{ width: 36, height: 20, borderRadius: 99, background: value ? '#A78BFA' : 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 2, left: value ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
      </button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, fontSize: 12, color: 'var(--text-1)', outline: 'none',
  boxSizing: 'border-box',
}

const TYPE_LABELS: Record<QuestionType, string> = {
  qcm:            'QCM',
  vrai_faux:      'Vrai / Faux',
  reponse_courte: 'Réponse courte',
}
const DUREE_OPTIONS = [10, 15, 20, 30, 60]
const POINTS_OPTIONS = [500, 750, 1000, 2000]
const OPTION_COLORS = ['#F87171', '#60A5FA', '#34D399', '#F59E0B']

function QuestionEditor({ q, idx, total, onChange, onRemove, onMove, onSetOption }: {
  q: Question
  idx: number
  total: number
  onChange: (patch: Partial<Question>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onSetOption: (i: number, v: string) => void
}) {
  const options = q.type === 'vrai_faux' ? ['Vrai', 'Faux'] : (q.options.length === 4 ? q.options : ['', '', '', ''])

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', cursor: 'pointer' }}
        onClick={() => onChange({ _open: !q._open })}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(167,139,250,0.2)', color: '#A78BFA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          {idx + 1}
        </span>
        <span style={{ flex: 1, fontSize: 13, color: q.enonce ? 'var(--text-1)' : 'var(--text-5)', fontStyle: q.enonce ? 'normal' : 'italic' }}>
          {q.enonce || 'Question sans énoncé...'}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-5)', marginRight: 4 }}>{TYPE_LABELS[q.type]}</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {idx > 0        && <Btn onClick={e => { e.stopPropagation(); onMove(-1) }}>↑</Btn>}
          {idx < total-1  && <Btn onClick={e => { e.stopPropagation(); onMove(1)  }}>↓</Btn>}
          <Btn danger onClick={e => { e.stopPropagation(); onRemove() }}>✕</Btn>
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-5)' }}>{q._open ? '▲' : '▼'}</span>
      </div>

      {q._open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Type */}
          <div style={{ display: 'flex', gap: 6, marginTop: 12, marginBottom: 10 }}>
            {(['qcm', 'vrai_faux', 'reponse_courte'] as QuestionType[]).map(t => (
              <button key={t} onClick={() => {
                const newOpts = t === 'vrai_faux' ? ['Vrai','Faux'] : t === 'qcm' ? ['','','',''] : []
                onChange({ type: t, options: newOpts, bonne_reponse: '' })
              }}
                style={{ padding: '4px 10px', borderRadius: 7, border: `1.5px solid ${q.type === t ? '#A78BFA' : 'rgba(255,255,255,0.1)'}`, background: q.type === t ? 'rgba(167,139,250,0.15)' : 'transparent', color: q.type === t ? '#A78BFA' : 'var(--text-4)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Énoncé */}
          <textarea value={q.enonce} onChange={e => onChange({ enonce: e.target.value })}
            placeholder="Rédigez votre question ici..."
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />

          {/* Options */}
          {q.type !== 'reponse_courte' && (
            <div style={{ marginTop: 8 }}>
              <Label>Options de réponse — cliquez sur ✓ pour la bonne réponse</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {options.map((opt, oi) => (
                  <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: OPTION_COLORS[oi], flexShrink: 0 }} />
                    <input value={opt}
                      onChange={e => q.type !== 'vrai_faux' && onSetOption(oi, e.target.value)}
                      readOnly={q.type === 'vrai_faux'}
                      placeholder={`Option ${oi + 1}`}
                      style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={() => onChange({ bonne_reponse: opt || options[oi] })}
                      title="Marquer comme bonne réponse"
                      style={{ width: 28, height: 28, borderRadius: 6, border: `1.5px solid ${q.bonne_reponse === (opt || options[oi]) ? '#34D399' : 'rgba(255,255,255,0.1)'}`, background: q.bonne_reponse === (opt || options[oi]) ? 'rgba(52,211,153,0.2)' : 'transparent', color: q.bonne_reponse === (opt || options[oi]) ? '#34D399' : 'var(--text-5)', fontSize: 12, cursor: 'pointer' }}>
                      ✓
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {q.type === 'reponse_courte' && (
            <>
              <Label>Réponse attendue</Label>
              <input value={q.bonne_reponse} onChange={e => onChange({ bonne_reponse: e.target.value })}
                placeholder="Réponse correcte"
                style={inputStyle} />
            </>
          )}

          {/* Explication */}
          <Label>Explication pédagogique</Label>
          <textarea value={q.explication} onChange={e => onChange({ explication: e.target.value })}
            placeholder="Explication courte après la question..."
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' }} />

          {/* Durée + Points */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <Label>Durée</Label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {DUREE_OPTIONS.map(d => (
                  <button key={d} onClick={() => onChange({ duree_secondes: d })}
                    style={{ padding: '4px 8px', borderRadius: 6, border: `1.5px solid ${q.duree_secondes === d ? '#60A5FA' : 'rgba(255,255,255,0.08)'}`, background: q.duree_secondes === d ? 'rgba(96,165,250,0.15)' : 'transparent', color: q.duree_secondes === d ? '#60A5FA' : 'var(--text-5)', fontSize: 11, cursor: 'pointer' }}>
                    {d}s
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <Label>Points</Label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {POINTS_OPTIONS.map(p => (
                  <button key={p} onClick={() => onChange({ points: p })}
                    style={{ padding: '4px 8px', borderRadius: 6, border: `1.5px solid ${q.points === p ? '#F59E0B' : 'rgba(255,255,255,0.08)'}`, background: q.points === p ? 'rgba(245,158,11,0.15)' : 'transparent', color: q.points === p ? '#F59E0B' : 'var(--text-5)', fontSize: 11, cursor: 'pointer' }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Btn({ children, onClick, danger }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid rgba(255,255,255,0.08)', background: danger ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.04)', color: danger ? '#F87171' : 'var(--text-5)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </button>
  )
}
