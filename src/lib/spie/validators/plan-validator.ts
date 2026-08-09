// SPIE — Plan Validator
// Validates AnnualPlan, SequencePlan, and LessonPlan objects
// before they are saved or delivered to the teacher.

import type { AnnualPlan, SequencePlan, LessonPlan } from '../types/planning'

export interface PlanValidationError {
  field: string
  severity: 'erreur' | 'avertissement'
  message: string
}

export interface PlanValidationResult {
  valid: boolean
  errors: PlanValidationError[]
  warnings: PlanValidationError[]
}

// ─── Lesson Plan Validator ─────────────────────────────────────────────────────

export function validateLessonPlan(plan: LessonPlan): PlanValidationResult {
  const errors: PlanValidationError[] = []
  const warnings: PlanValidationError[] = []

  if (!plan.header.titre?.trim()) {
    errors.push({ field: 'header.titre', severity: 'erreur', message: 'Le titre est obligatoire' })
  }
  if (!plan.header.niveau?.trim()) {
    errors.push({ field: 'header.niveau', severity: 'erreur', message: 'Le niveau est obligatoire' })
  }
  if (!plan.header.matiere?.trim()) {
    errors.push({ field: 'header.matiere', severity: 'erreur', message: 'La matière est obligatoire' })
  }
  if (!plan.header.duree_minutes || plan.header.duree_minutes < 5) {
    errors.push({ field: 'header.duree_minutes', severity: 'erreur', message: 'Durée invalide (minimum 5 minutes)' })
  }
  if (!plan.classeId) {
    errors.push({ field: 'classeId', severity: 'erreur', message: 'classeId est obligatoire' })
  }
  if (!plan.enseignantId) {
    errors.push({ field: 'enseignantId', severity: 'erreur', message: 'enseignantId est obligatoire' })
  }

  // Curriculum alignment check
  const hasOutcomes =
    plan.content.outcomesSpecifiquesIds && plan.content.outcomesSpecifiquesIds.length > 0
  const hasProvincialOutcomes =
    plan.content.rag ||
    plan.content.ras ||
    plan.content.attentes_curriculum ||
    (plan.content.competences_disciplinaires && plan.content.competences_disciplinaires.length > 0)

  if (!hasOutcomes && !hasProvincialOutcomes) {
    warnings.push({
      field: 'content.outcomesSpecifiquesIds',
      severity: 'avertissement',
      message: 'Aucun résultat d\'apprentissage lié — alignement curriculaire non vérifiable',
    })
  }

  // Phase completeness
  if (!plan.content.avant?.amorce && !plan.content.avant?.connexion) {
    warnings.push({
      field: 'content.avant',
      severity: 'avertissement',
      message: 'Phase AVANT vide — l\'amorce est recommandée',
    })
  }
  if (!plan.content.pendant?.modelisation) {
    warnings.push({
      field: 'content.pendant.modelisation',
      severity: 'avertissement',
      message: 'Modélisation manquante dans la phase PENDANT',
    })
  }

  return { valid: errors.length === 0, errors, warnings }
}

// ─── Sequence Plan Validator ───────────────────────────────────────────────────

export function validateSequencePlan(plan: SequencePlan): PlanValidationResult {
  const errors: PlanValidationError[] = []
  const warnings: PlanValidationError[] = []

  if (!plan.titre?.trim()) {
    errors.push({ field: 'titre', severity: 'erreur', message: 'Le titre de la séquence est obligatoire' })
  }
  if (!plan.annualPlanId) {
    errors.push({ field: 'annualPlanId', severity: 'erreur', message: 'annualPlanId est obligatoire' })
  }
  if (!plan.duree_semaines || plan.duree_semaines < 1) {
    errors.push({ field: 'duree_semaines', severity: 'erreur', message: 'Durée invalide (minimum 1 semaine)' })
  }
  if (plan.outcomesGenerauxIds.length === 0) {
    warnings.push({
      field: 'outcomesGenerauxIds',
      severity: 'avertissement',
      message: 'Aucun résultat général lié à cette séquence',
    })
  }

  return { valid: errors.length === 0, errors, warnings }
}

// ─── Annual Plan Validator ─────────────────────────────────────────────────────

export function validateAnnualPlan(plan: AnnualPlan): PlanValidationResult {
  const errors: PlanValidationError[] = []
  const warnings: PlanValidationError[] = []

  if (!plan.titre?.trim()) {
    errors.push({ field: 'titre', severity: 'erreur', message: 'Le titre du plan annuel est obligatoire' })
  }
  if (!plan.classeId) {
    errors.push({ field: 'classeId', severity: 'erreur', message: 'classeId est obligatoire' })
  }
  if (!plan.curriculumId) {
    errors.push({ field: 'curriculumId', severity: 'erreur', message: 'curriculumId est obligatoire' })
  }
  if (!plan.anneeScolaire?.match(/^\d{4}-\d{4}$/)) {
    errors.push({ field: 'anneeScolaire', severity: 'erreur', message: 'anneeScolaire doit être au format YYYY-YYYY' })
  }
  if (plan.sequences.length === 0) {
    warnings.push({
      field: 'sequences',
      severity: 'avertissement',
      message: 'Aucune séquence dans ce plan annuel',
    })
  }
  if (plan.meta.coveragePercent < 80) {
    warnings.push({
      field: 'meta.coveragePercent',
      severity: 'avertissement',
      message: `Couverture curriculaire insuffisante (${plan.meta.coveragePercent}% — recommandé: ≥80%)`,
    })
  }

  return { valid: errors.length === 0, errors, warnings }
}
