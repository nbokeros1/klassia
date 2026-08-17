// ─── ScorgIA — Pedagogical Template Registry V7.0 ──────────────────────────
// Registre central de tous les templates pédagogiques ScorgIA.
// Un template définit : champs requis, règles de qualité, provenance attendue.
// ─────────────────────────────────────────────────────────────────────────────

import type { PedagogicalTemplate } from '../types/index'

// ════════════════════════════════════════════════════════════════════════════
// TEMPLATES REGISTRY
// ════════════════════════════════════════════════════════════════════════════

export const SCORGIA_TEMPLATES: PedagogicalTemplate[] = [

  // ── LESSON PLAN — Alberta — FR ────────────────────────────────────────────
  {
    id:                    'scorgia-lesson-plan-alberta-fr-v7',
    type:                  'LESSON_PLAN',
    nom:                   'Plan de leçon ScorgIA — Alberta (FR)',
    version:               '7.0',
    jurisdiction:          'Alberta',
    langue:                'fr',
    school_level:          ['primaire', 'secondaire'],
    subject_applicability: [],  // applicable à toutes les matières
    required_fields: [
      { field: 'titre',                  label: 'Titre de la leçon',            type: 'text',   provenance_expected: 'TEACHER_INPUT' },
      { field: 'curriculum_outcome_ids', label: 'RA curriculaires (IDs)',        type: 'list',   provenance_expected: 'OFFICIAL_CURRICULUM' },
      { field: 'objectif_eleve',         label: 'Intention d\'apprentissage',    type: 'text',   provenance_expected: 'AI_GENERATED',   description: 'Formulé du point de vue de l\'élève avec verbe action observable' },
      { field: 'duree_minutes',          label: 'Durée (minutes)',               type: 'number', provenance_expected: 'TEACHER_INPUT' },
      { field: 'criteres_reussite',      label: 'Critères de réussite',          type: 'list',   provenance_expected: 'TEACHER_INPUT' },
    ],
    optional_fields: [
      { field: 'activation',             label: 'Activation / engagement',       type: 'markdown', provenance_expected: 'AI_GENERATED' },
      { field: 'enseignement_explicite', label: 'Enseignement explicite',        type: 'markdown', provenance_expected: 'AI_GENERATED' },
      { field: 'pratique_guidee',        label: 'Pratique guidée',               type: 'markdown', provenance_expected: 'AI_GENERATED' },
      { field: 'pratique_autonome',      label: 'Pratique autonome',             type: 'markdown', provenance_expected: 'AI_GENERATED' },
      { field: 'consolidation',          label: 'Consolidation / clôture',       type: 'markdown', provenance_expected: 'AI_GENERATED' },
      { field: 'differentiation',        label: 'Différenciation / inclusion',   type: 'markdown', provenance_expected: 'AI_GENERATED' },
      { field: 'evaluation',             label: 'Évaluation formative',          type: 'markdown', provenance_expected: 'AI_GENERATED' },
      { field: 'reflexion_enseignant',   label: 'Réflexion (après leçon)',       type: 'text',     provenance_expected: 'TEACHER_INPUT' },
    ],
    quality_rules: [
      {
        id:          'qr-lp-ra-required',
        dimension:   'CURRICULUM_ALIGNMENT',
        description: 'Au moins un RA officiel doit être lié à la leçon',
        check:       'curriculum_outcome_ids.length > 0',
        weight:      1,
      },
      {
        id:          'qr-lp-objectif-action-verb',
        dimension:   'OBJECTIVE_QUALITY',
        description: 'L\'objectif élève doit contenir un verbe d\'action observable',
        check:       'objectif_eleve contient verbe action (expliquer, analyser, démontrer…)',
        weight:      0.9,
      },
      {
        id:          'qr-lp-formative',
        dimension:   'ASSESSMENT_ALIGNMENT',
        description: 'Une stratégie d\'évaluation formative doit être planifiée',
        check:       'evaluation.formative présent',
        weight:      0.8,
      },
      {
        id:          'qr-lp-udl',
        dimension:   'INCLUSION',
        description: 'Des supports universels (UDL) doivent être identifiés',
        check:       'differentiation.supports_universels.length > 0',
        weight:      0.7,
      },
    ],
    provenance_requirements: ['OFFICIAL_CURRICULUM', 'TEACHER_INPUT', 'AI_GENERATED'],
    created_at: '2026-08-17',
  },

  // ── SEQUENCE PLAN — Alberta — FR ──────────────────────────────────────────
  {
    id:                    'scorgia-sequence-plan-alberta-fr-v7',
    type:                  'SEQUENCE_PLAN',
    nom:                   'Plan de séquence ScorgIA — Alberta (FR)',
    version:               '7.0',
    jurisdiction:          'Alberta',
    langue:                'fr',
    school_level:          ['primaire', 'secondaire'],
    subject_applicability: [],
    required_fields: [
      { field: 'titre',                   label: 'Titre de la séquence',          type: 'text',   provenance_expected: 'TEACHER_INPUT' },
      { field: 'objectif_sequence',       label: 'Objectif global',               type: 'text',   provenance_expected: 'AI_GENERATED' },
      { field: 'curriculum_outcome_ids',  label: 'RA ciblés',                     type: 'list',   provenance_expected: 'OFFICIAL_CURRICULUM' },
      { field: 'justification_pedagogique', label: 'Justification — POURQUOI',   type: 'markdown', provenance_expected: 'AI_GENERATED',   description: 'Obligatoire — explique pourquoi ce regroupement de leçons existe' },
    ],
    optional_fields: [
      { field: 'question_essentielle',    label: 'Question essentielle',          type: 'text' },
      { field: 'acquis_prealables',       label: 'Acquis préalables',             type: 'list' },
      { field: 'misconceptions_anticipees', label: 'Idées fausses anticipées',   type: 'list' },
      { field: 'progression',             label: 'Progression cognitive',         type: 'text' },
      { field: 'evaluation_formative',    label: 'Évaluation formative',          type: 'markdown' },
      { field: 'evaluation_sommative',    label: 'Évaluation sommative',          type: 'markdown' },
      { field: 'criteres_reussite',       label: 'Critères de réussite',          type: 'list' },
      { field: 'supports_universels',     label: 'Supports universels',           type: 'list' },
    ],
    quality_rules: [
      {
        id:          'qr-sp-justification',
        dimension:   'PEDAGOGICAL_COHERENCE',
        description: 'La séquence doit avoir une justification pédagogique',
        check:       'justification_pedagogique présent et non vide',
        weight:      1,
      },
      {
        id:          'qr-sp-ra',
        dimension:   'CURRICULUM_ALIGNMENT',
        description: 'Au moins un RA doit être lié',
        check:       'curriculum_outcome_ids.length > 0',
        weight:      1,
      },
    ],
    provenance_requirements: ['OFFICIAL_CURRICULUM', 'TEACHER_INPUT', 'AI_GENERATED'],
    created_at: '2026-08-17',
  },

  // ── UNIT PLAN — Alberta — FR ──────────────────────────────────────────────
  {
    id:                    'scorgia-unit-plan-alberta-fr-v7',
    type:                  'UNIT_PLAN',
    nom:                   'Plan d\'unité ScorgIA — Alberta (FR)',
    version:               '7.0',
    jurisdiction:          'Alberta',
    langue:                'fr',
    school_level:          ['primaire', 'secondaire'],
    subject_applicability: [],
    required_fields: [
      { field: 'titre',                  label: 'Titre de l\'unité',             type: 'text' },
      { field: 'curriculum_outcome_ids', label: 'RA curriculaires',              type: 'list', provenance_expected: 'OFFICIAL_CURRICULUM' },
      { field: 'semaine_debut',          label: 'Semaine de début',              type: 'number' },
      { field: 'semaine_fin',            label: 'Semaine de fin',                type: 'number' },
    ],
    optional_fields: [
      { field: 'questions_directrices',            label: 'Questions directrices',        type: 'list' },
      { field: 'grandes_idees',                    label: 'Grandes idées',                type: 'list' },
      { field: 'connaissances',                    label: 'Connaissances ciblées',        type: 'list' },
      { field: 'habiletes',                        label: 'Habiletés ciblées',            type: 'list' },
      { field: 'competences_transversales',        label: 'Compétences transversales',    type: 'list' },
      { field: 'justification_pedagogique',        label: 'Justification pédagogique',   type: 'markdown' },
      { field: 'preuves_apprentissage_attendues',  label: 'Preuves d\'apprentissage',    type: 'list' },
      { field: 'evaluations_majeures_prevues',     label: 'Évaluations majeures',        type: 'list' },
      { field: 'considerations_inclusion',         label: 'Considérations inclusion',    type: 'list' },
      { field: 'ressources_principales',           label: 'Ressources principales',      type: 'list' },
    ],
    quality_rules: [
      {
        id:          'qr-up-multiple-sequences',
        dimension:   'PEDAGOGICAL_COHERENCE',
        description: 'Une unité peut contenir plusieurs séquences (interdit 1:1 automatique)',
        check:       'nb_sequences n\'est pas imposé à 1 par défaut',
        weight:      0.5,
      },
    ],
    provenance_requirements: ['OFFICIAL_CURRICULUM', 'TEACHER_INPUT', 'AI_GENERATED'],
    created_at: '2026-08-17',
  },

  // ── SYLLABUS — Alberta — FR ───────────────────────────────────────────────
  {
    id:                    'scorgia-syllabus-alberta-fr-v7',
    type:                  'SYLLABUS',
    nom:                   'Syllabus ScorgIA — Alberta (FR)',
    version:               '7.0',
    jurisdiction:          'Alberta',
    langue:                'fr',
    school_level:          ['secondaire'],
    subject_applicability: [],
    required_fields: [
      { field: 'identite_cours.titre',   label: 'Titre du cours',               type: 'text',   provenance_expected: 'TEACHER_INPUT' },
      { field: 'curriculum_applicable',  label: 'Curriculum officiel',           type: 'text',   provenance_expected: 'OFFICIAL_CURRICULUM' },
      { field: 'resultats_majeurs',      label: 'Résultats d\'apprentissage majeurs', type: 'list', provenance_expected: 'CURRICULUM_DERIVED' },
    ],
    optional_fields: [
      { field: 'description',             label: 'Description du cours',         type: 'markdown', provenance_expected: 'AI_GENERATED' },
      { field: 'approches_pedagogiques',  label: 'Approches pédagogiques',       type: 'list',     provenance_expected: 'AI_GENERATED' },
      { field: 'evaluation_formative',    label: 'Évaluation formative',         type: 'text',     provenance_expected: 'AI_GENERATED' },
      { field: 'evaluation_sommative',    label: 'Évaluation sommative',         type: 'text',     provenance_expected: 'AI_GENERATED' },
      // Champs jamais générés par l'IA
      { field: 'politique_absences',      label: 'Politique absences',           type: 'text',     provenance_expected: 'SCHOOL_POLICY', never_ai_generated: true },
      { field: 'integrite_academique',    label: 'Intégrité académique',         type: 'text',     provenance_expected: 'SCHOOL_POLICY', never_ai_generated: true },
      { field: 'utilisation_ia',          label: 'Politique utilisation IA',     type: 'text',     provenance_expected: 'SCHOOL_POLICY', never_ai_generated: true },
      { field: 'coordonnees_urgence',     label: 'Coordonnées urgence',          type: 'text',     provenance_expected: 'TEACHER_INPUT', never_ai_generated: true },
      { field: 'politique_remise_tardive', label: 'Politique remise tardive',    type: 'text',     provenance_expected: 'SCHOOL_POLICY', never_ai_generated: true },
    ],
    quality_rules: [
      {
        id:          'qr-syl-no-invented-policy',
        dimension:   'DOCUMENT_COMPLETENESS',
        description: 'Les politiques scolaires ne sont JAMAIS générées par l\'IA — elles affichent MISSING si absentes',
        check:       'never_ai_generated fields ne portent pas provenance AI_GENERATED',
        weight:      1,
      },
      {
        id:          'qr-syl-no-invented-contact',
        dimension:   'DOCUMENT_COMPLETENESS',
        description: 'Les coordonnées ne sont jamais inventées par ScorgIA',
        check:       'enseignant.courriel provenance !== AI_GENERATED',
        weight:      1,
      },
    ],
    provenance_requirements: ['OFFICIAL_CURRICULUM', 'CURRICULUM_DERIVED', 'TEACHER_INPUT', 'SCHOOL_POLICY', 'MISSING'],
    created_at: '2026-08-17',
  },

  // ── STUDENT SUPPORT PLAN — Alberta — FR ──────────────────────────────────
  {
    id:                    'scorgia-student-support-alberta-fr-v7',
    type:                  'STUDENT_SUPPORT_PLAN',
    nom:                   'Dossier de soutien pédagogique ScorgIA — Alberta (FR)',
    version:               '7.0',
    jurisdiction:          'Alberta',
    langue:                'fr',
    school_level:          ['primaire', 'secondaire'],
    subject_applicability: [],
    required_fields: [
      { field: 'eleve_id',            label: 'Élève (ID pseudonymisé)',         type: 'text',   provenance_expected: 'TEACHER_INPUT',   never_ai_generated: true },
      { field: 'statut',              label: 'Statut du plan',                  type: 'select', provenance_expected: 'TEACHER_INPUT' },
      { field: 'date_creation',       label: 'Date de création',                type: 'date',   provenance_expected: 'SYSTEM_DERIVED' },
      { field: 'besoins_observes',    label: 'Besoins pédagogiques observés',   type: 'list',   provenance_expected: 'TEACHER_INPUT',   never_ai_generated: true },
      { field: 'niveau_confidentialite', label: 'Niveau de confidentialité',   type: 'select', provenance_expected: 'TEACHER_INPUT' },
    ],
    optional_fields: [
      { field: 'forces',              label: 'Forces et intérêts',              type: 'list',   provenance_expected: 'TEACHER_INPUT' },
      { field: 'objectif_annuel',     label: 'Objectif pédagogique annuel',     type: 'text',   provenance_expected: 'TEACHER_INPUT' },
      { field: 'strategies',          label: 'Stratégies de soutien',           type: 'list',   provenance_expected: 'TEACHER_INPUT' },
      { field: 'designation_officielle', label: 'Désignation officielle',       type: 'text',   provenance_expected: 'OFFICIAL_STANDARD', never_ai_generated: true },
    ],
    quality_rules: [
      {
        id:          'qr-ssp-no-diagnosis',
        dimension:   'DOCUMENT_COMPLETENESS',
        description: 'ScorgIA ne génère AUCUN diagnostic médical ou psychologique',
        check:       'designation_officielle provenance !== AI_GENERATED',
        weight:      1,
      },
      {
        id:          'qr-ssp-confidentiality',
        dimension:   'DOCUMENT_COMPLETENESS',
        description: 'Le niveau de confidentialité doit toujours être défini',
        check:       'niveau_confidentialite présent',
        weight:      1,
      },
      {
        id:          'qr-ssp-pseudonymized-ia',
        dimension:   'INCLUSION',
        description: 'L\'identifiant élève est pseudonymisé lors de transmission à l\'IA',
        check:       'eleve_id jamais transmis brut au modèle IA',
        weight:      1,
      },
    ],
    provenance_requirements: ['TEACHER_INPUT', 'OFFICIAL_STANDARD', 'SYSTEM_DERIVED'],
    created_at: '2026-08-17',
  },

  // ── ASSESSMENT — Alberta — FR ─────────────────────────────────────────────
  {
    id:                    'scorgia-assessment-alberta-fr-v7',
    type:                  'ASSESSMENT',
    nom:                   'Évaluation ScorgIA — Alberta (FR)',
    version:               '7.0',
    jurisdiction:          'Alberta',
    langue:                'fr',
    school_level:          ['primaire', 'secondaire'],
    subject_applicability: [],
    required_fields: [
      { field: 'titre',                  label: 'Titre de l\'évaluation',        type: 'text' },
      { field: 'curriculum_outcome_ids', label: 'RA ciblés',                     type: 'list', provenance_expected: 'OFFICIAL_CURRICULUM' },
      { field: 'type',                   label: 'Type (formative/sommative)',     type: 'select' },
    ],
    optional_fields: [
      { field: 'criteres_reussite',      label: 'Critères de réussite',          type: 'list' },
      { field: 'rubrique',               label: 'Grille d\'évaluation',          type: 'markdown' },
      { field: 'duree_minutes',          label: 'Durée (min)',                   type: 'number' },
    ],
    quality_rules: [],
    provenance_requirements: ['OFFICIAL_CURRICULUM', 'TEACHER_INPUT', 'AI_GENERATED'],
    created_at: '2026-08-17',
  },

  // ── REFLECTION — Alberta — FR ─────────────────────────────────────────────
  {
    id:                    'scorgia-reflection-alberta-fr-v7',
    type:                  'REFLECTION',
    nom:                   'Réflexion pédagogique ScorgIA — Alberta (FR)',
    version:               '7.0',
    jurisdiction:          'Alberta',
    langue:                'fr',
    school_level:          ['primaire', 'secondaire'],
    subject_applicability: [],
    required_fields: [
      { field: 'titre',                  label: 'Titre de la réflexion',         type: 'text', provenance_expected: 'TEACHER_INPUT' },
    ],
    optional_fields: [
      { field: 'ce_qui_a_bien_fonctionne', label: 'Ce qui a bien fonctionné',   type: 'text', provenance_expected: 'TEACHER_INPUT' },
      { field: 'ce_qui_a_ete_difficile',   label: 'Ce qui a été difficile',     type: 'text', provenance_expected: 'TEACHER_INPUT' },
      { field: 'ajustements_prochaine',    label: 'Ajustements — prochaine fois', type: 'text', provenance_expected: 'TEACHER_INPUT' },
      { field: 'eleves_necessitant_soutien', label: 'Élèves nécessitant soutien', type: 'list', provenance_expected: 'TEACHER_INPUT', never_ai_generated: true },
    ],
    quality_rules: [],
    provenance_requirements: ['TEACHER_INPUT'],
    created_at: '2026-08-17',
  },
]

// ════════════════════════════════════════════════════════════════════════════
// REGISTRY API
// ════════════════════════════════════════════════════════════════════════════

export function getTemplate(id: string): PedagogicalTemplate | undefined {
  return SCORGIA_TEMPLATES.find(t => t.id === id)
}

export function getTemplatesByType(
  type: PedagogicalTemplate['type'],
): PedagogicalTemplate[] {
  return SCORGIA_TEMPLATES.filter(t => t.type === type)
}

export function getTemplatesByJurisdiction(jurisdiction: string): PedagogicalTemplate[] {
  return SCORGIA_TEMPLATES.filter(t => t.jurisdiction === jurisdiction)
}

export function getTemplatesByLangue(langue: string): PedagogicalTemplate[] {
  return SCORGIA_TEMPLATES.filter(t => t.langue === langue)
}

export function getNeverAiGeneratedFields(template: PedagogicalTemplate): string[] {
  return [
    ...template.required_fields.filter(f => f.never_ai_generated).map(f => f.field),
    ...template.optional_fields.filter(f => f.never_ai_generated).map(f => f.field),
  ]
}
