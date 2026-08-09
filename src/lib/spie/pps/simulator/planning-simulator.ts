// SPIE-05 — Planning Simulator (main engine)
// Orchestrates risk detection + recommendation generation.
// Returns a PedagogicalSimulation — does NOT generate any document.

import type { SimulationInput, PedagogicalSimulation, SimulationStatus } from '../types/simulation'
import { pedagogicalRiskEngine } from '../risk/pedagogical-risk-engine'
import { planningRecommendationEngine } from '../recommendations/planning-recommendation-engine'

let simCounter = 0

// ─── Score de viabilité ───────────────────────────────────────────────────────

function computeScore(
  totalHeuresPlanifiees: number,
  totalHeuresDisponibles: number,
  coveragePercent: number,
  nbRisquesCritiques: number,
  nbRisquesMajeurs: number,
): number {
  if (nbRisquesCritiques > 0) return Math.max(0, 30 - nbRisquesCritiques * 10)

  let score = 100

  // Time ratio penalty
  const ratio = totalHeuresPlanifiees / Math.max(1, totalHeuresDisponibles)
  if (ratio > 1) score -= Math.min(40, (ratio - 1) * 100)

  // Coverage penalty
  if (coveragePercent < 90) score -= (90 - coveragePercent) * 0.5

  // Major risks penalty
  score -= nbRisquesMajeurs * 10

  return Math.max(0, Math.min(100, Math.round(score)))
}

// ─── Statut from score ────────────────────────────────────────────────────────

function statusFromScore(score: number, hasBlockingRisk: boolean): SimulationStatus {
  if (hasBlockingRisk || score < 20) return 'irrealisable'
  if (score < 50) return 'difficile'
  if (score < 75) return 'realisable_risques'
  return 'realisable'
}

// ─── Human messages ───────────────────────────────────────────────────────────

function buildMessages(
  statut: SimulationStatus,
  score: number,
  nbRisquesCritiques: number,
  deficitHeures: number,
  coveragePercent: number,
): { resume: string; messageEnseignant: string } {
  const messages: Record<SimulationStatus, { resume: string; messageEnseignant: string }> = {
    realisable: {
      resume: `Plan viable — score de viabilité : ${score}/100.`,
      messageEnseignant: 'Votre plan pédagogique est réalisable dans le temps disponible. Vous pouvez procéder à la génération des leçons.',
    },
    realisable_risques: {
      resume: `Plan viable avec des points d'attention (score : ${score}/100).`,
      messageEnseignant: 'Votre plan est réalisable mais présente quelques risques. Consultez les recommandations avant de générer vos leçons.',
    },
    difficile: {
      resume: `Plan difficile à tenir — des ajustements importants sont requis (score : ${score}/100).`,
      messageEnseignant: 'Votre plan présente des risques significatifs. Appliquez les recommandations prioritaires avant de générer du contenu.',
    },
    irrealisable: {
      resume: `Plan irréalisable dans le temps disponible (score : ${score}/100). Révision obligatoire.`,
      messageEnseignant: `Votre plan nécessite ${Math.round(Math.abs(deficitHeures))}h de plus que le temps disponible. Vous devez réviser votre plan avant de pouvoir générer des leçons.`,
    },
  }
  return messages[statut]
}

// ─── Planning Simulator ───────────────────────────────────────────────────────

export class PlanningSimulator {
  simulate(input: SimulationInput): PedagogicalSimulation {
    const startMs = Date.now()

    const totalHeuresPlanifiees = input.sequences.reduce(
      (sum, s) => sum + s.dureeEstimeeHeures,
      0,
    )
    const totalHeuresDisponibles = input.minutesRestantes / 60
    const deficitHeures = totalHeuresDisponibles - totalHeuresPlanifiees

    const outcomesCouverts = input.sequences.reduce((sum, s) => sum + s.outcomeIds.length, 0)
    const coveragePercent = input.curriculumOutcomesTotal > 0
      ? Math.round((outcomesCouverts / input.curriculumOutcomesTotal) * 100)
      : 0

    // Detect risks
    const risques = pedagogicalRiskEngine.detect(input)
    const nbRisquesCritiques = risques.filter(r => r.niveau === 'critique').length
    const nbRisquesMajeurs = risques.filter(r => r.niveau === 'majeur').length
    const hasBlockingRisk = risques.some(r => r.bloquant)

    // Generate recommendations
    const recommandations = planningRecommendationEngine.generate(risques, input)

    // Compute score and status
    const scoreViabilite = computeScore(
      totalHeuresPlanifiees,
      totalHeuresDisponibles,
      coveragePercent,
      nbRisquesCritiques,
      nbRisquesMajeurs,
    )
    const statut = statusFromScore(scoreViabilite, hasBlockingRisk)

    const { resume, messageEnseignant } = buildMessages(
      statut,
      scoreViabilite,
      nbRisquesCritiques,
      deficitHeures,
      coveragePercent,
    )

    return {
      id: `sim_${Date.now()}_${++simCounter}`,
      twinId: input.twinId,
      enseignantId: input.enseignantId,
      classeId: input.classeId,
      academicYear: input.academicYear,
      statut,
      scoreViabilite,
      totalHeuresPlanifiees,
      totalHeuresDisponibles,
      deficitHeures,
      coveragePercent,
      risques,
      nbRisquesCritiques,
      nbRisquesMajeurs,
      recommandations,
      resume,
      messageEnseignant,
      simulatedAt: new Date().toISOString(),
      durationMs: Date.now() - startMs,
    }
  }
}

export const planningSimulator = new PlanningSimulator()
