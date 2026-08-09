// ─── SC-03I — Teaching Copilot types ─────────────────────────────────────────

// Mission 2 — Assistance categories
export type AssistanceCategory =
  | 'pedagogie'
  | 'gestion_temps'
  | 'gestion_classe'
  | 'explication'
  | 'exemple'
  | 'exercice'
  | 'question'
  | 'differenciation'
  | 'evaluation'
  | 'revision'
  | 'support'

export const CATEGORY_LABELS: Record<AssistanceCategory, string> = {
  pedagogie:       'Pédagogie',
  gestion_temps:   'Temps',
  gestion_classe:  'Classe',
  explication:     'Expliquer',
  exemple:         'Exemple',
  exercice:        'Exercice',
  question:        'Question',
  differenciation: 'Différenciation',
  evaluation:      'Évaluation',
  revision:        'Révision',
  support:         'Support',
}

// Mission 3 — Quick Actions
export type QuickActionType =
  | 'creer_exemple'
  | 'creer_analogie'
  | 'poser_question'
  | 'creer_exercice'
  | 'simplifier'
  | 'approfondir'
  | 'creer_defi'
  | 'creer_activite'
  | 'donner_definition'
  | 'faire_synthese'

export interface QuickAction {
  type: QuickActionType
  emoji: string
  label: string
  category: AssistanceCategory
  promptTemplate: string // filled with context at runtime
}

export const QUICK_ACTIONS: QuickAction[] = [
  { type: 'creer_exemple',     emoji: '💡', label: 'Exemple',      category: 'exemple',        promptTemplate: 'Donne-moi un exemple concret et mémorable pour illustrer "{titre}" dans le contexte de {matiere} pour une classe de {classe}.' },
  { type: 'creer_analogie',    emoji: '🔗', label: 'Analogie',     category: 'explication',    promptTemplate: 'Propose une analogie simple et accessible pour expliquer "{objectif}" à des élèves de {classe} en {matiere}.' },
  { type: 'poser_question',    emoji: '❓', label: 'Question',      category: 'question',       promptTemplate: 'Propose une question ouverte et stimulante pour relancer la réflexion des élèves sur "{titre}". La question doit favoriser la discussion.' },
  { type: 'creer_exercice',    emoji: '✏️', label: 'Exercice',      category: 'exercice',       promptTemplate: 'Crée un exercice pratique de {duree} minutes sur "{objectif}" adapté à des élèves de {classe}.' },
  { type: 'simplifier',        emoji: '⬇️', label: 'Simplifier',   category: 'explication',    promptTemplate: 'Simplifie l\'explication de "{titre}" pour les élèves qui n\'ont pas encore bien compris. Utilise des mots simples et un exemple immédiat.' },
  { type: 'approfondir',       emoji: '🔍', label: 'Approfondir',  category: 'pedagogie',      promptTemplate: 'Propose une façon d\'approfondir le sujet "{titre}" pour aller plus loin, en lien avec les objectifs de {matiere}.' },
  { type: 'creer_defi',        emoji: '🏆', label: 'Défi',         category: 'differenciation', promptTemplate: 'Propose un défi intellectuel de 3 minutes pour les élèves les plus avancés sur le thème "{titre}" en {matiere}.' },
  { type: 'creer_activite',    emoji: '⚡', label: 'Activité',      category: 'pedagogie',      promptTemplate: 'Propose une activité improvisée de 5 minutes pour dynamiser la séance sur "{titre}". L\'activité doit être simple à lancer sans préparation.' },
  { type: 'donner_definition', emoji: '📖', label: 'Définition',   category: 'explication',    promptTemplate: 'Donne une définition claire et concise d\'un concept clé de "{titre}", adaptée au niveau {classe} en {matiere}.' },
  { type: 'faire_synthese',    emoji: '📝', label: 'Synthèse',     category: 'revision',       promptTemplate: 'Fais une synthèse en 3 points de ce que les élèves ont appris jusqu\'ici dans cette séance sur "{titre}".' },
]

// Mission 1 — Teaching context assembled by the copilot
export interface CopilotTeachingContext {
  // Session
  lecon_titre: string
  classe: string
  matiere: string
  niveau: string
  date: string
  // Current activity
  current_activity_titre: string
  current_activity_objectif: string
  current_activity_type: string
  current_activity_duree_prevue: number
  // Progress
  elapsed_min: number
  remaining_min: number
  activities_done: number
  activities_total: number
  // Flow engine
  flow_score: number
  engagement_estime: string
  active_imbalances: string[]
  // Time intelligence
  variance_cumulative: number
  estimated_end: string
  // Notes from session
  notes_summary: string[]
  // Teacher profile preferences
  preferred_methods: string[]
}

// Mission 5 — Conversational memory
export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  quick_action?: QuickActionType
  category?: AssistanceCategory
  // Mission 8 — Guardrails
  is_suggestion: boolean
  sources_used: string[]
}

// Mission 8 — Guardrail flags
export interface CopilotGuardrails {
  always_tag_suggestions: boolean
  cite_library_sources: boolean
  no_unverified_assertions: boolean
  max_confidence_without_context: 'low' | 'medium' // never 'high' without data
}

export const DEFAULT_GUARDRAILS: CopilotGuardrails = {
  always_tag_suggestions: true,
  cite_library_sources: true,
  no_unverified_assertions: true,
  max_confidence_without_context: 'medium',
}

// Session memory (temporary, cleared each session)
export interface CopilotSessionMemory {
  messages: CopilotMessage[]
  quick_actions_used: QuickActionType[]
  session_id: string
  started_at: number
}
