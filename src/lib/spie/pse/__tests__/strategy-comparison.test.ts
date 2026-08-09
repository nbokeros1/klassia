// SPIE-07 — StrategyComparisonEngine tests

import { StrategyComparisonEngine } from '../comparison/strategy-comparison-engine'
import type { PedagogicalStrategy } from '../types/strategy'

function makeStrategy(overrides: Partial<PedagogicalStrategy> = {}): PedagogicalStrategy {
  return {
    id: 'strat-test',
    nom: 'Test',
    description: 'Test',
    enseignantId: 'e1',
    classeId: 'c1',
    matiereId: 'math',
    academicYear: '2025-2026',
    langue: 'fr',
    objectifsGeneraux: [],
    outcomesCouverts: Array.from({ length: 15 }, (_, i) => `o${i}`),
    approche: 'mixte',
    justificationApproche: 'Test',
    ordreSequences: ['s1', 's2'],
    rationaleOrdre: 'Test',
    niveauDifficulte: 'moyen',
    progressionDifficulte: 'lineaire',
    nbSequences: 2,
    sequencesParTrimestre: [1, 1, 0],
    nbEvaluationsFormatives: 2,
    nbEvaluationsSommatives: 1,
    momentEvaluations: 'distribue',
    rationaleEvaluations: 'Test',
    differenciationPrevue: false,
    strategiesDifferentiation: [],
    rationaleDifferentiation: 'Test',
    minutesParSemaine: 60,
    heuresTotalesPrevues: 30,
    reserveTamponPercent: 0.10,
    rationaleTemps: 'Test',
    risquesPrincipaux: [],
    strategiesAttenuation: [],
    scoreQualite: 75,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('StrategyComparisonEngine', () => {
  let engine: StrategyComparisonEngine

  beforeEach(() => { engine = new StrategyComparisonEngine() })

  test('builds comparison with 3 snapshots', () => {
    const comparison = engine.buildComparison({ strategyA: makeStrategy() })
    expect(comparison.snapshots).toHaveLength(3)
    expect(comparison.snapshots.map(s => s.label)).toEqual(['A', 'B', 'C'])
  })

  test('snapshot A reflects input strategy', () => {
    const strategy = makeStrategy({ approche: 'apprentissage_actif', scoreQualite: 80 })
    const comparison = engine.buildComparison({ strategyA: strategy })
    const snapA = comparison.snapshots.find(s => s.label === 'A')!
    expect(snapA.approche).toBe('apprentissage_actif')
    expect(snapA.scoreQualite).toBe(80)
  })

  test('strategy C is always conservative (enseignement_direct)', () => {
    const comparison = engine.buildComparison({ strategyA: makeStrategy({ approche: 'collaboration' }) })
    const snapC = comparison.snapshots.find(s => s.label === 'C')!
    expect(snapC.approche).toBe('enseignement_direct')
    expect(snapC.niveauDifficulte).toBe('moyen')
  })

  test('recommendation is one of A, B, C', () => {
    const comparison = engine.buildComparison({ strategyA: makeStrategy() })
    expect(['A', 'B', 'C']).toContain(comparison.strategyRecommandee)
  })

  test('comparison table has expected dimensions', () => {
    const comparison = engine.buildComparison({ strategyA: makeStrategy() })
    const dimensions = comparison.tableau.map(r => r.dimension)
    expect(dimensions).toContain('Heures planifiées')
    expect(dimensions).toContain('Couverture du programme (%)')
    expect(dimensions).toContain('Score qualité')
  })

  test('narrative is non-empty', () => {
    const comparison = engine.buildComparison({ strategyA: makeStrategy() })
    expect(comparison.analyseNarrative.length).toBeGreaterThan(20)
  })
})
