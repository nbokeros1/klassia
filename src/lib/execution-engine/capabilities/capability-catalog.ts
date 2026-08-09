// ── Capability Catalog (ME-13.5) ──────────────────────────────────────────────
//
// Valeurs par défaut stables associées à chaque capability.
// Ne pas inclure : routes, classeId, matière, titres spécifiques à une mission.

import type { ExecutionCapability } from './execution-capability'
import type { ExecutionStepKind }   from '../types'

export interface ExecutionCapabilityDefinition {
  capability:                  ExecutionCapability
  defaultKind:                 ExecutionStepKind
  defaultEstimatedMinutes:     number | null
  category:
    | 'review'
    | 'selection'
    | 'navigation'
    | 'creation'
    | 'correction'
    | 'verification'
    | 'confirmation'
  requiresExplicitConfirmation: boolean
  canBeOptional:                boolean
}

const CATALOG: readonly ExecutionCapabilityDefinition[] = [
  // ── Revue ─────────────────────────────────────────────────────────────────
  { capability: 'review_class_context',         defaultKind: 'review',   defaultEstimatedMinutes: 3,    category: 'review',       requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'review_annual_plan',           defaultKind: 'review',   defaultEstimatedMinutes: 5,    category: 'review',       requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'review_curriculum',            defaultKind: 'review',   defaultEstimatedMinutes: 5,    category: 'review',       requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'review_latest_lesson',         defaultKind: 'review',   defaultEstimatedMinutes: 5,    category: 'review',       requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'review_taught_content',        defaultKind: 'review',   defaultEstimatedMinutes: 5,    category: 'review',       requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'review_learning_objectives',   defaultKind: 'verify',   defaultEstimatedMinutes: 5,    category: 'review',       requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'review_deadline',              defaultKind: 'review',   defaultEstimatedMinutes: 3,    category: 'review',       requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'review_assignments',           defaultKind: 'review',   defaultEstimatedMinutes: 5,    category: 'review',       requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'review_student_signals',       defaultKind: 'review',   defaultEstimatedMinutes: 5,    category: 'review',       requiresExplicitConfirmation: false, canBeOptional: false },
  // ── Sélection ──────────────────────────────────────────────────────────────
  { capability: 'select_topic',                 defaultKind: 'select',   defaultEstimatedMinutes: 5,    category: 'selection',    requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'select_content',               defaultKind: 'select',   defaultEstimatedMinutes: 5,    category: 'selection',    requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'select_learning_objectives',   defaultKind: 'select',   defaultEstimatedMinutes: 5,    category: 'selection',    requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'select_students_for_follow_up',defaultKind: 'select',   defaultEstimatedMinutes: 5,    category: 'selection',    requiresExplicitConfirmation: false, canBeOptional: false },
  // ── Navigation ─────────────────────────────────────────────────────────────
  { capability: 'navigate_to_prepare',          defaultKind: 'navigate', defaultEstimatedMinutes: 2,    category: 'navigation',   requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'navigate_to_class',            defaultKind: 'navigate', defaultEstimatedMinutes: 2,    category: 'navigation',   requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'navigate_to_students',         defaultKind: 'navigate', defaultEstimatedMinutes: 2,    category: 'navigation',   requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'navigate_to_calendar',         defaultKind: 'navigate', defaultEstimatedMinutes: 2,    category: 'navigation',   requiresExplicitConfirmation: false, canBeOptional: true  },
  { capability: 'navigate_to_library',          defaultKind: 'navigate', defaultEstimatedMinutes: 2,    category: 'navigation',   requiresExplicitConfirmation: false, canBeOptional: true  },
  // ── Création ───────────────────────────────────────────────────────────────
  { capability: 'create_annual_plan',           defaultKind: 'create',   defaultEstimatedMinutes: 30,   category: 'creation',     requiresExplicitConfirmation: true,  canBeOptional: false },
  { capability: 'create_lesson',                defaultKind: 'prepare',  defaultEstimatedMinutes: 15,   category: 'creation',     requiresExplicitConfirmation: true,  canBeOptional: false },
  { capability: 'create_evaluation',            defaultKind: 'prepare',  defaultEstimatedMinutes: 20,   category: 'creation',     requiresExplicitConfirmation: true,  canBeOptional: false },
  { capability: 'adapt_planning',               defaultKind: 'prepare',  defaultEstimatedMinutes: null, category: 'creation',     requiresExplicitConfirmation: false, canBeOptional: false },
  // ── Correction ─────────────────────────────────────────────────────────────
  { capability: 'correct_assignments',          defaultKind: 'correct',  defaultEstimatedMinutes: null, category: 'correction',   requiresExplicitConfirmation: true,  canBeOptional: false },
  { capability: 'record_results',               defaultKind: 'create',   defaultEstimatedMinutes: 10,   category: 'correction',   requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'add_feedback',                 defaultKind: 'create',   defaultEstimatedMinutes: 15,   category: 'creation',     requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'add_follow_up',                defaultKind: 'create',   defaultEstimatedMinutes: 10,   category: 'creation',     requiresExplicitConfirmation: false, canBeOptional: false },
  // ── Planification ──────────────────────────────────────────────────────────
  { capability: 'schedule_evaluation',          defaultKind: 'navigate', defaultEstimatedMinutes: 3,    category: 'navigation',   requiresExplicitConfirmation: false, canBeOptional: true  },
  // ── Vérification ───────────────────────────────────────────────────────────
  { capability: 'verify_document',              defaultKind: 'verify',   defaultEstimatedMinutes: 3,    category: 'verification', requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'verify_evaluation',            defaultKind: 'verify',   defaultEstimatedMinutes: 10,   category: 'verification', requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'verify_feedback',              defaultKind: 'verify',   defaultEstimatedMinutes: 3,    category: 'verification', requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'verify_follow_up',             defaultKind: 'verify',   defaultEstimatedMinutes: 3,    category: 'verification', requiresExplicitConfirmation: false, canBeOptional: false },
  // ── Sauvegarde et confirmation ─────────────────────────────────────────────
  { capability: 'save_document',                defaultKind: 'complete', defaultEstimatedMinutes: 3,    category: 'confirmation', requiresExplicitConfirmation: true,  canBeOptional: false },
  { capability: 'confirm_completion',           defaultKind: 'confirm',  defaultEstimatedMinutes: 1,    category: 'confirmation', requiresExplicitConfirmation: true,  canBeOptional: false },
  // ── Générique (fallback) ───────────────────────────────────────────────────
  { capability: 'generic_review',               defaultKind: 'review',   defaultEstimatedMinutes: 2,    category: 'review',       requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'generic_action',               defaultKind: 'prepare',  defaultEstimatedMinutes: null, category: 'creation',     requiresExplicitConfirmation: false, canBeOptional: false },
  { capability: 'generic_verify',               defaultKind: 'verify',   defaultEstimatedMinutes: 2,    category: 'verification', requiresExplicitConfirmation: false, canBeOptional: false },
] as const satisfies readonly ExecutionCapabilityDefinition[]

Object.freeze(CATALOG)

const CATALOG_MAP = new Map<ExecutionCapability, ExecutionCapabilityDefinition>(
  CATALOG.map(d => [d.capability, d]),
)

/**
 * Retourne la définition d'une capability, ou undefined si inconnue.
 * Utiliser pour valider qu'une capability est connue.
 */
export function getCapabilityDefinition(
  capability: ExecutionCapability,
): ExecutionCapabilityDefinition | undefined {
  return CATALOG_MAP.get(capability)
}

/**
 * Retourne toutes les définitions (lecture seule).
 * Utile pour les tests d'exhaustivité du catalogue.
 */
export function getAllCapabilityDefinitions(): readonly ExecutionCapabilityDefinition[] {
  return CATALOG
}

export const EXECUTION_CAPABILITY_CATALOG = CATALOG
