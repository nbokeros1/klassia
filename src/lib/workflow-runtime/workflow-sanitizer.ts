// ── Workflow Runtime — Sanitisation (ME-14) ───────────────────────────────────

import type { ExecutionPlan } from '../execution-engine/types'

// Champs interdits dans le snapshot (contrat ME-13.5)
const FORBIDDEN_KEYS = new Set([
  'texteExtrait', 'textExtracted',
  'storage_path', 'storagePath',
  'token', 'apiKey', 'api_key',
  'priority_student_ids', 'priorityStudentIds',
  'studentName', 'nom_eleve', 'eleve_id', 'student_id',
  'signedUrl', 'signed_url',
  'systemPrompt', 'system_prompt',
])

const SENSITIVE_PATTERNS = [
  /texteExtrait/i,
  /storage_path/i,
  /\btoken\b/i,
  /priority_student_ids/i,
  /student_id\b/i,
]

/**
 * Vérifie que le snapshot ne contient aucune donnée sensible.
 */
function containsSensitiveData(obj: unknown): boolean {
  if (obj === null || obj === undefined) return false
  if (typeof obj === 'string') {
    return SENSITIVE_PATTERNS.some(p => p.test(obj))
  }
  if (Array.isArray(obj)) {
    return obj.some(containsSensitiveData)
  }
  if (typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(key)) return true
      if (containsSensitiveData(val)) return true
    }
  }
  return false
}

/**
 * Construit le snapshot immuable du plan pour la persistance.
 * Ne conserve que les champs publics nécessaires à l'exécution.
 * Lève une erreur si des données sensibles sont détectées.
 */
export function sanitizePlanSnapshot(plan: ExecutionPlan): Record<string, unknown> {
  const snapshot = {
    id:                 plan.id,
    sourceType:         plan.sourceType,
    sourceId:           plan.sourceId,
    missionType:        plan.missionType,
    title:              plan.title,
    objective:          plan.objective,
    classeId:           plan.classeId,
    matiere:            plan.matiere,
    steps:              plan.steps.map(step => ({
      id:                 step.id,
      order:              step.order,
      capability:         step.capability,
      kind:               step.kind,
      title:              step.title,
      description:        step.description,
      target:             step.target,
      requirements:       step.requirements,
      completionCriteria: step.completionCriteria,
      estimatedMinutes:   step.estimatedMinutes,
      optional:           step.optional,
    })),
    summary:            plan.summary,
    targetRoute:        plan.targetRoute,
    createdFromVersion: plan.createdFromVersion,
  }

  if (containsSensitiveData(snapshot)) {
    throw new Error('[WORKFLOW][SANITIZER] Plan snapshot contient des données sensibles. Persistance refusée.')
  }

  return snapshot as Record<string, unknown>
}

/**
 * Assainit une note de complétion :
 * - longueur max 500 chars ;
 * - suppression des balises HTML ;
 * - texte simple uniquement.
 */
export function sanitizeNote(note: string | undefined | null): string | null {
  if (!note) return null

  const stripped = note
    .replace(/<[^>]*>/g, '')   // supprimer HTML
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')  // supprimer caractères de contrôle
    .trim()
    .slice(0, 500)

  return stripped || null
}

/**
 * Reconstitue un ExecutionPlan depuis le snapshot JSONB persisté.
 * Valide le schéma minimal.
 */
export function hydrateSnapshot(raw: unknown): ExecutionPlan | null {
  if (!raw || typeof raw !== 'object') return null

  const snap = raw as Record<string, unknown>

  if (
    typeof snap['id']           !== 'string' ||
    typeof snap['sourceType']   !== 'string' ||
    typeof snap['sourceId']     !== 'string' ||
    typeof snap['title']        !== 'string' ||
    typeof snap['objective']    !== 'string' ||
    !Array.isArray(snap['steps'])
  ) {
    return null
  }

  return snap as unknown as ExecutionPlan
}
