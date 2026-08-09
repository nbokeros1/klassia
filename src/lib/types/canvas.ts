// ─── SC-02F — Types du Canvas pédagogique intelligent ────────────────────────
// Source de vérité pour les blocs du canvas. Ne pas dupliquer dans les composants.

// ─── Type de bloc ─────────────────────────────────────────────────────────────

export type BlockType =
  | 'texte'
  | 'liste'
  | 'tableau'
  | 'chronologie'
  | 'objectif'
  | 'competence'
  | 'activite'
  | 'question'
  | 'evaluation'
  | 'ressource'

// ─── Statut de bloc ───────────────────────────────────────────────────────────

export type BlockStatut = 'normal' | 'verrouille' | 'a_revoir' | 'commente'

// ─── Bloc pédagogique du canvas ───────────────────────────────────────────────

export interface CanvasBlock {
  id:          string
  titre:       string
  type:        BlockType
  contenu:     string
  ordre:       number
  statut:      BlockStatut
  genereParIA: boolean
  modifie:     boolean
  version:     number
  commentaire?: string
  collapsed?:  boolean
}

// ─── Métadonnées du canvas ────────────────────────────────────────────────────

export interface CanvasMeta {
  titre:       string
  typeContenu: string
  totalBlocs:  number
  blocsVides:  number
  genereA:     string | null
}

// ─── Couleurs par type de bloc ────────────────────────────────────────────────

export const BLOCK_TYPE_COLORS: Record<BlockType, string> = {
  objectif:    '#6C5CE7',
  competence:  '#4F46E5',
  activite:    '#22C55E',
  evaluation:  '#F59E0B',
  ressource:   '#F97316',
  question:    '#EC4899',
  tableau:     '#14B8A6',
  liste:       '#3B82F6',
  chronologie: '#8B5CF6',
  texte:       '#64748B',
}

// ─── Labels par type de bloc (fr/en) ─────────────────────────────────────────

export const BLOCK_TYPE_LABELS: Record<BlockType, { fr: string; en: string }> = {
  objectif:    { fr: 'Objectif',    en: 'Objective'   },
  competence:  { fr: 'Compétence',  en: 'Competency'  },
  activite:    { fr: 'Activité',    en: 'Activity'    },
  evaluation:  { fr: 'Évaluation',  en: 'Assessment'  },
  ressource:   { fr: 'Ressource',   en: 'Resource'    },
  question:    { fr: 'Question',    en: 'Question'    },
  tableau:     { fr: 'Tableau',     en: 'Table'       },
  liste:       { fr: 'Liste',       en: 'List'        },
  chronologie: { fr: 'Chronologie', en: 'Timeline'    },
  texte:       { fr: 'Texte',       en: 'Text'        },
}

// ─── Suggestions IA par type de bloc ─────────────────────────────────────────

export interface BlockSuggestion {
  id:      string
  emoji:   string
  labelFr: string
  labelEn: string
  promptFr: (titre: string, contenu: string) => string
  promptEn: (titre: string, contenu: string) => string
}

export const BASE_SUGGESTIONS: BlockSuggestion[] = [
  {
    id: 'reformuler', emoji: '✨',
    labelFr: 'Reformuler', labelEn: 'Rephrase',
    promptFr: (t, c) => `Reformule ce bloc "${t}" de façon plus claire et engageante pour les élèves :\n\n${c.slice(0, 400)}`,
    promptEn: (t, c) => `Rephrase this block "${t}" in a clearer and more engaging way for students:\n\n${c.slice(0, 400)}`,
  },
  {
    id: 'simplifier', emoji: '🔽',
    labelFr: 'Simplifier', labelEn: 'Simplify',
    promptFr: (t, c) => `Simplifie ce bloc "${t}" pour le rendre plus accessible :\n\n${c.slice(0, 400)}`,
    promptEn: (t, c) => `Simplify this block "${t}" to make it more accessible:\n\n${c.slice(0, 400)}`,
  },
  {
    id: 'developper', emoji: '📖',
    labelFr: 'Développer', labelEn: 'Expand',
    promptFr: (t, c) => `Développe et enrichis ce bloc "${t}" avec plus de détails :\n\n${c.slice(0, 400)}`,
    promptEn: (t, c) => `Develop and enrich this block "${t}" with more details:\n\n${c.slice(0, 400)}`,
  },
  {
    id: 'adapter', emoji: '🎯',
    labelFr: 'Adapter', labelEn: 'Adapt',
    promptFr: (t, c) => `Adapte ce bloc "${t}" à différents niveaux d'élèves :\n\n${c.slice(0, 400)}`,
    promptEn: (t, c) => `Adapt this block "${t}" for different student levels:\n\n${c.slice(0, 400)}`,
  },
]

export const TYPE_EXTRA_SUGGESTIONS: Partial<Record<BlockType, BlockSuggestion[]>> = {
  activite: [
    {
      id: 'variante', emoji: '🔄',
      labelFr: 'Variante', labelEn: 'Variant',
      promptFr: (t) => `Propose une variante pédagogique différente pour remplacer l'activité "${t}".`,
      promptEn: (t) => `Suggest a different pedagogical variant to replace the activity "${t}".`,
    },
  ],
  evaluation: [
    {
      id: 'rubrique', emoji: '📊',
      labelFr: 'Rubrique', labelEn: 'Rubric',
      promptFr: (t) => `Crée une grille d'évaluation détaillée pour "${t}".`,
      promptEn: (t) => `Create a detailed assessment rubric for "${t}".`,
    },
  ],
  objectif: [
    {
      id: 'aligner', emoji: '📘',
      labelFr: 'Aligner', labelEn: 'Align',
      promptFr: (t) => `Aligne cet objectif "${t}" sur les attentes du curriculum officiel.`,
      promptEn: (t) => `Align this objective "${t}" with the official curriculum expectations.`,
    },
  ],
  texte: [
    {
      id: 'activite', emoji: '🎮',
      labelFr: 'Générer activité', labelEn: 'Generate activity',
      promptFr: (t) => `Génère une activité pédagogique concrète basée sur ce contenu : "${t}".`,
      promptEn: (t) => `Generate a concrete learning activity based on this content: "${t}".`,
    },
  ],
}
