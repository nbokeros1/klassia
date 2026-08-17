'use client'

import { useState } from 'react'
import type { ContenuProgramme, Unite, LeconProgramme } from '@/lib/types/database'
import type { LessonTeachingState } from '@/lib/types/school-year-dashboard'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  contenu:        ContenuProgramme | undefined
  lessonStateMap: Record<string, LessonTeachingState> | undefined
  classeId:       string
  onSelectLecon?: (seqIdx: number, leconIdx: number) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type LeconStatus = 'enseignee' | 'preparee' | 'planifiee'

function resolveLeconStatus(
  lecon: LeconProgramme,
  seqIdx: number,
  leconIdx: number,
  map?: Record<string, LessonTeachingState>,
): LeconStatus {
  const key = `${seqIdx}:${leconIdx}`
  if (map?.[key]?.isTaught ?? lecon.statut === 'enseignee') return 'enseignee'
  if (lecon.lecon_id) return 'preparee'
  return 'planifiee'
}

const STATUS_CFG: Record<LeconStatus, { label: string; color: string; dot: string }> = {
  enseignee: { label: 'Enseignée', color: '#22C55E', dot: '#22C55E' },
  preparee:  { label: 'Préparée',  color: '#6C5CE7', dot: '#6C5CE7' },
  planifiee: { label: 'Planifiée', color: '#94A3B8', dot: '#94A3B8' },
}

function progressionRoleLabel(role?: string): string | null {
  if (!role) return null
  const map: Record<string, string> = {
    introduction:    'Introduction',
    acquisition:     'Acquisition',
    pratique:        'Pratique',
    approfondissement: 'Approfondissement',
    integration:     'Intégration',
    evaluation:      'Évaluation',
    autre:           '',
  }
  return map[role] ?? null
}

// ─── Carte de leçon ───────────────────────────────────────────────────────────

