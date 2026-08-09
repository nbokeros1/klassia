// ── Work Template (ME-13.5) ───────────────────────────────────────────────────
//
// action 'grade_assignments'  : travaux non corrigés
// action 'process_overdue'    : travaux en retard
// action 'add_feedback'       : rétroaction manquante
//
// SÉCURITÉ : aucun nom d'élève ni donnée nominative dans les étapes.

import type { ExecutionContext } from '../execution-context'
import type { ExecutionTemplate } from '../execution-registry'
import type { ExecutionRecipe, ExecutionRecipeStep } from '../recipes/types'
import { EXECUTION_RECIPE_VERSION } from '../recipes/types'
import { makePlanId, reqClass } from '../step-utils'

export class WorkTemplate implements ExecutionTemplate {
  readonly id = 'work'

  supports(ctx: ExecutionContext): boolean {
    return !ctx.bundle && ctx.mission?.type === 'work'
  }

  buildRecipe(ctx: ExecutionContext): ExecutionRecipe {
    const { mission } = ctx
    const action   = mission?.metadata['action'] as string ?? 'grade_assignments'
    const sourceId = mission?.id ?? 'work:unknown'
    const planId   = makePlanId(sourceId)

    if (action === 'process_overdue') return this.buildOverdue(ctx, planId)
    if (action === 'add_feedback')    return this.buildFeedback(ctx, planId)
    return this.buildGrading(ctx, planId)
  }

  // ── grade_assignments ──────────────────────────────────────────────────────

  private buildGrading(ctx: ExecutionContext, planId: string): ExecutionRecipe {
    const { mission, classeId, matiere, routes } = ctx
    const classRoute = classeId ? `${routes.classDetails}/${classeId}` : routes.classes

    const steps: ExecutionRecipeStep[] = [
      {
        code: 'open_assignments', capability: 'navigate_to_class',
        title: 'Ouvrir les travaux à corriger',
        description: 'Accédez à la section des travaux de la classe.',
        target: { type: 'class', route: classRoute, query: {}, referenceId: classeId },
        requirements: [reqClass(classeId)],
        completionCriteria: ['La liste des travaux à corriger est visible'],
        estimatedMinutes: 2,
      },
      {
        code: 'review_submissions', capability: 'review_assignments',
        title: 'Vérifier les travaux reçus',
        description: 'Consultez les soumissions disponibles et identifiez celles à corriger.',
        completionCriteria: ['Les travaux reçus ont été listés', 'Les travaux manquants ont été identifiés'],
        estimatedMinutes: 5,
      },
      {
        code: 'correct_assignments', capability: 'correct_assignments',
        title: 'Corriger les travaux',
        description: 'Procédez à la correction des travaux selon les critères établis.',
        completionCriteria: ['Les travaux ont été corrigés', 'Les résultats sont prêts à être saisis'],
        estimatedMinutes: null,
      },
      {
        code: 'enter_results', capability: 'record_results',
        title: 'Ajouter les résultats',
        description: 'Saisissez les notes ou résultats de correction pour chaque travail.',
        completionCriteria: ['Les résultats sont saisis', "Aucun travail reçu n'est sans résultat"],
        estimatedMinutes: 10,
      },
      {
        code: 'verify_remaining', capability: 'verify_document',
        title: 'Vérifier les corrections restantes',
        description: "Vérifiez qu'il ne reste aucun travail non traité.",
        completionCriteria: ['Tous les travaux reçus ont été corrigés ou signalés'],
        estimatedMinutes: 3,
      },
      {
        code: 'confirm_done', capability: 'confirm_completion',
        title: 'Confirmer la fin de la correction',
        description: 'Marquez la session de correction comme terminée.',
        completionCriteria: ['La session de correction est clôturée'],
        estimatedMinutes: 1,
      },
    ]

    return this.finalize(ctx, planId, steps, 'Corriger les travaux des élèves', 'Correction des travaux reçus.')
  }

  // ── process_overdue ────────────────────────────────────────────────────────

