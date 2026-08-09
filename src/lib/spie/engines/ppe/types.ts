// PPE — Provincial Pedagogy Engine types

import type { ProvinceEducation, ProvinceCode } from '../../types/province'

// ─── Province Profile ──────────────────────────────────────────────────────────
// The resolved pedagogical profile for a given context (province + subject + level)

export interface ProvinceProfile {
  province: ProvinceEducation
  templateId: string              // Selected template for this context
  promptAdaptations: PromptAdaptations
  vocabulaireProvincial: VocabulaireProvincial
  standardsApplicables: string[]  // ProfessionalStandard IDs
}

// ─── Vocabulary mapping ────────────────────────────────────────────────────────
// Maps province-specific terms to SPIE-neutral equivalents

export interface VocabulaireProvincial {
  outcomeGeneral: string          // "RAG" | "Attente générale" | "Compétence disciplinaire"
  outcomeSpecific: string         // "RAS" | "Attente spécifique" | "Indicateur"
  differentiation: string         // "Différenciation U/C/S" | "PEI" | "UDL"
  evaluation: string              // Province-specific evaluation terminology
  phaseAvant: string              // "Amorce" | "Mise en situation" | "Préparation"
  phasePendant: string            // "Réalisation" | "Déroulement" | "Action"
  phaseApres: string              // "Intégration" | "Objectivation" | "Consolidation"
}

// ─── Prompt adaptations ────────────────────────────────────────────────────────

export interface PromptAdaptations {
  province: ProvinceCode | string
  langue: 'fr' | 'en'
  // Context injected into the system prompt
  contextProvincial: string
  // Required sections for this province's lesson template
  sectionsRequises: string[]
  // Optional sections
  sectionsOptionnelles: string[]
  // Province-specific rules to inject
  reglesSpecifiques: string[]
}

// ─── Template selection params ─────────────────────────────────────────────────

export interface TemplateSelectionParams {
  province: ProvinceCode | string
  matiere?: string
  niveau?: string
  typeContenu: 'plan_lecon' | 'plan_sequence' | 'plan_annuel'
  templatePersoId?: string        // Teacher's custom template (overrides official)
}
