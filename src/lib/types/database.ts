// ─── KlassIA+ — Database types ────────────────────────────────────────────────
// Generated from supabase/schema.sql — update when schema changes

export type StatutLecon =
  | 'brouillon' | 'prete' | 'en_cours' | 'enseignee'
  | 'complete'  | 'a_revoir' | 'archivee'

export type ForfaitType = 'gratuit' | 'pro' | 'pro_plus' | 'institution'

export type MenuDebloque =
  | 'accueil' | 'classes' | 'preparer' | 'studio'
  | 'enseigner' | 'suivre' | 'communaute' | 'ressources'
  | 'outils' | 'forfaits'

export type TypeDocument = 'plan_sequence' | 'plan_lecon' | 'lecon_complete'

export type TypeCompte = 'enseignant' | 'direction' | 'admin' | 'etudiant' | 'institution'

export type Langue = 'fr' | 'en'

// ─── Utilisateur ──────────────────────────────────────────────────────────────

export type ProfilIA = {
  style_peda?: string
  ton_ia?: 'professionnel' | 'informel' | 'dynamique'
  inclure_differentiation?: boolean
  inclure_evaluation?: boolean
  inclure_vocabulaire?: boolean
  inclure_perspective_autochtone?: boolean
  instructions_perso?: string
  niveaux?: string[]
  matieres?: string[]
  duree_typique?: number
  groupes_typiques?: number
  langue_ia?: Langue
}

export type Utilisateur = {
  id: string
  user_id: string
  prenom: string
  nom: string
  email?: string
  ecole?: string
  telephone?: string
  ville?: string
  province?: string
  bio?: string
  type_compte: TypeCompte
  langue: Langue
  matiere?: string
  niveau_enseignement?: string
  annees_exp?: number
  certifications?: string[]
  style_enseignement?: string
  instructions_perso?: string
  ia_config?: Record<string, unknown>
  profil_ia?: ProfilIA
  onboarding_complete: boolean
  // ── Champs migration 007 ──────────────────────────────────────────────────
  is_admin?: boolean
  onboarding_etape?: number
  onboarding_complete_v2?: boolean
  gabarit_lecon_url?: string
  gabarit_lecon_analyse?: string
  menus_debloque?: MenuDebloque[]
  forfait?: ForfaitType
  created_at: string
}

// ─── Classe ───────────────────────────────────────────────────────────────────

export type Classe = {
  id: string
  enseignant_id: string
  nom: string
  niveau: string
  matiere: string
  nombre_eleves: number
  couleur: string
  langue: Langue
  annee_scolaire: string
  curriculum_charge: boolean
  created_at: string
}

// ─── Leçon ────────────────────────────────────────────────────────────────────

export type SchemaSVG = {
  id: string
  titre: string
  categorie: string
  svg_content: string
  telechargeable: boolean
}

export type ActiviteContenu = {
  id: string
  titre: string
  type: string
  description: string
  duree_minutes?: number
  materiel?: string[]
  differentiation?: Record<string, string>
}

export type Exercice = {
  id: string
  enonce: string
  type: 'calcul' | 'redaction' | 'qcm' | 'vrai_faux' | 'appariement'
  reponse_corrigee?: string
  indices?: string[]
}

export type ContenuLecon = {
  // Communs
  intention?: string
  objectifs?: string | string[]  // string = HTML (RichEditor), string[] = ancien format
  materiel?: string | string[]
  criteres?: string | string[]
  vocabulaire?: string | string[]
  differentiation?: string
  notes_enseignant?: string

  // Plan de séquence
  nb_lecons?: number
  fil_conducteur?: string
  evaluation_sommative_prevue?: string
  lecons_liees?: string[]

  // Résultats d'apprentissage (Alberta / Saskatchewan)
  rag?: string
  ras?: string
  rat?: string

  // Ontario
  attentes_curriculum?: string

  // Québec
  competences_disciplinaires?: string[]
  competences_transversales?: string[]

  // Intégration langue
  integration_langue?: {
    vocabulaire?: string
    oral?: string
    ecrit?: string
    visuel?: string
  }

  // Évaluation
  evaluation_formative?: string
  evaluation_sommative?: string
  perspective_autochtone?: string

  // Différenciation 3 niveaux
  differentiation_universelle?: string
  differentiation_ciblee?: string
  differentiation_specialisee?: string

  // Les 3 moments (format legacy — strings HTML)
  avant_amorce?: string
  avant_duree?: string
  pendant_modelisation?: string
  pendant_pratique_guidee?: string
  pendant_pratique_autonome?: string
  pendant_duree?: string
  apres_cloture?: string
  apres_billet?: string
  apres_duree?: string

  // Les 3 moments (format structuré)
  avant?: {
    temps_prevu?: number
    amorce?: string
    connexion?: string
    materiel?: string[]
  }
  pendant?: {
    temps_prevu?: number
    modelisation?: string
    pratique_guidee?: string
    pratique_autonome?: string
    materiel?: string[]
  }
  apres?: {
    temps_prevu?: number
    retour?: string
    evaluation?: string
    materiel?: string[]
  }

  // Contenu riche (leçon complète)
  schemas_svg?: SchemaSVG[]
  activites?: ActiviteContenu[]
  exercices?: Exercice[]
  billet_sortie?: string
  ressources_liees?: string[]
}

