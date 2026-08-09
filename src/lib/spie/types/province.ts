// SPIE — Province & School Authority domain objects
// These are the top-level entities that configure the entire pedagogical pipeline.

import type { CurriculumId } from '@/lib/constants/curricula'

// ─── Province codes ────────────────────────────────────────────────────────────

export type ProvinceCode =
  | 'alberta'
  | 'ontario'
  | 'quebec'
  | 'bc'
  | 'saskatchewan'
  | 'manitoba'
  | 'nouveau_brunswick'
  | 'nouvelle_ecosse'
  | 'ipe'
  | 'terre_neuve'
  | 'tno'
  | 'yukon'
  | 'nunavut'

export type CountryCode = 'canada' | 'usa' | 'france' | 'belgique' | 'suisse' | 'maroc' | 'senegal' | string

// The vocabulary system a province uses for learning outcomes.
// This determines how CKG extracts and labels outcomes.
export type OutcomeVocabulary =
  | 'rag_ras'         // Alberta, Saskatchewan, Manitoba: Résultat Apprentissage Général / Spécifique
  | 'expectations'    // Ontario: Overall Expectations / Specific Expectations
  | 'competences'     // Québec: Compétences disciplinaires / transversales
  | 'big_ideas'       // Colombie-Britannique: Big Ideas + Curricular Competencies
  | 'standards'       // Common Core / USA: Standards
  | 'objectives'      // Generic / International

// ─── School Authority ──────────────────────────────────────────────────────────

export type AuthorityType =
  | 'public'
  | 'catholique'
  | 'prive'
  | 'laique'
  | 'francophone'
  | 'anglophone'
  | 'premières_nations'
  | 'métis'
  | 'international'

export interface SchoolAuthority {
  id: string
  nom: string
  nomAnglais?: string
  province: ProvinceCode | string
  pays: CountryCode
  type: AuthorityType
  langue: 'fr' | 'en' | 'bilingual'
  regions?: string[]
  siteWeb?: string
  contactEmail?: string
  // Curriculum IDs this authority follows (may differ from provincial default)
  curriculaIds: CurriculumId[]
  actif: boolean
  createdAt: string
}

// ─── Province Education ────────────────────────────────────────────────────────

export interface ProvinceEducation {
  code: ProvinceCode | string
  nom: string                     // "Alberta"
  nomAnglais: string              // "Alberta"
  pays: CountryCode
  langue: 'fr' | 'en' | 'bilingual'
  // How this province expresses learning outcomes
  outcomeVocabulary: OutcomeVocabulary
  // Official curriculum IDs available for this province
  curriculaIds: CurriculumId[]
  // School authorities in this province
  autoritesScolaires: SchoolAuthority[]
  // Province-specific pedagogy rules
  regles: ProvinceRules
  // Professional standards applicable
  normesProId?: string[]          // IDs of ProfessionalStandard
  actif: boolean
  metadonnees?: Record<string, unknown>
}

// ─── Province Rules ────────────────────────────────────────────────────────────
// Rules specific to a province that affect how content is generated and validated.

export interface ProvinceRules {
  // Does this province require indigenous perspectives to be integrated?
  perspectiveAutochtoneRequise: boolean
  // Does this province require 3-tier differentiation (Universel/Ciblé/Spécialisé)?
  differentiationObligatoire: boolean
  // What differentiation model does this province use?
  modeleDifferentiation: 'ucs' | 'udl' | 'pei' | 'ips' | 'generic'
  // Does this province require language integration in French immersion?
  integrationLangueRequise: boolean
  // Calendar: when does the school year start? (ISO date pattern)
  debutAnnee: 'septembre' | 'aout' | 'janvier'
  // Typical lesson duration in minutes
  dureeTyiqueMinutes: number
  // Number of school weeks per year
  nombreSemainesAnnee: number
  // Special requirements or notes
  notesSpeciales?: string[]
}

// ─── Province Profiles Registry ───────────────────────────────────────────────
// The registry is populated by the PPE engine. This type defines the shape.

export type ProvinceRegistry = Record<ProvinceCode | string, ProvinceEducation>
