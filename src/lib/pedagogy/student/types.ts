// ─── ScorgIA V7.1 — Student Pedagogical Intelligence Types ─────────────────
// Modèle canonique du profil pédagogique élève.
//
// RÈGLES ABSOLUES :
//   - ScorgIA ne pose AUCUN diagnostic
//   - ScorgIA n'invente AUCUN code / désignation officielle
//   - Les catégories A/B/C/D/E sont STRICTEMENT séparées
//   - Éviter les labels pseudo-scientifiques ("visual learner")
//   - Aucun champ nominatif élève dans les contextes collectifs
//
// Source de vérité identité : table `eleves` (migration 004)
// ─────────────────────────────────────────────────────────────────────────────

import type { PedagogicalProvenance } from '../types/index'

// ════════════════════════════════════════════════════════════════════════════
// CATÉGORIE A — IDENTITÉ MINIMALE
// Jamais dupliquée — toujours lue depuis la table `eleves`
// ════════════════════════════════════════════════════════════════════════════

export type StudentIdentityRef = {
  student_id:    string   // eleves.id — UUID
  classe_id:     string   // classes.id — UUID
  annee_scolaire: string  // ex. "2026-2027"
  actif:         boolean
}

// ════════════════════════════════════════════════════════════════════════════
// CATÉGORIE B — PROFIL PÉDAGOGIQUE
// Données pédagogiques observées et déclarées par l'enseignant.
// Pas de labels diagnostics — pas de "visual learner" comme vérité fixe.
// ════════════════════════════════════════════════════════════════════════════

export type LearningPreferenceContext = {
  description:   string           // "Répond bien au travail en petits groupes"
  contexte:      string           // "Mathématiques — résolution de problèmes"
  observee:      boolean          // true = observation enseignant; false = déclaré
  confirmee_par?: string          // rôle (ex. "orthopédagogue") — jamais un nom
}

export type StudentStrength = {
  domaine:        string          // ex. "Fluidité en lecture orale"
  description:    string
  date_observee?: string
}

export type StudentNeed = {
  id:            string
  domaine:       string           // ex. "Lecture", "Attention soutenue"
  description:   string           // formulé pédagogiquement, pas médicalement
  priorite:      'elevee' | 'moderee' | 'faible'
  date_identifie?: string
  source:        'observation_enseignant' | 'evaluation_formative' | 'equipe_ecole' | 'famille' | 'autre'
}

export type StudentPedagogicalProfile = {
  // Forces et intérêts
  forces:                  StudentStrength[]
  interets:                string[]           // intérêts déclarés/observés
  voix_eleve?:             string             // ce que l'élève dit de lui-même (avec consentement)

  // Besoins pédagogiques (pas diagnostics)
  besoins:                 StudentNeed[]

  // Préférences d'apprentissage (contextuelles, pas fixes)
  preferences_apprentissage: LearningPreferenceContext[]

  // Facteurs contextuels pédagogiquement pertinents
  facteurs_contextuels?:   string[]           // ex. "Bilingue — français langue seconde"

  // Domaines de compétence ciblés
  competences_en_developpement?: string[]

  provenance?: PedagogicalProvenance
}

// ════════════════════════════════════════════════════════════════════════════
// CATÉGORIE C — DONNÉES DE SOUTIEN
// Désignations, accommodations, adaptations, modifications.
// RÈGLE : L'IA ne crée jamais ces données.
// ════════════════════════════════════════════════════════════════════════════

// Mission 3 — Désignations / Codes officiels

export type DesignationSource =
  | 'TEACHER_ENTERED'       // Entré par l'enseignant sans validation externe
  | 'SCHOOL_IMPORTED'       // Importé depuis le système de l'école
  | 'AUTHORIZED_SOURCE'     // Source officielle (Alberta Education, équipe-école)

export type StudentDesignation = {
  id:                string
  code?:             string           // code officiel — JAMAIS généré par IA
  systeme:           string           // ex. "Alberta Special Education Coding"
  libelle_officiel:  string           // ex. "Gifted and Talented"
  source:            DesignationSource
  source_description?: string         // nom de l'institution, pas d'individu
  date_designation?: string           // ISO date
  date_expiry?:      string
  statut:            'actif' | 'suspendu' | 'expire' | 'en_revue'
  entered_by_role:   string           // rôle professionnel, pas le nom
  verified:          boolean          // validé par une source autorisée
  notes?:            string           // notes pédagogiques — pas médicales
  // JAMAIS : provenance AI_GENERATED ici
}

