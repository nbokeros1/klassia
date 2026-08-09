// SPIE-02 — Graph builder tests
import { CurriculumGraphBuilder, serializeGraph, deserializeGraph } from '../graph/graph-builder'
import { getSpecificOutcomes, getRequiredConcepts, summarizeGraph } from '../graph/graph-queries'
import type { NormalizedOutcome, NormalizedConcept, CurriculumExtractionRaw } from '../extraction/types'

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
  contraintes: [],
  confidenceScore: 85,
  completenessScore: 90,
  warnings: [],
}

const mockOutcomes: NormalizedOutcome[] = [
  {
    id: 'outcome_A',
    code: 'A',
    texte: 'Développer le sens du nombre.',
    vocabulaireSpie: 'rag_ras',
    vocabulaireOriginal: 'RAG',
    niveauBloom: 'comprendre',
    conceptsIds: ['concept_nombre_entier'],
    tags: [],
  },
  {
    id: 'outcome_A1',
    code: 'A1',
    texte: 'Représenter et décrire des nombres entiers jusqu\'à 10 000.',
    vocabulaireSpie: 'rag_ras',
    vocabulaireOriginal: 'RAS',
    niveauBloom: 'appliquer',
    parentId: 'outcome_A',
    conceptsIds: ['concept_nombre_entier'],
    tags: [],
  },
]

const mockConcepts: NormalizedConcept[] = [
  {
    id: 'concept_nombre_entier',
    terme: 'nombre entier',
    definition: 'Un nombre sans partie décimale',
    synonymes: [],
    outcomesIds: ['outcome_A', 'outcome_A1'],
  },
]

describe('CurriculumGraphBuilder', () => {
  const builder = new CurriculumGraphBuilder()

  test('builds a graph with correct node count', () => {
    const result = builder.build(mockOutcomes, mockConcepts, [], mockRaw)
    // 2 outcomes + 1 concept + 1 province + 1 matière = 5 nodes
    expect(result.nodesCreated).toBeGreaterThanOrEqual(3)
    expect(result.warnings).toHaveLength(0)
  })

  test('creates BELONGS_TO edge for specific outcome', () => {
    const result = builder.build(mockOutcomes, mockConcepts, [], mockRaw)
    const belongsTo = result.graph.edges.filter(e => e.type === 'BELONGS_TO')
    expect(belongsTo.length).toBeGreaterThan(0)
    expect(belongsTo[0].fromId).toBe('outcome_A1')
    expect(belongsTo[0].toId).toBe('outcome_A')
  })

  test('creates REQUIRES edges for outcomes → concepts', () => {
    const result = builder.build(mockOutcomes, mockConcepts, [], mockRaw)
    const requires = result.graph.edges.filter(e => e.type === 'REQUIRES')
    expect(requires.length).toBeGreaterThan(0)
  })

  test('graph queries work after build', () => {
    const result = builder.build(mockOutcomes, mockConcepts, [], mockRaw)
    const specs = getSpecificOutcomes(result.graph, 'outcome_A')
    expect(specs.length).toBe(1)
    expect(specs[0].id).toBe('outcome_A1')
  })

  test('concept query works', () => {
    const result = builder.build(mockOutcomes, mockConcepts, [], mockRaw)
    const concepts = getRequiredConcepts(result.graph, 'outcome_A')
    expect(concepts.length).toBe(1)
    expect(concepts[0].id).toBe('concept_nombre_entier')
  })

  test('serialization round-trip preserves data', () => {
    const result = builder.build(mockOutcomes, mockConcepts, [], mockRaw)
    const serialized = serializeGraph(result.graph)
    const deserialized = deserializeGraph(serialized)

    expect(deserialized.nodes.size).toBe(result.graph.nodes.size)
    expect(deserialized.edges.length).toBe(result.graph.edges.length)
  })

  test('summary returns correct stats', () => {
    const result = builder.build(mockOutcomes, mockConcepts, [], mockRaw)
    const summary = summarizeGraph(result.graph)
    expect(summary.totalNodes).toBe(result.nodesCreated)
    expect(summary.totalEdges).toBe(result.edgesCreated)
    expect(summary.province).toBe('alberta')
  })
})
