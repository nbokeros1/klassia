'use client'

import { useMemo } from 'react'
import SyllabusViewer from '@/components/build-year/SyllabusViewer'
import type { TeachingPack, PackSyllabus } from '@/lib/types/teaching-pack'
import type { ProgrammeAnnuel } from '@/lib/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  pack:      TeachingPack | null
  programme: ProgrammeAnnuel | null
  classeId:  string
}

// ─── SyllabusTab ──────────────────────────────────────────────────────────────

export default function SyllabusTab({ pack, programme, classeId }: Props) {
  const syllabus = useMemo<PackSyllabus | null>(() => {
    // 1. Depuis le pack (source canonique V3)
    const fromPack = pack?.contenu_json?.syllabus
    if (fromPack) return fromPack as PackSyllabus

    // 2. Fallback : depuis programme_annuel.syllabus_json
    const fromProg = programme?.syllabus_json
    if (fromProg && typeof fromProg === 'object' && 'titre_cours' in fromProg) {
      return fromProg as PackSyllabus
    }

    return null
  }, [pack, programme])

  const teachingPackId    = pack?.id ?? null
  const programmeAnnuelId = pack?.programme_annuel_id ?? programme?.id ?? null

  if (!syllabus || !teachingPackId || !programmeAnnuelId) {
    return (
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 12, padding: '40px 32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Syllabus non disponible
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 400, margin: '0 auto 20px' }}>
          Le syllabus est généré lors de la construction de l&apos;année scolaire.
        </div>
        <a
          href={`/dashboard/classes/${classeId}/programme?tab=syllabus`}
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Notice + lien édition */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: 10,
        background: 'rgba(108,92,231,0.04)', border: '1px solid rgba(108,92,231,0.12)',
        flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
          Syllabus de cours — lecture seule dans ce contexte.
        </div>
        <a
          href={`/dashboard/classes/${classeId}/programme?tab=syllabus`}
          style={{ fontSize: 12, fontWeight: 600, color: '#6C5CE7', textDecoration: 'none', flexShrink: 0 }}
        >
          Modifier le syllabus →
        </a>
      </div>

      {/* Syllabus viewer complet */}
      <SyllabusViewer
        syllabus={syllabus}
        teachingPackId={teachingPackId}
        programmeAnnuelId={programmeAnnuelId}
      />
    </div>
  )
}
