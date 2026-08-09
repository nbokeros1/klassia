// ─── SPIE-BETA-03 — DetailedLesson ───────────────────────────────────────────
// Objet central de la leçon détaillée. Contient TOUT le matériel pédagogique
// de la première leçon générée, séparé en sections indépendantes.
//
// RÈGLES ABSOLUES :
// - Le corrigé n'est jamais transmis aux élèves
// - Les notes privées ne sont jamais exportées ni projetées
// - Aucune donnée d'un autre enseignant ne peut y figurer
// - Ce type ne doit jamais être utilisé pour stocker des données personnelles d'élèves

export type LessonGenerationStep =
  | 'validation'
  | 'resultats_curriculaires'
  | 'objectifs'
  | 'deroulement'
  | 'activites'
  | 'contenu'
  | 'evaluation_formative'
  | 'quiz'
  | 'corrige'
  | 'differentiation'
  | 'verification_temps'
  | 'quality_gate'
  | 'persistance'
  | 'termine'
  | 'erreur'

export type LessonGenerationEvent = {
  step: LessonGenerationStep
  statut: 'en_cours' | 'termine' | 'erreur' | 'ignore'
  message: string
  progress: number
  data?: Partial<DetailedLesson>
  fichier_id?: string
}

export type LessonGenerationState = {
  teaching_pack_id: string
  fichier_id?: string
  etapes_completees: LessonGenerationStep[]
  etape_courante?: LessonGenerationStep
  nb_reprises: number
  modele_ia: string
  erreurs: string[]
  duree_totale_ms?: number
  version: number
}

// ─── Alignement curriculaire ──────────────────────────────────────────────────

export type CurriculumAlignment = {
  rag: string[]
  ras: string[]
  competences?: string[]
  lien_lecon_precedente?: string
  lien_lecon_suivante?: string
}

// ─── Objectif d'apprentissage ─────────────────────────────────────────────────

export type LessonObjective = {
  id: string
  enonce: string
  critere_reussite: string
  taxonomy?: 'memoriser' | 'comprendre' | 'appliquer' | 'analyser' | 'evaluer' | 'creer'
}

// ─── Phases d'enseignement (pour Enseigner) ───────────────────────────────────

export type TeachingPhaseElement = {
  titre: string
  contenu: string
  duree_minutes?: number
}

export type TeachingPhase = {
  phase: 'avant' | 'pendant' | 'apres'
  label: string
  duree_minutes: number
  elements: TeachingPhaseElement[]
}

// ─── Sections de contenu pédagogique ─────────────────────────────────────────

export type LessonContentSectionType =
  | 'explication'
  | 'definition'
  | 'exemple'
  | 'analogie'
  | 'erreur_frequente'
  | 'question_comprehension'
  | 'synthese'
  | 'vocabulaire'

export type LessonContentSection = {
  id: string
  type: LessonContentSectionType
  titre?: string
  contenu: string
  duree_estimee_minutes?: number
}

// ─── Activité prête à utiliser ────────────────────────────────────────────────

export type ActivityType =
  | 'activation'
  | 'demonstration'
  | 'pratique_guidee'
  | 'pratique_autonome'
  | 'dyade'
  | 'equipe'
  | 'discussion'
  | 'manipulation'
  | 'resolution_probleme'
  | 'mini_evaluation'
  | 'synthese'

