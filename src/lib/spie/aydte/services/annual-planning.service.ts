// SPIE-04 — Annual Planning Service
// High-level API for building an annual plan.

import type { AnnualPlanningInput, AnnualPlanningOutput } from '../types/planning'
import { annualPlanningEngine } from '../planning/annual-planning-engine'

export class AnnualPlanningService {
  plan(input: AnnualPlanningInput): AnnualPlanningOutput {
    return annualPlanningEngine.plan(input)
  }

  validate(output: AnnualPlanningOutput): {
    valid: boolean
    blockers: string[]
    warnings: string[]
  } {
    const blockers: string[] = []
    const warnings = [...output.avertissements]

    if (!output.success) {
      blockers.push(output.error ?? 'Erreur inconnue lors de la planification')
    }
    if (output.stats.coveragePercent < 50) {
      blockers.push(`Couverture curriculaire insuffisante : ${output.stats.coveragePercent}%`)
    }
    if (output.sequencesNonPlanifiees.length > 0) {
      warnings.push(`${output.sequencesNonPlanifiees.length} séquence(s) n'ont pas pu être planifiées dans l'année.`)
    }
    if (output.stats.pacingScore < 40) {
      warnings.push(`Score de rythme faible : ${output.stats.pacingScore}/100 — le plan pédagogique peut être difficile à tenir.`)
    }

    return { valid: blockers.length === 0, blockers, warnings }
  }
}

export const annualPlanningService = new AnnualPlanningService()
