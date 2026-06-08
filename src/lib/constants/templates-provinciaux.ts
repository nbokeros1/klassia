// ─── Templates provinciaux — structure des plans de leçon ────────────────────
// Chaque province a son propre vocabulaire et ses propres champs obligatoires.

export type TypeChamp = 'text' | 'textarea' | 'richtext' | 'duree' | 'liste' | 'section'

export type ChampTemplate = {
  id: string
  label: string
  type: TypeChamp
  obligatoire: boolean
  placeholder?: string
  aide?: string
}

export type TemplateProvincial = {
  id: string
  province: string
  langue_defaut: 'fr' | 'en'
  label_avant: string
  label_pendant: string
  label_apres: string
  champs_entete: ChampTemplate[]
  champs_cadre: ChampTemplate[]
  champs_avant: ChampTemplate[]
  champs_pendant: ChampTemplate[]
  champs_apres: ChampTemplate[]
}

// ─── Alberta ──────────────────────────────────────────────────────────────────

const ALBERTA: TemplateProvincial = {
  id: 'alberta', province: 'Alberta', langue_defaut: 'fr',
  label_avant:   'AVANT — Préparation / Amorce',
  label_pendant: 'PENDANT — Réalisation',
  label_apres:   'APRÈS — Intégration / Évaluation',
  champs_entete: [
    { id: 'nom_enseignant', label: 'Nom',            type: 'text',  obligatoire: true },
    { id: 'niveau',         label: 'Niveau scolaire', type: 'text', obligatoire: true },
    { id: 'matiere',        label: 'Matière',          type: 'text', obligatoire: true },
    { id: 'duree',          label: 'Durée',            type: 'duree',obligatoire: true },
    { id: 'titre',          label: 'Leçon #',          type: 'text', obligatoire: true },
  ],
  champs_cadre: [
    { id: 'rag', label: "Résultat d'apprentissage Général (RAG)", type: 'textarea', obligatoire: true,
      aide: "L'élève sera capable de..." },
    { id: 'ras', label: "Résultat d'apprentissage Spécifique (RAS)", type: 'textarea', obligatoire: true,
      aide: "Pour vérifier l'organisation..." },
    { id: 'intention', label: 'Intention pédagogique', type: 'textarea', obligatoire: true,
      aide: "Les élèves comprendront comment..." },
    { id: 'integration_langue', label: 'Intégration de la langue', type: 'richtext', obligatoire: false,
      aide: "Vocabulaire / Oral / Écrit / Visuel" },
    { id: 'evaluation', label: 'Évaluation', type: 'richtext', obligatoire: true,
      aide: "Formative + Sommative" },
    { id: 'perspective_autochtone', label: 'Intégration de la perspective autochtone', type: 'textarea', obligatoire: false },
    { id: 'differentiation', label: 'Différenciation pédagogique', type: 'richtext', obligatoire: false,
      aide: "Universel / Ciblé / Spécialisé" },
  ],
  champs_avant: [
    { id: 'avant_temps',   label: 'Temps prévu', type: 'duree',    obligatoire: false },
    { id: 'avant_amorce',  label: 'Connexion et connaissances antérieures / Amorce', type: 'richtext', obligatoire: true,
      aide: "Comment capter l'attention, activer les savoirs antérieurs" },
    { id: 'avant_materiel',label: 'Matériaux / Ressources', type: 'liste', obligatoire: false },
  ],
  champs_pendant: [
    { id: 'pendant_temps',       label: 'Temps prévu',      type: 'duree',    obligatoire: false },
    { id: 'pendant_modelisation',label: 'Modélisation',      type: 'richtext', obligatoire: true,
      aide: "L'enseignant démontre, explique, modélise" },
    { id: 'pendant_guidee',      label: 'Pratique guidée',   type: 'richtext', obligatoire: true,
      aide: "Exercices en groupe, en binôme, accompagnement" },
    { id: 'pendant_autonome',    label: 'Pratique autonome', type: 'richtext', obligatoire: false,
      aide: "Travail individuel, mini-texte, exercices seul" },
    { id: 'pendant_materiel',    label: 'Matériaux / Ressources', type: 'liste', obligatoire: false },
  ],
  champs_apres: [
    { id: 'apres_temps',   label: 'Temps prévu', type: 'duree', obligatoire: false },
    { id: 'apres_retour',  label: 'Retour sur les apprentissages / Clôture', type: 'richtext', obligatoire: true,
      aide: "Objectivation, synthèse, auto-évaluation" },
    { id: 'apres_materiel',label: 'Matériaux / Ressources', type: 'liste', obligatoire: false },
  ],
}

