// SPIE — Curriculum Validator
// Validates CurriculumExtraction completeness and consistency.
// Used by CKG after extraction to determine quality.

import type { CurriculumExtraction } from '../types/curriculum'

export interface CurriculumValidationError {
  field: string
  severity: 'erreur' | 'avertissement' | 'info'
  message: string
}

export interface CurriculumValidationResult {
  valid: boolean
  errors: CurriculumValidationError[]
  warnings: CurriculumValidationError[]
  scoreCompletude: number       // 0–100
}

export function validateCurriculumExtraction(
  extraction: CurriculumExtraction,
): CurriculumValidationResult {
  const errors: CurriculumValidationError[] = []
  const warnings: CurriculumValidationError[] = []

  // Required fields
  if (!extraction.curriculumId) {
    errors.push({ field: 'curriculumId', severity: 'erreur', message: 'curriculumId est obligatoire' })
  }
  if (!extraction.matiere) {
    errors.push({ field: 'matiere', severity: 'erreur', message: 'matiere est obligatoire' })
  }
  if (!extraction.niveaux || extraction.niveaux.length === 0) {
    errors.push({ field: 'niveaux', severity: 'erreur', message: 'Au moins un niveau est obligatoire' })
  }

  // Quality warnings
  if (extraction.outcomesGenerauxIds.length === 0) {
    errors.push({
      field: 'outcomesGenerauxIds',
      severity: 'erreur',
      message: 'Aucun résultat d\'apprentissage général extrait — extraction invalide',
    })
  }
  if (extraction.outcomesSpecifiquesIds.length === 0) {
    errors.push({
      field: 'outcomesSpecifiquesIds',
      severity: 'erreur',
      message: 'Aucun résultat d\'apprentissage spécifique extrait — extraction invalide',
    })
  }
  if (extraction.competencesIds.length === 0) {
    warnings.push({
      field: 'competencesIds',
      severity: 'avertissement',
      message: 'Aucune compétence extraite — certaines provinces l\'exigent',
    })
  }
  if (extraction.conceptsIds.length === 0) {
    warnings.push({
      field: 'conceptsIds',
      severity: 'avertissement',
      message: 'Aucun concept extrait — la génération sera moins précise',
    })
  }
  if (extraction.stats.scoreConfiance < 50) {
    errors.push({
      field: 'stats.scoreConfiance',
      severity: 'erreur',
      message: `Score de confiance trop bas (${extraction.stats.scoreConfiance}/100) — re-extraire avec un meilleur document`,
    })
  } else if (extraction.stats.scoreConfiance < 70) {
    warnings.push({
      field: 'stats.scoreConfiance',
      severity: 'avertissement',
      message: `Score de confiance moyen (${extraction.stats.scoreConfiance}/100) — vérifier manuellement`,
    })
  }

  // Completeness score
  const fields = [
    extraction.outcomesGenerauxIds.length > 0,
    extraction.outcomesSpecifiquesIds.length > 0,
    extraction.competencesIds.length > 0,
    extraction.conceptsIds.length > 0,
    extraction.vocabulaireIds.length > 0,
    extraction.stats.scoreConfiance >= 70,
  ]
  const scoreCompletude = Math.round((fields.filter(Boolean).length / fields.length) * 100)

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    scoreCompletude,
  }
}
