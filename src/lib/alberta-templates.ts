// ─── Gabarits ScorgIA Alberta — Structures versionnées ───────────────────────
// IMPORTANT : Ces gabarits sont des outils de planification ScorgIA.
// Ils ne sont PAS des formulaires officiels d'Alberta Education.

import type { GabaritStructure } from '@/lib/types/teaching-pack'

// ─── GABARIT 1 — Plan annuel ──────────────────────────────────────────────────

export const GABARIT_PLAN_ANNUEL_ALBERTA: GabaritStructure = {
  id:       'scorgia-alberta-plan-annuel-v1',
  nom:      'ScorgIA Alberta — Plan annuel',
  version:  '1.0.0-beta',
  province: 'alberta',
  langue:   'fr',
  type:     'plan_annuel',
  metadata: {
    auteur:      'ScorgIA / Bodingo AI Tech Inc.',
    date:        '2026-08-04',
    description: "Gabarit de plan annuel adapté au contexte albertain. Basé sur les principes du Program of Studies d'Alberta Education. Pas un formulaire officiel.",
  },
  sections: [
    {
      id: 'identification',
      titre: '1. Identification',
      obligatoire: true,
      champs: [
        { id: 'annee_scolaire',  label: 'Année scolaire',             type: 'texte',  obligatoire: true,  placeholder: '2026-2027', objet_spie: 'TeachingPack.annee_scolaire' },
        { id: 'province',        label: 'Province',                   type: 'texte',  obligatoire: true,  placeholder: 'Alberta',   objet_spie: 'TeachingPack.province' },
        { id: 'juridiction',     label: 'Juridiction (facultatif)',    type: 'texte',  obligatoire: false, placeholder: 'ex. CSFCB, CESD', objet_spie: 'TeachingPack.juridiction' },
        { id: 'ecole',           label: 'École (facultatif)',          type: 'texte',  obligatoire: false, placeholder: 'Nom de l\'école' },
        { id: 'enseignant',      label: 'Nom de l\'enseignant',        type: 'texte',  obligatoire: false, objet_spie: 'Profil.nom' },
        { id: 'classe',          label: 'Nom de la classe',            type: 'texte',  obligatoire: true,  objet_spie: 'Classe.nom' },
        { id: 'niveau',          label: 'Niveau',                     type: 'texte',  obligatoire: true,  objet_spie: 'TeachingPack.niveau' },
        { id: 'matiere',         label: 'Matière',                    type: 'texte',  obligatoire: true,  objet_spie: 'TeachingPack.matiere' },
        { id: 'langue',          label: "Langue d'enseignement",       type: 'texte',  obligatoire: true,  objet_spie: 'TeachingPack.langue' },
      ],
    },
    {
      id: 'references_curriculaires',
      titre: '2. Références curriculaires',
      obligatoire: true,
      champs: [
        { id: 'curriculum_titre',  label: 'Curriculum de référence',   type: 'texte',  obligatoire: true,  objet_spie: 'PackSyllabus.normes_reference[0]' },
        { id: 'curriculum_version',label: 'Version',                   type: 'texte',  obligatoire: false, placeholder: 'ex. 2023' },
        { id: 'resultats_generaux',label: 'Résultats généraux (RAG)',  type: 'liste',  obligatoire: false, aide: "Les RAG couvrent l'ensemble de l'année. Listez ceux visés.", objet_spie: 'PackSyllabus.grandes_idees' },
        { id: 'resultats_specifiques', label: 'Résultats spécifiques (RAS)', type: 'liste', obligatoire: false, objet_spie: 'PackSyllabus.resultats_apprentissage' },
        { id: 'competences',       label: 'Compétences visées',        type: 'liste',  obligatoire: false },
        { id: 'grandes_idees',     label: 'Grandes idées',             type: 'liste',  obligatoire: false, objet_spie: 'PackSyllabus.grandes_idees' },
        { id: 'concepts_essentiels', label: 'Concepts essentiels',     type: 'liste',  obligatoire: false },
      ],
    },
    {
      id: 'contexte_pedagogique',
      titre: '3. Contexte pédagogique',
      obligatoire: false,
      champs: [
        { id: 'profil_classe',     label: 'Profil général de la classe', type: 'markdown', obligatoire: false },
        { id: 'periodes_semaine',  label: 'Périodes par semaine',        type: 'nombre',   obligatoire: false, objet_spie: 'SchoolCalendar.periodes_par_semaine' },
        { id: 'duree_periode',     label: 'Durée des périodes (min)',    type: 'nombre',   obligatoire: false, objet_spie: 'SchoolCalendar.duree_periode_minutes' },
        { id: 'ressources',        label: 'Ressources disponibles',      type: 'liste',    obligatoire: false },
        { id: 'contraintes',       label: 'Contraintes et défis',        type: 'markdown', obligatoire: false },
        { id: 'adaptations',       label: 'Adaptations générales',       type: 'markdown', obligatoire: false },
      ],
    },
    {
      id: 'organisation_annuelle',
      titre: '4. Organisation annuelle',
      description: 'Vue d\'ensemble des séquences sur l\'année',
      obligatoire: true,
      champs: [
        { id: 'nb_sequences',      label: 'Nombre de séquences',        type: 'nombre',   obligatoire: true,  objet_spie: 'ContenuProgramme.unites.length' },
        { id: 'sequences_resume',  label: 'Résumé des séquences',       type: 'markdown', obligatoire: false, aide: 'Généré automatiquement depuis le plan annuel', objet_spie: 'ContenuProgramme.unites' },
        { id: 'semaines_tampon',   label: 'Semaines tampons prévues',   type: 'nombre',   obligatoire: false, objet_spie: 'SchoolCalendar.semaines_tampon' },
      ],
    },
    {
      id: 'couverture_curriculum',
      titre: '5. Couverture du curriculum',
      obligatoire: false,
      champs: [
        { id: 'resultats_couverts',   label: 'Résultats couverts',          type: 'liste', obligatoire: false },
        { id: 'resultats_a_couvrir',  label: 'Résultats restants à couvrir', type: 'liste', obligatoire: false },
        { id: 'prerequis',            label: 'Prérequis identifiés',         type: 'liste', obligatoire: false },
      ],
    },
    {
      id: 'evaluation',
      titre: '6. Évaluation',
      obligatoire: false,
      champs: [
        { id: 'eval_diagnostique', label: 'Évaluation diagnostique',    type: 'markdown', obligatoire: false },
        { id: 'eval_formative',    label: 'Évaluation formative',       type: 'markdown', obligatoire: false },
        { id: 'eval_sommative',    label: 'Évaluation sommative',       type: 'markdown', obligatoire: false },
        { id: 'preuves_apprentissage', label: "Preuves d'apprentissage", type: 'liste',   obligatoire: false },
      ],
    },
    {
      id: 'revision',
      titre: '7. Révision et adaptation',
      obligatoire: false,
      champs: [
        { id: 'date_revision',  label: 'Date de révision', type: 'date',     obligatoire: false },
        { id: 'motif',          label: 'Motif',            type: 'texte',    obligatoire: false },
        { id: 'version_doc',    label: 'Version',          type: 'texte',    obligatoire: false, placeholder: '1.0' },
        { id: 'observations',   label: 'Observations',     type: 'markdown', obligatoire: false },
      ],
    },
  ],
}

