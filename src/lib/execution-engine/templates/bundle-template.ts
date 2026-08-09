// ── Bundle Template (ME-13.5) ──────────────────────────────────────────────────
//
// Fusionne un bundle evaluation + deadline en un seul workflow cohérent.
// Règle : pas d'étape dupliquée, un seul passage vers Préparer, une confirmation finale.

import type { ExecutionContext } from '../execution-context'
import type { ExecutionTemplate } from '../execution-registry'
import type { ExecutionRecipe, ExecutionRecipeStep } from '../recipes/types'
import { EXECUTION_RECIPE_VERSION } from '../recipes/types'
import { makePlanId, buildQuery, reqClass, reqPrepare } from '../step-utils'

export class BundleTemplate implements ExecutionTemplate {
  readonly id = 'bundle'

  supports(ctx: ExecutionContext): boolean {
    return !!ctx.bundle
  }

  buildRecipe(ctx: ExecutionContext): ExecutionRecipe {
    const { bundle, classeId, matiere, routes } = ctx
    const sourceId = bundle?.id ?? 'bundle:unknown'
    const planId   = makePlanId(sourceId)

    const deadlineMission = bundle?.missions.find(m => m.type === 'deadline')
    const evalMission     = bundle?.missions.find(m => m.type === 'evaluation' || m.type === 'create_evaluation')
    const deadlineId      = deadlineMission?.evidence?.[0]?.documentId ?? null
    const suggestedUnit   = evalMission?.metadata['suggested_unit'] as string | null ?? null
    const prepareQuery    = buildQuery({ classe_id: classeId, matiere, type: 'evaluation' })
    const unitLabel       = suggestedUnit ?? "l'unité en cours"

    const steps: ExecutionRecipeStep[] = [
      {
        code: 'review_deadline', capability: 'review_deadline',
        title: "Examiner l'échéance",
        description: deadlineMission
          ? `Vérifiez les détails : "${deadlineMission.title}".`
          : "Consultez les détails de l'échéance liée à cette évaluation.",
        target: routes.calendar
          ? { type: 'calendar_event', route: routes.calendar, query: {}, referenceId: deadlineId }
          : null,
        requirements: [reqClass(classeId)],
        completionCriteria: ["L'échéance a été examinée", 'La date butoir est confirmée'],
        estimatedMinutes: 3,
      },
      {
        // review_taught_content defaultKind='review', step actuel kind='verify' → override
        code: 'verify_taught_content', capability: 'review_taught_content', kind: 'verify',
        title: 'Vérifier les contenus déjà enseignés',
        description: `Passez en revue les leçons de ${unitLabel} pour identifier ce qui peut être évalué.`,
        target: classeId
          ? { type: 'class', route: `${routes.classDetails}/${classeId}`, query: {}, referenceId: classeId }
          : null,
        completionCriteria: [
          'Les leçons couvertes ont été vérifiées',
          'Le contenu évaluable est identifié',
        ],
        estimatedMinutes: 5,
      },
      {
        code: 'choose_competencies', capability: 'select_learning_objectives',
        title: `Choisir les compétences à évaluer${suggestedUnit ? ` : ${suggestedUnit}` : ''}`,
        description: "Sélectionnez les objectifs d'apprentissage qui feront l'objet de l'évaluation.",
        completionCriteria: [
          'Les compétences à évaluer sont choisies',
          'Elles correspondent aux contenus enseignés',
        ],
        estimatedMinutes: 5,
      },
      {
        code: 'prepare_evaluation', capability: 'create_evaluation',
        title: "Préparer l'évaluation",
        description: "Accédez à ScorgIA Préparer en mode évaluation pour générer l'évaluation.",
        target: { type: 'route', route: routes.prepare, query: prepareQuery, referenceId: null },
        requirements: [reqPrepare(routes.prepare)],
        completionCriteria: [
          'La page Préparer est ouverte en mode évaluation',
          "L'évaluation a été générée",
        ],
        estimatedMinutes: 20,
      },
      {
        code: 'verify_rubric', capability: 'verify_evaluation',
        title: 'Vérifier le barème',
        description: 'Relisez les consignes, questions et critères de correction.',
        completionCriteria: [
          'Les consignes sont claires et complètes',
          'Le barème est cohérent avec les compétences choisies',
        ],
        estimatedMinutes: 10,
      },
      {
        code: 'schedule_before_deadline', capability: 'schedule_evaluation',
        title: "Planifier l'évaluation avant l'échéance",
        description: "Ajoutez la date de passation dans le calendrier avant la date butoir.",
        target: routes.calendar
          ? { type: 'calendar_event', route: routes.calendar, query: {}, referenceId: null }
          : null,
        completionCriteria: [
          'La date de passation est planifiée',
          "La date est antérieure à l'échéance",
        ],
        estimatedMinutes: routes.calendar ? 3 : null,
        optional: !routes.calendar,
      },
      {
        code: 'save_and_confirm', capability: 'save_document',
        title: 'Enregistrer et confirmer',
        description: "Enregistrez l'évaluation dans la bibliothèque et confirmez que tout est prêt.",
        completionCriteria: [
          "L'évaluation est enregistrée",
          'Le titre, la classe et la matière sont corrects',
          "L'évaluation sera prête avant l'échéance",
        ],
        estimatedMinutes: 3,
      },
    ]

    return {
      id: planId, sourceType: 'bundle', sourceId,
      missionType: 'bundle',
      title:     bundle?.title ?? "Préparer et planifier l'évaluation",
      objective: "Créer et planifier une évaluation avant l'échéance identifiée.",
      classeId, matiere, steps,
      targetRoute: routes.prepare,
      version:     EXECUTION_RECIPE_VERSION,
    }
  }
}
