import type { ActivityType } from './index'

// ─── Pedagogical methods (Mission 2) ─────────────────────────────────────────

export type PedagogicalMethod =
  | 'magistral'
  | 'discussion'
  | 'individuel'
  | 'collaboratif'
  | 'atelier'
  | 'manipulation'
  | 'resolution'
  | 'lecture'
  | 'video'
  | 'quiz'
  | 'evaluation'
  | 'retour_collectif'
  | 'synthese'

export type EngagementMode = 'actif' | 'semi_actif' | 'passif'

export interface MethodProfile {
  label: string
  engagement: EngagementMode
  social: 'individuel' | 'collectif' | 'mixte'
  cognitiveLoad: 'bas' | 'moyen' | 'eleve'
  typicalDuration: number // minutes
}

export const METHOD_PROFILES: Record<PedagogicalMethod, MethodProfile> = {
  magistral:        { label: 'Présentation magistrale',  engagement: 'passif',     social: 'collectif',  cognitiveLoad: 'moyen', typicalDuration: 15 },
  discussion:       { label: 'Discussion',               engagement: 'actif',      social: 'collectif',  cognitiveLoad: 'moyen', typicalDuration: 10 },
  individuel:       { label: 'Travail individuel',       engagement: 'semi_actif', social: 'individuel', cognitiveLoad: 'eleve', typicalDuration: 12 },
  collaboratif:     { label: 'Travail collaboratif',     engagement: 'actif',      social: 'mixte',      cognitiveLoad: 'eleve', typicalDuration: 15 },
  atelier:          { label: 'Atelier',                  engagement: 'actif',      social: 'mixte',      cognitiveLoad: 'eleve', typicalDuration: 20 },
  manipulation:     { label: 'Manipulation',             engagement: 'actif',      social: 'individuel', cognitiveLoad: 'moyen', typicalDuration: 12 },
  resolution:       { label: 'Résolution de problèmes', engagement: 'actif',      social: 'mixte',      cognitiveLoad: 'eleve', typicalDuration: 15 },
  lecture:          { label: 'Lecture',                  engagement: 'passif',     social: 'individuel', cognitiveLoad: 'moyen', typicalDuration: 8  },
  video:            { label: 'Vidéo',                    engagement: 'passif',     social: 'collectif',  cognitiveLoad: 'bas',   typicalDuration: 8  },
  quiz:             { label: 'Quiz',                     engagement: 'actif',      social: 'individuel', cognitiveLoad: 'moyen', typicalDuration: 8  },
  evaluation:       { label: 'Évaluation',               engagement: 'semi_actif', social: 'individuel', cognitiveLoad: 'eleve', typicalDuration: 15 },
  retour_collectif: { label: 'Retour collectif',         engagement: 'actif',      social: 'collectif',  cognitiveLoad: 'bas',   typicalDuration: 8  },
  synthese:         { label: 'Synthèse',                 engagement: 'passif',     social: 'collectif',  cognitiveLoad: 'bas',   typicalDuration: 6  },
}

// Default method inferred from activity type
export const METHOD_FROM_ACTIVITY_TYPE: Record<ActivityType, PedagogicalMethod> = {
  amorce:            'discussion',
  modelisation:      'magistral',
  pratique_guidee:   'collaboratif',
  pratique_autonome: 'individuel',
  cloture:           'retour_collectif',
  billet:            'evaluation',
  libre:             'discussion',
}

// Interactive methods (for absence_interaction detection)
export const INTERACTIVE_METHODS = new Set<PedagogicalMethod>([
  'discussion', 'quiz', 'retour_collectif', 'collaboratif', 'atelier', 'manipulation',
])

// ─── Imbalances (Mission 3) ───────────────────────────────────────────────────

export type ImbalanceType =
  | 'passif_consecutif'
  | 'transition_longue'
  | 'explication_continue'
  | 'absence_interaction'
  | 'peu_variete'
  | 'desequilibre_temps'

export interface FlowImbalance {
  id: string
  type: ImbalanceType
  detected_at: number
  activite_id: string | null
  message: string
  severite: 'faible' | 'moderee' | 'elevee'
}

// ─── Recommendations (Mission 4) ─────────────────────────────────────────────

export type FlowRecommendationType =
  | 'ajouter_question'
  | 'travail_binome'
  | 'demonstration'
  | 'pause_active'
  | 'reduire_explication'
  | 'convertir_discussion'
  | 'changement_methode'
  | 'verification_comprehension'

export interface FlowRecommendation {
  id: string
  type: FlowRecommendationType
  message: string
  justification: string
  contexte: ImbalanceType | null
  emise_at: number
}

// ─── Flow indicators (Mission 1) ─────────────────────────────────────────────

export interface FlowIndicators {
  flow_score: number           // 0–100
  variation_pedagogique: number // 0–1
  temps_actif_pct: number      // %
  temps_passif_pct: number     // %
  transitions_moy_min: number  // average gap between activities
  engagement_estime: 'bas' | 'moyen' | 'eleve'
  rythme: 'lent' | 'equilibre' | 'soutenu'
  equilibre_methodes: number   // 0–1
}

// ─── Teaching Pace Score (Mission 5) ─────────────────────────────────────────

export interface TeachingPaceScore {
  total: number                 // 0–100
  composantes: {
    respect_temps: number       // /30
    transitions: number         // /20
    variete: number             // /25
    storyboard: number          // /15
    adaptations: number         // /10
  }
  niveau: 'debutant' | 'en_progression' | 'confirme' | 'expert'
  interpretation: string
}

// ─── Flow Replay (Mission 6) ─────────────────────────────────────────────────

export type FlowReplayQuality = 'excellent' | 'bon' | 'moyen' | 'attention'

export const REPLAY_COLORS: Record<FlowReplayQuality, string> = {
  excellent: '#22C55E',
  bon:       '#6C5CE7',
  moyen:     '#F59E0B',
  attention: '#EF4444',
}

export interface FlowReplayEvent {
  timestamp: number
  elapsed_min: number
  label: string
  quality: FlowReplayQuality
  annotation: string
  activite_id: string | null
}

// ─── Teacher profile / learning (Mission 7) ──────────────────────────────────

export interface TeacherFlowProfile {
  avg_duration_by_method: Partial<Record<PedagogicalMethod, number>>
  method_counts: Partial<Record<PedagogicalMethod, number>>
  sessions_analyzed: number
  tends_short_syntheses: boolean
  tends_long_collaboratif: boolean
  preferred_methods: PedagogicalMethod[]
  updated_at: number
}

// ─── Engine config (Mission 9) ───────────────────────────────────────────────

export interface FlowEngineConfig {
  actif: boolean
  sensibilite: 'faible' | 'normale' | 'elevee'
  transition_seuil_min: number
  explication_seuil_min: number
  interaction_seuil_min: number
  temps_domination_pct: number
  passif_consecutif_seuil: number
  show_score: boolean
  types_actifs: FlowRecommendationType[]
}

export const DEFAULT_FLOW_CONFIG: FlowEngineConfig = {
  actif: true,
  sensibilite: 'normale',
  transition_seuil_min: 3,
  explication_seuil_min: 15,
  interaction_seuil_min: 20,
  temps_domination_pct: 0.4,
  passif_consecutif_seuil: 3,
  show_score: true,
  types_actifs: [
    'ajouter_question', 'travail_binome', 'demonstration',
    'pause_active', 'reduire_explication', 'convertir_discussion',
    'changement_methode', 'verification_comprehension',
  ],
}
