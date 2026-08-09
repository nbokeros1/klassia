// SPIE-02 — Markdown Curriculum Parser
// Markdown has explicit structure (# headers) so section detection is more reliable.

import type { ICurriculumParser, ParsedCurriculumDocument, ParserSourceType, ParsedSection } from './types'
import { detectSectionType, detectOutcomeCode, extractMetadataFromText } from './base-parser'

function parseMarkdownSections(text: string): ParsedSection[] {
  const lines = text.split('\n')
  const sections: ParsedSection[] = []
  let currentSection: { titre: string; contenu: string[]; depth: number; start: number } | null = null
  let ordre = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)

    if (headerMatch) {
      if (currentSection) {
        const contenu = currentSection.contenu.join('\n').trim()
        sections.push({
          id: `sec_${ordre++}`,
          titre: currentSection.titre,
          contenu,
          type: detectSectionType(currentSection.titre, contenu),
          code: detectOutcomeCode(currentSection.titre),
          ordre: sections.length,
          profondeur: currentSection.depth - 1,
          ligneDebut: currentSection.start,
          ligneFin: i - 1,
        })
      }
      currentSection = {
        titre: headerMatch[2].trim(),
        contenu: [],
        depth: headerMatch[1].length,
        start: i,
      }
    } else if (currentSection) {
      currentSection.contenu.push(line)
    }
  }

  if (currentSection) {
    const contenu = currentSection.contenu.join('\n').trim()
    sections.push({
      id: `sec_${ordre}`,
      titre: currentSection.titre,
      contenu,
      type: detectSectionType(currentSection.titre, contenu),
      code: detectOutcomeCode(currentSection.titre),
      ordre: sections.length,
      profondeur: currentSection.depth - 1,
      ligneDebut: currentSection.start,
      ligneFin: lines.length - 1,
    })
  }

  return sections
}

export class MarkdownCurriculumParser implements ICurriculumParser {
  readonly sourceType: ParserSourceType = 'markdown'
  readonly version = '1.0.0'

  canParse(mimeType: string, filename: string): boolean {
    return (
      mimeType === 'text/markdown' ||
      mimeType === 'text/x-markdown' ||
      filename.toLowerCase().endsWith('.md') ||
      filename.toLowerCase().endsWith('.markdown')
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
      const texte = buffer.toString('utf-8').replace(/\r\n/g, '\n').trim()
      const rawLines = texte.split('\n')
      const metadata = extractMetadataFromText(texte, rawLines)
      const sections = parseMarkdownSections(texte)

      return {
        id,
        sourceName: filename,
        sourceType: 'markdown',
        texteExtrait: texte,
        metadata: { ...metadata, nbMots: texte.split(/\s+/).length, nbLignes: rawLines.length, nbCaracteres: texte.length },
        sections,
        rawLines,
        parserVersion: `markdown-parser-${this.version}`,
        parseResult: { success: true, durationMs: Date.now() - startMs },
        parsedAt: new Date().toISOString(),
      }
    } catch (error) {
      return {
        id,
        sourceName: filename,
        sourceType: 'markdown',
        texteExtrait: '',
        metadata: { nbMots: 0, nbLignes: 0, nbCaracteres: 0 },
        sections: [],
        rawLines: [],
        parserVersion: `markdown-parser-${this.version}`,
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
