// SPIE-03 — Decision Engine tests
import { DecisionEngine } from '../decisions/decision-engine'
import { buildContextMemory } from '../memory/context-memory'
import { calculateContextScore } from '../score/context-score'
import type { PedagogicalContext } from '../types/context'
import type { ContextSourcesMap } from '../types/sources'
import type { NormalizedOutcome } from '../../curriculum/extraction/types'

const outcomes: NormalizedOutcome[] = [
  { id: 'o1', code: 'A', texte: 'Outcome A', vocabulaireSpie: 'rag_ras', vocabulaireOriginal: 'RAG', conceptsIds: [], tags: [] },
  { id: 'o2', code: 'B', texte: 'Outcome B', vocabulaireSpie: 'rag_ras', vocabulaireOriginal: 'RAG', conceptsIds: [], tags: [] },
]

function buildTestContext(overrides: Partial<ContextSourcesMap> = {}): PedagogicalContext {
  const sources: ContextSourcesMap = {
    curriculum: {
      sourceType: 'curriculum',
      curriculumId: 'test',
      province: 'alberta',
      matiere: 'Math',
      niveaux: ['grade 4'],
      outcomes,
      loadedAt: new Date().toISOString(),
    },
    progression: {
      sourceType: 'progression',
      outcomesEnseignes: ['o1'],
      outcomesIgnores: [],
      outcomesARenforcer: [],
      outcomesRestants: ['o2'],
      avanceRetardSemaines: 0,
      loadedAt: new Date().toISOString(),
    },
    ...overrides,
  }
  const score = calculateContextScore(sources)
  const memory = buildContextMemory('c1', 'math', '2025-2026', outcomes, sources.progression, undefined)
  return {
    id: 'ctx_test',
    langue: 'fr',
    academicYear: '2025-2026',
    sources,
    score,
    memory,
    builtAt: new Date().toISOString(),
    builderVersion: '1.0.0',
  }
}

describe('DecisionEngine', () => {
  const engine = new DecisionEngine()

  test('prochaine_lecon returns next restant outcome', () => {
    const ctx = buildTestContext()
    const result = engine.decide(ctx, { type: 'prochaine_lecon' })
    expect(result.decision).toBe('o2')
    expect(result.confidence).toBe('haute')
  })

  test('prochaine_lecon prioritizes à_renforcer', () => {
    const ctx = buildTestContext({
      progression: {
        sourceType: 'progression',
        outcomesEnseignes: ['o1'],
        outcomesIgnores: [],
        outcomesARenforcer: ['o1'],  // o1 needs review
        outcomesRestants: ['o2'],
        avanceRetardSemaines: 0,
        loadedAt: new Date().toISOString(),
      },
    })
    const result = engine.decide(ctx, { type: 'prochaine_lecon' })
    expect(result.decision).toBe('o1')
  })

  test('peut_progresser returns true when no blocking reasons', () => {
    const ctx = buildTestContext()
    const result = engine.decide(ctx, { type: 'peut_progresser' })
    expect(result.decision).toBe(true)
  })

  test('peut_progresser returns false when too many à_renforcer', () => {
    const moreOutcomes = Array.from({ length: 5 }, (_, i) => ({
      id: `o${i}`, code: `${i}`, texte: `Outcome ${i}`, vocabulaireSpie: 'rag_ras' as const, vocabulaireOriginal: 'RAG', conceptsIds: [], tags: [],
    }))
    const ctx = buildTestContext({
      progression: {
        sourceType: 'progression',
        outcomesEnseignes: [],
        outcomesIgnores: [],
        outcomesARenforcer: ['o0', 'o1', 'o2', 'o3'],  // 4 need review
        outcomesRestants: ['o4'],
        avanceRetardSemaines: 0,
        loadedAt: new Date().toISOString(),
      },
    })
    const result = engine.decide(ctx, { type: 'peut_progresser' })
    expect(result.decision).toBe(false)
  })

  test('alerter_retard returns true when severely behind', () => {
    const ctx = buildTestContext({
      progression: {
        sourceType: 'progression',
        outcomesEnseignes: [],
        outcomesIgnores: [],
        outcomesARenforcer: [],
        outcomesRestants: ['o1', 'o2'],
        avanceRetardSemaines: -5,  // 5 weeks behind
        loadedAt: new Date().toISOString(),
      },
    })
    const result = engine.decide(ctx, { type: 'alerter_retard' })
    expect(result.decision).toBe(true)
  })

  test('generateReport returns decisions for all types', () => {
    const ctx = buildTestContext()
    const report = engine.generateReport(ctx)
    expect(report.decisions.length).toBeGreaterThan(0)
    expect(report.santePedagogique).toBeGreaterThanOrEqual(0)
    expect(report.santePedagogique).toBeLessThanOrEqual(100)
  })

  test('context builder output passes decision engine', () => {
    const ctx = buildTestContext()
    expect(() => engine.generateReport(ctx)).not.toThrow()
  })
})
