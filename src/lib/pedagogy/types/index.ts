// ─── ScorgIA — Pedagogical Intelligence Types V7.0 ────────────────────────────
// Foundation layer: types contrats qui serviront aux V7–V12.
// Ces types ÉTENDENT les structures existantes — rien n'est supprimé.
// Tout champ est optionnel sauf indication contraire.

import type { CurriculumOutcomeType } from '@/lib/types/database'

// ════════════════════════════════════════════════════════════════════════════
// MISSION 15 — PROVENANCE & SOURCE
// ════════════════════════════════════════════════════════════════════════════

export type PedagogicalProvenanceType =
  | 'OFFICIAL_CURRICULUM'      // Document curriculaire officiel (Alberta Ed., etc.)
  | 'OFFICIAL_STANDARD'        // Norme officielle (TQS, etc.)
  | 'SCHOOL_POLICY'            // Politique de l'école — jamais inventée par ScorgIA
  | 'TEACHER_INPUT'            // Saisie directe par l'enseignant·e
  | 'STUDENT_DATA'             // Données élève — traitement restreint
  | 'AI_GENERATED'             // Généré par l'IA ScorgIA
  | 'SYSTEM_DERIVED'           // Calculé par le système (dates, stats…)
  | 'CALENDAR_DERIVED'         // Issu du calendrier scolaire
  | 'CURRICULUM_DERIVED'       // Déduit du curriculum (pas copié textuellement)
  | 'EXTERNAL_RESOURCE'        // Ressource externe non officielle
  | 'MISSING'                  // Information manquante — à confirmer

export type PedagogicalProvenance = {
  type:              PedagogicalProvenanceType
  source_name?:      string    // ex. "Alberta Education Teaching Quality Standard 2023"
  source_url?:       string    // URL de référence (si publique)
  source_reference?: string    // référence bibliographique
  source_version?:   string    // version du document source
  retrieved_at?:     string    // ISO date de consultation
  jurisdiction?:     string    // ex. "Alberta", "Ontario", "Saskatchewan"
  confidence?:       'confirmed' | 'indicative' | 'uncertain'
}

// Champ de provenance par attribut d'un document
export type FieldProvenance = Record<
  string,
  PedagogicalProvenanceType
>

// ════════════════════════════════════════════════════════════════════════════
// MISSION 2 — COMPETENCY FRAMEWORK
// Compétences transversales — jamais injectées artificiellement.
// ════════════════════════════════════════════════════════════════════════════

export type TransversalCompetencyId =
  | 'pensee_critique'
  | 'resolution_problemes'
  | 'communication'
  | 'collaboration'
  | 'gestion_information'
  | 'creativite_innovation'
  | 'citoyennete'
  | 'developpement_personnel'

export type TransversalCompetency = {
  id:                       TransversalCompetencyId | string
  nom:                      string
  justification:            string            // pourquoi cette compétence dans ce contexte
  manifestation_observable: string            // ce qu'on observe chez l'élève
  activite_concernee?:      string            // quelle activité la travaille
  preuve_possible?:         string            // quelle preuve peut être recueillie
  niveau_attendu?:          string            // niveau de maîtrise visé
}

export const COMPETENCES_TRANSVERSALES_ALBERTA: Record<TransversalCompetencyId, string> = {
  pensee_critique:        'Pensée critique',
  resolution_problemes:   'Résolution de problèmes',
  communication:          'Communication',
  collaboration:          'Collaboration',
  gestion_information:    'Gestion de l\'information',
  creativite_innovation:  'Créativité et innovation',
  citoyennete:            'Citoyenneté',
  developpement_personnel:'Développement personnel et bien-être',
}

// ════════════════════════════════════════════════════════════════════════════
// MISSION 3 — CURRICULUM OUTCOME V7
// Enrichit le CurriculumOutcome existant sans le remplacer.
// ════════════════════════════════════════════════════════════════════════════

export type CurriculumCoverageStatus =
  | 'non_planifie'
  | 'planifie'
  | 'enseigne'
  | 'evalue'
  | 'consolide'

