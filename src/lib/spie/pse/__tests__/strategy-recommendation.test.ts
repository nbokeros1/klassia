// SPIE-07 — StrategyRecommendationEngine tests

import { StrategyRecommendationEngine } from '../recommendations/strategy-recommendation-engine'
import type { PedagogicalStrategy } from '../types/strategy'
import type { StrategyValidationReport } from '../types/validation'

function makeStrategy(overrides: Partial<PedagogicalStrategy> = {}): PedagogicalStrategy {
  return {
    id: 'strat-1',
    nom: 'Test',
    description: 'Test',
    enseignantId: 'e1',
    classeId: 'c1',
    matiereId: 'math',
    academicYear: '2025-2026',
    langue: 'fr',
    objectifsGeneraux: ['Goal'],
    outcomesCouverts: ['o1', 'o2', 'o3'],
    approche: 'mixte',
    justificationApproche: 'Approche équilibrée.',
    ordreSequences: ['s1'],
    rationaleOrdre: 'Test',
    niveauDifficulte: 'moyen',
    progressionDifficulte: 'lineaire',
    nbSequences: 1,
    sequencesParTrimestre: [1, 0, 0],
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
    risquesPrincipaux: ['Risque A'],
    strategiesAttenuation: ['Atténuation A'],
    scoreQualite: 75,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeReport(overrides: Partial<StrategyValidationReport> = {}): StrategyValidationReport {
  return {
    id: 'val-1',
    strategyId: 'strat-1',
    scoreGlobal: 75,
    validePourGeneration: true,
    dimensions: [],
    avertissements: [],
    bloqueurs: [],
    validatedAt: new Date().toISOString(),
    durationMs: 10,
    ...overrides,
  }
}

describe('StrategyRecommendationEngine', () => {
  let engine: StrategyRecommendationEngine

  beforeEach(() => { engine = new StrategyRecommendationEngine() })

  test('generates a complete recommendation', () => {
    const rec = engine.generate({ strategy: makeStrategy(), validationReport: makeReport() })
    expect(rec.strategyId).toBe('strat-1')
    expect(rec.pourquoi.length).toBeGreaterThan(10)
    expect(rec.avantages.length).toBeGreaterThan(0)
    expect(rec.risques.length).toBeGreaterThan(0)
    expect(rec.generatedAt).toBeTruthy()
  })

  test('high score → eleve confidence', () => {
    const rec = engine.generate({ strategy: makeStrategy(), validationReport: makeReport({ scoreGlobal: 85 }) })
    expect(rec.niveauConfiance).toBe('eleve')
  })

  test('medium score → moyen confidence', () => {
    const rec = engine.generate({ strategy: makeStrategy(), validationReport: makeReport({ scoreGlobal: 65 }) })
    expect(rec.niveauConfiance).toBe('moyen')
  })

  test('low score → faible confidence', () => {
    const rec = engine.generate({ strategy: makeStrategy(), validationReport: makeReport({ scoreGlobal: 40 }) })
    expect(rec.niveauConfiance).toBe('faible')
  })

  test('bloqueurs appear in risques', () => {
    const rec = engine.generate({
      strategy: makeStrategy(),
      validationReport: makeReport({ bloqueurs: ['Couverture insuffisante'] }),
    })
    expect(rec.risques.some(r => r.includes('Bloqueur'))).toBe(true)
  })

  test('avantages contains approach-specific advantage', () => {
    const rec = engine.generate({
      strategy: makeStrategy({ approche: 'apprentissage_actif' }),
      validationReport: makeReport(),
    })
    expect(rec.avantages.some(a => a.includes('engagement'))).toBe(true)
  })
})
