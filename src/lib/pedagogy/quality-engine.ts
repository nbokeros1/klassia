// ─── ScorgIA — Pedagogical Quality Engine V7.0 ──────────────────────────────
// Moteur déterministe — zéro IA pour le calcul du score.
// Chaque score produit : status, evidence, missing, warnings, recommendations.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  QualityDimension,
  QualityLevel,
  DimensionResult,
  PedagogicalQualityReport,
  LessonPlanV7,
  LessonPhase,
  SequencePlanV7,
  UnitPlanV7,
  SyllabusV7,
} from './types/index'

// ════════════════════════════════════════════════════════════════════════════
// SEUILS & WEIGHTS
// ════════════════════════════════════════════════════════════════════════════

export function scoreToLevel(score: number): QualityLevel {
  if (score >= 8.5) return 'STRONG'
  if (score >= 6.5) return 'READY'
  if (score >= 4.0) return 'NEEDS_REVIEW'
  return 'NOT_READY'
}

const LESSON_WEIGHTS: Record<QualityDimension, number> = {
  CURRICULUM_ALIGNMENT:   0.20,
  OBJECTIVE_QUALITY:      0.15,
  PEDAGOGICAL_COHERENCE:  0.15,
  ASSESSMENT_ALIGNMENT:   0.15,
  INCLUSION:              0.10,
  DIFFERENTIATION:        0.05,
  LEARNER_ENGAGEMENT:     0.08,
  EVIDENCE_OF_LEARNING:   0.07,
  CONTEXTUALIZATION:      0.05,
  DOCUMENT_COMPLETENESS:  0.00,  // métadonnée — hors score global
}

