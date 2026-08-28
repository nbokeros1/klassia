'use client'

import React, { useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedbackDetail {
  feedback: {
    id: string
    type: string
    titre: string | null
    description: string
    page_url: string | null
    statut: string
    created_at: string
  }
  teacher: {
    id: string
    prenom: string | null
    nom: string | null
    email: string | null
    onboarding: boolean | null
    beta_since: string | null
  } | null
  notes: { id: string; contenu: string; auteur: string; created_at: string }[]
  responses: { id: string; contenu: string; delivered: boolean; created_at: string }[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<string, { label: string; color: string }> = {
  nouveau:       { label: 'Nouveau',  color: '#F59E0B' },
  en_traitement: { label: 'En cours', color: '#6C5CE7' },
  resolu:        { label: 'Résolu',   color: '#22C55E' },
  ferme:         { label: 'Ignoré',   color: '#64748B' },
}

const TYPE_LABELS: Record<string, string> = {
  bug:      'Bug',
  blocked:  'Bloqué(e)',
  confused: 'Perdu(e)',
  idea:     'Suggestion',
  positive: 'Ça marche !',
  remark:   'Commentaire',
  rating:   'Note',
}

const FEEDBACK_COLORS: Record<string, string> = {
  blocked:  '#EF4444',
  bug:      '#F59E0B',
  idea:     '#6C5CE7',
  positive: '#22C55E',
  remark:   '#64748B',
  confused: '#A78BFA',
  rating:   '#38BDF8',
}

const STATUTS: readonly string[] = ['nouveau', 'en_traitement', 'resolu', 'ferme']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const d  = Math.floor(ms / 86400000)
  const h  = Math.floor(ms / 3600000)
  const m  = Math.floor(ms / 60000)
  if (d >= 30) return `il y a ${Math.floor(d / 30)} mois`
  if (d >= 1)  return `il y a ${d}j`
  if (h >= 1)  return `il y a ${h}h`
  if (m >= 1)  return `il y a ${m}min`
  return "à l'instant"
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, color: 'rgba(255,255,255,0.3)',
      textTransform: 'uppercase', letterSpacing: '0.1em',
      fontWeight: 600, marginBottom: 10,
    }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  feedbackId: string | null
  onClose: () => void
  onMutation: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FeedbackDrawer({ feedbackId, onClose, onMutation }: Props) {
  const [detail,        setDetail]       = useState<FeedbackDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError,   setDetailError]  = useState<string | null>(null)
  const [noteText,      setNoteText]     = useState('')
  const [savingNote,    setSavingNote]   = useState(false)
  const [respText,      setRespText]     = useState('')
  const [savingResp,    setSavingResp]   = useState(false)
  const [respSaved,     setRespSaved]    = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)

  // Fetch detail when feedbackId changes
  useEffect(() => {
    if (!feedbackId) { setDetail(null); return }
    let cancelled = false
    setLoadingDetail(true)
    setDetailError(null)
    setNoteText('')
    setRespText('')
    setRespSaved(false)
    fetch(`/api/founder/feedback/${feedbackId}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<FeedbackDetail>
      })
      .then(data => { if (!cancelled) setDetail(data) })
      .catch(() => { if (!cancelled) setDetailError('Impossible de charger ce retour.') })
      .finally(() => { if (!cancelled) setLoadingDetail(false) })
    return () => { cancelled = true }
  }, [feedbackId])

  // Keyboard close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!feedbackId) return null

  // ── Mutations ──────────────────────────────────────────────────────────────

  async function changeStatus(statut: string) {
    if (!feedbackId || changingStatus) return
    setChangingStatus(true)
    try {
      const r = await fetch(`/api/founder/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', statut }),
      })
      if (r.ok) {
        setDetail(prev => prev
          ? { ...prev, feedback: { ...prev.feedback, statut } }
          : prev
        )
        onMutation()
      }
    } finally {
      setChangingStatus(false)
    }
  }

  async function addNote() {
    if (!feedbackId || !noteText.trim() || savingNote) return
    setSavingNote(true)
    try {
      const r = await fetch(`/api/founder/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'note', contenu: noteText.trim() }),
      })
      if (r.ok) {
        const json = await r.json() as { ok: boolean; note: { id: string; contenu: string; created_at: string } }
        setDetail(prev => prev ? {
          ...prev,
          notes: [...prev.notes, { id: json.note.id, contenu: json.note.contenu, auteur: 'Vous', created_at: json.note.created_at }],
        } : prev)
        setNoteText('')
      }
    } finally {
      setSavingNote(false)
    }
  }

  async function addResponse() {
    if (!feedbackId || !respText.trim() || savingResp) return
    setSavingResp(true)
    try {
      const r = await fetch(`/api/founder/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'response', contenu: respText.trim() }),
      })
      if (r.ok) {
        const json = await r.json() as {
          ok: boolean
          response: { id: string; contenu: string; delivered: boolean; created_at: string }
        }
        setDetail(prev => prev ? {
          ...prev,
          responses: [...prev.responses, {
            id: json.response.id, contenu: json.response.contenu,
            delivered: json.response.delivered, created_at: json.response.created_at,
          }],
        } : prev)
        setRespText('')
        setRespSaved(true)
        onMutation()
      }
    } finally {
      setSavingResp(false)
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const statut    = detail?.feedback.statut ?? ''
  const statutCfg = STATUT_CONFIG[statut]
  const typeColor = FEEDBACK_COLORS[detail?.feedback.type ?? ''] ?? '#64748B'

  // Timeline: merge feedback creation + notes + responses, sorted ascending
  type TimelineEvent = { kind: 'received' | 'note' | 'response'; ts: string; text?: string; auteur?: string }
  const timeline: TimelineEvent[] = []
  if (detail) {
    timeline.push({ kind: 'received', ts: detail.feedback.created_at })
    for (const n of detail.notes)     timeline.push({ kind: 'note',     ts: n.created_at, text: n.contenu, auteur: n.auteur })
    for (const resp of detail.responses) timeline.push({ kind: 'response', ts: resp.created_at, text: resp.contenu })
    timeline.sort((a, b) => (a.ts < b.ts ? -1 : 1))
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50 }}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Détail du retour"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 51,
          width: 'min(500px, 100vw)',
          background: '#0F1B2D',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Sticky header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 8,
          position: 'sticky', top: 0, background: '#0F1B2D', zIndex: 2,
        }}>
          {detail && (
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              color: typeColor, background: `${typeColor}22`,
            }}>
              {TYPE_LABELS[detail.feedback.type] ?? detail.feedback.type}
            </span>
          )}
          {statutCfg && (
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              color: statutCfg.color, background: `${statutCfg.color}22`,
            }}>
              {statutCfg.label}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 18, lineHeight: 1, padding: '2px 6px' }}
          >
            ✕
          </button>
        </div>

        {/* Loading state */}
        {loadingDetail && (
          <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            Chargement…
          </div>
        )}

        {/* Error state */}
        {detailError && (
          <div style={{ padding: 24, color: '#EF4444', fontSize: 13 }}>{detailError}</div>
        )}

        {/* Content */}
        {detail && (
          <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Title + description */}
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9', margin: '0 0 10px', lineHeight: 1.35 }}>
                {detail.feedback.titre ?? '(sans titre)'}
              </h2>
              <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {detail.feedback.description}
              </p>
            </div>

            {/* Meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {detail.feedback.page_url && (
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>Page : </span>
                  <span>{detail.feedback.page_url}</span>
                </div>
              )}
              <div>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>Reçu le : </span>
                <span>{fmtDate(detail.feedback.created_at)}</span>
              </div>
            </div>

            {/* Teacher context card */}
            {detail.teacher && (
              <div style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10, padding: '12px 14px',
              }}>
                <SectionLabel>Enseignant</SectionLabel>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9', marginBottom: 2 }}>
                  {[detail.teacher.prenom, detail.teacher.nom].filter(Boolean).join(' ') || 'Nom inconnu'}
                </div>
                {detail.teacher.email && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
                    {detail.teacher.email}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                  <span>Onboarding : {detail.teacher.onboarding ? '✓ Terminé' : '⏳ En cours'}</span>
                  {detail.teacher.beta_since && (
                    <span>Bêta : {timeAgo(detail.teacher.beta_since)}</span>
                  )}
                </div>
              </div>
            )}

            <Divider />

            {/* Status workflow */}
            <div>
              <SectionLabel>Statut du retour</SectionLabel>
              <div style={{ display: 'flex', gap: 6 }}>
                {STATUTS.map(s => {
                  const cfg      = STATUT_CONFIG[s]
                  const isActive = statut === s
                  return (
                    <button
                      key={s}
                      disabled={isActive || changingStatus}
                      onClick={() => void changeStatus(s)}
                      style={{
                        flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11,
                        fontWeight: isActive ? 700 : 500,
                        cursor: isActive || changingStatus ? 'default' : 'pointer',
                        border: `1px solid ${isActive ? cfg.color : 'rgba(255,255,255,0.1)'}`,
                        background: isActive ? `${cfg.color}28` : 'rgba(255,255,255,0.03)',
                        color: isActive ? cfg.color : 'rgba(255,255,255,0.38)',
                        transition: 'all 0.15s',
                        opacity: changingStatus && !isActive ? 0.5 : 1,
                      }}
                    >
                      {cfg?.label ?? s}
                    </button>
                  )
                })}
              </div>
            </div>

            <Divider />

            {/* Internal notes */}
            <div>
              <SectionLabel>
                Notes internes{' '}
                <span style={{ color: 'rgba(255,255,255,0.15)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                  · jamais visibles par l&apos;enseignant
                </span>
              </SectionLabel>

              {detail.notes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {detail.notes.map(n => (
                    <div key={n.id} style={{
                      background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)',
                      borderRadius: 8, padding: '10px 12px',
                    }}>
                      <div style={{ fontSize: 13, color: '#C4B5FD', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {n.contenu}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                        {n.auteur} · {timeAgo(n.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {detail.notes.length === 0 && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: '0 0 12px' }}>
                  Aucune note interne.
                </p>
              )}

              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Ajouter une note interne…"
                maxLength={2000}
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '10px 12px',
                  color: '#F1F5F9', fontSize: 13, resize: 'vertical', outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <button
                  onClick={() => void addNote()}
                  disabled={!noteText.trim() || savingNote}
                  style={{
                    padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                    cursor: noteText.trim() && !savingNote ? 'pointer' : 'not-allowed',
                    background: noteText.trim() ? 'rgba(108,92,231,0.25)' : 'rgba(255,255,255,0.05)',
                    color: noteText.trim() ? '#A78BFA' : 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(108,92,231,0.2)',
                    transition: 'all 0.15s',
                  }}
                >
                  {savingNote ? 'Enregistrement…' : 'Ajouter la note'}
                </button>
              </div>
            </div>

            <Divider />

            {/* Founder response */}
            <div>
              <SectionLabel>Réponse Founder</SectionLabel>

              {detail.responses.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {detail.responses.map(resp => (
                    <div key={resp.id} style={{
                      background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
                      borderRadius: 8, padding: '10px 12px',
                    }}>
                      <div style={{ fontSize: 13, color: '#86EFAC', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {resp.contenu}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                        Réponse enregistrée · {timeAgo(resp.created_at)}
                        <span style={{ marginLeft: 6, color: 'rgba(255,255,255,0.18)' }}>
                          (notification enseignant non encore activée)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={respText}
                onChange={e => setRespText(e.target.value)}
                placeholder="Écrire une réponse à l'enseignant…"
                maxLength={3000}
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '10px 12px',
                  color: '#F1F5F9', fontSize: 13, resize: 'vertical', outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <span style={{ fontSize: 11, color: '#86EFAC', visibility: respSaved ? 'visible' : 'hidden' }}>
                  Réponse enregistrée. Notification enseignant non encore activée.
                </span>
                <button
                  onClick={() => void addResponse()}
                  disabled={!respText.trim() || savingResp}
                  style={{
                    padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                    cursor: respText.trim() && !savingResp ? 'pointer' : 'not-allowed',
                    background: respText.trim() ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.05)',
                    color: respText.trim() ? '#86EFAC' : 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(34,197,94,0.2)',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                >
                  {savingResp ? 'Enregistrement…' : 'Enregistrer la réponse'}
                </button>
              </div>
            </div>

            <Divider />

            {/* History timeline */}
            <div style={{ paddingBottom: 24 }}>
              <SectionLabel>Historique</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {timeline.map((ev, i) => {
                  const dotColor =
                    ev.kind === 'received' ? '#6C5CE7' :
                    ev.kind === 'note'     ? '#A78BFA' : '#22C55E'
                  const isLast = i === timeline.length - 1
                  return (
                    <div key={i} style={{ display: 'flex', gap: 12 }}>
                      {/* Line + dot */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                        {!isLast && (
                          <div style={{ width: 1, flex: 1, minHeight: 20, background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />
                        )}
                      </div>
                      {/* Content */}
                      <div style={{ paddingBottom: isLast ? 0 : 14 }}>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 2 }}>
                          {ev.kind === 'received' && 'Feedback reçu'}
                          {ev.kind === 'note'     && `Note interne${ev.auteur ? ` (${ev.auteur})` : ''}`}
                          {ev.kind === 'response' && 'Réponse enregistrée'}
                        </div>
                        {ev.text && (
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 2 }}>
                            {ev.text.length > 120 ? `${ev.text.substring(0, 120)}…` : ev.text}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>
                          {timeAgo(ev.ts)}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {timeline.length === 0 && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>Aucun événement.</p>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  )
}
