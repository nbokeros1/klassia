import type { SequenceProgress, LessonTeachingState } from '@/lib/types/school-year-dashboard'
import { makeLessonKey } from '@/lib/spie/teaching-events'

interface Props {
  sequence:       SequenceProgress | null
  classeId:       string | null
  lessonStateMap?: Record<string, LessonTeachingState>
}

// Libellés de statut pour les leçons individuelles
function leconStatutBadge(isPrepared: boolean, isTaught: boolean) {
  if (isTaught)   return { label: 'Enseignée', color: '#16A34A', bg: 'rgba(34,197,94,0.15)' }
  if (isPrepared) return { label: 'Prête',     color: '#22C55E', bg: 'rgba(34,197,94,0.1)'  }
  return           { label: 'À préparer',      color: '#8B97AC', bg: 'rgba(139,151,172,0.1)' }
}

export default function CurrentSequenceCard({ sequence, classeId, lessonStateMap }: Props) {
  const cardStyle: React.CSSProperties = {
    background: 'var(--card-bg)', backdropFilter: 'blur(var(--card-blur))',
    border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)',
    padding: '24px 28px',
  }

  if (!sequence) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>
          Séquence en cours
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          Toutes les séquences sont terminées ou aucune n&apos;a encore débuté.
        </p>
      </div>
    )
  }

  const progressColor = sequence.progressPct === 100 ? '#22C55E' : '#6C5CE7'
  const lecons = sequence.uniteData.lecons

  return (
    <div style={cardStyle}>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Séquence en cours
          </div>
          <div style={{ fontSize: 11, color: 'var(--violet)', fontWeight: 600 }}>
            Séquence {sequence.numero}
          </div>
        </div>
        <span style={{
          fontSize: 10.5, fontWeight: 700, padding: '4px 12px',
          borderRadius: 99, background: 'rgba(108,92,231,0.1)',
          color: '#6C5CE7', letterSpacing: '0.3px',
        }}>
          En cours
        </span>
      </div>

      {/* Titre */}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.35 }}>
        {sequence.titre}
      </h3>

      {/* Période */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
        Semaines {sequence.semaineDebut} à {sequence.semaineFin}
      </div>

      {/* Objectif */}
      {sequence.objectif && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
          {sequence.objectif.length > 160 ? sequence.objectif.slice(0, 160) + '…' : sequence.objectif}
        </p>
      )}

      {/* Métriques */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{sequence.totalLecons}</strong> leçons
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
          <strong style={{ color: '#22C55E' }}>{sequence.taughtLecons}</strong> enseignées
        </div>
      </div>

      {/* Barre de progression */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Progression</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: progressColor }}>{sequence.progressPct} %</span>
        </div>
        <div style={{ height: 5, background: 'rgba(108,92,231,0.1)', borderRadius: 99 }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${sequence.progressPct}%`,
            background: progressColor,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Mini-liste des leçons (V4) */}
      {lecons.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.4px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
            Leçons
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {lecons.slice(0, 6).map((l, li) => {
              const isTaught = sequence
                ? (lessonStateMap?.[makeLessonKey(sequence.seqIdx, li)]?.isTaught ?? l.statut === 'enseignee')
                : l.statut === 'enseignee'
              const isPrepared = !!l.lecon_id
              const badge      = leconStatutBadge(isPrepared, isTaught)
              return (
                <div key={l.numero} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 8px', borderRadius: 7,
                  background: isTaught ? 'rgba(34,197,94,0.04)' : 'rgba(139,151,172,0.04)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                      L{l.numero}
                    </span>
                    <span style={{
                      fontSize: 11.5, color: isTaught ? 'var(--text-secondary)' : 'var(--text-primary)',
                      fontWeight: isTaught ? 400 : 500,
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      textDecoration: isTaught ? 'line-through' : 'none',
                      opacity: isTaught ? 0.7 : 1,
                    }}>
                      {l.titre}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                    color: badge.color, background: badge.bg, flexShrink: 0, marginLeft: 8,
                  }}>
                    {badge.label}
                  </span>
                </div>
              )
            })}
            {lecons.length > 6 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 8 }}>
                +{lecons.length - 6} autres leçons
              </div>
            )}
          </div>
        </div>
      )}

      {/* CTA */}
      {classeId && (
        <a href={`/dashboard/classes/${classeId}/programme?tab=sequences`}
           style={{
             display: 'inline-block', marginTop: 4,
             fontSize: 12.5, fontWeight: 600, color: 'var(--violet)',
             padding: '8px 16px', background: 'rgba(108,92,231,0.08)',
             borderRadius: 8, border: '1px solid rgba(108,92,231,0.2)',
             textDecoration: 'none',
           }}>
          Voir la séquence →
        </a>
      )}
    </div>
  )
}