const SEQUENCE_WEIGHTS: Record<QualityDimension, number> = {
  CURRICULUM_ALIGNMENT:   0.25,
  OBJECTIVE_QUALITY:      0.15,
  PEDAGOGICAL_COHERENCE:  0.20,
  ASSESSMENT_ALIGNMENT:   0.15,
  INCLUSION:              0.10,
  DIFFERENTIATION:        0.05,
  LEARNER_ENGAGEMENT:     0.00,
  EVIDENCE_OF_LEARNING:   0.05,
  CONTEXTUALIZATION:      0.05,
  DOCUMENT_COMPLETENESS:  0.00,
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function hasActionVerb(text: string): boolean {
  return /expliquer|démontrer|analyser|comparer|créer|évaluer|résoudre|identifier|appliquer|décrire|classer|formuler|construire|proposer|justifier|produire|synthétiser|communiquer|rédiger/i
    .test(text)
}

function dim(
  dimension: QualityDimension,
  score: number,
  evidence: string[],
  missing: string[],
  warnings: string[],
  recommendations: string[],
): DimensionResult {
  return { dimension, level: scoreToLevel(score), score, evidence, missing, warnings, recommendations }
}

function weighted(dimensions: DimensionResult[], weights: Record<QualityDimension, number>): number {
  let total = 0
  let sumW  = 0
  for (const d of dimensions) {
    const w = weights[d.dimension] ?? 0
    total += d.score * w
    sumW  += w
  }
  return sumW > 0 ? Math.round((total / sumW) * 10) : 0
}

// ════════════════════════════════════════════════════════════════════════════
// LESSON PLAN ASSESSMENT
// ════════════════════════════════════════════════════════════════════════════

function assessLessonPlan(plan: LessonPlanV7): DimensionResult[] {
  const results: DimensionResult[] = []

  // ── CURRICULUM ALIGNMENT ──────────────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], wa: string[] = [], re: string[] = []

    if (plan.curriculum_outcome_ids && plan.curriculum_outcome_ids.length > 0) {
      ev.push(`${plan.curriculum_outcome_ids.length} RA curriculaire(s) lié(s)`)
    } else {
      mi.push('Aucun RA officiel lié à la leçon')
      re.push('Identifier les RA du programme qui justifient cette leçon')
    }

    if (plan.connaissances && plan.connaissances.length > 0) {
      ev.push('Connaissances spécifiques ciblées')
    } else {
      mi.push('Connaissances cibles non précisées')
    }

    if (plan.habiletes && plan.habiletes.length > 0) {
      ev.push('Habiletés documentées')
    }

    if (plan.competences_pertinentes && plan.competences_pertinentes.length > 0) {
      ev.push('Compétences transversales identifiées')
    }

    const score = ev.length === 0 ? 0 : Math.min(10, 2 + ev.length * 2.5)
    results.push(dim('CURRICULUM_ALIGNMENT', score, ev, mi, wa, re))
  }

  // ── OBJECTIVE QUALITY ─────────────────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], wa: string[] = [], re: string[] = []

    if (plan.objectif_eleve) {
      ev.push('Intention d\'apprentissage présente')
      if (hasActionVerb(plan.objectif_eleve)) {
        ev.push('Verbe action observable détecté')
      } else {
        wa.push('Objectif sans verbe action clair — difficile à observer')
        re.push('Reformuler avec un verbe d\'action observable (expliquer, analyser, démontrer…)')
      }
    } else {
      mi.push('Intention d\'apprentissage manquante')
      re.push('Formuler l\'objectif du point de vue de l\'élève (ex: "L\'élève sera capable de…")')
    }

    if (plan.criteres_reussite && plan.criteres_reussite.length > 0) {
      ev.push(`${plan.criteres_reussite.length} critère(s) de réussite`)
    } else {
      mi.push('Critères de réussite non définis')
      re.push('Ajouter 2–3 critères observables qui confirment l\'atteinte de l\'objectif')
    }

    if (plan.vocabulaire_essentiel && plan.vocabulaire_essentiel.length > 0) {
      ev.push('Vocabulaire essentiel identifié')
    }

    const score = ev.length === 0 ? 1 : ev.length <= 2 ? 5 : ev.length === 3 ? 8 : 9.5
    results.push(dim('OBJECTIVE_QUALITY', score, ev, mi, wa, re))
  }

  // ── PEDAGOGICAL COHERENCE ─────────────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], wa: string[] = [], re: string[] = []
    const phases: Array<[LessonPhase | undefined, string]> = [
      [plan.activation,            'Activation / engagement'],
      [plan.enseignement_explicite,'Enseignement explicite / modélisation'],
      [plan.pratique_guidee,       'Pratique guidée'],
      [plan.pratique_autonome,     'Pratique autonome'],
      [plan.consolidation,         'Consolidation / clôture'],
    ]

    let documented = 0
    for (const [phase, label] of phases) {
      if (phase?.action_enseignant || phase?.action_eleves || phase?.strategie) {
        ev.push(`${label} documentée`)
        documented++
      } else {
        mi.push(`${label} non documentée`)
      }
    }

    if (documented >= 4) {
      if (!plan.consolidation?.action_enseignant) {
        wa.push('Consolidation présente mais sans action définie — prévoir un retour explicite')
      }
    }

    if (documented < 2) re.push('Documenter les phases principales du déroulement')

    const score = Math.min(10, documented * 2)
    results.push(dim('PEDAGOGICAL_COHERENCE', score, ev, mi, wa, re))
  }

  // ── ASSESSMENT ALIGNMENT ──────────────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], wa: string[] = [], re: string[] = []

    if (plan.evaluation?.formative) {
      ev.push('Stratégie d\'évaluation formative définie')
    } else {
      mi.push('Évaluation formative manquante')
      re.push('Prévoir une activité permettant d\'observer la compréhension en cours de leçon')
    }

    if (plan.evaluation?.preuves && plan.evaluation.preuves.length > 0) {
      ev.push('Preuves d\'apprentissage identifiées')
    } else {
      mi.push('Preuves d\'apprentissage non définies')
    }

    if (plan.evaluation?.exit_ticket) {
      ev.push('Billet de sortie prévu')
    } else {
      re.push('Un exit ticket fournit une donnée formative rapide en fin de leçon')
    }

    if (plan.evaluation?.feedback) {
      ev.push('Modalités de rétroaction définies')
    }

    const score = ev.length === 0 ? 1 : ev.length === 1 ? 4 : ev.length === 2 ? 7 : ev.length === 3 ? 8.5 : 10
    results.push(dim('ASSESSMENT_ALIGNMENT', score, ev, mi, wa, re))
  }

  // ── INCLUSION ─────────────────────────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], wa: string[] = [], re: string[] = []

    if (plan.differentiation?.supports_universels && plan.differentiation.supports_universels.length > 0) {
      ev.push('Supports universels (UDL) identifiés')
    } else {
      mi.push('Supports universels non documentés')
      re.push('Identifier des ajustements applicables à tous (UDL — représentation, engagement, expression)')
    }

    if (plan.differentiation?.supports_cibles && plan.differentiation.supports_cibles.length > 0) {
      ev.push('Supports ciblés pour groupes identifiés')
    }

    if (plan.differentiation?.adaptations && plan.differentiation.adaptations.length > 0) {
      ev.push('Adaptations documentées')
    }

    if (plan.barrieres_possibles && plan.barrieres_possibles.length > 0) {
      ev.push('Barrières potentielles anticipées')
    }

    if (plan.misconceptions && plan.misconceptions.length > 0) {
      ev.push('Idées fausses potentielles identifiées')
    }

    const score = ev.length === 0 ? 1 : Math.min(10, 1 + ev.length * 1.8)
    results.push(dim('INCLUSION', score, ev, mi, wa, re))
  }

  // ── DIFFERENTIATION ───────────────────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], wa: string[] = [], re: string[] = []
    const d = plan.differentiation

    const levels = [d?.supports_universels, d?.supports_cibles, d?.adaptations].filter(a => a && a.length > 0).length

    if (levels === 3) ev.push('3 niveaux de différenciation documentés (universel, ciblé, adapté)')
    else if (levels === 2) ev.push('2 niveaux de différenciation présents')
    else if (levels === 1) { ev.push('1 niveau de différenciation présent'); re.push('Compléter avec niveaux ciblés et adaptations') }
    else { mi.push('Aucune différenciation documentée'); re.push('Documenter au moins les supports universels') }

    const score = levels === 3 ? 9.5 : levels === 2 ? 7 : levels === 1 ? 4.5 : 1.5
    results.push(dim('DIFFERENTIATION', score, ev, mi, wa, re))
  }

  // ── LEARNER ENGAGEMENT ────────────────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], wa: string[] = [], re: string[] = []

    if (plan.activation) ev.push('Phase d\'activation présente — connexion aux connaissances antérieures')
    else re.push('Une phase d\'activation améliore l\'engagement et l\'ancrage des apprentissages')

    if (plan.collaboration) ev.push('Phase collaborative prévue')
    if (plan.vocabulaire_essentiel && plan.vocabulaire_essentiel.length > 0) ev.push('Vocabulaire essentiel pré-enseigné')
    if (plan.connaissances_anterieures) ev.push('Connaissances antérieures considérées')

    const score = ev.length === 0 ? 2 : Math.min(10, ev.length * 2.5)
    results.push(dim('LEARNER_ENGAGEMENT', score, ev, mi, wa, re))
  }

  // ── EVIDENCE OF LEARNING ──────────────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], wa: string[] = [], re: string[] = []

    if (plan.evaluation?.preuves && plan.evaluation.preuves.length > 0) ev.push('Preuves d\'apprentissage définies')
    else { mi.push('Preuves d\'apprentissage non précisées'); re.push('Préciser comment l\'apprentissage sera observable') }

    if (plan.evaluation?.exit_ticket) ev.push('Billet de sortie prévu comme preuve de fin de leçon')
    if (plan.reflexion_enseignant !== undefined) ev.push('Espace de réflexion enseignant prévu')
    if (plan.ajustement_prochaine) ev.push('Lien vers ajustement de la prochaine leçon documenté')

    const score = ev.length === 0 ? 1 : Math.min(10, ev.length * 2.5)
    results.push(dim('EVIDENCE_OF_LEARNING', score, ev, mi, wa, re))
  }

  // ── CONTEXTUALIZATION ─────────────────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], wa: string[] = [], re: string[] = []

    if (plan.classe_id) ev.push('Leçon associée à une classe')
    if (plan.matiere) ev.push('Matière précisée')
    if (plan.variante_disciplinaire) ev.push(`Variante disciplinaire : ${plan.variante_disciplinaire}`)
    if (plan.prerequis && plan.prerequis.length > 0) ev.push('Prérequis documentés')
    if (plan.connaissances_anterieures) ev.push('Connaissances antérieures prises en compte')
    if (plan.unite_titre || plan.sequence_titre) ev.push('Contexte séquentiel renseigné')

    const score = ev.length === 0 ? 1 : Math.min(10, ev.length * 1.7)
    results.push(dim('CONTEXTUALIZATION', score, ev, mi, wa, re))
  }

  // ── DOCUMENT COMPLETENESS ─────────────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], wa: string[] = [], re: string[] = []
    const required: Array<[unknown, string]> = [
      [plan.titre,                 'titre'],
      [plan.objectif_eleve,        'objectif_eleve'],
      [plan.curriculum_outcome_ids, 'curriculum_outcome_ids'],
      [plan.duree_minutes,         'duree_minutes'],
    ]

    for (const [val, field] of required) {
      if (val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0)) {
        ev.push(`${field} renseigné`)
      } else {
        mi.push(`${field} manquant`)
      }
    }

    const score = (ev.length / required.length) * 10
    results.push(dim('DOCUMENT_COMPLETENESS', score, ev, mi, wa, re))
  }

  return results
}

