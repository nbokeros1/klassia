'use client'

import { useState, useCallback } from 'react'
import { getSyllabusCompleteness } from '@/lib/spie/syllabus-v3'
import type { PackSyllabus } from '@/lib/types/teaching-pack'

interface Props {
  syllabus:          PackSyllabus
  teachingPackId:    string
  programmeAnnuelId: string
  onSaved?:          (s: PackSyllabus) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isPlaceholder = (v: string | undefined) =>
  !v || v.startsWith('À compléter') || v.startsWith('À préciser')

const listToText = (items: string[] | undefined) => (items ?? []).join('\n')
const textToList = (text: string): string[] =>
  text.split('\n').map(l => l.trim()).filter(Boolean)

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(139,151,172,0.15)', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36 }}>{score}%</span>
    </div>
  )
}

// ─── Placeholder callout ──────────────────────────────────────────────────────

function PlaceholderCallout({ label }: { label: string }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 8,
      background: 'rgba(245,158,11,0.08)',
      border: '1px solid rgba(245,158,11,0.2)',
      fontSize: 13, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      <span style={{ fontStyle: 'italic', color: 'rgba(245,158,11,0.8)' }}>— À compléter par l'enseignant</span>
    </div>
  )
}

// ─── List view ────────────────────────────────────────────────────────────────

function ListRead({ items, numbered = false }: { items: string[]; numbered?: boolean }) {
  if (!items.length) return <span style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>—</span>
  return (
    <ul style={{ margin: 0, paddingLeft: numbered ? 20 : 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55, listStyleType: numbered ? 'decimal' : 'disc' }}>
          {item}
        </li>
      ))}
    </ul>
  )
}

// ─── Field row ────────────────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {value || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
      </div>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title, isEditing, isEdited, onEdit, children,
}: {
  title: string; isEditing: boolean; isEdited: boolean
  onEdit: () => void; children: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--card-bg)', backdropFilter: 'blur(var(--card-blur))',
      border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)',
      padding: '20px 24px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
          {isEdited && !isEditing && (
            <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 99, background: 'rgba(16,185,129,0.1)', color: '#10B981', fontWeight: 700 }}>
              Modifié
            </span>
          )}
        </div>
        {!isEditing && (
          <button onClick={onEdit} style={{
            fontSize: 12, fontWeight: 600, padding: '5px 12px',
            border: '1px solid var(--card-border)', borderRadius: 7,
            background: 'transparent', color: 'var(--text-muted)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Modifier
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

// ─── Form primitives ──────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5, marginTop: 12 }}>
      {children}
    </div>
  )
}

function Textarea({ value, onChange, rows = 4, placeholder }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      style={{
        width: '100%', boxSizing: 'border-box', padding: '10px 12px',
        borderRadius: 8, border: '1px solid var(--card-border)',
        background: 'rgba(139,151,172,0.06)', color: 'var(--text-primary)',
        fontSize: 13, fontFamily: 'inherit', lineHeight: 1.55, resize: 'vertical', outline: 'none',
      }}
    />
  )
}

function Input({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', boxSizing: 'border-box', padding: '9px 12px',
        borderRadius: 8, border: '1px solid var(--card-border)',
        background: 'rgba(139,151,172,0.06)', color: 'var(--text-primary)',
        fontSize: 13, fontFamily: 'inherit', outline: 'none',
      }}
    />
  )
}

