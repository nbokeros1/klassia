// ── PIL — EvaluationAnalyzer ─────────────────────────────────────────────────
//
// Détermine quelles unités curriculaires ont été évaluées,
// celles qui ne l'ont pas encore été, et la date de la dernière évaluation.
// Déterministe — aucun appel IA, aucun réseau.

import type { EvaluationAnalysis, EvaluatedUnit, CurriculumUnit } from '../types'
import type { DocumentSnapshot } from '../../mission-engine/types'
import { normaliser, containsNorm } from '../shared/text-utils'

export class EvaluationAnalyzer {
  /**
   * Analyse les évaluations existantes par rapport au curriculum et aux leçons couvertes.
   *
   * @param evaluations       Documents de type évaluation (DocumentSnapshot[])
   * @param curriculumUnits   Unités extraites du programme annuel
   * @param completedLessons  Noms des leçons déjà enseignées
   */
  analyze(
    evaluations:      DocumentSnapshot[],
    curriculumUnits:  CurriculumUnit[],
    completedLessons: string[],
  ): EvaluationAnalysis {
    const totalEvaluations = evaluations.length

    // ── Date de la dernière évaluation ──────────────────────────────────────
    const lastEvaluationDate: Date | null =
      evaluations.length > 0
        ? evaluations.reduce(
            (latest, ev) => (ev.createdAt > latest ? ev.createdAt : latest),
            evaluations[0].createdAt,
          )
        : null

    // ── Unités évaluées ─────────────────────────────────────────────────────
    // Pour chaque unité du curriculum, cherche une évaluation dont le nom
    // contient ou correspond à l'unité.
    const evaluatedUnits: EvaluatedUnit[] = []
    const evaluatedUnitTitles = new Set<string>()

    for (const unit of curriculumUnits) {
      const matchingEvals = evaluations.filter(ev =>
        containsNorm(ev.nom, unit.title) || containsNorm(unit.title, ev.nom),
      )

      if (matchingEvals.length > 0) {
        const lastEval = matchingEvals.reduce(
          (latest, ev) => (ev.createdAt > latest.createdAt ? ev : latest),
          matchingEvals[0],
        )

        evaluatedUnits.push({
          unitTitle:        unit.title,
          evaluationCount:  matchingEvals.length,
          lastEvaluatedAt:  lastEval.createdAt,
        })
        evaluatedUnitTitles.add(normaliser(unit.title))
      }
    }

    // ── Unités couvertes mais jamais évaluées ────────────────────────────────
    // Une unité est "couverte" si son titre apparaît dans les leçons enseignées.
    const completedNorms = new Set(completedLessons.map(normaliser))

    const unevaluatedUnits: string[] = curriculumUnits
      .filter(u => {
        const norm = normaliser(u.title)
        const isCovered = completedNorms.has(norm) ||
          completedLessons.some(l => containsNorm(l, u.title) || containsNorm(u.title, l))
        const isEvaluated = evaluatedUnitTitles.has(norm)
        return isCovered && !isEvaluated
      })
      .map(u => u.title)

    return {
      evaluatedUnits,
      unevaluatedUnits,
      lastEvaluationDate,
      totalEvaluations,
    }
  }
}
