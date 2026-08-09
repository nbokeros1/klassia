// SPIE-07 — PedagogicalDecisionTreeBuilder tests

import { PedagogicalDecisionTreeBuilder } from '../decision-tree/pedagogical-decision-tree'
import type { StrategyDecisionNode } from '../types/decision-tree'
import type { PedagogicalStrategy } from '../types/strategy'

function makeStrategy(): PedagogicalStrategy {
  return {
    id: 'strat-1',
    nom: 'Test',
    description: 'Test',
    enseignantId: 'e1',
    classeId: 'c1',
    matiereId: 'math',
    academicYear: '2025-2026',
    langue: 'fr',
    objectifsGeneraux: [],
    outcomesCouverts: ['o1', 'o2'],
    approche: 'mixte',
    justificationApproche: 'Test',
    ordreSequences: ['s1'],
    rationaleOrdre: 'Test',
    niveauDifficulte: 'moyen',
    progressionDifficulte: 'lineaire',
    nbSequences: 1,
    sequencesParTrimestre: [1, 0, 0],
    nbEvaluationsFormatives: 1,
    nbEvaluationsSommatives: 1,
    momentEvaluations: 'distribue',
    rationaleEvaluations: 'Test',
    differenciationPrevue: false,
    strategiesDifferentiation: [],
    rationaleDifferentiation: 'Test',
    minutesParSemaine: 60,
    heuresTotalesPrevues: 20,
    reserveTamponPercent: 0.10,
    rationaleTemps: 'Test',
    risquesPrincipaux: [],
    strategiesAttenuation: [],
    createdAt: new Date().toISOString(),
  }
}

function makeDecision(type: StrategyDecisionNode['type'], reponse: string): StrategyDecisionNode {
  return {
    id: `dec-${type}`,
    type,
    question: `Question for ${type}?`,
    facteursConsideres: ['factor A', 'factor B'],
    reponse,
    rationale: 'Because of reasons.',
    score: 80,
    timestamp: new Date().toISOString(),
  }
}

describe('PedagogicalDecisionTreeBuilder', () => {
  let builder: PedagogicalDecisionTreeBuilder

  beforeEach(() => { builder = new PedagogicalDecisionTreeBuilder() })

  test('builds a tree with correct strategy linkage', () => {
    const decisions = [makeDecision('choix_approche', 'mixte'), makeDecision('niveau_difficulte', 'moyen')]
    const tree = builder.build({ strategy: makeStrategy(), decisions })
    expect(tree.strategyId).toBe('strat-1')
    expect(tree.classeId).toBe('c1')
    expect(tree.enseignantId).toBe('e1')
    expect(tree.id).toBeTruthy()
  })

  test('trace contains all decisions', () => {
    const decisions = [
      makeDecision('choix_approche', 'mixte'),
      makeDecision('niveau_difficulte', 'moyen'),
      makeDecision('planification_evals', '3 formatives, 1 sommative'),
    ]
    const tree = builder.build({ strategy: makeStrategy(), decisions })
    expect(tree.trace.decisions).toHaveLength(3)
  })

  test('summary has one entry per decision', () => {
    const decisions = [makeDecision('choix_approche', 'mixte'), makeDecision('gestion_temps', '30h')]
    const tree = builder.build({ strategy: makeStrategy(), decisions })
    expect(tree.resumeDecisions).toHaveLength(2)
  })

  test('conclusion is non-empty', () => {
    const tree = builder.build({ strategy: makeStrategy(), decisions: [makeDecision('choix_approche', 'mixte')] })
    expect(tree.trace.conclusion.length).toBeGreaterThan(10)
  })

  test('factorsGlobaux are extracted from decisions', () => {
    const decisions = [
      makeDecision('choix_approche', 'mixte'),    // factors: [A, B]
      makeDecision('niveau_difficulte', 'moyen'), // factors: [A, B]
    ]
    const tree = builder.build({ strategy: makeStrategy(), decisions })
    // factor A and B appear twice → should be in global factors
    expect(tree.trace.factorsGlobaux).toContain('factor A')
  })

  test('handles empty decisions gracefully', () => {
    const tree = builder.build({ strategy: makeStrategy(), decisions: [] })
    expect(tree.trace.decisions).toHaveLength(0)
    expect(tree.resumeDecisions).toHaveLength(0)
    expect(tree.trace.conclusion).toBeTruthy()
  })
})
