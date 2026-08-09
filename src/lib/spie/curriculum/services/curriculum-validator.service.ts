// SPIE-02 — Curriculum Validator Service

import type { CurriculumExtractionRaw } from '../extraction/types'
import type { NormalizedOutcome, NormalizedConcept } from '../extraction/types'
import type { DataQualityReport } from '../validation/types'
import { curriculumQualityValidator } from '../validation/curriculum-quality'

export class CurriculumValidatorService {
  validate(
    raw: CurriculumExtractionRaw,
    outcomes: NormalizedOutcome[],
    concepts: NormalizedConcept[],
  ): DataQualityReport {
    return curriculumQualityValidator.validate(raw, outcomes, concepts)
  }

  isReadyForGeneration(report: DataQualityReport): boolean {
    return report.validPourGeneration
  }

  summarize(report: DataQualityReport): string {
    const lines = [
      `Score qualité: ${report.score}/100`,
      `Outcomes généraux: ${report.stats.nbOutcomesGeneraux}`,
      `Outcomes spécifiques: ${report.stats.nbOutcomesSpecifiques}`,
      `Concepts: ${report.stats.nbConcepts}`,
      `Vocabulaire: ${report.stats.nbVocabulaire}`,
    ]
    const erreurs = report.issues.filter(i => i.severity === 'erreur')
    const avertissements = report.issues.filter(i => i.severity === 'avertissement')
    if (erreurs.length > 0) lines.push(`⛔ ${erreurs.length} erreur(s)`)
    if (avertissements.length > 0) lines.push(`⚠️ ${avertissements.length} avertissement(s)`)
    if (report.validPourGeneration) lines.push('✅ Prêt pour génération')
    else lines.push('❌ Non prêt pour génération')
    return lines.join('\n')
  }
}

export const curriculumValidatorService = new CurriculumValidatorService()
