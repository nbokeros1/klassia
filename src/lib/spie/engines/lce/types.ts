// LCE — Learning Continuity Engine types

import type { AnnualPlan, SequencePlan } from '../../types/planning'

export interface LCEContinuityCheck {
  annualPlanId: string
  classeId: string
  asOf?: string                   // ISO date, defaults to today
}

export interface LCEContinuityReport {
  annualPlanId: string
  classeId: string
  generatedAt: string
  // Overall continuity score (0–100)
  scoreCoherence: number
  // Lessons taught vs. planned
  progressionReelle: {
    leconsPlanifiees: number
    leconsEnseignees: number
    pourcentageProgression: number
  }
  // Calendar deviation
  deviationCalendrier: {
    semainesDeRetard: number
    semainesEnAvance: number
    impactEstime: string          // Human-readable impact description
  }
  // Curriculum coverage gaps
  lacunesCurriculaires: LCEGap[]
  // Suggested adjustments
  ajustementsSuggerés: LCEAdjustment[]
  // Prerequisites not yet covered for upcoming lessons
  prerequisManquants: LCEPrerequisite[]
}

export interface LCEGap {
  outcomeSpecifiqueId: string
  code: string
  libelle: string
  type: 'non_prevu' | 'prevu_mais_non_enseigne' | 'enseigne_partiellement'
  urgence: 'haute' | 'normale' | 'basse'
}

export interface LCEAdjustment {
  type: 'reporter' | 'avancer' | 'fusionner' | 'supprimer' | 'ajouter'
  description: string
  sequenceId?: string
  lessonId?: string
  impact: string
}

export interface LCEPrerequisite {
  leconProchaine: string
  outcomeManquantId: string
  outcomeManquantLibelle: string
  estCritique: boolean
}
