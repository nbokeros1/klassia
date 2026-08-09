// SPIE-05 — Pedagogical Planning Simulator
// PedagogicalSimulation: the main model produced by the simulator.
// Simulates feasibility BEFORE any document generation.

import type { AnnualPacingModel } from '../../aydte/types/pacing'
import type { SequenceBlock } from '../../aydte/types/twin'
import type { SimulationRisk } from './risk'
import type { SimulationRecommendation } from './recommendation'

// ─── Simulation status ────────────────────────────────────────────────────────

export type SimulationStatus =
  | 'realisable'         // Plan is feasible — proceed
  | 'realisable_risques' // Feasible with risks — proceed with caution
  | 'difficile'          // Difficult — significant adjustments recommended
  | 'irrealisable'       // Not feasible — must revise before generating

// ─── Simulation input ─────────────────────────────────────────────────────────

export interface SimulationInput {
  twinId?: string
  enseignantId: string
  classeId: string
  academicYear: string

  // Sequences to simulate
  sequences: SequenceBlock[]

  // Calendar constraints
  totalSemaines: number
  minutesParSemaine: number
  semainesRestantes: number
  minutesRestantes: number

  // Curriculum coverage target
  curriculumOutcomesTotal: number
  coverageTargetPercent?: number   // Default: 90%

  // Pacing context (optional — enriches the simulation)
  pacingModel?: AnnualPacingModel

  // Evaluation constraints
  maxEvaluationsParMois?: number   // Default: 2
  minJoursEntreEvaluations?: number  // Default: 7
}

// ─── Pedagogical Simulation ───────────────────────────────────────────────────
// Main output of the PlanningSimulator

export interface PedagogicalSimulation {
  id: string
  twinId?: string
  enseignantId: string
  classeId: string
  academicYear: string

  // ── Status ────────────────────────────────────────────────────────────────────
  statut: SimulationStatus
  scoreViabilite: number           // 0–100

  // ── Time analysis ─────────────────────────────────────────────────────────────
  totalHeuresPlanifiees: number
  totalHeuresDisponibles: number
  deficitHeures: number            // < 0 = too much planned, > 0 = buffer
  coveragePercent: number

  // ── Risks ─────────────────────────────────────────────────────────────────────
  risques: SimulationRisk[]
  nbRisquesCritiques: number
  nbRisquesMajeurs: number

  // ── Recommendations ───────────────────────────────────────────────────────────
  recommandations: SimulationRecommendation[]

  // ── Summary ───────────────────────────────────────────────────────────────────
  resume: string             // Human-readable sentence
  messageEnseignant: string  // Actionable message for the teacher

  simulatedAt: string
  durationMs: number
}
