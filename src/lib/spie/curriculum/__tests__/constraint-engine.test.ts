// SPIE-02 — Constraint Engine tests
import { ConstraintEngine } from '../constraints/constraint-engine'
import type { NormalizedOutcome } from '../extraction/types'
import type { CurriculumExtractionRaw } from '../extraction/types'

const mockRaw: CurriculumExtractionRaw = {
  province: 'alberta',
  matiere: 'Mathématiques',
  niveaux: ['grade 4'],
  outcomesGeneraux: [],
  outcomesSpecifiques: [],
  competences: [],
  bigIdeas: [],
  concepts: [],
  vocabulaire: [],
  contraintes: [
    {
      description: 'A doit précéder B dans l\'enseignement',
      type: 'prerequis',
      prealablesCode: ['A'],
      cibleCode: 'B',
    },
    {
      description: 'Minimum 3 semaines pour l\'unité A',
      type: 'minimum',
      valeur: 3,
      unite: 'semaines',
      cibleCode: 'A',
    },
  ],
  confidenceScore: 85,
  completenessScore: 90,
  warnings: [],
}

const mockOutcomes: NormalizedOutcome[] = [
  {
    id: 'outcome_A',
    code: 'A',
    texte: 'Outcome A',
    vocabulaireSpie: 'rag_ras',
    vocabulaireOriginal: 'RAG',
    niveauBloom: 'comprendre',
    conceptsIds: [],
    tags: [],
  },
  {
    id: 'outcome_B',
    code: 'B',
    texte: 'Outcome B',
    vocabulaireSpie: 'rag_ras',
    vocabulaireOriginal: 'RAG',
    niveauBloom: 'appliquer',
    conceptsIds: [],
    tags: [],
  },
]

describe('ConstraintEngine', () => {
  const engine = new ConstraintEngine()

  test('extracts prerequisite constraints from raw curriculum', () => {
    const set = engine.extractConstraints(mockRaw, mockOutcomes)
    const prereqs = set.constraints.filter(c => c.type === 'prerequis')
    expect(prereqs.length).toBeGreaterThan(0)
  })

  test('extracts minimum time constraints', () => {
    const set = engine.extractConstraints(mockRaw, mockOutcomes)
    const minTime = set.constraints.filter(c => c.type === 'temps_minimum')
    expect(minTime.length).toBeGreaterThan(0)
    expect(minTime[0].valeur).toBe(3)
    expect(minTime[0].unite).toBe('semaines')
  })

  test('infers time constraints for outcomes without explicit time', () => {
    const rawNoConstraints: CurriculumExtractionRaw = { ...mockRaw, contraintes: [] }
    const set = engine.extractConstraints(rawNoConstraints, mockOutcomes)
    const timeConstraints = set.constraints.filter(c => c.type === 'temps_recommande')
    expect(timeConstraints.length).toBe(mockOutcomes.length)
  })

  test('validates correct order passes', () => {
    const set = engine.extractConstraints(mockRaw, mockOutcomes)
    // A before B — valid
    const result = engine.validate(['outcome_A', 'outcome_B'], set)
    expect(result.violations.filter(v => v.severity === 'critique')).toHaveLength(0)
  })

  test('validates wrong order fails', () => {
    const set = engine.extractConstraints(mockRaw, mockOutcomes)
    // B before A — invalid (A is prerequisite of B)
    const result = engine.validate(['outcome_B', 'outcome_A'], set)
    const critiques = result.violations.filter(v => v.severity === 'critique')
    expect(critiques.length).toBeGreaterThan(0)
  })

  test('builds pacing model with total hours', () => {
    const set = engine.extractConstraints(mockRaw, mockOutcomes)
    const model = engine.buildPacingModel(mockOutcomes, set, 200)
    expect(model.totalHeuresEstimees).toBeGreaterThan(0)
    expect(model.totalSemainesRequises).toBeGreaterThan(0)
    expect(model.outcomes).toHaveLength(mockOutcomes.length)
  })
})
