// ── Deadline Template (ME-13.5) ───────────────────────────────────────────────
//
// reason.code 'deadline_urgent'   : échéance urgente (≤ 3j)
// reason.code 'deadline_upcoming' : échéance prochaine (≤ 7j)
// reason.code 'deadline_break'    : congé / relâche imminent

import type { ExecutionContext } from '../execution-context'
import type { ExecutionTemplate } from '../execution-registry'
import type { ExecutionRecipe, ExecutionRecipeStep } from '../recipes/types'
import { EXECUTION_RECIPE_VERSION } from '../recipes/types'
import { makePlanId, buildQuery, reqClass } from '../step-utils'

export class DeadlineTemplate implements ExecutionTemplate {
  readonly id = 'deadline'

  supports(ctx: ExecutionContext): boolean {
    return !ctx.bundle && ctx.mission?.type === 'deadline'
  }

  buildRecipe(ctx: ExecutionContext): ExecutionRecipe {
    const { mission } = ctx
    const reasonCode = mission?.reason.code ?? 'deadline_upcoming'
    const sourceId   = mission?.id ?? 'deadline:unknown'
    const planId     = makePlanId(sourceId)

    if (reasonCode === 'deadline_break')  return this.buildBreak(ctx, planId)
    if (reasonCode === 'deadline_urgent') return this.buildUrgent(ctx, planId)
    return this.buildUpcoming(ctx, planId)
  }

  // ── Urgente ────────────────────────────────────────────────────────────────

  private buildUrgent(ctx: ExecutionContext, planId: string): ExecutionRecipe {
    const { mission, classeId, matiere, routes, references } = ctx
    const calendarRoute = routes.calendar
    const eventId       = references.deadlineId ?? (mission?.metadata['deadline_id'] as string | undefined)

    const steps: ExecutionRecipeStep[] = [
      {
        code: 'open_calendar', capability: 'navigate_to_calendar',
        title: "Ouvrir le calendrier ou la page de l'échéance",
        description: "Vérifiez immédiatement les détails de l'échéance urgente.",
        target: calendarRoute
          ? { type: 'calendar_event', route: calendarRoute, query: {}, referenceId: eventId ?? null }
          : (classeId
              ? { type: 'class', route: `${routes.classDetails}/${classeId}`, query: {}, referenceId: null }
              : null),
        requirements: [reqClass(classeId)],
        completionCriteria: ["L'échéance urgente a été consultée", 'La date et le type ont été confirmés'],
        estimatedMinutes: 2,
      },
      {
        // review_deadline defaultKind='review', step actuel kind='verify' → override
        code: 'verify_deadline_details', capability: 'review_deadline', kind: 'verify',
        title: "Vérifier la date et le type d'échéance",
        description: "Confirmez qu'il s'agit bien de la bonne échéance et identifiez ce qui est attendu.",
        completionCriteria: ["La date est confirmée", "Le type d'échéance est identifié (évaluation, remise, etc.)"],
        estimatedMinutes: 3,
      },
      {
        code: 'identify_remaining_work', capability: 'generic_review',
        title: 'Identifier le travail restant',
        description: 'Évaluez ce qui reste à faire avant la date butoir.',
        completionCriteria: ['Le travail restant a été identifié', 'Une estimation du temps nécessaire a été faite'],
        estimatedMinutes: 5,
      },
      {
        code: 'execute_action', capability: 'adapt_planning',
        title: "Exécuter ou planifier l'action requise",
        description: "Réalisez immédiatement l'action principale ou planifiez-la avant l'échéance.",
        target: routes.prepare
          ? { type: 'route', route: routes.prepare, query: buildQuery({ classe_id: classeId }), referenceId: null }
          : null,
        completionCriteria: ["L'action principale a été réalisée ou planifiée", "La classe est prête pour l'échéance"],
        estimatedMinutes: null,
      },
      {
        code: 'verify_resolved', capability: 'verify_document',
        title: "Vérifier que l'échéance est traitée",
        description: 'Confirmez que tout est en ordre avant la date butoir.',
        completionCriteria: ["L'échéance est traitée ou couverte", 'Aucune action bloquante ne reste'],
        estimatedMinutes: 3,
      },
      {
        code: 'confirm_deadline', capability: 'confirm_completion',
        title: 'Confirmer la mission',
        description: "Marquez l'échéance comme gérée.",
        completionCriteria: ["La mission d'échéance urgente est terminée"],
        estimatedMinutes: 1,
      },
    ]

    return this.finalize(ctx, planId, steps,
      mission?.title ?? "Gérer l'échéance urgente",
      'Traiter l\'échéance urgente avant la date butoir.',
      calendarRoute ?? routes.dashboard,
    )
  }

  // ── Prochaine ──────────────────────────────────────────────────────────────

