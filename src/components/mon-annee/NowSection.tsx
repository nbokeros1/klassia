'use client'

import type { SequenceProgress, LessonTeachingState } from '@/lib/types/school-year-dashboard'
import type { LeconProgramme } from '@/lib/types/database'
import { makeLessonKey } from '@/lib/spie/teaching-events'

interface Props {
  currentSequence:   SequenceProgress | null
  sequences:         SequenceProgress[]
  classeId:          string
  programmeAnnuelId: string | null
  teachingPackId:    string | null
  lessonStateMap?:   Record<string, LessonTeachingState>
  onMarkTaught?:     (lecon: LeconProgramme, seqIdx: number, leconIdx: number) => void
}

// ─── Carte séquence en cours ──────────────────────────────────────────────────

function CurrentSequenceCard({ seq, classeId }: { seq: SequenceProgress; classeId: string }) {
  const { progressPct, taughtLecons, totalLecons } = seq
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 'var(--radius-lg)', padding: '22px 26px',
      flex: '1 1 280px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: '#6C5CE7', textTransform: 'uppercase', marginBottom: 6 }}>
        Séquence en cours
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 }}>
        {seq.titre}
      </div>
      {seq.objectif && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: 14 }}>
          {seq.objectif.length > 100 ? seq.objectif.slice(0, 100) + '…' : seq.objectif}
        </div>
      )}

      {/* Progress */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{taughtLecons}/{totalLecons} leçons enseignées</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6C5CE7' }}>{progressPct} %</span>
        </div>
        <div style={{ height: 5, background: 'rgba(139,151,172,0.12)', borderRadius: 99 }}>
          <div style={{ height: '100%', borderRadius: 99, background: '#6C5CE7', width: `${progressPct}%`, transition: 'width 0.5s' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sem. {seq.semaineDebut}–{seq.semaineFin}</span>
        <a href={`/dashboard/classes/${classeId}/programme?tab=sequences`}
           style={{ fontSize: 12, fontWeight: 600, color: '#6C5CE7', textDecoration: 'none', marginLeft: 'auto' }}>
          Ouvrir la séquence →
        </a>
      </div>
    </div>
  )
}

// ─── Carte prochaine leçon ────────────────────────────────────────────────────

function NextLessonCard({
  sequences, classeId, programmeAnnuelId, teachingPackId, lessonStateMap, onMarkTaught
}: {
  sequences:         SequenceProgress[]
  classeId:          string
  programmeAnnuelId: string | null
  teachingPackId:    string | null
  lessonStateMap?:   Record<string, LessonTeachingState>
  onMarkTaught?:     (lecon: LeconProgramme, seqIdx: number, leconIdx: number) => void
}) {
  // Find next untaught lesson across all sequences
  let nextLecon: LeconProgramme | null = null
  let nextSeq: SequenceProgress | null = null
  let nextLeconIdx = 0

  outer: for (const seq of sequences) {
    if (seq.statut === 'terminee') continue
    for (let li = 0; li < seq.uniteData.lecons.length; li++) {
      const l = seq.uniteData.lecons[li]
      const key = makeLessonKey(seq.seqIdx, li)
      const isTaught = lessonStateMap
        ? (lessonStateMap[key]?.isTaught ?? l.statut === 'enseignee')
        : l.statut === 'enseignee'
      if (!isTaught) {
        nextLecon    = l
        nextSeq      = seq
        nextLeconIdx = li
        break outer
      }
    }
  }

  if (!nextLecon || !nextSeq) {
    return (
      <div style={{
        background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)',
        borderRadius: 'var(--radius-lg)', padding: '22px 26px',
        flex: '1 1 240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', gap: 8,
      }}>
        <div style={{ fontSize: 24, color: '#22C55E' }}>✓</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#22C55E' }}>Programme complété</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Toutes les leçons ont été enseignées.</div>
      </div>
    )
  }

  const isPrepared = !!nextLecon.lecon_id
  const canMark    = !!programmeAnnuelId && !!teachingPackId

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      borderRadius: 'var(--radius-lg)', padding: '22px 26px',
      flex: '1 1 240px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: '#3B82F6', textTransform: 'uppercase', marginBottom: 6 }}>
        Prochaine leçon
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 }}>
        {nextLecon.titre}
      </div>
      {nextLecon.objectif_apprentissage && (
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 10 }}>
          {nextLecon.objectif_apprentissage.length > 80
            ? nextLecon.objectif_apprentissage.slice(0, 80) + '…'
            : nextLecon.objectif_apprentissage}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
          Séq. {nextSeq.numero} · {nextLecon.duree_minutes} min
        </span>
        {isPrepared && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>
            Préparée
          </span>
        )}
        {!isPrepared && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: 'rgba(139,151,172,0.1)', color: 'var(--text-muted)' }}>
            À préparer
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {isPrepared && nextLecon.lecon_id && (
          <a href={`/dashboard/classes/${classeId}/lecon/${nextLecon.lecon_id}`}
             style={{
               fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8,
               background: '#6C5CE7', color: '#fff', textDecoration: 'none',
             }}>
            Ouvrir le plan
          </a>
        )}
        {!isPrepared && (
          <a href={`/dashboard/classes/${classeId}/programme?tab=sequences`}
             style={{
               fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8,
               background: 'rgba(108,92,231,0.1)', color: '#6C5CE7', textDecoration: 'none',
               border: '1px solid rgba(108,92,231,0.2)',
             }}>
            Préparer →
          </a>
        )}
        {canMark && onMarkTaught && (
          <button
            onClick={() => onMarkTaught(nextLecon!, nextSeq!.seqIdx, nextLeconIdx)}
            style={{
              fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8,
              background: 'rgba(34,197,94,0.1)', color: '#22C55E',
              border: '1px solid rgba(34,197,94,0.2)', cursor: 'pointer',
            }}
          >
            Marquer enseignée
          </button>
        )}
      </div>
    </div>
  )
}

// ─── NowSection ───────────────────────────────────────────────────────────────

export default function NowSection({
  currentSequence, sequences, classeId,
  programmeAnnuelId, teachingPackId, lessonStateMap, onMarkTaught,
}: Props) {
  if (!currentSequence && sequences.length === 0) return null

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
        Maintenant
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'stretch' }}>
        {currentSequence && (
          <CurrentSequenceCard seq={currentSequence} classeId={classeId} />
        )}
        <NextLessonCard
          sequences={sequences}
          classeId={classeId}
          programmeAnnuelId={programmeAnnuelId}
          teachingPackId={teachingPackId}
          lessonStateMap={lessonStateMap}
          onMarkTaught={onMarkTaught}
        />
      </div>
    </div>
  )
}
