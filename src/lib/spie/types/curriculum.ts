// SPIE — Curriculum domain objects
// A Curriculum is the official program of studies for a province/subject/level.
// CKG ingests CurriculumDocuments and produces CurriculumExtractions.

import type { CurriculumId } from '@/lib/constants/curricula'
import type { ProvinceCode, CountryCode } from './province'

// ─── Curriculum Version ────────────────────────────────────────────────────────

export interface CurriculumVersion {
  version: string           // e.g. "2023", "Revised 2022"
  anneePublication: number
  anneeDeprecation?: number
  notes?: string
  estActuelle: boolean
}

// ─── Curriculum Document ───────────────────────────────────────────────────────
// The raw source material: a PDF, Word document, or text that contains the
// official curriculum. Multiple documents can belong to one Curriculum.

export type DocumentSourceType = 'pdf' | 'docx' | 'url' | 'texte' | 'api'

export interface CurriculumDocument {
  id: string
  curriculumId: string
  titre: string
  description?: string
  sourceType: DocumentSourceType
  sourceUrl?: string
  storagePath?: string        // Supabase Storage path if uploaded
  langue: 'fr' | 'en' | 'bilingual'
  matiere?: string            // null = covers all subjects
  niveaux?: string[]          // null = covers all grades
  anneePublication?: number
  tailleMo?: number
  hash?: string               // SHA-256 for change detection
  statut: 'brut' | 'indexe' | 'extrait' | 'erreur'
  createdAt: string
  updatedAt: string
}

// ─── Curriculum ────────────────────────────────────────────────────────────────
// The master entity: represents an official program of studies.

export interface Curriculum {
  id: CurriculumId | string
  provinceCode: ProvinceCode | string
  pays: CountryCode
  authorityId?: string           // null = ministerial (provincial) curriculum
  nom: string                    // "Programme de formation de l'école québécoise"
  nomAnglais?: string            // "Alberta Program of Studies"
  nomCourt: string               // "PFEQ", "APS", "Ontario Curriculum"
  versionActuelle: CurriculumVersion
  versionsHistorique: CurriculumVersion[]
  langue: 'fr' | 'en' | 'bilingual'
  statut: 'actif' | 'archive' | 'en_revision' | 'experimental'
  // Matieres this curriculum covers (empty = all)
  matieres: string[]
  // Grade/level ranges (e.g. ["1", "2", "3", "4", "5", "6"] or ["10", "20", "30"])
  niveaux: string[]
  documents: CurriculumDocument[]
  extraction?: CurriculumExtraction
  metadonnees?: Record<string, unknown>
  siteOfficiel?: string
  createdAt: string
  updatedAt: string
}

// ─── Curriculum Extraction ─────────────────────────────────────────────────────
// The structured output after CKG processes a CurriculumDocument.
// This is the bridge between raw documents and the Knowledge Graph.

export type ExtractionStatut = 'pending' | 'en_cours' | 'complete' | 'erreur' | 'partielle'

export interface CurriculumExtractionStats {
  nbOutcomesGeneraux: number
  nbOutcomesSpecifiques: number
  nbCompetences: number
  nbConcepts: number
  nbVocabulaire: number
  nbBigIdees: number
  scoreConfiance: number      // 0–100, how confident the extraction is
  tempsExtractionMs: number
}

export interface CurriculumExtraction {
  id: string
  curriculumId: string
  documentIds: string[]       // Which documents were used
  matiere: string
  niveaux: string[]
  langue: 'fr' | 'en'
  statut: ExtractionStatut
  erreur?: string
  stats: CurriculumExtractionStats
  // References to the extracted knowledge objects
  outcomesGenerauxIds: string[]
  outcomesSpecifiquesIds: string[]
  competencesIds: string[]
  conceptsIds: string[]
  vocabulaireIds: string[]
  bigIdeesIds: string[]
  // Raw extraction for debugging / re-processing
  rawJsonExtraction?: Record<string, unknown>
  modeleIA: string            // Which AI model performed the extraction
  promptVersion: string       // Version of the extraction prompt used
  createdAt: string
  updatedAt: string
}

// ─── Curriculum Search ─────────────────────────────────────────────────────────
// Query parameters for finding the right curriculum

export interface CurriculumSearchParams {
  provinceCode?: ProvinceCode | string
  pays?: CountryCode
  matiere?: string
  niveau?: string
  langue?: 'fr' | 'en'
  statut?: 'actif' | 'archive'
}