// ─── Ontario ──────────────────────────────────────────────────────────────────

const ONTARIO: TemplateProvincial = {
  id: 'ontario', province: 'Ontario', langue_defaut: 'fr',
  label_avant:   'Mise en situation (Minds On)',
  label_pendant: 'Déroulement (Action)',
  label_apres:   'Objectivation (Consolidation)',
  champs_entete: [
    { id: 'nom_enseignant', label: 'Enseignant(e)', type: 'text',  obligatoire: true },
    { id: 'niveau',         label: 'Année / Cycle', type: 'text',  obligatoire: true },
    { id: 'matiere',        label: 'Matière',        type: 'text',  obligatoire: true },
    { id: 'duree',          label: 'Durée',          type: 'duree', obligatoire: true },
    { id: 'titre',          label: 'Titre de la leçon', type: 'text', obligatoire: true },
  ],
  champs_cadre: [
    { id: 'attentes_curriculum', label: 'Attentes du curriculum (code)', type: 'text', obligatoire: true,
      aide: "ex: B2.1, C1.3..." },
    { id: 'intention', label: "Intention d'apprentissage", type: 'textarea', obligatoire: true,
      aide: "Nous allons apprendre à..." },
    { id: 'criteres_succes', label: 'Critères de succès', type: 'liste', obligatoire: true,
      aide: "Je saurai que j'ai réussi quand..." },
    { id: 'evaluation', label: "Évaluation (pour/en/de l'apprentissage)", type: 'richtext', obligatoire: true },
    { id: 'accommodements', label: 'Accommodements / PEI', type: 'textarea', obligatoire: false },
    { id: 'psac', label: 'PSAC (pédagogie culturellement adaptée)', type: 'textarea', obligatoire: false },
    { id: 'differentiation', label: 'Différenciation', type: 'richtext', obligatoire: false },
  ],
  champs_avant: [
    { id: 'avant_temps',   label: 'Durée',           type: 'duree',    obligatoire: false },
    { id: 'avant_amorce',  label: 'Mise en situation',type: 'richtext', obligatoire: true,
      aide: "Activer les connaissances antérieures, piquer la curiosité" },
    { id: 'avant_materiel',label: 'Matériel',         type: 'liste',    obligatoire: false },
  ],
  champs_pendant: [
    { id: 'pendant_temps',       label: 'Durée',                     type: 'duree',    obligatoire: false },
    { id: 'pendant_modelisation',label: 'Enseignement explicite / Modélisation', type: 'richtext', obligatoire: true },
    { id: 'pendant_guidee',      label: 'Pratique guidée',           type: 'richtext', obligatoire: true },
    { id: 'pendant_autonome',    label: 'Pratique autonome',         type: 'richtext', obligatoire: false },
    { id: 'pistes_observation',  label: "Pistes d'observation",      type: 'textarea', obligatoire: false },
    { id: 'pendant_materiel',    label: 'Matériel',                  type: 'liste',    obligatoire: false },
  ],
  champs_apres: [
    { id: 'apres_temps',   label: 'Durée',                     type: 'duree',    obligatoire: false },
    { id: 'apres_retour',  label: 'Objectivation / Consolidation', type: 'richtext', obligatoire: true,
      aide: "Retour sur les apprentissages, billet de sortie" },
    { id: 'apres_materiel',label: 'Matériel',                  type: 'liste',    obligatoire: false },
  ],
}

// ─── Québec ───────────────────────────────────────────────────────────────────