// ════════════════════════════════════════════════════════════════════════════
// SEQUENCE PLAN ASSESSMENT
// ════════════════════════════════════════════════════════════════════════════

function assessSequencePlan(seq: SequencePlanV7): DimensionResult[] {
  const results: DimensionResult[] = []

  // CURRICULUM_ALIGNMENT
  {
    const ev: string[] = [], mi: string[] = [], re: string[] = []
    if (seq.curriculum_outcome_ids && seq.curriculum_outcome_ids.length > 0) {
      ev.push(`${seq.curriculum_outcome_ids.length} RA curriculaires liés`)
    } else {
      mi.push('Aucun RA officiel lié à la séquence')
      re.push('Une séquence sans RA ne peut pas être défendue pédagogiquement')
    }
    if (seq.connaissances && seq.connaissances.length > 0) ev.push('Connaissances ciblées')
    if (seq.habiletes && seq.habiletes.length > 0) ev.push('Habiletés ciblées')
    if (seq.comprehensions && seq.comprehensions.length > 0) ev.push('Compréhensions visées')

    const score = ev.length === 0 ? 0 : Math.min(10, 1 + ev.length * 2.5)
    results.push(dim('CURRICULUM_ALIGNMENT', score, ev, mi, [], re))
  }

  // OBJECTIVE_QUALITY
  {
    const ev: string[] = [], mi: string[] = [], re: string[] = []
    if (seq.objectif_sequence) { ev.push('Objectif de séquence défini') }
    else { mi.push('Objectif de séquence manquant'); re.push('Formuler l\'objectif global de la séquence') }
    if (seq.question_essentielle) ev.push('Question essentielle formulée')
    if (seq.criteres_reussite && seq.criteres_reussite.length > 0) ev.push('Critères de réussite définis')

    const score = ev.length === 0 ? 1 : Math.min(10, ev.length * 3.5)
    results.push(dim('OBJECTIVE_QUALITY', score, ev, mi, [], re))
  }

  // PEDAGOGICAL_COHERENCE
  {
    const ev: string[] = [], mi: string[] = [], re: string[] = []
    if (seq.justification_pedagogique) ev.push('Justification pédagogique présente')
    else { mi.push('Justification pédagogique manquante'); re.push('Expliquer POURQUOI ce regroupement de leçons existe') }
    if (seq.acquis_prealables && seq.acquis_prealables.length > 0) ev.push('Acquis préalables documentés')
    if (seq.misconceptions_anticipees && seq.misconceptions_anticipees.length > 0) ev.push('Idées fausses anticipées')
    if (seq.point_depart && seq.point_arrivee) ev.push('Progression explicite (départ → arrivée) définie')

    const score = ev.length === 0 ? 1 : Math.min(10, ev.length * 2.5)
    results.push(dim('PEDAGOGICAL_COHERENCE', score, ev, mi, [], re))
  }

  // ASSESSMENT_ALIGNMENT
  {
    const ev: string[] = [], mi: string[] = [], re: string[] = []
    if (seq.evaluation_formative) ev.push('Évaluation formative planifiée')
    else { mi.push('Évaluation formative non planifiée') }
    if (seq.preuves_recherchees && seq.preuves_recherchees.length > 0) ev.push('Preuves d\'apprentissage attendues définies')
    if (seq.evaluation_sommative) ev.push('Évaluation sommative planifiée')

    const score = ev.length === 0 ? 1 : Math.min(10, ev.length * 3.5)
    results.push(dim('ASSESSMENT_ALIGNMENT', score, ev, mi, [], re))
  }

  // INCLUSION
  {
    const ev: string[] = [], mi: string[] = [], re: string[] = []
    if (seq.supports_universels && seq.supports_universels.length > 0) ev.push('Supports universels identifiés')
    else re.push('Identifier des ajustements universels pour cette séquence')
    if (seq.supports_cibles && seq.supports_cibles.length > 0) ev.push('Supports ciblés')
    if (seq.barrieres_anticipees && seq.barrieres_anticipees.length > 0) ev.push('Barrières anticipées')

    const score = ev.length === 0 ? 1 : Math.min(10, ev.length * 3.5)
    results.push(dim('INCLUSION', score, ev, mi, [], re))
  }

  // Dimensions non applicables à sequence — score neutre
  results.push(dim('DIFFERENTIATION',      5, ['Non évalué à ce niveau'], [], [], []))
  results.push(dim('LEARNER_ENGAGEMENT',   5, ['Non évalué à ce niveau'], [], [], []))

  // EVIDENCE_OF_LEARNING
  {
    const ev: string[] = [], mi: string[] = [], re: string[] = []
    if (seq.preuves_recherchees && seq.preuves_recherchees.length > 0) ev.push('Preuves définies')
    else { mi.push('Aucune preuve d\'apprentissage définie pour la séquence'); re.push('Préciser les preuves qui confirmeront l\'atteinte des objectifs') }

    const score = ev.length > 0 ? 7.5 : 2
    results.push(dim('EVIDENCE_OF_LEARNING', score, ev, mi, [], re))
  }

  // CONTEXTUALIZATION
  {
    const ev: string[] = [], mi: string[] = []
    if (seq.unite_parent_id || seq.unite_numero !== undefined) ev.push('Unité parente référencée')
    if (seq.nb_lecons || (seq.lecon_ids && seq.lecon_ids.length > 0)) ev.push('Leçons référencées')
    if (seq.acquis_prealables && seq.acquis_prealables.length > 0) ev.push('Acquis préalables documentés')

    const score = ev.length === 0 ? 2 : Math.min(10, ev.length * 3.5)
    results.push(dim('CONTEXTUALIZATION', score, ev, mi, [], []))
  }

  // DOCUMENT_COMPLETENESS
  {
    const ev: string[] = [], mi: string[] = []
    const required: Array<[unknown, string]> = [
      [seq.titre,                  'titre'],
      [seq.objectif_sequence,      'objectif_sequence'],
      [seq.curriculum_outcome_ids, 'curriculum_outcome_ids'],
    ]
    for (const [val, field] of required) {
      if (val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0)) {
        ev.push(`${field} renseigné`)
      } else {
        mi.push(`${field} manquant`)
      }
    }
    results.push(dim('DOCUMENT_COMPLETENESS', (ev.length / required.length) * 10, ev, mi, [], []))
  }

  return results
}

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════════════════════

