// ── Next Lesson Template (ME-13.5) ────────────────────────────────────────────
//
// Supports: type 'next_lesson' et 'unfinished_document' avec action 'create_annual_plan'.
//
// CAS A — create_annual_plan   : créer le programme annuel
// CAS B — prepare_first_lesson : préparer la première leçon
// CAS C — prepare_next_lesson  : préparer la prochaine leçon (défaut)

import type { ExecutionContext } from '../execution-context'
import type { ExecutionTemplate } from '../execution-registry'
import type { ExecutionRecipe, ExecutionRecipeStep } from '../recipes/types'
import { EXECUTION_RECIPE_VERSION } from '../recipes/types'
import { makePlanId, buildQuery, reqClass, reqSubject, reqPrepare } from '../step-utils'

export class NextLessonTemplate implements ExecutionTemplate {
  readonly id = 'next-lesson'

  supports(ctx: ExecutionContext): boolean {
    if (ctx.bundle) return false
    const type   = ctx.mission?.type
    const action = ctx.mission?.metadata['action'] as string | undefined
    return type === 'next_lesson' || (type === 'unfinished_document' && action === 'create_annual_plan')
  }

  buildRecipe(ctx: ExecutionContext): ExecutionRecipe {
    const { mission, classeId, matiere } = ctx
    const action         = mission?.metadata['action'] as string ?? 'prepare_next_lesson'
    const sourceId       = mission?.id ?? 'next_lesson:unknown'
    const planId         = makePlanId(sourceId)
    const suggestedTopic = mission?.metadata['suggested_topic'] as string | null ?? null
    const prepareQuery   = buildQuery({ classe_id: classeId, matiere, type: 'lecon' })

    if (action === 'create_annual_plan')   return this.buildCaseA(ctx, planId, prepareQuery)
    if (action === 'prepare_first_lesson') return this.buildCaseB(ctx, planId, prepareQuery, suggestedTopic)
    return this.buildCaseC(ctx, planId, prepareQuery, suggestedTopic)
  }

  // ── CAS A : créer le programme annuel ──────────────────────────────────────

  private buildCaseA(
    ctx: ExecutionContext, planId: string, prepareQuery: Record<string, string>,
  ): ExecutionRecipe {
    const { mission, classeId, matiere, routes } = ctx

    const steps: ExecutionRecipeStep[] = [
      {
        code: 'verify_class_info', capability: 'review_class_context',
        title: 'Vérifier les informations de la classe',
        description: `Confirmez la classe et la matière avant de créer le programme annuel${matiere ? ` (${matiere})` : ''}.`,
        target: classeId
          ? { type: 'class', route: `${routes.classDetails}/${classeId}`, query: {}, referenceId: classeId }
          : null,
        requirements: [reqClass(classeId), reqSubject(matiere)],
        completionCriteria: ['La classe est correcte', 'La matière est confirmée'],
        estimatedMinutes: 3,
      },
      {
        code: 'open_preparer', capability: 'navigate_to_prepare',
        title: "Ouvrir l'espace de préparation",
        description: "Accédez à Préparer pour créer le programme annuel avec l'aide de ScorgIA.",
        target: { type: 'route', route: routes.prepare, query: prepareQuery, referenceId: null },
        requirements: [reqPrepare(routes.prepare)],
        completionCriteria: ['La page Préparer est ouverte', 'La classe et la matière sont sélectionnées'],
        estimatedMinutes: 2,
      },
      {
        code: 'create_programme', capability: 'create_annual_plan',
        title: 'Créer ou importer le programme annuel',
        description: "Générez ou importez le programme annuel à l'aide de ScorgIA.",
        completionCriteria: ['Le programme annuel a été créé ou importé', 'Le contenu reflète le curriculum prévu'],
        estimatedMinutes: 30,
      },
      {
        code: 'verify_saved_programme', capability: 'verify_document',
        title: 'Vérifier que le programme est enregistré',
        description: 'Assurez-vous que le document est bien sauvegardé dans la bibliothèque.',
        completionCriteria: ['Le document est visible dans la bibliothèque', 'Le titre et la classe sont corrects'],
        estimatedMinutes: 3,
      },
      {
        code: 'confirm_next_lesson_ready', capability: 'confirm_completion',
        title: 'Confirmer que la planification est débloquée',
        description: 'ScorgIA pourra maintenant suggérer la prochaine leçon à partir du programme annuel.',
        completionCriteria: [
          'Le programme annuel est disponible pour cette classe et cette matière',
          'ScorgIA peut planifier les prochaines leçons',
        ],
        estimatedMinutes: 1,
      },
    ]

    return {
      id: planId, sourceType: 'mission', sourceId: mission?.id ?? planId,
      missionType: 'next_lesson',
      title:     mission?.title ?? `Créer le programme annuel${matiere ? ` — ${matiere}` : ''}`,
      objective: 'Créer le programme annuel afin de débloquer la planification des leçons.',
      classeId, matiere, steps,
      targetRoute: routes.prepare,
      version:     EXECUTION_RECIPE_VERSION,
    }
  }

