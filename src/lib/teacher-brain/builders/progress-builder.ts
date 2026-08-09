// ── Teacher Brain — ProgressBuilder (ME-08) ──────────────────────────────────
//
// Construit TeacherProgress à partir des données brutes.
// Orchestration : ProgressAnalyzer + CurriculumParser + EvaluationAnalyzer.
// Déterministe — aucun appel IA, aucun réseau.

import type { TeacherProgress } from '../types'
import type { DocumentSnapshot } from '../../mission-engine/types'
import { ProgressAnalyzer }   from '../../pedagogy/progress/progress-analyzer'
import { CurriculumParser }   from '../../pedagogy/curriculum/curriculum-parser'
import { EvaluationAnalyzer } from '../../pedagogy/evaluations/evaluation-analyzer'
import { extractSuggestedTopic } from '../../mission-engine/detectors/next-lesson'
import { normaliser } from '../../pedagogy/shared/text-utils'

export class ProgressBuilder {
  private progressAnalyzer:  ProgressAnalyzer
  private curriculumParser:  CurriculumParser
  private evaluationAnalyzer: EvaluationAnalyzer

  constructor() {
    this.progressAnalyzer   = new ProgressAnalyzer()
    this.curriculumParser   = new CurriculumParser()
    this.evaluationAnalyzer = new EvaluationAnalyzer()
  }

  build(
    programmeAnnuel:      DocumentSnapshot | null,
    curriculum:           DocumentSnapshot | null,
    dernieresLecons:      DocumentSnapshot[],
    dernieresEvaluations: DocumentSnapshot[],
  ): TeacherProgress {
    // ── PIL : progression ───────────────────────────────────────────────────
    const progress = this.progressAnalyzer.analyze({
      programmeAnnuel,
      curriculum,
      dernieresLecons,
      dernieresEvaluations,
    })

    // ── PIL : structure curriculaire ────────────────────────────────────────
    const currDoc    = programmeAnnuel ?? curriculum
    const currStruct = this.curriculumParser.parse(currDoc)

    // ── Unités couvertes / restantes ────────────────────────────────────────
    const completedNorms = new Set(progress.completedLessons.map(normaliser))

    const completedUnits: string[] = []
    const remainingUnits: string[] = []

    for (const unit of currStruct.units) {
      const unitNorm = normaliser(unit.title)
      const isCovered =
        completedNorms.has(unitNorm) ||
        progress.completedLessons.some(l => {
          const ln = normaliser(l)
          const un = normaliser(unit.title)
          return ln.includes(un) || un.includes(ln)
        })
      if (isCovered) {
        completedUnits.push(unit.title)
      } else {
        remainingUnits.push(unit.title)
      }
    }

    // ── PIL : évaluations par unité ─────────────────────────────────────────
    const evalAnalysis = this.evaluationAnalyzer.analyze(
      dernieresEvaluations,
      currStruct.units,
      progress.completedLessons,
    )

    // ── Couverture évaluation ──────────────────────────────────────────────
    const evaluationCoverage = completedUnits.length > 0
      ? Math.round(
          ((completedUnits.length - evalAnalysis.unevaluatedUnits.length) /
            completedUnits.length) * 100,
        )
      : null

    // ── Leçons depuis la dernière évaluation ──────────────────────────────
    const lastEvalDate = evalAnalysis.lastEvaluationDate
    const lessonsAfterLastEval = lastEvalDate
      ? dernieresLecons.filter(l => l.createdAt > lastEvalDate).length
      : dernieresLecons.length

    // ── Sujet suggéré (déterministe, depuis le programme) ─────────────────
    const suggestedTopic = extractSuggestedTopic(programmeAnnuel, dernieresLecons)

    // ── Références brutes ─────────────────────────────────────────────────
    const sortedLessons = [...dernieresLecons].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
    const derniereLecon = sortedLessons[0] ?? null

    return {
      currentLesson:        progress.currentLesson,
      nextLesson:           progress.nextLesson,
      completedLessons:     progress.completedLessons,
      completedEvaluations: progress.completedEvaluations,

      progressPercent:      progress.progressPercent,
      completedUnits,
      remainingUnits,

      totalEvaluations:     evalAnalysis.totalEvaluations,
      evaluationCoverage,
      unevaluatedUnits:     evalAnalysis.unevaluatedUnits,
      lastEvaluationDate:   lastEvalDate,
      lessonsAfterLastEval,

      hasProgramme:         programmeAnnuel !== null,
      suggestedTopic,
      programmeAnnuelId:    programmeAnnuel?.id ?? null,
      derniereLeconId:      derniereLecon?.id ?? null,
      derniereLeconNom:     derniereLecon?.nom ?? null,
    }
  }
}