function buildReport(
  document_type: string,
  document_id: string | undefined,
  dimensions: DimensionResult[],
  weights: Record<QualityDimension, number>,
): PedagogicalQualityReport {
  const total_score  = weighted(dimensions, weights)
  const overall_level = scoreToLevel(total_score / 10)

  const critical_gaps = dimensions
    .filter(d => d.level === 'NOT_READY')
    .flatMap(d => d.missing)
    .slice(0, 8)

  const strengths = dimensions
    .filter(d => d.level === 'STRONG')
    .map(d => d.evidence[0])
    .filter((s): s is string => !!s)

  const next_steps = dimensions
    .filter(d => d.level !== 'STRONG')
    .sort((a, b) => (weights[b.dimension] ?? 0) - (weights[a.dimension] ?? 0))
    .flatMap(d => d.recommendations)
    .slice(0, 5)

  return {
    document_type,
    document_id,
    total_score,
    overall_level,
    dimensions,
    critical_gaps,
    strengths,
    next_steps,
    generated_at: new Date().toISOString(),
  }
}

/** Score un plan de leçon V7. Score 0–100, 10 dimensions explicables. */
export function scoreLessonPlan(
  plan: LessonPlanV7,
  document_id?: string,
): PedagogicalQualityReport {
  return buildReport('lesson_plan', document_id, assessLessonPlan(plan), LESSON_WEIGHTS)
}