const QUEBEC: TemplateProvincial = {
  id: 'quebec', province: 'Québec', langue_defaut: 'fr',
  label_avant:   'Préparation',
  label_pendant: 'Réalisation',
  label_apres:   'Intégration',
  champs_entete: [
    { id: 'nom_enseignant', label: 'Enseignant(e)',         type: 'text',  obligatoire: true },
    { id: 'niveau',         label: 'Niveau',                type: 'text',  obligatoire: true },
    { id: 'matiere',        label: 'Discipline',            type: 'text',  obligatoire: true },
    { id: 'duree',          label: 'Durée',                 type: 'duree', obligatoire: true },
    { id: 'titre',          label: 'Titre de la SAÉ / Leçon', type: 'text', obligatoire: true },
  ],
  champs_cadre: [
    { id: 'competences_disciplinaires', label: 'Compétences disciplinaires (CD)', type: 'liste', obligatoire: true },
    { id: 'competences_transversales',  label: 'Compétences transversales (CT)',  type: 'liste', obligatoire: false },
    { id: 'domaines_formation',         label: 'Domaines généraux de formation',  type: 'text',  obligatoire: false },
    { id: 'intention',       label: 'Intention pédagogique',              type: 'textarea', obligatoire: true },
    { id: 'criteres_evaluation', label: "Critères d'évaluation",          type: 'liste',    obligatoire: true },
    { id: 'evaluation',      label: 'Évaluation formative et sommative',  type: 'richtext', obligatoire: true },
    { id: 'differentiation', label: 'Différenciation',                    type: 'richtext', obligatoire: false },
  ],
  champs_avant: [
    { id: 'avant_temps',   label: 'Durée',                              type: 'duree',    obligatoire: false },
    { id: 'avant_amorce',  label: 'Mise en situation / Activation',     type: 'richtext', obligatoire: true,
      aide: "Déclencher la motivation, activer les savoirs antérieurs" },
    { id: 'avant_materiel',label: 'Matériel',                           type: 'liste',    obligatoire: false },
  ],
  champs_pendant: [
    { id: 'pendant_temps',       label: 'Durée',                            type: 'duree',    obligatoire: false },
    { id: 'pendant_modelisation',label: 'Enseignement / Modelage',          type: 'richtext', obligatoire: true },
    { id: 'pendant_guidee',      label: 'Pratique guidée / Travail équipe', type: 'richtext', obligatoire: true },
    { id: 'pendant_autonome',    label: 'Pratique autonome',                type: 'richtext', obligatoire: false },
    { id: 'pendant_materiel',    label: 'Matériel',                         type: 'liste',    obligatoire: false },
  ],
  champs_apres: [
    { id: 'apres_temps',      label: 'Durée',                          type: 'duree',    obligatoire: false },
    { id: 'apres_retour',     label: 'Objectivation / Retour réflexif',type: 'richtext', obligatoire: true,
      aide: "Prise de conscience des apprentissages réalisés" },
    { id: 'reinvestissement', label: 'Réinvestissement / Transfert',   type: 'textarea', obligatoire: false,
      aide: "Application à d'autres contextes" },
    { id: 'apres_materiel',   label: 'Matériel',                       type: 'liste',    obligatoire: false },
  ],
}

// ─── Saskatchewan ─────────────────────────────────────────────────────────────

const SASKATCHEWAN: TemplateProvincial = {
  id: 'saskatchewan', province: 'Saskatchewan', langue_defaut: 'fr',
  label_avant:   'AVANT — Activation',
  label_pendant: 'PENDANT — Réalisation',
  label_apres:   'APRÈS — Objectivation',
  champs_entete: [
    { id: 'nom_enseignant', label: 'Enseignant(e)', type: 'text',  obligatoire: true },
    { id: 'niveau',         label: 'Niveau',         type: 'text',  obligatoire: true },
    { id: 'matiere',        label: 'Matière',         type: 'text',  obligatoire: true },
    { id: 'duree',          label: 'Durée',           type: 'duree', obligatoire: true },
    { id: 'titre',          label: 'Titre',           type: 'text',  obligatoire: true },
  ],
  champs_cadre: [
    { id: 'rag', label: "Résultat d'apprentissage Général (RAG)", type: 'textarea', obligatoire: true },
    { id: 'ras', label: "Résultat d'apprentissage Spécifique (RAS)", type: 'textarea', obligatoire: true },
    { id: 'rat', label: "Résultat d'apprentissage Transdisciplinaire (RAT)", type: 'textarea', obligatoire: false },
    { id: 'intention',              label: 'Intention pédagogique',          type: 'textarea', obligatoire: true },
    { id: 'indicateurs_rendement',  label: 'Indicateurs de rendement',       type: 'liste',    obligatoire: true },
    { id: 'evaluation',             label: 'Évaluation formative et sommative', type: 'richtext', obligatoire: true },
    { id: 'differentiation',        label: 'Éléments de différenciation (OBLIGATOIRE)', type: 'richtext', obligatoire: true },
    { id: 'approches_peda',         label: 'Approches pédagogiques',         type: 'text',     obligatoire: false },
  ],
  champs_avant: [
    { id: 'avant_temps',   label: 'Durée',                       type: 'duree',    obligatoire: false },
    { id: 'avant_amorce',  label: "Stratégies d'activation",     type: 'richtext', obligatoire: true },
    { id: 'avant_materiel',label: 'Matériel',                    type: 'liste',    obligatoire: false },
  ],
  champs_pendant: [
    { id: 'pendant_temps',       label: 'Durée',                             type: 'duree',    obligatoire: false },
    { id: 'pendant_modelisation',label: "Expériences d'apprentissage",       type: 'richtext', obligatoire: true },
    { id: 'pendant_guidee',      label: 'Pratique guidée',                   type: 'richtext', obligatoire: true },
    { id: 'pendant_autonome',    label: 'Pratique autonome',                 type: 'richtext', obligatoire: false },
    { id: 'pendant_materiel',    label: 'Matériel',                          type: 'liste',    obligatoire: false },
  ],
  champs_apres: [
    { id: 'apres_temps',  label: 'Durée',                                    type: 'duree',    obligatoire: false },
    { id: 'apres_retour', label: "Questions d'objectivation (OBLIGATOIRE)",  type: 'richtext', obligatoire: true,
      aide: "Quelles stratégies as-tu utilisées ? Qu'as-tu appris ?" },
    { id: 'apres_materiel',label: 'Matériel',                                type: 'liste',    obligatoire: false },
  ],
}

