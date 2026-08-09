// SPIE-02 — Curriculum quality validator tests
import { CurriculumQualityValidator } from '../validation/curriculum-quality'
import type { CurriculumExtractionRaw } from '../extraction/types'
import type { NormalizedOutcome, NormalizedConcept } from '../extraction/types'

const validRaw: CurriculumExtractionRaw = {
  province: 'alberta',
  matiere: 'Mathématiques',
  niveaux: ['grade 4'],
  outcomesGeneraux: [{ code: 'A', texte: 'Sens du nombre', type: 'general', vocabulaireProvincial: 'RAG' }],
  outcomesSpecifiques: [
    { code: 'A1', texte: 'Représenter jusqu\'à 10 000', type: 'specifique', parentCode: 'A', vocabulaireProvincial: 'RAS' },
    { code: 'A2', texte: 'Estimer des quantités', type: 'specifique', parentCode: 'A', vocabulaireProvincial: 'RAS' },
  ],
  competences: [],
  bigIdeas: [],
  concepts: [{ terme: 'nombre entier', definition: 'Entier naturel' }],
  vocabulaire: [{ terme: 'addition', definition: 'Opération de base' }],
  contraintes: [{ description: 'A précède B', type: 'prerequis', prealablesCode: ['A'], cibleCode: 'B' }],
  confidenceScore: 88,
  completenessScore: 92,
  warnings: [],
}

const validOutcomes: NormalizedOutcome[] = [
  {
    id: 'outcome_A', code: 'A', texte: 'Sens du nombre',
    vocabulaireSpie: 'rag_ras', vocabulaireOriginal: 'RAG',
    niveauBloom: 'comprendre', conceptsIds: [], tags: [],
  },
  {
    id: 'outcome_A1', code: 'A1', texte: 'Représenter',
    vocabulaireSpie: 'rag_ras', vocabulaireOriginal: 'RAS',
    niveauBloom: 'appliquer', parentId: 'outcome_A', conceptsIds: [], tags: [],
  },
  {
    id: 'outcome_A2', code: 'A2', texte: 'Estimer',
    vocabulaireSpie: 'rag_ras', vocabulaireOriginal: 'RAS',
    niveauBloom: 'analyser', parentId: 'outcome_A', conceptsIds: [], tags: [],
  },
]

const validConcepts: NormalizedConcept[] = [
  { id: 'concept_nombre_entier', terme: 'nombre entier', synonymes: [], outcomesIds: [] },
]

describe('CurriculumQualityValidator', () => {
  const validator = new CurriculumQualityValidator()

  test('valid curriculum scores above 60', () => {
    const report = validator.validate(validRaw, validOutcomes, validConcepts)
    expect(report.score).toBeGreaterThan(60)
    expect(report.validPourGeneration).toBe(true)
  })

  test('missing matière adds erreur', () => {
    const raw = { ...validRaw, matiere: undefined }
    const report = validator.validate(raw, validOutcomes, validConcepts)
    const erreurs = report.issues.filter(i => i.severity === 'erreur' && i.dimension === 'completude')
    expect(erreurs.length).toBeGreaterThan(0)
  })

  test('empty outcomes triggers erreur', () => {
    const report = validator.validate(validRaw, [], [])
    const erreurs = report.issues.filter(i => i.severity === 'erreur')
    expect(erreurs.length).toBeGreaterThan(0)
    expect(report.validPourGeneration).toBe(false)
  })

  test('orphaned specific outcome triggers erreur', () => {
    const outcomesWithOrphan: NormalizedOutcome[] = [
      ...validOutcomes,
      {
        id: 'outcome_Z99', code: 'Z99', texte: 'Orphelin',
        vocabulaireSpie: 'rag_ras', vocabulaireOriginal: 'RAS',
        parentId: 'outcome_INEXISTANT', conceptsIds: [], tags: [],
      },
    ]
    const report = validator.validate(validRaw, outcomesWithOrphan, validConcepts)
    const coherenceErrors = report.issues.filter(i => i.dimension === 'coherence' && i.severity === 'erreur')
    expect(coherenceErrors.length).toBeGreaterThan(0)
  })

  test('stats are correctly counted', () => {
    const report = validator.validate(validRaw, validOutcomes, validConcepts)
    expect(report.stats.nbOutcomesGeneraux).toBe(1)
    expect(report.stats.nbOutcomesSpecifiques).toBe(2)
    expect(report.stats.nbConcepts).toBe(1)
    expect(report.stats.nbVocabulaire).toBe(1)
    expect(report.stats.nbContraintes).toBe(1)
  })
})
