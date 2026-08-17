'use client'

import { useState, useMemo } from 'react'
import type { Eleve, Classe, StudentSupportPlanRow } from '@/lib/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

type Filter = 'tous' | 'plan_actif' | 'a_reviser' | 'avec_besoins' | 'sans_plan'

interface Props {
  eleves:           Eleve[]
  supportPlans:     StudentSupportPlanRow[]
  classes:          Classe[]
  classeId?:        string  // si fourni = vue filtrée par classe
  showClasseColumn?: boolean
  onSelectEleve?:  (eleveId: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHref(eleveId: string, classeId?: string): string {
  if (classeId) return `/dashboard/mon-annee/${classeId}/eleves/${eleveId}`
  return `/dashboard/mon-annee/eleves/${eleveId}`
}

function planStatutLabel(statut: StudentSupportPlanRow['statut']): { label: string; color: string } {
  switch (statut) {
    case 'actif':     return { label: 'Actif',     color: '#22C55E' }
    case 'brouillon': return { label: 'Brouillon', color: '#94A3B8' }
    case 'en_revue':  return { label: 'En revue',  color: '#F59E0B' }
    case 'archive':   return { label: 'Archivé',   color: '#64748B' }
  }
}

function isRevisionDepassee(plan: StudentSupportPlanRow): boolean {
  if (!plan.date_revision) return false
  return new Date(plan.date_revision) < new Date()
}

function getBesoinsLabel(besoins: string[] | null | undefined): string | null {
  if (!besoins || besoins.length === 0) return null
  if (besoins.length <= 2) return besoins.join(', ')
  return `${besoins.slice(0, 2).join(', ')} +${besoins.length - 2}`
}

// ─── Pill de filtre ───────────────────────────────────────────────────────────

function FilterPill({
  label, count, active, onClick,
}: {
  label: string; count: number; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 99, cursor: 'pointer',
        fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
        border: active ? '1px solid #6C5CE7' : '1px solid var(--card-border)',
        background: active ? 'rgba(108,92,231,0.12)' : 'rgba(139,151,172,0.06)',
        color: active ? '#6C5CE7' : 'var(--text-secondary)',
        transition: 'all 0.12s', flexShrink: 0,
      }}
    >
      {label}
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: active ? '#6C5CE7' : 'var(--text-muted)',
        background: active ? 'rgba(108,92,231,0.14)' : 'rgba(139,151,172,0.10)',
        borderRadius: 99, padding: '1px 7px',
        minWidth: 20, textAlign: 'center',
      }}>
        {count}
      </span>
    </button>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function NoResults({ filter }: { filter: Filter }) {
  const messages: Record<Filter, { titre: string; detail: string }> = {
    tous:        { titre: 'Aucun élève dans cette classe', detail: 'Les élèves apparaissent une fois ajoutés à la classe.' },
    plan_actif:  { titre: 'Aucun plan actif', detail: 'Créez un plan de soutien pour un élève depuis son profil.' },
    a_reviser:   { titre: 'Aucun plan en retard', detail: 'Toutes les révisions sont à jour.' },
    avec_besoins:{ titre: 'Aucun besoin documenté', detail: 'Les besoins sont renseignés dans le profil de chaque élève.' },
    sans_plan:   { titre: 'Tous les élèves ont un plan', detail: 'Tous les élèves ont au moins un plan de soutien.' },
  }
  const msg = messages[filter]
  return (
    <div style={{
      padding: '40px 24px', textAlign: 'center',
      borderTop: '1px solid var(--card-border)',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
        {msg.titre}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{msg.detail}</div>
    </div>
  )
}

// ─── Ligne élève ──────────────────────────────────────────────────────────────

function EleveRow({
  eleve, plan, revisionDepassee, classeNom, classeId, showClasse,
}: {
  eleve:             Eleve
  plan:              StudentSupportPlanRow | null
  revisionDepassee:  boolean
  classeNom:         string
  classeId:          string
  showClasse:        boolean
}) {
  const href = getHref(eleve.id, classeId)
  const besoinsLabel = getBesoinsLabel(eleve.besoins)

  return (
    <tr
      onClick={() => { window.location.href = href }}
      style={{ cursor: 'pointer', borderBottom: '1px solid var(--card-border)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(108,92,231,0.04)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = '' }}
    >
      {/* Nom élève */}
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(108,92,231,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#6C5CE7',
          }}>
            {eleve.prenom.charAt(0).toUpperCase()}{eleve.nom.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
              {eleve.prenom} {eleve.nom}
            </div>
            {eleve.notes_enseignant && (
              <div style={{
                fontSize: 11, color: 'var(--text-muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240,
              }}>
                {eleve.notes_enseignant}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Classe (optionnel) */}
      {showClasse && (
        <td style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--text-secondary)' }}>
          {classeNom}
        </td>
      )}

      {/* Besoins */}
      <td style={{ padding: '12px 16px' }}>
        {besoinsLabel ? (
          <span style={{
            fontSize: 11.5, fontWeight: 500, color: 'var(--text-secondary)',
            background: 'rgba(139,151,172,0.08)', border: '1px solid rgba(139,151,172,0.15)',
            borderRadius: 6, padding: '3px 8px', display: 'inline-block', maxWidth: 220,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {besoinsLabel}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
        )}
      </td>

      {/* Plan de soutien */}
      <td style={{ padding: '12px 16px' }}>
        {plan ? (
          <div>
            {(() => { const s = planStatutLabel(plan.statut); return (
              <span style={{
                fontSize: 11.5, fontWeight: 700, color: s.color,
                background: `${s.color}18`, border: `1px solid ${s.color}30`,
                borderRadius: 6, padding: '3px 9px',
              }}>{s.label}</span>
            )})()}
          </div>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucun plan</span>
        )}
      </td>

      {/* Révision */}
      <td style={{ padding: '12px 16px' }}>
        {plan?.date_revision ? (
          <span style={{
            fontSize: 12, fontWeight: revisionDepassee ? 700 : 400,
            color: revisionDepassee ? '#EF4444' : 'var(--text-secondary)',
          }}>
            {revisionDepassee && '! '}
            {new Date(plan.date_revision).toLocaleDateString('fr-CA', {
              year: 'numeric', month: 'short', day: 'numeric',
            })}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
        )}
      </td>

      {/* Action */}
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--violet)' }}>
          {plan ? 'Plan →' : 'Profil →'}
        </span>
      </td>
    </tr>
  )
}

// ─── StudentSupportList ───────────────────────────────────────────────────────

export default function StudentSupportList({
  eleves, supportPlans, classes, classeId, showClasseColumn = false, onSelectEleve,
}: Props) {
  const [filter, setFilter] = useState<Filter>('tous')
  const [search, setSearch] = useState('')

  const classeMap = useMemo(() => {
    const m: Record<string, Classe> = {}
    for (const c of classes) m[c.id] = c
    return m
  }, [classes])

  // Plan le plus récent par élève
  const planParEleve = useMemo(() => {
    const m: Record<string, StudentSupportPlanRow> = {}
    for (const plan of supportPlans) {
      const existing = m[plan.eleve_id]
      if (!existing || plan.statut === 'actif') {
        m[plan.eleve_id] = plan
      }
    }
    return m
  }, [supportPlans])

  // Élèves filtrés par classeId si fourni
  const elevesBase = useMemo(() => {
    if (!classeId) return eleves
    return eleves.filter(e => e.classe_id === classeId)
  }, [eleves, classeId])

  // Comptages pour filtres
  const counts = useMemo(() => ({
    tous:         elevesBase.length,
    plan_actif:   elevesBase.filter(e => planParEleve[e.id]?.statut === 'actif').length,
    a_reviser:    elevesBase.filter(e => {
      const p = planParEleve[e.id]
      return p ? isRevisionDepassee(p) : false
    }).length,
    avec_besoins: elevesBase.filter(e => (e.besoins?.length ?? 0) > 0).length,
    sans_plan:    elevesBase.filter(e => !planParEleve[e.id]).length,
  }), [elevesBase, planParEleve])

  // Application du filtre + recherche
  const filtered = useMemo(() => {
    let result = elevesBase

    switch (filter) {
      case 'plan_actif':
        result = result.filter(e => planParEleve[e.id]?.statut === 'actif')
        break
      case 'a_reviser':
        result = result.filter(e => {
          const p = planParEleve[e.id]
          return p ? isRevisionDepassee(p) : false
        })
        break
      case 'avec_besoins':
        result = result.filter(e => (e.besoins?.length ?? 0) > 0)
        break
      case 'sans_plan':
        result = result.filter(e => !planParEleve[e.id])
        break
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(e =>
        e.prenom.toLowerCase().includes(q) || e.nom.toLowerCase().includes(q),
      )
    }

    return result
  }, [elevesBase, filter, search, planParEleve])

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'tous',         label: 'Tous' },
    { id: 'plan_actif',   label: 'Plan actif' },
    { id: 'a_reviser',    label: 'À réviser' },
    { id: 'avec_besoins', label: 'Avec besoins' },
    { id: 'sans_plan',    label: 'Sans plan' },
  ]

  const TH = ({ children, align = 'left' }: { children?: React.ReactNode; align?: string }) => (
    <th style={{
      padding: '10px 16px', textAlign: align as 'left' | 'right',
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.4px',
      color: 'var(--text-muted)', textTransform: 'uppercase',
      borderBottom: '1px solid var(--card-border)', whiteSpace: 'nowrap',
    }}>{children}</th>
  )

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--card-border)',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>
          Élèves &amp; Soutien
        </span>
        <input
          type="search"
          placeholder="Rechercher un élève…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '7px 12px', borderRadius: 8, fontSize: 13,
            border: '1px solid var(--card-border)', background: 'rgba(139,151,172,0.06)',
            color: 'var(--text-primary)', outline: 'none', minWidth: 180, maxWidth: 260,
            flex: '1 1 180px',
          }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
          {FILTERS.map(f => (
            <FilterPill
              key={f.id}
              label={f.label}
              count={counts[f.id]}
              active={filter === f.id}
              onClick={() => setFilter(f.id)}
            />
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <NoResults filter={filter} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(139,151,172,0.04)' }}>
                <TH>Élève</TH>
                {showClasseColumn && <TH>Classe</TH>}
                <TH>Besoins</TH>
                <TH>Plan de soutien</TH>
                <TH>Révision prévue</TH>
                <TH align="right"></TH>
              </tr>
            </thead>
            <tbody>
              {filtered.map(eleve => {
                const plan  = planParEleve[eleve.id] ?? null
                const clsId = eleve.classe_id
                const cls   = classeMap[clsId]
                const classeNom = cls ? `${cls.matiere} — ${cls.nom}` : clsId
                return (
                  <EleveRow
                    key={eleve.id}
                    eleve={eleve}
                    plan={plan}
                    revisionDepassee={plan ? isRevisionDepassee(plan) : false}
                    classeNom={classeNom}
                    classeId={clsId}
                    showClasse={showClasseColumn}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {filtered.length > 0 && (
        <div style={{
          padding: '10px 20px', borderTop: '1px solid var(--card-border)',
          fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between',
        }}>
          <span>{filtered.length} élève{filtered.length !== 1 ? 's' : ''}</span>
          {filter !== 'tous' && (
            <button
              onClick={() => setFilter('tous')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11.5 }}
            >
              Réinitialiser le filtre
            </button>
          )}
        </div>
      )}
    </div>
  )
}