// ─── Colombie-Britannique ─────────────────────────────────────────────────────

const BC: TemplateProvincial = {
  id: 'bc', province: 'Colombie-Britannique', langue_defaut: 'en',
  label_avant:   'Mise en contexte (Hook)',
  label_pendant: 'Apprentissage actif',
  label_apres:   'Consolidation',
  champs_entete: [
    { id: 'nom_enseignant', label: 'Teacher',      type: 'text',  obligatoire: true },
    { id: 'niveau',         label: 'Grade',         type: 'text',  obligatoire: true },
    { id: 'matiere',        label: 'Subject',       type: 'text',  obligatoire: true },
    { id: 'duree',          label: 'Duration',      type: 'duree', obligatoire: true },
    { id: 'titre',          label: 'Lesson Title',  type: 'text',  obligatoire: true },
  ],
  champs_cadre: [
    { id: 'big_ideas',             label: 'Big Ideas',                type: 'textarea', obligatoire: true },
    { id: 'curricular_competencies',label: 'Curricular Competencies', type: 'liste',    obligatoire: true },
    { id: 'core_competencies',     label: 'Core Competencies',        type: 'liste',    obligatoire: false,
      aide: "Communication / Thinking / Social" },
    { id: 'first_peoples',         label: 'First Peoples Principles of Learning', type: 'textarea', obligatoire: false },
    { id: 'intention',             label: 'Learning Intention',       type: 'textarea', obligatoire: true },
    { id: 'evaluation',            label: 'Assessment (formative / summative)', type: 'richtext', obligatoire: true },
    { id: 'differentiation',       label: 'Differentiation / Universal Design', type: 'richtext', obligatoire: false },
  ],
  champs_avant: [
    { id: 'avant_temps',   label: 'Time',              type: 'duree',    obligatoire: false },
    { id: 'avant_amorce',  label: 'Hook / Activation', type: 'richtext', obligatoire: true },
    { id: 'avant_materiel',label: 'Materials',         type: 'liste',    obligatoire: false },
  ],
  champs_pendant: [
    { id: 'pendant_temps',       label: 'Time',                      type: 'duree',    obligatoire: false },
    { id: 'pendant_modelisation',label: 'Explicit Teaching / Modelling', type: 'richtext', obligatoire: true },
    { id: 'pendant_guidee',      label: 'Guided Practice',           type: 'richtext', obligatoire: true },
    { id: 'pendant_autonome',    label: 'Independent Practice',      type: 'richtext', obligatoire: false },
    { id: 'pendant_materiel',    label: 'Materials',                 type: 'liste',    obligatoire: false },
  ],
  champs_apres: [
    { id: 'apres_temps',   label: 'Time',                   type: 'duree',    obligatoire: false },
    { id: 'apres_retour',  label: 'Closure / Consolidation',type: 'richtext', obligatoire: true },
    { id: 'apres_materiel',label: 'Materials',              type: 'liste',    obligatoire: false },
  ],
}

