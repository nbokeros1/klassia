// SPIE-02 — Curriculum Extractor Service
// Uses the Anthropic API to perform structured extraction from a parsed document.
// This service is the bridge between the parser layer and the SPIE domain model.

import Anthropic from '@anthropic-ai/sdk'
import type { ParsedCurriculumDocument } from '../parsers/types'
import type { CurriculumExtractionRaw, ExtractionPromptConfig } from '../extraction/types'
import type { NormalizedOutcome, NormalizedConcept, NormalizedVocabularyItem } from '../extraction/types'
import {
  buildExtractionSystemPrompt,
  buildExtractionUserPrompt,
  parseExtractionJson,
  normalizeExtraction,
} from '../extraction'

export interface ExtractionInput {
  document: ParsedCurriculumDocument
  config?: ExtractionPromptConfig
}

export interface ExtractionOutput {
  success: boolean
  raw?: CurriculumExtractionRaw
  outcomes?: NormalizedOutcome[]
  concepts?: NormalizedConcept[]
  vocabulaire?: NormalizedVocabularyItem[]
  warnings?: string[]
  error?: string
  tokensUsed?: number
}

export class CurriculumExtractorService {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }

  async extract(input: ExtractionInput): Promise<ExtractionOutput> {
    const { document, config = {} } = input

    if (!document.texteExtrait || document.texteExtrait.length < 50) {
      return { success: false, error: 'Document trop court pour l\'extraction.' }
    }

    // Merge config with detected metadata
    const mergedConfig: ExtractionPromptConfig = {
      province: config.province ?? document.metadata.province,
      matiere: config.matiere ?? document.metadata.matiere,
      niveaux: config.niveaux ?? document.metadata.niveaux,
      langue: config.langue ?? document.metadata.langue === 'bilingual' ? 'fr' : (document.metadata.langue ?? 'fr'),
      ...config,
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: config.maxTokens ?? 4096,
        messages: [
          {
            role: 'user',
            content: buildExtractionUserPrompt(document.texteExtrait, mergedConfig),
          },
        ],
        system: buildExtractionSystemPrompt(),
      })

      const rawText = response.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')

      const raw = parseExtractionJson(rawText)
      if (!raw) {
        return { success: false, error: 'Réponse IA invalide — impossible de parser le JSON d\'extraction.' }
      }

      const { outcomes, concepts, vocabulaire, warnings } = normalizeExtraction(raw)

      return {
        success: true,
        raw,
        outcomes,
        concepts,
        vocabulaire,
        warnings,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'extraction IA',
      }
    }
  }
}

export const curriculumExtractorService = new CurriculumExtractorService()
