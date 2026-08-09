// SPIE-02 — Curriculum Parser Service
// Orchestrates the parser factory for server-side use (API routes, background jobs).

import type { ParsedCurriculumDocument } from '../parsers/types'
import { curriculumParserFactory } from '../parsers/parser-factory'

export interface ParseCurriculumInput {
  buffer: Buffer
  filename: string
  mimeType: string
  // Optionally link to an existing CurriculumDocument in the DB
  sourceDocumentId?: string
}

export interface ParseCurriculumOutput {
  success: boolean
  document?: ParsedCurriculumDocument
  error?: string
}

export class CurriculumParserService {
  async parse(input: ParseCurriculumInput): Promise<ParseCurriculumOutput> {
    try {
      const document = await curriculumParserFactory.parse(
        input.buffer,
        input.filename,
        input.mimeType,
      )

      if (!document.parseResult.success) {
        return { success: false, error: document.parseResult.error }
      }

      if (input.sourceDocumentId) {
        document.sourceDocumentId = input.sourceDocumentId
      }

      return { success: true, document }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors du parsing',
      }
    }
  }

  supportedMimeTypes(): string[] {
    return [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/markdown',
      'text/plain',
    ]
  }
}

export const curriculumParserService = new CurriculumParserService()
