// ── Decision Engine — Types (ME-12) ───────────────────────────────────────────
//
// MissionPlan : structure de sortie du Decision Engine.
// Le Dashboard consomme MissionPlan, jamais Mission[] directement.

import type { Mission, MissionType } from '../mission-engine/types'

/** Nombre maximum de missions secondaires visibles. */
export const MAX_SECONDARY = 3

// ── Bundle ────────────────────────────────────────────────────────────────────

/**
 * Fusion intelligente de plusieurs missions liées.
 * Exemple : evaluation + deadline → "Préparer et planifier l'évaluation"
 *
 * La mission "lead" (représentant du bundle dans le plan) remplace les missions
 * originales dans primaryMission / secondaryMissions.
 * Les missions originales sont accessibles via bundle.missions.
 */
export interface MissionBundle {
  id:          string
  title:       string
  description: string
  missions:    Mission[]
  primaryType: MissionType
  priority:    number
}

// ── Summary ───────────────────────────────────────────────────────────────────

/**
 * Résumé lisible du plan de travail.
 *
 * Exemple de label :
 *   "Aujourd'hui : 1 priorité absolue, 2 tâches secondaires, 3 reportées"
 */
export interface MissionSummary {
  totalMissions:  number
  primaryCount:   number
  secondaryCount: number
  deferredCount:  number
  hiddenCount:    number
  bundleCount:    number
  label:          string
}

// ── Plan ─────────────────────────────────────────────────────────────────────

/**
 * Plan de travail cohérent produit par le Decision Engine.
 *
 * primaryMission    : toujours 1 (ou null si aucune mission active).
 * secondaryMissions : max MAX_SECONDARY.
 * deferredMissions  : missions importantes mais reportées faute de capacité.
 * hiddenMissions    : missions completed/dismissed — jamais supprimées.
 * bundles           : fusions de missions liées.
 * summary           : résumé lisible.
 */
export interface MissionPlan {
  primaryMission:    Mission | null
  secondaryMissions: Mission[]
  deferredMissions:  Mission[]
  hiddenMissions:    Mission[]
  bundles:           MissionBundle[]
  summary:           MissionSummary
}