// ─── IB ───────────────────────────────────────────────────────────────────────

const IB: TemplateProvincial = {
  id: 'ib', province: 'International (IB)', langue_defaut: 'fr',
  label_avant:   'Activation / Hook',
  label_pendant: 'Apprentissage / Inquiry',
  label_apres:   'Synthèse / Réflexion',
  champs_entete: [
    { id: 'nom_enseignant', label: 'Enseignant(e)', type: 'text', obligatoire: true },
    { id: 'niveau',         label: 'Année / Grade', type: 'text', obligatoire: true },
    { id: 'matiere',        label: 'Matière / Subject', type: 'text', obligatoire: true },
    { id: 'duree',          label: 'Durée',          type: 'duree', obligatoire: true },
    { id: 'titre',          label: 'Unité / Leçon',  type: 'text',  obligatoire: true },
  ],
  champs_cadre: [
    { id: 'theme_transdisciplinaire', label: 'Thème transdisciplinaire', type: 'text', obligatoire: false },
    { id: 'profil_apprenant',         label: 'Profil de l\'apprenant (IB)', type: 'liste', obligatoire: false },
    { id: 'approches_apprentissage',  label: 'Approches de l\'apprentissage (ATL)', type: 'liste', obligatoire: false },
    { id: 'intention',   label: 'Intention d\'apprentissage', type: 'textarea', obligatoire: true },
    { id: 'evaluation',  label: 'Évaluation formative et sommative', type: 'richtext', obligatoire: true },
    { id: 'differentiation', label: 'Différenciation', type: 'richtext', obligatoire: false },
  ],
  champs_avant: [
    { id: 'avant_temps',   label: 'Durée', type: 'duree', obligatoire: false },
    { id: 'avant_amorce',  label: 'Activation / Curiosité', type: 'richtext', obligatoire: true },
    { id: 'avant_materiel',label: 'Ressources', type: 'liste', obligatoire: false },
  ],
  champs_pendant: [
    { id: 'pendant_temps',       label: 'Durée', type: 'duree', obligatoire: false },
    { id: 'pendant_modelisation',label: 'Enseignement / Inquiry',   type: 'richtext', obligatoire: true },
    { id: 'pendant_guidee',      label: 'Collaboration / Discussion', type: 'richtext', obligatoire: true },
    { id: 'pendant_autonome',    label: 'Action / Création',        type: 'richtext', obligatoire: false },
    { id: 'pendant_materiel',    label: 'Ressources',               type: 'liste',    obligatoire: false },
  ],
  champs_apres: [
    { id: 'apres_temps',   label: 'Durée',                type: 'duree',    obligatoire: false },
    { id: 'apres_retour',  label: 'Réflexion / Synthèse', type: 'richtext', obligatoire: true },
    { id: 'apres_materiel',label: 'Ressources',           type: 'liste',    obligatoire: false },
  ],
}

// ─── Export ───────────────────────────────────────────────────────────────────

export const TEMPLATES_PROVINCIAUX: Record<string, TemplateProvincial> = {
  alberta:      ALBERTA,
  ontario:      ONTARIO,
  quebec:       QUEBEC,
  saskatchewan: SASKATCHEWAN,
  bc:           BC,
  ib:           IB,
  // Manitoba et Nouveau-Brunswick utilisent le gabarit Alberta par défaut
  manitoba:         { ...ALBERTA, id: 'manitoba',         province: 'Manitoba' },
  nouveau_brunswick:{ ...ALBERTA, id: 'nouveau_brunswick', province: 'Nouveau-Brunswick' },
  // France et Common Core utilisent le gabarit Ontario/Alberta
  france:       { ...QUEBEC,  id: 'france',  province: 'France',         label_avant: 'Entrée en matière', label_pendant: 'Déroulement', label_apres: 'Bilan' },
  common_core:  { ...BC,      id: 'common_core', province: 'Common Core (USA)', langue_defaut: 'en' },
}

export const getTemplate = (province: string): TemplateProvincial =>
  TEMPLATES_PROVINCIAUX[province] ?? TEMPLATES_PROVINCIAUX['alberta']
