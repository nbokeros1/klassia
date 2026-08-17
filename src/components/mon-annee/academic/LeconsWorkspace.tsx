'use client'

import { useState, useMemo } from 'react'
import type { ContenuProgramme, Lecon, ContenuLecon, LeconProgramme } from '@/lib/types/database'
import type { LessonTeachingState } from '@/lib/types/school-year-dashboard'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  contenu:        ContenuProgramme | undefined
  lecons:         Lecon[]
  lessonStateMap: Record<string, LessonTeachingState> | undefined
  classeId:       string
}

type LeconStatus = 'enseignee' | 'preparee' | 'planifiee'

type ExplorerItem = {
  seqIdx:   number
  leconIdx: number
  leconProg: LeconProgramme
  lecon:    Lecon | null
  status:   LeconStatus
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function htmlToText(html: string | undefined | null): string {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

// ─── Rendu contenu leçon ──────────────────────────────────────────────────────

function ContentBlock({ titre, children }: { titre: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ borderBottom: '1px solid var(--card-border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '11px 0', background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', flex: 1 }}>
          {titre}
        </span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.15s' }}>▼</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 14, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
          {children}
        </div>
      )}
    </div>
  )
}

function StringOrList({ val }: { val: string | string[] | undefined | null }) {
  if (!val || (Array.isArray(val) && val.length === 0)) {
    return <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
  }
  if (Array.isArray(val)) {
    return (
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {val.map((v, i) => (
          <li key={i} style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: '#6C5CE7', fontWeight: 700, flexShrink: 0 }}>·</span>
            {htmlToText(v)}
          </li>
        ))}
      </ul>
    )
  }
  return <div style={{ whiteSpace: 'pre-wrap' }}>{htmlToText(val)}</div>
}

