// ─── ScorgIA V7.1 — Differentiation Engine Foundation (Mission 11) ─────────
// Génère des recommandations de différenciation basées sur :
//   - Le plan de leçon (LessonPlanV7)
//   - Le contexte de classe (ClassPedagogicalContext)
//   - Le curriculum (curriculum_outcome_ids)
//
// RÈGLES :
//   - Chaque recommandation est identifiable comme suggestion ScorgIA
//   - teacher_confirmation_required = true pour tout ce qui touche des élèves
//   - Pas d'application automatique
//   - Labels pédagogiques neutres — jamais "élèves faibles / forts"
// ─────────────────────────────────────────────────────────────────────────────

import type { LessonPlanV7 } from '../types/index'
import type { ClassPedagogicalContext } from '../classroom/class-context'

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export type DifferentiationCategory =
  | 'CONTENT'          // Quoi apprendre — adapter le niveau de complexité
  | 'PROCESS'          // Comment apprendre — varier les processus cognitifs
  | 'PRODUCT'          // Comment démontrer — varier les productions
  | 'ENVIRONMENT'      // Où apprendre — adapter l'espace
  | 'TIME'             // Rythme — adapter le temps disponible
  | 'SCAFFOLDING'      // Étayage — supports graduels
  | 'REPRESENTATION'   // UDL — multiple moyens de représentation
  | 'ENGAGEMENT'       // UDL — multiple moyens d'engagement
  | 'ASSESSMENT_ACCESS'// Accès à l'évaluation — pas réduction des attentes

export type DifferentiationTarget =
  | 'UNIVERSAL'        // Pour toute la classe
  | 'GROUP'            // Pour un sous-groupe (pas nominatif)
  | 'INDIVIDUAL'       // Pour un élève spécifique (décision enseignant)

export type DifferentiationRecommendation = {
  id:                          string
  category:                    DifferentiationCategory
  reason:                      string             // Pourquoi cette recommandation
  target:                      DifferentiationTarget
  target_description?:         string             // Description neutre du groupe ciblé
  recommendation:              string             // La recommandation concrète
  implementation_examples:     string[]           // Exemples pratiques
  evidence_source:             string             // UDL guideline, TQS, recherche
  teacher_confirmation_required: true             // TOUJOURS true
  ai_source_type:              'AI_SUGGESTION'    // TOUJOURS AI_SUGGESTION
  priority:                    'haute' | 'moderee' | 'faible'
}

export type DifferentiationReport = {
  lesson_titre:    string
  classe_ref:      string
  generated_at:    string
  recommendations: DifferentiationRecommendation[]
  disclaimer:      string
  nb_universal:    number
  nb_group:        number
  nb_individual:   number
}

// ════════════════════════════════════════════════════════════════════════════
// BIBLIOTHÈQUE DE STRATÉGIES
// ════════════════════════════════════════════════════════════════════════════

type StrategyTemplate = {
  id:          string
  category:    DifferentiationCategory
  target:      DifferentiationTarget
  trigger:     (lesson: LessonPlanV7, ctx: ClassPedagogicalContext) => boolean
  recommendation: string
  examples:    string[]
  evidence:    string
  priority:    'haute' | 'moderee' | 'faible'
  reason_fn:  (lesson: LessonPlanV7, ctx: ClassPedagogicalContext) => string
}

