'use client'

import type { Classe, ProgrammeAnnuel } from '@/lib/types/database'
import type { TeachingPack } from '@/lib/types/teaching-pack'

interface Props {
  profil:      { prenom: string; nom: string } | null
  classes:     Classe[]
  packs:       Record<string, TeachingPack>      // classeId → pack
  programmes:  Record<string, ProgrammeAnnuel>   // classeId → programme
  eventCounts: Record<string, number>             // packId → nb leçons enseignées
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PACK_STATUT: Record<string, { label: string; dot: string }> = {
  pret:                { label: 'Prêt',          dot: '#22C55E' },
  partiellement_genere:{ label: 'En cours',      dot: '#6C5CE7' },
  generation_en_cours: { label: 'Génération…',   dot: '#3B82F6' },
  erreur:              { label: 'Erreur',         dot: '#EF4444' },
  configuration:       { label: 'Configuration', dot: '#8B97AC' },
}

function subjectInitial(matiere: string): string {
  const m = matiere.toLowerCase()
  if (m.includes('math'))  return '∑'
  if (m.includes('sci') || m.includes('bio') || m.includes('chim')) return 'Sc'
  if (m.includes('franç') || m.includes('franc') || m.includes('litt')) return 'Aa'
  if (m.includes('hist'))  return 'Hs'
  if (m.includes('géo') || m.includes('geo'))  return 'Ge'
  if (m.includes('musi'))  return '♩'
  if (m.includes('art'))   return '✦'
  if (m.includes('angl') || m.includes('engl')) return 'En'
  if (m.includes('sport') || m.includes('eps')) return 'Ep'
  return matiere.slice(0, 2).toUpperCase()
}

function subjectColor(matiere: string): string {
  const m = matiere.toLowerCase()
  if (m.includes('math'))  return '#7C3AED'
  if (m.includes('sci') || m.includes('bio')) return '#16A34A'
  if (m.includes('franç') || m.includes('franc')) return '#B45309'
  if (m.includes('hist'))  return '#92400E'
  if (m.includes('musi'))  return '#1D4ED8'
  if (m.includes('angl'))  return '#075985'
  return '#6C5CE7'
}

// ─── ClassCard ────────────────────────────────────────────────────────────────

function ClassCard({ classe, pack, programme, eventCount }: {
  classe:     Classe
  pack:       TeachingPack | null
  programme:  ProgrammeAnnuel | null
  eventCount: number
}) {
  const contenu      = programme?.contenu_json as { unites?: { lecons?: unknown[] }[] } | undefined
  const totalLecons  = contenu?.unites?.reduce((s, u) => s + (u.lecons?.length ?? 0), 0) ?? null
  const totalSeq     = contenu?.unites?.length ?? null
  const taughtLecons = pack ? eventCount : null
  const progressPct  = totalLecons && taughtLecons !== null && totalLecons > 0
    ? Math.round((taughtLecons / totalLecons) * 100)
    : null

  const packInfo = pack ? (PACK_STATUT[pack.statut] ?? { label: pack.statut, dot: '#8B97AC' }) : null
  const color    = subjectColor(classe.matiere)
  const initial  = subjectInitial(classe.matiere)
  const annee    = pack?.annee_scolaire ?? classe.annee_scolaire

  // Séquence en cours
  const currentSeqIdx = contenu?.unites?.findIndex((u, si) => {
    if (!u.lecons?.length) return false
    // Simplified: no teaching_events here — just check if partly taught via pack
    return true  // show first incomplete sequence indicator
  })
  const currentSeq = contenu?.unites?.[0]
  const currentSeqTitle = currentSeq
    ? (currentSeq as { titre?: string }).titre || `Séquence 1`
    : null

  // Next lesson title from first sequence first unfinished lesson
  const firstSeq = contenu?.unites?.[0] as { lecons?: { titre?: string; numero?: number }[] } | undefined
  const nextLecon = firstSeq?.lecons?.[taughtLecons ?? 0] as { titre?: string; numero?: number } | undefined
  const nextLeconTitle = nextLecon?.titre

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 'var(--radius-lg)', padding: '24px 26px',
      display: 'flex', flexDirection: 'column', gap: 16,
      transition: 'box-shadow 0.15s, transform 0.15s',
      cursor: 'pointer',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)'
      ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.boxShadow = ''
      ;(e.currentTarget as HTMLDivElement).style.transform = ''
    }}
    onClick={() => window.location.href = `/dashboard/mon-annee/${classe.id}`}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: `${color}18`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color,
        }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: 3 }}>
            {classe.matiere}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {classe.nom} · {classe.niveau}
            {classe.annee_scolaire && ` · ${annee}`}
          </div>
        </div>
        {packInfo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: packInfo.dot }} />
            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)' }}>{packInfo.label}</span>
          </div>
        )}
      </div>

      {/* Progression */}
      {pack ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Progression pédagogique
            </span>
            <span style={{ fontSize: 18, fontWeight: 800, color: progressPct !== null ? color : 'var(--text-muted)' }}>
              {progressPct !== null ? `${progressPct} %` : '—'}
            </span>
          </div>
          <div style={{ height: 5, background: 'rgba(139,151,172,0.12)', borderRadius: 99 }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: progressPct !== null ? `${progressPct}%` : '0%',
              background: color, transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Année scolaire non construite
        </div>
      )}

      {/* Métriques */}
      {pack && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {totalSeq !== null && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{totalSeq}</strong> séquences
            </div>
          )}
          {totalLecons !== null && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              <strong style={{ color: '#22C55E' }}>{taughtLecons ?? 0}</strong>
              <span style={{ color: 'var(--text-muted)' }}>/{totalLecons} leçons enseignées</span>
            </div>
          )}
        </div>
      )}

      {/* Prochaine leçon */}
      {nextLeconTitle && (
        <div style={{
          padding: '8px 12px', borderRadius: 8,
          background: 'rgba(108,92,231,0.05)', border: '1px solid rgba(108,92,231,0.1)',
          fontSize: 12, color: 'var(--text-secondary)',
        }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Prochaine : </span>
          {nextLeconTitle}
        </div>
      )}

      {/* CTA */}
      <div style={{ marginTop: 'auto', paddingTop: 4 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 600, color: color,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          Ouvrir mon année →
        </div>
      </div>
    </div>
  )
}

// ─── No-class empty state ─────────────────────────────────────────────────────

function EmptyHub() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', textAlign: 'center', padding: '40px 20px',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(108,92,231,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20, fontSize: 28,
      }}>
        📅
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
        Aucune classe disponible
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 380, lineHeight: 1.6 }}>
        Créez d&apos;abord une classe dans ScorgIA pour accéder à votre cockpit pédagogique.
      </p>
      <a href="/dashboard/classes"
         style={{
           marginTop: 20, display: 'inline-block', padding: '10px 24px',
           borderRadius: 10, background: 'var(--violet)', color: '#fff',
           fontWeight: 600, fontSize: 13.5, textDecoration: 'none',
         }}>
        Gérer mes classes
      </a>
    </div>
  )
}

