// SPIE-05 — Scenario Engine
// Builds A/B/C plan alternatives and compares them.
// Each scenario is a variant of the reference plan — the teacher chooses one.

import type { SimulationInput } from '../types/simulation'
import type { Scenario, ScenarioComparison, ScenarioLabel } from '../types/scenario'
import type { SequenceBlock } from '../../aydte/types/twin'
import { planningSimulator } from '../simulator/planning-simulator'

let scenarioCounter = 0

// ─── Scenario builders ────────────────────────────────────────────────────────

function buildScenarioA(sequences: SequenceBlock[]): {
  sequences: SequenceBlock[]
  modifications: string[]
} {
  // Scenario A: reference plan (no modifications)
  return {
    sequences,
    modifications: ['Plan original — aucune modification'],
  }
}

function buildScenarioB(
  sequences: SequenceBlock[],
  compressionPercent = 20,
): {
  sequences: SequenceBlock[]
  modifications: string[]
} {
  // Scenario B: compress the longest sequences by compressionPercent%
  const sorted = [...sequences].sort((a, b) => b.dureeEstimeeHeures - a.dureeEstimeeHeures)
  const toCompress = sorted.slice(0, Math.ceil(sorted.length * 0.4))
  const compressedIds = new Set(toCompress.map(s => s.id))

  const modified = sequences.map(s => {
    if (!compressedIds.has(s.id)) return s
    return {
      ...s,
      dureeEstimeeHeures: Math.round(s.dureeEstimeeHeures * (1 - compressionPercent / 100) * 10) / 10,
    }
  })

  const heuresSauvegardees = Math.round(
    toCompress.reduce((sum, s) => sum + s.dureeEstimeeHeures * (compressionPercent / 100), 0) * 10,
  ) / 10

  return {
    sequences: modified,
    modifications: [
      `${toCompress.length} séquences les plus longues compressées de ${compressionPercent}%`,
      `Économie estimée : ${heuresSauvegardees}h`,
    ],
  }
}

function buildScenarioC(
  sequences: SequenceBlock[],
  removeCount = 1,
): {
  sequences: SequenceBlock[]
  modifications: string[]
  removed: SequenceBlock[]
} {
  // Scenario C: remove the lowest-priority sequences
  // Heuristic: remove sequences with the fewest outcomes (least curriculum impact)
  const sorted = [...sequences].sort((a, b) => a.outcomeIds.length - b.outcomeIds.length)
  const toRemove = sorted.slice(0, removeCount)
  const removeIds = new Set(toRemove.map(s => s.id))

  const modified = sequences.filter(s => !removeIds.has(s.id))

  return {
    sequences: modified,
    modifications: toRemove.map(s => `Séquence supprimée : "${s.titre}" (${s.outcomeIds.length} outcome(s), ${s.dureeEstimeeHeures}h)`),
    removed: toRemove,
  }
}

// ─── Scenario Engine ──────────────────────────────────────────────────────────