function LeconCard({
  lecon, seqIdx, leconIdx, lessonStateMap, classeId,
}: {
  lecon:          LeconProgramme
  seqIdx:         number
  leconIdx:       number
  lessonStateMap: Record<string, LessonTeachingState> | undefined
  classeId:       string
}) {
  const status = resolveLeconStatus(lecon, seqIdx, leconIdx, lessonStateMap)
  const cfg    = STATUS_CFG[status]
  const role   = progressionRoleLabel(lecon.progression_role)

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '14px 16px', borderRadius: 10,
      background: 'rgba(139,151,172,0.03)', border: '1px solid var(--card-border)',
      transition: 'background 0.1s',
    }}>
      {/* Numéro + statut */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${cfg.dot}15`, border: `1px solid ${cfg.dot}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: cfg.dot,
        }}>
          {lecon.numero}
        </div>
        <div style={{ width: 1, height: 6, background: 'rgba(139,151,172,0.2)' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Titre + badge statut */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
            {lecon.titre}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {role && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#94A3B8',
                background: 'rgba(139,151,172,0.08)', border: '1px solid rgba(139,151,172,0.15)',
                borderRadius: 99, padding: '1px 7px',
              }}>{role}</span>
            )}
            <span style={{
              fontSize: 10, fontWeight: 700, color: cfg.color,
              background: `${cfg.color}10`, border: `1px solid ${cfg.color}25`,
              borderRadius: 99, padding: '1px 7px',
            }}>{cfg.label}</span>
          </div>
        </div>

        {/* Sujet */}
        {lecon.sujet && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>
            {lecon.sujet}
          </div>
        )}

        {/* Objectif d'apprentissage (V2) */}
        {lecon.objectif_apprentissage && (
          <div style={{
            fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55,
            padding: '6px 10px', borderRadius: 6,
            background: 'rgba(108,92,231,0.04)', border: '1px solid rgba(108,92,231,0.08)',
            marginBottom: 6,
          }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '0.4px', marginRight: 6 }}>
              Objectif
            </span>
            {lecon.objectif_apprentissage}
          </div>
        )}

        {/* Justification (V2) */}
        {lecon.justification && (
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5, fontStyle: 'italic', marginBottom: 6 }}>
            {lecon.justification}
          </div>
        )}

        {/* RA liés (V2) */}
        {lecon.curriculum_outcome_ids && lecon.curriculum_outcome_ids.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            Issu de : {lecon.curriculum_outcome_ids.join(', ')}
          </div>
        )}

        {/* Durée + date enseignée */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {lecon.duree_minutes} min
          </span>
          {lessonStateMap?.[`${seqIdx}:${leconIdx}`]?.taughtAt && (
            <span style={{ fontSize: 11, color: '#22C55E' }}>
              Enseignée le {new Date(lessonStateMap[`${seqIdx}:${leconIdx}`].taughtAt!).toLocaleDateString('fr-CA')}
            </span>
          )}
          {lecon.lecon_id && (
            <a
              href={`/dashboard/classes/${classeId}/lecons/${lecon.lecon_id}`}
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 11, fontWeight: 600, color: '#6C5CE7', textDecoration: 'none' }}
            >
              Voir la leçon préparée →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Section séquence ─────────────────────────────────────────────────────────

function SequenceSection({
  unite, seqIdx, lessonStateMap, classeId, defaultOpen,
}: {
  unite:          Unite
  seqIdx:         number
  lessonStateMap: Record<string, LessonTeachingState> | undefined
  classeId:       string
  defaultOpen:    boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  const total  = unite.lecons.length
  const taught = unite.lecons.filter((l, li) => {
    const key = `${seqIdx}:${li}`
    return lessonStateMap?.[key]?.isTaught ?? l.statut === 'enseignee'
  }).length
  const prep = unite.lecons.filter(l => !!l.lecon_id).length
  const duree = unite.semaine_fin - unite.semaine_debut + 1
  const pct = total > 0 ? Math.round((taught / total) * 100) : 0

  const statColor = pct === 100 ? '#22C55E' : pct > 0 ? '#6C5CE7' : '#94A3B8'

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Header séquence */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '18px 24px', textAlign: 'left',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 16,
        }}
      >
        {/* Indicateur couleur */}
        <div style={{ width: 4, height: 40, borderRadius: 99, background: statColor, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Séquence {unite.numero}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Sem. {unite.semaine_debut}–{unite.semaine_fin} ({duree} sem.)
            </span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {unite.titre}
          </div>
        </div>

        {/* Stats compactes */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: statColor }}>{taught}/{total}</div>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>enseignées</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: prep > 0 ? '#6C5CE7' : '#94A3B8' }}>{prep}</div>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>préparées</div>
          </div>
          <span style={{
            fontSize: 10, color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s',
          }}>▼</span>
        </div>
      </button>

      {/* Contenu */}
      {open && (
        <div style={{ borderTop: '1px solid var(--card-border)', padding: '20px 24px' }}>

          {/* V2 métadonnées */}
          {(unite.justification_pedagogique || unite.activite_culminante || unite.evaluation_prevue) && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
              {unite.justification_pedagogique && (
                <div style={{
                  flex: '1 1 250px', padding: '12px 14px', borderRadius: 8,
                  background: 'rgba(108,92,231,0.04)', border: '1px solid rgba(108,92,231,0.10)',
                }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>
                    Justification pédagogique
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {unite.justification_pedagogique}
                  </div>
                </div>
              )}
              {unite.activite_culminante && (
                <div style={{ flex: '1 1 200px', padding: '12px 14px', borderRadius: 8, background: 'rgba(139,151,172,0.04)', border: '1px solid var(--card-border)' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>
                    Activité culminante
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{unite.activite_culminante}</div>
                </div>
              )}
              {unite.evaluation_prevue && (
                <div style={{ flex: '1 1 200px', padding: '12px 14px', borderRadius: 8, background: 'rgba(139,151,172,0.04)', border: '1px solid var(--card-border)' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>
                    Évaluation prévue
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{unite.evaluation_prevue}</div>
                </div>
              )}
            </div>
          )}

          {/* Leçons */}
          {unite.lecons.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Aucune leçon dans cette séquence.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {unite.lecons.map((l, li) => (
                <LeconCard
                  key={li}
                  lecon={l}
                  seqIdx={seqIdx}
                  leconIdx={li}
                  lessonStateMap={lessonStateMap}
                  classeId={classeId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SequencesView ────────────────────────────────────────────────────────────

export default function SequencesView({ contenu, lessonStateMap, classeId }: Props) {
  if (!contenu || contenu.unites.length === 0) {
    return (
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 12, padding: '40px 32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Séquences non disponibles
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 400, margin: '0 auto 20px' }}>
          Les séquences sont générées lors de la construction de l&apos;année scolaire.
        </div>
        <a
          href={`/dashboard/classes/${classeId}/programme`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 8, textDecoration: 'none',
            background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.2)',
            color: '#6C5CE7', fontSize: 13, fontWeight: 600,
          }}
        >
          Construire mon année →
        </a>
      </div>
    )
  }

  // Ouvrir automatiquement la séquence en cours
  const enCoursIdx = contenu.unites.findIndex((u, si) => {
    const total = u.lecons.length
    if (total === 0) return false
    const taught = u.lecons.filter((_, li) => {
      const key = `${si}:${li}`
      return lessonStateMap?.[key]?.isTaught
    }).length
    return taught > 0 && taught < total
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {contenu.unites.map((unite, si) => (
        <SequenceSection
          key={si}
          unite={unite}
          seqIdx={si}
          lessonStateMap={lessonStateMap}
          classeId={classeId}
          defaultOpen={si === enCoursIdx || (enCoursIdx < 0 && si === 0)}
        />
      ))}
    </div>
  )
}