// Accommodations et adaptations

export type AccommodationType =
  | 'temps_supplementaire'
  | 'lecture_oral'
  | 'scribe'
  | 'calculatrice'
  | 'environnement_calme'
  | 'supports_visuels'
  | 'consignes_fractionnees'
  | 'reduction_volume'
  | 'technologie_assistance'
  | 'pauses_supplementaires'
  | 'feuille_reference'
  | 'autre'

export type Accommodation = {
  id:           string
  type:         AccommodationType
  description:  string
  contexte:     string[]           // ex. ["évaluation", "cours magistral"]
  provenance:   'TEACHER_INPUT' | 'SCHOOL_IMPORTED' | 'AUTHORIZED_SOURCE'
  actif:        boolean
  date_debut?:  string
  date_fin?:    string
  notes?:       string
}

export type Modification = {
  id:              string
  description:     string          // réduction/changement du curriculum officiel
  matiere:         string
  designation_requise: boolean     // true = requiert désignation officielle
  provenance:      'SCHOOL_IMPORTED' | 'AUTHORIZED_SOURCE'
  actif:           boolean
  notes?:          string
}

export type AssistiveTechnology = {
  nom:             string
  usage:           string
  contexte?:       string[]
}

export type StudentSupportData = {
  designations:          StudentDesignation[]
  accommodations:        Accommodation[]
  modifications:         Modification[]       // seulement si formellement désignées
  technologie_assistance: AssistiveTechnology[]
  services_externes?:    { type: string; frequence?: string }[]  // rôles, pas noms
}

// ════════════════════════════════════════════════════════════════════════════
// CATÉGORIE D — OBSERVATIONS
// Notes structurées de l'enseignant — TEACHER_INPUT uniquement.
// ════════════════════════════════════════════════════════════════════════════

export type ObservationContext =
  | 'travail_individuel'
  | 'travail_groupe'
  | 'evaluation'
  | 'cours_magistral'
  | 'transition'
  | 'atelier'
  | 'autre'

export type StudentObservation = {
  id:           string
  date:         string              // ISO date
  contexte:     ObservationContext
  matiere?:     string
  observation:  string             // ce que l'enseignant observe
  action_prise?: string            // ce qui a été fait immédiatement
  suivi_requis: boolean
  created_by:   'TEACHER'          // toujours enseignant
}

// ════════════════════════════════════════════════════════════════════════════
// CATÉGORIE E — SUGGESTIONS IA
// Propositions ScorgIA — jamais des faits — toujours identifiables.
// ════════════════════════════════════════════════════════════════════════════

export type AISuggestionStatus =
  | 'pending'         // proposée — pas encore vue par l'enseignant
  | 'accepted'        // acceptée et confirmée par l'enseignant
  | 'rejected'        // rejetée par l'enseignant
  | 'modified'        // modifiée par l'enseignant avant acceptation

export type AISuggestion = {
  id:               string
  type:             'strategie' | 'objectif' | 'accommodation' | 'groupement' | 'ressource'
  source_type:      'AI_SUGGESTION'   // toujours — jamais autre chose pour cette catégorie
  titre:            string
  contenu:          string
  justification:    string            // pourquoi ScorgIA propose ceci
  bases_sur:        string[]          // sur quelles données observées (pas nominatives)
  statut:           AISuggestionStatus
  confirmed_at?:    string
  confirmed_by?:    'TEACHER'
  modification_enseignant?: string    // si modifiée
  created_at:       string
  expires_at?:      string            // suggestions ont une durée de pertinence
}

// ════════════════════════════════════════════════════════════════════════════
// CANONICAL STUDENT PEDAGOGICAL PROFILE — agrégation des catégories A-E
// ════════════════════════════════════════════════════════════════════════════

export type CanonicalStudentProfile = {
  // A — Identité (référence à la source de vérité, pas copie)
  identity:      StudentIdentityRef

  // B — Profil pédagogique
  profile?:      StudentPedagogicalProfile

  // C — Données de soutien
  support?:      StudentSupportData

  // D — Observations (liste chronologique)
  observations?: StudentObservation[]

  // E — Suggestions IA (toujours séparées)
  ai_suggestions?: AISuggestion[]

  // Métadonnées
  niveau_confidentialite: 'enseignant' | 'equipe_ecole' | 'direction'
  created_at:     string
  updated_at:     string
}

