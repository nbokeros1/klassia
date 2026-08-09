// SPIE-02 — Plain Text Curriculum Parser

import type { ICurriculumParser, ParsedCurriculumDocument, ParserSourceType } from './types'
import {
  detectSectionType,
  detectOutcomeCode,
  extractMetadataFromText,
  splitIntoSections,
} from './base-parser'

export class TextCurriculumParser implements ICurriculumParser {
  readonly sourceType: ParserSourceType = 'text'
  readonly version = '1.0.0'

  canParse(mimeType: string, filename: string): boolean {
    return (
      mimeType === 'text/plain' ||
      mimeType === 'text/csv' ||
      filename.toLowerCase().endsWith('.txt') ||
      filename.toLowerCase().endsWith('.csv')
    )
  }

  async parse(
    buffer: Buffer,
    filename: string,
    _mimeType: string,
  ): Promise<ParsedCurriculumDocument> {
    const startMs = Date.now()
    const id = `parsed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    try {
      const texte = buffer.toString('utf-8')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim()

      if (!texte || texte.length < 10) {
        throw new Error('Document texte vide ou trop court')
      }

      const rawLines = texte.split('\n')
      const metadata = extractMetadataFromText(texte, rawLines)
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
        sourceType: 'text',
        texteExtrait: texte,
        metadata: { ...metadata, nbMots: texte.split(/\s+/).length, nbLignes: rawLines.length, nbCaracteres: texte.length },
        sections,
        rawLines,
        parserVersion: `text-parser-${this.version}`,
        parseResult: { success: true, durationMs: Date.now() - startMs },
        parsedAt: new Date().toISOString(),
      }
    } catch (error) {
      return {
        id,
        sourceName: filename,
        sourceType: 'text',
        texteExtrait: '',
        metadata: { nbMots: 0, nbLignes: 0, nbCaracteres: 0 },
        sections: [],
        rawLines: [],
        parserVersion: `text-parser-${this.version}`,
        parseResult: {
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          durationMs: Date.now() - startMs,
        },
        parsedAt: new Date().toISOString(),
      }
    }
  }
}
