import type { CurriculumCoverageData } from '@/lib/spie/curriculum-coverage'

interface Props {
  raList:            string[]
  classeId:          string | null
  curriculumCoverage?: CurriculumCoverageData  // V2 : programme avec curriculum_outcomes
}

type RACellStatut = 'oui' | 'non' | 'nd'

function RACell({ statut }: { statut: RACellStatut }) {
  if (statut === 'oui') return <span style={{ color: '#22C55E', fontWeight: 700 }}>✓</span>
  if (statut === 'non') return <span style={{ color: '#EF4444', fontWeight: 700 }}>✗</span>
  return <span style={{ color: '#8B97AC' }}>—</span>
}

const TH_STYLE: React.CSSProperties = {
  padding: '8px 12px', fontSize: 10.5, fontWeight: 700,
  letterSpacing: '0.4px', color: 'var(--text-muted)',
  textTransform: 'uppercase', borderBottom: '1px solid rgba(139,151,172,0.15)',
  whiteSpace: 'nowrap',
}

export default function CurriculumCoverage({ raList, classeId, curriculumCoverage }: Props) {
  const sectionStyle: React.CSSProperties = {
    background: 'var(--card-bg)', backdropFilter: 'blur(var(--card-blur))',
    border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)',
    padding: '24px 28px',
  }

  const isV2 = !!(curriculumCoverage?.hasV2Data && curriculumCoverage.items.length > 0)

  return (
    <div style={sectionStyle}>

      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
            Curriculum
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
            {isV2 ? 'Curriculum analysé' : 'Couverture du curriculum'}
          </h2>
        </div>
        {classeId && (
          <a href={`/dashboard/classes/${classeId}/programme?tab=curriculum`}
             style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--violet)', textDecoration: 'none' }}>
            Voir le curriculum →
          </a>
        )}
      </div>

      {isV2 ? (
        /* ── Vue V2 : curriculum analysé (bi-directionnel) ─────────────────── */
        <>
          <div style={{
            padding: '10px 14px', background: 'rgba(108,92,231,0.06)',
            border: '1px solid rgba(108,92,231,0.15)', borderRadius: 8,
            fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5,
          }}>
            Résultats d&apos;apprentissage extraits du curriculum et reliés aux séquences et leçons.
            Le suivi <em>Évalué</em> sera disponible dans une prochaine version.
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th style={{ ...TH_STYLE, textAlign: 'left' }}>Résultat d&apos;apprentissage</th>
                  <th style={{ ...TH_STYLE, textAlign: 'center' }}>Planifié</th>
                  <th style={{ ...TH_STYLE, textAlign: 'center' }}>Préparé</th>
                  <th style={{ ...TH_STYLE, textAlign: 'center' }}>Enseigné</th>
                  <th style={{ ...TH_STYLE, textAlign: 'center' }}>Évalué</th>
                  <th style={{ ...TH_STYLE, textAlign: 'left' }}>Planifié dans</th>
                </tr>
              </thead>
              <tbody>
                {curriculumCoverage!.items.map((item, idx) => (
                  <tr
                    key={item.outcome.id}
                    style={{ borderBottom: idx < curriculumCoverage!.items.length - 1 ? '1px solid rgba(139,151,172,0.08)' : 'none' }}
                  >
                    {/* RA titre + code */}
                    <td style={{ padding: '12px 12px', maxWidth: 300, lineHeight: 1.45 }}>
                      <div>
                        {item.outcome.code && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.3px',
                            color: 'var(--violet)', background: 'rgba(108,92,231,0.08)',
                            padding: '1px 7px', borderRadius: 99, marginRight: 6,
                          }}>
                            {item.outcome.code}
                          </span>
                        )}
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12.5 }}>
                          {item.outcome.titre}
                        </span>
                      </div>
                      {item.outcome.description && item.outcome.description !== item.outcome.titre && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                          {item.outcome.description.length > 100
                            ? item.outcome.description.slice(0, 100) + '…'
                            : item.outcome.description}
                        </div>
                      )}
                    </td>

                    {/* Planifié */}
                    <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                      <RACell statut={item.isPlanified ? 'oui' : 'non'} />
                    </td>

                    {/* Préparé */}
                    <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                      <RACell statut={item.isPrepared ? 'oui' : item.isPlanified ? 'non' : 'nd'} />
                    </td>

                    {/* Enseigné — V4 : données réelles */}
                    <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                      <RACell statut={item.isTaught ? 'oui' : item.isPlanified ? 'non' : 'nd'} />
                    </td>

                    {/* Évalué — non disponible */}
                    <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                      <RACell statut="nd" />
                    </td>

                    {/* Planifié dans */}
                    <td style={{ padding: '12px 12px', lineHeight: 1.6 }}>
                      {item.sequences.length === 0 ? (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 11.5 }}>Non planifié</span>
                      ) : (
                        item.sequences.map((s, si) => (
                          <div key={si} style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Séq. {s.sequenceNumero}</span>
                            {s.leconNumeros.length > 0 && (
                              <span style={{ color: 'var(--text-muted)' }}>
                                {' '}(L{s.leconNumeros.join(', ')})
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* ── Vue V1 : raList simple (backward compat) ────────────────────── */
        <>
          <div style={{
            padding: '10px 14px', background: 'rgba(59,130,246,0.07)',
            border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8,
            fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5,
          }}>
            La vue <em>Curriculum analysé</em> (avec séquences et leçons associées) est disponible
            pour les programmes V2. Le suivi par résultat d&apos;apprentissage sera disponible dans une prochaine version.
          </div>

          {raList.length === 0 ? (
            <div style={{
              padding: '40px 20px', textAlign: 'center',
              color: 'var(--text-muted)', fontSize: 14,
              background: 'rgba(139,151,172,0.04)', borderRadius: 10,
              border: '1px dashed rgba(139,151,172,0.25)',
            }}>
              Aucun résultat d&apos;apprentissage disponible — le syllabus doit d&apos;abord être généré.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th style={{ ...TH_STYLE, textAlign: 'left' }}>Résultat d&apos;apprentissage</th>
                    <th style={{ ...TH_STYLE, textAlign: 'center' }}>Planifié</th>
                    <th style={{ ...TH_STYLE, textAlign: 'center' }}>Préparé</th>
                    <th style={{ ...TH_STYLE, textAlign: 'center' }}>Enseigné</th>
                    <th style={{ ...TH_STYLE, textAlign: 'center' }}>Évalué</th>
                  </tr>
                </thead>
                <tbody>
                  {raList.map((ra, idx) => (
                    <tr key={idx} style={{ borderBottom: idx < raList.length - 1 ? '1px solid rgba(139,151,172,0.08)' : 'none' }}>
                      <td style={{ padding: '12px 12px', color: 'var(--text-primary)', lineHeight: 1.45, maxWidth: 380 }}>
                        {ra}
                      </td>
                      <td style={{ padding: '12px 12px', textAlign: 'center' }}><RACell statut="nd" /></td>
                      <td style={{ padding: '12px 12px', textAlign: 'center' }}><RACell statut="nd" /></td>
                      <td style={{ padding: '12px 12px', textAlign: 'center' }}><RACell statut="nd" /></td>
                      <td style={{ padding: '12px 12px', textAlign: 'center' }}><RACell statut="nd" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