const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  // ── UNIVERSAL — Représentation multiple ──────────────────────────────────
  {
    id: 'rep-visual',
    category: 'REPRESENTATION',
    target: 'UNIVERSAL',
    trigger: (_, ctx) => ctx.indicateurs_planification.necessite_supports_visuels,
    recommendation: 'Ajouter des supports visuels (schémas, tableaux, infographies) pour accompagner les consignes orales et les explications.',
    examples: [
      'Afficher les étapes de la tâche au tableau',
      'Fournir un schéma du concept clé',
      'Utiliser des codes couleurs pour les étapes',
    ],
    evidence: 'UDL Guideline 1.1 — Offer alternatives for visual information',
    priority: 'haute',
    reason_fn: (_, ctx) =>
      `${ctx.indicateurs_planification.necessite_supports_visuels ? ctx.nb_soutien_cible + ' élèves bénéficient' : 'Plusieurs élèves bénéficieraient'} de supports visuels selon les données de classe.`,
  },
  {
    id: 'rep-fractioned',
    category: 'PROCESS',
    target: 'UNIVERSAL',
    trigger: (_, ctx) => ctx.indicateurs_planification.necessite_instructions_fractionnees,
    recommendation: 'Fractionner les consignes complexes en étapes séquentielles numérotées. Vérifier la compréhension après chaque étape avant de passer à la suivante.',
    examples: [
      'Distribuer une fiche "Étapes 1-2-3" plutôt qu\'une consigne longue',
      'Vérification orale après chaque étape',
      'Afficher une seule consigne à la fois au TBI',
    ],
    evidence: 'UDL Guideline 3.2 — Optimize relevance, value, and authenticity; TQS-2.2',
    priority: 'haute',
    reason_fn: (_, ctx) =>
      `Présence de besoins attentionnels déclarés dans la classe (${ctx.nb_soutien_cible} élèves avec soutien ciblé).`,
  },
  {
    id: 'engage-choice',
    category: 'ENGAGEMENT',
    target: 'UNIVERSAL',
    trigger: () => true,
    recommendation: 'Offrir un choix dans la modalité de démonstration des apprentissages (ex. : texte, schéma, présentation orale, création numérique).',
    examples: [
      'Menu d\'options pour la tâche finale',
      'Choix entre travail individuel ou en dyade',
      'Choix du support de communication',
    ],
    evidence: 'UDL Guideline 7.1 — Optimize individual choice and autonomy',
    priority: 'moderee',
    reason_fn: () => 'Recommandation universelle — augmente l\'engagement et l\'autonomie pour tous les élèves.',
  },

  // ── CIBLÉ — Pour sous-groupes ─────────────────────────────────────────────
  {
    id: 'scaffold-reading',
    category: 'SCAFFOLDING',
    target: 'GROUP',
    trigger: (lesson, ctx) =>
      ctx.besoins_agreges.some(b => b.domaine.toLowerCase().includes('lecture') && b.nb_eleves >= 2),
    recommendation: 'Préparer une version du texte avec vocabulaire simplifié ou glossaire intégré pour les élèves qui en ont besoin.',
    examples: [
      'Texte avec définitions en marge',
      'Version du document avec phrases plus courtes',
      'Questions de lecture guidée',
    ],
    evidence: 'UDL Guideline 2.1 — Clarify vocabulary and symbols',
    priority: 'haute',
    reason_fn: (_, ctx) => {
      const b = ctx.besoins_agreges.find(b => b.domaine.toLowerCase().includes('lecture'))
      return `${b?.nb_eleves ?? 'Plusieurs'} élève(s) présentent des besoins déclarés en lecture.`
    },
  },
  {
    id: 'time-extension',
    category: 'TIME',
    target: 'GROUP',
    trigger: (_, ctx) => ctx.indicateurs_planification.necessite_temps_supplementaire,
    recommendation: 'Planifier du temps supplémentaire pour certains élèves lors des tâches d\'évaluation ou de pratique autonome.',
    examples: [
      'Prévoir une période de retour pour les élèves qui en ont besoin',
      'Activité de prolongement pour les élèves rapides',
      'Temps de travail flexible selon le rythme individuel',
    ],
    evidence: 'Alberta TQS-2.2 — Differentiating instruction to meet student needs',
    priority: 'moderee',
    reason_fn: () => 'Accommodation "temps supplémentaire" présente dans les plans de classe.',
  },

  // ── ASSESSMENT ACCESS ─────────────────────────────────────────────────────
  {
    id: 'assess-alt-format',
    category: 'ASSESSMENT_ACCESS',
    target: 'GROUP',
    trigger: (lesson, _) => !!lesson.evaluation,
    recommendation: 'Vérifier que l\'évaluation prévue permet plusieurs modalités de réponse (oral, écrit, pratique) pour ne pas mesurer les accommodations plutôt que les apprentissages.',
    examples: [
      'Option de réponse orale pour les élèves avec accommodation en lecture',
      'Évaluation en deux temps si nécessaire',
      'Consignes simplifiées mais pas les attentes réduites',
    ],
    evidence: 'Alberta TQS-2.3 — Using assessment to inform instruction',
    priority: 'moderee',
    reason_fn: () => 'Cette leçon inclut une composante d\'évaluation — vérifier l\'accès équitable.',
  },

  // ── ENVIRONNEMENT ─────────────────────────────────────────────────────────
  {
    id: 'env-quiet',
    category: 'ENVIRONMENT',
    target: 'GROUP',
    trigger: (_, ctx) => ctx.indicateurs_planification.necessite_environnement_calme,
    recommendation: 'Identifier une zone calme dans la classe pour les élèves qui en ont besoin lors des tâches de pratique autonome.',
    examples: [
      'Coin lecture / travail silencieux désigné',
      'Casques anti-bruit disponibles',
      'Signal visuel "zone de concentration"',
    ],
    evidence: 'UDL Guideline 9.3 — Develop self-assessment and reflection',
    priority: 'moderee',
    reason_fn: () => 'Accommodation "environnement calme" présente dans les plans de classe.',
  },

  // ── CONTENT — Extensions ─────────────────────────────────────────────────
  {
    id: 'content-extension',
    category: 'CONTENT',
    target: 'GROUP',
    trigger: (lesson) => !!(lesson.curriculum_outcome_ids && lesson.curriculum_outcome_ids.length > 0),
    recommendation: 'Préparer une tâche d\'extension pour les élèves qui maîtrisent rapidement les objectifs — élargir la complexité sans passer au contenu du niveau suivant.',
    examples: [
      'Problème ouvert lié aux mêmes RA',
      'Connexion avec un autre domaine du curriculum',
      'Projet de création autonome sur le même concept',
    ],
    evidence: 'Alberta TQS-2.2 — Meeting the needs of all students, including gifted',
    priority: 'faible',
    reason_fn: () => 'Recommandation proactive — prévoir une extension évite le temps inoccupé improductif.',
  },
]

