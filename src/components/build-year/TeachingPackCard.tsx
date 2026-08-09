'use client'

import type { TeachingPack, TeachingPackStatut, TeachingPackContenu } from '@/lib/types/teaching-pack'

interface Props {
  pack: TeachingPack
  onRestart?: () => void
  onViewPlan?: (progId: string) => void
}

const STATUT_CONFIG: Record<TeachingPackStatut, { label: string; icon: string; bg: string; color: string }> = {
  configuration:         { label: 'Configuration',          icon: '⚙️', bg: 'rgba(148,163,184,.12)', color: '#94A3B8' },
  curriculum_en_analyse: { label: 'Analyse du curriculum',  icon: '🔍', bg: 'rgba(251,195,74,.12)',   color: '#FBC34A' },
  pret_a_planifier:      { label: 'Prêt à planifier',       icon: '✅', bg: 'rgba(52,211,153,.12)',   color: '#34D399' },
  generation_en_cours:   { label: 'Génération en cours',    icon: '⚙️', bg: 'rgba(127,119,221,.12)',  color: '#7F77DD' },
  partiellement_genere:  { label: 'Partiellement généré',   icon: '🔶', bg: 'rgba(251,195,74,.12)',   color: '#FBC34A' },
  pret:                  { label: 'Prêt',                   icon: '🎉', bg: 'rgba(52,211,153,.12)',   color: '#34D399' },
  erreur:                { label: 'Erreur',                 icon: '❌', bg: 'rgba(248,113,113,.12)',  color: '#F87171' },
  archive:               { label: 'Archivé',                icon: '📦', bg: 'rgba(71,85,105,.12)',    color: '#475569' },
}

export default function TeachingPackCard({ pack, onRestart, onViewPlan }: Props) {
  const cfg   = STATUT_CONFIG[pack.statut] ?? STATUT_CONFIG.configuration
  const contenu: TeachingPackContenu = (pack.contenu_json as TeachingPackContenu) ?? {}
  const isReady = pack.statut === 'pret' || pack.statut === 'partiellement_genere'

  return (
    <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>📦</span>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Teaching Pack
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {pack.province && <Chip>{pack.province.charAt(0).toUpperCase() + pack.province.slice(1)}</Chip>}
            {pack.annee_scolaire && <Chip>{pack.annee_scolaire}</Chip>}
            {pack.langue && <Chip>{pack.langue === 'fr' ? 'Français' : 'English'}</Chip>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99, background: cfg.bg, flexShrink: 0 }}>
          <span style={{ fontSize: 14 }}>{cfg.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
        </div>
      </div>

      {/* Métriques */}
      {isReady && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <MetricBox label="Unités" value={contenu.nb_unites ?? '—'} icon="📚" />
          <MetricBox label="Leçons planifiées" value={contenu.nb_lecons_planifiees ?? '—'} icon="📝" />
          <MetricBox label="Leçons développées" value={contenu.nb_lecons_generees ?? '—'} icon="✨" />
        </div>
      )}

      {/* Ce que contient le pack */}
      {isReady && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Contenu inclus</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ContentRow label="Syllabus" done={!!contenu.syllabus} />
            <ContentRow label="Plan annuel complet" done={!!pack.programme_annuel_id} />
            <ContentRow label="Toutes les séquences structurées" done={!!contenu.nb_unites} />
            <ContentRow label="Plans de leçon (1re séquence)" done={(contenu.nb_lecons_planifiees ?? 0) > 0} />
            <ContentRow label="1re leçon entièrement développée" done={!!contenu.premiere_lecon_complete} />
            <ContentRow label={contenu.premier_quiz_id ? "Quiz de la 1re leçon" : "Quiz de la 1re leçon"} done={!!contenu.premier_quiz_id} />
          </div>
        </div>
      )}

      {/* Erreur */}
      {pack.statut === 'erreur' && pack.error_message && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.25)', fontSize: 13, color: '#F87171' }}>
          {pack.error_message}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {pack.programme_annuel_id && (
          <button
            onClick={() => onViewPlan?.(pack.programme_annuel_id!)}
            style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #7F77DD, #4F46E5)', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            🗓️ Voir mon plan annuel
          </button>
        )}
        {(pack.statut === 'erreur' || pack.statut === 'partiellement_genere') && onRestart && (
          <button
            onClick={onRestart}
            style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            🔄 Relancer la génération
          </button>
        )}
      </div>
    </div>
  )
}

function MetricBox({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function ContentRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{done ? '✅' : '⬜'}</span>
      <span style={{ fontSize: 13, color: done ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', fontSize: 11, color: 'var(--text-muted)' }}>
      {children}
    </span>
  )
}
