// SPIE-02 — Extraction normalizer tests
import { normalizeExtraction, parseExtractionJson } from '../extraction/extraction-normalizer'
import type { CurriculumExtractionRaw } from '../extraction/types'

const sampleRaw: CurriculumExtractionRaw = {
  province: 'alberta',
  pays: 'canada',
  autoriteEmettrice: 'Alberta Education',
  matiere: 'Mathématiques',
  niveaux: ['grade 4'],
  annee: 2022,
  langue: 'fr',
  titre: 'Programme d\'études de mathématiques 4e année',
  description: 'Curriculum officiel Alberta 4e année',
  outcomesGeneraux: [
    {
      code: 'A',
      texte: 'Développer le sens du nombre.',
      type: 'general',
      vocabulaireProvincial: 'résultat d\'apprentissage général',
      niveauBloom: 'comprendre',
      conceptsReferenced: ['nombre entier'],
    },
  ],
  outcomesSpecifiques: [
    {
      code: 'A1',
      texte: 'Représenter et décrire des nombres entiers jusqu\'à 10 000.',
      type: 'specifique',
      vocabulaireProvincial: 'résultat d\'apprentissage spécifique',
      niveauBloom: 'appliquer',
      parentCode: 'A',
      conceptsReferenced: ['nombre entier'],
    },
  ],
  competences: [],
  bigIdeas: [],
  concepts: [
    { terme: 'nombre entier', definition: 'Un nombre sans partie décimale', synonymes: ['entier naturel'] },
  ],
  vocabulaire: [
    { terme: 'addition', definition: 'Opération mathématique', contexte: 'arithmétique', niveauDifficulte: 'basique' },
  ],
  contraintes: [
    { description: 'A doit précéder B', type: 'prerequis', prealablesCode: ['A'], cibleCode: 'B' },
  ],
  confidenceScore: 88,
  completenessScore: 90,
  warnings: [],
}

describe('normalizeExtraction', () => {
  test('maps Alberta RAG vocabulary to rag_ras', () => {
    const { outcomes } = normalizeExtraction(sampleRaw)
    const general = outcomes.find(o => o.code === 'A')
    expect(general).toBeDefined()
    expect(general!.vocabulaireSpie).toBe('rag_ras')
  })

  test('links specific outcome to general via parentId', () => {
    const { outcomes } = normalizeExtraction(sampleRaw)
    const specific = outcomes.find(o => o.code === 'A1')
    expect(specific).toBeDefined()
    expect(specific!.parentId).toBe('outcome_A')
  })

  test('normalizes concepts', () => {
    const { concepts } = normalizeExtraction(sampleRaw)
    expect(concepts).toHaveLength(1)
    expect(concepts[0].terme).toBe('nombre entier')
    expect(concepts[0].synonymes).toEqual(['entier naturel'])
  })

  test('normalizes vocabulary items', () => {
    const { vocabulaire } = normalizeExtraction(sampleRaw)
    expect(vocabulaire).toHaveLength(1)
    expect(vocabulaire[0].terme).toBe('addition')
    expect(vocabulaire[0].niveauDifficulte).toBe('basique')
  })

  test('cross-references concepts to outcomes', () => {
    const { concepts } = normalizeExtraction(sampleRaw)
    const entier = concepts.find(c => c.terme === 'nombre entier')
    expect(entier?.outcomesIds.length).toBeGreaterThan(0)
  })
})

describe('parseExtractionJson', () => {
  test('parses clean JSON', () => {
    const json = JSON.stringify(sampleRaw)
    const result = parseExtractionJson(json)
    expect(result).not.toBeNull()
    expect(result!.province).toBe('alberta')
  })

  test('strips markdown code fences', () => {
    const json = '```json\n' + JSON.stringify(sampleRaw) + '\n```'
    const result = parseExtractionJson(json)
    expect(result).not.toBeNull()
  })

  test('returns null for invalid JSON', () => {
    const result = parseExtractionJson('{invalid json}')
    expect(result).toBeNull()
  })
})
