// SPIE-03 — PedagogicalContextBuilder tests
import { PedagogicalContextBuilder } from '../builder/pedagogical-context-builder'
import type { ContextSourcesMap } from '../types/sources'
import type { NormalizedOutcome } from '../../curriculum/extraction/types'

const outcomes: NormalizedOutcome[] = [
  { id: 'o1', code: 'A', texte: 'Outcome A', vocabulaireSpie: 'rag_ras', vocabulaireOriginal: 'RAG', conceptsIds: [], tags: [] },
]

const minimalSources: ContextSourcesMap = {
  curriculum: {
    sourceType: 'curriculum',
    curriculumId: 'alberta_math_4',
    province: 'alberta',
    matiere: 'Mathématiques',
    niveaux: ['grade 4'],
    outcomes,
    loadedAt: new Date().toISOString(),
  },
}

describe('PedagogicalContextBuilder', () => {
  const builder = new PedagogicalContextBuilder()

  test('builds a valid context from minimal sources', () => {
    const result = builder.build(
      { enseignantId: 'ens_1', classeId: 'classe_1', matiereId: 'math', langue: 'fr' },
      minimalSources,
    )
    expect(result.success).toBe(true)
    expect(result.context).toBeDefined()
    expect(result.context!.id).toMatch(/^pce_/)
  })

  test('context includes correct language', () => {
    const result = builder.build({ langue: 'fr' }, minimalSources)
    expect(result.context!.langue).toBe('fr')
  })

  test('context includes score', () => {
    const result = builder.build({}, minimalSources)
    expect(result.context!.score).toBeDefined()
    expect(result.context!.score.global).toBeGreaterThan(0)
  })

  test('context includes memory when outcomes present', () => {
    const result = builder.build({ classeId: 'c1' }, minimalSources)
    expect(result.context!.memory).toBeDefined()
  })

  test('context includes promptSummary', () => {
    const result = builder.build({}, minimalSources)
    expect(result.context!.promptSummary).toBeDefined()
    expect(result.context!.promptSummary!.bloc.length).toBeGreaterThan(0)
  })

  test('partial=true when mandatory sources missing', () => {
    const result = builder.build({}, {})  // No curriculum
    expect(result.partial).toBe(true)
    expect(result.context!.score.readyForGeneration).toBe(false)
  })

  test('buildMinimal creates valid context', () => {
    const result = builder.buildMinimal('alberta', 'alberta', 'Math', ['grade 4'])
    expect(result.success).toBe(true)
    expect(result.context!.sources.curriculum).toBeDefined()
  })
})
