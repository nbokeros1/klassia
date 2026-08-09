// SPIE-02 — Extraction types
// Defines what the AI extraction layer produces from a parsed document.
// Province-agnostic: Alberta uses RAG/RAS vocabulary, Ontario uses Expectations,
// Quebec uses Compétences, BC uses Big Ideas — all normalized to SPIE vocabulary.

import type { BloomLevel, OutcomeVocabulary } from '../../types'

// ─── Raw extraction item (before normalization) ───────────────────────────────

export interface RawOutcome {
  code?: string
  texte: string
  type: 'general' | 'specifique' | 'competence' | 'big_idea' | 'indicateur' | 'objectif'
  // The province-specific label found in the document
  vocabulaireProvincial?: string
  // SPIE unified vocabulary (mapped by PPE)
  vocabulaireSpie?: OutcomeVocabulary
  niveauBloom?: BloomLevel
  // RAG/RAS parent-child relationship
  parentCode?: string
  // Concepts and vocabulary items referenced
  conceptsReferenced?: string[]
}

export interface RawConcept {
  terme: string
  definition?: string
  synonymes?: string[]
}

export interface RawVocabularyItem {
  terme: string
  definition?: string
  contexte?: string
  niveauDifficulte?: 'basique' | 'intermediaire' | 'avance'
}

export interface RawConstraint {
  description: string
  type: 'temps' | 'prerequis' | 'corequis' | 'sequence' | 'minimum' | 'maximum' | 'recommande'
  valeur?: number
  unite?: 'minutes' | 'heures' | 'jours' | 'semaines'
  cibleCode?: string
  prealablesCode?: string[]
}

// ─── Raw extraction output (direct from AI) ──────────────────────────────────

export interface CurriculumExtractionRaw {
  province?: string
  pays?: string
  autoriteEmettrice?: string
  matiere?: string
  niveaux?: string[]
  annee?: number
  langue?: 'fr' | 'en'
  titre?: string
  description?: string
  // Core curriculum elements
  outcomesGeneraux: RawOutcome[]
  outcomesSpecifiques: RawOutcome[]
  competences: RawOutcome[]
  bigIdeas: RawOutcome[]
  concepts: RawConcept[]
  vocabulaire: RawVocabularyItem[]
  contraintes: RawConstraint[]
  // Quality metadata
  confidenceScore: number        // 0–100: how confident the AI is in the extraction
  completenessScore: number      // 0–100: how complete the extraction appears
  warnings: string[]
}

// ─── Normalized extraction (after PPE normalization) ─────────────────────────
// This is what the rest of SPIE uses. RAG/RAS etc. are unified under SPIE vocabulary.

export interface NormalizedOutcome {
  id: string
  code?: string
  texte: string
  vocabulaireSpie: OutcomeVocabulary
  // The original province-specific label is preserved for display
  vocabulaireOriginal: string
  niveauBloom?: BloomLevel
  parentId?: string
  conceptsIds: string[]
  tags: string[]
}

export interface NormalizedConcept {
  id: string
  terme: string
  definition?: string
  synonymes: string[]
  outcomesIds: string[]
}

export interface NormalizedVocabularyItem {
  id: string
  terme: string
  definition?: string
  contexte?: string
  niveauDifficulte?: 'basique' | 'intermediaire' | 'avance'
  outcomesIds: string[]
}

// ─── Extraction prompt configuration ─────────────────────────────────────────

export interface ExtractionPromptConfig {
  // The province ID informs the vocabulary to look for
  province?: string
  matiere?: string
  niveaux?: string[]
  langue?: 'fr' | 'en'
  // Extra instructions for specific curricula
  hints?: string[]
  // Max tokens for the extraction response
  maxTokens?: number
}
