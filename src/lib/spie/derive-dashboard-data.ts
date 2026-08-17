// ─── Dérivation des métriques Mon Année (V5) ─────────────────────────────────
// Fonction pure partagée entre le hub et le workspace.
// Aucun effet de bord — peut être appelée côté client ou serveur.

import type { ProgrammeAnnuel, ContenuProgramme, TeachingEvent } from '@/lib/types/database'
import type { TeachingPack, PackSyllabus } from '@/lib/types/teaching-pack'
import type {
  SchoolYearDashboardData,
  SchoolYearMetrics,
  SequenceProgress,
  PriorityTask,
  LessonTeachingState,
} from '@/lib/types/school-year-dashboard'
import { getCurriculumCoverage } from '@/lib/spie/curriculum-coverage'
import { getSyllabusCompleteness } from '@/lib/spie/syllabus-v3'
import {
  getSchoolYearElapsedPercent,
  derivePacingIndicator,
  getNextTeachingAction,
} from '@/lib/spie/teaching-progress'
import { buildLessonStateMap, countTaughtFromMap, makeLessonKey } from '@/lib/spie/teaching-events'

export function deriveData(
  pack: TeachingPack | null,
  programme: ProgrammeAnnuel | null,
  teachingEvents: TeachingEvent[],
  anneeScolaire?: string,
): SchoolYearDashboardData {
  const contenu  = programme?.contenu_json as ContenuProgramme | undefined
  const unites   = contenu?.unites ?? []
  const syllabus = programme?.syllabus_json as (PackSyllabus & Record<string, unknown>) | undefined

  // V5 : lessonStateMap
  const lessonStateMap: Record<string, LessonTeachingState> | undefined = contenu
    ? buildLessonStateMap(contenu, teachingEvents)
    : undefined

  const totalSequences = programme?.nb_unites ?? (unites.length > 0 ? unites.length : null)

  // BUG-06 : totalLecons depuis la structure
  const totalLecons = unites.length > 0
    ? unites.reduce((s, u) => s + u.lecons.length, 0)
    : null

  const preparedLecons = (pack?.contenu_json?.nb_lecons_generees ?? null) as number | null

  const taughtLecons = lessonStateMap
    ? countTaughtFromMap(lessonStateMap)
    : (unites.length > 0 ? unites.flatMap(u => u.lecons).filter(l => l.statut === 'enseignee').length : null)

  const raList  = (syllabus?.resultats_apprentissage as string[] | undefined) ?? []
  const totalRA = raList.length > 0 ? raList.length : null

  const completedSequences = unites.length > 0
    ? unites.filter((u, si) => {
        if (u.lecons.length === 0) return false
        if (lessonStateMap) return u.lecons.every((_, li) => lessonStateMap[makeLessonKey(si, li)]?.isTaught)
        return u.lecons.every(l => l.statut === 'enseignee')
      }).length
    : null

  const metrics: SchoolYearMetrics = {
    totalSequences,
    completedSequences,
    totalLecons,
    preparedLecons,
    taughtLecons,
    totalRA,
    coveredRA: null,
  }

  const sequences: SequenceProgress[] = unites.map((u, si) => {
    const taught = lessonStateMap
      ? u.lecons.filter((_, li) => lessonStateMap[makeLessonKey(si, li)]?.isTaught).length
      : u.lecons.filter(l => l.statut === 'enseignee').length
    const total  = u.lecons.length
    const statut = total > 0 && taught === total ? 'terminee' : taught > 0 ? 'en_cours' : 'a_venir'
    return {
      seqIdx:       si,
      numero:       u.numero,
      titre:        u.titre,
      semaineDebut: u.semaine_debut,
      semaineFin:   u.semaine_fin,
      objectif:     u.objectifs?.[0] ?? '',
      totalLecons:  total,
      taughtLecons: taught,
      statut,
      progressPct:  total > 0 ? Math.round((taught / total) * 100) : 0,
      uniteData:    u,
    }
  })

  const currentSequence = sequences.find(s => s.statut !== 'terminee') ?? null

  const schoolYearElapsedPct = anneeScolaire ? getSchoolYearElapsedPercent(anneeScolaire) : 0
  const teachingPct = totalLecons && taughtLecons !== null
    ? Math.round((taughtLecons / totalLecons) * 100)
    : null
  const pacingIndicator = derivePacingIndicator(teachingPct, schoolYearElapsedPct) ?? undefined

  const priorityTasks: PriorityTask[] = []

  const nextAction = getNextTeachingAction(sequences, lessonStateMap)
  if (nextAction?.type === 'enseigner') {
    priorityTasks.push({
      type:        'enseigner',
      label:       `Enseigner : ${nextAction.titre}`,
      detail:      nextAction.detail,
      sequenceNum: nextAction.sequenceNum,
      leconNum:    nextAction.leconNum,
    })
  }

  if (currentSequence) {
    currentSequence.uniteData.lecons
      .filter((l, li) => {
        if (l.lecon_id) return false
        const isTaught = lessonStateMap
          ? (lessonStateMap[makeLessonKey(currentSequence.seqIdx, li)]?.isTaught ?? false)
          : l.statut === 'enseignee'
        return !isTaught
      })
      .slice(0, 3)
      .forEach(l => {
        priorityTasks.push({
          type:        'preparer',
          label:       `Préparer : ${l.titre}`,
          detail:      `Séquence ${currentSequence.numero}`,
          sequenceNum: currentSequence.numero,
          leconNum:    l.numero,
        })
      })
  }

  const syllabusCompleteness = syllabus?.titre_cours
    ? getSyllabusCompleteness(syllabus as import('@/lib/types/teaching-pack').PackSyllabus).score
    : undefined

  if (syllabusCompleteness !== undefined && syllabusCompleteness < 80) {
    priorityTasks.push({
      type:        'planifier',
      label:       `Compléter le syllabus — ${syllabusCompleteness}% rempli`,
      detail:      'Politiques, communication et objectifs manquants',
      sequenceNum: 0,
    })
  }

  const curriculumCoverage = contenu?.curriculum_outcomes?.length
    ? getCurriculumCoverage(contenu, lessonStateMap)
    : undefined

  return {
    metrics,
    sequences,
    raList,
    priorityTasks,
    upcomingAssessments: [],
    currentSequence,
    curriculumCoverage,
    syllabusCompleteness,
    pacingIndicator,
    schoolYearElapsedPct,
    lessonStateMap,
  }
}
