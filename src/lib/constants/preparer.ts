// ─── SC-02D — Constantes centralisées du module Préparer ─────────────────────
// Source de vérité pour les valeurs magiques dispersées dans page.tsx.
// Importer depuis ce fichier plutôt que de redéfinir localement.

// ─── Protocole SSE ────────────────────────────────────────────────────────────

/** Délimiteur du header de contexte — émis en première ligne du stream */
export const KLASSIA_CTX_TAG = '__KLASSIA_CTX__'

/** Délimiteur de l'action suggérée — émis en fin de stream */
export const ACTION_TAG = '\n\n__ACTION__'

// ─── Statuts de préparation ───────────────────────────────────────────────────

export const STATUT_LABELS: Record<string, string> = {
  brouillon:   'Brouillon',
  en_cours:    'En cours',
  prete:       'Prête',
  presentee:   'Présentée',
  terminee:    'Terminée',
}

export const STATUT_COLORS: Record<string, string> = {
  brouillon:   'amber',
  en_cours:    'blue',
  prete:       'green',
  presentee:   'violet',
  terminee:    'gray',
}

// ─── Phases pédagogiques ──────────────────────────────────────────────────────

export const PHASE_LABELS: Record<string, string> = {
  avant:    'AVANT',
  pendant:  'PENDANT',
  apres:    'APRÈS',
}

export const PHASE_ORDER: Record<string, number> = {
  avant:   0,
  pendant: 1,
  apres:   2,
}

// ─── Gabarit 7 blocs standard ─────────────────────────────────────────────────

export const GABARIT_7_BLOCS = [
  { nom: 'Mise en situation',                  phase: 'avant',   dureeMinutes: 10 },
  { nom: 'Activation des connaissances',        phase: 'avant',   dureeMinutes: 10 },
  { nom: 'Activité principale',                 phase: 'pendant', dureeMinutes: 20 },
  { nom: 'Pratique guidée',                     phase: 'pendant', dureeMinutes: 10 },
  { nom: 'Évaluation formative',                phase: 'apres',   dureeMinutes: 5  },
  { nom: 'Retour sur les apprentissages',       phase: 'apres',   dureeMinutes: 5  },
  { nom: 'Devoirs et prolongements',            phase: 'apres',   dureeMinutes: null },
] as const

// ─── Types de contenu → type de fichier (schéma fichiers_dossier) ─────────────
// Dupliqué depuis page.tsx pour centralisation — page.tsx peut importer ici.

export const TYPE_FICHIER: Record<string, string> = {
  lecon_complete:   'lecon_complete',
  lecon_developpee: 'lecon_complete',
  plan_lecon:       'plan_lecon',
  fiche_lecon:      'plan_lecon',
  plan_annuel:      'plan_annuel',
  quiz:             'quiz',
  evaluation:       'evaluation_sommative',
  activite:         'activite',
  email_parents:    'communication',
  curriculum:       'curriculum',
  ressource:        'ressource',
}

// ─── Suggestions rapides du champ de saisie ───────────────────────────────────

export interface QuickSuggestion {
  id:     string
  emoji:  string
  labelFr: string
  labelEn: string
  promptFr: string
  promptEn: string
}

export const QUICK_SUGGESTIONS: QuickSuggestion[] = [
  { id: 'curriculum', emoji: '📘', labelFr: 'Curriculum',    labelEn: 'Curriculum',  promptFr: 'Génère le curriculum pour ma classe cette année.',        promptEn: 'Generate the curriculum for my class this year.'           },
  { id: 'plan_lecon', emoji: '📝', labelFr: 'Plan de leçon', labelEn: 'Lesson Plan', promptFr: 'Crée un plan de leçon détaillé pour ma prochaine leçon.', promptEn: 'Create a detailed lesson plan for my next lesson.'          },
  { id: 'lecon',      emoji: '✨', labelFr: 'Leçon complète',labelEn: 'Full Lesson', promptFr: 'Génère une leçon complète avec activités et évaluation.',  promptEn: 'Generate a complete lesson with activities and assessment.' },
  { id: 'quiz',       emoji: '🎮', labelFr: 'Quiz',          labelEn: 'Quiz',        promptFr: 'Crée un quiz formatif sur la matière actuelle.',           promptEn: 'Create a formative quiz on the current topic.'             },
  { id: 'evaluation', emoji: '📊', labelFr: 'Évaluation',    labelEn: 'Assessment',  promptFr: 'Crée une évaluation sommative avec grille de correction.', promptEn: 'Create a summative assessment with a marking grid.'         },
  { id: 'email',      emoji: '📧', labelFr: 'Email parents', labelEn: 'Parent Email',promptFr: "Rédige un email professionnel destiné aux parents d'élèves.", promptEn: 'Write a professional email for parents.'               },
]

// ─── Limites ──────────────────────────────────────────────────────────────────

export const MAX_FICHIERS_PAR_MESSAGE    = 3
export const MAX_TAILLE_FICHIER_BYTES    = 5 * 1024 * 1024   // 5 Mo
export const AUTOSAVE_DEBOUNCE_MS        = 1500
export const AI_ANALYSIS_DEBOUNCE_MS    = 3000
export const AI_RETRY_TIMEOUT_MS        = 60_000
export const TOAST_AUTO_DISMISS_MS      = 3500
export const CONVERSATIONS_LIMIT        = 200
export const BLOC_TITRE_MAX_CHARS       = 60
export const OBJECTIF_MAX_CHARS         = 200

// ─── Labels UI (évite les chaînes magiques dans les composants) ──────────────

export const UI_LABELS = {
  fr: {
    saveAuto:          'Sauvegarde auto',
    saving:            'Sauvegarde...',
    saved:             'Sauvegardé',
    saveError:         'Erreur de sauvegarde',
    aiUnavailable:     'IA hors ligne',
    generating:        'Génération en cours...',
    markReady:         'Marquer Prête',
    present:           'Présenter',
    exportDocx:        'Exporter DOCX',
    exportPptx:        'Exporter PPTX',
    newVersion:        'Créer V2',
    noContent:         'Ce bloc est vide.',
    writeManually:     'Rédiger',
    generateWithAI:    'Générer avec IA',
  },
  en: {
    saveAuto:          'Auto-save',
    saving:            'Saving...',
    saved:             'Saved',
    saveError:         'Save error',
    aiUnavailable:     'AI offline',
    generating:        'Generating...',
    markReady:         'Mark Ready',
    present:           'Present',
    exportDocx:        'Export DOCX',
    exportPptx:        'Export PPTX',
    newVersion:        'Create V2',
    noContent:         'This block is empty.',
    writeManually:     'Write manually',
    generateWithAI:    'Generate with AI',
  },
} as const

// ─── Clés localStorage ────────────────────────────────────────────────────────

export const LS_ACTIVE_CLASSE = 'klassia_active_classe'