  // ── CAS B : première leçon ─────────────────────────────────────────────────

  private buildCaseB(
    ctx: ExecutionContext, planId: string, prepareQuery: Record<string, string>,
    suggestedTopic: string | null,
  ): ExecutionRecipe {
    const { mission, classeId, matiere, routes } = ctx
    const topicLabel = suggestedTopic ?? 'le premier thème disponible'

    const steps: ExecutionRecipeStep[] = [
      {
        code: 'review_programme', capability: 'review_annual_plan',
        title: 'Consulter le programme annuel',
        description: 'Examinez le programme annuel pour identifier le premier thème à enseigner.',
        requirements: [reqClass(classeId)],
        completionCriteria: ['Le programme annuel a été consulté', 'Le premier thème a été identifié'],
        estimatedMinutes: 5,
      },
      {
        code: 'identify_first_theme', capability: 'select_topic',
        title: suggestedTopic ? `Confirmer le thème : ${suggestedTopic}` : 'Identifier le premier thème',
        description: `Choisissez ${topicLabel} comme point de départ de l'enseignement.`,
        completionCriteria: [
          `Le thème "${topicLabel}" a été confirmé comme premier thème`,
          'Le thème correspond au programme annuel',
        ],
        estimatedMinutes: 5,
      },
      {
        code: 'open_preparer', capability: 'navigate_to_prepare',
        title: 'Ouvrir Préparer',
        description: 'Accédez à ScorgIA Préparer avec la classe et la matière présélectionnées.',
        target: { type: 'route', route: routes.prepare, query: prepareQuery, referenceId: null },
        requirements: [reqPrepare(routes.prepare)],
        completionCriteria: ['La page Préparer est ouverte', 'La classe et la matière sont sélectionnées'],
        estimatedMinutes: 2,
      },
      {
        code: 'generate_first_lesson', capability: 'create_lesson',
        title: suggestedTopic ? `Générer la première leçon : ${suggestedTopic}` : 'Générer la première leçon',
        description: 'Demandez à ScorgIA de générer la première leçon à partir du programme annuel.',
        completionCriteria: ['La première leçon a été générée', 'Le contenu est aligné avec le programme annuel'],
        estimatedMinutes: 15,
      },
      {
        code: 'verify_save', capability: 'verify_document',
        title: 'Vérifier et enregistrer la leçon',
        description: 'Relisez le contenu généré et enregistrez la leçon dans la bibliothèque.',
        completionCriteria: ['La leçon est enregistrée', 'Le titre est renseigné', 'La classe et la matière sont correctes'],
        estimatedMinutes: 5,
      },
    ]

    return {
      id: planId, sourceType: 'mission', sourceId: mission?.id ?? planId,
      missionType: 'next_lesson',
      title:     mission?.title ?? `Préparer la première leçon${matiere ? ` — ${matiere}` : ''}`,
      objective: 'Créer et enregistrer la première leçon à partir du programme annuel.',
      classeId, matiere, steps,
      targetRoute: routes.prepare,
      version:     EXECUTION_RECIPE_VERSION,
    }
  }

