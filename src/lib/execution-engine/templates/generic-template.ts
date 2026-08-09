// ── Generic Template (ME-13.5) — fallback garanti ────────────────────────────

import type { ExecutionContext } from '../execution-context'
import type { ExecutionTemplate } from '../execution-registry'
import type { ExecutionRecipe, ExecutionRecipeStep } from '../recipes/types'
import { EXECUTION_RECIPE_VERSION } from '../recipes/types'
import { makePlanId, buildQuery } from '../step-utils'

export class GenericTemplate implements ExecutionTemplate {
  readonly id = 'generic'

  /** Toujours vrai — utilisé comme fallback par ExecutionRegistry. */
  supports(_ctx: ExecutionContext): boolean {
    return true
  }

  buildRecipe(ctx: ExecutionContext): ExecutionRecipe {
    const source   = ctx.mission ?? ctx.bundle
    const sourceId = source?.id ?? 'unknown'
    const planId   = makePlanId(sourceId)
    const title    = source ? (('title' in source) ? source.title : (source as { id: string }).id) : 'Mission'
    const targetRoute = ctx.routes.prepare ?? ctx.routes.dashboard

    const steps: ExecutionRecipeStep[] = [
      {
        code: 'review_mission', capability: 'generic_review',
        title: 'Examiner la mission',
        description: "Prenez connaissance des détails de la mission avant d'agir.",
        completionCriteria: ['La mission a été examinée', 'Les actions requises ont été identifiées'],
        estimatedMinutes: 2,
      },
      {
        code: 'navigate_target', capability: 'navigate_to_prepare',
        title: 'Ouvrir la destination',
        description: targetRoute
          ? 'Naviguez vers la section appropriée pour accomplir cette mission.'
          : 'Aucune destination automatique — consultez le tableau de bord.',
        target: targetRoute
          ? {
              type:        'route',
              route:       targetRoute,
              query:       buildQuery({ classe_id: ctx.classeId, matiere: ctx.matiere }),
              referenceId: null,
            }
          : null,
        completionCriteria: ['La page cible a été ouverte'],
        estimatedMinutes: 2,
      },
      {
        code: 'perform_action', capability: 'generic_action',
        title: "Réaliser l'action demandée",
        description: "Accomplissez l'action principale liée à cette mission.",
        completionCriteria: ["L'action principale a été réalisée", 'Le résultat est visible'],
        estimatedMinutes: null,
      },
      {
        code: 'verify_result', capability: 'generic_verify',
        title: 'Vérifier le résultat',
        description: 'Assurez-vous que le résultat correspond aux attentes.',
        completionCriteria: ['Le résultat a été vérifié', "Aucune correction n'est nécessaire"],
        estimatedMinutes: 2,
      },
      {
        code: 'confirm_completion', capability: 'confirm_completion',
        title: 'Confirmer la fin de la mission',
        description: 'Marquez la mission comme terminée.',
        completionCriteria: ['La mission est marquée comme terminée'],
        estimatedMinutes: 1,
      },
    ]

    return {
      id: planId,
      sourceType:  ctx.bundle ? 'bundle' : 'mission',
      sourceId,
      missionType: ctx.mission?.type ?? 'bundle',
      title,
      objective:   'Accomplir la mission assignée.',
      classeId:    ctx.classeId,
      matiere:     ctx.matiere,
      steps,
      targetRoute,
      version:     EXECUTION_RECIPE_VERSION,
    }
  }
}