export type CurriculumOutcomeV7 = {
  // ── Champs compatibles avec CurriculumOutcome existant ───────────────────
  id:           string
  code?:        string
  titre:        string
  description:  string
  type:         CurriculumOutcomeType
  parentId?:    string

  // ── Enrichissements V7 ────────────────────────────────────────────────────
  reference_officielle?:           string   // code doc officiel ex. "AB-SCI-7-1.2.a"
  source?:                         string   // nom du programme source
  source_version?:                 string   // ex. "2023"
  annee_scolaire_applicabilite?:   string   // ex. "2025-2026"
  matiere?:                        string
  niveau?:                         string
  domaine?:                        string   // strand/domaine ex. "Nombres et opérations"
  question_directrice?:            string   // guiding question
  connaissances?:                  string[] // knowledge
  comprehensions?:                 string[] // understandings (big ideas derrière)
  habiletes?:                      string[] // skills
  relations_autres_outcomes?:      string[] // IDs d'outcomes liés
  statut_couverture?:              CurriculumCoverageStatus
  provenance?:                     PedagogicalProvenance
}

// ════════════════════════════════════════════════════════════════════════════
// MISSION 4 — UNIT PLAN V7 (Plan d'unité maître)
// Remplace pas Unite existant — enrichit sa représentation conceptuelle.
// ════════════════════════════════════════════════════════════════════════════

export type UnitPlanV7 = {
  // Identité
  id?:             string
  titre:           string
  numero:          number
  periode?:        string          // ex. "S1–S8"
  semaine_debut:   number
  semaine_fin:     number
  duree_heures?:   number

  // Alignement curriculaire
  curriculum_outcome_ids?:         string[]
  questions_directrices?:          string[]
  grandes_idees?:                  string[]
  connaissances?:                  string[]
  comprehensions?:                 string[]
  habiletes?:                      string[]
  competences_transversales?:      TransversalCompetency[]

  // Intention pédagogique
  justification_pedagogique?:      string
  preuves_apprentissage_attendues?: string[]
  evaluations_majeures_prevues?:   string[]

  // Inclusion et ressources
  considerations_inclusion?:       string[]
  ressources_principales?:         string[]

  // Structure interne (IDs seulement — pas de contenu embarqué)
  sequence_ids?:                   string[]
  nb_sequences?:                   number

  // Provenance
  provenance?:                     PedagogicalProvenance
}

// ════════════════════════════════════════════════════════════════════════════
// MISSION 5 — SEQUENCE PLAN V7 (Plan de séquence maître)
// Une séquence doit EXPLIQUER son existence.
// ════════════════════════════════════════════════════════════════════════════

export type SequencePlanV7 = {
  // Identité
  id?:                      string
  titre:                    string
  unite_parent_id?:         string
  unite_numero?:            number
  duree_heures?:            number
  semaine_debut?:           number
  semaine_fin?:             number

  // Alignement
  curriculum_outcome_ids?:  string[]
  connaissances?:           string[]
  comprehensions?:          string[]
  habiletes?:               string[]
  competences?:             string[]
  competences_transversales?: TransversalCompetency[]

  // Intention
  question_essentielle?:    string
  objectif_sequence?:       string
  justification_pedagogique?: string   // OBLIGATOIRE conceptuellement
  acquis_prealables?:       string[]
  misconceptions_anticipees?: string[]

  // Progression cognitive
  point_depart?:            string     // état de départ des élèves
  progression?:             string     // comment la compréhension évolue
  point_arrivee?:           string     // état cible à la fin

  // Évaluation
  preuves_recherchees?:     string[]
  evaluation_formative?:    string
  evaluation_sommative?:    string
  criteres_reussite?:       string[]

  // Inclusion
  barrieres_anticipees?:    string[]
  supports_universels?:     string[]
  supports_cibles?:         string[]
  adaptations_prevues?:     string[]

  // Références aux leçons
  lecon_ids?:               string[]   // IDs vers plans de leçon
  nb_lecons?:               number

  // Provenance
  provenance?:              PedagogicalProvenance
}

