// SPIE-02 — Curriculum quality validator
// Checks the extracted curriculum data for completeness and coherence.

import type { DataQualityReport, DataQualityIssue, DataQualityDimension } from './types'
import type { CurriculumExtractionRaw } from '../extraction/types'
import type { NormalizedOutcome, NormalizedConcept } from '../extraction/types'

let issueIndex = 0
function makeIssueId(): string {
  return `qi_${++issueIndex}`
}

export class CurriculumQualityValidator {
  validate(
    raw: CurriculumExtractionRaw,
    outcomes: NormalizedOutcome[],
    concepts: NormalizedConcept[],
  ): DataQualityReport {
    const issues: DataQualityIssue[] = []
    const outcomesGeneraux = outcomes.filter(o => !o.parentId)
    const outcomesSpecifiques = outcomes.filter(o => !!o.parentId)

    // ── Complétude ─────────────────────────────────────────────────────────────
    if (!raw.province) {
      issues.push({
        id: makeIssueId(), dimension: 'completude', severity: 'avertissement',
        message: 'Province non identifiée dans le document.',
        suggestion: 'Spécifier la province lors de l\'import.',
      })
    }
    if (!raw.matiere) {
      issues.push({
        id: makeIssueId(), dimension: 'completude', severity: 'erreur',
        message: 'Matière non identifiée.',
        suggestion: 'Vérifier que le document curriculum mentionne explicitement la matière.',
      })
    }
    if (outcomes.length === 0) {
      issues.push({
        id: makeIssueId(), dimension: 'completude', severity: 'erreur',
        message: 'Aucun résultat d\'apprentissage extrait.',
        suggestion: 'Le document ne contient peut-être pas un curriculum structuré.',
      })
    }
    if (outcomesGeneraux.length === 0 && outcomesSpecifiques.length > 0) {
      issues.push({
        id: makeIssueId(), dimension: 'completude', severity: 'avertissement',
        message: 'Résultats spécifiques détectés mais aucun résultat général.',
        suggestion: 'Vérifier la hiérarchie du curriculum.',
      })
    }
    if (raw.vocabulaire.length === 0 && raw.concepts.length === 0) {
      issues.push({
        id: makeIssueId(), dimension: 'completude', severity: 'info',
        message: 'Aucun vocabulaire ni concept extrait.',
        suggestion: 'Le curriculum peut ne pas inclure de glossaire explicite.',
      })
    }

    // ── Cohérence ──────────────────────────────────────────────────────────────
    for (const spec of outcomesSpecifiques) {
      if (spec.parentId && !outcomes.find(o => o.id === spec.parentId)) {
        issues.push({
          id: makeIssueId(), dimension: 'coherence', severity: 'erreur',
          message: `Résultat spécifique "${spec.code ?? spec.id}" référence un parent inconnu "${spec.parentId}".`,
          elementId: spec.id, elementType: 'outcome_specifique',
        })
      }
    }

    // ── Hiérarchie ─────────────────────────────────────────────────────────────
    const avgSpecifiquesPerGeneral = outcomesGeneraux.length > 0
      ? outcomesSpecifiques.length / outcomesGeneraux.length
      : 0
    if (outcomesGeneraux.length > 0 && avgSpecifiquesPerGeneral < 1) {
      issues.push({
        id: makeIssueId(), dimension: 'hierarchie', severity: 'avertissement',
        message: `Ratio résultats généraux/spécifiques faible (${avgSpecifiquesPerGeneral.toFixed(1)} spécifiques par général).`,
        suggestion: 'Certains résultats généraux n\'ont pas de résultats spécifiques associés.',
      })
    }

    // ── Bloom ──────────────────────────────────────────────────────────────────
    const nbAvecBloom = outcomes.filter(o => o.niveauBloom).length
    const bloomCoverage = outcomes.length > 0 ? nbAvecBloom / outcomes.length : 0
    if (bloomCoverage < 0.5 && outcomes.length > 0) {
      issues.push({
        id: makeIssueId(), dimension: 'bloom', severity: 'info',
        message: `Seulement ${Math.round(bloomCoverage * 100)}% des outcomes ont un niveau Bloom assigné.`,
        suggestion: 'L\'IA n\'a pas pu détecter le niveau cognitif pour tous les outcomes.',
      })
    }

    // ── Contraintes ────────────────────────────────────────────────────────────
    if (raw.contraintes.length === 0 && outcomes.length > 5) {
      issues.push({
        id: makeIssueId(), dimension: 'contraintes', severity: 'info',
        message: 'Aucune contrainte temporelle détectée dans le curriculum.',
        suggestion: 'Des durées estimées seront inférées automatiquement.',
      })
    }

    // ── Couverture ─────────────────────────────────────────────────────────────
    const outcomesWithConcepts = outcomes.filter(o => o.conceptsIds.length > 0).length
    const conceptCoverage = outcomes.length > 0 ? outcomesWithConcepts / outcomes.length : 0
    if (conceptCoverage < 0.3 && outcomes.length > 5 && concepts.length > 0) {
      issues.push({
        id: makeIssueId(), dimension: 'couverture', severity: 'info',
        message: `Seulement ${Math.round(conceptCoverage * 100)}% des outcomes sont liés à des concepts.`,
      })
    }

    // ── Score calculation ──────────────────────────────────────────────────────
    const dimensionScores = this.calculateDimensionScores(issues, raw, outcomes, concepts)
    const globalScore = Math.round(
      Object.values(dimensionScores).reduce((sum, s) => sum + s, 0) / Object.keys(dimensionScores).length
    )

    const hasErreurCritique = issues.some(i => i.severity === 'erreur' && i.dimension === 'completude')

    return {
      score: globalScore,
      dimensions: dimensionScores,
      issues,
      stats: {
        nbOutcomesGeneraux: outcomesGeneraux.length,
        nbOutcomesSpecifiques: outcomesSpecifiques.length,
        nbCompetences: raw.competences.length,
        nbConcepts: concepts.length,
        nbVocabulaire: raw.vocabulaire.length,
        nbContraintes: raw.contraintes.length,
        nbOutcomesAvecBloom: nbAvecBloom,
        nbOutcomesSansParent: outcomesGeneraux.length,
        confidenceScore: raw.confidenceScore,
        completenessScore: raw.completenessScore,
      },
      validPourGeneration: globalScore >= 40 && !hasErreurCritique,
      createdAt: new Date().toISOString(),
    }
  }

  private calculateDimensionScores(
    issues: DataQualityIssue[],
    raw: CurriculumExtractionRaw,
    outcomes: NormalizedOutcome[],
    concepts: NormalizedConcept[],
  ): Record<DataQualityDimension, number> {
    function dimensionScore(dim: DataQualityDimension): number {
      const dimIssues = issues.filter(i => i.dimension === dim)
      const errors = dimIssues.filter(i => i.severity === 'erreur').length
      const warnings = dimIssues.filter(i => i.severity === 'avertissement').length
      return Math.max(0, 100 - errors * 30 - warnings * 10)
    }

    return {
      completude: dimensionScore('completude'),
      coherence: dimensionScore('coherence'),
      hierarchie: dimensionScore('hierarchie'),
      vocabulaire: raw.vocabulaire.length > 0 ? 80 : 60,
      bloom: dimensionScore('bloom'),
      contraintes: dimensionScore('contraintes'),
      multilinguisme: 90,  // Assume OK unless detected otherwise
      couverture: dimensionScore('couverture'),
    }
  }
}

export const curriculumQualityValidator = new CurriculumQualityValidator()
