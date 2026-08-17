'use client'

import { useState } from 'react'
import type { ContenuProgramme, Unite, LeconProgramme, Lecon, ContenuLecon } from '@/lib/types/database'
import type { LessonTeachingState } from '@/lib/types/school-year-dashboard'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  contenu:        ContenuProgramme | undefined
  lecons:         Lecon[]                                         // DB rows préparées
  lessonStateMap: Record<string, LessonTeachingState> | undefined
  classeId:       string
}

type SelectedLecon = { seqIdx: number; leconIdx: number; leconProg: LeconProgramme }

// ─── Helpers ──────────────────────────────────────────────────────────────────

type LeconStatus = 'enseignee' | 'preparee' | 'planifiee'

function resolveStatus(l: LeconProgramme, si: number, li: number, map?: Record<string, LessonTeachingState>): LeconStatus {
  if (map?.[`${si}:${li}`]?.isTaught ?? l.statut === 'enseignee') return 'enseignee'
  if (l.lecon_id) return 'preparee'
  return 'planifiee'
}

const STATUS_CFG: Record<LeconStatus, { label: string; color: string }> = {
  enseignee: { label: 'Enseignée', color: '#22C55E' },
  preparee:  { label: 'Préparée',  color: '#6C5CE7' },
  planifiee: { label: 'Planifiée', color: '#94A3B8' },
}