// ════════════════════════════════════════════════════════════════════════════
// MISSION 6 — LESSON PLAN V7 (Plan de leçon maître)
// Sections A–I. Adaptable par matière.
// ════════════════════════════════════════════════════════════════════════════

export type LessonVarianteDisciplinaire =
  | 'mathematiques'
  | 'sciences'
  | 'francais'
  | 'anglais'
  | 'sciences_humaines'
  | 'arts'
  | 'eps'
  | 'musique'
  | 'general'

export type LessonPhase = {
  duree_minutes?:       number
  action_enseignant?:   string
  action_eleves?:       string
  strategie?:           string
  materiel?:            string[]
  observation_attendue?: string
}

export type DifferentiationSupport = {
  supports_universels?:  string[]   // UDL — applicable à tous
  supports_cibles?:      string[]   // groupes ciblés
  adaptations?:          string[]   // élèves avec plans individuels
}

export type LessonAssessment = {
  formative?:   string
  preuves?:     string[]
  feedback?:    string
  exit_ticket?: string
}

export type LessonPlanV7 = {
  // A. Identité
  id?:                     string
  classe_id?:              string
  matiere?:                string
  unite_titre?:            string
  sequence_titre?:         string
  titre:                   string
  duree_minutes?:          number
  date_prevue?:            string
  variante_disciplinaire?: LessonVarianteDisciplinaire

  // B. Alignement curriculaire
  curriculum_outcome_ids?: string[]
  connaissances?:          string[]
  comprehension?:          string
  habiletes?:              string[]
  competences_pertinentes?: TransversalCompetency[]

  // C. Intention
  objectif_eleve?:         string     // observable, élève comme sujet
  criteres_reussite?:      string[]
  vocabulaire_essentiel?:  string[]
  prerequis?:              string[]

  // D. Anticipation
  connaissances_anterieures?: string
  misconceptions?:         string[]
  barrieres_possibles?:    string[]

  // E. Matériel
  materiel?:               string[]
  ressources?:             string[]

  // F. Déroulement
  activation?:             LessonPhase
  enseignement_explicite?: LessonPhase
  pratique_guidee?:        LessonPhase
  collaboration?:          LessonPhase
  pratique_autonome?:      LessonPhase
  consolidation?:          LessonPhase

  // G. Différenciation / Inclusion
  differentiation?:        DifferentiationSupport

  // H. Évaluation
  evaluation?:             LessonAssessment

  // I. Après la leçon (réflexion enseignant)
  reflexion_enseignant?:   string
  eleves_necessitant_reprise?: string[]
  notion_a_revoir?:        string
  ajustement_prochaine?:   string

  // Provenance
  provenance?:             PedagogicalProvenance
}

// ════════════════════════════════════════════════════════════════════════════
// MISSION 7 — SYLLABUS V7
// Étend PackSyllabus sans le remplacer.
// Chaque champ à provenance — ScorgIA ne génère JAMAIS les politiques scolaires.
// ════════════════════════════════════════════════════════════════════════════

export type SyllabusV7 = {
  // 1. Identité du cours
  identite_cours?: {
    titre:          string
    niveau:         string
    matiere:        string
    annee_scolaire?: string
    code_cours?:    string
    salle?:         string
  }

  // 2. Enseignant
  enseignant?: {
    prenom:             string
    nom:                string
    courriel?:          string    // NE PAS INVENTER — MISSING si absent
    disponibilites?:    string
    plateforme?:        string
  }

  // 3–5. Description, finalité, curriculum
  description?:         string
  finalite_mission?:    string
  curriculum_applicable?: {
    nom:       string
    version?:  string
    source?:   string
    url?:      string
  }

  // 6–9. Contenu
  resultats_majeurs?:          string[]
  grandes_idees?:              string[]
  competences_habiletes?:      string[]
  organisation_unites?:        { titre: string; semaines?: string; description?: string }[]

  // 10–14. Pédagogie et évaluation
  calendrier_previsionnel?:    { semaines: string; titre: string; description?: string }[]
  approches_pedagogiques?:     string[]
  ressources_materiel?:        string[]
  evaluation_formative?:       string
  evaluation_sommative?:       string

  // 15–18. Politiques d'évaluation
  categories_ponderations?:   { categorie: string; poids?: number }[]
  criteres_reussite?:         string
  politique_retroaction?:     string
  travaux?:                   string

  // 19–22. Politiques de classe — JAMAIS INVENTÉES
  politique_absences?:        string   // provenance: SCHOOL_POLICY_REQUIRED ou MISSING
  politique_remise_tardive?:  string
  integrite_academique?:      string
  utilisation_ia?:            string   // politique IA en classe

  // 23–26. Environnement
  comportement_routines?:     string
  inclusion_soutien?:         string
  communication?:             string
  securite?:                  string

  // 27–30. Organisation
  calendrier?:                string
  coordonnees_urgence?:       string   // JAMAIS INVENTÉ
  elements_specifiques_ecole?: string
  acknowledgement?:           string

  // Provenance par champ
  provenance_champs?:         FieldProvenance

  // Métadonnées
  genere_par_ia?:             boolean
  version?:                   string
  created_at?:                string
}

