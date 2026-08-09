// CKG — Curriculum Knowledge Graph Engine types
// Internal types for the CKG engine (not the domain objects in spie/types/)

import type { CurriculumExtraction } from '../../types/curriculum'
import type { CurriculumKnowledgeGraph } from '../../types/outcomes'

// ─── Extraction Request ────────────────────────────────────────────────────────

export interface CKGExtractionRequest {
  documentId: string
  curriculumId: string
  matiere: string
  niveaux: string[]
  langue: 'fr' | 'en'
  force?: boolean               // Re-extract even if already done
}

// ─── Extraction Result ─────────────────────────────────────────────────────────

export interface CKGExtractionResult {
  extraction: CurriculumExtraction
  graph: CurriculumKnowledgeGraph
  warnings: string[]
  durationMs: number
}

// ─── Graph Query ───────────────────────────────────────────────────────────────

export interface CKGGraphQuery {
  curriculumId: string
  matiere?: string
  niveau?: string
  outcomesGenerauxIds?: string[]
  includeRelations?: boolean
}

// ─── Coverage Check ────────────────────────────────────────────────────────────
// Used by TQE and LCE to verify curriculum coverage

export interface CoverageMissing {
  outcomeSpecifiqueId: string
  code: string
  libelle: string
  reason: 'not_covered' | 'partial' | 'missing_prerequisite'
}

export interface CKGCoverageReport {
  curriculumId: string
  matiere: string
  niveau: string
  // All outcomes in the curriculum
  totalOutcomes: number
  coveredOutcomes: number
  coveragePercent: number
  // What's missing
  missing: CoverageMissing[]
  // Warnings (partial coverage, missing prerequisites)
  warnings: string[]
}
