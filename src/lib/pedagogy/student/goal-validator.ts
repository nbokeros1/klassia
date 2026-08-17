// ─── ScorgIA V7.1 — Validateur d'objectifs mesurables ──────────────────────
// Validation déterministe — zéro IA pour évaluer la qualité d'un objectif.
// L'IA peut proposer une reformulation, mais l'enseignant confirme toujours.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  MeasurableGoal,
  ObjectiveValidationResult,
  ObjectiveIssue,
  ObjectiveIssueCode,
} from './types'

// ════════════════════════════════════════════════════════════════════════════
// PATTERNS DE DÉTECTION
// ════════════════════════════════════════════════════════════════════════════

// Phrases trop vagues pour constituer un objectif mesurable
const VAGUE_PATTERNS = [
  /^améliorer\s+sa?\s+\w+$/i,
  /^progresser\s+en\s+\w+$/i,
  /^travailler\s+(sa?\s+)?\w+$/i,
  /^développer\s+sa?\s+\w+$/i,
  /^renforcer\s+sa?\s+\w+$/i,
  /^objectif\s+\d+/i,
  /^stratégie\s+adaptée/i,
  /^besoin\s+particulier/i,
  /^contenu\s+à\s+définir/i,
  /^à\s+compléter/i,
]

// Indicateurs de critère mesurable
const CRITERION_INDICATORS = [
  /\d+\s*%/,                     // "80% du temps"
  /\d+\s+(fois|fois sur|sur\s+\d+)/i, // "3 fois sur 5"
  /avec\s+(un taux de|un score de|une précision de)/i,
  /de\s+façon\s+(autonome|indépendante|consistante)/i,
  /sans\s+(aide|support|rappel)/i,
  /à\s+\d+\s+(reprises|occasions)/i,
  /score\s+(de|minimal)/i,
]