  // ── CAS C : prochaine leçon ────────────────────────────────────────────────

  private buildCaseC(
    ctx: ExecutionContext, planId: string, prepareQuery: Record<string, string>,
    suggestedTopic: string | null,
  ): ExecutionRecipe {
    const { mission, classeId, matiere, routes, references } = ctx
    const topicLabel = suggestedTopic ?? 'le prochain thème'
    const hasLesson  = !!references.latestLessonId

    const steps: ExecutionRecipeStep[] = [
      {
        code: 'review_latest_lesson', capability: 'review_latest_lesson',
        title: 'Consulter la dernière leçon',
        description: 'Vérifiez le contenu de la dernière leçon pour assurer la continuité pédagogique.',
        target: hasLesson && classeId
          ? { type: 'document', route: `${routes.classDetails}/${classeId}`, query: {}, referenceId: references.latestLessonId }
          : null,
        requirements: [reqClass(classeId)],
        completionCriteria: [
          'La dernière leçon a été consultée',
          'La progression dans le programme a été évaluée',
        ],
        estimatedMinutes: 5,
      },
      {
        // Utilise kind:'verify' (override) — la capability defaultKind est 'review'
        code: 'verify_progression', capability: 'review_annual_plan', kind: 'verify',
        title: 'Vérifier la progression dans le programme annuel',
        description: 'Identifiez où vous en êtes dans le programme annuel pour choisir le prochain thème.',
        completionCriteria: [
          'La position dans le programme annuel a été vérifiée',
          'Les thèmes déjà couverts sont identifiés',
        ],
        estimatedMinutes: 3,
      },
      {
        code: 'confirm_topic', capability: 'select_topic',
        title: suggestedTopic ? `Confirmer le thème : ${suggestedTopic}` : 'Choisir le prochain thème',
        description: suggestedTopic
          ? `ScorgIA suggère « ${suggestedTopic} » comme prochain thème. Confirmez ou ajustez.`
          : 'Choisissez le prochain thème à partir du programme annuel.',
        completionCriteria: [
          `Le thème "${topicLabel}" est confirmé`,
          'Le thème est cohérent avec la progression actuelle',
        ],
        estimatedMinutes: 5,
      },
      {
        code: 'open_preparer', capability: 'navigate_to_prepare',
        title: 'Ouvrir Préparer',
        description: 'Accédez à ScorgIA Préparer avec la classe et la matière présélectionnées.',
        target: { type: 'route', route: routes.prepare, query: prepareQuery, referenceId: null },
        requirements: [reqPrepare(routes.prepare)],
        completionCriteria: ['La page Préparer est ouverte', 'La classe et la matière sont sélectionnées'],
        estimatedMinutes: 2,
      },
      {
        code: 'generate_lesson', capability: 'create_lesson',
        title: suggestedTopic ? `Générer la leçon : ${suggestedTopic}` : 'Générer la prochaine leçon',
        description: "Demandez à ScorgIA de générer la leçon à partir du programme annuel et des leçons précédentes.",
        completionCriteria: ['La leçon a été générée', 'Le contenu est complet et aligné avec le programme'],
        estimatedMinutes: 15,
      },
      {
        code: 'verify_save', capability: 'verify_document',
        title: 'Vérifier et enregistrer la leçon',
        description: 'Relisez le contenu et enregistrez la leçon dans la bibliothèque.',
        completionCriteria: ['La leçon est enregistrée', 'Le titre est renseigné', 'La classe et la matière sont correctes'],
        estimatedMinutes: 5,
      },
    ]

    return {
      id: planId, sourceType: 'mission', sourceId: mission?.id ?? planId,
      missionType: 'next_lesson',
      title:     mission?.title ?? `Préparer la prochaine leçon${matiere ? ` — ${matiere}` : ''}`,
      objective: 'Préparer et enregistrer la prochaine leçon dans la continuité du programme annuel.',
      classeId, matiere, steps,
      targetRoute: routes.prepare,
      version:     EXECUTION_RECIPE_VERSION,
    }
  }
}
