// ─── KlassIA+ — Catégories de schémas SVG scientifiques ───────────────────────

export const CATEGORIES_SCHEMAS = [
  { id: 'biologie',   label: 'Biologie',   icon: '🔬', description: 'Cellule, ADN, mitose' },
  { id: 'physique',   label: 'Physique',   icon: '⚡',  description: 'Circuit, forces, optique' },
  { id: 'chimie',     label: 'Chimie',     icon: '⚗️',  description: 'Atome de Bohr, liaisons' },
  { id: 'maths',      label: 'Maths',      icon: '📐',  description: 'Plan cartésien, figures' },
  { id: 'geographie', label: 'Géographie', icon: '🌍',  description: 'Rose des vents, cycle eau' },
  { id: 'diagrammes', label: 'Diagrammes', icon: '📊',  description: 'Venn, frise, Ishikawa' },
] as const

export type CategorieSchema = (typeof CATEGORIES_SCHEMAS)[number]['id']