// ════════════════════════════════════════════════════════════════════════════
// MISSION 7 — NIVEAUX DE SOUTIEN (UDL)
// Ne pas transformer en diagnostic — décrivent l'intensité du soutien.
// ════════════════════════════════════════════════════════════════════════════

export type SupportLevel = 'universal' | 'targeted' | 'individualized'

export type SupportLevelDescription = {
  level:       SupportLevel
  nom:         string
  definition:  string
  population:  string         // ex. "~15-20% des élèves"
  exemples:    string[]
}

export const SUPPORT_LEVEL_DESCRIPTIONS: Record<SupportLevel, SupportLevelDescription> = {
  universal: {
    level:      'universal',
    nom:        'Soutien universel',
    definition: 'Pratiques pédagogiques efficaces pour tous les élèves, intégrées à la conception',
    population: '100% des élèves',
    exemples:   ['Supports visuels', 'Instructions claires', 'Choix de représentation', 'Routines prévisibles'],
  },
  targeted: {
    level:      'targeted',
    nom:        'Soutien ciblé',
    definition: 'Interventions supplémentaires pour élèves présentant des difficultés temporaires ou spécifiques',
    population: '~15-20% des élèves',
    exemples:   ['Enseignement en petits groupes', 'Pratique supplémentaire', 'Scaffolding ciblé'],
  },
  individualized: {
    level:      'individualized',
    nom:        'Soutien individualisé',
    definition: 'Soutien intensif pour élèves avec besoins complexes persistants — souvent lié à un plan formel',
    population: '~2-5% des élèves',
    exemples:   ['Plan d\'intervention individualisé', 'Spécialiste dédié', 'Modifications curriculaires'],
  },
}

// ════════════════════════════════════════════════════════════════════════════
// MISSION 5 — OBJECTIFS MESURABLES
// Validateur déterministe — l'IA propose, l'enseignant confirme.
// ════════════════════════════════════════════════════════════════════════════

export type SupportGoalDomain =
  | 'lecture'
  | 'ecriture'
  | 'numeratie'
  | 'communication'
  | 'organisation'
  | 'attention'
  | 'habiletes_sociales'
  | 'competences_curriculaires'
  | 'autonomie'
  | 'autre'

export type GoalStatus = 'actif' | 'atteint' | 'suspendu' | 'revise' | 'archive'

export type MeasurableGoal = {
  id:              string
  domaine:         SupportGoalDomain
  formulation:     string         // formulation complète de l'objectif
  comportement:    string         // comportement / compétence ciblé(e)
  condition:       string         // contexte/conditions dans lesquelles on l'observera
  critere:         string         // comment on sait que c'est atteint
  echeance:        string         // ISO date cible
  statut:          GoalStatus
  baseline?:       string         // point de départ observé
  resultat_attendu?: string       // résultat quantifié/qualifié attendu
  progression?:    GoalProgressEntry[]
  provenance:      'TEACHER_INPUT' | 'EQUIPE_ECOLE'  // jamais AI_SUGGESTION seul
}

export type GoalProgressEntry = {
  date:            string
  observation:     string
  evidence?:       string
  decision?:       'continuer' | 'ajuster' | 'intensifier' | 'reduire' | 'clore'
}

// Validation déterministe d'un objectif

export type ObjectiveValidationResult = {
  is_valid:        boolean
  score:           number          // 0–4 (un point par critère SMART)
  issues:          ObjectiveIssue[]
  suggestions?:    string[]        // suggestions de reformulation — à confirmer par enseignant
}

export type ObjectiveIssueCode =
  | 'OBJECTIVE_TOO_VAGUE'           // "améliorer sa lecture" — aucun critère
  | 'MISSING_MEASURABLE_CRITERION'  // pas de critère mesurable
  | 'MISSING_TIMEFRAME'             // pas d'échéance
  | 'MISSING_CONDITION'             // pas de contexte/condition
  | 'MISSING_BEHAVIOR'              // pas de comportement observable ciblé
  | 'GENERIC_PLACEHOLDER'           // "Objectif 1", "Stratégie adaptée"

export type ObjectiveIssue = {
  code:    ObjectiveIssueCode
  message: string
}

// ════════════════════════════════════════════════════════════════════════════
// MISSION 6 — INTERVENTION LOOP
// Chaîne traçable : BESOIN → BASELINE → OBJECTIF → STRATÉGIE → INTERVENTION
//               → OBSERVATION → PREUVE → ANALYSE → DÉCISION → AJUSTEMENT
// ════════════════════════════════════════════════════════════════════════════