/** Score un plan de séquence V7. */
export function scoreSequencePlan(
  seq: SequencePlanV7,
  document_id?: string,
): PedagogicalQualityReport {
  return buildReport('sequence_plan', document_id, assessSequencePlan(seq), SEQUENCE_WEIGHTS)
}

/** Score minimal d'un plan d'unité. */
export function scoreUnitPlan(
  unit: UnitPlanV7,
  document_id?: string,
): PedagogicalQualityReport {
  const ev: string[] = [], mi: string[] = [], re: string[] = []

  if (unit.curriculum_outcome_ids && unit.curriculum_outcome_ids.length > 0) ev.push(`${unit.curriculum_outcome_ids.length} RA liés`)
  else { mi.push('Aucun RA officiel lié'); re.push('Une unité doit justifier son existence par des RA curriculaires') }

  if (unit.justification_pedagogique) ev.push('Justification pédagogique présente')
  else re.push('Expliquer POURQUOI cette unité existe dans l\'année')

  if (unit.grandes_idees && unit.grandes_idees.length > 0) ev.push('Grandes idées définies')
  if (unit.preuves_apprentissage_attendues && unit.preuves_apprentissage_attendues.length > 0) ev.push('Preuves d\'apprentissage attendues')
  if (unit.considerations_inclusion && unit.considerations_inclusion.length > 0) ev.push('Considérations d\'inclusion documentées')

  const baseScore = ev.length === 0 ? 10 : Math.min(95, 10 + ev.length * 17)

  const placeholder = dim('CURRICULUM_ALIGNMENT', ev.length > 0 ? Math.min(10, ev.length * 2.5) : 0, ev, mi, [], re)

  return buildReport('unit_plan', document_id, [
    placeholder,
    dim('OBJECTIVE_QUALITY',     unit.questions_directrices ? 8 : 5, [], [], [], []),
    dim('PEDAGOGICAL_COHERENCE', unit.justification_pedagogique ? 9 : 3, [], [], [], []),
    dim('ASSESSMENT_ALIGNMENT',  unit.evaluations_majeures_prevues ? 8 : 4, [], [], [], []),
    dim('INCLUSION',             unit.considerations_inclusion ? 8 : 3, [], [], [], []),
    dim('DIFFERENTIATION',       5, [], [], [], []),
    dim('LEARNER_ENGAGEMENT',    5, [], [], [], []),
    dim('EVIDENCE_OF_LEARNING',  unit.preuves_apprentissage_attendues ? 8 : 3, [], [], [], []),
    dim('CONTEXTUALIZATION',     unit.ressources_principales ? 7 : 4, [], [], [], []),
    dim('DOCUMENT_COMPLETENESS', unit.titre ? 9 : 2, [], [], [], []),
  ], SEQUENCE_WEIGHTS)
}

