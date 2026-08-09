// ── Execution Plan Validator (ME-13.5) ───────────────────────────────────────

import type { ExecutionPlan } from '../types'
import { getCapabilityDefinition } from '../capabilities/capability-catalog'

export interface ExecutionPlanValidation {
  valid:    boolean
  errors:   string[]
  warnings: string[]
}

// Patterns de données sensibles à ne jamais inclure dans un plan
const SENSITIVE_PATTERNS = [
  /texteExtrait/i,
  /storage_path/i,
  /\btoken\b/i,
  /\bpassword\b/i,
  /\bsecret\b/i,
  /priority_student_ids/i,
]

function containsSensitive(s: string): boolean {
  return SENSITIVE_PATTERNS.some(p => p.test(s))
}

// Routes autorisées : /dashboard racine ou commençant par '/dashboard/', ou null
function isRouteValid(route: string | null | undefined): boolean {
  if (route == null) return true
  if (typeof route !== 'string') return false
  return route === '/dashboard' || route.startsWith('/dashboard/')
}

export function validateExecutionPlan(plan: ExecutionPlan): ExecutionPlanValidation {
  const errors:   string[] = []
  const warnings: string[] = []

  // 1. ID présent
  if (!plan.id) errors.push('Plan ID manquant.')

  // 2. sourceId présent
  if (!plan.sourceId) errors.push('sourceId manquant.')

  // 3. Au moins une étape
  if (!plan.steps || plan.steps.length === 0) errors.push('Le plan ne contient aucune étape.')

  if (plan.steps.length > 0) {
    // 4. IDs d'étapes uniques
    const stepIds = plan.steps.map(s => s.id)
    if (new Set(stepIds).size !== stepIds.length) {
      errors.push('Des IDs d\'étapes sont dupliqués.')
    }

    // 5. Ordres uniques et séquentiels (1, 2, 3, ...)
    const orders = plan.steps.map(s => s.order).sort((a, b) => a - b)
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) {
        errors.push(`Ordres d'étapes non séquentiels : attendu ${i + 1}, trouvé ${orders[i]}.`)
        break
      }
    }

    // 6. Titres non vides
    for (const step of plan.steps) {
      if (!step.title || !step.title.trim()) {
        errors.push(`Étape ${step.id} : titre vide.`)
      }
    }

    // 7. Routes valides (commencent par /dashboard/ ou sont null)
    if (!isRouteValid(plan.targetRoute)) {
      errors.push(`targetRoute invalide : "${plan.targetRoute}". Utiliser uniquement des routes réelles du projet.`)
    }
    for (const step of plan.steps) {
      if (step.target?.route && !isRouteValid(step.target.route)) {
        errors.push(`Étape ${step.id} : route invalide "${step.target.route}".`)
      }
    }

    // 8. Query sans valeur undefined
    for (const step of plan.steps) {
      if (step.target) {
        for (const [k, v] of Object.entries(step.target.query)) {
          if ((v as unknown) === undefined) {
            errors.push(`Étape ${step.id} : query.${k} === undefined.`)
          }
        }
      }
    }

    // 9. Aucune donnée sensible dans titres et descriptions
    for (const step of plan.steps) {
      if (containsSensitive(step.title) || containsSensitive(step.description)) {
        errors.push(`Étape ${step.id} : données potentiellement sensibles détectées.`)
      }
    }

    // 10. Une seule étape 'available' au démarrage
    const availableCount = plan.steps.filter(s => s.status === 'available').length
    if (availableCount > 1) {
      errors.push(`${availableCount} étapes ont le statut 'available' (maximum 1 autorisé au démarrage).`)
    }

    // 11. Étapes bloquées expliquent leur blocage
    for (const step of plan.steps) {
      if (step.status === 'blocked') {
        const hasBlockingUnsatisfied = step.requirements.some(r => r.blocking && !r.satisfied)
        if (!hasBlockingUnsatisfied) {
          warnings.push(`Étape ${step.id} : bloquée sans requirement bloquant non satisfait.`)
        }
      }
    }

    // 12. estimatedMinutes non négatif
    for (const step of plan.steps) {
      if (step.estimatedMinutes != null && step.estimatedMinutes < 0) {
        errors.push(`Étape ${step.id} : estimatedMinutes négatif (${step.estimatedMinutes}).`)
      }
    }

    // 13. completionCriteria non vide pour les étapes obligatoires
    for (const step of plan.steps) {
      if (!step.optional && (!step.completionCriteria || step.completionCriteria.length === 0)) {
        warnings.push(`Étape ${step.id} : étape obligatoire sans critère de complétion.`)
      }
    }

    // 14. Capability connue dans le catalogue (ME-13.5)
    for (const step of plan.steps) {
      if (step.capability && !getCapabilityDefinition(step.capability)) {
        errors.push(`Étape ${step.id} : capability inconnue "${step.capability}".`)
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}
