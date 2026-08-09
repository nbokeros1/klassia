// ── Evaluation Template (ME-13.5) ─────────────────────────────────────────────
//
// action 'create_first_evaluation' : première évaluation
// action 'evaluate_completed_unit' : unité terminée
// action 'create_evaluation'       : évaluation régulière (défaut)

import type { ExecutionContext } from '../execution-context'
import type { ExecutionTemplate } from '../execution-registry'
import type { ExecutionRecipe, ExecutionRecipeStep } from '../recipes/types'
import { EXECUTION_RECIPE_VERSION } from '../recipes/types'
import { makePlanId, buildQuery, reqClass, reqPrepare } from '../step-utils'

export class EvaluationTemplate implements ExecutionTemplate {
  readonly id = 'evaluation'

  supports(ctx: ExecutionContext): boolean {
    if (ctx.bundle) return false
    const type = ctx.mission?.type
    return type === 'evaluation' || type === 'create_evaluation'
  }

  buildRecipe(ctx: ExecutionContext): ExecutionRecipe {
    const { mission, classeId, matiere, routes } = ctx
    const action        = mission?.metadata['action'] as string ?? 'create_evaluation'
    const sourceId      = mission?.id ?? 'evaluation:unknown'
    const planId        = makePlanId(sourceId)
    const suggestedUnit = mission?.metadata['suggested_unit'] as string | null ?? null
    const prepareQuery  = buildQuery({ classe_id: classeId, matiere, type: 'evaluation' })
    const hasCalendar   = !!routes.calendar
    const unitLabel     = suggestedUnit ?? "l'unité en cours"

    const steps: ExecutionRecipeStep[] = [
      {
        code: 'review_lessons', capability: 'review_taught_content',
        title: 'Examiner les leçons couvertes',
        description: suggestedUnit
          ? `Vérifiez les leçons couvertes dans l'unité « ${suggestedUnit} » avant de créer l'évaluation.`
          : 'Passez en revue les leçons préparées pour identifier le contenu à évaluer.',
        target: classeId
          ? { type: 'class', route: `${routes.classDetails}/${classeId}`, query: {}, referenceId: classeId }
          : null,
        requirements: [reqClass(classeId)],
        completionCriteria: [
          'Les leçons couvertes ont été examinées',
          suggestedUnit ? `L'unité « ${suggestedUnit} » a été identifiée` : 'Le contenu à évaluer a été identifié',
        ],
        estimatedMinutes: 5,
      },
      {
        // review_learning_objectives a defaultKind:'verify', correspond au kind actuel
        code: 'verify_objectives', capability: 'review_learning_objectives',
        title: 'Vérifier les compétences ou objectifs visés',
        description: "Confirmez les objectifs d'apprentissage que l'évaluation devra mesurer.",
        completionCriteria: [
          "Les objectifs d'apprentissage sont identifiés",
          'Les compétences évaluées correspondent aux leçons couvertes',
        ],
        estimatedMinutes: 5,
      },
      {
        code: 'select_content', capability: 'select_content',
        title: `Sélectionner le contenu à évaluer${suggestedUnit ? ` : ${suggestedUnit}` : ''}`,
        description: `Choisissez les thèmes et compétences de ${unitLabel} à inclure dans l'évaluation.`,
        completionCriteria: [
          'Le contenu a été sélectionné',
          "Les thèmes sont cohérents avec l'enseignement dispensé",
        ],
        estimatedMinutes: 5,
      },
      {
        code: 'open_preparer', capability: 'navigate_to_prepare',
        title: 'Ouvrir Préparer en mode évaluation',
        description: 'Accédez à ScorgIA Préparer avec le mode évaluation présélectionné.',
        target: { type: 'route', route: routes.prepare, query: prepareQuery, referenceId: null },
        requirements: [reqPrepare(routes.prepare)],
        completionCriteria: ['La page Préparer est ouverte en mode évaluation'],
        estimatedMinutes: 2,
      },
      {
        code: 'generate_evaluation', capability: 'create_evaluation',
        title: suggestedUnit ? `Générer l'évaluation : ${suggestedUnit}` : "Générer l'évaluation",
        description: "Demandez à ScorgIA de générer les questions, consignes et barème de l'évaluation.",
        completionCriteria: [
          "L'évaluation a été générée",
          'Les questions correspondent aux objectifs identifiés',
        ],
        estimatedMinutes: 20,
      },
      {
        code: 'verify_rubric', capability: 'verify_evaluation',
        title: 'Vérifier les consignes et le barème',
        description: "Relisez les consignes, questions et critères de correction avant d'enregistrer.",
        completionCriteria: [
          'Les consignes sont claires et complètes',
          'Le barème est cohérent avec les objectifs',
          'La durée et le niveau de difficulté sont appropriés',
        ],
        estimatedMinutes: 10,
      },
      {
        code: 'save_evaluation', capability: 'save_document',
        title: "Enregistrer l'évaluation",
        description: "Enregistrez l'évaluation dans la bibliothèque avec le bon titre et la bonne classe.",
        completionCriteria: ['Le document est enregistré', 'Le titre est renseigné', 'La classe et la matière sont correctes'],
        estimatedMinutes: 3,
      },
      {
        code: 'schedule_evaluation', capability: 'schedule_evaluation',
        title: 'Planifier la date dans le calendrier',
        description: hasCalendar
          ? "Ajoutez la date de l'évaluation au calendrier de la classe."
          : 'Optionnel — page calendrier non disponible dans cette configuration.',
        target: hasCalendar
          ? { type: 'calendar_event', route: routes.calendar!, query: {}, referenceId: null }
          : null,
        completionCriteria: [
          hasCalendar
            ? 'La date a été ajoutée au calendrier'
            : 'La date a été planifiée par un autre moyen si nécessaire',
        ],
        estimatedMinutes: hasCalendar ? 3 : null,
        optional: !hasCalendar,
      },
    ]

    const titleVariants: Record<string, string> = {
      create_first_evaluation: `Créer la première évaluation${matiere ? ` — ${matiere}` : ''}`,
      evaluate_completed_unit: `Évaluer l'unité terminée${suggestedUnit ? ` : ${suggestedUnit}` : ''}`,
      create_evaluation:       `Créer une évaluation${matiere ? ` — ${matiere}` : ''}`,
    }

    return {
      id: planId, sourceType: 'mission', sourceId: mission?.id ?? planId,
      missionType: 'evaluation',
      title:     mission?.title ?? (titleVariants[action] ?? titleVariants['create_evaluation']),
      objective: "Créer, vérifier et enregistrer une évaluation alignée avec l'enseignement dispensé.",
      classeId, matiere, steps,
      targetRoute: routes.prepare,
      version:     EXECUTION_RECIPE_VERSION,
    }
  }
}
