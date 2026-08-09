// SPIE-07 — StrategyBuilder tests

import { StrategyBuilder } from '../builder/strategy-builder'
import type { StrategyBuilderInput } from '../builder/strategy-builder'
import type { NormalizedOutcome } from '../../curriculum/extraction/types'

function makeOutcome(id: string, niveauBloom?: NormalizedOutcome['niveauBloom']): NormalizedOutcome {
  return {
    id,
    texte: `Objectif ${id}`,
    vocabulaireSpie: 'outcome_specifique',
    vocabulaireOriginal: 'RAS',
    conceptsIds: [],
    tags: [],
    niveauBloom,
  }
}

const baseInput: StrategyBuilderInput = {
  outcomes: [
    makeOutcome('o1', 'connaissance'),
    makeOutcome('o2', 'comprehension'),
    makeOutcome('o3', 'application'),
    makeOutcome('o4', 'analyse'),
    makeOutcome('o5', 'evaluation'),
  ],
  enseignantId: 'ens-1',
  classeId: 'cls-1',
  matiereId: 'math',
  academicYear: '2025-2026',
  langue: 'fr',
}

describe('StrategyBuilder', () => {
  let builder: StrategyBuilder

  beforeEach(() => { builder = new StrategyBuilder() })

  test('builds a complete strategy', () => {
    const { strategy } = builder.build(baseInput)
    expect(strategy.id).toBeTruthy()
    expect(strategy.approche).toBeTruthy()
    expect(strategy.niveauDifficulte).toBeTruthy()
    expect(strategy.outcomesCouverts).toHaveLength(5)
    expect(strategy.createdAt).toBeTruthy()
  })

  test('respects teacher approach preference', () => {
    const { strategy } = builder.build({ ...baseInput, approchePreferee: 'collaboration' })
    expect(strategy.approche).toBe('collaboration')
  })

  test('respects teacher difficulty preference', () => {
    const { strategy } = builder.build({ ...baseInput, niveauDifficulteVise: 'tres_exigeant' })
    expect(strategy.niveauDifficulte).toBe('tres_exigeant')
  })

  test('differenciationPrioritaire sets approach to differentie', () => {
    const { strategy } = builder.build({ ...baseInput, differenciationPrioritaire: true })
    expect(strategy.approche).toBe('differentie')
    expect(strategy.differenciationPrevue).toBe(true)
  })

  test('irrealisable simulation → enseignement_direct', () => {
    const { strategy } = builder.build({
      ...baseInput,
      simulation: {
        id: 's1', twinId: undefined, enseignantId: 'ens-1', classeId: 'cls-1', academicYear: '2025-2026',
        statut: 'irrealisable', scoreViabilite: 10,
        totalHeuresPlanifiees: 200, totalHeuresDisponibles: 100, deficitHeures: -100, coveragePercent: 80,
        risques: [], nbRisquesCritiques: 2, nbRisquesMajeurs: 3,
        recommandations: [], resume: '', messageEnseignant: '',
        simulatedAt: '', durationMs: 0,
      },
    })
    expect(strategy.approche).toBe('enseignement_direct')
  })

  test('records decisions for every major choice', () => {
    const { decisions } = builder.build(baseInput)
    const types = decisions.map(d => d.type)
    expect(types).toContain('choix_approche')
    expect(types).toContain('niveau_difficulte')
    expect(types).toContain('planification_evals')
    expect(types).toContain('differentiation')
    expect(types).toContain('gestion_temps')
    expect(types).toContain('gestion_risques')
  })

  test('evaluation counts scale with sequences', () => {
    const manyOutcomes = Array.from({ length: 10 }, (_, i) => makeOutcome(`o${i}`))
    const { strategy } = builder.build({ ...baseInput, outcomes: manyOutcomes })
    expect(strategy.nbEvaluationsFormatives).toBeGreaterThan(0)
    expect(strategy.nbEvaluationsSommatives).toBeGreaterThan(0)
  })

  test('sequencesParTrimestre sums to nbSequences (approximately)', () => {
    const { strategy } = builder.build(baseInput)
    const sum = strategy.sequencesParTrimestre.reduce((a, b) => a + b, 0)
    expect(Math.abs(sum - strategy.nbSequences)).toBeLessThanOrEqual(2)
  })
})
