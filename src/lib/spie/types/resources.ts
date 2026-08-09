// SPIE — Resources, Templates, and Professional Standards

import type { CurriculumId } from '@/lib/constants/curricula'

// ─── Pedagogical Resource ──────────────────────────────────────────────────────

export type ResourceType =
  | 'document'      // Word, PDF
  | 'presentation'  // PowerPoint
  | 'video'         // Video resource
  | 'audio'         // Audio resource
  | 'image'         // Image or infographic
  | 'lien'          // External URL
  | 'gabarit'       // Template
  | 'activite'      // Ready-to-use activity
  | 'evaluation'    // Assessment tool
  | 'autre'

export type ResourceNiveau = 'primaire' | 'secondaire' | 'tous'
export type ResourceLicence = 'cc_by' | 'cc_by_nc' | 'cc_by_sa' | 'libre' | 'proprietaire' | 'interne'

export interface PedagogicalResource {
  id: string
  enseignantId?: string           // null = ScorgIA shared resource
  titre: string
  description?: string
  type: ResourceType
  langue: 'fr' | 'en' | 'bilingual'
  niveaux?: string[]
  matieres?: string[]
  curriculumId?: CurriculumId | string
  outcomesSpecifiquesIds?: string[]
  // Storage
  storagePath?: string
  url?: string
  // Metadata
  tags?: string[]
  niveau: ResourceNiveau
  licence: ResourceLicence
  auteur?: string
  sourceUrl?: string
  // Usage
  nbTelechargements?: number
  nbFavoris?: number
  // Moderation (for community-shared resources)
  statut: 'prive' | 'publie' | 'en_revision' | 'retire'
  createdAt: string
  updatedAt: string
}

// ─── Template ──────────────────────────────────────────────────────────────────
// A lesson plan, sequence, or annual plan template.
// ScorgIA provides official templates; teachers can create their own.

export type TemplateType = 'plan_lecon' | 'plan_sequence' | 'plan_annuel' | 'evaluation' | 'reflexion'
export type TemplateStatut = 'actif' | 'archive' | 'experimental' | 'officiel'

export interface TemplateVersion {
  version: string
  changelog: string
  date: string
  actuelle: boolean
}

export interface Template {
  id: string
  enseignantId?: string           // null = official ScorgIA template
  provinceCode?: string           // null = province-agnostic
  curriculumId?: CurriculumId | string
  type: TemplateType
  nom: string
  description?: string
  langue: 'fr' | 'en' | 'bilingual'
  // Structure: each field maps to a ChampTemplate from templates-provinciaux.ts
  structure: TemplateStructure
  // Versioning
  versions: TemplateVersion[]
  versionActuelle: string
  statut: TemplateStatut
  // Whether this template can be imported by teachers
  importable: boolean
  // Whether this template can be used as a base for customization
  personnalisable: boolean
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface TemplateStructure {
  champs_entete: TemplateField[]
  champs_cadre: TemplateField[]
  champs_avant: TemplateField[]
  champs_pendant: TemplateField[]
  champs_apres: TemplateField[]
  label_avant: string
  label_pendant: string
  label_apres: string
}

export interface TemplateField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'richtext' | 'duree' | 'liste' | 'section'
  obligatoire: boolean
  placeholder?: string
  aide?: string
  // SPIE addition: which SPIE domain object field this maps to
  spieMapping?: string          // e.g. "content.rag", "content.differentiation.universel"
}

// ─── Professional Standard ────────────────────────────────────────────────────
// Provincial teacher professional standards (TQS Alberta, etc.)

export type StandardType = 'enseignement' | 'leadership' | 'evaluation' | 'collegialite' | 'perfectionnement'

export interface ProfessionalStandardIndicator {
  code: string
  libelle: string
  description?: string
  exemples?: string[]
}

export interface ProfessionalStandard {
  id: string
  provinceCode: string
  pays: string
  nom: string
  nomAnglais?: string
  acronyme: string              // e.g. "TQS", "TPP", "OCT"
  description?: string
  type: StandardType
  version: string
  anneePublication: number
  // The standards / indicators
  indicateurs: ProfessionalStandardIndicator[]
  // How this standard maps to SPIE quality dimensions
  qualityDimensionMapping?: Record<string, string>
  siteOfficiel?: string
  statut: 'actif' | 'archive'
  createdAt: string
}
