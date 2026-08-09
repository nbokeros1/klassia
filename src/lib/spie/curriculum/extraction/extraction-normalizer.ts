// SPIE-02 — Extraction normalizer
// Converts AI raw extraction output to strongly-typed SPIE domain objects.
// Maps provincial vocabulary (RAG/RAS → rag_ras, Expectations → expectations, etc.)

import type {
  CurriculumExtractionRaw,
  NormalizedOutcome,
  NormalizedConcept,
  NormalizedVocabularyItem,
  RawOutcome,
  RawConcept,
  RawVocabularyItem,
} from './types'
import type { OutcomeVocabulary } from '../../types'
import type { CurriculumExtraction } from '../../types/curriculum'

// ─── Vocabulary mapping ───────────────────────────────────────────────────────

const VOCAB_LABEL_MAP: Record<string, OutcomeVocabulary> = {
  // French Canadian labels
  'rag': 'rag_ras',
  'ras': 'rag_ras',
  'résultat d\'apprentissage général': 'rag_ras',
  'résultat d\'apprentissage spécifique': 'rag_ras',
  'résultat général': 'rag_ras',
  'résultat spécifique': 'rag_ras',
  // Ontario
  'overall expectation': 'expectations',
  'specific expectation': 'expectations',
  'expectation': 'expectations',
  // Quebec
  'compétence disciplinaire': 'competences',
  'compétence transversale': 'competences',
  'indicateur de compétence': 'competences',
  'compétence': 'competences',
  // BC
  'big idea': 'big_ideas',
  'grande idée': 'big_ideas',
  'curricular competency': 'big_ideas',
  // Saskatchewan/Manitoba
  'outcome': 'standards',
  'indicator': 'standards',
  'learning outcome': 'standards',
  'achievement indicator': 'standards',
  // Common Core/IB/France
  'standard': 'standards',
  'objectif': 'objectives',
  'objectif de connaissance': 'objectives',
  'aim': 'objectives',
}

function resolveVocabulary(
  label: string | undefined,
  province: string | undefined,
): OutcomeVocabulary {
  if (label) {
    const normalized = label.toLowerCase().trim()
    if (VOCAB_LABEL_MAP[normalized]) return VOCAB_LABEL_MAP[normalized]
  }
  // Fallback to province-based inference
  switch (province) {
    case 'alberta':
    case 'saskatchewan':
    case 'nouveau_brunswick':
      return 'rag_ras'
    case 'ontario':
      return 'expectations'
    case 'quebec':
      return 'competences'
    case 'bc':
      return 'big_ideas'
    case 'france':
      return 'objectives'
    default:
      return 'standards'
  }
}

// ─── Normalization functions ──────────────────────────────────────────────────

function normalizeOutcome(
  raw: RawOutcome,
  index: number,
  province: string | undefined,
): NormalizedOutcome {
  return {
    id: `outcome_${raw.code ?? index}`,
    code: raw.code,
    texte: raw.texte.trim(),
    vocabulaireSpie: resolveVocabulary(raw.vocabulaireProvincial, province),
    vocabulaireOriginal: raw.vocabulaireProvincial ?? raw.type,
    niveauBloom: raw.niveauBloom,
    parentId: raw.parentCode ? `outcome_${raw.parentCode}` : undefined,
    conceptsIds: (raw.conceptsReferenced ?? []).map(c => `concept_${c}`),
    tags: [],
  }
}

function normalizeConcept(raw: RawConcept, index: number): NormalizedConcept {
  return {
    id: `concept_${raw.terme.replace(/\s+/g, '_').toLowerCase()}`,
    terme: raw.terme.trim(),
    definition: raw.definition?.trim(),
    synonymes: raw.synonymes ?? [],
    outcomesIds: [],
  }
}

function normalizeVocabularyItem(raw: RawVocabularyItem, index: number): NormalizedVocabularyItem {
  return {
    id: `vocab_${raw.terme.replace(/\s+/g, '_').toLowerCase()}`,
    terme: raw.terme.trim(),
    definition: raw.definition?.trim(),
    contexte: raw.contexte?.trim(),
    niveauDifficulte: raw.niveauDifficulte,
    outcomesIds: [],
  }
}

// ─── Main normalizer ──────────────────────────────────────────────────────────

export function normalizeExtraction(raw: CurriculumExtractionRaw): {
  outcomes: NormalizedOutcome[]
  concepts: NormalizedConcept[]
  vocabulaire: NormalizedVocabularyItem[]
  warnings: string[]
} {
  const province = raw.province

  const allRawOutcomes = [
    ...raw.outcomesGeneraux.map(o => ({ ...o, type: 'general' as const })),
    ...raw.outcomesSpecifiques.map(o => ({ ...o, type: 'specifique' as const })),
    ...raw.competences.map(o => ({ ...o, type: 'competence' as const })),
    ...raw.bigIdeas.map(o => ({ ...o, type: 'big_idea' as const })),
  ]

  const outcomes = allRawOutcomes.map((o, i) => normalizeOutcome(o, i, province))
  const concepts = raw.concepts.map((c, i) => normalizeConcept(c, i))
  const vocabulaire = raw.vocabulaire.map((v, i) => normalizeVocabularyItem(v, i))

  // Cross-reference concepts ↔ outcomes
  const conceptIndex = new Map(concepts.map(c => [c.terme.toLowerCase(), c.id]))
  for (const outcome of outcomes) {
    for (const conceptId of outcome.conceptsIds) {
      const concept = concepts.find(c => c.id === conceptId)
      if (concept && !concept.outcomesIds.includes(outcome.id)) {
        concept.outcomesIds.push(outcome.id)
      }
    }
  }

  return { outcomes, concepts, vocabulaire, warnings: raw.warnings ?? [] }
}

// ─── JSON parsing helper ──────────────────────────────────────────────────────
// Safely parse AI JSON response (may have markdown fences)

export function parseExtractionJson(aiResponse: string): CurriculumExtractionRaw | null {
  try {
    // Strip markdown code fences if present
    const cleaned = aiResponse
      .replace(/^```(?:json)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim()

    const parsed = JSON.parse(cleaned) as CurriculumExtractionRaw
    return parsed
  } catch {
    return null
  }
}
