'use client'

import { useMemo } from 'react'
import type { Eleve, StudentSupportPlanRow } from '@/lib/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  eleves:       Eleve[]
  supportPlans: StudentSupportPlanRow[]
  classeId:     string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function aggregateBesoins(eleves: Eleve[]): { besoin: string; count: number }[] {
  const m: Record<string, number> = {}
  for (const e of eleves) {
    for (const b of (e.besoins ?? [])) {
      m[b] = (m[b] ?? 0) + 1
    }
  }
  return Object.entries(m)
    .map(([besoin, count]) => ({ besoin, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
}

// ─── Carte statistique ────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div style={{
      background: 'rgba(139,151,172,0.04)', border: '1px solid var(--card-border)',
      borderRadius: 10, padding: '14px 16px', flex: '1 1 120px',
    }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: accent ?? 'var(--text-primary)', lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ─── ClassSupportSummary ──────────────────────────────────────────────────────

export default function ClassSupportSummary({ eleves, supportPlans, classeId }: Props) {
  const classEleves = useMemo(
    () => eleves.filter(e => e.classe_id === classeId),
    [eleves, classeId],
  )

  const planMap = useMemo(() => {
    const m: Record<string, StudentSupportPlanRow[]> = {}
    for (const p of supportPlans) {
      if (!m[p.eleve_id]) m[p.eleve_id] = []
      m[p.eleve_id].push(p)
    }
    return m
  }, [supportPlans])

  const stats = useMemo(() => {
    const total    = classEleves.length
    const avecPlan = classEleves.filter(e => (planMap[e.id]?.length ?? 0) > 0).length
    const actifs   = supportPlans.filter(p => {
      const eleve = classEleves.find(e => e.id === p.eleve_id)
      return eleve && p.statut === 'actif'
    }).length
    const aReviser = supportPlans.filter(p => {
      const eleve = classEleves.find(e => e.id === p.eleve_id)
      if (!eleve || !p.date_revision) return false
      return new Date(p.date_revision) < new Date()
    }).length
    const avecBesoins = classEleves.filter(e => (e.besoins?.length ?? 0) > 0).length
    return { total, avecPlan, actifs, aReviser, avecBesoins }
  }, [classEleves, planMap, supportPlans])

  const besoinsAgreges = useMemo(
    () => aggregateBesoins(classEleves),
    [classEleves],
  )

  const plansVides = supportPlans.length === 0

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          Aperçu de classe — Soutien
        </span>
        <span style={{ marginLeft: 12, fontSize: 11.5, color: 'var(--text-muted)' }}>
          Vue non-nominative · Agrégats uniquement
        </span>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Métriques */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          <StatCard label="Élèves" value={stats.total} />
          <StatCard
            label="Avec besoins documentés"
            value={stats.avecBesoins}
            sub={stats.total > 0 ? `${Math.round((stats.avecBesoins / stats.total) * 100)} % de la classe` : undefined}
            accent={stats.avecBesoins > 0 ? '#6C5CE7' : undefined}
          />
          <StatCard
            label="Plans actifs"
            value={plansVides ? '—' : stats.actifs}
            sub={plansVides ? 'En attente de migration' : `sur ${stats.avecPlan} planifié${stats.avecPlan !== 1 ? 's' : ''}`}
            accent={stats.actifs > 0 ? '#22C55E' : undefined}
          />
          <StatCard
            label="Révisions dépassées"
            value={plansVides ? '—' : stats.aReviser}
            accent={stats.aReviser > 0 ? '#EF4444' : undefined}
          />
        </div>

        {/* Besoins agrégés */}
        {besoinsAgreges.length > 0 ? (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.4px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
              Besoins documentés — distribution (anonyme)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {besoinsAgreges.map(({ besoin, count }) => (
                <div
                  key={besoin}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '6px 12px', borderRadius: 8,
                    background: 'rgba(108,92,231,0.06)', border: '1px solid rgba(108,92,231,0.15)',
                  }}
                >
                  <span style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{besoin}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#6C5CE7',
                    background: 'rgba(108,92,231,0.12)', borderRadius: 99,
                    padding: '1px 7px',
                  }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{
            padding: '16px', borderRadius: 8,
            background: 'rgba(139,151,172,0.04)', border: '1px solid var(--card-border)',
            fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic',
          }}>
            Aucun besoin documenté dans cette classe.
          </div>
        )}

        {/* Notice plans vides */}
        {plansVides && (
          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 8,
            background: 'rgba(139,151,172,0.04)', border: '1px solid var(--card-border)',
            fontSize: 12, color: 'var(--text-muted)',
          }}>
            Les plans de soutien individualisés seront disponibles après la mise en place de la structure de données (migration 042).
          </div>
        )}
      </div>
    </div>
  )
}