  private buildUpcoming(ctx: ExecutionContext, planId: string): ExecutionRecipe {
    const { mission, classeId, routes, references } = ctx
    const calendarRoute = routes.calendar
    const eventId       = references.deadlineId ?? (mission?.metadata['deadline_id'] as string | undefined)

    const steps: ExecutionRecipeStep[] = [
      {
        code: 'review_deadline', capability: 'review_deadline',
        title: "Examiner l'échéance",
        description: "Consultez les détails de l'échéance prochaine et ce qu'elle implique.",
        target: calendarRoute
          ? { type: 'calendar_event', route: calendarRoute, query: {}, referenceId: eventId ?? null }
          : null,
        requirements: [reqClass(classeId)],
        completionCriteria: ["L'échéance a été examinée", 'La date et le type sont connus'],
        estimatedMinutes: 3,
      },
      {
        code: 'estimate_work', capability: 'generic_verify',
        title: 'Estimer le travail nécessaire',
        description: 'Évaluez ce qui doit être préparé ou finalisé avant l\'échéance.',
        completionCriteria: ['Le travail nécessaire a été estimé', 'Le temps disponible est suffisant'],
        estimatedMinutes: 5,
      },
      {
        code: 'schedule_preparation', capability: 'select_content',
        title: 'Réserver un moment de préparation',
        description: 'Planifiez le temps nécessaire pour préparer ce qui est requis avant l\'échéance.',
        completionCriteria: ['Un moment de préparation est planifié', 'Le calendrier a été consulté'],
        estimatedMinutes: 5,
      },
      {
        code: 'open_tool', capability: 'navigate_to_prepare',
        title: "Ouvrir l'outil concerné",
        description: 'Accédez à Préparer ou à la page appropriée pour commencer la préparation.',
        target: routes.prepare
          ? { type: 'route', route: routes.prepare, query: buildQuery({ classe_id: classeId }), referenceId: null }
          : null,
        completionCriteria: ["L'outil est ouvert et prêt"],
        estimatedMinutes: 2,
      },
      {
        code: 'confirm_planning', capability: 'confirm_completion',
        title: 'Confirmer la planification',
        description: "Validez que la préparation est planifiée et que l'échéance sera respectée.",
        completionCriteria: ['La préparation est planifiée', "L'échéance sera respectée"],
        estimatedMinutes: 1,
      },
    ]

    return this.finalize(ctx, planId, steps,
      mission?.title ?? "Préparer l'échéance prochaine",
      "Planifier et préparer à temps pour l'échéance identifiée.",
      calendarRoute ?? routes.dashboard,
    )
  }

  // ── Congé / relâche ────────────────────────────────────────────────────────

  private buildBreak(ctx: ExecutionContext, planId: string): ExecutionRecipe {
    const { mission, classeId, routes } = ctx

    const steps: ExecutionRecipeStep[] = [
      {
        code: 'review_break_date', capability: 'review_deadline',
        title: 'Examiner la date du congé ou de la relâche',
        description: "Vérifiez la date de début de l'interruption scolaire et le temps restant.",
        target: routes.calendar
          ? { type: 'calendar_event', route: routes.calendar, query: {}, referenceId: null }
          : null,
        requirements: [reqClass(classeId)],
        completionCriteria: ['La date de début du congé est confirmée', 'Le nombre de jours restants est connu'],
        estimatedMinutes: 3,
      },
      {
        // review_annual_plan defaultKind='review', step actuel kind='verify' → override
        code: 'verify_current_progress', capability: 'review_annual_plan', kind: 'verify',
        title: 'Vérifier la progression actuelle',
        description: "Évaluez où en est la classe dans le programme avant l'interruption.",
        target: classeId
          ? { type: 'class', route: `${routes.classDetails}/${classeId}`, query: {}, referenceId: classeId }
          : null,
        completionCriteria: ['La progression dans le programme est connue', "L'unité en cours est identifiée"],
        estimatedMinutes: 5,
      },
      {
        code: 'identify_before_break', capability: 'select_content',
        title: 'Identifier ce qui doit être terminé avant le congé',
        description: "Décidez ce qui doit être finalisé ou livré avant l'interruption scolaire.",
        completionCriteria: ['Les éléments à terminer avant le congé ont été identifiés'],
        estimatedMinutes: 5,
      },
      {
        code: 'adapt_preparation', capability: 'adapt_planning',
        title: 'Adapter la prochaine préparation',
        description: "Ouvrez Préparer pour finaliser ou adapter la leçon ou l'évaluation avant la relâche.",
        target: routes.prepare
          ? { type: 'route', route: routes.prepare, query: buildQuery({ classe_id: classeId }), referenceId: null }
          : null,
        completionCriteria: [
          'La préparation a été adaptée pour tenir compte du congé',
          'Le contenu est prêt pour les prochains cours',
        ],
        estimatedMinutes: null,
      },
      {
        code: 'confirm_adjusted', capability: 'confirm_completion',
        title: "Confirmer l'ajustement",
        description: 'Validez que le plan est ajusté et que la classe est prête pour le congé.',
        completionCriteria: [
          "Le plan est ajusté pour l'interruption",
          'La reprise après le congé est prévue',
        ],
        estimatedMinutes: 1,
      },
    ]

    return this.finalize(ctx, planId, steps,
      mission?.title ?? 'Préparer avant le congé',
      "Finaliser la préparation avant l'interruption scolaire.",
      routes.calendar ?? routes.dashboard,
    )
  }

  private finalize(
    ctx: ExecutionContext, planId: string,
    steps: ExecutionRecipeStep[], title: string, objective: string, targetRoute: string | null,
  ): ExecutionRecipe {
    const { mission, classeId, matiere } = ctx
    return {
      id: planId, sourceType: 'mission', sourceId: mission?.id ?? planId,
      missionType: 'deadline',
      title:     mission?.title ?? title,
      objective,
      classeId, matiere, steps,
      targetRoute,
      version: EXECUTION_RECIPE_VERSION,
    }
  }
}
