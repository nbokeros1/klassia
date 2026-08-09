// SPIE-05 — Simulation Report Service
// Builds the final SimulationReport from a simulation and optional scenario comparison.

import type { PedagogicalSimulation } from '../types/simulation'
import type { ScenarioComparison } from '../types/scenario'
import type { SimulationReport } from '../types/report'

let reportCounter = 0

export class SimulationReportService {
  build(
    simulation: PedagogicalSimulation,
    scenarioComparison?: ScenarioComparison,
  ): SimulationReport {
    const bloquerGeneration = simulation.statut === 'irrealisable'

    const nextSteps = this.buildNextSteps(simulation, scenarioComparison)

    return {
      id: `report_${++reportCounter}`,
      twinId: simulation.twinId,
      enseignantId: simulation.enseignantId,
      classeId: simulation.classeId,
      academicYear: simulation.academicYear,
      simulation,
      scenarioComparison,
      verdict: simulation.resume,
      nextSteps,
      bloquerGeneration,
      raisonBlocage: bloquerGeneration ? simulation.messageEnseignant : undefined,
      generatedAt: new Date().toISOString(),
    }
  }

  private buildNextSteps(
    simulation: PedagogicalSimulation,
    comparison?: ScenarioComparison,
  ): string[] {
    const steps: string[] = []

    if (simulation.statut === 'irrealisable') {
      steps.push('Révisez votre plan pédagogique avant de continuer.')
      if (comparison) {
        steps.push(`Considérez le Scénario ${comparison.scenarioRecommande} — ${comparison.raisonRecommandation}`)
      }
      const criticalRecs = simulation.recommandations.filter(r => r.priorite === 'critique')
      for (const rec of criticalRecs.slice(0, 2)) {
        steps.push(rec.description)
      }
    } else if (simulation.statut === 'difficile') {
      steps.push('Appliquez les recommandations prioritaires avant de générer du contenu.')
      const topRecs = simulation.recommandations.slice(0, 3)
      for (const rec of topRecs) {
        steps.push(rec.titre)
      }
    } else if (simulation.statut === 'realisable_risques') {
      steps.push('Votre plan est viable. Consultez les recommandations non urgentes.')
      steps.push('Vous pouvez procéder à la génération de vos premières leçons.')
    } else {
      steps.push('Votre plan est solide. Procédez à la génération de vos leçons.')
    }

    return steps
  }
}

export const simulationReportService = new SimulationReportService()
