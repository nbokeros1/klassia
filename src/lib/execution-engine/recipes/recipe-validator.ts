// ── Execution Recipe Validator (ME-13.5) ─────────────────────────────────────
//
// Valide la recette AVANT que le builder construise l'ExecutionPlan.
// Complément du validateExecutionPlan — les deux doivent rester.

import type { ExecutionRecipe }           from './types'
import { MAX_RECIPE_STEPS }               from './types'
import { getCapabilityDefinition }        from '../capabilities/capability-catalog'

export interface ExecutionRecipeValidation {
  valid:    boolean
  errors:   string[]
  warnings: string[]
}

const SENSITIVE_PATTERNS = [
  /texteExtrait/i, /storage_path/i, /\btoken\b/i,
  /\bpassword\b/i, /\bsecret\b/i,  /priority_student_ids/i,
]

function hasSensitive(s: string): boolean {
  return SENSITIVE_PATTERNS.some(p => p.test(s))
}

function isRouteValid(route: string | null | undefined): boolean {
  if (route == null) return true
  if (typeof route !== 'string') return false
  return route === '/dashboard' || route.startsWith('/dashboard/')
}

export function validateExecutionRecipe(recipe: ExecutionRecipe): ExecutionRecipeValidation {
  const errors:   string[] = []
  const warnings: string[] = []

  // 1. id présent
  if (!recipe.id) errors.push('Recipe ID manquant.')

  // 2. sourceId présent
  if (!recipe.sourceId) errors.push('sourceId manquant.')

  // 3. titre non vide
  if (!recipe.title?.trim()) errors.push('Titre de recette vide.')

  // 4. objectif non vide
  if (!recipe.objective?.trim()) errors.push('Objectif de recette vide.')

  // 5. au moins une étape
  if (!recipe.steps || recipe.steps.length === 0) errors.push('La recette ne contient aucune étape.')

  // 15. maximum MAX_RECIPE_STEPS
  if (recipe.steps && recipe.steps.length > MAX_RECIPE_STEPS) {
    errors.push(`La recette dépasse ${MAX_RECIPE_STEPS} étapes (${recipe.steps.length} trouvées).`)
  }

  if (recipe.steps && recipe.steps.length > 0) {
    const codes = recipe.steps.map(s => s.code)

    // 6. code de chaque étape présent
    for (const s of recipe.steps) {
      if (!s.code?.trim()) errors.push(`Une étape a un code vide ou absent.`)
    }

    // 7. codes uniques
    if (new Set(codes).size !== codes.length) {
      errors.push('Des codes d\'étape sont dupliqués dans la recette.')
    }

    for (const step of recipe.steps) {
      // 8. capability connue
      const def = getCapabilityDefinition(step.capability)
      if (!def) {
        errors.push(`Étape "${step.code}" : capability inconnue "${step.capability}".`)
      }

      // 9. titre d'étape non vide
      if (!step.title?.trim()) {
        errors.push(`Étape "${step.code}" : titre vide.`)
      }

      // 10. aucune route invalide
      if (step.target?.route !== undefined && !isRouteValid(step.target?.route)) {
        errors.push(`Étape "${step.code}" : route invalide "${step.target?.route}".`)
      }

      // 11. aucune query avec undefined
      if (step.target?.query) {
        for (const [k, v] of Object.entries(step.target.query)) {
          if ((v as unknown) === undefined) {
            errors.push(`Étape "${step.code}" : query.${k} === undefined.`)
          }
        }
      }

      // 12. aucun estimatedMinutes négatif
      if (step.estimatedMinutes != null && step.estimatedMinutes < 0) {
        errors.push(`Étape "${step.code}" : estimatedMinutes négatif.`)
      }

      // 13. aucune donnée sensible
      if (hasSensitive(step.title ?? '') || hasSensitive(step.description ?? '')) {
        errors.push(`Étape "${step.code}" : données potentiellement sensibles détectées.`)
      }

      // 14. completionCriteria obligatoires si la capability exige une confirmation
      if (def?.requiresExplicitConfirmation) {
        if (!step.completionCriteria || step.completionCriteria.length === 0) {
          warnings.push(`Étape "${step.code}" : capability ${step.capability} exige des critères de complétion.`)
        }
      }
    }

    // targetRoute
    if (recipe.targetRoute !== null && recipe.targetRoute !== undefined) {
      if (!isRouteValid(recipe.targetRoute)) {
        errors.push(`targetRoute invalide : "${recipe.targetRoute}".`)
      }
    }

    // version
    if (!recipe.version) {
      warnings.push('version de recette absente.')
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}