// Indicateurs de contexte/condition
const CONDITION_INDICATORS = [
  /lors\s+(de|des|du|d'une?)/i,
  /pendant\s+(la|les|un|une)/i,
  /en\s+(classe|situation|contexte)/i,
  /durant\s+(la|les|le)/i,
  /lorsque/i,
  /dans\s+le\s+contexte/i,
  /en\s+travail\s+(individuel|de groupe)/i,
  /lors\s+(d'une|des)\s+(évaluation|activité)/i,
]

// Indicateurs de comportement observable
const BEHAVIOR_INDICATORS = [
  // Verbes d'action Observable
  /\b(lire|écrire|compter|calculer|identifier|nommer|décrire|expliquer|démontrer)\b/i,
  /\b(résoudre|compléter|produire|formuler|organiser|planifier|exécuter)\b/i,
  /\b(sélectionner|classer|comparer|construire|utiliser|appliquer|analyser)\b/i,
  /\b(communiquer|présenter|rédiger|corriger|réviser|vérifier|auto-corriger)\b/i,
]

// Indicateurs d'échéance
const TIMEFRAME_INDICATORS = [
  /d'ici\s+(le|la|les|\d)/i,
  /avant\s+(le|la|fin|décembre|janvier|mars|juin)/i,
  /pour\s+(le|la)\s+\d/i,
  /au\s+cours\s+(du|de la|des)\s+(premier|deuxième|troisième)/i,
  /d'ici\s+(une|deux|trois|quatre|six)\s+semaine/i,
  /d'ici\s+(un|deux|trois)\s+(mois|trimestre)/i,
  /pour\s+(la|le)\s+fin\s+(du|de la|d')/i,
  /\b\d{4}-\d{2}-\d{2}\b/,      // ISO date dans la formulation
]

// Placeholders interdits
const GENERIC_PLACEHOLDERS = [
  /^objectif\s+\d+$/i,
  /^stratégie\s+adaptée$/i,
  /^besoin\s+particulier$/i,
  /^activité\s+différenciée$/i,
  /^contenu\s+à\s+définir$/i,
]

// ════════════════════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ════════════════════════════════════════════════════════════════════════════

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(text))
}

function issue(code: ObjectiveIssueCode, message: string): ObjectiveIssue {
  return { code, message }
}

// ════════════════════════════════════════════════════════════════════════════
// VALIDATEUR PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Valide qu'un objectif est suffisamment précis pour être mesurable.
 * Entièrement déterministe — aucun appel IA.
 * L'IA peut ensuite proposer une reformulation, que l'enseignant confirme.
 */
export function validateMeasurableGoal(
  goal: Pick<MeasurableGoal, 'formulation' | 'comportement' | 'condition' | 'critere' | 'echeance'>,
): ObjectiveValidationResult {
  const issues: ObjectiveIssue[] = []
  let score = 0

  const formulation = goal.formulation?.trim() ?? ''
  const comportement = goal.comportement?.trim() ?? ''
  const condition    = goal.condition?.trim() ?? ''
  const critere      = goal.critere?.trim() ?? ''
  const echeance     = goal.echeance?.trim() ?? ''

  // ── Vérification 1 : Placeholder générique ──────────────────────────────
  if (matchesAny(formulation, GENERIC_PLACEHOLDERS)) {
    issues.push(issue(
      'GENERIC_PLACEHOLDER',
      'La formulation est un placeholder générique non acceptable ("Objectif 1", etc.).',
    ))
    return { is_valid: false, score: 0, issues }
  }

  // ── Vérification 2 : Formulation trop vague ─────────────────────────────
  if (formulation.length < 20 || matchesAny(formulation, VAGUE_PATTERNS)) {
    issues.push(issue(
      'OBJECTIVE_TOO_VAGUE',
      'La formulation est trop vague pour être mesurable. '
      + 'Exemple insuffisant : "Améliorer sa lecture." '
      + 'Exemple acceptable : "Lire à voix haute un texte de niveau 4e année avec moins de 5 erreurs en 2 minutes."',
    ))
  } else {
    score++
  }

  // ── Vérification 3 : Comportement observable ────────────────────────────
  const hasBehavior = comportement.length > 5 && matchesAny(comportement, BEHAVIOR_INDICATORS)
  if (!hasBehavior) {
    issues.push(issue(
      'MISSING_BEHAVIOR',
      'Le comportement ou la compétence ciblée n\'est pas formulé avec un verbe d\'action observable '
      + '(ex. : lire, écrire, identifier, calculer, expliquer).',
    ))
  } else {
    score++
  }

  // ── Vérification 4 : Condition / contexte ───────────────────────────────
  const hasCondition = condition.length > 5 && matchesAny(condition, CONDITION_INDICATORS)
  if (!hasCondition) {
    issues.push(issue(
      'MISSING_CONDITION',
      'La condition ou le contexte dans lequel l\'objectif sera mesuré n\'est pas précisé '
      + '(ex. : "lors d\'une lecture individuelle", "pendant un exercice de mathématiques").',
    ))
  } else {
    score++
  }

  // ── Vérification 5 : Critère mesurable ──────────────────────────────────
  const hasCriteria = critere.length > 5 && matchesAny(critere, CRITERION_INDICATORS)
  if (!hasCriteria) {
    issues.push(issue(
      'MISSING_MEASURABLE_CRITERION',
      'Le critère de réussite n\'est pas mesurable. '
      + 'Exemples : "3 fois sur 5", "80% de précision", "de façon autonome sans rappel".',
    ))
  } else {
    score++
  }

  // ── Vérification 6 : Échéance ───────────────────────────────────────────
  const hasTimeframe = echeance.length > 0 && matchesAny(echeance, TIMEFRAME_INDICATORS)
  if (!hasTimeframe) {
    issues.push(issue(
      'MISSING_TIMEFRAME',
      'L\'objectif n\'a pas d\'échéance précise '
      + '(ex. : "d\'ici le 15 décembre 2026", "au cours du 2e trimestre").',
    ))
  } else {
    score++
  }

  const is_valid = issues.length === 0

  const suggestions = is_valid ? undefined : buildSuggestions(issues, goal)

  return { is_valid, score, issues, suggestions }
}

// ════════════════════════════════════════════════════════════════════════════
// SUGGESTIONS DE REFORMULATION (textuelles — à confirmer par enseignant)
// ════════════════════════════════════════════════════════════════════════════

function buildSuggestions(
  issues: ObjectiveIssue[],
  goal: Pick<MeasurableGoal, 'formulation' | 'comportement' | 'condition' | 'critere' | 'echeance'>,
): string[] {
  const tips: string[] = []

  const codes = new Set(issues.map(i => i.code))

  if (codes.has('OBJECTIVE_TOO_VAGUE')) {
    tips.push(
      'Reformulez l\'objectif avec la structure : '
      + '"[Élève] sera capable de [verbe observable] [matière/compétence] [condition] [critère] d\'ici [date]."'
    )
  }
  if (codes.has('MISSING_BEHAVIOR')) {
    tips.push('Choisissez un verbe observable : lire, écrire, calculer, identifier, nommer, expliquer, résoudre…')
  }
  if (codes.has('MISSING_CONDITION')) {
    tips.push('Précisez le contexte : "lors d\'une lecture individuelle", "en situation d\'évaluation", "pendant un travail en groupe".')
  }
  if (codes.has('MISSING_MEASURABLE_CRITERION')) {
    tips.push('Ajoutez un critère mesurable : "avec 80% de précision", "3 fois sur 5", "de façon autonome sans rappel".')
  }
  if (codes.has('MISSING_TIMEFRAME')) {
    tips.push(`Ajoutez une date cible. Par exemple : "d'ici le ${getExampleDate()}".`)
  }

  return tips
}

function getExampleDate(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 3)
  return d.toISOString().slice(0, 10)
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS EXPORTÉS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie rapidement si un texte d'objectif est un placeholder interdit.
 * Utilisé pour bloquer la sauvegarde.
 */
export function isGenericPlaceholder(text: string): boolean {
  return matchesAny(text.trim(), GENERIC_PLACEHOLDERS)
    || matchesAny(text.trim(), VAGUE_PATTERNS)
}

/**
 * Score d'un objectif sur 4 (un point par dimension SMART).
 */
export function scoreGoal(goal: Pick<MeasurableGoal, 'formulation' | 'comportement' | 'condition' | 'critere' | 'echeance'>): number {
  return validateMeasurableGoal(goal).score
}