export class ScenarioEngine {
  buildComparison(input: SimulationInput): ScenarioComparison {
    const scenarios: Scenario[] = []

    // Scenario A: original
    const { sequences: seqA, modifications: modA } = buildScenarioA(input.sequences)
    const simA = planningSimulator.simulate({ ...input, sequences: seqA })
    scenarios.push({
      id: `scen_${++scenarioCounter}`,
      label: 'A',
      nom: 'Plan original',
      description: 'Le plan tel que vous l\'avez construit, sans modification.',
      sequences: seqA,
      statut: simA.statut,
      scoreViabilite: simA.scoreViabilite,
      totalHeuresPlanifiees: simA.totalHeuresPlanifiees,
      coveragePercent: simA.coveragePercent,
      nbRisques: simA.risques.length,
      nbRisquesCritiques: simA.nbRisquesCritiques,
      modificationsApportees: modA,
      avantages: ['Couverture curriculaire maximale', 'Aucun contenu supprimé'],
      inconvenients: simA.statut === 'irrealisable' ? ['Irréalisable dans le temps disponible'] : simA.statut === 'difficile' ? ['Rythme soutenu — peu de marge'] : [],
    })

    // Scenario B: compressed
    const { sequences: seqB, modifications: modB } = buildScenarioB(input.sequences)
    const simB = planningSimulator.simulate({ ...input, sequences: seqB })
    scenarios.push({
      id: `scen_${++scenarioCounter}`,
      label: 'B',
      nom: 'Plan compressé',
      description: 'Les séquences les plus longues sont compressées de 20% pour libérer du temps.',
      sequences: seqB,
      statut: simB.statut,
      scoreViabilite: simB.scoreViabilite,
      totalHeuresPlanifiees: simB.totalHeuresPlanifiees,
      coveragePercent: simB.coveragePercent,
      nbRisques: simB.risques.length,
      nbRisquesCritiques: simB.nbRisquesCritiques,
      modificationsApportees: modB,
      avantages: ['Crée une marge de temps', 'Conserve tous les outcomes'],
      inconvenients: ['Certaines séquences peuvent être moins approfondies'],
    })

    // Scenario C: reduced
    const totalHeuresPlanifiees = input.sequences.reduce((sum, s) => sum + s.dureeEstimeeHeures, 0)
    const totalHeuresDisponibles = input.minutesRestantes / 60
    const exces = totalHeuresPlanifiees - totalHeuresDisponibles
    const removeCount = exces > 0 ? Math.ceil(exces / (totalHeuresPlanifiees / input.sequences.length)) : 1

    const { sequences: seqC, modifications: modC, removed } = buildScenarioC(
      input.sequences,
      Math.max(1, Math.min(removeCount, 3)),
    )
    const simC = planningSimulator.simulate({ ...input, sequences: seqC })
    const outcomesRetires = removed.reduce((sum, s) => sum + s.outcomeIds.length, 0)

    scenarios.push({
      id: `scen_${++scenarioCounter}`,
      label: 'C',
      nom: 'Plan priorisé',
      description: 'Les séquences de moindre priorité sont retirées pour rendre le plan réalisable.',
      sequences: seqC,
      statut: simC.statut,
      scoreViabilite: simC.scoreViabilite,
      totalHeuresPlanifiees: simC.totalHeuresPlanifiees,
      coveragePercent: simC.coveragePercent,
      nbRisques: simC.risques.length,
      nbRisquesCritiques: simC.nbRisquesCritiques,
      modificationsApportees: modC,
      avantages: ['Plan clairement réalisable', 'Rythme soutenable'],
      inconvenients: [`${outcomesRetires} outcome(s) non couverts`, `Couverture réduite à ${simC.coveragePercent}%`],
    })

    // Determine recommended scenario
    const recommended = this.chooseRecommended(scenarios)

    return {
      scenarios,
      scenarioRecommande: recommended.label,
      raisonRecommandation: this.buildRaison(recommended),
      tableau: this.buildTableau(scenarios),
    }
  }

  private chooseRecommended(scenarios: Scenario[]): Scenario {
    // Prefer highest viability score, breaking ties by coverage
    const candidates = [...scenarios].sort((a, b) => {
      if (a.statut === 'irrealisable' && b.statut !== 'irrealisable') return 1
      if (b.statut === 'irrealisable' && a.statut !== 'irrealisable') return -1
      if (b.scoreViabilite !== a.scoreViabilite) return b.scoreViabilite - a.scoreViabilite
      return b.coveragePercent - a.coveragePercent
    })
    return candidates[0]
  }

  private buildRaison(scenario: Scenario): string {
    return `Le Scénario ${scenario.label} offre le meilleur équilibre entre viabilité (${scenario.scoreViabilite}/100) et couverture curriculaire (${scenario.coveragePercent}%).`
  }

  private buildTableau(scenarios: Scenario[]): ScenarioComparison['tableau'] {
    const labels: ScenarioLabel[] = ['A', 'B', 'C']
    const getScen = (l: ScenarioLabel): Scenario => scenarios.find(s => s.label === l)!

    const row = (champ: string, getValue: (s: Scenario) => string | number, higherIsBetter = true): ScenarioComparison['tableau'][0] => {
      const valeurs = Object.fromEntries(labels.map(l => [l, getValue(getScen(l))])) as Record<ScenarioLabel, string | number>
      const numericVals = Object.entries(valeurs).filter(([, v]) => typeof v === 'number')
      let meilleur: ScenarioLabel | undefined
      if (numericVals.length === labels.length) {
        const best = numericVals.reduce((a, b) =>
          (higherIsBetter ? (b[1] as number) > (a[1] as number) : (b[1] as number) < (a[1] as number)) ? b : a
        )
        meilleur = best[0] as ScenarioLabel
      }
      return { champ, valeurs, meilleur }
    }

    return [
      row('Score de viabilité', s => s.scoreViabilite),
      row('Couverture curriculaire (%)', s => s.coveragePercent),
      row('Heures planifiées', s => Math.round(s.totalHeuresPlanifiees * 10) / 10, false),
      row('Risques critiques', s => s.nbRisquesCritiques, false),
      row('Risques totaux', s => s.nbRisques, false),
    ]
  }
}

export const scenarioEngine = new ScenarioEngine()
