'use client'

// ─── SPIE-BETA-03 — DetailedLessonView ───────────────────────────────────────
// Affiche la première leçon détaillée d'un Teaching Pack.
// Sections collapsables, boutons d'action, régénération ciblée.
//
// RÈGLES :
// - Le corrigé n'est jamais affiché par défaut (section protégée)
// - "Powered by Claude" n'apparaît jamais
// - Les notes privées ne sont jamais incluses dans les exports

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { DetailedLesson, LessonRegenerateTarget } from '@/lib/types/detailed-lesson'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Section({
  id, titre, icon, defaultOpen = false, children, badge,
}: {
  id: string; titre: string; icon: string; defaultOpen?: boolean
  children: React.ReactNode; badge?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 12, borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
          background: open ? 'rgba(127,119,221,0.06)' : 'rgba(255,255,255,0.02)',
          border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{titre}</span>
        {badge && (
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(127,119,221,0.12)', color: '#7F77DD' }}>
            {badge}
          </span>
        )}
        <span style={{ fontSize: 10, color: 'var(--text-4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid var(--border)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Tag({ label, color = '#7F77DD' }: { label: string; color?: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 6,
      background: `${color}18`, color, fontSize: 11, fontWeight: 600, marginRight: 4, marginBottom: 4,
    }}>
      {label}
    </span>
  )
}

function Item({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
      <span style={{ color: '#7F77DD', fontWeight: 700, flexShrink: 0 }}>•</span>
      <span style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.6 }}>{text}</span>
    </div>
  )
}

// ─── Bouton régénérer ─────────────────────────────────────────────────────────

