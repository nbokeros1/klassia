import { createAdminClient } from '@/lib/supabase/admin'

// Allowlisted event types — must match migration 047 constraint
export type BetaEventType =
  | 'dashboard_entered'
  | 'build_year_started'
  | 'build_year_completed'
  | 'class_created'
  | 'ai_generation_started'
  | 'ai_generation_completed'
  | 'mon_annee_opened'
  | 'prepare_opened'
  | 'return_visit'
  | 'feedback_submitted'
  | 'onboarding_step_completed'
  | 'onboarding_completed'

export type BetaFeature =
  | 'dashboard'
  | 'build_year'
  | 'classes'
  | 'ai_studio'
  | 'mon_annee'
  | 'prepare'
  | 'onboarding'
  | 'feedback'

export interface BetaEventPayload {
  utilisateur_id: string
  event_type: BetaEventType
  feature: BetaFeature
  metadata?: Record<string, unknown>
  page_url?: string
  session_id?: string
}

// Allowlisted metadata keys — prevents sensitive data from leaking into events
const SAFE_METADATA_KEYS = new Set([
  'pack_id', 'pack_statut', 'step', 'step_index', 'step_count',
  'class_id', 'class_count', 'generation_type', 'model',
  'duration_ms', 'is_return', 'onboarding_step', 'feedback_type',
  'week', 'day_of_week',
])

function sanitizeMetadata(raw?: Record<string, unknown>): Record<string, unknown> {
  if (!raw) return {}
  return Object.fromEntries(
    Object.entries(raw).filter(([k]) => SAFE_METADATA_KEYS.has(k))
  )
}

export async function recordBetaEvent(payload: BetaEventPayload): Promise<void> {
  // Non-throwing — analytics must never break the feature it's observing
  try {
    const db = createAdminClient()
    const { error } = await db.from('beta_events').insert({
      utilisateur_id: payload.utilisateur_id,
      event_type: payload.event_type,
      feature: payload.feature,
      metadata: sanitizeMetadata(payload.metadata),
      page_url: payload.page_url ?? null,
      session_id: payload.session_id ?? null,
    })
    if (error && process.env.NODE_ENV === 'development') {
      console.warn('[beta-events] insert failed:', error.message)
    }
  } catch {
    // Swallow — analytics failure must never propagate
  }
}