export type Lecon = {
  id: string
  classe_id: string
  unite_id?: string
  enseignant_id?: string
  numero: number
  titre: string
  sujet?: string
  date_prevue?: string
  duree_minutes: number
  statut: StatutLecon
  type_document?: TypeDocument
  contenu_json: ContenuLecon
  created_at: string
  updated_at: string
}

// ─── Programme annuel ─────────────────────────────────────────────────────────

export type LeconProgramme = {
  numero: number
  titre: string
  sujet: string
  duree_minutes: number
  type: 'introduction' | 'developpement' | 'evaluation' | 'synthese'
  statut?: StatutLecon
  lecon_id?: string
}

export type Unite = {
  numero: number
  titre: string
  theme?: string
  semaine_debut: number
  semaine_fin: number
  objectifs: string[]
  competences?: string[]
  lecons: LeconProgramme[]
  jours_feries?: string[]
  celebrations?: string[]
}

export type ContenuProgramme = {
  titre: string
  nb_semaines: number
  source_curriculum: string
  unites: Unite[]
}

export type ProgrammeAnnuel = {
  id: string
  classe_id: string
  titre: string
  nb_semaines: number
  contenu_json: ContenuProgramme
  genere_par_ia: boolean
  created_at: string
}

// ─── Génération IA ────────────────────────────────────────────────────────────

export type GenerationIA = {
  id: string
  enseignant_id: string
  classe_id?: string
  type_contenu: string
  contenu_genere: string
  langue: string
  sauvegarde: boolean
  created_at: string
}

// ─── Ressource ────────────────────────────────────────────────────────────────

export type TypeRessource = 'document' | 'lien' | 'video' | 'image' | 'audio' | 'autre'

export type Ressource = {
  id: string
  enseignant_id: string
  classe_id?: string
  titre: string
  type: TypeRessource
  url?: string
  description?: string
  tags?: string[]
  storage_path?: string
  created_at: string
}

// ─── Sondage ──────────────────────────────────────────────────────────────────

export type Sondage = {
  id: string
  enseignant_id: string
  code: string
  question: string
  type: 'texte' | 'choix_multiple'
  options: Record<string, unknown>
  statut: 'ouvert' | 'ferme'
  created_at: string
}

export type ReponseSondage = {
  id: string
  sondage_id: string
  reponse: string
  created_at: string
}

// ─── Communication ────────────────────────────────────────────────────────────

export type TypeCommunication =
  | 'note_parents' | 'annonce_classe' | 'rappel' | 'compte_rendu'
  | 'note' | 'rapport' | 'convocation' | 'bulletin' | 'autre'

export type Communication = {
  id: string
  enseignant_id: string
  classe_id?: string
  type: TypeCommunication
  sujet: string
  contenu?: string
  destinataires?: string
  date_envoi?: string
  statut: string
  created_at: string
}

// ─── Calendrier ───────────────────────────────────────────────────────────────

export type JourSemaine = 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi' | 'Dimanche'

export type CoursSemaine = {
  id: string
  enseignant_id: string
  classe_id?: string
  nom_classe: string
  couleur: string
  jour: JourSemaine
  heure_debut: string
  heure_fin: string
  salle?: string
  note?: string
  created_at: string
}

