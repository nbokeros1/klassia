// SPIE-02 — Curriculum Parser types
// All parsers (PDF, DOCX, Markdown, Text) produce a ParsedCurriculumDocument.
// The parser layer is purely about extracting text and structure.
// AI-based semantic extraction happens in the extraction/ layer.

// ─── Document metadata extracted during parsing ────────────────────────────────

export interface CurriculumDocumentMetadata {
  // Explicitly found in the document (may be null if not found)
  province?: string
  pays?: string
  autoriteEmettrice?: string      // "Alberta Education", "Ministère de l'Éducation"
  matiere?: string
  niveaux?: string[]
  version?: string
  anneePublication?: number
  langue?: 'fr' | 'en' | 'bilingual'
  auteurs?: string[]
  dateRevision?: string
  // Computed during parsing
  nbMots: number
  nbLignes: number
  nbCaracteres: number
  sections?: string[]             // Section titles found
}

// ─── Parsed section ────────────────────────────────────────────────────────────
// A meaningful section extracted from the raw document.

export type SectionType =
  | 'entete'
  | 'introduction'
  | 'outcome_general'      // RAG / Overall Expectation / Compétence disciplinaire
  | 'outcome_specifique'   // RAS / Specific Expectation / Indicateur
  | 'competence'
  | 'big_idea'
  | 'concept'
  | 'vocabulaire'
  | 'evaluation'
  | 'activite'
  | 'ressource'
  | 'glossaire'
  | 'contrainte'
  | 'autre'

export interface ParsedSection {
  id: string
  titre: string
  contenu: string
  type: SectionType
  // Detected province-specific codes (e.g. "A1", "B2.1", "MA-20-1")
  code?: string
  niveau?: string
  matiere?: string
  ordre: number
  // Depth in the document structure (0 = top-level)
  profondeur: number
  // Child sections
  subsections?: ParsedSection[]
  // Raw line numbers in the original document
  ligneDebut?: number
  ligneFin?: number
}

// ─── Parser Result ─────────────────────────────────────────────────────────────

export type ParserSourceType = 'pdf' | 'docx' | 'markdown' | 'text' | 'url' | 'unknown'

export interface ParseResult {
  success: boolean
  error?: string
  durationMs: number
}

// ─── Parsed Curriculum Document ────────────────────────────────────────────────
// The common output of all parsers. Province-agnostic.
// This feeds directly into the AI extraction layer.

export interface ParsedCurriculumDocument {
  id: string
  sourceDocumentId?: string         // Supabase CurriculumDocument.id if available
  sourceName: string
  sourceType: ParserSourceType
  // Full extracted text (delegates to extraire-texte.ts)
  texteExtrait: string
  nbPages?: number
  nbSlides?: number
  // Detected metadata
  metadata: CurriculumDocumentMetadata
  // Structural sections identified by heuristic parsing
  sections: ParsedSection[]
  rawLines: string[]
  // Parser info
  parserVersion: string
  parseResult: ParseResult
  parsedAt: string
}

// ─── Parser interface ─────────────────────────────────────────────────────────

export interface ICurriculumParser {
  readonly sourceType: ParserSourceType
  readonly version: string
  canParse(mimeType: string, filename: string): boolean
  parse(buffer: Buffer, filename: string, mimeType: string): Promise<ParsedCurriculumDocument>
}
