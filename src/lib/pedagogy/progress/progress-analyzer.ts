// ── PIL — ProgressAnalyzer ───────────────────────────────────────────────────
//
// Calcule la progression pédagogique à partir des documents disponibles.
// S'appuie sur CurriculumParser et les données brutes — jamais de documents
// directement analysés par un LLM.
// Déterministe — aucun appel IA, aucun réseau.

import type { ProgressAnalysis } from '../types'
import type { DocumentSnapshot } from '../../mission-engine/types'
import { CurriculumParser } from '../curriculum/curriculum-parser'
import { normaliser, containsNorm } from '../shared/text-utils'

export interface ProgressAnalyzerInput {
  programmeAnnuel:      DocumentSnapshot | null
  curriculum:           DocumentSnapshot | null
  dernieresLecons:      DocumentSnapshot[]
  dernieresEvaluations: DocumentSnapshot[]
}

export class ProgressAnalyzer {
  private parser: CurriculumParser

  constructor() {
    this.parser = new CurriculumParser()
  }

  /**
   * Analyse la progression de l'enseignant pour une classe/matière donnée.
   *
   * Algorithme :
   *  1. Parse le programme annuel (ou curriculum) → unités ordonnées.
   *  2. Croise avec les leçons enseignées → leçons couvertes / restantes.
   *  3. Calcule le % d'avancement.
   *  4. Identifie la leçon courante et la prochaine à préparer.
   *  5. Évalue la confiance selon la disponibilité des données.
   */
  analyze(input: ProgressAnalyzerInput): ProgressAnalysis {
    const { programmeAnnuel, curriculum, dernieresLecons, dernieresEvaluations } = input

    // ── Structure curriculaire ─────────────────────────────────────────────
    const doc = programmeAnnuel ?? curriculum
    const structure = this.parser.parse(doc)

    // ── Leçons et évaluations enseignées ──────────────────────────────────
    const completedLessons = dernieresLecons.map(l => l.nom)
    const completedEvaluations = dernieresEvaluations.map(e => e.nom)

    // ── Progression : croisement leçons ↔ curriculum ──────────────────────
    const completedNorms = new Set(completedLessons.map(normaliser))

    // Nombre de topics du curriculum couverts par les leçons
    let coveredCount = 0
    for (const unit of structure.units) {
      const unitNorm = normaliser(unit.title)
      const isCovered =
        completedNorms.has(unitNorm) ||
        completedLessons.some(l =>
          containsNorm(l, unit.title) || containsNorm(unit.title, l),
        )
      if (isCovered) coveredCount++
    }

    const progressPercent =
      structure.totalTopics > 0
        ? Math.round((coveredCount / structure.totalTopics) * 100)
        : null

    // ── Leçon courante ────────────────────────────────────────────────────
    // Dernière leçon par ordre de création
    const sortedLessons = [...dernieresLecons].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
    const currentLesson = sortedLessons[0]?.nom ?? null

    // ── Prochaine leçon ───────────────────────────────────────────────────
    // Premier topic du curriculum non encore couvert
    const nextLessonUnit = structure.units.find(u => {
      const unitNorm = normaliser(u.title)
      return (
        !completedNorms.has(unitNorm) &&
        !completedLessons.some(l =>
          containsNorm(l, u.title) || containsNorm(u.title, l),
        )
      )
    })
    const nextLesson = nextLessonUnit?.title ?? null

    // ── Confiance ─────────────────────────────────────────────────────────
    let confidence = 0.3
    if (structure.totalTopics > 0 && completedLessons.length >= 2) {
      confidence = 0.9
    } else if (structure.totalTopics > 0 && completedLessons.length >= 1) {
      confidence = 0.7
    } else if (structure.totalTopics > 0) {
      confidence = 0.6
    } else if (completedLessons.length > 0) {
      confidence = 0.4
    }

    return {
      currentLesson,
      nextLesson,
      completedLessons,
      completedEvaluations,
      progressPercent,
      confidence,
    }
  }
}
