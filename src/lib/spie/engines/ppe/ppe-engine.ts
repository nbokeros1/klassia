// PPE — Provincial Pedagogy Engine
// Responsibility: encode provincial pedagogical rules, vocabulary, and templates.
// Provides the context that makes generated content province-appropriate.
//
// Status: SPIE-01 — Interface and stubs only. Implementation in SPIE-03.
//
// Existing infrastructure this engine will delegate to:
//   - src/lib/constants/templates-provinciaux.ts (TEMPLATES_PROVINCIAUX)
//   - src/lib/constants/curricula.ts (CURRICULA_CONTEXT)
//   - src/lib/ia/skills-pedagogiques.ts
//   - src/lib/ia/build-system-prompt.ts (section context provincial)

import type { ProvinceCode } from '../../types/province'
import type {
  ProvinceProfile,
  TemplateSelectionParams,
  PromptAdaptations,
} from './types'

export interface IPPEEngine {
  // Get the full pedagogical profile for a province + context
  getProvinceProfile(
    province: ProvinceCode | string,
    matiere: string,
    niveau: string,
  ): ProvinceProfile

  // Select the appropriate template
  selectTemplate(params: TemplateSelectionParams): string

  // Build prompt adaptations for PGE
  buildPromptAdaptations(
    province: ProvinceCode | string,
    langue: 'fr' | 'en',
  ): PromptAdaptations

  // Check whether a required field is present according to provincial rules
  validateRequiredFields(
    province: ProvinceCode | string,
    fields: Record<string, unknown>,
  ): { valid: boolean; missing: string[] }
}

export class PPEEngine implements IPPEEngine {
  getProvinceProfile(
    _province: ProvinceCode | string,
    _matiere: string,
    _niveau: string,
  ): ProvinceProfile {
    throw new Error('PPEEngine.getProvinceProfile — not implemented (SPIE-03)')
  }

  selectTemplate(_params: TemplateSelectionParams): string {
    throw new Error('PPEEngine.selectTemplate — not implemented (SPIE-03)')
  }

  buildPromptAdaptations(
    _province: ProvinceCode | string,
    _langue: 'fr' | 'en',
  ): PromptAdaptations {
    throw new Error('PPEEngine.buildPromptAdaptations — not implemented (SPIE-03)')
  }

  validateRequiredFields(
    _province: ProvinceCode | string,
    _fields: Record<string, unknown>,
  ): { valid: boolean; missing: string[] } {
    throw new Error('PPEEngine.validateRequiredFields — not implemented (SPIE-03)')
  }
}

export const ppe = new PPEEngine()
