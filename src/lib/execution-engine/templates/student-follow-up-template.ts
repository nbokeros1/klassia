// ── Student Follow-Up Template (ME-13.5) ──────────────────────────────────────
//
// reason.code 'student_high_priority'  : élèves prioritaires
// reason.code 'student_missing_work'   : travaux non remis
// reason.code 'student_attendance'     : absences
// reason.code 'student_performance'    : résultats
//
// CONFIDENTIALITÉ STRICTE
//   Le plan public ne contient :
//   - aucun nom d'élève ;
//   - aucune note ou absence individuelle ;
//   - aucun identifiant interne d'élève.
//   Les données détaillées ne sont consultées qu'après navigation vers la vue sécurisée.

import type { ExecutionContext } from '../execution-context'
import type { ExecutionTemplate } from '../execution-registry'
import type { ExecutionRecipe, ExecutionRecipeStep } from '../recipes/types'
import { EXECUTION_RECIPE_VERSION } from '../recipes/types'
import { makePlanId, reqClass } from '../step-utils'

export class StudentFollowUpTemplate implements ExecutionTemplate {
  readonly id = 'student-follow-up'

  supports(ctx: ExecutionContext): boolean {
    return !ctx.bundle && ctx.mission?.type === 'student_follow_up'
  }

  buildRecipe(ctx: ExecutionContext): ExecutionRecipe {
    const { mission, classeId, matiere, routes } = ctx
    const reasonCode = mission?.reason.code ?? ''
    const sourceId   = mission?.id ?? 'student_follow_up:unknown'
    const planId     = makePlanId(sourceId)

    const signalDescriptions: Record<string, string> = {
      student_high_priority: 'plusieurs signaux prioritaires ont été détectés (travaux, présences, résultats).',
      student_missing_work:  "des travaux non remis ont été détectés pour un nombre agrégé d'élèves.",
      student_attendance:    "un pattern d'absentéisme ou de retards répétés a été détecté.",
      student_performance:   'des résultats en deçà du seuil attendu ont été détectés.',
    }
    const signalDesc  = signalDescriptions[reasonCode] ?? 'un signal pédagogique a été détecté.'
    const followUpRoute = routes.followUp
      ?? (classeId ? `${routes.classDetails}/${classeId}` : routes.classes)

    const steps: ExecutionRecipeStep[] = [
      {
        code: 'open_follow_up', capability: 'navigate_to_students',
        title: "Ouvrir l'espace de suivi sécurisé",
        description: 'Accédez à la vue de suivi pour consulter les signaux de la classe.',
        target: { type: 'student_follow_up', route: followUpRoute, query: {}, referenceId: null },
        requirements: [reqClass(classeId)],
        completionCriteria: ['La vue de suivi est ouverte'],
        estimatedMinutes: 2,
      },
      {
        code: 'review_signals', capability: 'review_student_signals',
        title: 'Examiner les signaux disponibles',
        description: `Dans cette classe, ${signalDesc} Consultez les indicateurs agrégés avant d'agir.`,
        completionCriteria: [
          'Les signaux de la classe ont été consultés',
          'La nature du problème a été comprise',
        ],
        estimatedMinutes: 5,
      },
      {
        code: 'verify_data', capability: 'generic_verify',
        title: 'Vérifier les données avant toute conclusion',
        description: 'Assurez-vous que les données sont à jour et suffisantes pour prendre une décision éclairée.',
        completionCriteria: ['Les données ont été vérifiées', 'Le contexte pédagogique a été pris en compte'],
        estimatedMinutes: 5,
      },
      {
        code: 'identify_action_needed', capability: 'select_students_for_follow_up',
        title: 'Identifier les élèves nécessitant une action',
        description: "À partir des signaux agrégés, déterminez quels cas nécessitent une intervention.",
        completionCriteria: [
          'Les situations nécessitant une action ont été identifiées',
          'Une priorité a été établie sans jugement prématuré',
        ],
        estimatedMinutes: 5,
      },
      {
        code: 'add_observation', capability: 'add_follow_up',
        title: 'Ajouter une observation ou une action de suivi',
        description: 'Notez vos observations et planifiez les prochaines étapes dans la vue sécurisée.',
        completionCriteria: [
          'Une observation ou une action a été ajoutée',
          "L'observation ne contient aucune donnée confidentielle non pertinente",
        ],
        estimatedMinutes: 10,
      },
      {
        code: 'confirm_follow_up', capability: 'confirm_completion',
        title: 'Confirmer que le suivi a été effectué',
        description: 'Validez que les actions de suivi nécessaires ont été planifiées ou réalisées.',
        completionCriteria: ['Le suivi a été effectué et documenté'],
        estimatedMinutes: 1,
      },
    ]

    return {
      id: planId, sourceType: 'mission', sourceId: mission?.id ?? planId,
      missionType: 'student_follow_up',
      title:     mission?.title ?? 'Suivi pédagogique de la classe',
      objective: 'Examiner les signaux pédagogiques de la classe et planifier les actions de suivi appropriées.',
      classeId, matiere, steps,
      targetRoute: followUpRoute,
      version:     EXECUTION_RECIPE_VERSION,
    }
  }
}
