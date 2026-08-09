// SPIE-03 — Context Memory tests
import { buildContextMemory, getNextRecommendedOutcomes } from '../memory/context-memory'
import type { NormalizedOutcome } from '../../curriculum/extraction/types'
import type { ProgressionContextSource, HistoriqueContextSource } from '../types/sources'

const outcomes: NormalizedOutcome[] = [
  { id: 'o1', code: 'A', texte: 'Outcome A', vocabulaireSpie: 'rag_ras', vocabulaireOriginal: 'RAG', niveauBloom: 'comprendre', conceptsIds: [], tags: [] },
  { id: 'o2', code: 'B', texte: 'Outcome B', vocabulaireSpie: 'rag_ras', vocabulaireOriginal: 'RAG', niveauBloom: 'appliquer', conceptsIds: [], tags: [] },
  { id: 'o3', code: 'C', texte: 'Outcome C (À renforcer)', vocabulaireSpie: 'rag_ras', vocabulaireOriginal: 'RAG', niveauBloom: 'analyser', conceptsIds: [], tags: [] },
]

const progression: ProgressionContextSource = {
  sourceType: 'progression',
  outcomesEnseignes: ['o1'],
  outcomesIgnores: [],
  outcomesARenforcer: ['o3'],
  outcomesRestants: ['o2'],
  avanceRetardSemaines: -1,
  loadedAt: new Date().toISOString(),
}

describe('buildContextMemory', () => {
  test('assigns correct status for each outcome', () => {
    const memory = buildContextMemory('classe_1', 'math', '2025-2026', outcomes, progression, undefined)
    const o1Entry = memory.entries.find(e => e.outcomeId === 'o1')
    const o2Entry = memory.entries.find(e => e.outcomeId === 'o2')
    const o3Entry = memory.entries.find(e => e.outcomeId === 'o3')

    expect(o1Entry?.status).toBe('enseigne')
    expect(o2Entry?.status).toBe('planifie')
    expect(o3Entry?.status).toBe('a_renforcer')
  })

  test('computes correct progressPercent', () => {
    const memory = buildContextMemory('c1', 'math', '2025-2026', outcomes, progression, undefined)
    // 1 out of 3 = 33%
    expect(memory.stats.progressPercent).toBe(33)
  })

  test('lists à_renforcer outcomes correctly', () => {
    const memory = buildContextMemory('c1', 'math', '2025-2026', outcomes, progression, undefined)
    expect(memory.aRenforcer).toContain('o3')
  })

  test('works without progression source', () => {
    const memory = buildContextMemory('c1', 'math', '2025-2026', outcomes, undefined, undefined)
    expect(memory.entries).toHaveLength(3)
    expect(memory.entries.every(e => e.status === 'non_planifie')).toBe(true)
  })

  test('enriches with historique data', () => {
    const historique: HistoriqueContextSource = {
      sourceType: 'historique',
      dernieresLecons: [
        { leconId: 'lecon_1', titre: 'Leçon A', date: '2026-01-15', dureeMinutes: 60, outcomesCouverts: ['o1'], niveauEngagement: 'eleve' },
      ],
      derniersQuiz: [],
      loadedAt: new Date().toISOString(),
    }
    const memory = buildContextMemory('c1', 'math', '2025-2026', outcomes, progression, historique)
    const o1Entry = memory.entries.find(e => e.outcomeId === 'o1')
    expect(o1Entry?.leconId).toBe('lecon_1')
    expect(o1Entry?.tauxEngagement).toBe(85)
  })
})

describe('getNextRecommendedOutcomes', () => {
  test('prioritizes à_renforcer outcomes', () => {
    const memory = buildContextMemory('c1', 'math', '2025-2026', outcomes, progression, undefined)
    const next = getNextRecommendedOutcomes(memory, outcomes, 2)
    expect(next[0].id).toBe('o3')  // à_renforcer first
  })

  test('respects maxCount', () => {
    const memory = buildContextMemory('c1', 'math', '2025-2026', outcomes, progression, undefined)
    const next = getNextRecommendedOutcomes(memory, outcomes, 1)
    expect(next).toHaveLength(1)
  })
})
