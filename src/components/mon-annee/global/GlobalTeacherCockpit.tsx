'use client'

import { useState, useMemo } from 'react'
import type { Classe, ProgrammeAnnuel, Eleve, StudentSupportPlanRow } from '@/lib/types/database'
import type { TeachingPack } from '@/lib/types/teaching-pack'
import StudentSupportList from '@/components/mon-annee/student-support/StudentSupportList'

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface Props {
  profil:       { prenom: string; nom: string } | null
  classes:      Classe[]
  packs:        Record<string, TeachingPack>
  programmes:   Record<string, ProgrammeAnnuel>
  eventCounts:  Record<string, number>        // packId → nb leçons enseignées
  eleves:       Eleve[]                       // TOUS les élèves (toutes classes)
  supportPlans: StudentSupportPlanRow[]       // vide si table pas encore en prod
}

type HubTab = 'apercu' | 'eleves_soutien'

type AttentionItem = {
  id:       string
  label:    string
  detail:   string
  classe?:  string
  priority: 'haute' | 'moderee'
  cta:      string
  href:     string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function subjectColor(matiere: string): string {
  const m = matiere.toLowerCase()
  if (m.includes('math'))  return '#7C3AED'
  if (m.includes('sci') || m.includes('bio') || m.includes('chim')) return '#16A34A'
  if (m.includes('franç') || m.includes('franc') || m.includes('litt')) return '#B45309'
  if (m.includes('hist'))  return '#92400E'
  if (m.includes('musi'))  return '#1D4ED8'
  if (m.includes('angl') || m.includes('engl')) return '#075985'
  return '#6C5CE7'
}

function subjectInitial(matiere: string): string {
  const m = matiere.toLowerCase()
  if (m.includes('math'))  return '∑'
  if (m.includes('sci') || m.includes('bio') || m.includes('chim')) return 'Sc'
  if (m.includes('franç') || m.includes('franc') || m.includes('litt')) return 'Aa'
  if (m.includes('hist'))  return 'Hs'
  if (m.includes('musi'))  return '♩'
  if (m.includes('angl') || m.includes('engl')) return 'En'
  return matiere.slice(0, 2).toUpperCase()
}

function computeYearElapsed(annee_scolaire: string): number {
  const parts = annee_scolaire.split('-')
  const startYear = parseInt(parts[0] ?? '2025', 10)
  const start = new Date(startYear, 8, 1)
  const end   = new Date(startYear + 1, 5, 30)
  const now   = new Date()
  if (now <= start) return 0
  if (now >= end)   return 1
  return (now.getTime() - start.getTime()) / (end.getTime() - start.getTime())
}

function lessonCountFromProgramme(programme: ProgrammeAnnuel | undefined): number {
  if (!programme) return 0
  const contenu = programme.contenu_json as { unites?: { lecons?: unknown[] }[] } | undefined
  return contenu?.unites?.reduce((s, u) => s + (u.lecons?.length ?? 0), 0) ?? 0
}

function getRythme(progressPct: number, yearElapsed: number): {
  label: string
  color: string
} {
  if (yearElapsed < 0.05) return { label: 'Début d\'année', color: 'var(--text-muted)' }
  const delta = progressPct - yearElapsed * 100
  if (delta >= -10)  return { label: 'Dans le rythme', color: '#22C55E' }
  if (delta >= -25)  return { label: 'À surveiller',   color: '#F59E0B' }
  return               { label: 'En retard',           color: '#EF4444' }
}

// ─── Class Selector ───────────────────────────────────────────────────────────

function ClassSelectorGlobal({ classes }: { classes: Classe[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.25)',
          color: 'var(--text-primary)', fontSize: 13.5, fontWeight: 600,
        }}
      >
        <span>Toutes mes classes</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>▼</span>
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} aria-hidden />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            minWidth: 260, padding: '6px 0',
          }}>
            <div style={{ padding: '8px 16px 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Mes classes
            </div>
            {classes.map(cls => (
              <a
                key={cls.id}
                href={`/dashboard/mon-annee/${cls.id}`}
                style={{ display: 'block', padding: '9px 16px', textDecoration: 'none', color: 'var(--text-primary)', fontSize: 13 }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(139,151,172,0.06)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '' }}
              >
                <div style={{ fontWeight: 600 }}>{cls.matiere}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cls.nom} · {cls.niveau}</div>
              </a>
            ))}
            <div style={{ borderTop: '1px solid var(--card-border)', margin: '4px 0' }} />
            <a href="/dashboard/classes"
               style={{ display: 'block', padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>
              Gérer mes classes →
            </a>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, accent }: {
  label:   string
  value:   string | number
  sub?:    string
  accent?: string
}) {
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 12, padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: 4,
      flex: '1 1 140px',
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent ?? 'var(--text-primary)', lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

// ─── Attention Panel ──────────────────────────────────────────────────────────

function AttentionPanel({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 12, padding: '20px 24px',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 14 }}>
        À mon attention
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(item => (
          <div
            key={item.id}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px 14px', borderRadius: 8,
              background: item.priority === 'haute'
                ? 'rgba(245,158,11,0.06)'
                : 'rgba(139,151,172,0.06)',
              border: `1px solid ${item.priority === 'haute'
                ? 'rgba(245,158,11,0.2)'
                : 'rgba(139,151,172,0.12)'}`,
            }}
          >
            <div style={{
              width: 6, height: 6, borderRadius: '50%', marginTop: 6, flexShrink: 0,
              background: item.priority === 'haute' ? '#F59E0B' : 'var(--text-muted)',
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                {item.label}
                {item.classe && (
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>
                    · {item.classe}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.detail}</div>
            </div>
            <a
              href={item.href}
              style={{
                flexShrink: 0, fontSize: 12, fontWeight: 600,
                color: 'var(--violet)', textDecoration: 'none', whiteSpace: 'nowrap',
              }}
            >
              {item.cta} →
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Class Table ──────────────────────────────────────────────────────────────

function ClassTable({ classes, packs, programmes, eventCounts, eleves }: {
  classes:     Classe[]
  packs:       Record<string, TeachingPack>
  programmes:  Record<string, ProgrammeAnnuel>
  eventCounts: Record<string, number>
  eleves:      Eleve[]
}) {
  const annee = packs[Object.keys(packs)[0] ?? '']?.annee_scolaire
    ?? classes[0]?.annee_scolaire ?? '2026-2027'
  const yearElapsed = computeYearElapsed(annee)

  // Count eleves per class
  const elevesParClasse = useMemo(() => {
    const m: Record<string, number> = {}
    for (const e of eleves) m[e.classe_id] = (m[e.classe_id] ?? 0) + 1
    return m
  }, [eleves])

  const TH = ({ children, align = 'left' }: { children?: React.ReactNode; align?: string }) => (
    <th style={{
      padding: '10px 14px', textAlign: align as 'left' | 'right' | 'center',
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
      <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid var(--card-border)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          Vue d&apos;ensemble des classes
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(139,151,172,0.04)' }}>
              <TH>Classe</TH>
              <TH align="right">Élèves</TH>
              <TH align="right">Leçons</TH>
              <TH align="right">Progression</TH>
              <TH>Rythme</TH>
              <TH>Séquence</TH>
              <TH></TH>
            </tr>
          </thead>
          <tbody>
            {classes.map((cls, idx) => {
              const pack  = packs[cls.id]
              const prog  = programmes[cls.id]
              const count = pack ? (eventCounts[pack.id] ?? 0) : 0
              const total = lessonCountFromProgramme(prog)
              const pct   = total > 0 ? Math.round((count / total) * 100) : null
              const rythme = pct !== null ? getRythme(pct, yearElapsed) : null
              const color  = subjectColor(cls.matiere)
              const initial = subjectInitial(cls.matiere)
              const nbEleves = elevesParClasse[cls.id] ?? cls.nombre_eleves ?? 0

              // Current sequence: find from pack contents
              const contenu = prog?.contenu_json as { unites?: { titre?: string }[] } | undefined
              const unites = contenu?.unites ?? []
              const seqEnCours = unites.length > 0 ? (unites[0] as { titre?: string }).titre ?? 'S1' : null

              return (
                <tr
                  key={cls.id}
                  onClick={() => { window.location.href = `/dashboard/mon-annee/${cls.id}` }}
                  style={{
                    cursor: 'pointer', transition: 'background 0.12s',
                    borderBottom: idx < classes.length - 1 ? '1px solid var(--card-border)' : '',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(108,92,231,0.04)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = '' }}
                >
                  {/* Classe */}
                  <td style={{ padding: '14px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: `${color}18`, border: `1px solid ${color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color,
                      }}>{initial}</div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {cls.matiere}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {cls.nom} · {cls.niveau}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Élèves */}
                  <td style={{ padding: '14px', textAlign: 'right', fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {nbEleves > 0 ? nbEleves : '—'}
                  </td>

                  {/* Leçons */}
                  <td style={{ padding: '14px', textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {pack && total > 0 ? (
                      <span>
                        <span style={{ fontWeight: 700, color: '#22C55E' }}>{count}</span>
                        <span style={{ color: 'var(--text-muted)' }}> / {total}</span>
                      </span>
                    ) : '—'}
                  </td>

                  {/* Progression */}
                  <td style={{ padding: '14px', textAlign: 'right', minWidth: 100 }}>
                    {pct !== null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                        <div style={{ width: 56, height: 4, background: 'rgba(139,151,172,0.15)', borderRadius: 99, flexShrink: 0 }}>
                          <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: color }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 36, textAlign: 'right' }}>
                          {pct} %
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Non démarré</span>
                    )}
                  </td>

                  {/* Rythme */}
                  <td style={{ padding: '14px' }}>
                    {rythme ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: rythme.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: rythme.color }}>{rythme.label}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>

                  {/* Séquence */}
                  <td style={{ padding: '14px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 180 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {seqEnCours ?? '—'}
                    </div>
                  </td>

                  {/* Action */}
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--violet)' }}>Ouvrir →</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '40vh', textAlign: 'center', padding: '40px 20px',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', background: 'rgba(108,92,231,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
        fontSize: 26, color: 'var(--violet)',
      }}>+</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
        Aucune classe disponible
      </h2>
      <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 380, lineHeight: 1.6, marginBottom: 20 }}>
        Créez une classe pour accéder au cockpit pédagogique global.
      </p>
      <a href="/dashboard/classes" style={{
        padding: '10px 24px', borderRadius: 10, background: 'var(--violet)', color: '#fff',
        fontWeight: 600, fontSize: 13.5, textDecoration: 'none',
      }}>
        Créer une classe
      </a>
    </div>
  )
}

// ─── GlobalTeacherCockpit ─────────────────────────────────────────────────────

export default function GlobalTeacherCockpit({
  profil, classes, packs, programmes, eventCounts, eleves, supportPlans,
}: Props) {
  const [activeTab, setActiveTab] = useState<HubTab>('apercu')

  // ── Métriques globales ───────────────────────────────────────────────────
  const totalEleves = eleves.length > 0
    ? eleves.length
    : classes.reduce((s, c) => s + (c.nombre_eleves ?? 0), 0)

  const totalTaught = Object.values(eventCounts).reduce((s, n) => s + n, 0)
  const totalLecons = classes.reduce((s, cls) => s + lessonCountFromProgramme(programmes[cls.id]), 0)
  const curriculumPct = totalLecons > 0 ? Math.round((totalTaught / totalLecons) * 100) : null

  const activePlans  = supportPlans.filter(p => p.statut === 'actif').length
  const toReview     = supportPlans.filter(p =>
    p.date_revision && new Date(p.date_revision) < new Date(),
  ).length

  const annee = packs[Object.keys(packs)[0] ?? '']?.annee_scolaire
    ?? classes[0]?.annee_scolaire ?? '2026-2027'

  // ── Attention items ──────────────────────────────────────────────────────
  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = []
    const yearElapsed = computeYearElapsed(annee)

    // Plans à réviser
    if (toReview > 0) {
      items.push({
        id: 'plans-review',
        label: `${toReview} plan${toReview > 1 ? 's' : ''} de soutien à réviser`,
        detail: `La date de révision est dépassée — une mise à jour est recommandée.`,
        priority: 'haute',
        cta: 'Voir',
        href: '/dashboard/mon-annee?tab=eleves_soutien',
      })
    }

    // Classes sans pack
    const sanspack = classes.filter(c => !packs[c.id])
    if (sanspack.length > 0) {
      for (const cls of sanspack.slice(0, 3)) {
        items.push({
          id: `nopack-${cls.id}`,
          label: `Année scolaire non construite`,
          detail: `Cette classe n'a pas encore de Teaching Pack.`,
          classe: `${cls.matiere} — ${cls.nom}`,
          priority: 'moderee',
          cta: 'Construire',
          href: `/dashboard/classes/${cls.id}/programme`,
        })
      }
    }

    // Classes en retard (seulement après le premier mois)
    if (yearElapsed > 0.1) {
      for (const cls of classes) {
        const pack  = packs[cls.id]
        const prog  = programmes[cls.id]
        const count = pack ? (eventCounts[pack.id] ?? 0) : 0
        const total = lessonCountFromProgramme(prog)
        if (!pack || total === 0) continue
        const pct = (count / total) * 100
        if (pct < yearElapsed * 100 - 30) {
          items.push({
            id: `retard-${cls.id}`,
            label: `Progression à surveiller`,
            detail: `${Math.round(pct)} % enseigné · ${Math.round(yearElapsed * 100)} % de l'année écoulé.`,
            classe: `${cls.matiere} — ${cls.nom}`,
            priority: 'moderee',
            cta: 'Voir',
            href: `/dashboard/mon-annee/${cls.id}`,
          })
        }
      }
    }

    return items.slice(0, 6)
  }, [classes, packs, programmes, eventCounts, annee, toReview])

  const TABS: { id: HubTab; label: string }[] = [
    { id: 'apercu',         label: 'Aperçu global' },
    { id: 'eleves_soutien', label: 'Élèves & Soutien' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary, #0F1B2D)' }}>

      {/* ── Header sticky ────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'var(--card-bg)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--card-border)',
      }}>
        <div style={{
          padding: '14px 32px',
          display: 'flex', alignItems: 'center', gap: 16,
          maxWidth: 1400, margin: '0 auto',
        }}>
          <a href="/dashboard"
             style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none', flexShrink: 0 }}>
            ← ScorgIA
          </a>
          <div style={{ width: 1, height: 18, background: 'rgba(139,151,172,0.3)', flexShrink: 0 }} />
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.6px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              MON ANNÉE {annee}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {profil ? `${profil.prenom} ${profil.nom}` : 'Cockpit enseignant'}
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <ClassSelectorGlobal classes={classes} />
          </div>
        </div>

        {/* ── Mini-nav ─────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', padding: '0 32px', maxWidth: 1400, margin: '0 auto',
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
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Contenu ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '28px 32px 56px', maxWidth: 1400, margin: '0 auto' }}>
        {classes.length === 0 ? <EmptyState /> : (
          <>
            {/* ── APERÇU GLOBAL ──────────────────────────────────────── */}
            {activeTab === 'apercu' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Métriques */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <MetricCard label="Classes"           value={classes.length} />
                  <MetricCard label="Élèves"            value={totalEleves} />
                  <MetricCard
                    label="Leçons enseignées"
                    value={`${totalTaught} / ${totalLecons}`}
                    sub={totalLecons > 0 ? `${Math.round((totalTaught / totalLecons) * 100)} % du total` : undefined}
                    accent="#22C55E"
                  />
                  <MetricCard
                    label="Couverture curriculum"
                    value={curriculumPct !== null ? `${curriculumPct} %` : '—'}
                    accent={curriculumPct !== null ? '#6C5CE7' : undefined}
                  />
                  <MetricCard
                    label="Plans de soutien"
                    value={activePlans > 0 ? activePlans : '—'}
                    sub={activePlans > 0 ? 'actifs' : 'Aucun plan actif'}
                  />
                  <MetricCard
                    label="À réviser"
                    value={toReview > 0 ? toReview : '—'}
                    accent={toReview > 0 ? '#F59E0B' : undefined}
                    sub={toReview > 0 ? 'révision dépassée' : 'Aucun en retard'}
                  />
                </div>

                {/* Attention */}
                <AttentionPanel items={attentionItems} />

                {/* Table des classes */}
                <ClassTable
                  classes={classes}
                  packs={packs}
                  programmes={programmes}
                  eventCounts={eventCounts}
                  eleves={eleves}
                />
              </div>
            )}

            {/* ── ÉLÈVES & SOUTIEN ──────────────────────────────────── */}
            {activeTab === 'eleves_soutien' && (
              <StudentSupportList
                eleves={eleves}
                supportPlans={supportPlans}
                classes={classes}
                showClasseColumn
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
