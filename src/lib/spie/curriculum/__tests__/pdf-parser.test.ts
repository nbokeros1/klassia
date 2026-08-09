// SPIE-02 — PDF Parser tests (unit, no actual PDF files needed)
import { PDFCurriculumParser } from '../parsers/pdf-parser'

// Mock the extraire-texte module to avoid needing real pdf-parse in tests
jest.mock('@/lib/documents/extraire-texte', () => ({
  extraireTexte: jest.fn().mockResolvedValue({
    texte: `Alberta Education
    Grade 4 Mathematics

    General Outcome A: Number
    A1 - Represent and describe whole numbers to 10 000.
    A1.1 - Read and write numbers to 10 000 in various forms.
    A1.2 - Compare and order numbers to 10 000.

    General Outcome B: Patterns and Relations
    B1 - Describe and represent numbers using patterns.

    Vocabulary: addition, subtraction, multiplication, division
    `,
    nb_pages: 2,
    version_extracteur: 'pdf-parse-1.0',
  }),
}))

describe('PDFCurriculumParser', () => {
  const parser = new PDFCurriculumParser()

  test('canParse detects PDF by mime type', () => {
    expect(parser.canParse('application/pdf', 'test.pdf')).toBe(true)
  })

  test('canParse detects PDF by extension', () => {
    expect(parser.canParse('', 'curriculum.PDF')).toBe(true)
  })

  test('canParse rejects non-PDF', () => {
    expect(parser.canParse('text/plain', 'curriculum.txt')).toBe(false)
  })

  test('parse produces ParsedCurriculumDocument with sections', async () => {
    const buffer = Buffer.from('fake pdf content')
    const result = await parser.parse(buffer, 'alberta-math-grade4.pdf', 'application/pdf')

    expect(result.parseResult.success).toBe(true)
    expect(result.sourceType).toBe('pdf')
    expect(result.sourceName).toBe('alberta-math-grade4.pdf')
    expect(result.nbPages).toBe(2)
    expect(result.texteExtrait.length).toBeGreaterThan(0)
    expect(result.sections.length).toBeGreaterThan(0)
    expect(result.rawLines.length).toBeGreaterThan(0)
  })

  test('parse extracts Alberta as province from text', async () => {
    const buffer = Buffer.from('fake pdf')
    const result = await parser.parse(buffer, 'test.pdf', 'application/pdf')
    expect(result.metadata.province).toBe('alberta')
  })

  test('parse handles extraction failure gracefully', async () => {
    const { extraireTexte } = require('@/lib/documents/extraire-texte')
    extraireTexte.mockRejectedValueOnce(new Error('PDF corrupt'))

    const buffer = Buffer.from('bad pdf')
    const result = await parser.parse(buffer, 'bad.pdf', 'application/pdf')

    expect(result.parseResult.success).toBe(false)
    expect(result.parseResult.error).toContain('PDF corrupt')
    expect(result.texteExtrait).toBe('')
  })
})
