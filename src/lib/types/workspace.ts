// ─── SC-02D — Types centralisés du Workspace Préparer ────────────────────────
// Source de vérité pour tous les composants, hooks et contexts du workspace.
// Ne pas dupliquer ces types dans les fichiers de composants.

// ─── Entités métier ───────────────────────────────────────────────────────────

export type StatutPreparation =
  | 'brouillon'
  | 'en_cours'
  | 'prete'
  | 'presentee'
  | 'terminee'

export type Phase = 'avant' | 'pendant' | 'apres'

export type AIStatus = 'idle' | 'generating' | 'unavailable'

export type SavingStatus = 'idle' | 'saving' | 'saved' | 'error'

export type TypeContenuIA =
  | 'curriculum'
  | 'plan_annuel'
  | 'plan_lecon'
  | 'lecon_complete'
  | 'fiche_lecon'
  | 'quiz'
  | 'evaluation'
  | 'email_parents'
  | 'autre'

// ─── Bloc pédagogique ─────────────────────────────────────────────────────────

export interface BlocPedagogique {
  id:          string
  nom:         string
  phase:       Phase
  contenu:     string
  dureeMinutes: number | null
  ordre:       number
  genereParIA: boolean
  vide:        boolean   // dérivé : contenu.trim() === ''
}

// ─── Préparation ──────────────────────────────────────────────────────────────

export interface Preparation {
  id:            string
  titre:         string
  classeId:      string | null
  matiere:       string | null
  dureeMinutes:  number | null
  statut:        StatutPreparation
  versionActuelle: number
  objectif:      string | null
  methode:       string | null
  gabarit:       string
  createdAt:     string
  updatedAt:     string
}

// ─── Version ──────────────────────────────────────────────────────────────────

export interface Version {
  id:          string
  numero:      number
  label:       string | null
  blocs:       BlocPedagogique[]
  createdAt:   string
  statut:      StatutPreparation
}

export interface VersionDiff {
  versionA:  Version
  versionB:  Version
  changes:   BlocDiff[]
}

export interface BlocDiff {
  blocId:      string
  nom:         string
  changeType:  'added' | 'removed' | 'modified' | 'unchanged'
  contentA:    string | null
  contentB:    string | null
}

// ─── Ressource (fichier attaché) ──────────────────────────────────────────────

export interface Ressource {
  fichier_id: string
  nom:        string
  type_mime?: string
  source:     'klassia' | 'local'
}

// ─── Proposition IA ───────────────────────────────────────────────────────────

export interface AIProposal {
  blocId:    string
  original:  string
  contenu:   string
  timestamp: number
}

export type AISuggestionType =
  | 'bloc_vide'
  | 'duree_desequilibree'
  | 'reformulation'
  | 'differentiation'
  | 'ressource_manquante'

export interface AISuggestion {
  id:        string
  type:      AISuggestionType
  blocId?:   string
  titre:     string
  message:   string
  action?:   string
}

// ─── Messages du chat IA (persistés en base dans conversations_ia.messages) ──

export interface PieceJointeMsg {
  nom:          string
  type_mime:    string
  url_storage?: string
}

export interface FichierKlassiaRef {
  fichier_id: string
  nom:        string
}

export interface FichierKlassiaIgnore {
  fichier_id: string
  raison:     string
  nom?:       string
}

// Reprend la shape exacte utilisée dans page.tsx pour ne pas casser la logique existante
export interface ChatMessage {
  id:                       string
  role:                     'user' | 'ia'
  content:                  string
  isStreaming?:             boolean
  piecesJointes?:           PieceJointeMsg[]
  type_contenu?:            string
  action_sug?:              ActionSuggestion
  is_saved?:                boolean
  autosave_fichier_id?:     string
  indexation_ok?:           boolean
  contenu_json?:            Record<string, unknown> | null
  fichiersKlassiaRefs?:     FichierKlassiaRef[]
  fichiersKlassiaIgnores?:  FichierKlassiaIgnore[]
  fichiersKlassiaUtilises?: FichierKlassiaRef[]
}

// ActionSuggestion : reçue depuis __ACTION__ après le stream SSE
export interface ActionSuggestion {
  type:            string
  action:          string
  type_contenu:    string
  titre:           string
  dossier_suggere: string
  contenu:         string
}

// ─── État global du workspace ─────────────────────────────────────────────────

export interface WorkspaceState {
  // Données persistées
  preparation:      Preparation | null
  blocs:            BlocPedagogique[]
  versions:         Version[]
  currentVersion:   Version | null
  conversations:    import('./database').ConversationIAResume[]

  // État UI partagé
  savingStatus:     SavingStatus
  aiStatus:         AIStatus
  activeBlocId:     string | null
  aiProposals:      Map<string, AIProposal>
  aiSuggestions:    AISuggestion[]

  // UI flags
  aiPanelOpen:      boolean
  navExpanded:      boolean
  presentationMode: boolean
}

// ─── Actions du reducer ───────────────────────────────────────────────────────

export type WorkspaceAction =
  | { type: 'SET_PREPARATION';       payload: Preparation }
  | { type: 'UPDATE_BLOC';           id: string; contenu: string; duree?: number }
  | { type: 'REORDER_BLOCS';         phase: Phase; from: number; to: number }
  | { type: 'DUPLICATE_BLOC';        id: string }
  | { type: 'DELETE_BLOC';           id: string }
  | { type: 'ADD_BLOC';              phase: Phase; after?: string }
  | { type: 'SET_AI_PROPOSAL';       blocId: string; proposal: AIProposal }
  | { type: 'ACCEPT_AI_PROPOSAL';    blocId: string }
  | { type: 'DISMISS_AI_PROPOSAL';   blocId: string }
  | { type: 'SET_SAVING_STATUS';     status: SavingStatus }
  | { type: 'SET_AI_STATUS';         status: AIStatus }
  | { type: 'SET_ACTIVE_BLOC';       id: string | null }
  | { type: 'SET_PREPARATION_STATUS'; status: StatutPreparation }
  | { type: 'ADD_AI_SUGGESTION';     suggestion: AISuggestion }
  | { type: 'DISMISS_SUGGESTION';    id: string }
  | { type: 'TOGGLE_AI_PANEL' }
  | { type: 'TOGGLE_NAV' }
  | { type: 'ENTER_PRESENTATION' }
  | { type: 'EXIT_PRESENTATION' }
  | { type: 'SET_VERSIONS';          versions: Version[] }

// ─── Props communes ───────────────────────────────────────────────────────────

export interface WorkspaceNavSection {
  id:     'plan' | 'resources' | 'history' | 'versions' | 'settings'
  icon:   string
  label:  string
  badge?: number
}

export interface SendMessageParams {
  message:          string
  blocId?:          string
  type_contenu?:    string
  fichiers_klassia?: Ressource[]
}