// ════════════════════════════════════════════════════════════════════════════
// MISSION 8 — STUDENT SUPPORT PLAN V7
// PAS un diagnostic médical. Travaille uniquement avec les données disponibles.
// ════════════════════════════════════════════════════════════════════════════

export type SupportStatut = 'brouillon' | 'actif' | 'suspendu' | 'complete' | 'archive'
export type SupportNiveau = 'universel' | 'cible' | 'individualise'
export type ConfidentialiteNiveau = 'enseignant' | 'equipe_ecole' | 'direction'

export type PedagogicalGoal = {
  description:   string
  indicateurs?:  string[]
  echeance?:     string
  responsable?:  string
}

export type SupportStrategy = {
  strategie:   string
  niveau:      SupportNiveau
  frequence?:  string
  duree?:      string
  responsable?: string
  contexte?:   string
}

export type SupportMonitoring = {
  mesure?:      string
  frequence?:   string
  observations?: string
  donnees?:     string
  progres?:     'insuffisant' | 'en_cours' | 'atteint' | 'depasse'
  decision?:    string
}

export type SupportCollaboration = {
  participant: string
  role:        string
  contact?:    string
  reunions?:   string
  decisions?:  string[]
}

export type StudentSupportPlanV7 = {
  // IDENTIFICATION
  id?:                         string
  eleve_id:                    string     // pseudonymisé en transmission IA
  classe_id:                   string
  enseignant_id:               string
  annee_scolaire?:             string
  equipe?:                     string[]
  statut:                      SupportStatut
  date_creation:               string
  date_revision?:              string

  // PROFIL PÉDAGOGIQUE (jamais médical)
  forces?:                     string[]
  interets?:                   string[]
  voix_eleve?:                 string     // avec consentement
  profil_apprentissage?:       string
  informations_famille_peda?:  string     // seulement pédagogiquement pertinent

  // BESOINS OBSERVÉS (pas de diagnostic)
  besoins_observes?:           string[]
  obstacles?:                  string[]
  observations?:               string
  donnees_disponibles?:        string
  designation_officielle?:     string     // remplie SEULEMENT si fournie officiellement

  // PERFORMANCE ACTUELLE
  niveau_actuel?:              string
  baseline?:                   string

  // OBJECTIFS PÉDAGOGIQUES
  objectif_annuel?:            PedagogicalGoal
  objectifs_mesurables?:       PedagogicalGoal[]

  // SUPPORTS
  strategies?:                 SupportStrategy[]
  accommodations?:             string[]
  modifications?:              string[]   // seulement si formellement désignées
  technologie_assistance?:     string[]
  environnement?:              string[]

  // MONITORING
  monitoring?:                 SupportMonitoring

  // COLLABORATION
  collaboration?:              SupportCollaboration[]

  // TRANSITION
  plan_transition?:            string

  // CONFIDENTIALITÉ — obligatoire
  niveau_confidentialite:      ConfidentialiteNiveau
}

