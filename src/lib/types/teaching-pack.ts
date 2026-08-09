// ─── Teaching Pack — types domaine ────────────────────────────────────────────
// SPIE-BETA-01 : Parcours "Construire mon année scolaire"

export type TeachingPackStatut =
  | 'configuration'
  | 'curriculum_en_analyse'
  | 'pret_a_planifier'
  | 'generation_en_cours'
  | 'partiellement_genere'
  | 'pret'
  | 'erreur'
  | 'archive'

export type CurriculumSource = 'televerse' | 'officiel'

// ─── Calendrier scolaire ──────────────────────────────────────────────────────

export type CalendarEvent = {
  titre: string
  date_debut: string // ISO date 'YYYY-MM-DD'
  date_fin?: string
}

export type SchoolCalendar = {
  date_debut: string        // '2026-09-02'
  date_fin: string          // '2027-06-25'
  jours_enseignement: number[] // 1=lundi … 5=vendredi
  periodes_par_semaine: number
  duree_periode_minutes: number
  vacances_noel: CalendarEvent
  relache_printemps: CalendarEvent
  journees_pedagogiques: CalendarEvent[]
  jours_feries: CalendarEvent[]
  examens: CalendarEvent[]
  semaines_tampon: number
}

// ─── Gabarits ─────────────────────────────────────────────────────────────────

export type GabaritType = 'scorgia_alberta' | 'custom' | 'generique'

export type PackGabarits = {
  plan_annuel: GabaritType
  plan_sequence: GabaritType
  plan_lecon: GabaritType
  gabarit_lecon_url?: string // si type = 'custom'
}

// ─── Syllabus ─────────────────────────────────────────────────────────────────

export type PackSyllabus = {
  titre_cours: string
  niveau: string
  matiere: string
  enseignant?: string
  description?: string
  grandes_idees: string[]
  resultats_apprentissage: string[]
  methodes_pedagogiques: string[]
  methodes_evaluation: string[]
  ressources_suggeres?: string[]
  attentes?: string[]
  normes_reference?: string[]
  version: string
  created_at: string
}

// ─── Contenu du pack (JSON persisté) ─────────────────────────────────────────

export type TeachingPackContenu = {
  syllabus?: PackSyllabus
  nb_unites?: number
  nb_lecons_planifiees?: number
  nb_lecons_generees?: number
  premiere_lecon_complete?: boolean
  premiere_lecon_id?: string
  premiere_lecon_titre?: string
  premier_quiz_id?: string
  etapes_completees?: BuildYearStep[]
}

// ─── Pack complet (DB row) ────────────────────────────────────────────────────

export type TeachingPack = {
  id: string
  enseignant_id: string
  classe_id: string
  nom: string
  statut: TeachingPackStatut
  province?: string
  pays: string
  juridiction?: string
  langue: string
  annee_scolaire?: string
  curriculum_source?: CurriculumSource
  curriculum_officiel?: string
  curriculum_contenu?: string
  programme_annuel_id?: string
  calendrier_json?: SchoolCalendar
  gabarits_json?: PackGabarits
  contenu_json?: TeachingPackContenu
  error_message?: string
  // SPIE-BETA-03 — leçon détaillée (migration 038)
  lecon_detaillee_id?: string
  lecon_detaillee_statut?: 'non_generee' | 'en_cours' | 'generee' | 'erreur'
  created_at: string
  updated_at: string
}

// ─── Pipeline SSE ─────────────────────────────────────────────────────────────

export type BuildYearStep =
  | 'validation'
  | 'curriculum'
  | 'syllabus'
  | 'programme_annuel'
  | 'sequences'
  | 'plans_lecon'
  | 'premiere_lecon'
  | 'quiz'
  | 'sauvegarde'
  | 'indexation'
  | 'termine'
  | 'erreur'

export type BuildYearStepStatut = 'en_attente' | 'en_cours' | 'termine' | 'erreur' | 'ignore'

export type BuildYearEvent = {
  step: BuildYearStep
  statut: BuildYearStepStatut
  message: string
  detail?: string
  teaching_pack_id?: string
  programme_annuel_id?: string
  progress?: number // 0-100
}

// ─── Input wizard ─────────────────────────────────────────────────────────────

export type BuildYearWizardInput = {
  // Étape 1 — Contexte
  classe_id: string
  province: string
  pays: string
  juridiction?: string
  annee_scolaire: string
  niveau: string
  matiere: string
  langue: string

  // Étape 2 — Curriculum
  curriculum_source: CurriculumSource
  curriculum_officiel?: string
  curriculum_fichier_contenu?: string // texte extrait
  curriculum_fichier_nom?: string

  // Étape 3 — Gabarits
  gabarits: PackGabarits

  // Étape 4 — Calendrier
  calendrier: SchoolCalendar
}