function LeconContentViewer({ lecon, leconProg, classeId }: { lecon: Lecon; leconProg: LeconProgramme; classeId: string }) {
  const c: ContenuLecon = lecon.contenu_json

  const avant    = c.avant?.amorce ?? c.avant_amorce
  const mod      = c.pendant?.modelisation ?? c.pendant_modelisation
  const guidee   = c.pendant?.pratique_guidee ?? c.pendant_pratique_guidee
  const autonome = c.pendant?.pratique_autonome ?? c.pendant_pratique_autonome
  const cloture  = c.apres?.retour ?? c.apres_cloture

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Identification */}
      <div style={{ paddingBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 1 }}>Statut</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: STATUS_CFG[leconProg.lecon_id ? 'preparee' : 'planifiee'].color }}>
              {lecon.statut ?? '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 1 }}>Durée</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>{lecon.duree_minutes} min</div>
          </div>
          {leconProg.curriculum_outcome_ids && leconProg.curriculum_outcome_ids.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'flex-end' }}>
              {leconProg.curriculum_outcome_ids.map((id, i) => (
                <span key={i} style={{
                  fontSize: 10.5, fontWeight: 700, color: '#6C5CE7',
                  background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)',
                  borderRadius: 6, padding: '2px 8px',
                }}>{id}</span>
              ))}
            </div>
          )}
        </div>

        {lecon.sujet && (
          <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>{lecon.sujet}</div>
        )}

        <a
          href={`/dashboard/classes/${classeId}/lecons/${lecon.id}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
            background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.2)',
            color: '#6C5CE7', fontSize: 12, fontWeight: 600,
          }}
        >
          Ouvrir dans Préparer →
        </a>
      </div>

      {/* Objectifs */}
      <ContentBlock titre="Objectifs d'apprentissage">
        <StringOrList val={c.objectifs ?? leconProg.objectif_apprentissage} />
      </ContentBlock>

      {/* Critères de réussite */}
      <ContentBlock titre="Critères de réussite">
        <StringOrList val={c.criteres} />
      </ContentBlock>

      {/* Matériel */}
      {(c.materiel) && (
        <ContentBlock titre="Matériel / Ressources">
          <StringOrList val={c.materiel} />
        </ContentBlock>
      )}

      {/* Amorce */}
      {avant && (
        <ContentBlock titre="Ouverture / Amorce">
          <div style={{ whiteSpace: 'pre-wrap' }}>{htmlToText(avant)}</div>
          {c.avant?.temps_prevu && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>{c.avant.temps_prevu} min</div>}
        </ContentBlock>
      )}

      {/* Modelage */}
      {mod && (
        <ContentBlock titre="Enseignement explicite / Modelage">
          <div style={{ whiteSpace: 'pre-wrap' }}>{htmlToText(mod)}</div>
        </ContentBlock>
      )}

      {/* Pratique guidée */}
      {guidee && (
        <ContentBlock titre="Pratique guidée">
          <div style={{ whiteSpace: 'pre-wrap' }}>{htmlToText(guidee)}</div>
        </ContentBlock>
      )}

      {/* Pratique autonome */}
      {autonome && (
        <ContentBlock titre="Pratique autonome">
          <div style={{ whiteSpace: 'pre-wrap' }}>{htmlToText(autonome)}</div>
          {c.pendant?.temps_prevu && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>{c.pendant.temps_prevu} min</div>}
        </ContentBlock>
      )}

      {/* Clôture */}
      {cloture && (
        <ContentBlock titre="Consolidation / Clôture">
          <div style={{ whiteSpace: 'pre-wrap' }}>{htmlToText(cloture)}</div>
        </ContentBlock>
      )}

      {/* Évaluation formative */}
      {c.evaluation_formative && (
        <ContentBlock titre="Vérification de la compréhension">
          <div style={{ whiteSpace: 'pre-wrap' }}>{htmlToText(c.evaluation_formative)}</div>
          {leconProg.preuve_apprentissage && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.4px', marginRight: 6 }}>Preuve</span>
              {leconProg.preuve_apprentissage}
            </div>
          )}
        </ContentBlock>
      )}

      {/* Différenciation */}
      {(c.differentiation || c.differentiation_universelle || c.differentiation_ciblee) && (
        <ContentBlock titre="Différenciation">
          {c.differentiation && <div style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{htmlToText(c.differentiation)}</div>}
          {c.differentiation_universelle && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginRight: 6 }}>Universelle</span>
              {htmlToText(c.differentiation_universelle)}
            </div>
          )}
          {c.differentiation_ciblee && (
            <div>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginRight: 6 }}>Ciblée</span>
              {htmlToText(c.differentiation_ciblee)}
            </div>
          )}
        </ContentBlock>
      )}

      {/* Notes */}
      {c.notes_enseignant && (
        <ContentBlock titre="Réflexion / Notes enseignant">
          <div style={{ whiteSpace: 'pre-wrap' }}>{htmlToText(c.notes_enseignant)}</div>
        </ContentBlock>
      )}
    </div>
  )
}

// ─── Explorer tree sidebar ────────────────────────────────────────────────────

type FilterType = 'tous' | 'preparee' | 'planifiee' | 'enseignee'

function ExplorerTree({
  items, selectedIdx, onSelect, filter, onFilterChange,
}: {
  items:          ExplorerItem[]
  selectedIdx:    number | null
  onSelect:       (idx: number) => void
  filter:         FilterType
  onFilterChange: (f: FilterType) => void
}) {
  const filters: { id: FilterType; label: string }[] = [
    { id: 'tous',      label: 'Toutes' },
    { id: 'enseignee', label: 'Enseignées' },
    { id: 'preparee',  label: 'Préparées' },
    { id: 'planifiee', label: 'Non préparées' },
  ]

  const filtered = filter === 'tous' ? items : items.filter(it => it.status === filter)

  // Group by seqIdx
  const groups: Record<number, ExplorerItem[]> = {}
  for (const it of filtered) {
    if (!groups[it.seqIdx]) groups[it.seqIdx] = []
    groups[it.seqIdx].push(it)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '0 4px 12px' }}>
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            style={{
              padding: '3px 9px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 10.5, fontWeight: 600,
              background: filter === f.id ? 'rgba(108,92,231,0.14)' : 'rgba(139,151,172,0.07)',
              color: filter === f.id ? '#6C5CE7' : 'var(--text-muted)',
            }}
          >{f.label}</button>
        ))}
      </div>

      {/* Tree */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {Object.keys(groups).length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '16px 8px', textAlign: 'center', fontStyle: 'italic' }}>
            Aucune leçon dans ce filtre.
          </div>
        ) : Object.entries(groups).map(([siStr, its]) => {
          const si = Number(siStr)
          return (
            <div key={si} style={{ marginBottom: 8 }}>
              <div style={{
                fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.4px', padding: '6px 8px 4px',
              }}>
                Séquence {its[0]?.leconProg ? si + 1 : ''}
              </div>
              {its.map((it, localIdx) => {
                const globalIdx = items.indexOf(it)
                const cfg = STATUS_CFG[it.status]
                const isSelected = globalIdx === selectedIdx
                return (
                  <button
                    key={localIdx}
                    onClick={() => onSelect(globalIdx)}
                    style={{
                      width: '100%', padding: '7px 8px', textAlign: 'left',
                      background: isSelected ? 'rgba(108,92,231,0.1)' : 'none',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      borderRadius: 6,
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,151,172,0.06)' }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = '' }}
                  >
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                    <span style={{
                      flex: 1, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: isSelected ? '#6C5CE7' : 'var(--text-secondary)',
                      fontWeight: isSelected ? 700 : 400,
                    }}>
                      L{it.leconProg.numero} {it.leconProg.titre}
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── LeconsWorkspace ──────────────────────────────────────────────────────────

export default function LeconsWorkspace({ contenu, lecons, lessonStateMap, classeId }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [filter, setFilter] = useState<FilterType>('tous')

  const leconById = useMemo(() => {
    const map: Record<string, Lecon> = {}
    for (const l of lecons) map[l.id] = l
    return map
  }, [lecons])

  // Build flat list of all leçons from the programme
  const allItems: ExplorerItem[] = useMemo(() => {
    if (!contenu) return []
    const list: ExplorerItem[] = []
    contenu.unites.forEach((u, si) => {
      u.lecons.forEach((l, li) => {
        const dbLecon = l.lecon_id ? (leconById[l.lecon_id] ?? null) : null
        list.push({
          seqIdx:   si,
          leconIdx: li,
          leconProg: l,
          lecon:    dbLecon,
          status:   resolveStatus(l, si, li, lessonStateMap),
        })
      })
    })
    return list
  }, [contenu, leconById, lessonStateMap])

  const selectedItem = selectedIdx !== null ? (allItems[selectedIdx] ?? null) : null

  if (!contenu || allItems.length === 0) {
    return (
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 12, padding: '40px 32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Aucune leçon disponible
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 400, margin: '0 auto 20px' }}>
          Les leçons sont créées lors de la construction de l&apos;année scolaire.
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

  // Stats
  const stats = { enseignee: 0, preparee: 0, planifiee: 0 }
  for (const it of allItems) stats[it.status]++

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {(Object.entries(stats) as [LeconStatus, number][]).map(([s, n]) => {
          const cfg = STATUS_CFG[s]
          return (
            <div key={s} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 8,
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{n}</span>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{cfg.label.toLowerCase()}{n > 1 ? 's' : ''}</span>
            </div>
          )
        })}
      </div>

      {/* Split pane */}
      <div style={{
        display: 'flex', gap: 0,
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 12, overflow: 'hidden', minHeight: '70vh',
      }}>
        {/* Explorer sidebar */}
        <div style={{
          width: 260, flexShrink: 0, borderRight: '1px solid var(--card-border)',
          padding: '16px 8px', display: 'flex', flexDirection: 'column',
          maxHeight: '80vh', overflow: 'hidden',
        }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 8px', marginBottom: 10 }}>
            Leçons ({allItems.length})
          </div>
          <ExplorerTree
            items={allItems}
            selectedIdx={selectedIdx}
            onSelect={setSelectedIdx}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>

        {/* Contenu leçon */}
        <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', maxHeight: '80vh' }}>
          {!selectedItem ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                Sélectionnez une leçon pour afficher son contenu.
              </div>
            </div>
          ) : (
            <div>
              {/* Breadcrumb */}
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 8 }}>
                Séq. {selectedItem.seqIdx + 1}
                {' / '}
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  L{selectedItem.leconProg.numero} {selectedItem.leconProg.titre}
                </span>
              </div>

              {/* Titre */}
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.2 }}>
                {selectedItem.leconProg.titre}
              </div>

              {selectedItem.lecon ? (
                <LeconContentViewer
                  lecon={selectedItem.lecon}
                  leconProg={selectedItem.leconProg}
                  classeId={classeId}
                />
              ) : (
                <div style={{
                  padding: '24px', borderRadius: 10,
                  background: 'rgba(139,151,172,0.04)', border: '1px solid var(--card-border)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Leçon non préparée
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto 16px' }}>
                    Cette leçon est planifiée dans le programme annuel mais le contenu détaillé n&apos;a pas encore été créé.
                  </div>
                  {selectedItem.leconProg.objectif_apprentissage && (
                    <div style={{
                      fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic',
                      padding: '12px 16px', borderRadius: 8,
                      background: 'rgba(108,92,231,0.04)', border: '1px solid rgba(108,92,231,0.08)',
                      maxWidth: 420, margin: '0 auto 16px', lineHeight: 1.6,
                    }}>
                      Objectif : {selectedItem.leconProg.objectif_apprentissage}
                    </div>
                  )}
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
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