// ════════════════════════════════════════════════════════════════════════════
// MISSION 9 — QUALITY ENGINE TYPES
// Moteur déterministe — règles explicables, pas d'IA pour le score.
// ════════════════════════════════════════════════════════════════════════════

export type QualityLevel = 'NOT_READY' | 'NEEDS_REVIEW' | 'READY' | 'STRONG'

export type QualityDimension =
  | 'CURRICULUM_ALIGNMENT'
  | 'OBJECTIVE_QUALITY'
  | 'PEDAGOGICAL_COHERENCE'
  | 'ASSESSMENT_ALIGNMENT'
  | 'INCLUSION'
  | 'DIFFERENTIATION'
  | 'LEARNER_ENGAGEMENT'
  | 'EVIDENCE_OF_LEARNING'
  | 'CONTEXTUALIZATION'
  | 'DOCUMENT_COMPLETENESS'

export type DimensionResult = {
  dimension:       QualityDimension
  level:           QualityLevel
  score:           number       // 0–10
  evidence:        string[]     // ce qui est présent
  missing:         string[]     // ce qui manque
  warnings:        string[]     // présent mais problématique
  recommendations: string[]
}

export type PedagogicalQualityReport = {
  document_type:  string
  document_id?:   string
  total_score:    number          // 0–100
  overall_level:  QualityLevel
  dimensions:     DimensionResult[]
  critical_gaps:  string[]        // gaps bloquants (NOT_READY)
  strengths:      string[]        // points forts (STRONG)
  next_steps:     string[]        // recommandations prioritaires
  generated_at:   string
}

// ════════════════════════════════════════════════════════════════════════════
// MISSION 10 — TRACEABILITY
// Graphe de traçabilité RA → preuves d'apprentissage.
// ════════════════════════════════════════════════════════════════════════════

export type TraceabilityNodeType =
  | 'curriculum_outcome'
  | 'unit'
  | 'sequence'
  | 'lesson_plan'
  | 'lesson'
  | 'assessment'
  | 'teaching_event'

export type TraceabilityNode = {
  type:    TraceabilityNodeType
  id:      string
  titre?:  string
  code?:   string
  date?:   string
}

export type TraceabilityGraph = {
  outcome_id:      string
  outcome_code?:   string
  outcome_titre?:  string
  units:           { unit_id: string; titre?: string; seqIdx?: number }[]
  sequences:       { seq_id: string; titre?: string; unit_id: string }[]
  lesson_plans:    { plan_id: string; titre?: string; seq_id?: string }[]
  lessons:         { lesson_id: string; titre?: string; plan_id?: string }[]
  teaching_events: { event_id: string; occurred_at: string; seq_idx: number; lecon_idx: number }[]
  assessments:     { assessment_id: string; type?: string }[]
  is_planified:    boolean
  is_taught:       boolean
  is_assessed:     boolean
  missing:         string[]      // lacunes dans la chaîne de traçabilité
}

// ════════════════════════════════════════════════════════════════════════════
// MISSION 14 — TEMPLATE REGISTRY
// Registre central des templates pédagogiques ScorgIA.
// ════════════════════════════════════════════════════════════════════════════

export type TemplateType =
  | 'CURRICULUM_MAP'
  | 'SYLLABUS'
  | 'ANNUAL_PLAN'
  | 'UNIT_PLAN'
  | 'SEQUENCE_PLAN'
  | 'LESSON_PLAN'
  | 'DETAILED_LESSON'
  | 'ASSESSMENT'
  | 'RUBRIC'
  | 'STUDENT_SUPPORT_PLAN'
  | 'INTERVENTION'
  | 'CLASSROOM_LAYOUT'
  | 'GROUP_WORK'
  | 'CLASSROOM_POSTER'
  | 'REFLECTION'

export type TemplateFieldType = 'text' | 'list' | 'date' | 'number' | 'boolean' | 'markdown' | 'select'

export type TemplateField = {
  field:                   string
  label:                   string
  type:                    TemplateFieldType
  description?:            string
  provenance_expected?:    PedagogicalProvenanceType
  never_ai_generated?:     boolean   // true = ScorgIA ne génère JAMAIS ce champ
}

