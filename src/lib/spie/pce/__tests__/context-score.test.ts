// SPIE-03 — Context Score tests
import { calculateContextScore } from '../score/context-score'
import type { ContextSourcesMap } from '../types/sources'

const fullSources: ContextSourcesMap = {
  curriculum: {
    sourceType: 'curriculum',
    curriculumId: 'alberta_math_4',
    province: 'alberta',
    matiere: 'Mathématiques',
    niveaux: ['grade 4'],
    outcomes: [{ id: 'outcome_A', code: 'A', texte: 'Sens du nombre', vocabulaireSpie: 'rag_ras', vocabulaireOriginal: 'RAG', conceptsIds: [], tags: [] }],
    loadedAt: new Date().toISOString(),
  },
  calendar: {
    sourceType: 'calendar',
    calendar: { id: 'cal_1', province: 'alberta', annee: 2025, termes: [], evenements: [], semaines: [], createdAt: new Date().toISOString() },
    sessionsRestantes: 40,
    minutesRestantes: 4800,
    loadedAt: new Date().toISOString(),
  },
  progression: {
    sourceType: 'progression',
    outcomesEnseignes: [],
    outcomesIgnores: [],
    outcomesARenforcer: [],
    outcomesRestants: ['outcome_A'],
    avanceRetardSemaines: 0,
    loadedAt: new Date().toISOString(),
  },
}

describe('calculateContextScore', () => {
  test('no sources → score 0, not ready', () => {
    const score = calculateContextScore({})
    expect(score.global).toBe(0)
    expect(score.readyForGeneration).toBe(false)
    expect(score.sourcesMandatairesMissing).toContain('curriculum')
  })

  test('curriculum only → ready for generation with low score', () => {
    const sources: ContextSourcesMap = {
      curriculum: {
        sourceType: 'curriculum',
        curriculumId: 'test',
        province: 'alberta',
        matiere: 'Math',
        niveaux: ['grade 4'],
        outcomes: [{ id: 'o1', code: 'A', texte: 'Outcome A', vocabulaireSpie: 'rag_ras', vocabulaireOriginal: 'RAG', conceptsIds: [], tags: [] }],
        loadedAt: new Date().toISOString(),
      },
    }
    const score = calculateContextScore(sources)
    expect(score.readyForGeneration).toBe(true)
    expect(score.global).toBeGreaterThan(0)
  })

  test('full sources → higher global score', () => {
    const full = calculateContextScore(fullSources)
    const minimal = calculateContextScore({ curriculum: fullSources.curriculum })
    expect(full.global).toBeGreaterThanOrEqual(minimal.global)
  })

  test('curriculum without outcomes → lower score', () => {
    const sources: ContextSourcesMap = {
      curriculum: {
        sourceType: 'curriculum',
        curriculumId: 'test',
        loadedAt: new Date().toISOString(),
      },
    }
    const score = calculateContextScore(sources)
    expect(score.sources.curriculum.score).toBeLessThan(60)
  })

  test('stale source marked correctly', async () => {
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() // 100 days ago
    const sources: ContextSourcesMap = {
      curriculum: {
        sourceType: 'curriculum',
        curriculumId: 'test',
        outcomes: [{ id: 'o1', code: 'A', texte: 'A', vocabulaireSpie: 'rag_ras', vocabulaireOriginal: 'RAG', conceptsIds: [], tags: [] }],
        loadedAt: oldDate,
      },
    }
    const score = calculateContextScore(sources)
    expect(score.sources.curriculum.stale).toBe(true)
    expect(score.sources.curriculum.level).toBe('stale')
  })

  test('calendar with few sessions generates warning', () => {
    const sources: ContextSourcesMap = {
      ...fullSources,
      calendar: {
        ...fullSources.calendar!,
        sessionsRestantes: 2,
        minutesRestantes: 200,
      },
    }
    const score = calculateContextScore(sources)
    expect(score.sources.calendar.avertissements.length).toBeGreaterThan(0)
  })
})
