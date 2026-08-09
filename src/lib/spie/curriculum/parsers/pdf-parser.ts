// SPIE-02 — PDF Curriculum Parser
// Delegates raw text extraction to the existing extraire-texte.ts infrastructure.
// Adds curriculum-specific section detection on top.

import type { ICurriculumParser, ParsedCurriculumDocument, ParserSourceType } from './types'
import {
  detectSectionType,
  detectOutcomeCode,
  extractMetadataFromText,
  splitIntoSections,
} from './base-parser'

export class PDFCurriculumParser implements ICurriculumParser {
  readonly sourceType: ParserSourceType = 'pdf'
  readonly version = '1.0.0'

  canParse(mimeType: string, filename: string): boolean {
    return (
      mimeType === 'application/pdf' ||
      filename.toLowerCase().endsWith('.pdf')
    )
  }

  async parse(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<ParsedCurriculumDocument> {
    const startMs = Date.now()
    const id = `parsed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    try {
      // Delegate to existing extraire-texte.ts infrastructure
      const { extraireTexte } = await import('@/lib/documents/extraire-texte')
      const result = await extraireTexte(buffer, mimeType, filename)

      const rawLines = result.texte.split('\n')
      const metadata = extractMetadataFromText(result.texte, rawLines)
      const rawSections = splitIntoSections(rawLines)

      const sections = rawSections.map((s, i) => ({
        id: `sec_${i}`,
        titre: s.titre,
        contenu: s.lignes.join('\n').trim(),
        type: detectSectionType(s.titre, s.lignes.join('\n')),
        code: detectOutcomeCode(s.titre),
        ordre: i,
        profondeur: 0,
        ligneDebut: s.ligneDebut,
        ligneFin: s.ligneDebut + s.lignes.length,
      }))

      return {
        id,
        sourceName: filename,
        sourceType: 'pdf',
        texteExtrait: result.texte,
        nbPages: result.nb_pages,
        metadata: { ...metadata, nbMots: result.texte.split(/\s+/).length, nbLignes: rawLines.length, nbCaracteres: result.texte.length },
        sections,
        rawLines,
        parserVersion: `pdf-parser-${this.version}`,
        parseResult: { success: true, durationMs: Date.now() - startMs },
        parsedAt: new Date().toISOString(),
      }
    } catch (error) {
      return {
        id,
        sourceName: filename,
        sourceType: 'pdf',
        texteExtrait: '',
        metadata: { nbMots: 0, nbLignes: 0, nbCaracteres: 0 },
        sections: [],
        rawLines: [],
        parserVersion: `pdf-parser-${this.version}`,
        parseResult: {
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue lors du parsing PDF',
          durationMs: Date.now() - startMs,
        },
        parsedAt: new Date().toISOString(),
      }
    }
  }
}
