'use client'

import type { QualityGateResultat, QualiteItem, QualiteNiveau } from '@/lib/types/teaching-pack'

interface Props {
  resultat: QualityGateResultat
  onDismiss?: () => void
}

const NIVEAU_CONFIG: Record<QualiteNiveau, { icon: string; label: string; bg: string; color: string; border: string }> = {
  erreur_bloquante: { icon: '🔴', label: 'Erreur bloquante', bg: 'rgba(248,113,113,.08)', color: '#F87171', border: 'rgba(248,113,113,.3)' },
  avertissement:    { icon: '🟡', label: 'Avertissement',    bg: 'rgba(251,195,74,.08)',  color: '#FBC34A', border: 'rgba(251,195,74,.3)' },
  recommandation:   { icon: '🔵', label: 'Recommandation',   bg: 'rgba(96,165,250,.08)',  color: '#60A5FA', border: 'rgba(96,165,250,.3)' },
  valide:           { icon: '✅', label: 'Validé',           bg: 'rgba(52,211,153,.08)',  color: '#34D399', border: 'rgba(52,211,153,.3)' },
}

export default function QualityReport({ resultat, onDismiss }: Props) {
  const nonValides = resultat.items.filter(i => i.niveau !== 'valide')
  const valides    = resultat.items.filter(i => i.niveau === 'valide')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>{resultat.peut_marquer_pret ? '✅' : '⚠️'}</span>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
              Contrôle qualité pédagogique
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Basé sur des règles pédagogiques explicites — pas un score arbitraire.
          </p>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: 4 }}>×</button>
        )}
      </div>

      {/* Bilan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <StatBadge label="Erreurs" value={resultat.erreurs_bloquantes} color="#F87171" bg="rgba(248,113,113,.1)" />
        <StatBadge label="Avertissements" value={resultat.avertissements} color="#FBC34A" bg="rgba(251,195,74,.1)" />
        <StatBadge label="Recommandations" value={resultat.recommandations} color="#60A5FA" bg="rgba(96,165,250,.1)" />
        <StatBadge label="Validés" value={resultat.elements_valides} color="#34D399" bg="rgba(52,211,153,.1)" />
      </div>

      {/* Verdict */}
      <div style={{ padding: '12px 16px', borderRadius: 10, background: resultat.peut_marquer_pret ? 'rgba(52,211,153,.1)' : 'rgba(248,113,113,.08)', border: `1px solid ${resultat.peut_marquer_pret ? 'rgba(52,211,153,.3)' : 'rgba(248,113,113,.3)'}` }}>
        {resultat.peut_marquer_pret
          ? <span style={{ color: '#34D399', fontWeight: 700, fontSize: 14 }}>✅ Ce document peut être marqué "Prêt".</span>
          : <span style={{ color: '#F87171', fontWeight: 700, fontSize: 14 }}>🔴 Résolvez les erreurs bloquantes avant de marquer ce document comme prêt.</span>
        }
      </div>

      {/* Points non valides */}
      {nonValides.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(['erreur_bloquante', 'avertissement', 'recommandation'] as QualiteNiveau[]).map(niveau => {
            const items = nonValides.filter(i => i.niveau === niveau)
            if (!items.length) return null
            const cfg = NIVEAU_CONFIG[niveau]
            return (
              <div key={niveau}>
                <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  {cfg.icon} {cfg.label}s ({items.length})
                </div>
                {items.map((item, i) => (
                  <QualiteRow key={i} item={item} />
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Points validés — repliés */}
      {valides.length > 0 && (
        <details style={{ borderRadius: 9, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <summary style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: '#34D399', fontWeight: 700, listStyle: 'none' }}>
            ✅ {valides.length} éléments validés ▾
          </summary>
          <div style={{ padding: '8px 14px 14px', display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--color-bg-primary)' }}>
            {valides.map((item, i) => <QualiteRow key={i} item={item} />)}
          </div>
        </details>
      )}

      {/* Sources */}
      {resultat.sources_utilisees.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 4, borderTop: '1px solid var(--color-border)' }}>
          Sources utilisées pour ce contrôle : {resultat.sources_utilisees.join(', ')}
        </div>
      )}
    </div>
  )
}

function QualiteRow({ item }: { item: QualiteItem }) {
  const cfg = NIVEAU_CONFIG[item.niveau]
  return (
    <div style={{ display: 'flex', gap: 8, padding: '8px 10px', borderRadius: 8, background: cfg.bg, border: `1px solid ${cfg.border}`, marginBottom: 4 }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{cfg.icon}</span>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.message}</div>
        {item.detail && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.detail}</div>}
        {item.code && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'monospace' }}>{item.code}</div>}
      </div>
    </div>
  )
}

function StatBadge({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: bg, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}
