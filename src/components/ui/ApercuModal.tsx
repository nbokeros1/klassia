'use client'

import { useState, useRef, useEffect } from 'react'
import MarkdownRenderer from '@/components/ui/MarkdownRenderer'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApercuModalProps {
  isOpen:        boolean
  onClose:       () => void
  titre:         string
  type_contenu:  string
  contenu:       string
  classe_id?:    string
  onModifier:    () => void
  onSauvegarder: () => void
  profil?:       { prenom?: string; nom?: string; langue?: string }
  classeNom?:    string
  matiere?:      string
  niveau?:       string
  duree?:        string | number
  nb_eleves?:    string | number
  numero_lecon?: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const TYPE_INFO: Record<string, { icon: string; label: string; color: string }> = {
  lecon_complete:    { icon: '📚', label: 'Leçon complète',   color: '#A78BFA' },
  fiche_lecon:       { icon: '📚', label: 'Fiche leçon',      color: '#A78BFA' },
  plan_lecon:        { icon: '📝', label: 'Plan de leçon',    color: '#60A5FA' },
  plan_annuel:       { icon: '📅', label: 'Plan annuel',      color: '#7F77DD' },
  kit_complet:       { icon: '🎒', label: 'Kit complet',      color: '#9B8CE0' },
  quiz:              { icon: '🎮', label: 'Quiz',             color: '#F472B6' },
  evaluation:        { icon: '📊', label: 'Évaluation',       color: '#F87171' },
  email_parents:     { icon: '💌', label: 'Email parents',    color: '#FB923C' },
  devoir:            { icon: '📓', label: 'Devoir',           color: '#FBC34A' },
  activite_groupe:   { icon: '🎯', label: 'Activité',         color: '#34D399' },
  note_automatique:  { icon: '⚡', label: 'Note rapide',      color: '#FDE68A' },
  rapport_eleve:     { icon: '👤', label: 'Rapport élève',    color: '#E879F9' },
  courrier_officiel: { icon: '📋', label: 'Courrier',         color: '#94A3B8' },
}

// ─── BienEnseigner steps ──────────────────────────────────────────────────────

const BEP_STEPS = [
  { n: 1, fr: 'Objectifs SMART',          en: 'SMART Objectives',         color: '#60A5FA', bg: 'rgba(96,165,250,0.12)'  },
  { n: 2, fr: 'Amorce',                   en: 'Hook',                     color: '#34D399', bg: 'rgba(52,211,153,0.12)'  },
  { n: 3, fr: 'Présentation progressive', en: 'Progressive Presentation', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  { n: 4, fr: 'Pratique',                 en: 'Practice',                 color: '#FBC34A', bg: 'rgba(251,195,74,0.12)'  },
  { n: 5, fr: 'Clôture',                  en: 'Closure',                  color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
]

const LESSON_TYPES_BEP = new Set(['lecon_complete', 'fiche_lecon', 'plan_lecon', 'plan_sequence', 'activite_groupe'])

function processContent(content: string, isFr: boolean): string {
  return content.replace(
    /<!--\s*bep-step:(\d+):[^>]*-->/g,
    (_, n) => {
      const step = BEP_STEPS.find(s => s.n === Number(n))
      if (!step) return ''
      const label  = isFr ? step.fr : step.en
      const prefix = isFr ? 'Étape' : 'Step'
      return (
        `<div id="bep-step-${n}" class="no-print" style="` +
        `display:inline-flex;align-items:center;gap:5px;` +
        `padding:3px 10px 3px 8px;border-radius:99px;` +
        `font-size:10px;font-weight:700;` +
        `color:${step.color};background:${step.bg};` +
        `border:1px solid ${step.color}33;` +
        `margin:16px 0 4px;font-family:system-ui,-apple-system,sans-serif;` +
        `letter-spacing:0.3px;cursor:default;">` +
        `<span style="width:6px;height:6px;border-radius:50%;background:${step.color};display:inline-block;flex-shrink:0"></span>` +
        `${prefix} ${n} — ${label}` +
        `</div>`
      )
    }
  )
}

// ─── BepProgressBar ───────────────────────────────────────────────────────────

function BepProgressBar({ activeStep, isFr }: { activeStep: number; isFr: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {BEP_STEPS.map(step => {
        const isActive = activeStep === step.n
        const isPast   = activeStep > step.n
        return (
          <div
            key={step.n}
            title={`${isFr ? 'Étape' : 'Step'} ${step.n} — ${isFr ? step.fr : step.en}`}
            style={{
              flex: 1, height: 3, borderRadius: 2,
              background: isPast ? `${step.color}55` : isActive ? step.color : 'rgba(0,0,0,0.09)',
              transition: 'background 0.3s',
              cursor: 'default',
            }}
          />
        )
      })}
      {activeStep > 0 && (
        <span style={{
          fontSize: 9, fontWeight: 700,
          color: BEP_STEPS[activeStep - 1]?.color,
          marginLeft: 10, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {isFr ? 'Étape' : 'Step'} {activeStep} — {isFr ? BEP_STEPS[activeStep - 1]?.fr : BEP_STEPS[activeStep - 1]?.en}
        </span>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseQuiz(contenu: string): any[] | null {
  try {
    const raw = contenu.trim()
    const jsonStr = raw.startsWith('```')
      ? raw.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim()
      : raw
    const data = JSON.parse(jsonStr)
    return data.questions ?? null
  } catch {
    return null
  }
}

// ─── RenduQuiz (CSS-class based) ─────────────────────────────────────────────

function RenduQuiz({ contenu }: { contenu: string }) {
  const questions = parseQuiz(contenu)

  if (!questions) {
    return (
      <div>
        <p style={{ color: '#888', fontStyle: 'italic', marginBottom: 12 }}>Format JSON invalide — affichage brut :</p>
        <pre style={{ background: '#f5f5f5', padding: 14, borderRadius: 8, fontSize: 12, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {contenu}
        </pre>
      </div>
    )
  }

  return (
    <div className="quiz-render">
      <div className="quiz-info">
        {questions.length} question{questions.length > 1 ? 's' : ''}
      </div>

      {questions.map((q: any, i: number) => {
        const bonneReponse = q.bonne_reponse ?? ''
        return (
          <div key={i} className="quiz-question">
            <div className="qnum">
              Question {q.ordre ?? i + 1}
              {q.type && (
                <span style={{ marginLeft: 8, background: '#f3f4f6', padding: '1px 8px', borderRadius: 99, textTransform: 'lowercase', letterSpacing: 0, fontWeight: 500, fontSize: 10 }}>
                  {q.type}
                </span>
              )}
            </div>

            <div className="qtext">{q.enonce}</div>

            <div>
              {(q.options ?? []).map((opt: string, j: number) => {
                const isBonne = opt === bonneReponse || (bonneReponse && opt.startsWith(`${bonneReponse})`))
                return (
                  <div key={j} className={`quiz-option${isBonne ? ' correct' : ''}`}>
                    <span style={{ fontSize: 14, flexShrink: 0, color: isBonne ? '#059669' : '#d1d5db' }}>
                      {isBonne ? '●' : '○'}
                    </span>
                    <span style={{ flex: 1 }}>{opt}</span>
                    {isBonne && <span className="badge">✓ Bonne réponse</span>}
                  </div>
                )
              })}
            </div>

            {q.explication && (
              <div className="quiz-explication">💡 {q.explication}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Print helpers ────────────────────────────────────────────────────────────

function renduQuizHtml(questions: any[], titre: string): string {
  const questionsHtml = questions.map((q, i) => `
    <div class="quiz-question">
      <div class="numero">Question ${q.ordre ?? i + 1}</div>
      <div class="enonce">${q.enonce ?? ''}</div>
      ${(q.options ?? []).map((opt: string) => {
        const bonne = opt === q.bonne_reponse || (q.bonne_reponse && opt.startsWith(`${q.bonne_reponse})`))
        return `<div class="option${bonne ? ' bonne-reponse' : ''}">${bonne ? '✓ ' : '○ '}${opt}</div>`
      }).join('')}
      ${q.explication ? `<div class="explication">💡 ${q.explication}</div>` : ''}
    </div>
  `).join('')
  return `<h1>${titre}</h1><p>${questions.length} question${questions.length > 1 ? 's' : ''}</p>${questionsHtml}`
}

function imprimerDocument(titre: string, type_contenu: string, contenu: string) {
  const bodyEl = document.querySelector('.apercu-modal-body')
  const fenetre = window.open('', '_blank')
  if (!fenetre) return

  const date = new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })

  const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map(l => l.outerHTML)
    .join('\n')
  const styleTags = Array.from(document.querySelectorAll('style'))
    .map(s => `<style>${s.innerHTML}</style>`)
    .join('\n')

  const extraStyles = `
    <style>
      @page { margin: 2cm; }
      body { background: #fff !important; color: #000 !important; font-family: Georgia,'Times New Roman',serif; font-size: 11pt; padding: 0; margin: 0; }
      .print-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20pt; padding-bottom: 10pt; border-bottom: 2pt solid #333; }
      .print-header .title { font-size: 18pt; font-weight: bold; color: #1a1a1a; }
      .print-header .meta  { font-size: 9pt; color: #555; margin-top: 4pt; }
      .print-header .logo  { font-size: 11pt; color: #7F77DD; font-weight: bold; }
      .print-footer { margin-top: 24pt; padding-top: 8pt; border-top: 1pt solid #ccc; font-size: 8pt; color: #888; text-align: center; }
      .apercu-modal-body { padding: 0 !important; background: #fff !important; }
      /* ── Tableaux universels — fenêtre d'impression dédiée ── */
      table { border-collapse: collapse !important; width: 100% !important; overflow: visible !important; border-radius: 0 !important; box-shadow: none !important; page-break-inside: auto !important; }
      tr { page-break-inside: avoid !important; break-inside: avoid !important; }
      th, td { border: 1pt solid #999 !important; padding: 6pt 8pt !important; text-align: left !important; vertical-align: top !important; }
      thead { display: table-header-group !important; }
      h1, h2, h3 { page-break-after: avoid !important; break-after: avoid !important; }
      /* md-doc (programme annuel, leçon complète — classe par défaut de ApercuModal) */
      .md-doc { font-size: 11pt; color: #000; line-height: 1.6; }
      .md-doc h1 { font-size: 18pt; color: #1a1a1a; border-bottom: 2pt solid #333; }
      .md-doc h2 { font-size: 14pt; color: #1a1a1a; border-bottom: 1pt solid #ccc; }
      .md-doc h3 { font-size: 11pt; color: #333; }
      .md-doc thead tr th { background: #1E1B4B !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .md-doc tbody tr:nth-child(even) td { background: #f8f8f8 !important; -webkit-print-color-adjust: exact; }
      /* md-render */
      .md-render { font-size: 11pt; color: #000; }
      .md-render h1 { font-size: 18pt; color: #1a1a1a; border-bottom: 2pt solid #333; }
      .md-render h2 { font-size: 14pt; color: #1a1a1a; }
      .md-render h3 { font-size: 12pt; color: #7C3AED; }
      .md-render thead tr th { background: #7C3AED !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .md-render tbody tr:nth-child(even) td { background: #f8f8f8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      /* quiz print */
      .quiz-render .quiz-question { page-break-inside: avoid; margin-bottom: 14pt; padding: 10pt; border: 1pt solid #ccc; }
      .quiz-render .quiz-option.correct { background: #e8f5e9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-weight: bold; }
      .quiz-render .quiz-explication { font-size: 9pt; color: #555; font-style: italic; }
      /* masquer les éléments pédagogiques — document propre pour l'enseignant */
      .no-print { display: none !important; }
    </style>
  `

  const bodyHtml = bodyEl ? bodyEl.innerHTML : `<p>${contenu}</p>`

  const html = `<!DOCTYPE html><html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>KlassIA+ — ${titre}</title>
  ${styleLinks}
  ${styleTags}
  ${extraStyles}
</head>
<body>
  <div style="padding: 2cm;">
    <div class="print-header">
      <div>
        <div class="title">${titre}</div>
        <div class="meta">${date}</div>
      </div>
      <div class="logo">✦ KlassIA+</div>
    </div>
    <div class="apercu-modal-body">${bodyHtml}</div>
    <div class="print-footer">Généré par KlassIA+ — klassia.app</div>
  </div>
</body></html>`

  fenetre.document.write(html)
  fenetre.document.close()
  fenetre.focus()
  setTimeout(() => { fenetre.print() }, 400)
}

// ─── ApercuModal ─────────────────────────────────────────────────────────────

export default function ApercuModal({
  isOpen, onClose, titre, type_contenu, contenu,
  onModifier, onSauvegarder,
  profil, classeNom, matiere, niveau, duree, nb_eleves, numero_lecon,
}: ApercuModalProps) {
  const [exportEnCours, setExportEnCours] = useState<'word' | 'pdf' | null>(null)
  const [localToast,    setLocalToast]    = useState<{ msg: string; ok: boolean } | null>(null)
  const [activeStep,    setActiveStep]    = useState(0)
  const bodyRef = useRef<HTMLDivElement>(null)

  // Calculs BEP (avant le return conditionnel pour respecter les règles des hooks)
  const isFr           = profil?.langue !== 'en'
  const hasBepSteps    = LESSON_TYPES_BEP.has(type_contenu) && !!contenu && /<!--\s*bep-step:/.test(contenu)
  const processedContent = hasBepSteps ? processContent(contenu ?? '', isFr) : (contenu ?? '')

  // Observer de progression — IntersectionObserver sur les badges .bep-step
  useEffect(() => {
    if (!isOpen || !hasBepSteps) return
    const body = bodyRef.current
    if (!body) return
    let observer: IntersectionObserver | null = null
    const setup = () => {
      const badges = Array.from(body.querySelectorAll('[id^="bep-step-"]'))
      if (!badges.length) return
      observer = new IntersectionObserver(
        entries => entries.forEach(e => {
          if (e.isIntersecting) {
            const n = parseInt((e.target as HTMLElement).id.replace('bep-step-', ''))
            if (!isNaN(n)) setActiveStep(n)
          }
        }),
        { root: body, threshold: 0.5 }
      )
      badges.forEach(el => observer!.observe(el))
    }
    const timer = setTimeout(setup, 150)
    return () => { clearTimeout(timer); observer?.disconnect() }
  }, [isOpen, hasBepSteps, processedContent])

  if (!isOpen || !contenu) return null

  const ti      = TYPE_INFO[type_contenu]
  const isQuiz  = type_contenu === 'quiz'
  const isEmail = type_contenu === 'email_parents' || type_contenu === 'courrier_officiel'

  const showToast = (msg: string, ok: boolean) => {
    setLocalToast({ msg, ok })
    setTimeout(() => setLocalToast(null), 3000)
  }

  const exportPayload = {
    contenu, type_contenu, titre,
    classe:        classeNom,
    matiere,       niveau,     duree,
    nb_eleves,     numero_lecon,
    langue:        profil?.langue ?? 'fr',
    enseignant_nom: profil ? `${profil.prenom ?? ''} ${profil.nom ?? ''}`.trim() : '',
  }

  const exporterWord = async () => {
    setExportEnCours('word')
    try {
      const response = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportPayload),
      })
      if (!response.ok) throw new Error('Erreur export')
      const blob = await response.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${titre ?? 'klassia'}.docx`
      a.click()
      URL.revokeObjectURL(url)
      showToast('✓ Document Word téléchargé', true)
    } catch {
      showToast("Erreur lors de l'export Word", false)
    } finally {
      setExportEnCours(null)
    }
  }

  const exporterPDF = async () => {
    setExportEnCours('pdf')
    try {
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportPayload),
      })
      if (!response.ok) throw new Error('Erreur export')
      const blob = await response.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${titre ?? 'klassia'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      showToast('✓ PDF téléchargé', true)
    } catch {
      showToast("Erreur lors de l'export PDF", false)
    } finally {
      setExportEnCours(null)
    }
  }

  const btnSm: React.CSSProperties = {
    padding: '6px 11px', borderRadius: 7,
    border: '1px solid #d1d5db', background: 'transparent', color: '#6b7280',
    fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' as const,
  }

  return (
    <>
      {/* Masquer .no-print à l'impression navigateur directe */}
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      {/* Overlay */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 699 }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', left: '50%', top: '50%',
        transform: 'translate(-50%,-50%)',
        width: 'min(860px, 95vw)',
        height: 'min(90vh, 900px)',
        background: 'var(--color-bg-secondary)',
        borderRadius: 16,
        border: '1px solid var(--color-border)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        zIndex: 700,
      }}>

        {/* ── HEADER (compact) ── */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {ti && <span style={{ fontSize: 18, flexShrink: 0 }}>{ti.icon}</span>}

          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {titre || 'Document'}
            </div>
            {ti && (
              <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 99, fontWeight: 700, background: `${ti.color}20`, color: ti.color, flexShrink: 0 }}>
                {ti.label}
              </span>
            )}
          </div>

          <button onClick={onClose}
            style={{ background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 13, cursor: 'pointer', padding: '3px 10px', lineHeight: 1.4, borderRadius: 6, flexShrink: 0 }}>
            ×
          </button>
        </div>

        {/* ── CORPS — scroll container ── */}
        <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>

          {/* Barre de progression BienEnseigner — sticky, absente à l'impression */}
          {hasBepSteps && (
            <div className="no-print" style={{
              position: 'sticky', top: 0, zIndex: 5,
              background: 'rgba(255,255,255,0.97)',
              borderBottom: '1px solid #f0f0f0',
              padding: '8px 36px 7px',
              backdropFilter: 'blur(4px)',
            }}>
              <BepProgressBar activeStep={activeStep} isFr={isFr} />
            </div>
          )}

          {/* Corps imprimable */}
          <div className="apercu-modal-body" style={{ padding: '28px 36px' }}>

            {/* En-tête document */}
            {!isQuiz && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#1e1b4b', lineHeight: 1.2, marginBottom: 4 }}>
                    {titre}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    {new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#7C3AED', fontWeight: 800, flexShrink: 0, marginLeft: 20 }}>
                  ✦ KlassIA+
                </div>
              </div>
            )}

            {/* Contenu selon type */}
            {isQuiz && <RenduQuiz contenu={contenu} />}

            {isEmail && !isQuiz && (
              <div style={{ maxWidth: 600, margin: '0 auto', background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 10, padding: '28px 32px', fontFamily: 'Georgia, serif', fontSize: 14, lineHeight: 1.8, color: '#222' }}>
                <MarkdownRenderer content={contenu} />
              </div>
            )}

            {!isQuiz && !isEmail && (
              <MarkdownRenderer content={processedContent} className="md-doc" />
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
          {localToast && (
            <div style={{
              padding: '7px 16px', fontSize: 12, fontWeight: 600, textAlign: 'center',
              background: localToast.ok ? 'rgba(52,211,153,.12)' : 'rgba(248,113,113,.12)',
              color: localToast.ok ? '#059669' : '#DC2626',
              borderBottom: `1px solid ${localToast.ok ? 'rgba(52,211,153,.25)' : 'rgba(248,113,113,.25)'}`,
            }}>
              {localToast.msg}
            </div>
          )}
          <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            {/* Gauche : Modifier + Sauvegarder */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{ padding: '8px 14px', borderRadius: 9, border: '1.5px solid var(--color-accent-violet)', background: 'transparent', color: 'var(--color-accent-violet)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={onModifier}>
                ✏️ Modifier
              </button>
              <button
                style={{ padding: '8px 16px', borderRadius: 9, background: 'linear-gradient(135deg, #6B3FA0, #4F46E5)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={onSauvegarder}>
                💾 Sauvegarder
              </button>
            </div>

            {/* Droite : Word, PDF, Imprimer */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                style={{ ...btnSm, opacity: exportEnCours === 'word' ? 0.6 : 1 }}
                disabled={!!exportEnCours}
                onClick={exporterWord}>
                {exportEnCours === 'word' ? '⟳ Word…' : '📥 Word'}
              </button>
              <button
                style={{ ...btnSm, opacity: exportEnCours === 'pdf' ? 0.6 : 1 }}
                disabled={!!exportEnCours}
                onClick={exporterPDF}>
                {exportEnCours === 'pdf' ? '⟳ PDF…' : '📥 PDF'}
              </button>
              <button style={btnSm} onClick={() => imprimerDocument(titre, type_contenu, contenu)}>
                🖨️ Imprimer
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
