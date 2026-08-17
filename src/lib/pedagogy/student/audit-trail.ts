// ─── ScorgIA V7.1 — Audit Trail Integration (Mission 15) ───────────────────
// Fonctions pour enregistrer toutes les modifications du plan de soutien.
// Chaque changement est tracé : qui (rôle), quand, quoi, valeur avant/après.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  SupportPlanV71,
  PlanChangeEntry,
  AISuggestion,
  AISuggestionStatus,
} from './types'

// ════════════════════════════════════════════════════════════════════════════
// CRÉER UNE ENTRÉE D'AUDIT
// ════════════════════════════════════════════════════════════════════════════

let _entry_counter = 0

function nextEntryId(): string {
  return `audit-${Date.now()}-${++_entry_counter}`
}

function serializeValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

/**
 * Crée une entrée d'audit pour une création de plan.
 */
export function auditPlanCreated(actor_type: PlanChangeEntry['actor_type']): PlanChangeEntry {
  return {
    id:         nextEntryId(),
    timestamp:  new Date().toISOString(),
    actor_type,
    action:     'created',
    note:       'Plan de soutien créé',
  }
}

/**
 * Crée une entrée d'audit pour la modification d'un champ.
 */
export function auditFieldUpdated(options: {
  actor_type:  PlanChangeEntry['actor_type']
  field:       string
  previous?:   unknown
  current?:    unknown
  note?:       string
}): PlanChangeEntry {
  return {
    id:         nextEntryId(),
    timestamp:  new Date().toISOString(),
    actor_type: options.actor_type,
    action:     'updated',
    field:      options.field,
    previous:   serializeValue(options.previous),
    current:    serializeValue(options.current),
    note:       options.note,
  }
}

/**
 * Crée une entrée d'audit pour une révision périodique du plan.
 */
export function auditPlanReviewed(options: {
  actor_type:  PlanChangeEntry['actor_type']
  note?:       string
}): PlanChangeEntry {
  return {
    id:         nextEntryId(),
    timestamp:  new Date().toISOString(),
    actor_type: options.actor_type,
    action:     'reviewed',
    note:       options.note ?? 'Révision périodique du plan',
  }
}

/**
 * Crée une entrée d'audit pour une suggestion IA ajoutée.
 */
export function auditAISuggestionAdded(suggestion_id: string): PlanChangeEntry {
  return {
    id:         nextEntryId(),
    timestamp:  new Date().toISOString(),
    actor_type: 'AI',
    action:     'ai_suggested',
    field:      'ai_suggestions',
    current:    suggestion_id,
    note:       'Suggestion ScorgIA ajoutée — en attente de confirmation enseignant',
  }
}

/**
 * Crée une entrée d'audit pour la confirmation d'une suggestion IA.
 */
export function auditAISuggestionConfirmed(suggestion_id: string, note?: string): PlanChangeEntry {
  return {
    id:         nextEntryId(),
    timestamp:  new Date().toISOString(),
    actor_type: 'TEACHER',
    action:     'confirmed',
    field:      'ai_suggestions',
    current:    suggestion_id,
    note:       note ?? 'Suggestion ScorgIA confirmée par l\'enseignant',
  }
}

/**
 * Crée une entrée d'audit pour le rejet d'une suggestion IA.
 */
