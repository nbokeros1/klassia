'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LoadingScreen from '@/components/LoadingScreen'
import type { Eleve, Classe, StudentSupportPlanRow } from '@/lib/types/database'

// ─── Types locaux ─────────────────────────────────────────────────────────────

type WorkspaceTab = 'profil' | 'plan' | 'historique'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function planStatutLabel(statut: StudentSupportPlanRow['statut']): { label: string; color: string } {
  switch (statut) {
    case 'actif':     return { label: 'Actif',     color: '#22C55E' }
    case 'brouillon': return { label: 'Brouillon', color: '#94A3B8' }
    case 'en_revue':  return { label: 'En revue',  color: '#F59E0B' }
    case 'archive':   return { label: 'Archivé',   color: '#64748B' }
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--card-border)' }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  )
}

// ─── Onglet Profil ────────────────────────────────────────────────────────────

function ProfilTab({ eleve }: { eleve: Eleve }) {
  const besoins = eleve.besoins ?? []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Section title="Informations générales">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.4px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Prénom
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{eleve.prenom}</div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.4px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Nom
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{eleve.nom}</div>
          </div>
        </div>
      </Section>

      <Section title="Besoins documentés">
        {besoins.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Aucun besoin documenté pour cet élève.
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {besoins.map((b, i) => (
              <span
                key={i}
                style={{
                  padding: '6px 14px', borderRadius: 99, fontSize: 12.5, fontWeight: 500,
                  background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)',
                  color: 'var(--text-primary)',
                }}
              >
                {b}
              </span>
            ))}
          </div>
        )}
      </Section>

      {eleve.notes_enseignant && (
        <Section title="Notes de l'enseignant">
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
            {eleve.notes_enseignant}
          </p>
        </Section>
      )}
    </div>
  )
}

// ─── Onglet Plan ──────────────────────────────────────────────────────────────