/** Vérifie le syllabus V7 — contrôle de provenance. */
export function validateSyllabusProvenance(syllabus: SyllabusV7): {
  fields_missing:           string[]
  school_policy_required:   string[]
  never_ai_generated:       string[]
  warnings:                 string[]
} {
  const fields_missing:         string[] = []
  const school_policy_required: string[] = []
  const never_ai_generated:     string[] = []
  const warnings:               string[] = []

  const policyFields: string[] = ['politique_absences', 'politique_remise_tardive', 'integrite_academique', 'utilisation_ia', 'coordonnees_urgence', 'elements_specifiques_ecole']

  for (const field of policyFields) {
    const val = (syllabus as Record<string, unknown>)[field]
    const prov = syllabus.provenance_champs?.[field]

    if (!val) {
      if (field === 'coordonnees_urgence' || field === 'elements_specifiques_ecole') {
        fields_missing.push(field)
      } else {
        school_policy_required.push(field)
      }
    } else if (prov === 'AI_GENERATED') {
      never_ai_generated.push(field)
      warnings.push(`⚠ ${field} marqué AI_GENERATED — ScorgIA ne génère jamais les politiques scolaires`)
    }
  }

  if (!syllabus.enseignant?.courriel && !syllabus.provenance_champs?.['enseignant.courriel']) {
    fields_missing.push('enseignant.courriel')
  }

  return { fields_missing, school_policy_required, never_ai_generated, warnings }
}