export function auditAISuggestionRejected(suggestion_id: string, note?: string): PlanChangeEntry {
  return {
    id:         nextEntryId(),
    timestamp:  new Date().toISOString(),
    actor_type: 'TEACHER',
    action:     'rejected',
    field:      'ai_suggestions',
    current:    suggestion_id,
    note:       note ?? 'Suggestion ScorgIA rejetée par l\'enseignant',
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MUTATIONS IMMUTABLES DU PLAN
// Ces fonctions retournent un nouveau plan — ne mutent pas l'original.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Enregistre une suggestion IA dans le plan et ajoute l'entrée d'audit.
 * L'enseignant doit confirmer avant que la suggestion soit appliquée.
 */
export function addAISuggestionToPlan(
  plan:       SupportPlanV71,
  suggestion: AISuggestion,
): SupportPlanV71 {
  const audit_entry = auditAISuggestionAdded(suggestion.id)

  return {
    ...plan,
    ai_suggestions: [...(plan.ai_suggestions ?? []), suggestion],
    changes_log:    [...plan.changes_log, audit_entry],
  }
}

/**
 * Confirme une suggestion IA — change son statut et crée une entrée d'audit.
 * L'enseignant doit confirmer — le système ne peut pas auto-confirmer.
 */
export function confirmAISuggestion(
  plan:          SupportPlanV71,
  suggestion_id: string,
  modification?:  string,  // si l'enseignant a modifié le contenu
): SupportPlanV71 {
  const new_status: AISuggestionStatus = modification ? 'modified' : 'accepted'
  const now = new Date().toISOString()

  const updated_suggestions = (plan.ai_suggestions ?? []).map(s =>
    s.id === suggestion_id
      ? {
          ...s,
          statut:               new_status,
          confirmed_at:         now,
          confirmed_by:         'TEACHER' as const,
          modification_enseignant: modification,
        }
      : s,
  )

  const audit_entry = auditAISuggestionConfirmed(
    suggestion_id,
    modification ? `Confirmée avec modifications : ${modification}` : undefined,
  )

  return {
    ...plan,
    ai_suggestions: updated_suggestions,
    changes_log:    [...plan.changes_log, audit_entry],
  }
}

/**
 * Rejette une suggestion IA et crée une entrée d'audit.
 */
export function rejectAISuggestion(
  plan:          SupportPlanV71,
  suggestion_id: string,
  note?:         string,
): SupportPlanV71 {
  const updated_suggestions = (plan.ai_suggestions ?? []).map(s =>
    s.id === suggestion_id ? { ...s, statut: 'rejected' as const } : s,
  )

  const audit_entry = auditAISuggestionRejected(suggestion_id, note)

  return {
    ...plan,
    ai_suggestions: updated_suggestions,
    changes_log:    [...plan.changes_log, audit_entry],
  }
}

/**
 * Met à jour un champ du plan et enregistre le changement dans l'audit trail.
 * Utiliser pour toute modification importante qui doit être tracée.
 */
export function updatePlanField<K extends keyof SupportPlanV71>(
  plan:       SupportPlanV71,
  field:      K,
  new_value:  SupportPlanV71[K],
  actor_type: PlanChangeEntry['actor_type'],
  note?:      string,
): SupportPlanV71 {
  const previous = plan[field]

  const audit_entry = auditFieldUpdated({
    actor_type,
    field:     String(field),
    previous,
    current:   new_value,
    note,
  })

  return {
    ...plan,
    [field]:     new_value,
    changes_log: [...plan.changes_log, audit_entry],
  }
}

// ════════════════════════════════════════════════════════════════════════════
// LECTURE DE L'AUDIT TRAIL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Filtre l'audit trail par type d'acteur.
 */
export function getAuditEntriesByActor(
  plan:       SupportPlanV71,
  actor_type: PlanChangeEntry['actor_type'],
): PlanChangeEntry[] {
  return plan.changes_log.filter(e => e.actor_type === actor_type)
}

/**
 * Filtre l'audit trail par action.
 */
export function getAuditEntriesByAction(
  plan:   SupportPlanV71,
  action: PlanChangeEntry['action'],
): PlanChangeEntry[] {
  return plan.changes_log.filter(e => e.action === action)
}

/**
 * Retourne l'historique des modifications d'un champ spécifique.
 */
export function getFieldHistory(
  plan:  SupportPlanV71,
  field: string,
): PlanChangeEntry[] {
  return plan.changes_log
    .filter(e => e.field === field)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

/**
 * Résumé de l'audit trail — pour affichage enseignant.
 */
export function summarizeAuditTrail(plan: SupportPlanV71): AuditTrailSummary {
  const log = plan.changes_log

  const nb_teacher_actions = log.filter(e => e.actor_type === 'TEACHER').length
  const nb_ai_suggestions  = log.filter(e => e.action === 'ai_suggested').length
  const nb_confirmed       = log.filter(e => e.action === 'confirmed').length
  const nb_rejected        = log.filter(e => e.action === 'rejected').length
  const nb_reviews         = log.filter(e => e.action === 'reviewed').length

  const last_entry        = log[log.length - 1]
  const last_teacher_action = log.slice().reverse().find(e => e.actor_type === 'TEACHER')

  return {
    total_entries:          log.length,
    nb_teacher_actions,
    nb_ai_suggestions,
    nb_confirmed,
    nb_rejected,
    nb_reviews,
    last_modified_at:       last_entry?.timestamp,
    last_teacher_action_at: last_teacher_action?.timestamp,
    ai_confirmation_rate:   nb_ai_suggestions > 0
      ? Math.round((nb_confirmed / nb_ai_suggestions) * 100)
      : null,
  }
}

export type AuditTrailSummary = {
  total_entries:           number
  nb_teacher_actions:      number
  nb_ai_suggestions:       number
  nb_confirmed:            number
  nb_rejected:             number
  nb_reviews:              number
  last_modified_at?:       string
  last_teacher_action_at?: string
  ai_confirmation_rate:    number | null   // % de suggestions IA confirmées
}