// ─── SchoolYearHub ────────────────────────────────────────────────────────────

export default function SchoolYearHub({ profil, classes, packs, programmes, eventCounts }: Props) {
  const anneeCourante = Object.values(packs)?.[0]?.annee_scolaire
    ?? classes?.[0]?.annee_scolaire
    ?? null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-primary, #0F1B2D)',
    }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '20px 32px',
        borderBottom: '1px solid var(--card-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--card-bg)', backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/dashboard"
             style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            ← ScorgIA
          </a>
          <div style={{ width: 1, height: 18, background: 'rgba(139,151,172,0.3)' }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.6px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 1 }}>
              MON ANNÉE {anneeCourante ?? ''}
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {profil ? `Bonjour, ${profil.prenom}` : 'Mon Année'}
            </h1>
          </div>
        </div>
        <a href="/dashboard/classes"
           style={{ fontSize: 12, fontWeight: 600, color: 'var(--violet)', textDecoration: 'none' }}>
          Gérer les classes →
        </a>
      </div>

      {/* ── Contenu ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '32px 32px 48px', maxWidth: 1320, margin: '0 auto' }}>
        {classes.length === 0 ? <EmptyHub /> : (
          <>
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Pilotez vos classes et votre progression pédagogique.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 20,
            }}>
              {classes.map(cls => (
                <ClassCard
                  key={cls.id}
                  classe={cls}
                  pack={packs[cls.id] ?? null}
                  programme={programmes[cls.id] ?? null}
                  eventCount={packs[cls.id] ? (eventCounts[packs[cls.id].id] ?? 0) : 0}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