export type InterventionStatus = 'planifiee' | 'active' | 'suspendue' | 'complete' | 'archive'

export type InterventionFrequency = {
  sessions_par_semaine: number
  duree_minutes:        number
  contexte?:            string    // ex. "période de lecture quotidienne"
}

export type InterventionStrategy = {
  strategie:        string
  justification:    string         // POURQUOI cette stratégie pour ce besoin
  source_evidence?: string         // ex. "UDL guideline 3.3"
  contexte:         string         // quand/où l'appliquer
  materiel?:        string[]
}

export type Intervention = {
  id:               string
  objectif_id:      string         // lie à MeasurableGoal.id
  besoin_id:        string         // lie à StudentNeed.id
  statut:           InterventionStatus
  strategie:        InterventionStrategy
  frequence:        InterventionFrequency
  responsable_role: string         // rôle professionnel, jamais un nom
  date_debut:       string
  date_revision:    string
  date_fin?:        string

  // Traçabilité — répond aux questions clés
  pourquoi:         string         // lien explicite au besoin identifié
  depuis_quand:     string         // date_debut (alias sémantique)
  observations:     InterventionObservation[]
  preuves:          InterventionEvidence[]
  decisions:        InterventionDecision[]
}

export type InterventionObservation = {
  id:          string
  date:        string
  observation: string
  par_role:    string    // rôle, pas nom
}

export type InterventionEvidence = {
  id:          string
  date:        string
  type:        'echantillon_travail' | 'resultat_evaluation' | 'observation' | 'enregistrement' | 'autre'
  description: string
  valeur?:     string    // valeur mesurée si applicable
}

export type InterventionDecision = {
  id:          string
  date:        string
  analyse:     string
  decision:    'continuer' | 'ajuster' | 'intensifier' | 'reduire' | 'clore' | 'reference'
  modification?: string
  par_role:    string
}

// Résumé d'une boucle d'intervention complète (pour répondre aux 7 questions)

export type InterventionLoopSummary = {
  intervention_id:  string
  pourquoi:         string
  objectif_vise:    string
  depuis_quand:     string
  frequence:        string
  nb_observations:  number
  derniere_decision?: string
  progresse:        boolean | null   // null si données insuffisantes
}

// ════════════════════════════════════════════════════════════════════════════
// PLAN DE SOUTIEN COMPLET V7.1
// Extension de StudentSupportPlanV7 (V7.0) avec les nouveaux modèles.
// ════════════════════════════════════════════════════════════════════════════

export type SupportPlanV71 = {
  // Identification
  id?:               string
  student_id:        string          // eleves.id — source de vérité
  classe_id:         string
  enseignant_id:     string          // utilisateurs.id
  annee_scolaire:    string
  statut:            'brouillon' | 'actif' | 'en_revue' | 'archive'
  date_creation:     string
  date_revision:     string          // prochaine révision prévue
  equipe?:           string[]        // rôles impliqués (pas de noms)

  // Profil pédagogique (catégories B-D)
  profil?:           StudentPedagogicalProfile
  support_data?:     StudentSupportData
  observations?:     StudentObservation[]

  // Baseline
  niveau_actuel?:    string
  baseline?:         string
  sources_baseline?: string[]

  // Objectifs mesurables
  objectifs:         MeasurableGoal[]

  // Interventions
  interventions:     Intervention[]

  // Suivi du progrès
  review_entries?:   PlanReviewEntry[]

  // Suggestions IA (toujours séparées — à confirmer)
  ai_suggestions?:   AISuggestion[]

  // Confidentialité — requis
  niveau_confidentialite: 'enseignant' | 'equipe_ecole' | 'direction'

  // Audit trail
  changes_log:       PlanChangeEntry[]
}

// Révision périodique du plan

export type PlanReviewEntry = {
  id:           string
  date:         string
  participants: string[]   // rôles, pas noms
  progres:      string
  decision:     'continuer' | 'modifier' | 'intensifier' | 'clore'
  modifications?: string
}

// Audit trail

export type PlanChangeEntry = {
  id:           string
  timestamp:    string
  actor_type:   'TEACHER' | 'SYSTEM' | 'AI' | 'AUTHORIZED_STAFF'
  action:       'created' | 'updated' | 'reviewed' | 'ai_suggested' | 'confirmed' | 'rejected'
  field?:       string    // champ modifié si applicable
  previous?:    string    // valeur précédente (sérialisée)
  current?:     string    // valeur actuelle
  note?:        string
}
