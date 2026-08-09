// SPIE-02 — Parser Factory
// Selects the appropriate parser based on MIME type and file extension.
// Province-agnostic: all parsers produce the same ParsedCurriculumDocument.

import type { ICurriculumParser } from './types'
import { PDFCurriculumParser } from './pdf-parser'
import { DOCXCurriculumParser } from './docx-parser'
import { MarkdownCurriculumParser } from './markdown-parser'
import { TextCurriculumParser } from './text-parser'

const PARSERS: ICurriculumParser[] = [
  new PDFCurriculumParser(),
  new DOCXCurriculumParser(),
  new MarkdownCurriculumParser(),
  new TextCurriculumParser(),
]

export class CurriculumParserFactory {
  private parsers: ICurriculumParser[]

  constructor(customParsers?: ICurriculumParser[]) {
    this.parsers = customParsers ?? PARSERS
  }

  // Find the right parser for a given file
  getParser(mimeType: string, filename: string): ICurriculumParser {
    const parser = this.parsers.find(p => p.canParse(mimeType, filename))
    if (!parser) {
      throw new Error(
        `Aucun parseur disponible pour le format "${mimeType}" (fichier: ${filename}). ` +
        `Formats supportés : PDF, DOCX, Markdown, TXT.`
      )
    }
    return parser
  }

  // Parse any supported curriculum document
  async parse(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ) {
    const parser = this.getParser(mimeType, filename)
    return parser.parse(buffer, filename, mimeType)
  }

  // List all supported source types
  supportedTypes(): string[] {
    return this.parsers.map(p => p.sourceType)
  }
}

// Default factory singleton
export const curriculumParserFactory = new CurriculumParserFactory()