export type NoteAgenda = {
  id: string
  enseignant_id: string
  date: string
  type: 'note' | 'rappel' | 'evenement'
  titre: string
  couleur: string
  created_at: string
}

// ─── Dossiers & fichiers classe (legacy) ─────────────────────────────────────

export type TypeDossierClasse =
  | 'curriculum' | 'programme' | 'sequences' | 'plans'
  | 'lecons'     | 'activites' | 'eleves'    | 'ressources'
  | 'salle_classe' | 'custom'

export type DossierClasse = {
  id: string
  classe_id: string
  enseignant_id: string
  parent_id?: string
  nom: string
  type: TypeDossierClasse
  ordre: number
  created_at: string
  enfants?: DossierClasse[]
  fichiers?: FichierClasse[]
}

// ─── Dossiers système ─────────────────────────────────────────────────────────

export type TypeDossier =
  | 'preparation' | 'curriculum' | 'plan_annuel' | 'plans_lecons'
  | 'sequence'    | 'lecons'     | 'lecon'       | 'evaluations_sommatives'
  | 'eleves'      | 'ressources' | 'administration' | 'parents'
  | 'evenements'  | 'custom'

export type TypeFichier =
  | 'plan_lecon' | 'lecon_complete' | 'sequence'    | 'curriculum'
  | 'activite'   | 'ressource'      | 'document'    | 'image'
  | 'audio'      | 'video'          | 'lien'        | 'gabarit'
  | 'evaluation' | 'autre'

export type DossierSysteme = {
  id: string
  enseignant_id: string
  classe_id?: string
  parent_id?: string
  nom: string
  type: TypeDossier
  ordre: number
  icone?: string
  couleur?: string
  created_at: string
  enfants?: DossierSysteme[]
  fichiers?: FichierDossier[]
  nb_fichiers?: number
}

export type FichierDossier = {
  id: string
  dossier_id: string
  enseignant_id: string
  classe_id?: string
  nom: string
  type_fichier: TypeFichier
  url?: string
  storage_path?: string
  taille_bytes?: number
  statut: 'brouillon' | 'valide' | 'enseigne' | 'archive'
  lecon_id?: string
  activite_id?: string
  tags: string[]
  description?: string
  indexe_studio_ia: boolean
  created_at: string
  updated_at: string
}

// ─── Calendrier enrichi ───────────────────────────────────────────────────────

export type TypeEvenement = 'lecon' | 'evaluation' | 'sortie' | 'reunion' | 'conge' | 'autre'

export type EvenementCalendrier = {
  id: string
  enseignant_id: string
  classe_id?: string
  titre: string
  description?: string
  date_debut: string
  date_fin?: string
  heure_debut?: string
  heure_fin?: string
  type: TypeEvenement
  couleur: string
  lecon_id?: string
  note_ia?: string
  rappel: boolean
  created_at: string
}

// ─── Studio IA ────────────────────────────────────────────────────────────────

export type TypeMemoireIA = 'gabarit' | 'contexte' | 'feedback' | 'preference'

export type StudioIAMemoire = {
  id: string
  enseignant_id: string
  classe_id?: string
  cle: string
  contenu: Record<string, unknown>
  type: TypeMemoireIA
  created_at: string
  updated_at: string
}

export type TypeNoteIA = 'preparation' | 'feedback' | 'observation' | 'suggestion'

export type NoteIA = {
  id: string
  enseignant_id: string
  evenement_id?: string
  lecon_id?: string
  contenu: string
  type: TypeNoteIA
  auto_generee: boolean
  created_at: string
}

export type FichierClasse = {
  id: string
  dossier_id: string
  classe_id: string
  enseignant_id: string
  nom: string
  type_fichier?: string
  url?: string
  storage_path?: string
  taille_bytes?: number
  lecon_id?: string
  activite_id?: string
  indexe_studio_ia: boolean
  classe_cible: 'specifique' | 'generale'
  created_at: string
}

// ─── Communauté ───────────────────────────────────────────────────────────────

export type GroupeCommunaute = {
  id: string
  nom: string
  description?: string
  matiere?: string
  niveau?: string
  province?: string
  type: 'automatique' | 'manuel'
  nb_membres: number
  created_at: string
}

