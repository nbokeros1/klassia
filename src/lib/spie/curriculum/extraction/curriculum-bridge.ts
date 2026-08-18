// SPIE-02 bridge — wraps raw curriculum text into a minimal ParsedCurriculumDocument
// so that CurriculumExtractorService can run structured extraction without the full
// parser chain (PDF/DOCX parsers are not available at route runtime).
//
// Usage: import { extractOutcomesFromText, formatOutcomesForPrompt } from this module.
// The route calls this when curriculum_fichier_contenu is present; falls back to raw text
// when extraction returns no outcomes or throws.

import type { ParsedCurriculumDocument } from '../parsers/types'
import type { NormalizedOutcome } from './types'
import { curriculumExtractorService } from '../services/curriculum-extractor.service'

export interface BridgeConfig {
  province?: string
  matiere?: string
  niveaux?: string[]
  langue?: 'fr' | 'en'
}

export interface BridgeResult {
  success: boolean
  outcomes: NormalizedOutcome[]
  outcomeCount: number
  warnings: string[]
  error?: string
  tokensUsed?: number
}

function rawTextToMinimalDocument(
  text: string,
  config: BridgeConfig,
  sourceName: string,
): ParsedCurriculumDocument {
  const lines = text.split('\n')
  return {
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `bridge-${Date.now()}`,
    sourceName,
    sourceType: 'text',
    texteExtrait: text,
    metadata: {
      province:     config.province,
      matiere:      config.matiere,
      niveaux:      config.niveaux,
      langue:       config.langue,
      nbMots:       text.split(/\s+/).filter(Boolean).length,
      nbLignes:     lines.length,
      nbCaracteres: text.length,
    },
    sections:      [],
    rawLines:      lines,
    parserVersion: 'bridge-1.0',
    parseResult:   { success: true, durationMs: 0 },
    parsedAt:      new Date().toISOString(),
  }
}

// Run SPIE-02 structured extraction on raw curriculum text.
// Text is limited to 12,000 chars (extraction-prompt.ts limit).
// Returns empty outcomes on failure — never throws (caller decides how to fall back).
export async function extractOutcomesFromText(
  text: string,
  config: BridgeConfig,
  sourceName = 'curriculum_upload',
): Promise<BridgeResult> {
  if (!text || text.trim().length < 50) {
    return { success: false, outcomes: [], outcomeCount: 0, warnings: [], error: 'Texte trop court pour extraction' }
  }

  // The extraction prompt reads texteExtrait.substring(0, 12000)
  const trimmedText = text.substring(0, 12000)
  const document    = rawTextToMinimalDocument(trimmedText, config, sourceName)

  try {
    const result = await curriculumExtractorService.extract({ document, config })

    if (!result.success || !result.outcomes) {
      return {
        success:      false,
        outcomes:     [],
        outcomeCount: 0,
        warnings:     result.warnings ?? [],
        error:        result.error ?? 'Extraction échouée',
      }
    }

    return {
      success:      true,
      outcomes:     result.outcomes,
      outcomeCount: result.outcomes.length,
      warnings:     result.warnings ?? [],
      tokensUsed:   result.tokensUsed,
    }
  } catch (e) {
    return {
      success:      false,
      outcomes:     [],
      outcomeCount: 0,
      warnings:     [],
      error:        e instanceof Error ? e.message : String(e),
    }
  }
}

// Serialize NormalizedOutcome[] for inclusion in a generation prompt.
// Compact JSON, capped at maxOutcomes to control token usage.
// At 60 outcomes each outcome is ~80 chars → ~4800 chars total.
export function formatOutcomesForPrompt(outcomes: NormalizedOutcome[], maxOutcomes = 60): string {
  return JSON.stringify(
    outcomes.slice(0, maxOutcomes).map(o => ({
      id:       o.id,
      code:     o.code,
      texte:    o.texte.substring(0, 120),
      vocab:    o.vocabulaireSpie,
      bloom:    o.niveauBloom,
      parentId: o.parentId,
    })),
  )
}