function RegenerateBtn({
  target, fichier_id, onDone, disabled,
}: {
  target: LessonRegenerateTarget; fichier_id: string; onDone: (dl: Partial<DetailedLesson>) => void; disabled?: boolean
}) {
  const [loading, setLoading] = useState(false)

  const handleRegen = async () => {
    if (loading || disabled) return
    setLoading(true)
    try {
      const res = await fetch('/api/spie/lesson-regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fichier_id, target }),
      })
      if (res.ok) {
        const data = await res.json()
        onDone(data.patch ?? {})
      }
    } catch { /* non-bloquant */ }
    setLoading(false)
  }

  return (
    <button
      onClick={handleRegen}
      disabled={loading || disabled}
      title={`Régénérer : ${target}`}
      style={{
        padding: '3px 10px', borderRadius: 6,
        background: loading ? 'rgba(127,119,221,0.06)' : 'rgba(127,119,221,0.1)',
        border: '1px solid rgba(127,119,221,0.25)', color: '#7F77DD',
        fontSize: 10, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {loading ? '⏳' : '↺'} Régénérer
    </button>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function DetailedLessonView({
  lecon: initialLecon,
  classeId,
  fichier_id,
  onRestart,
}: {
  lecon: DetailedLesson
  classeId: string
  fichier_id: string
  onRestart?: () => void
}) {
  const router = useRouter()
  const [lecon, setLecon] = useState<DetailedLesson>(initialLecon)
  const [showCorrige, setShowCorrige] = useState(false)
  const [toEnseignerLoading, setToEnseignerLoading] = useState(false)
  const [toQuizLoading, setToQuizLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [exportLoading, setExportLoading] = useState(false)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const patchLecon = useCallback((patch: Partial<DetailedLesson>) => {
    setLecon(prev => ({ ...prev, ...patch }))
  }, [])

  const handleEnseigner = async () => {
    setToEnseignerLoading(true)
    try {
      const res = await fetch('/api/spie/lesson-to-enseigner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fichier_id }),
      })
      if (res.ok) {
        const { lecon_id } = await res.json()
        router.push(`/dashboard/gerer/enseigner/${lecon_id}`)
      } else {
        showToast('Erreur lors du transfert vers Enseigner.', false)
      }
    } catch {
      showToast('Erreur réseau.', false)
    }
    setToEnseignerLoading(false)
  }

  const handleQuiz = async () => {
    setToQuizLoading(true)
    try {
      const res = await fetch('/api/spie/lesson-to-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fichier_id }),
      })
      if (res.ok) {
        const { quiz_id } = await res.json()
        router.push(`/dashboard/outils/quiz/${quiz_id}`)
      } else {
        showToast('Erreur lors de la création du quiz.', false)
      }
    } catch {
      showToast('Erreur réseau.', false)
    }
    setToQuizLoading(false)
  }

  const handlePreparer = () => {
    router.push(`/dashboard/gerer/preparer?classe_id=${classeId}&lecon_id=${fichier_id}&action=open_lesson`)
  }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const res = await fetch('/api/spie/pack-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fichier_id, type: 'lecon_detaillee' }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${lecon.titre.replace(/[^a-zA-Z0-9]/g, '_')}_lecon.docx`
        a.click()
        URL.revokeObjectURL(url)
        showToast('Export DOCX téléchargé ✓')
      } else if (res.status === 403) {
        showToast('Export disponible avec le forfait Pro.', false)
      } else {
        showToast('Erreur lors de l\'export.', false)
      }
    } catch {
      showToast('Erreur réseau.', false)
    }
    setExportLoading(false)
  }

  const qualite = lecon.qualite_json

  return (
    <div style={{ position: 'relative' }}>
      {/* ── Toast ─────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          padding: '12px 20px', borderRadius: 10,
          background: toast.ok ? 'rgba(52,211,153,0.18)' : 'rgba(248,113,113,0.18)',
          border: `1px solid ${toast.ok ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'}`,
          color: toast.ok ? '#34D399' : '#F87171',
          fontSize: 13, fontWeight: 600, backdropFilter: 'blur(8px)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── En-tête ───────────────────────────────────────────────── */}
      <div style={{
        padding: '20px 0 16px', borderBottom: '1px solid var(--border)', marginBottom: 16,
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start',
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6 }}>
            {lecon.titre}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <Tag label={lecon.matiere} />
            <Tag label={lecon.niveau} color="#34D399" />
            <Tag label={`${lecon.duree_minutes} min`} color="#FBC34A" />
            {lecon.province && <Tag label={lecon.province.toUpperCase()} color="#60A5FA" />}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handlePreparer}
            style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(127,119,221,0.12)', border: '1px solid rgba(127,119,221,0.3)', color: '#7F77DD', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ✏️ Préparer
          </button>
          <button onClick={handleEnseigner} disabled={toEnseignerLoading}
            style={{ padding: '8px 14px', borderRadius: 8, background: toEnseignerLoading ? 'rgba(52,211,153,0.05)' : 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', color: '#34D399', fontSize: 12, fontWeight: 600, cursor: toEnseignerLoading ? 'wait' : 'pointer' }}>
            {toEnseignerLoading ? '⏳' : '▶'} Enseigner
          </button>
          <button onClick={handleQuiz} disabled={toQuizLoading}
            style={{ padding: '8px 14px', borderRadius: 8, background: toQuizLoading ? 'rgba(96,165,250,0.05)' : 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)', color: '#60A5FA', fontSize: 12, fontWeight: 600, cursor: toQuizLoading ? 'wait' : 'pointer' }}>
            {toQuizLoading ? '⏳' : '🎮'} Quiz
          </button>
          <button onClick={handleExport} disabled={exportLoading}
            style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 12, fontWeight: 600, cursor: exportLoading ? 'wait' : 'pointer' }}>
            {exportLoading ? '⏳' : '📥'} DOCX
          </button>
          {onRestart && (
            <button onClick={onRestart}
              style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-4)', fontSize: 12, cursor: 'pointer' }}>
              ↺ Relancer
            </button>
          )}
        </div>
      </div>

      {/* ── Quality Gate badge ────────────────────────────────────── */}
      {qualite && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 8,
          background: qualite.peut_marquer_pret ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${qualite.peut_marquer_pret ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
          display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: qualite.peut_marquer_pret ? '#34D399' : '#F87171' }}>
            {qualite.peut_marquer_pret ? '✓ Prête à enseigner' : '⚠ Leçon incomplète'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {qualite.erreurs_bloquantes} erreur · {qualite.avertissements} avert. · {qualite.recommandations} reco.
          </span>
        </div>
      )}

      {/* ── Section 1 : Objectifs ─────────────────────────────────── */}
      <Section id="objectifs" titre="Objectifs d'apprentissage" icon="🎯" defaultOpen badge={String(lecon.objectifs?.length ?? 0)}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <RegenerateBtn target="objectifs" fichier_id={fichier_id} onDone={patch => patchLecon(patch)} />
        </div>
        {lecon.objectifs?.map(obj => (
          <div key={obj.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{obj.enonce}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Critère : {obj.critere_reussite}</div>
            {obj.taxonomy && <Tag label={obj.taxonomy} color="#A78BFA" />}
          </div>
        ))}
        {lecon.alignment?.rag?.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 4 }}>Résultats curriculaires (RAG)</div>
            {lecon.alignment.rag.map((r, i) => <Item key={i} text={r} />)}
          </div>
        )}
      </Section>

      {/* ── Section 2 : Déroulement ───────────────────────────────── */}
      <Section id="deroulement" titre="Déroulement de la leçon" icon="🗓" defaultOpen badge={`${lecon.duree_minutes} min`}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <RegenerateBtn target="phases" fichier_id={fichier_id} onDone={patch => patchLecon(patch)} />
        </div>
        {lecon.phases?.map(phase => (
          <div key={phase.phase} style={{ marginBottom: 14 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
              padding: '6px 10px', borderRadius: 6,
              background: phase.phase === 'avant' ? 'rgba(96,165,250,0.08)' : phase.phase === 'pendant' ? 'rgba(52,211,153,0.08)' : 'rgba(251,195,74,0.08)',
              border: `1px solid ${phase.phase === 'avant' ? 'rgba(96,165,250,0.2)' : phase.phase === 'pendant' ? 'rgba(52,211,153,0.2)' : 'rgba(251,195,74,0.2)'}`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>
                {phase.phase === 'avant' ? '⏰ Avant' : phase.phase === 'pendant' ? '📚 Pendant' : '✅ Après'} — {phase.label}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-4)', marginLeft: 'auto' }}>{phase.duree_minutes} min</span>
            </div>
            {phase.elements?.map((el, i) => (
              <div key={i} style={{ marginLeft: 12, marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)' }}>{el.titre}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{el.contenu}</div>
              </div>
            ))}
          </div>
        ))}
        {lecon.time_verification?.avertissement && (
          <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, background: 'rgba(251,195,74,0.08)', border: '1px solid rgba(251,195,74,0.25)', fontSize: 11, color: '#FBC34A' }}>
            ⚠ {lecon.time_verification.avertissement}
          </div>
        )}
      </Section>

      {/* ── Section 3 : Contenu pédagogique ─────────────────────────── */}
      <Section id="contenu" titre="Contenu à enseigner" icon="📖" badge={String(lecon.sections_contenu?.length ?? 0)}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <RegenerateBtn target="contenu" fichier_id={fichier_id} onDone={patch => patchLecon(patch)} />
        </div>
        {lecon.sections_contenu?.map(s => (
          <div key={s.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
              {s.titre && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{s.titre}</span>}
              <Tag label={s.type} color="#A78BFA" />
              {s.duree_estimee_minutes && <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{s.duree_estimee_minutes} min</span>}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.contenu}</div>
          </div>
        ))}
      </Section>

      {/* ── Section 4 : Activités ─────────────────────────────────── */}
      <Section id="activites" titre="Activités prêtes à utiliser" icon="🔬" badge={String(lecon.activites?.length ?? 0)}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <RegenerateBtn target="activites" fichier_id={fichier_id} onDone={patch => patchLecon(patch)} />
        </div>
        {lecon.activites?.map(act => (
          <div key={act.id} style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)' }}>{act.titre}</span>
              <Tag label={act.type} />
              <Tag label={`${act.duree_minutes} min`} color="#FBC34A" />
              <Tag label={act.taille_groupe} color="#60A5FA" />
              {act.statut === 'optionnelle' && <Tag label="Optionnelle" color="#94A3B8" />}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>
              <span style={{ fontWeight: 700 }}>Intention :</span> {act.intention_pedagogique}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 3 }}>Enseignant</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{act.consignes_enseignant}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 3 }}>Élèves</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{act.consignes_eleves}</div>
              </div>
            </div>
            {act.differentiation && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {act.differentiation.soutien && <div style={{ flex: 1, minWidth: 120, padding: '5px 8px', borderRadius: 5, background: 'rgba(251,195,74,0.06)', border: '1px solid rgba(251,195,74,0.15)', fontSize: 10, color: 'var(--text-3)' }}><span style={{ fontWeight: 700, color: '#FBC34A' }}>Soutien : </span>{act.differentiation.soutien}</div>}
                {act.differentiation.enrichissement && <div style={{ flex: 1, minWidth: 120, padding: '5px 8px', borderRadius: 5, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', fontSize: 10, color: 'var(--text-3)' }}><span style={{ fontWeight: 700, color: '#34D399' }}>Enrichissement : </span>{act.differentiation.enrichissement}</div>}
              </div>
            )}
          </div>
        ))}
      </Section>

      {/* ── Section 5 : Évaluation formative ─────────────────────── */}
      <Section id="eval_formative" titre="Évaluation formative" icon="📋">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <RegenerateBtn target="evaluation_formative" fichier_id={fichier_id} onDone={patch => patchLecon(patch)} />
        </div>
        {lecon.evaluation_formative && (
          <>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>Méthode : {lecon.evaluation_formative.methode}</div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 4 }}>Critères</div>
              {lecon.evaluation_formative.criteres?.map((c, i) => <Item key={i} text={c} />)}
            </div>
            {lecon.evaluation_formative.retroaction_possible && (
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                <span style={{ fontWeight: 700 }}>Rétroaction : </span>{lecon.evaluation_formative.retroaction_possible}
              </div>
            )}
          </>
        )}
      </Section>

      {/* ── Section 6 : Différenciation ───────────────────────────── */}
      <Section id="diff" titre="Différenciation et inclusion" icon="♿">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <RegenerateBtn target="differentiation" fichier_id={fichier_id} onDone={patch => patchLecon(patch)} />
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-4)', marginBottom: 10, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
          Ces adaptations sont des options pédagogiques. Elles ne diagnostiquent pas les élèves.
        </div>
        {lecon.differentiation?.map(d => (
          <div key={d.type} style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 7, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: d.type === 'soutien' ? '#FBC34A' : d.type === 'adaptation' ? '#60A5FA' : '#34D399', marginBottom: 4 }}>
              {d.type === 'soutien' ? '🟡 Soutien' : d.type === 'adaptation' ? '🔵 Adaptation' : '🟢 Enrichissement'}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 4 }}>{d.description}</div>
            {d.consignes_modifiees && <div style={{ fontSize: 11, color: 'var(--text-3)' }}><span style={{ fontWeight: 700 }}>Consignes modifiées : </span>{d.consignes_modifiees}</div>}
            {d.extension && <div style={{ fontSize: 11, color: 'var(--text-3)' }}><span style={{ fontWeight: 700 }}>Extension : </span>{d.extension}</div>}
          </div>
        ))}
      </Section>

      {/* ── Section 7 : Quiz ──────────────────────────────────────── */}
      <Section id="quiz" titre="Quiz" icon="🎮" badge={String(lecon.quiz?.questions?.length ?? 0) + ' questions'}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)' }}>{lecon.quiz?.titre}</div>
            <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{lecon.quiz?.duree_estimee_minutes} min · {lecon.quiz?.instructions}</div>
          </div>
          <RegenerateBtn target="quiz" fichier_id={fichier_id} onDone={patch => patchLecon(patch)} />
        </div>
        {lecon.quiz?.questions?.map((q, i) => (
          <div key={q.id} style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 7, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', flexShrink: 0, marginTop: 2 }}>Q{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, color: 'var(--text-1)', marginBottom: 4 }}>{q.enonce}</div>
                {q.options && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                    {q.options.map((opt, j) => (
                      <span key={j} style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11,
                        background: opt === q.bonne_reponse ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${opt === q.bonne_reponse ? 'rgba(52,211,153,0.3)' : 'var(--border)'}`,
                        color: opt === q.bonne_reponse ? '#34D399' : 'var(--text-3)',
                        fontWeight: opt === q.bonne_reponse ? 700 : 400,
                      }}>
                        {opt}
                      </span>
                    ))}
                  </div>
                )}
                <Tag label={q.type} color="#A78BFA" />
                {q.difficulte && <Tag label={q.difficulte} color="#FBC34A" />}
              </div>
            </div>
          </div>
        ))}
      </Section>

      {/* ── Section 8 : Corrigé (protégé) ────────────────────────── */}
      <Section id="corrige" titre="Corrigé enseignant" icon="🔐">
        <div style={{ padding: '10px 14px', borderRadius: 7, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#F87171', marginBottom: 3 }}>Document enseignant — ne pas projeter</div>
          <div style={{ fontSize: 11, color: 'var(--text-4)' }}>Le corrigé n'est jamais visible dans le mode élève ou le mode projection.</div>
        </div>
        {!showCorrige ? (
          <button onClick={() => setShowCorrige(true)} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer' }}>
            Afficher le corrigé
          </button>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <RegenerateBtn target="corrige" fichier_id={fichier_id} onDone={patch => patchLecon(patch)} />
              <button onClick={() => setShowCorrige(false)} style={{ padding: '3px 10px', borderRadius: 6, background: 'none', border: '1px solid var(--border)', color: 'var(--text-4)', fontSize: 10, cursor: 'pointer' }}>Masquer</button>
            </div>
            {lecon.corrige?.map((c, i) => (
              <div key={c.question_id} style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 7, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>Q{i + 1} — Réponse attendue</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-1)', marginBottom: 6 }}>{c.reponse_attendue}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Justification : </span>{c.justification}</div>
                {c.retroaction_courte && <div style={{ fontSize: 11, color: '#34D399' }}><span style={{ fontWeight: 700 }}>Rétroaction : </span>{c.retroaction_courte}</div>}
                {c.erreurs_frequentes?.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 10, color: '#F87171', fontWeight: 700 }}>Erreurs fréquentes :</div>
                    {c.erreurs_frequentes.map((e, j) => <Item key={j} text={e} />)}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </Section>
    </div>
  )
}

// ─── LessonEngineProgress — Affichage du pipeline SSE ────────────────────────

export function LessonEngineProgress({
  events,
  onDone,
}: {
  events: import('@/lib/types/detailed-lesson').LessonGenerationEvent[]
  onDone?: (lecon: DetailedLesson, fichier_id: string) => void
}) {
  const STEP_LABELS: Record<string, string> = {
    validation:              'Vérification des accès',
    resultats_curriculaires: 'Résultats curriculaires',
    objectifs:               'Objectifs observables',
    deroulement:             'Déroulement',
    activites:               'Activités',
    contenu:                 'Contenu pédagogique',
    evaluation_formative:    'Évaluation formative',
    quiz:                    'Quiz',
    corrige:                 'Corrigé',
    differentiation:         'Différenciation',
    verification_temps:      'Vérification du temps',
    quality_gate:            'Contrôle qualité',
    persistance:             'Sauvegarde',
    termine:                 'Terminé',
    erreur:                  'Erreur',
  }

  const dernierEvt = events[events.length - 1]
  const progress   = dernierEvt?.progress ?? 0

  return (
    <div style={{ padding: '20px', borderRadius: 12, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>
        ⚙️ Génération de la leçon détaillée…
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'rgba(127,119,221,0.1)', marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, borderRadius: 99, background: 'linear-gradient(90deg, #7F77DD, #A78BFA)', transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {events.map((ev, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 14 }}>
              {ev.statut === 'termine' ? '✅' : ev.statut === 'en_cours' ? '⏳' : ev.statut === 'erreur' ? '❌' : '⏭'}
            </span>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>{STEP_LABELS[ev.step] ?? ev.step} </span>
              <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{ev.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