export type TemplateQualityRule = {
  id:          string
  dimension:   QualityDimension
  description: string
  check:       string    // règle textuelle — pas de code dynamique
  weight:      number    // 0–1
}

export type PedagogicalTemplate = {
  id:                       string
  type:                     TemplateType
  nom:                      string
  version:                  string
  jurisdiction?:            string
  langue:                   string
  school_level?:            string[]
  subject_applicability?:   string[]   // vide = toutes matières
  required_fields:          TemplateField[]
  optional_fields:          TemplateField[]
  quality_rules:            TemplateQualityRule[]
  provenance_requirements:  PedagogicalProvenanceType[]
  created_at?:              string
}

// ════════════════════════════════════════════════════════════════════════════
// MISSIONS 11–13 — SMART CLASSROOM + TOOLKIT + GROUP WORK
// ════════════════════════════════════════════════════════════════════════════

// Mission 11 — Smart Classroom

export type RoomElementType =
  | 'tableau' | 'tbi' | 'porte' | 'fenetre' | 'prise'
  | 'meuble' | 'rangement' | 'zone_fixe' | 'autre'

export type RoomElement = {
  id:           string
  type:         RoomElementType
  label?:       string
  position?:    { x: number; y: number }
  dimensions?:  { largeur: number; hauteur: number }
  notes?:       string
}

export type ClassroomLayoutType =
  | 'enseignement_direct'
  | 'collaboration'
  | 'discussion'
  | 'ateliers'
  | 'evaluation'
  | 'flexible'

export type ClassroomLayout = {
  id?:                           string
  classe_id:                     string
  nom:                           string
  type:                          ClassroomLayoutType
  justification?:                string
  instructions_deplacement?:     string[]
  considerations_accessibilite?: string[]
  points_vigilance?:             string[]
  elements?:                     RoomElement[]
}

export type SmartClassroomModel = {
  id?:                            string
  classe_id:                      string
  dimensions?:                    { largeur: number; longueur: number }
  photos?:                        { url: string; source: string; date: string; consentement?: boolean }[]
  elements_fixes?:                RoomElement[]
  nb_eleves?:                     number
  types_activites?:               string[]
  // NOTE: besoins agrégés uniquement — jamais individuel nommé dans ce champ
  besoins_pedagogiques_agreges?:  string[]
  preferences_enseignant?:        string[]
  contraintes?:                   string[]
  materiel_disponible?:           string[]
  layouts?:                       ClassroomLayout[]
}

// Mission 12 — Classroom Toolkit

export type ClassroomToolkitType =
  | 'routine_entree'
  | 'routine_sortie'
  | 'regles_collaboration'
  | 'roles_groupe'
  | 'cartes_roles'
  | 'consignes_ateliers'
  | 'guide_niveau_bruit'
  | 'procedure_termine'
  | 'affichage_objectif'
  | 'criteres_reussite'
  | 'affichage_vocabulaire'
  | 'affiche_sequence'
  | 'stations'
  | 'procedures_materiel'
  | 'routines_numeriques'

export type ClassroomToolkitTemplate = {
  id:                string
  type:              ClassroomToolkitType
  nom:               string
  description?:      string
  champs_requis?:    string[]
  champs_optionnels?: string[]
  langue:            string
}

// Mission 13 — Group Work Intelligence

export type GroupWorkType =
  | 'dyade'
  | 'trio'
  | 'groupe_4'
  | 'groupe_5'
  | 'think_pair_share'
  | 'jigsaw'
  | 'stations'
  | 'groupes_flexibles'
  | 'temporaire'

export type GroupHeterogeneite = 'heterogene' | 'homogene' | 'mixte'

export type GroupWorkModel = {
  id?:                   string
  type:                  GroupWorkType
  objectif_pedagogique:  string
  heterogeneite?:        GroupHeterogeneite
  roles?:                string[]
  duree_minutes?:        number
  tache?:                string
  // Toujours fournie — l'enseignant doit valider
  justification?:        string
  nb_groupes?:           number
  considerations?:       string[]
}
