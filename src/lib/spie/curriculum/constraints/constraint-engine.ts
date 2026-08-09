// SPIE-02 — Constraint Engine
// Extracts constraints from curriculum data, validates plans against them,
// and produces a pacing model for the Annual Planning Engine (PGE/AYDTE).

import type {
  Constraint,
  ConstraintSet,
  ConstraintViolation,
  ConstraintValidationResult,
  OutcomePacing,
  CurriculumPacingModel,
  ConstraintType,
} from './types'
import type { CurriculumExtractionRaw, RawConstraint } from '../extraction/types'
import type { NormalizedOutcome } from '../extraction/types'

// ─── Default time estimates by outcome type ───────────────────────────────────
// Used when no explicit time constraint is found in the curriculum.
// Maps SPIE BloomLevel values → estimated teaching minutes
const DEFAULT_MINUTES_BY_BLOOM: Record<string, number> = {
  connaissance: 45,
  comprehension: 60,
  application: 90,
  analyse: 90,
  evaluation: 120,
  creation: 150,
}

function estimateOutcomeMinutes(outcome: NormalizedOutcome): number {
  const bloom = outcome.niveauBloom ?? 'application'
  return DEFAULT_MINUTES_BY_BLOOM[bloom] ?? 90
}

// ─── Constraint ID generator ──────────────────────────────────────────────────

function makeConstraintId(type: ConstraintType, sujetId: string, index: number): string {
  return `constraint_${type}_${sujetId}_${index}`
}

// ─── Engine class ─────────────────────────────────────────────────────────────

export class ConstraintEngine {
  // Extract constraints from a raw curriculum extraction
  extractConstraints(
    raw: CurriculumExtractionRaw,
    outcomes: NormalizedOutcome[],
  ): ConstraintSet {
    const constraints: Constraint[] = []

    // 1. Extract explicit constraints from raw curriculum
    for (let i = 0; i < raw.contraintes.length; i++) {
      const rawC = raw.contraintes[i]
      const constraint = this.convertRawConstraint(rawC, i, raw.province)
      if (constraint) constraints.push(constraint)
    }

    // 2. Infer time constraints from outcome Bloom level (fallback)
    for (const outcome of outcomes) {
      const alreadyHasTime = constraints.some(
        c => c.sujetId === outcome.id && c.type.startsWith('temps_')
      )
      if (!alreadyHasTime) {
        const minutes = estimateOutcomeMinutes(outcome)
        constraints.push({
          id: makeConstraintId('temps_recommande', outcome.id, constraints.length),
          type: 'temps_recommande',
          description: `Durée estimée pour ${outcome.code ?? outcome.id}`,
          obligatoire: false,
          sujetId: outcome.id,
          sujetLabel: outcome.texte.substring(0, 60),
          valeur: minutes,
          unite: 'minutes',
          source: 'infere',
          province: raw.province,
        })
      }
    }

    return {
      id: `constraints_${Date.now()}`,
      curriculumId: '',
      province: raw.province,
      matiere: raw.matiere,
      niveaux: raw.niveaux,
      constraints,
      createdAt: new Date().toISOString(),
    }
  }

  private convertRawConstraint(
    raw: RawConstraint,
    index: number,
    province?: string,
  ): Constraint | null {
    const typeMap: Record<string, ConstraintType> = {
      temps: 'temps_recommande',
      prerequis: 'prerequis',
      corequis: 'corequis',
      sequence: 'sequence',
      minimum: 'temps_minimum',
      maximum: 'temps_maximum',
      recommande: 'temps_recommande',
    }

    const type = typeMap[raw.type] ?? 'temps_recommande'
    const sujetId = raw.cibleCode ? `outcome_${raw.cibleCode}` : `constraint_target_${index}`

    return {
      id: makeConstraintId(type, sujetId, index),
      type,
      description: raw.description,
      obligatoire: type === 'prerequis' || type === 'sequence',
      sujetId,
      valeur: raw.valeur,
      unite: raw.unite,
      prealablesIds: raw.prealablesCode?.map(c => `outcome_${c}`),
      source: 'curriculum',
      province,
    }
  }

  // Validate a set of planned outcome orderings against constraints
  validate(
    plannedOrder: string[],  // outcomeIds in planned teaching order
    constraints: ConstraintSet,
  ): ConstraintValidationResult {
    const violations: ConstraintViolation[] = []
    const warnings: string[] = []

    const orderIndex = new Map(plannedOrder.map((id, i) => [id, i]))

    for (const constraint of constraints.constraints) {
      if (!constraint.obligatoire) continue

      switch (constraint.type) {
        case 'prerequis':
        case 'sequence': {
          const sujetPos = orderIndex.get(constraint.sujetId)
          for (const preId of constraint.prealablesIds ?? []) {
            const prePos = orderIndex.get(preId)
            if (sujetPos !== undefined && prePos !== undefined && prePos >= sujetPos) {
              violations.push({
                constraintId: constraint.id,
                constraintType: constraint.type,
                severity: 'critique',
                message: `"${preId}" doit précéder "${constraint.sujetId}" selon la contrainte ${constraint.type}.`,
                sujetId: constraint.sujetId,
              })
            }
          }
          break
        }
      }
    }

    const totalObligatoires = constraints.constraints.filter(c => c.obligatoire).length
    const violated = violations.length
    const score = totalObligatoires > 0
      ? Math.round((1 - violated / totalObligatoires) * 100)
      : 100

    return {
      valid: violations.filter(v => v.severity === 'critique').length === 0,
      violations,
      warnings,
      score,
    }
  }

  // Build a pacing model from outcomes + constraints
  buildPacingModel(
    outcomes: NormalizedOutcome[],
    constraints: ConstraintSet,
    minutesPerWeek = 200,   // Default: ~3h20 of a subject per week
  ): CurriculumPacingModel {
    const pacingOutcomes: OutcomePacing[] = outcomes.map(outcome => {
      const timeConstraint = constraints.constraints.find(
        c => c.sujetId === outcome.id && c.type.startsWith('temps_')
      )
      const minutes = timeConstraint?.valeur ?? estimateOutcomeMinutes(outcome)
      const prereqs = constraints.constraints
        .filter(c => c.sujetId === outcome.id && c.type === 'prerequis')
        .flatMap(c => c.prealablesIds ?? [])

      return {
        outcomeId: outcome.id,
        outcomeCode: outcome.code,
        outcomeTitre: outcome.texte.substring(0, 80),
        tempsEstimeMinutes: minutes,
        prealablesIds: prereqs,
        priorite: 'normale',
      }
    })

    const totalMinutes = pacingOutcomes.reduce((sum, o) => sum + o.tempsEstimeMinutes, 0)
    const totalSemaines = Math.ceil(totalMinutes / minutesPerWeek)

    return {
      curriculumId: constraints.curriculumId,
      province: constraints.province,
      matiere: constraints.matiere,
      niveaux: constraints.niveaux,
      totalHeuresEstimees: Math.round(totalMinutes / 60),
      totalSemainesRequises: totalSemaines,
      outcomes: pacingOutcomes,
      contraintes: constraints,
    }
  }
}

export const constraintEngine = new ConstraintEngine()