export type MessageCommunaute = {
  id: string
  groupe_id: string
  enseignant_id: string
  contenu?: string
  type: 'texte' | 'fichier' | 'plan_lecon' | 'lecon' | 'ressource'
  fichier_url?: string
  fichier_nom?: string
  fichier_taille?: number
  lecon_id?: string
  created_at: string
  enseignant?: { prenom: string; nom: string; ecole?: string }
}

export type PartageCommune = {
  id: string
  enseignant_id: string
  type: 'plan_lecon' | 'lecon_complete' | 'ressource' | 'progression' | 'activite'
  titre: string
  description?: string
  matiere?: string
  niveau?: string
  province?: string
  curriculum?: string
  contenu_json?: Record<string, unknown>
  fichier_url?: string
  nb_telechargements: number
  note_moyenne: number
  est_verifie: boolean
  created_at: string
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type TypeNotification =
  | 'message' | 'partage' | 'telechargement'
  | 'badge'   | 'rappel'  | 'lecon_prete'

export type Notification = {
  id: string
  enseignant_id: string
  type: TypeNotification
  titre: string
  contenu?: string
  lien?: string
  est_lue: boolean
  created_at: string
}

// ─── Élèves ───────────────────────────────────────────────────────────────────

export type ProfilTypeEleve = 'standard' | 'difficulte' | 'avance' | 'pei' | 'autre'

export type Eleve = {
  id: string
  classe_id: string
  enseignant_id: string
  prenom: string
  nom: string
  profil_type: ProfilTypeEleve
  besoins?: string[]
  notes_enseignant?: string
  contact_parent?: string
  created_at: string
  updated_at: string
}

// ─── Activités (table DB) ─────────────────────────────────────────────────────

export type TypeActivite =
  | 'formative' | 'sommative' | 'groupe'
  | 'quiz'      | 'nuage_mots' | 'devoir' | 'autre'

export type Activite = {
  id: string
  classe_id: string
  lecon_id?: string
  enseignant_id: string
  titre: string
  type: TypeActivite
  contenu_json: Record<string, unknown>
  version_normale?: string
  version_difficulte?: string
  version_avance?: string
  version_pei?: string
  quiz_id?: string
  diffuse_quiz_live: boolean
  statut: 'brouillon' | 'validee' | 'diffusee' | 'archivee'
  date_prevue?: string
  created_at: string
  updated_at: string
}

// ─── Rappels classe ───────────────────────────────────────────────────────────

export type RappelClasse = {
  id: string
  classe_id: string
  enseignant_id: string
  eleve_id?: string
  titre: string
  description?: string
  type: 'note' | 'eleve' | 'evaluation' | 'echeance' | 'evenement'
  date_rappel?: string
  est_complete: boolean
  created_at: string
}

// ─── Favoris enseignant ───────────────────────────────────────────────────────

export type FavoriEnseignant = {
  id: string
  enseignant_id: string
  type: 'lecon' | 'plan' | 'dossier' | 'classe' | 'activite' | 'ressource'
  reference_id: string
  titre: string
  icone?: string
  url?: string
  ordre: number
  created_at: string
}

// ─── Tâches enseignant ────────────────────────────────────────────────────────

export type TacheEnseignant = {
  id: string
  enseignant_id: string
  classe_id?: string
  lecon_id?: string
  titre: string
  type: 'manuelle' | 'imprimer' | 'corriger' |
        'contacter_parent' | 'valider_plan' |
        'preparer_lecon' | 'rappel'
  date_echeance?: string
  est_complete: boolean
  auto_generee: boolean
  created_at: string
}

// ─── Sessions outils ──────────────────────────────────────────────────────────

export type SessionOutil = {
  id: string
  enseignant_id: string
  classe_id?: string
  lecon_id?: string
  type_outil: 'timer' | 'sondage' | 'quiz' | 'tableau' | 'tbi'
  statut: 'actif' | 'pause' | 'termine'
  config_json: Record<string, unknown>
  started_at: string
  ended_at?: string
}

// ─── Statistiques plateforme ──────────────────────────────────────────────────

export type StatsPlateforme = {
  id: string
  date: string
  nb_inscriptions: number
  nb_connexions: number
  nb_generations_ia: number
  cout_api_usd: number
  nb_lecons_generees: number
  nb_quiz_lances: number
  nb_messages_communaute: number
  nb_conversions_pro: number
  nb_conversions_proplus: number
  mrr_usd: number
  created_at: string
}
