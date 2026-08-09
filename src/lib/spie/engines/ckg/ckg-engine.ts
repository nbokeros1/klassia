// CKG — Curriculum Knowledge Graph Engine
// Responsibility: ingest curriculum documents, extract structured knowledge,
// build and query the pedagogical knowledge graph.
//
// Status: SPIE-01 — Interface and stubs only. Implementation in SPIE-02.
//
// Existing infrastructure this engine will delegate to:
//   - src/lib/pedagogy/curriculum/curriculum-parser.ts
//   - src/lib/ia/build-document-context.ts
//   - src/lib/documents/extraire-texte.ts

import type {
  CurriculumDocument,
  CurriculumExtraction,
} from '../../types/curriculum'
import type { CurriculumKnowledgeGraph } from '../../types/outcomes'
import type {
  CKGExtractionRequest,
  CKGExtractionResult,
  CKGGraphQuery,
  CKGCoverageReport,
} from './types'

// ─── CKG Engine Interface ──────────────────────────────────────────────────────

export interface ICKGEngine {
  // Ingest a curriculum document and queue it for extraction
  ingestDocument(doc: CurriculumDocument): Promise<{ queued: boolean; documentId: string }>

  // Run the extraction pipeline on a document
  extractCurriculum(request: CKGExtractionRequest): Promise<CKGExtractionResult>

  // Build or rebuild the knowledge graph from an extraction
  buildGraph(extraction: CurriculumExtraction): Promise<CurriculumKnowledgeGraph>

  // Query the knowledge graph
  queryGraph(query: CKGGraphQuery): Promise<Partial<CurriculumKnowledgeGraph>>

  // Check curriculum coverage against a set of lesson plans
  checkCoverage(curriculumId: string, lessonIds: string[]): Promise<CKGCoverageReport>

  // Get all outcomes for a given level and subject
  getOutcomes(curriculumId: string, matiere: string, niveau: string): Promise<CurriculumKnowledgeGraph>
}

// ─── CKG Engine (stub) ─────────────────────────────────────────────────────────

export class CKGEngine implements ICKGEngine {
  async ingestDocument(_doc: CurriculumDocument): Promise<{ queued: boolean; documentId: string }> {
    throw new Error('CKGEngine.ingestDocument — not implemented (SPIE-02)')
  }

  async extractCurriculum(_request: CKGExtractionRequest): Promise<CKGExtractionResult> {
    throw new Error('CKGEngine.extractCurriculum — not implemented (SPIE-02)')
  }

  async buildGraph(_extraction: CurriculumExtraction): Promise<CurriculumKnowledgeGraph> {
    throw new Error('CKGEngine.buildGraph — not implemented (SPIE-02)')
  }

  async queryGraph(_query: CKGGraphQuery): Promise<Partial<CurriculumKnowledgeGraph>> {
    throw new Error('CKGEngine.queryGraph — not implemented (SPIE-02)')
  }

  async checkCoverage(_curriculumId: string, _lessonIds: string[]): Promise<CKGCoverageReport> {
    throw new Error('CKGEngine.checkCoverage — not implemented (SPIE-02)')
  }

  async getOutcomes(
    _curriculumId: string,
    _matiere: string,
    _niveau: string,
  ): Promise<CurriculumKnowledgeGraph> {
    throw new Error('CKGEngine.getOutcomes — not implemented (SPIE-02)')
  }
}

export const ckg = new CKGEngine()