// ─── Curriculum officiel disponible ──────────────────────────────────────────

export type OfficialCurriculum = {
  id: string
  province: string
  matiere: string
  niveau: string
  langue: string
  version: string
  date: string
  source: string
  statut_validation: 'valide' | 'en_revue' | 'brouillon'
  description: string
}

// ─── Traçabilité des sources ──────────────────────────────────────────────────

export type SourceStatut =
  | 'televerse_utilisateur'
  | 'reference_officielle_verifiee'
  | 'reference_scorgia_en_validation'
  | 'donnee_non_verifiee'
  | 'archivee'

export type SourceTraceabilite = {
  organisme?: string
  titre?: string
  url?: string
  reference?: string
  version?: string
  date?: string
  langue?: string
  date_consultation?: string
  statut: SourceStatut
  empreinte?: string
  nom_fichier?: string
  taille_octets?: number
}

// ─── Versionnement des documents ──────────────────────────────────────────────

export type PackDocumentType =
  | 'syllabus'
  | 'plan_annuel'
  | 'sequence'
  | 'plan_lecon'
  | 'activite'
  | 'quiz'
  | 'evaluation'

export type PackVersion = {
  id: string
  teaching_pack_id: string
  document_type: PackDocumentType
  document_id?: string
  version_numero: number
  label?: string
  contenu_json: unknown
  modifie_par: 'ia' | 'utilisateur'
  created_at: string
  notes?: string
}

// ─── Quality Gate ─────────────────────────────────────────────────────────────

export type QualiteNiveau = 'erreur_bloquante' | 'avertissement' | 'recommandation' | 'valide'

export type QualiteItem = {
  code: string
  niveau: QualiteNiveau
  message: string
  detail?: string
  source?: string
  element?: string
}

export type QualityGateResultat = {
  document_type: PackDocumentType
  document_id?: string
  items: QualiteItem[]
  erreurs_bloquantes: number
  avertissements: number
  recommandations: number
  elements_valides: number
  peut_marquer_pret: boolean
  sources_utilisees: string[]
  generated_at: string
}

// ─── Alberta Teaching Pack ────────────────────────────────────────────────────

export type AlbertaPackMetadata = {
  id: string
  nom: string
  nom_legal: string
  province: string
  pays: string
  langue: string
  version: string
  statut: 'beta' | 'valide' | 'archive'
  date_publication: string
  date_mise_a_jour: string
  auteur: string
  description: string
  niveaux_compatibles: string[]
  matieres_compatibles: string[]
  sources: SourceTraceabilite[]
  limites: string[]
  gabarits_inclus: string[]
  normes_professionnelles: string[]
  avertissement_legal: string
}

// ─── Gabarit structuré ────────────────────────────────────────────────────────

export type GabaritSection = {
  id: string
  titre: string
  description?: string
  obligatoire: boolean
  champs: GabaritChamp[]
  sous_sections?: GabaritSection[]
}

export type GabaritChamp = {
  id: string
  label: string
  type: 'texte' | 'liste' | 'date' | 'nombre' | 'booleeen' | 'markdown'
  obligatoire: boolean
  placeholder?: string
  aide?: string
  objet_spie?: string
}

export type GabaritStructure = {
  id: string
  nom: string
  version: string
  province: string
  langue: string
  type: PackDocumentType
  sections: GabaritSection[]
  metadata: {
    auteur: string
    date: string
    description: string
  }
}

// ─── Mapping gabarit utilisateur ─────────────────────────────────────────────

export type MappingStatut = 'reconnu' | 'manquant' | 'supplementaire' | 'incompris' | 'ignore'

export type MappingLigne = {
  section_gabarit_utilisateur: string
  objet_spie_associe?: string
  statut: MappingStatut
  valeur_detectee?: string
}

export type GabaritMappingResult = {
  sections_reconnues: MappingLigne[]
  sections_manquantes: string[]
  sections_supplementaires: string[]
  compatibilite_spie: number
  avertissements: string[]
  peut_utiliser: boolean
}

// ─── Normes professionnelles ──────────────────────────────────────────────────

export type NormeProfessionnelle = {
  id: string
  standard: string
  competence: string
  indicateur: string
  elements_plan_lies: string[]
  justification: string
  source: string
  statut_verification: 'verifie' | 'indicatif' | 'non_verifie'
  avertissement_legal: string
}