// ─── GABARIT 2 — Plan de séquence ────────────────────────────────────────────

export const GABARIT_PLAN_SEQUENCE_ALBERTA: GabaritStructure = {
  id:       'scorgia-alberta-plan-sequence-v1',
  nom:      'ScorgIA Alberta — Plan de séquence',
  version:  '1.0.0-beta',
  province: 'alberta',
  langue:   'fr',
  type:     'sequence',
  metadata: {
    auteur:      'ScorgIA / Bodingo AI Tech Inc.',
    date:        '2026-08-04',
    description: 'Gabarit de plan de séquence pour le contexte albertain.',
  },
  sections: [
    {
      id: 'identification',
      titre: '1. Identification',
      obligatoire: true,
      champs: [
        { id: 'titre_sequence',  label: 'Titre de la séquence',       type: 'texte',  obligatoire: true,  objet_spie: 'Unite.titre' },
        { id: 'matiere',         label: 'Matière',                    type: 'texte',  obligatoire: true,  objet_spie: 'TeachingPack.matiere' },
        { id: 'niveau',          label: 'Niveau',                     type: 'texte',  obligatoire: true,  objet_spie: 'TeachingPack.niveau' },
        { id: 'enseignant',      label: 'Enseignant',                 type: 'texte',  obligatoire: false },
        { id: 'annee',           label: 'Année scolaire',             type: 'texte',  obligatoire: false, objet_spie: 'TeachingPack.annee_scolaire' },
      ],
    },
    {
      id: 'place_plan_annuel',
      titre: '2. Place dans le plan annuel',
      obligatoire: true,
      champs: [
        { id: 'numero_sequence',   label: 'Numéro de la séquence',    type: 'nombre', obligatoire: true,  objet_spie: 'Unite.numero' },
        { id: 'semaine_debut',     label: 'Semaine de début',         type: 'nombre', obligatoire: true,  objet_spie: 'Unite.semaine_debut' },
        { id: 'semaine_fin',       label: 'Semaine de fin',           type: 'nombre', obligatoire: true,  objet_spie: 'Unite.semaine_fin' },
        { id: 'nb_lecons',         label: 'Nombre de leçons prévues', type: 'nombre', obligatoire: true,  objet_spie: 'Unite.lecons.length' },
        { id: 'theme_central',     label: 'Thème central',            type: 'texte',  obligatoire: false, objet_spie: 'Unite.theme' },
      ],
    },
    {
      id: 'curriculum',
      titre: '3. Résultats curriculaires',
      obligatoire: true,
      champs: [
        { id: 'rag',              label: 'Résultats généraux (RAG)',   type: 'liste',    obligatoire: false, objet_spie: 'Unite.objectifs' },
        { id: 'ras',              label: 'Résultats spécifiques (RAS)', type: 'liste',   obligatoire: false },
        { id: 'competences',      label: 'Compétences visées',         type: 'liste',    obligatoire: false, objet_spie: 'Unite.competences' },
        { id: 'grandes_idees',    label: 'Grandes idées',              type: 'liste',    obligatoire: false },
      ],
    },
    {
      id: 'contenus',
      titre: '4. Contenus et connaissances',
      obligatoire: false,
      champs: [
        { id: 'vocabulaire',     label: 'Vocabulaire clé',             type: 'liste', obligatoire: false },
        { id: 'prerequis',       label: 'Prérequis des élèves',        type: 'liste', obligatoire: false },
        { id: 'objectifs_seq',   label: "Objectifs de la séquence",    type: 'liste', obligatoire: true, objet_spie: 'Unite.objectifs' },
        { id: 'questions_ess',   label: 'Questions essentielles',      type: 'liste', obligatoire: false },
      ],
    },
    {
      id: 'progression',
      titre: '5. Progression des leçons',
      description: 'Chaque leçon doit indiquer les résultats d\'apprentissage auxquels elle contribue',
      obligatoire: true,
      champs: [
        { id: 'lecons',          label: 'Leçons de la séquence',       type: 'liste', obligatoire: true, objet_spie: 'Unite.lecons' },
      ],
    },
    {
      id: 'pedagogie',
      titre: '6. Approches pédagogiques',
      obligatoire: false,
      champs: [
        { id: 'methodes',        label: 'Méthodes pédagogiques',       type: 'liste', obligatoire: false },
        { id: 'ressources',      label: 'Ressources et matériel',      type: 'liste', obligatoire: false },
        { id: 'differentiation', label: 'Différenciation prévue',      type: 'markdown', obligatoire: false },
      ],
    },
    {
      id: 'evaluation',
      titre: '7. Évaluation',
      obligatoire: false,
      champs: [
        { id: 'eval_diagnostique', label: 'Diagnostique',              type: 'markdown', obligatoire: false },
        { id: 'eval_formative',    label: 'Formative',                 type: 'markdown', obligatoire: false },
        { id: 'eval_sommative',    label: 'Sommative',                 type: 'markdown', obligatoire: false },
        { id: 'criteres',         label: 'Critères de réussite',       type: 'liste',    obligatoire: false },
      ],
    },
    {
      id: 'reflexion',
      titre: '8. Réflexion et ajustements',
      obligatoire: false,
      champs: [
        { id: 'risques',          label: 'Risques identifiés',          type: 'liste',    obligatoire: false },
        { id: 'ajustements',      label: 'Ajustements prévus',          type: 'markdown', obligatoire: false },
        { id: 'reflexion_post',   label: 'Réflexion après la séquence', type: 'markdown', obligatoire: false },
        { id: 'version_doc',      label: 'Version',                     type: 'texte',    obligatoire: false, placeholder: '1.0' },
      ],
    },
  ],
}