  private buildOverdue(ctx: ExecutionContext, planId: string): ExecutionRecipe {
    const { classeId, routes } = ctx
    const classRoute = classeId ? `${routes.classDetails}/${classeId}` : routes.classes

    const steps: ExecutionRecipeStep[] = [
      {
        code: 'review_overdue', capability: 'review_assignments',
        title: 'Examiner les travaux en retard',
        description: 'Consultez la liste agrégée des travaux dont la date de remise est dépassée.',
        target: { type: 'class', route: classRoute, query: {}, referenceId: classeId },
        requirements: [reqClass(classeId)],
        completionCriteria: ['Les travaux en retard ont été identifiés'],
        estimatedMinutes: 5,
      },
      {
        code: 'check_submissions', capability: 'verify_document',
        title: 'Vérifier les remises disponibles',
        description: 'Identifiez parmi les travaux en retard ceux qui ont été remis après la date limite.',
        completionCriteria: ['Les remises tardives ont été identifiées'],
        estimatedMinutes: 3,
      },
      {
        code: 'identify_actions', capability: 'select_content',
        title: 'Identifier les actions possibles',
        description: 'Décidez si vous acceptez les remises tardives, envoyez un rappel ou fermez le travail.',
        completionCriteria: ['Une action a été décidée pour chaque travail en retard'],
        estimatedMinutes: 5,
      },
      {
        code: 'process_received', capability: 'correct_assignments',
        title: 'Traiter les travaux reçus',
        description: 'Corrigez les travaux tardifs disponibles selon votre décision.',
        completionCriteria: ['Les travaux tardifs reçus ont été traités'],
        estimatedMinutes: null,
      },
      {
        code: 'update_tracking', capability: 'confirm_completion',
        title: 'Actualiser le suivi',
        description: 'Mettez à jour les statuts pour refléter les actions prises sur les travaux en retard.',
        completionCriteria: ['Le suivi des travaux est à jour', 'Les statuts reflètent les actions prises'],
        estimatedMinutes: 3,
      },
    ]

    return this.finalize(ctx, planId, steps, 'Traiter les travaux en retard', "Gestion des travaux dont la remise est dépassée.")
  }

  // ── add_feedback ───────────────────────────────────────────────────────────

  private buildFeedback(ctx: ExecutionContext, planId: string): ExecutionRecipe {
    const { classeId, routes } = ctx
    const classRoute = classeId ? `${routes.classDetails}/${classeId}` : routes.classes

    const steps: ExecutionRecipeStep[] = [
      {
        code: 'open_graded_work', capability: 'navigate_to_class',
        title: 'Ouvrir les travaux corrigés',
        description: 'Accédez aux travaux déjà corrigés qui nécessitent une rétroaction.',
        target: { type: 'class', route: classRoute, query: {}, referenceId: classeId },
        requirements: [reqClass(classeId)],
        completionCriteria: ['Les travaux corrigés sont visibles'],
        estimatedMinutes: 2,
      },
      {
        code: 'review_results', capability: 'review_assignments',
        title: 'Examiner les résultats',
        description: "Parcourez les résultats pour identifier les points forts et les axes d'amélioration à communiquer.",
        completionCriteria: ['Les résultats ont été examinés', 'Les points de rétroaction ont été identifiés'],
        estimatedMinutes: 5,
      },
      {
        code: 'add_feedback', capability: 'add_feedback',
        title: 'Ajouter une rétroaction',
        description: 'Rédigez et ajoutez une rétroaction constructive pour les travaux corrigés.',
        completionCriteria: ['Une rétroaction a été ajoutée', 'Les commentaires sont constructifs et spécifiques'],
        estimatedMinutes: 15,
      },
      {
        code: 'verify_feedback_complete', capability: 'verify_feedback',
        title: 'Vérifier que chaque travail traité a un retour',
        description: "Assurez-vous qu'aucun travail corrigé ne manque de rétroaction.",
        completionCriteria: ['Tous les travaux corrigés ont reçu une rétroaction'],
        estimatedMinutes: 3,
      },
      {
        code: 'confirm_feedback', capability: 'confirm_completion',
        title: 'Confirmer la fin',
        description: 'Validez que les rétroactions sont complètes et accessibles.',
        completionCriteria: ['Les rétroactions sont confirmées et accessibles'],
        estimatedMinutes: 1,
      },
    ]

    return this.finalize(ctx, planId, steps, 'Ajouter les rétroactions manquantes', 'Fourniture de rétroaction pour les travaux corrigés.')
  }

  private finalize(
    ctx: ExecutionContext, planId: string,
    steps: ExecutionRecipeStep[], title: string, objective: string,
  ): ExecutionRecipe {
    const { mission, classeId, matiere, routes } = ctx
    const targetRoute = classeId ? `${routes.classDetails}/${classeId}` : routes.classes
    return {
      id: planId, sourceType: 'mission', sourceId: mission?.id ?? planId,
      missionType: 'work',
      title:     mission?.title ?? title,
      objective,
      classeId, matiere, steps,
      targetRoute,
      version: EXECUTION_RECIPE_VERSION,
    }
  }
}
