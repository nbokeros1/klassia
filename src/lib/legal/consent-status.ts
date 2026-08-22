import { LEGAL_VERSIONS } from './constants'

// Accepts any Supabase client variant (service_role, server, browser) without
// binding to a specific generic signature — avoids TS2345 across call sites.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = { from: (table: string) => any }

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConsentReason =
  | 'TERMS_OUTDATED'
  | 'PRIVACY_OUTDATED'
  | 'BOTH_OUTDATED'
  | 'NO_CONSENT'
  | null

export interface LegalConsentStatus {
  hasConsent:        boolean
  termsVersion:      string | null
  privacyVersion:    string | null
  acceptedAt:        string | null
  termsCurrent:      boolean
  privacyCurrent:    boolean
  requiresAction:    boolean
  reason:            ConsentReason
}

interface ConsentRow {
  terms_version:   string
  privacy_version: string
  accepted_at:     string
}

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Returns the current legal consent status for a given auth.users.id.
 *
 * Requires migration 046_legal_consents_V11_FINAL_PROPOSED.sql to be applied.
 * If the table does not exist, returns { requiresAction: true, reason: 'NO_CONSENT' }.
 *
 * @param supabaseAdmin - a service-role client (bypasses RLS for cross-user queries)
 * @param userId        - auth.users.id (NOT utilisateurs.id)
 */
export async function getLegalConsentStatus(
  supabaseAdmin: AnySupabaseClient,
  userId: string,
): Promise<LegalConsentStatus> {
  const NO_CONSENT: LegalConsentStatus = {
    hasConsent:     false,
    termsVersion:   null,
    privacyVersion: null,
    acceptedAt:     null,
    termsCurrent:   false,
    privacyCurrent: false,
    requiresAction: true,
    reason:         'NO_CONSENT',
  }

  if (!userId) return NO_CONSENT

  const { data, error } = await supabaseAdmin
    .from('legal_consents')
    .select('terms_version, privacy_version, accepted_at')
    .eq('user_id', userId)
    .order('accepted_at', { ascending: false })
    .limit(1)
    .maybeSingle() as { data: ConsentRow | null; error: unknown }

  if (error || !data) return NO_CONSENT

  const termsCurrent   = data.terms_version   === LEGAL_VERSIONS.terms
  const privacyCurrent = data.privacy_version === LEGAL_VERSIONS.privacy

  let reason: ConsentReason = null
  if (!termsCurrent && !privacyCurrent) reason = 'BOTH_OUTDATED'
  else if (!termsCurrent)               reason = 'TERMS_OUTDATED'
  else if (!privacyCurrent)             reason = 'PRIVACY_OUTDATED'

  return {
    hasConsent:     true,
    termsVersion:   data.terms_version,
    privacyVersion: data.privacy_version,
    acceptedAt:     data.accepted_at,
    termsCurrent,
    privacyCurrent,
    requiresAction: !termsCurrent || !privacyCurrent,
    reason,
  }
}

// ── Server-side consent writer ────────────────────────────────────────────────

export interface ConsentWriteInput {
  userId:            string   // auth.users.id
  utilisateurId:     string   // utilisateurs.id
  acceptanceContext: 'beta_signup' | 'signup' | 'legal_update' | 'admin_migration'
}

export interface ConsentWriteResult {
  ok:        boolean
  duplicate: boolean
  error:     string | null
}

/**
 * Writes a consent event for a user.
 *
 * - user_id and utilisateur_id come from server state — NEVER from the request body.
 * - accepted_at is set by the DB DEFAULT now() — NOT by application code.
 * - terms_version and privacy_version come from LEGAL_VERSIONS constants.
 *
 * Requires migration 046_legal_consents_V11_FINAL_PROPOSED.sql to be applied.
 * If the table does not exist, returns { ok: false, duplicate: false, error: ... }.
 */
export async function writeConsentEvent(
  supabaseAdmin: AnySupabaseClient,
  input: ConsentWriteInput,
): Promise<ConsentWriteResult> {
  const { error } = await supabaseAdmin
    .from('legal_consents')
    .insert({
      user_id:            input.userId,
      utilisateur_id:     input.utilisateurId,
      terms_version:      LEGAL_VERSIONS.terms,
      privacy_version:    LEGAL_VERSIONS.privacy,
      acceptance_context: input.acceptanceContext,
      // accepted_at intentionally omitted — DEFAULT now() is server-authoritative
    })

  if (!error) return { ok: true, duplicate: false, error: null }

  const code = (error as any).code as string | undefined

  if (code === '23505') {
    // Unique constraint violation — exact duplicate event, idempotent
    return { ok: true, duplicate: true, error: null }
  }

  if (code === '42P01') {
    // Table does not exist — migration not yet applied
    return { ok: false, duplicate: false, error: 'MIGRATION_NOT_APPLIED' }
  }

  return { ok: false, duplicate: false, error: code ?? 'UNKNOWN' }
}
