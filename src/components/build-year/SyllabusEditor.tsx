'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { PackSyllabus } from '@/lib/types/teaching-pack'

interface Props {
  syllabus: PackSyllabus
  teachingPackId: string
  programmeAnnuelId: string
  readOnly?: boolean
  onSaved?: (s: PackSyllabus) => void
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function SyllabusEditor({ syllabus: initialSyllabus, teachingPackId, programmeAnnuelId, readOnly = false, onSaved }: Props) {
  const [syllabus, setSyllabus] = useState<PackSyllabus>(initialSyllabus)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isDirty, setIsDirty] = useState(false)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<PackSyllabus>(initialSyllabus)

  const save = useCallback(async (data: PackSyllabus) => {
    if (readOnly) return
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/spie/syllabus-save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ teaching_pack_id: teachingPackId, programme_annuel_id: programmeAnnuelId, syllabus: data }),
      })
      if (!res.ok) throw new Error()
      lastSaved.current = data
      setSaveStatus('saved')
      setIsDirty(false)
      onSaved?.(data)
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
  }, [teachingPackId, programmeAnnuelId, readOnly, onSaved])

  const update = useCallback(<K extends keyof PackSyllabus>(key: K, val: PackSyllabus[K]) => {
    setSyllabus(prev => {
      const next = { ...prev, [key]: val }
      setIsDirty(true)
      // Autosave après 1.5 secondes d'inactivité
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
      autosaveTimer.current = setTimeout(() => save(next), 1500)
      return next
    })
  }, [save])

  const updateListe = useCallback((key: keyof PackSyllabus, raw: string) => {
    const arr = raw.split('\n').map(l => l.trim()).filter(Boolean)
    update(key as keyof PackSyllabus, arr as PackSyllabus[keyof PackSyllabus])
  }, [update])

  // Nettoyage timer
  useEffect(() => () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }, [])

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)',
    color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
    cursor: readOnly ? 'default' : 'text',
  }
  const areaStyle: React.CSSProperties = {
    ...inputStyle, resize: 'vertical', minHeight: 100, lineHeight: 1.6,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Syllabus</h2>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
            {readOnly ? 'Vue en lecture seule' : 'Autosauvegarde active — les modifications sont enregistrées automatiquement.'}
          </p>
        </div>
        <SaveIndicator status={saveStatus} isDirty={isDirty} onManualSave={() => save(syllabus)} />
      </div>

      {/* Avertissement */}
      <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(251,195,74,.08)', border: '1px solid rgba(251,195,74,.25)', fontSize: 12, color: 'var(--text-secondary)' }}>
        ⚠ Ce syllabus a été généré par ScorgIA. Les politiques institutionnelles (retard, plagiat, assiduité, pondérations, coordonnées) ne sont jamais inventées — complétez-les si nécessaire.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Titre du cours *">
          <input value={syllabus.titre_cours} disabled={readOnly}
            onChange={e => update('titre_cours', e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Niveau *">
          <input value={syllabus.niveau} disabled={readOnly}
            onChange={e => update('niveau', e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Matière *">
          <input value={syllabus.matiere} disabled={readOnly}
            onChange={e => update('matiere', e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Version">
          <input value={syllabus.version ?? '1.0'} disabled={readOnly}
            onChange={e => update('version', e.target.value)} style={inputStyle} />
        </Field>
      </div>

      <Field label="Description du cours">
        <textarea value={syllabus.description ?? ''} disabled={readOnly}
          onChange={e => update('description', e.target.value)} style={areaStyle} rows={3} />
      </Field>

      <ListeField
        label="Grandes idées (une par ligne)"
        aide="Les grandes idées structurantes du cours"
        values={syllabus.grandes_idees ?? []}
        onChange={v => update('grandes_idees', v)}
        readOnly={readOnly}
      />

      <ListeField
        label="Résultats d'apprentissage (un par ligne)"
        aide="Formulez en termes observables et mesurables"
        values={syllabus.resultats_apprentissage ?? []}
        onChange={v => update('resultats_apprentissage', v)}
        readOnly={readOnly}
      />

      <ListeField
        label="Méthodes pédagogiques (une par ligne)"
        values={syllabus.methodes_pedagogiques ?? []}
        onChange={v => update('methodes_pedagogiques', v)}
        readOnly={readOnly}
      />

      <ListeField
        label="Méthodes d'évaluation (une par ligne)"
        values={syllabus.methodes_evaluation ?? []}
        onChange={v => update('methodes_evaluation', v)}
        readOnly={readOnly}
      />

      <ListeField
        label="Ressources suggérées (une par ligne)"
        values={syllabus.ressources_suggeres ?? []}
        onChange={v => update('ressources_suggeres', v)}
        readOnly={readOnly}
      />

      <ListeField
        label="Références curriculaires (normes, programme)"
        aide="Indiquez les sources officielles utilisées"
        values={syllabus.normes_reference ?? []}
        onChange={v => update('normes_reference', v)}
        readOnly={readOnly}
      />

      {/* Champs institutionnels — vides intentionnellement */}
      <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>📋 À compléter par l'enseignant</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          Les champs suivants ne sont jamais générés par ScorgIA pour éviter les erreurs :<br />
          Politiques de retard · Politiques d'assiduité · Règles de plagiat · Pondérations · Coordonnées · Règlements scolaires<br />
          <span style={{ color: '#FBC34A' }}>Complétez-les dans votre copie du syllabus si requis par votre école.</span>
        </div>
      </div>

      {/* Export */}
      {!readOnly && (
        <div style={{ display: 'flex', gap: 10 }}>
          <ExportBtn teachingPackId={teachingPackId} type="syllabus" label="📄 Exporter DOCX" />
        </div>
      )}
    </div>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

function ListeField({ label, aide, values, onChange, readOnly }: {
  label: string; aide?: string
  values: string[]; onChange: (v: string[]) => void
  readOnly?: boolean
}) {
  const [raw, setRaw] = useState(values.join('\n'))
  useEffect(() => setRaw(values.join('\n')), [values])

  return (
    <Field label={label}>
      {aide && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{aide}</div>}
      <textarea
        value={raw}
        disabled={readOnly}
        onChange={e => {
          setRaw(e.target.value)
          onChange(e.target.value.split('\n').map(l => l.trim()).filter(Boolean))
        }}
        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', minHeight: 80, lineHeight: 1.6 }}
        rows={Math.max(3, values.length + 1)}
      />
    </Field>
  )
}

function SaveIndicator({ status, isDirty, onManualSave }: { status: SaveStatus; isDirty: boolean; onManualSave: () => void }) {
  const configs: Record<SaveStatus, { text: string; color: string }> = {
    idle:   { text: isDirty ? 'Non sauvegardé' : 'Sauvegardé',  color: isDirty ? '#FBC34A' : '#34D399' },
    saving: { text: 'Sauvegarde…',                               color: '#60A5FA' },
    saved:  { text: 'Sauvegardé ✓',                              color: '#34D399' },
    error:  { text: 'Erreur de sauvegarde',                      color: '#F87171' },
  }
  const cfg = configs[status]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: cfg.color }}>{cfg.text}</span>
      {isDirty && status === 'idle' && (
        <button onClick={onManualSave} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          Sauvegarder
        </button>
      )}
    </div>
  )
}

function ExportBtn({ teachingPackId, type, label }: { teachingPackId: string; type: string; label: string }) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/spie/pack-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teaching_pack_id: teachingPackId, type }),
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `syllabus_${type}.docx`; a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Erreur lors de l\'export.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleExport} disabled={loading} style={{ padding: '8px 18px', borderRadius: 9, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
      {loading ? '⏳ Export…' : label}
    </button>
  )
}