// ════════════════════════════════════════════════════════════════════════════
// MOTEUR PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

let recId = 0
function nextId(): string {
  return `diff-rec-${++recId}`
}

/**
 * Génère des recommandations de différenciation pour une leçon donnée.
 * Toutes les recommandations sont des suggestions IA — aucune n'est appliquée automatiquement.
 */
export function generateDifferentiationRecommendations(
  lesson: LessonPlanV7,
  ctx:    ClassPedagogicalContext,
): DifferentiationReport {
  const recommendations: DifferentiationRecommendation[] = []

  for (const template of STRATEGY_TEMPLATES) {
    if (!template.trigger(lesson, ctx)) continue

    recommendations.push({
      id:                          nextId(),
      category:                    template.category,
      reason:                      template.reason_fn(lesson, ctx),
      target:                      template.target,
      target_description:          describeTarget(template.target, ctx),
      recommendation:              template.recommendation,
      implementation_examples:     template.examples,
      evidence_source:             template.evidence,
      teacher_confirmation_required: true,
      ai_source_type:              'AI_SUGGESTION',
      priority:                    template.priority,
    })
  }

  // Trier par priorité
  const order = { haute: 0, moderee: 1, faible: 2 }
  recommendations.sort((a, b) => order[a.priority] - order[b.priority])

  return {
    lesson_titre:    lesson.titre,
    classe_ref:      ctx.classe_ref,
    generated_at:    new Date().toISOString(),
    recommendations,
    disclaimer:      DIFFERENTIATION_DISCLAIMER,
    nb_universal:    recommendations.filter(r => r.target === 'UNIVERSAL').length,
    nb_group:        recommendations.filter(r => r.target === 'GROUP').length,
    nb_individual:   recommendations.filter(r => r.target === 'INDIVIDUAL').length,
  }
}

function describeTarget(
  target: DifferentiationTarget,
  ctx: ClassPedagogicalContext,
): string {
  switch (target) {
    case 'UNIVERSAL':
      return `Toute la classe (${ctx.effectif_total} élèves)`
    case 'GROUP':
      return `Sous-groupe d'élèves — voir plans de soutien actifs (${ctx.nb_soutien_cible} élèves)`
    case 'INDIVIDUAL':
      return 'Élève spécifique — à identifier par l\'enseignant selon le contexte'
  }
}

const DIFFERENTIATION_DISCLAIMER =
  'Recommandations générées par ScorgIA — source : AI_SUGGESTION. '
  + 'Toutes les recommandations doivent être confirmées par l\'enseignant. '
  + 'Ces suggestions ne constituent pas un plan d\'intervention individualisé. '
  + 'Elles sont basées sur des données agrégées de classe — aucune donnée individuelle nominative n\'a été utilisée.'