// ─── GABARIT 3 — Plan de leçon ────────────────────────────────────────────────

export const GABARIT_PLAN_LECON_ALBERTA: GabaritStructure = {
  id:       'scorgia-alberta-plan-lecon-v1',
  nom:      'ScorgIA Alberta — Plan de leçon',
  version:  '1.0.0-beta',
  province: 'alberta',
  langue:   'fr',
  type:     'plan_lecon',
  metadata: {
    auteur:      'ScorgIA / Bodingo AI Tech Inc.',
    date:        '2026-08-04',
    description: 'Gabarit de plan de leçon complet pour le contexte albertain.',
  },
  sections: [
    {
      id: 'identification',
      titre: '1. Identification',
      obligatoire: true,
      champs: [
        { id: 'titre_lecon',     label: 'Titre de la leçon',           type: 'texte',  obligatoire: true,  objet_spie: 'LeconProgramme.titre' },
        { id: 'matiere',         label: 'Matière',                     type: 'texte',  obligatoire: true,  objet_spie: 'TeachingPack.matiere' },
        { id: 'niveau',          label: 'Niveau',                      type: 'texte',  obligatoire: true,  objet_spie: 'TeachingPack.niveau' },
        { id: 'date',            label: 'Date prévue',                 type: 'date',   obligatoire: false },
        { id: 'enseignant',      label: 'Enseignant',                  type: 'texte',  obligatoire: false },
      ],
    },
    {
      id: 'lien_sequence',
      titre: '2. Lien avec la séquence',
      obligatoire: true,
      champs: [
        { id: 'sequence_titre',  label: 'Titre de la séquence',        type: 'texte',  obligatoire: true,  objet_spie: 'Unite.titre' },
        { id: 'numero_lecon',    label: 'Leçon # dans la séquence',    type: 'nombre', obligatoire: false, objet_spie: 'LeconProgramme.numero' },
        { id: 'sujet',           label: 'Sujet de la leçon',           type: 'texte',  obligatoire: true,  objet_spie: 'LeconProgramme.sujet' },
      ],
    },
    {
      id: 'duree',
      titre: '3. Durée',
      obligatoire: true,
      champs: [
        { id: 'duree_minutes',   label: 'Durée totale (min)',          type: 'nombre', obligatoire: true, objet_spie: 'LeconProgramme.duree_minutes' },
      ],
    },
    {
      id: 'curriculum',
      titre: '4. Résultats curriculaires',
      obligatoire: true,
      champs: [
        { id: 'rag',             label: 'Résultats généraux (RAG)',     type: 'liste',    obligatoire: false },
        { id: 'ras',             label: 'Résultats spécifiques (RAS)',  type: 'liste',    obligatoire: false },
        { id: 'objectifs',       label: "Objectifs d'apprentissage",    type: 'liste',    obligatoire: true,  aide: 'Formulez en termes observables et mesurables' },
        { id: 'criteres',        label: 'Critères de réussite',         type: 'liste',    obligatoire: true },
      ],
    },
    {
      id: 'preparation',
      titre: '5. Préparation',
      obligatoire: false,
      champs: [
        { id: 'prerequis',       label: 'Prérequis des élèves',        type: 'liste',    obligatoire: false },
        { id: 'vocabulaire',     label: 'Vocabulaire clé',             type: 'liste',    obligatoire: false },
        { id: 'materiel',        label: 'Matériel et ressources',      type: 'liste',    obligatoire: false },
        { id: 'prep_enseignant', label: "Préparation de l'enseignant", type: 'markdown', obligatoire: false },
      ],
    },
    {
      id: 'deroulement',
      titre: '6. Déroulement de la leçon',
      obligatoire: true,
      sous_sections: [
        {
          id: 'mise_en_situation',
          titre: '6.1 Mise en situation / Activation',
          obligatoire: true,
          champs: [
            { id: 'contenu_amorce', label: 'Contenu',        type: 'markdown', obligatoire: true,  aide: 'Accroche, question provocatrice, lien avec les connaissances antérieures' },
            { id: 'duree_amorce',   label: 'Durée (min)',    type: 'nombre',   obligatoire: false },
          ],
        },
        {
          id: 'enseignement',
          titre: '6.2 Enseignement / Modélisation',
          obligatoire: true,
          champs: [
            { id: 'contenu_ensei', label: 'Contenu',         type: 'markdown', obligatoire: true },
            { id: 'duree_ensei',   label: 'Durée (min)',     type: 'nombre',   obligatoire: false },
          ],
        },
        {
          id: 'pratique_guidee',
          titre: '6.3 Pratique guidée',
          obligatoire: true,
          champs: [
            { id: 'contenu_guidee', label: 'Contenu',        type: 'markdown', obligatoire: true },
            { id: 'duree_guidee',   label: 'Durée (min)',    type: 'nombre',   obligatoire: false },
          ],
        },
        {
          id: 'pratique_autonome',
          titre: '6.4 Pratique autonome / collaborative',
          obligatoire: true,
          champs: [
            { id: 'contenu_auto',  label: 'Contenu',         type: 'markdown', obligatoire: true },
            { id: 'duree_auto',    label: 'Durée (min)',     type: 'nombre',   obligatoire: false },
          ],
        },
        {
          id: 'synthese',
          titre: '6.5 Synthèse / Clôture',
          obligatoire: false,
          champs: [
            { id: 'contenu_synth', label: 'Contenu',         type: 'markdown', obligatoire: false },
            { id: 'duree_synth',   label: 'Durée (min)',     type: 'nombre',   obligatoire: false },
          ],
        },
      ],
      champs: [],
    },
    {
      id: 'evaluation',
      titre: '7. Évaluation formative',
      obligatoire: true,
      champs: [
        { id: 'eval_form',       label: 'Évaluation formative',        type: 'markdown', obligatoire: true, aide: 'Quel indicateur visible permet de vérifier la compréhension ?' },
      ],
    },
    {
      id: 'differentiation',
      titre: '8. Différenciation et inclusion',
      obligatoire: true,
      champs: [
        { id: 'diff_universelle',  label: 'Différenciation universelle (pour tous)',      type: 'markdown', obligatoire: false },
        { id: 'diff_ciblee',       label: 'Différenciation ciblée (groupe spécifique)',   type: 'markdown', obligatoire: false },
        { id: 'diff_specialisee',  label: 'Différenciation spécialisée (IPP/adaptation)', type: 'markdown', obligatoire: false },
        { id: 'enrichissement',    label: 'Enrichissement pour les élèves avancés',       type: 'markdown', obligatoire: false },
      ],
    },
    {
      id: 'suite',
      titre: '9. Suite et suivi',
      obligatoire: false,
      champs: [
        { id: 'devoir',          label: 'Devoir éventuel',             type: 'markdown', obligatoire: false },
        { id: 'notes_privees',   label: 'Notes privées (enseignant)',  type: 'markdown', obligatoire: false, aide: 'Non visible par les élèves ni dans les exports partagés' },
        { id: 'reflexion_post',  label: 'Réflexion après le cours',   type: 'markdown', obligatoire: false },
        { id: 'version_doc',     label: 'Version',                    type: 'texte',    obligatoire: false, placeholder: '1.0' },
      ],
    },
  ],
}

// ─── Index des gabarits disponibles ──────────────────────────────────────────

export const GABARITS_ALBERTA = {
  plan_annuel:   GABARIT_PLAN_ANNUEL_ALBERTA,
  plan_sequence: GABARIT_PLAN_SEQUENCE_ALBERTA,
  plan_lecon:    GABARIT_PLAN_LECON_ALBERTA,
} as const

export function getGabaritAlberta(type: 'plan_annuel' | 'plan_sequence' | 'plan_lecon') {
  return GABARITS_ALBERTA[type]
}