export type DetailedActivity = {
  id: string
  titre: string
  intention_pedagogique: string
  type: ActivityType
  duree_minutes: number
  taille_groupe: 'individuel' | 'dyade' | 'petits_groupes' | 'classe_entiere'
  materiel?: string[]
  consignes_enseignant: string
  consignes_eleves: string
  etapes: string[]
  resultat_attendu: string
  differentiation?: {
    soutien?: string
    enrichissement?: string
  }
  criteres_reussite: string[]
  methode_verification: string
  alternative_courte?: string
  alternative_sans_tech?: string
  statut: 'disponible' | 'optionnelle'
  lien_objectif_id?: string
  ras_lie?: string
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export type DetailedQuizQuestion = {
  id: string
  ordre: number
  type: 'qcm' | 'vrai_faux' | 'reponse_courte'
  enonce: string
  options?: string[]
  bonne_reponse: string
  explication: string
  points: number
  duree_secondes: number
  ras_lie?: string
  difficulte?: 'facile' | 'moyen' | 'difficile'
}

export type DetailedQuiz = {
  titre: string
  objectif: string
  duree_estimee_minutes: number
  instructions: string
  questions: DetailedQuizQuestion[]
  bareme_total: number
  criteres_reussite: string
}

// ─── Corrigé (enseignant uniquement — jamais projeté) ─────────────────────────

export type AnswerKeyItem = {
  question_id: string
  reponse_attendue: string
  justification: string
  erreurs_frequentes: string[]
  retroaction_courte: string
  piste_remediation?: string
}

// ─── Différenciation ──────────────────────────────────────────────────────────

export type DifferentiationLevel = {
  type: 'soutien' | 'adaptation' | 'enrichissement'
  description: string
  consignes_modifiees?: string
  materiel_alternatif?: string
  reduction_charge?: string
  extension?: string
}

// ─── Évaluation formative ─────────────────────────────────────────────────────

export type FormativeEvaluation = {
  methode: string
  criteres: string[]
  preuves_attendues: string[]
  retroaction_possible: string
}

// ─── Préparation ─────────────────────────────────────────────────────────────

export type LessonPreparation = {
  prerequis?: string[]
  vocabulaire_cle?: string[]
  materiel?: string[]
  ressources?: string[]
  difficultes_anticipees?: string[]
  preparation_enseignant?: string
}

// ─── Réflexion (privée) ───────────────────────────────────────────────────────

export type LessonReflection = {
  notes_enseignant?: string
  observations?: string
  ajustements_futurs?: string
}

// ─── Vérification du temps ────────────────────────────────────────────────────

export type TimeVerification = {
  duree_planifiee_minutes: number
  duree_activites_minutes: number
  duree_quiz_minutes: number
  duree_totale_estimee_minutes: number
  marge_minutes: number
  realiste: boolean
  avertissement?: string
}

// ─── DetailedLesson — objet principal ────────────────────────────────────────

export type DetailedLessonStatut =
  | 'generation'
  | 'brouillon'
  | 'revise'
  | 'pret'
  | 'enseigne'

export type DetailedLesson = {
  // Identification
  id: string
  titre: string
  classe_id: string
  teaching_pack_id: string
  niveau: string
  matiere: string
  langue: 'fr' | 'en'
  province?: string
  duree_minutes: number
  position_sequence: number
  position_annuel: number
  version: number
  statut: DetailedLessonStatut
  generated_at: string
  gabarit_id?: string

  // Pédagogique
  alignment: CurriculumAlignment
  objectifs: LessonObjective[]
  preparation: LessonPreparation

  // Enseignement
  phases: TeachingPhase[]
  sections_contenu: LessonContentSection[]
  activites: DetailedActivity[]

  // Évaluation
  quiz: DetailedQuiz
  corrige: AnswerKeyItem[]
  evaluation_formative: FormativeEvaluation

  // Différenciation et inclusion
  differentiation: DifferentiationLevel[]

  // Vérification du temps
  time_verification: TimeVerification

  // Réflexion (privée — jamais exportée ni projetée)
  reflexion?: LessonReflection

  // Qualité
  qualite_json?: {
    peut_marquer_pret: boolean
    erreurs_bloquantes: number
    avertissements: number
    recommandations: number
    elements_valides: number
    items: { code: string; niveau: string; message: string }[]
  }

  // Génération
  generation_state?: LessonGenerationState
}

// ─── Payload de création d'une leçon dans la route lesson-engine ─────────────

export type LessonEngineInput = {
  teaching_pack_id: string
  forcer_regeneration?: boolean
}

// ─── Payload de régénération ciblée ──────────────────────────────────────────

export type LessonRegenerateTarget =
  | 'objectifs'
  | 'phases'
  | 'contenu'
  | 'activites'
  | 'quiz'
  | 'corrige'
  | 'differentiation'
  | 'evaluation_formative'

export type LessonRegenerateInput = {
  fichier_id: string
  target: LessonRegenerateTarget
  instructions_supplementaires?: string
}
