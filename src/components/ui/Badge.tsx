'use client'

// DS 2.0 — Unified Badge component
// Usage: <Badge variant="ready" /> or <Badge variant="pret" dot />

export type BadgeVariant =
  | 'ready' | 'building' | 'partial' | 'error' | 'draft' | 'archived'
  | 'pro' | 'pro_plus' | 'free' | 'curriculum' | 'alberta'
  // DB statut aliases
  | 'pret' | 'generation_en_cours' | 'partiellement_genere' | 'erreur'
  | 'brouillon' | 'valide' | 'enseigne' | 'archive' | 'en_cours'
  | 'configuration' | 'pret_a_planifier' | 'curriculum_en_analyse'

interface BadgeProps {
  variant:   BadgeVariant
  label?:    string
  dot?:      boolean
  size?:     'sm' | 'md'
  className?: string
  style?:    React.CSSProperties
}

const VARIANT_META: Record<string, { label: string; variant: string; dot?: boolean }> = {
  ready:                    { label: 'Prêt',               variant: 'ready'    },
  pret:                     { label: 'Prêt',               variant: 'ready'    },
  building:                 { label: 'En génération',       variant: 'building' },
  generation_en_cours:      { label: 'En génération',       variant: 'building' },
  curriculum_en_analyse:    { label: 'Analyse curriculum',  variant: 'building' },
  partial:                  { label: 'Partiel',             variant: 'partial'  },
  partiellement_genere:     { label: 'Partiel',             variant: 'partial'  },
  error:                    { label: 'Erreur',              variant: 'error'    },
  erreur:                   { label: 'Erreur',              variant: 'error'    },
  draft:                    { label: 'Brouillon',           variant: 'draft'    },
  brouillon:                { label: 'Brouillon',           variant: 'draft'    },
  configuration:            { label: 'Configuration',       variant: 'draft'    },
  pret_a_planifier:         { label: 'Prêt à planifier',   variant: 'draft'    },
  archived:                 { label: 'Archivé',             variant: 'archived' },
  archive:                  { label: 'Archivé',             variant: 'archived' },
  valide:                   { label: 'Validé',              variant: 'ready'    },
  enseigne:                 { label: 'Enseigné',            variant: 'building' },
  en_cours:                 { label: 'En cours',            variant: 'building' },
  pro:                      { label: 'Pro',                 variant: 'pro'      },
  pro_plus:                 { label: 'Pro+',                variant: 'pro'      },
  free:                     { label: 'Gratuit',             variant: 'free'     },
  curriculum:               { label: 'Curriculum',          variant: 'curriculum'},
  alberta:                  { label: 'Alberta',             variant: 'curriculum'},
}

export default function Badge({ variant, label, dot, size = 'md', className, style }: BadgeProps) {
  const meta    = VARIANT_META[variant] ?? { label: variant, variant: 'draft' }
  const display = label ?? meta.label
  const cssVar  = meta.variant

  return (
    <span
      className={`ds-badge${size === 'sm' ? ' ds-badge-sm' : ''}${className ? ` ${className}` : ''}`}
      data-variant={cssVar}
      style={{
        ...(size === 'sm' ? { fontSize: 10, padding: '2px 7px' } : {}),
        ...style,
      }}
    >
      {dot && <span className="ds-badge-dot" aria-hidden />}
      {display}
    </span>
  )
}
