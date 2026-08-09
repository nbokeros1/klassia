// ─── Entitlements bêta — ScorgIA Teaching Pack ────────────────────────────────
// Définit ce qui est inclus dans le Teaching Pack selon le forfait.
// Séparé de useForfait pour permettre une configuration indépendante de la bêta.
// Modifier ici pour ajuster les limites sans toucher au reste de l'application.

import type { ForfaitType } from '@/lib/types/database'

// ─── Type d'entitlement ───────────────────────────────────────────────────────

export type BetaEntitlement = {
  /** L'enseignant peut démarrer le wizard "Construire mon année" */
  build_year_access: boolean
  /** Génération du syllabus */
  syllabus: boolean
  /** Génération du plan annuel complet */
  annual_plan: boolean
  /** Toutes les séquences structurées (squelette : titre, semaines, objectifs) */
  all_sequences_structured: boolean
  /** Plans de leçon structurés de la première séquence */
  first_sequence_lesson_plans: boolean
  /** Première leçon entièrement développée (contenu complet) */
  first_lesson_complete: boolean
  /** Quiz complet associé à la première leçon */
  first_lesson_quiz: boolean
  /** Toutes les autres leçons entièrement développées */
  all_lessons_complete: boolean
  /** Quiz complets supplémentaires */
  additional_quizzes: boolean
  /** Évaluations sommatives complètes */
  full_evaluations: boolean
  /** Adaptation dynamique illimitée du plan */
  unlimited_adaptation: boolean
}

// ─── Matrice bêta par forfait ─────────────────────────────────────────────────
// Ces droits s'appliquent UNIQUEMENT au parcours "Construire mon année scolaire".
// Ils sont indépendants du système useForfait existant.

export const BETA_ENTITLEMENTS: Record<ForfaitType, BetaEntitlement> = {
  gratuit: {
    build_year_access:             true,  // GRATUIT en bêta — promesse ScorgIA
    syllabus:                      true,
    annual_plan:                   true,
    all_sequences_structured:      true,
    first_sequence_lesson_plans:   true,
    first_lesson_complete:         true,
    first_lesson_quiz:             true,
    all_lessons_complete:          false, // verrouillé
    additional_quizzes:            false,
    full_evaluations:              false,
    unlimited_adaptation:          false,
  },
  pro: {
    build_year_access:             true,
    syllabus:                      true,
    annual_plan:                   true,
    all_sequences_structured:      true,
    first_sequence_lesson_plans:   true,
    first_lesson_complete:         true,
    first_lesson_quiz:             true,
    all_lessons_complete:          true,
    additional_quizzes:            true,
    full_evaluations:              true,
    unlimited_adaptation:          true,
  },
  pro_plus: {
    build_year_access:             true,
    syllabus:                      true,
    annual_plan:                   true,
    all_sequences_structured:      true,
    first_sequence_lesson_plans:   true,
    first_lesson_complete:         true,
    first_lesson_quiz:             true,
    all_lessons_complete:          true,
    additional_quizzes:            true,
    full_evaluations:              true,
    unlimited_adaptation:          true,
  },
  institution: {
    build_year_access:             true,
    syllabus:                      true,
    annual_plan:                   true,
    all_sequences_structured:      true,
    first_sequence_lesson_plans:   true,
    first_lesson_complete:         true,
    first_lesson_quiz:             true,
    all_lessons_complete:          true,
    additional_quizzes:            true,
    full_evaluations:              true,
    unlimited_adaptation:          true,
  },
}

// ─── Helper ────────────────────────────────────────────────────────────────────

export function getBetaEntitlement(forfait: ForfaitType | undefined): BetaEntitlement {
  return BETA_ENTITLEMENTS[forfait ?? 'gratuit']
}

// Messages d'explication pour les éléments verrouillés
export const LOCKED_MESSAGES: Partial<Record<keyof BetaEntitlement, string>> = {
  all_lessons_complete:   "Le développement complet de toutes les leçons sera disponible selon votre forfait.",
  additional_quizzes:     "Les quiz supplémentaires seront disponibles selon votre forfait.",
  full_evaluations:       "Les évaluations complètes supplémentaires seront disponibles selon votre forfait.",
  unlimited_adaptation:   "L'adaptation dynamique illimitée sera disponible selon votre forfait.",
}

// Résumé lisible de ce que reçoit l'utilisateur (pour l'étape 5 du wizard)
export function getEntitlementSummary(forfait: ForfaitType | undefined): {
  inclus: string[]
  verrouille: string[]
} {
  const e = getBetaEntitlement(forfait)
  const inclus: string[] = []
  const verrouille: string[] = []

  if (e.syllabus)                    inclus.push("Syllabus complet")
  if (e.annual_plan)                 inclus.push("Plan annuel complet")
  if (e.all_sequences_structured)    inclus.push("Toutes les séquences structurées")
  if (e.first_sequence_lesson_plans) inclus.push("Plans de leçon de la 1re séquence (structure)")
  if (e.first_lesson_complete)       inclus.push("1re leçon entièrement développée")
  if (e.first_lesson_quiz)           inclus.push("Quiz complet de la 1re leçon")

  if (!e.all_lessons_complete)  verrouille.push("Développement complet des autres leçons")
  if (!e.additional_quizzes)    verrouille.push("Quiz supplémentaires")
  if (!e.full_evaluations)      verrouille.push("Évaluations sommatives complètes")
  if (!e.unlimited_adaptation)  verrouille.push("Adaptation dynamique illimitée")

  return { inclus, verrouille }
}
