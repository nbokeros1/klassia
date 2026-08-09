// ── Teacher Brain (ME-08 / ME-09 / ME-11) ────────────────────────────────────
//
// Couche cognitive de KlassIA.
// Construit une TeacherSituation consolidée à partir de MissionDataContext.
// Appelé UNE SEULE FOIS par le Mission Engine avant distribution aux détecteurs.
//
// Garanties :
//   - Aucune mission générée ici
//   - Aucun appel IA / réseau
//   - Aucun import React
//
// ME-09 : suppression de `raw`, ajout de `references` et `students`.
// ME-11 : ajout de `calendar` (CalendarAnalyzer + CalendarBuilder).

import type { TeacherSituation, TeacherSituationReferences } from './types'
import type { MissionDataContext } from '../mission-engine/types'
import { ProgressBuilder }    from './builders/progress-builder'
import { WorkloadBuilder }    from './builders/workload-builder'
import { ClassroomBuilder }   from './builders/classroom-builder'
import { StudentBuilder }     from './builders/student-builder'
import { CalendarBuilder }    from './builders/calendar-builder'
import { StudentInsightAnalyzer } from '../pedagogy/students/student-insight-analyzer'
import { CalendarAnalyzer }   from '../pedagogy/calendar/calendar-analyzer'

// Seuil de confiance minimal pour proposer un sujet précis
export const CONFIDENCE_THRESHOLD_SUGGEST = 0.40

export class TeacherBrain {
  private progressBuilder:  ProgressBuilder
  private workloadBuilder:  WorkloadBuilder
  private classroomBuilder: ClassroomBuilder
  private studentBuilder:   StudentBuilder
  private calendarBuilder:  CalendarBuilder
  private studentAnalyzer:  StudentInsightAnalyzer
  private calendarAnalyzer: CalendarAnalyzer

  constructor() {
    this.progressBuilder  = new ProgressBuilder()
    this.workloadBuilder  = new WorkloadBuilder()
    this.classroomBuilder = new ClassroomBuilder()
    this.studentBuilder   = new StudentBuilder()
    this.calendarBuilder  = new CalendarBuilder()
    this.studentAnalyzer  = new StudentInsightAnalyzer()
    this.calendarAnalyzer = new CalendarAnalyzer()
  }

  /**
   * Construit une vue consolidée de la situation pédagogique.
   *
   * La `confidence` globale est dérivée de la qualité des données disponibles :
   *   0.9+ → programme annuel + plusieurs leçons (analyse fiable)
   *   0.7  → programme + 1 leçon (estimation correcte)
   *   0.6  → programme seul (structure connue, sans historique)
   *   0.4  → leçons sans programme (analyse partielle)
   *   0.3  → aucune donnée fiable
   *
   * FRONTIÈRE STRICTE (ME-09) :
   *   TeacherSituation n'expose aucun document brut.
   *   Les références documentaires sont dans `references` (IDs et noms uniquement).
   */
  buildSituation(context: MissionDataContext): TeacherSituation {
    const {
      enseignant,
      classe,
      matiere,
      dateCourante,
      programmeAnnuel,
      curriculum,
      dernieresLecons,
      dernieresEvaluations,
      travaux,
      students,
      attendance,
      studentResults,
      studentWork,
      calendarEvents,
      calendarDeadlines,
    } = context

    // ── Builders ──────────────────────────────────────────────────────────────
    const progress  = this.progressBuilder.build(
      programmeAnnuel,
      curriculum,
      dernieresLecons,
      dernieresEvaluations,
    )

    const workload  = this.workloadBuilder.build(travaux, dateCourante)

    const classroom = this.classroomBuilder.build(
      dernieresLecons,
      dernieresEvaluations,
      travaux,
      context.leconsParStatut ?? {},
    )

    // ── Analyse élèves ─────────────────────────────────────────────────────
    const studentSummary   = this.studentAnalyzer.analyze(
      students,
      attendance,
      studentResults,
      studentWork,
      dateCourante,
    )
    const studentsInsights = this.studentBuilder.build(studentSummary)

    // ── Analyse calendrier ─────────────────────────────────────────────────
    const calendarAnalysis = this.calendarAnalyzer.analyze(
      calendarEvents,
      calendarDeadlines,
      dateCourante,
    )
    const calendarInsights = this.calendarBuilder.build(calendarAnalysis)

    // ── Confiance globale ─────────────────────────────────────────────────────
    const hasProgramme = programmeAnnuel !== null || curriculum !== null
    const lessonCount  = dernieresLecons.length

    let confidence: number
    if (hasProgramme && lessonCount >= 2) {
      confidence = 0.9
    } else if (hasProgramme && lessonCount === 1) {
      confidence = 0.7
    } else if (hasProgramme) {
      confidence = 0.6
    } else if (lessonCount > 0) {
      confidence = 0.4
    } else {
      confidence = 0.3
    }

    // ── Références minimales (remplace raw, ME-09) ────────────────────────────
    const sortedLecons = [...dernieresLecons].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
    const latestLecon = sortedLecons[0] ?? null
    const sortedEvals = [...dernieresEvaluations].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
    const latestEval = sortedEvals[0] ?? null

    const references: TeacherSituationReferences = {
      programmeAnnuelId:    programmeAnnuel?.id ?? null,
      curriculumId:         curriculum?.id ?? null,
      latestLessonId:       latestLecon?.id ?? null,
      latestLessonName:     latestLecon?.nom ?? null,
      latestEvaluationId:   latestEval?.id ?? null,
      latestEvaluationName: latestEval?.nom ?? null,
    }

    return {
      enseignant,
      classe,
      matiere,
      today: dateCourante,

      progress,
      workload,
      classroom,
      students:  studentsInsights,
      calendar:  calendarInsights,

      references,
      confidence,
    }
  }
}