function PlanTab({ plans }: { plans: StudentSupportPlanRow[] }) {
  const actif = plans.find(p => p.statut === 'actif')
  const autres = plans.filter(p => p.statut !== 'actif' && p.statut !== 'archive')
  const archives = plans.filter(p => p.statut === 'archive')

  if (plans.length === 0) {
    return (
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 12, padding: '40px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          Aucun plan de soutien
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
          Les plans de soutien individualisés seront disponibles après la mise en place de la structure de données (migration 042).
        </div>
      </div>
    )
  }

  function PlanCard({ plan }: { plan: StudentSupportPlanRow }) {
    const s = planStatutLabel(plan.statut)
    const objectifs = Array.isArray(plan.objectifs) ? plan.objectifs : []
    const interventions = Array.isArray(plan.interventions) ? plan.interventions : []
    return (
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 12, padding: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{
            fontSize: 11.5, fontWeight: 700, color: s.color,
            background: `${s.color}18`, border: `1px solid ${s.color}30`,
            borderRadius: 6, padding: '3px 10px',
          }}>{s.label}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Créé le {formatDate(plan.date_creation)}
          </span>
          {plan.date_revision && (
            <span style={{
              fontSize: 12, color: new Date(plan.date_revision) < new Date() ? '#EF4444' : 'var(--text-muted)',
            }}>
              · Révision prévue : {formatDate(plan.date_revision)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>{objectifs.length}</span>
            {' '}objectif{objectifs.length !== 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>{interventions.length}</span>
            {' '}intervention{interventions.length !== 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Confidentialité : <span style={{ fontWeight: 600 }}>{plan.niveau_confidentialite}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {actif && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.4px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
            Plan actif
          </div>
          <PlanCard plan={actif} />
        </div>
      )}
      {autres.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.4px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
            Autres plans
          </div>
          {autres.map(p => <PlanCard key={p.id} plan={p} />)}
        </div>
      )}
      {archives.length > 0 && (
        <details>
          <summary style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 10 }}>
            {archives.length} plan{archives.length !== 1 ? 's' : ''} archivé{archives.length !== 1 ? 's' : ''}
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            {archives.map(p => <PlanCard key={p.id} plan={p} />)}
          </div>
        </details>
      )}
    </div>
  )
}

// ─── Onglet Historique ────────────────────────────────────────────────────────

function HistoriqueTab({ plans }: { plans: StudentSupportPlanRow[] }) {
  const entries = plans
    .flatMap(p => {
      const log = Array.isArray(p.changes_log) ? p.changes_log : []
      return (log as { id?: string; timestamp?: string; actor_type?: string; action?: string; note?: string }[]).map(e => ({
        ...e,
        plan_statut: p.statut,
      }))
    })
    .sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime())

  if (entries.length === 0) {
    return (
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 12, padding: '40px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Aucun historique disponible.
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--card-border)' }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
          Journal des modifications
        </span>
      </div>
      <div style={{ padding: '8px 0' }}>
        {entries.map((e, i) => (
          <div
            key={e.id ?? i}
            style={{
              padding: '12px 20px', borderBottom: i < entries.length - 1 ? '1px solid var(--card-border)' : '',
              display: 'flex', gap: 14, alignItems: 'flex-start',
            }}
          >
            <div style={{
              fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)',
              minWidth: 120, flexShrink: 0, paddingTop: 1,
            }}>
              {e.timestamp ? formatDate(e.timestamp) : '—'}
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                {e.action ?? 'Modification'}
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>
                  · {e.actor_type ?? 'Inconnu'}
                </span>
              </div>
              {e.note && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{e.note}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function StudentDetailPage() {
  const { classeId, eleveId } = useParams<{ classeId: string; eleveId: string }>()
  const router = useRouter()

  const [loading,      setLoading]      = useState(true)
  const [eleve,        setEleve]        = useState<Eleve | null>(null)
  const [classe,       setClasse]       = useState<Classe | null>(null)
  const [supportPlans, setSupportPlans] = useState<StudentSupportPlanRow[]>([])
  const [activeTab,    setActiveTab]    = useState<WorkspaceTab>('profil')

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [eleveRes, classeRes, plansRes] = await Promise.all([
      supabase.from('eleves').select('*').eq('id', eleveId).single(),
      supabase.from('classes').select('*').eq('id', classeId).single(),
      supabase.from('student_support_plans').select('*').eq('eleve_id', eleveId),
    ])

    if (!eleveRes.data) { router.push(`/dashboard/mon-annee/${classeId}`); return }

    setEleve(eleveRes.data as Eleve)
    setClasse(classeRes.data as Classe | null)
    setSupportPlans((plansRes.data as StudentSupportPlanRow[] | null) ?? [])
    setLoading(false)
  }, [classeId, eleveId, router])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingScreen />
  if (!eleve)  return null

  const TABS: { id: WorkspaceTab; label: string }[] = [
    { id: 'profil',     label: 'Profil' },
    { id: 'plan',       label: `Plan de soutien${supportPlans.length > 0 ? ` (${supportPlans.length})` : ''}` },
    { id: 'historique', label: 'Historique' },
  ]

  const classeLabel = classe ? `${classe.matiere} — ${classe.nom}` : classeId

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary, #0F1B2D)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'var(--card-bg)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--card-border)',
      }}>
        <div style={{
          padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 16,
          maxWidth: 1200, margin: '0 auto',
        }}>
          <a
            href={`/dashboard/mon-annee/${classeId}?tab=eleves_soutien`}
            style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none', flexShrink: 0 }}
          >
            ← {classeLabel}
          </a>
          <div style={{ width: 1, height: 18, background: 'rgba(139,151,172,0.3)', flexShrink: 0 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(108,92,231,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#6C5CE7',
            }}>
              {eleve.prenom.charAt(0).toUpperCase()}{eleve.nom.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.6px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Profil élève
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {eleve.prenom} {eleve.nom}
              </div>
            </div>
          </div>
        </div>

        {/* Mini-nav */}
        <div style={{
          display: 'flex', padding: '0 28px', maxWidth: 1200, margin: '0 auto',
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: 'none', border: 'none', whiteSpace: 'nowrap',
                  color: isActive ? '#6C5CE7' : 'var(--text-muted)',
                  borderBottom: isActive ? '2px solid #6C5CE7' : '2px solid transparent',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Contenu ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '28px 28px 56px', maxWidth: 1200, margin: '0 auto' }}>
        {activeTab === 'profil'     && <ProfilTab eleve={eleve} />}
        {activeTab === 'plan'       && <PlanTab plans={supportPlans} />}
        {activeTab === 'historique' && <HistoriqueTab plans={supportPlans} />}
      </div>
    </div>
  )
}
