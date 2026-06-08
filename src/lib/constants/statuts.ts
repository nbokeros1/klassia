import type { StatutLecon, TypeDocument } from '@/lib/types/database'

// ─── 7 statuts de leçon ───────────────────────────────────────────────────────

export const STATUT_LECON: Record<StatutLecon, { label: string; color: string; bg: string }> = {
  brouillon:  { label: 'Brouillon',  color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  prete:      { label: 'Prête',      color: '#60A5FA', bg: 'rgba(96,165,250,0.12)'  },
  en_cours:   { label: 'En cours',   color: '#FBC34A', bg: 'rgba(251,195,74,0.12)'  },
  enseignee:  { label: 'Enseignée',  color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  complete:   { label: 'Terminée',   color: '#34D399', bg: 'rgba(52,211,153,0.12)'  },
  a_revoir:   { label: 'À revoir',   color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  archivee:   { label: 'Archivée',   color: '#64748B', bg: 'rgba(100,116,139,0.12)' },
} as const

// Cycle de changement de statut (clic sur badge)
export const STATUT_CYCLE: Record<StatutLecon, StatutLecon> = {
  brouillon:  'prete',
  prete:      'en_cours',
  en_cours:   'enseignee',
  enseignee:  'complete',
  complete:   'a_revoir',
  a_revoir:   'brouillon',
  archivee:   'brouillon',
}

// ─── Types de documents ───────────────────────────────────────────────────────

export const TYPE_DOCUMENT: Record<TypeDocument, { label: string; icon: string; color: string; bg: string }> = {
  plan_sequence:  { label: 'Plan de séquence', icon: '📋', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  plan_lecon:     { label: 'Plan de leçon',    icon: '📝', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)'  },
  lecon_complete: { label: 'Leçon complète',   icon: '✨', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
} as const

// ─── Curricula officiels ──────────────────────────────────────────────────────

export const CURRICULA = [
  { id: 'alberta',          label: 'Alberta — Program of Studies',       flag: '🏔️', pays: 'canada' },
  { id: 'ontario',          label: 'Ontario — The Ontario Curriculum',    flag: '🍁', pays: 'canada' },
  { id: 'quebec',           label: 'Québec — PFEQ (MEES)',                flag: '⚜️', pays: 'canada' },
  { id: 'bc',               label: 'Colombie-Britannique',                flag: '🌊', pays: 'canada' },
  { id: 'saskatchewan',     label: 'Saskatchewan',                        flag: '🌾', pays: 'canada' },
  { id: 'manitoba',         label: 'Manitoba',                            flag: '🦬', pays: 'canada' },
  { id: 'nouveau_brunswick', label: 'Nouveau-Brunswick',                  flag: '🦞', pays: 'canada' },
  { id: 'common_core',      label: 'Common Core (USA)',                   flag: '🇺🇸', pays: 'usa'    },
  { id: 'ib',               label: 'Baccalauréat International (IB)',     flag: '🌍', pays: 'autre'  },
  { id: 'france',           label: 'Éducation nationale (France)',        flag: '🇫🇷', pays: 'autre'  },
] as const