function htmlToText(html: string | undefined): string {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function sectionText(val: string | string[] | undefined): string | null {
  if (!val) return null
  if (Array.isArray(val)) return val.filter(Boolean).join('\n')
  return htmlToText(val) || null
}

// ─── Section collapsable du plan ──────────────────────────────────────────────

function PlanSection({ titre, children, defaultOpen = true }: {
  titre: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid var(--card-border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '12px 0', textAlign: 'left',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', flex: 1 }}>
          {titre}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.15s' }}>▼</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 16, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Absent({ label }: { label: string }) {
  return <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>— {label}</span>
}

function TextContent({ val }: { val: string | undefined | null }) {
  if (!val) return <Absent label="À compléter" />
  return <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{val}</div>
}

function ListContent({ items }: { items: string[] | undefined }) {
  if (!items || items.length === 0) return <Absent label="À compléter" />
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((it, i) => (
        <li key={i} style={{ display: 'flex', gap: 8 }}>
          <span style={{ color: '#6C5CE7', flexShrink: 0, fontWeight: 700 }}>·</span>
          {it}
        </li>
      ))}
    </ul>
  )
}

// ─── Rendu document plan de leçon ─────────────────────────────────────────────

function LessonPlanDocument({
  leconProg, lecon, classeId,
}: {
  leconProg: LeconProgramme
  lecon:     Lecon | null
  classeId:  string
}) {
  const c: ContenuLecon | null = lecon?.contenu_json ?? null

  const objectifs     = sectionText(c?.objectifs)
  const criteres      = sectionText(c?.criteres)
  const materiel      = sectionText(c?.materiel)
  const differentiation = sectionText(c?.differentiation)
  const avant         = c?.avant?.amorce ?? sectionText(c?.avant_amorce)
  const modelisation  = c?.pendant?.modelisation ?? sectionText(c?.pendant_modelisation)
  const pratGuidee    = c?.pendant?.pratique_guidee ?? sectionText(c?.pendant_pratique_guidee)
  const pratAuto      = c?.pendant?.pratique_autonome ?? sectionText(c?.pendant_pratique_autonome)
  const cloture       = c?.apres?.retour ?? sectionText(c?.apres_cloture)
  const evalForm      = sectionText(c?.evaluation_formative)
  const notes         = c?.notes_enseignant

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── IDENTIFICATION ── */}
      <PlanSection titre="Identification" defaultOpen>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
          {[
            { label: 'Leçon', value: `L${leconProg.numero} — ${leconProg.titre}` },
            { label: 'Type',  value: leconProg.type ?? '—' },
            { label: 'Durée', value: `${leconProg.duree_minutes} min` },
            { label: 'Statut', value: lecon ? (lecon.statut ?? '—') : 'Non préparée' },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>{f.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{f.value}</div>
            </div>
          ))}
        </div>
      </PlanSection>

      {/* ── ANCRAGE CURRICULAIRE ── */}
      <PlanSection titre="Ancrage curriculaire" defaultOpen={!!(leconProg.curriculum_outcome_ids?.length)}>
        {leconProg.curriculum_outcome_ids && leconProg.curriculum_outcome_ids.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {leconProg.curriculum_outcome_ids.map((id, i) => (
              <span key={i} style={{
                fontSize: 11.5, fontWeight: 700, color: '#6C5CE7',
                background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)',
                borderRadius: 6, padding: '3px 10px',
              }}>{id}</span>
            ))}
          </div>
        ) : <Absent label="Résultats d'apprentissage non spécifiés" />}
      </PlanSection>

      {/* ── OBJECTIFS ── */}
      <PlanSection titre="Objectifs d'apprentissage" defaultOpen>
        {leconProg.objectif_apprentissage ? (
          <div>{leconProg.objectif_apprentissage}</div>
        ) : <TextContent val={objectifs} />}
      </PlanSection>

      {/* ── CRITÈRES DE RÉUSSITE ── */}
      <PlanSection titre="Critères de réussite" defaultOpen={!!criteres}>
        <TextContent val={criteres} />
      </PlanSection>

      {/* ── MATÉRIEL ── */}
      <PlanSection titre="Matériel / Ressources" defaultOpen={!!materiel}>
        {Array.isArray(c?.materiel)
          ? <ListContent items={c.materiel as string[]} />
          : <TextContent val={materiel} />}
      </PlanSection>

      {/* ── AMORCE ── */}
      <PlanSection titre="Ouverture / Amorce" defaultOpen={!!avant}>
        <TextContent val={avant} />
        {c?.avant?.temps_prevu && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
            Temps prévu : {c.avant.temps_prevu} min
          </div>
        )}
      </PlanSection>

      {/* ── ENSEIGNEMENT EXPLICITE ── */}
      <PlanSection titre="Enseignement explicite / Modelage" defaultOpen={!!modelisation}>
        <TextContent val={modelisation} />
      </PlanSection>

      {/* ── PRATIQUE GUIDÉE ── */}
      <PlanSection titre="Pratique guidée" defaultOpen={!!pratGuidee}>
        <TextContent val={pratGuidee} />
      </PlanSection>

      {/* ── PRATIQUE AUTONOME ── */}
      <PlanSection titre="Pratique autonome / Activité" defaultOpen={!!pratAuto}>
        <TextContent val={pratAuto} />
        {c?.pendant?.temps_prevu && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
            Temps prévu : {c.pendant.temps_prevu} min
          </div>
        )}
      </PlanSection>

      {/* ── CONSOLIDATION ── */}
      <PlanSection titre="Consolidation / Clôture" defaultOpen={!!cloture}>
        <TextContent val={cloture} />
      </PlanSection>

      {/* ── ÉVALUATION FORMATIVE ── */}
      <PlanSection titre="Vérification de la compréhension" defaultOpen={!!evalForm}>
        <TextContent val={evalForm} />
        {leconProg.preuve_apprentissage && (
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.4px', marginRight: 6 }}>Preuve</span>
            {leconProg.preuve_apprentissage}
          </div>
        )}
      </PlanSection>

      {/* ── DIFFÉRENCIATION ── */}
      <PlanSection titre="Différenciation" defaultOpen={false}>
        <TextContent val={differentiation} />
        {c?.differentiation_universelle && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Universelle</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{htmlToText(c.differentiation_universelle)}</div>
          </div>
        )}
        {c?.differentiation_ciblee && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Ciblée</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{htmlToText(c.differentiation_ciblee)}</div>
          </div>
        )}
      </PlanSection>

      {/* ── NOTES ENSEIGNANT ── */}
      {notes && (
        <PlanSection titre="Réflexion / Notes enseignant" defaultOpen>
          <TextContent val={htmlToText(notes)} />
        </PlanSection>
      )}

      {/* Lien vers Préparer si plan disponible */}
      {lecon && (
        <div style={{ padding: '16px 0', textAlign: 'right' }}>
          <a
            href={`/dashboard/classes/${classeId}/lecons/${lecon.id}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 8, textDecoration: 'none',
              background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.2)',
              color: '#6C5CE7', fontSize: 13, fontWeight: 600,
            }}
          >
            Ouvrir dans Préparer →
          </a>
        </div>
      )}
    </div>
  )
}

// ─── Sidebar de navigation ────────────────────────────────────────────────────

function Sidebar({
  contenu, lessonStateMap, selected, onSelect,
}: {
  contenu:        ContenuProgramme
  lessonStateMap: Record<string, LessonTeachingState> | undefined
  selected:       SelectedLecon | null
  onSelect:       (s: SelectedLecon) => void
}) {
  const [expandedUnites, setExpandedUnites] = useState<Set<number>>(
    () => new Set([0]),
  )

  function toggleUnite(idx: number) {
    setExpandedUnites(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
      {contenu.unites.map((unite, si) => {
        const isOpen = expandedUnites.has(si)
        return (
          <div key={si}>
            {/* Unité */}
            <button
              onClick={() => toggleUnite(si)}
              style={{
                width: '100%', padding: '8px 12px', textAlign: 'left',
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,151,172,0.06)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '' }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                background: 'rgba(108,92,231,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 800, color: '#6C5CE7',
              }}>U{unite.numero}</span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {unite.titre}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : '', transition: 'transform 0.15s' }}>▼</span>
            </button>

            {/* Leçons */}
            {isOpen && unite.lecons.map((l, li) => {
              const status = resolveStatus(l, si, li, lessonStateMap)
              const cfg = STATUS_CFG[status]
              const isSelected = selected?.seqIdx === si && selected?.leconIdx === li
              return (
                <button
                  key={li}
                  onClick={() => onSelect({ seqIdx: si, leconIdx: li, leconProg: l })}
                  style={{
                    width: '100%', padding: '7px 12px 7px 28px', textAlign: 'left',
                    background: isSelected ? 'rgba(108,92,231,0.1)' : 'none',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    borderRadius: 6,
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,151,172,0.06)' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = '' }}
                >
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 11.5, color: isSelected ? '#6C5CE7' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isSelected ? 700 : 400 }}>
                    L{l.numero} {l.titre}
                  </span>
                  <span style={{ fontSize: 9.5, flexShrink: 0, fontWeight: 600, color: cfg.color }}>
                    {cfg.label.slice(0, 3)}
                  </span>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ─── PlansLeconView ───────────────────────────────────────────────────────────

export default function PlansLeconView({ contenu, lecons, lessonStateMap, classeId }: Props) {
  const [selected, setSelected] = useState<SelectedLecon | null>(null)

  if (!contenu || contenu.unites.length === 0) {
    return (
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 12, padding: '40px 32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Plans de leçon non disponibles</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 400, margin: '0 auto 20px' }}>
          Les plans de leçon sont générés lors de la construction de l&apos;année scolaire.
        </div>
        <a href={`/dashboard/classes/${classeId}/programme`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '10px 20px', borderRadius: 8, textDecoration: 'none',
          background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.2)',
          color: '#6C5CE7', fontSize: 13, fontWeight: 600,
        }}>Construire mon année →</a>
      </div>
    )
  }

  // Lookup lecons by lecon_id
  const leconById: Record<string, Lecon> = {}
  for (const l of lecons) leconById[l.id] = l

  const selectedLecon = selected?.leconProg?.lecon_id
    ? (leconById[selected.leconProg.lecon_id] ?? null)
    : null

  return (
    <div style={{
      display: 'flex', gap: 0,
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 12, overflow: 'hidden', minHeight: '70vh',
    }}>
      {/* Sidebar */}
      <div style={{
        width: 260, flexShrink: 0, borderRight: '1px solid var(--card-border)',
        padding: '16px 8px', overflowY: 'auto', maxHeight: '80vh',
      }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 8px', marginBottom: 10 }}>
          Plans de leçon
        </div>
        <Sidebar
          contenu={contenu}
          lessonStateMap={lessonStateMap}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      {/* Panneau principal */}
      <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', maxHeight: '80vh' }}>
        {!selected ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60%', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
              Sélectionnez une leçon dans la liste pour afficher son plan.
            </div>
          </div>
        ) : (
          <div>
            {/* Breadcrumb */}
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 20 }}>
              U{contenu.unites[selected.seqIdx]?.numero} {contenu.unites[selected.seqIdx]?.titre}
              {' / '}
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                L{selected.leconProg.numero} {selected.leconProg.titre}
              </span>
            </div>

            {!selected.leconProg.lecon_id ? (
              <div style={{
                padding: '24px', borderRadius: 10,
                background: 'rgba(139,151,172,0.04)', border: '1px solid var(--card-border)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Plan non préparé
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto 16px' }}>
                  Cette leçon est planifiée mais le plan détaillé n&apos;a pas encore été préparé dans Préparer.
                </div>
                <a
                  href={`/dashboard/gerer/preparer`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 18px', borderRadius: 8, textDecoration: 'none',
                    background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.2)',
                    color: '#6C5CE7', fontSize: 13, fontWeight: 600,
                  }}
                >
                  Préparer cette leçon →
                </a>
              </div>
            ) : (
              <LessonPlanDocument
                leconProg={selected.leconProg}
                lecon={selectedLecon}
                classeId={classeId}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
