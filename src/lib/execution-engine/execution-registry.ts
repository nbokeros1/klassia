// ── Execution Registry (ME-13.5) ──────────────────────────────────────────────

import type { ExecutionContext } from './execution-context'
import type { ExecutionRecipe } from './recipes/types'

import { NextLessonTemplate }       from './templates/next-lesson-template'
import { EvaluationTemplate }       from './templates/evaluation-template'
import { WorkTemplate }             from './templates/work-template'
import { StudentFollowUpTemplate }  from './templates/student-follow-up-template'
import { DeadlineTemplate }         from './templates/deadline-template'
import { BundleTemplate }           from './templates/bundle-template'
import { GenericTemplate }          from './templates/generic-template'

// ── Contrat template ──────────────────────────────────────────────────────────

export interface ExecutionTemplate {
  id: string
  supports(context: ExecutionContext): boolean
  buildRecipe(context: ExecutionContext): ExecutionRecipe
}

// ── Registre par défaut ───────────────────────────────────────────────────────

/**
 * Ordre de résolution (premier template dont supports() === true est retenu) :
 *   1. bundle          — missions fusionnées en priority
 *   2. deadline        — échéances calendrier
 *   3. student_follow_up
 *   4. work
 *   5. evaluation
 *   6. next_lesson
 *   7. generic         — fallback garanti
 */
function defaultTemplates(): ExecutionTemplate[] {
  return [
    new BundleTemplate(),
    new DeadlineTemplate(),
    new StudentFollowUpTemplate(),
    new WorkTemplate(),
    new EvaluationTemplate(),
    new NextLessonTemplate(),
    new GenericTemplate(),
  ]
}

// ── ExecutionRegistry ─────────────────────────────────────────────────────────

export class ExecutionRegistry {
  private readonly templates: ExecutionTemplate[]

  constructor(templates?: ExecutionTemplate[]) {
    this.templates = templates ?? defaultTemplates()
  }

  /** Retourne le premier template compatible, GenericTemplate en dernier recours. */
  resolve(context: ExecutionContext): ExecutionTemplate {
    for (const t of this.templates) {
      if (t.supports(context)) return t
    }
    // Ne devrait pas arriver car GenericTemplate.supports() === true
    return new GenericTemplate()
  }

  list(): ExecutionTemplate[] {
    return [...this.templates]
  }
}
