// SPIE-07 — StrategyValidator tests

import { StrategyValidator } from '../validation/strategy-validator'
import type { StrategyValidatorInput } from '../validation/strategy-validator'
import type { PedagogicalStrategy } from '../types/strategy'

function makeStrategy(overrides: Partial<PedagogicalStrategy> = {}): PedagogicalStrategy {
  return {
    id: 'strat-test',
    nom: 'Test strategy',
    description: 'Test',
    enseignantId: 'ens-1',
    classeId: 'cls-1',
    matiereId: 'math',
    academicYear: '2025-2026',
    langue: 'fr',
    objectifsGeneraux: ['Goal 1'],
    outcomesCouverts: Array.from({ length: 20 }, (_, i) => `o${i}`),
    approche: 'mixte',
    justificationApproche: 'Test',
    ordreSequences: ['s1', 's2', 's3'],
    rationaleOrdre: 'Test',
    niveauDifficulte: 'moyen',
    progressionDifficulte: 'lineaire',
    nbSequences: 3,
    sequencesParTrimestre: [1, 1, 1],
    nbEvaluationsFormatives: 3,
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
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('StrategyValidator', () => {
  let validator: StrategyValidator

  beforeEach(() => { validator = new StrategyValidator() })

  test('validates a good strategy with high score', () => {
    const strategy = makeStrategy({ heuresTotalesPrevues: 30 })
    const report = validator.validate({ strategy, totalOutcomes: 20, heuresDisponibles: 35 })
    expect(report.scoreGlobal).toBeGreaterThanOrEqual(60)
    expect(report.validePourGeneration).toBe(true)
    expect(report.dimensions).toHaveLength(7)
  })

  test('fails with low coverage', () => {
    const strategy = makeStrategy({ outcomesCouverts: ['o1', 'o2'] }) // only 2 out of 20
    const report = validator.validate({ strategy, totalOutcomes: 20, heuresDisponibles: 35 })
    const dim = report.dimensions.find(d => d.nom === 'couverture_curriculum')!
    expect(dim.score).toBeLessThan(75)
  })

  test('blocks generation when coverage too low', () => {
    const strategy = makeStrategy({ outcomesCouverts: ['o1'] }) // 1 out of 30
    const report = validator.validate({ strategy, totalOutcomes: 30, heuresDisponibles: 35 })
    expect(report.bloqueurs.length).toBeGreaterThan(0)
    expect(report.validePourGeneration).toBe(false)
  })

  test('penalizes time overrun', () => {
    const strategy = makeStrategy({ heuresTotalesPrevues: 50 })
    const report = validator.validate({ strategy, totalOutcomes: 20, heuresDisponibles: 35 })
    const timeDim = report.dimensions.find(d => d.nom === 'gestion_temps')!
    expect(timeDim.score).toBeLessThan(75)
  })

  test('blocks generation on critical time overrun', () => {
    const strategy = makeStrategy({ heuresTotalesPrevues: 80 })
    const report = validator.validate({ strategy, totalOutcomes: 20, heuresDisponibles: 35 })
    expect(report.bloqueurs.some(b => b.includes('irréalisable'))).toBe(true)
    expect(report.validePourGeneration).toBe(false)
  })

  test('flags coherence mismatch — direct + tres_exigeant', () => {
    const strategy = makeStrategy({ approche: 'enseignement_direct', niveauDifficulte: 'tres_exigeant' })
    const report = validator.validate({ strategy, totalOutcomes: 20, heuresDisponibles: 35 })
    const dim = report.dimensions.find(d => d.nom === 'coherence')!
    expect(dim.score).toBeLessThan(75)
  })

  test('poor evaluation ratio emits warning', () => {
    const strategy = makeStrategy({ nbEvaluationsFormatives: 1, nbEvaluationsSommatives: 5 })
    const report = validator.validate({ strategy, totalOutcomes: 20, heuresDisponibles: 35 })
    expect(report.avertissements.some(w => w.includes('formatives'))).toBe(true)
  })

  test('scoreGlobal is between 0 and 100', () => {
    const strategy = makeStrategy()
    const report = validator.validate({ strategy, totalOutcomes: 20, heuresDisponibles: 35 })
    expect(report.scoreGlobal).toBeGreaterThanOrEqual(0)
    expect(report.scoreGlobal).toBeLessThanOrEqual(100)
  })
})