function EditBar({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
      <button onClick={onCancel} disabled={saving} style={{
        fontSize: 13, fontWeight: 600, padding: '7px 16px', borderRadius: 8,
        border: '1px solid var(--card-border)', background: 'transparent',
        color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
      }}>Annuler</button>
      <button onClick={onSave} disabled={saving} style={{
        fontSize: 13, fontWeight: 700, padding: '7px 18px', borderRadius: 8,
        border: 'none', background: 'var(--violet)', color: '#fff',
        cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
      }}>
        {saving ? 'Sauvegarde…' : 'Sauvegarder'}
      </button>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function SyllabusViewer({ syllabus, teachingPackId, programmeAnnuelId, onSaved }: Props) {
  const [local, setLocal]       = useState<PackSyllabus>(syllabus)
  const [editing, setEditing]   = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<PackSyllabus | null>(null)
  const [saving, setSaving]     = useState(false)
  const [savedSections, setSavedSections] = useState<Set<string>>(
    new Set(syllabus.edited_sections ?? [])
  )

  const completeness = getSyllabusCompleteness(local)

  function startEdit(section: string) {
    setSnapshot(local)
    setEditing(section)
  }

  function cancelEdit() {
    if (snapshot) setLocal(snapshot)
    setSnapshot(null)
    setEditing(null)
  }

  const saveSection = useCallback(async (sectionKey: string, updated: PackSyllabus) => {
    setSaving(true)
    try {
      const withEdited: PackSyllabus = {
        ...updated,
        edited_sections: Array.from(new Set([...(updated.edited_sections ?? []), sectionKey])),
      }
      const res = await fetch('/api/spie/syllabus-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teaching_pack_id:    teachingPackId,
          programme_annuel_id: programmeAnnuelId,
          syllabus:            withEdited,
        }),
      })
      if (res.ok) {
        setLocal(withEdited)
        setSavedSections(prev => new Set([...prev, sectionKey]))
        setEditing(null)
        setSnapshot(null)
        onSaved?.(withEdited)
      }
    } finally {
      setSaving(false)
    }
  }, [teachingPackId, programmeAnnuelId, onSaved])

  function update(fields: Partial<PackSyllabus>) {
    setLocal(prev => ({ ...prev, ...fields }))
  }

  const isEdited = (key: string) => savedSections.has(key)

  return (
    <div>

      {/* ── En-tête document ────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card-bg)', backdropFilter: 'blur(var(--card-blur))',
        border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)',
        padding: '22px 28px', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              Syllabus de cours
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {local.titre_cours}
            </h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {[local.niveau, local.matiere].filter(Boolean).map(tag => (
                <span key={tag} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', background: 'rgba(108,92,231,0.1)', borderRadius: 99, color: 'var(--violet)' }}>
                  {tag}
                </span>
              ))}
              {local.genere_par_ia && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', background: 'rgba(16,185,129,0.08)', borderRadius: 99, color: '#10B981' }}>
                  Généré par IA · v{local.version ?? '3.0'}
                </span>
              )}
            </div>
          </div>
          <div style={{ minWidth: 180 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textAlign: 'right' }}>
              Complétude
            </div>
            <ScoreBar score={completeness.score} />
          </div>
        </div>
      </div>

      {/* ── 1. Présentation ─────────────────────────────────────────────────── */}
      <Section title="Présentation du cours"
        isEditing={editing === 'presentation'} isEdited={isEdited('presentation')}
        onEdit={() => startEdit('presentation')}>
        {editing === 'presentation' ? (
          <div>
            <FieldLabel>Titre du cours</FieldLabel>
            <Input value={local.titre_cours} onChange={v => update({ titre_cours: v })} placeholder="Titre du cours" />
            <FieldLabel>Description du cours</FieldLabel>
            <Textarea rows={4} value={local.description_cours ?? local.description ?? ''}
              onChange={v => update({ description_cours: v, description: v })}
              placeholder="Description en 2-3 phrases — portée, contexte, public cible." />
            <FieldLabel>Mission du cours</FieldLabel>
            <Textarea rows={3} value={local.mission_cours ?? ''}
              onChange={v => update({ mission_cours: v })}
              placeholder="Pourquoi ce cours est essentiel à la formation de l'élève." />
            <EditBar onSave={() => saveSection('presentation', local)} onCancel={cancelEdit} saving={saving} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <FieldRow label="Description" value={local.description_cours ?? local.description} />
            {local.mission_cours && <FieldRow label="Mission" value={local.mission_cours} />}
          </div>
        )}
      </Section>

      {/* ── 2. Objectifs pédagogiques ───────────────────────────────────────── */}
      <Section title="Objectifs pédagogiques"
        isEditing={editing === 'objectifs'} isEdited={isEdited('objectifs')}
        onEdit={() => startEdit('objectifs')}>
        {editing === 'objectifs' ? (
          <div>
            <FieldLabel>Objectifs généraux (un par ligne)</FieldLabel>
            <Textarea rows={4} value={listToText(local.objectifs_generaux)}
              onChange={v => update({ objectifs_generaux: textToList(v) })}
              placeholder={'Objectif 1\nObjectif 2\nObjectif 3'} />
            <FieldLabel>Grandes idées (une par ligne)</FieldLabel>
            <Textarea rows={3} value={listToText(local.grandes_idees)}
              onChange={v => update({ grandes_idees: textToList(v) })}
              placeholder={'Grande idée 1\nGrande idée 2'} />
            <FieldLabel>Résultats d'apprentissage (un par ligne)</FieldLabel>
            <Textarea rows={6} value={listToText(local.resultats_apprentissage)}
              onChange={v => update({ resultats_apprentissage: textToList(v) })}
              placeholder={"L'élève peut...\nL'élève peut..."} />
            <EditBar onSave={() => saveSection('objectifs', local)} onCancel={cancelEdit} saving={saving} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {(local.objectifs_generaux?.length ?? 0) > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Objectifs généraux</div>
                <ListRead items={local.objectifs_generaux!} numbered />
              </div>
            )}
            {(local.grandes_idees?.length ?? 0) > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Grandes idées</div>
                <ListRead items={local.grandes_idees} />
              </div>
            )}
            {(local.resultats_apprentissage?.length ?? 0) > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Résultats d'apprentissage</div>
                <ListRead items={local.resultats_apprentissage} numbered />
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── 3. Méthodologie ─────────────────────────────────────────────────── */}
      <Section title="Méthodologie et évaluation"
        isEditing={editing === 'methodologie'} isEdited={isEdited('methodologie')}
        onEdit={() => startEdit('methodologie')}>
        {editing === 'methodologie' ? (
          <div>
            <FieldLabel>Méthodes pédagogiques (une par ligne)</FieldLabel>
            <Textarea rows={4} value={listToText(local.methodes_pedagogiques)}
              onChange={v => update({ methodes_pedagogiques: textToList(v) })}
              placeholder={'Apprentissage actif\nDiscussion en classe\nTravail collaboratif'} />
            <FieldLabel>Méthodes d'évaluation (une par ligne)</FieldLabel>
            <Textarea rows={3} value={listToText(local.methodes_evaluation)}
              onChange={v => update({ methodes_evaluation: textToList(v) })}
              placeholder={'Évaluation formative\nÉvaluation sommative'} />
            <FieldLabel>Compétences développées (une par ligne)</FieldLabel>
            <Textarea rows={3} value={listToText(local.competences_developpees)}
              onChange={v => update({ competences_developpees: textToList(v) })}
              placeholder={'Pensée critique\nCommunication'} />
            <EditBar onSave={() => saveSection('methodologie', local)} onCancel={cancelEdit} saving={saving} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Méthodes pédagogiques</div>
              <ListRead items={local.methodes_pedagogiques} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Méthodes d'évaluation</div>
              <ListRead items={local.methodes_evaluation} />
            </div>
            {(local.competences_developpees?.length ?? 0) > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Compétences développées</div>
                <ListRead items={local.competences_developpees!} />
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── 4. Attentes ─────────────────────────────────────────────────────── */}
      <Section title="Attentes et vie de classe"
        isEditing={editing === 'attentes'} isEdited={isEdited('attentes')}
        onEdit={() => startEdit('attentes')}>
        {editing === 'attentes' ? (
          <div>
            <FieldLabel>Attentes comportementales (une par ligne)</FieldLabel>
            <Textarea rows={5} value={listToText(local.attentes_classe ?? local.attentes)}
              onChange={v => { const list = textToList(v); update({ attentes_classe: list, attentes: list }) }}
              placeholder={'Respecter les délais\nParticiper activement\nUtiliser le numérique de façon responsable'} />
            <EditBar onSave={() => saveSection('attentes', local)} onCancel={cancelEdit} saving={saving} />
          </div>
        ) : (
          <ListRead items={local.attentes_classe ?? local.attentes ?? []} />
        )}
      </Section>

      {/* ── 5. Politiques ───────────────────────────────────────────────────── */}
      <Section title="Politiques de cours"
        isEditing={editing === 'politiques'} isEdited={isEdited('politiques')}
        onEdit={() => startEdit('politiques')}>
        {editing === 'politiques' ? (
          <div>
            <FieldLabel>Politique de présence</FieldLabel>
            <Textarea rows={3}
              value={isPlaceholder(local.politique_presence) ? '' : (local.politique_presence ?? '')}
              onChange={v => update({ politique_presence: v || 'À compléter par l\'enseignant selon les règles de l\'établissement.' })}
              placeholder="Décrivez les attentes et conséquences liées à la présence." />
            <FieldLabel>Politique sur les retards</FieldLabel>
            <Textarea rows={2}
              value={isPlaceholder(local.politique_retards) ? '' : (local.politique_retards ?? '')}
              onChange={v => update({ politique_retards: v || 'À compléter par l\'enseignant.' })}
              placeholder="Conséquences des retards répétés." />
            <FieldLabel>Politique de remise des travaux</FieldLabel>
            <Textarea rows={3}
              value={isPlaceholder(local.politique_remise_travaux) ? '' : (local.politique_remise_travaux ?? '')}
              onChange={v => update({ politique_remise_travaux: v || 'À compléter par l\'enseignant.' })}
              placeholder="Modalités de remise, pénalités, délais." />
            <FieldLabel>Intégrité académique</FieldLabel>
            <Textarea rows={3} value={local.integrite_academique ?? ''}
              onChange={v => update({ integrite_academique: v })}
              placeholder="Politique sur le plagiat et la tricherie." />
            <EditBar onSave={() => saveSection('politiques', local)} onCancel={cancelEdit} saving={saving} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isPlaceholder(local.politique_presence)
              ? <PlaceholderCallout label="Présence" />
              : <FieldRow label="Présence" value={local.politique_presence} />}
            {isPlaceholder(local.politique_retards)
              ? <PlaceholderCallout label="Retards" />
              : <FieldRow label="Retards" value={local.politique_retards} />}
            {isPlaceholder(local.politique_remise_travaux)
              ? <PlaceholderCallout label="Remise des travaux" />
              : <FieldRow label="Remise des travaux" value={local.politique_remise_travaux} />}
            {local.integrite_academique && (
              <FieldRow label="Intégrité académique" value={local.integrite_academique} />
            )}
          </div>
        )}
      </Section>

      {/* ── 6. Communication ────────────────────────────────────────────────── */}
      <Section title="Communication"
        isEditing={editing === 'communication'} isEdited={isEdited('communication')}
        onEdit={() => startEdit('communication')}>
        {editing === 'communication' ? (
          <div>
            <FieldLabel>Courriel professionnel</FieldLabel>
            <Input value={local.communication?.courriel ?? ''}
              onChange={v => update({ communication: { ...local.communication, courriel: v } })}
              placeholder="enseignant@etablissement.ca" />
            <FieldLabel>Disponibilités</FieldLabel>
            <Input value={isPlaceholder(local.communication?.disponibilites) ? '' : (local.communication?.disponibilites ?? '')}
              onChange={v => update({ communication: { ...local.communication, disponibilites: v || 'À préciser' } })}
              placeholder="Lundi et mercredi 12h–13h, sur rendez-vous" />
            <FieldLabel>Plateforme de communication</FieldLabel>
            <Input value={isPlaceholder(local.communication?.plateforme) ? '' : (local.communication?.plateforme ?? '')}
              onChange={v => update({ communication: { ...local.communication, plateforme: v || 'À préciser' } })}
              placeholder="Google Classroom, Teams, courriel..." />
            <EditBar onSave={() => saveSection('communication', local)} onCancel={cancelEdit} saving={saving} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {local.communication?.courriel
              ? <FieldRow label="Courriel" value={local.communication.courriel} />
              : <PlaceholderCallout label="Courriel" />}
            {isPlaceholder(local.communication?.disponibilites)
              ? <PlaceholderCallout label="Disponibilités" />
              : <FieldRow label="Disponibilités" value={local.communication?.disponibilites} />}
            {isPlaceholder(local.communication?.plateforme)
              ? <PlaceholderCallout label="Plateforme" />
              : <FieldRow label="Plateforme" value={local.communication?.plateforme} />}
          </div>
        )}
      </Section>

      {/* ── 7. Aperçu calendrier (lecture seule — synchronisé depuis le plan annuel) */}
      {(local.apercu_calendrier?.length ?? 0) > 0 && (
        <div style={{
          background: 'var(--card-bg)', backdropFilter: 'blur(var(--card-blur))',
          border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)',
          padding: '20px 24px', marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Aperçu du calendrier</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Synchronisé depuis le plan annuel</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Semaines', 'Séquence', 'Description'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--card-border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {local.apercu_calendrier!.map((row, i) => (
                  <tr key={i} style={{ borderBottom: i < local.apercu_calendrier!.length - 1 ? '1px solid rgba(139,151,172,0.1)' : 'none' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--violet)', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.semaines}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{row.titre}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 12 }}>{row.description ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pied de document ────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(139,151,172,0.04)', border: '1px solid rgba(139,151,172,0.12)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Ce syllabus est indicatif et peut être adapté selon les besoins pédagogiques de la classe.
        {local.genere_par_ia && local.generated_at && (
          <> Généré par ScorgIA le {new Date(local.generated_at).toLocaleDateString('fr-CA')} · version {local.version ?? '3.0'}.</>
        )}
      </div>

    </div>
  )
}
