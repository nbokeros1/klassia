-- ============================================================
-- MIGRATION 046 V1.1 — Legal Consent Events (FINAL PROPOSED)
-- STATUS  : PROPOSED — DO NOT APPLY
-- Supersedes: 046_legal_consents_PROPOSED.sql (mutable fields)
-- Author  : SCORGIA LEGAL V1.1 Sprint
-- Date    : 2026-08-21
-- ADR     : docs/Architecture/ADR_LEGAL_CONSENT_STORAGE.md
-- ============================================================
-- PURPOSE
--   Create an append-only legal consent events table that provides
--   a durable, auditable record of WHO accepted WHAT version WHEN
--   and through which application flow.
--
--   Replaces the proposed mutable columns on utilisateurs.
--   See ADR for full rationale.
--
-- IDENTITY RELATIONSHIPS
--   auth.users.id   = auth.uid()        (canonical identity)
--   utilisateurs.user_id = auth.uid()   (profile FK)
--   utilisateurs.id = internal row UUID (NOT auth.uid())
--
-- PREREQUISITES
--   - Migrations 001–045 must already be applied.
--   - Migration 046_legal_consents_PROPOSED.sql must NOT have been applied.
--     (If already applied, add DROP COLUMN for terms_version, privacy_version,
--     legal_accepted_at from utilisateurs before applying this migration.)
--
-- ROLLBACK
--   DROP TABLE IF EXISTS legal_consents CASCADE;
--
-- DO NOT APPLY UNTIL:
--   1. Legal documents (v1.0) have been reviewed by a Canadian legal professional.
--   2. PO gives explicit GO for this migration.
--   3. The self-service account-deletion portal is confirmed in scope.
-- ============================================================

-- ── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS legal_consents (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Canonical identity anchor: auth.users.id = auth.uid()
  -- NOT utilisateurs.id — that is the internal profile PK.
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Convenience join to utilisateurs (nullable: SET NULL if profile deleted).
  utilisateur_id     UUID        REFERENCES utilisateurs(id)       ON DELETE SET NULL,

  -- Document versions accepted (required, never null).
  terms_version      TEXT        NOT NULL,
  privacy_version    TEXT        NOT NULL,

  -- Which application flow triggered this acceptance.
  acceptance_context TEXT        NOT NULL DEFAULT 'beta_signup'
    CHECK (acceptance_context IN ('beta_signup', 'signup', 'legal_update', 'admin_migration')),

  -- Server-generated timestamp — client cannot override.
  accepted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Technical row creation timestamp (may equal accepted_at).
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Deduplication index ───────────────────────────────────────────────────────
-- Prevents duplicate consent events for the same user, same versions, same context.
-- A re-consent for a NEW version (e.g. terms 1.1) will not conflict.
-- A re-consent in a DIFFERENT context (e.g. 'legal_update') will not conflict.

CREATE UNIQUE INDEX IF NOT EXISTS legal_consents_dedup_idx
  ON legal_consents (user_id, terms_version, privacy_version, acceptance_context);

-- ── Audit read index ──────────────────────────────────────────────────────────
-- Efficient lookup of consent history for a user, most recent first.

CREATE INDEX IF NOT EXISTS legal_consents_user_accepted_idx
  ON legal_consents (user_id, accepted_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE legal_consents ENABLE ROW LEVEL SECURITY;

-- CONS-A: User can read their own consent history.
CREATE POLICY "legal_consents_owner_select"
  ON legal_consents
  FOR SELECT
  USING (user_id = auth.uid());

-- CONS-B: Founder/super_admin/admin can read all consent records.
-- Uses the correct join: u.user_id = auth.uid() (NOT u.id).
CREATE POLICY "legal_consents_admin_select"
  ON legal_consents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
        AND  (u.role IN ('founder', 'super_admin', 'admin') OR u.is_admin = true)
    )
  );

-- CONS-C: No INSERT for authenticated role.
--   All writes come from the server via service_role (which bypasses RLS).
--   This prevents any client from inserting fabricated consent records.
-- (No INSERT policy = authenticated users cannot insert)

-- CONS-E: No UPDATE for any role (append-only invariant).
-- (No UPDATE policy = no one can mutate a consent record)

-- CONS-F: No DELETE for any role (cascade via auth.users handles account deletion).
-- (No DELETE policy = no direct deletion; account delete cascades automatically)

-- CONS-G: service_role bypass is expected and intentional.
--   The beta-signup API route uses service_role to write consent events.

-- ── Grants ────────────────────────────────────────────────────────────────────
-- SELECT only for authenticated (own records filtered by RLS above).
-- INSERT/UPDATE/DELETE intentionally omitted — server via service_role only.

GRANT SELECT ON legal_consents TO authenticated;

-- ── Verification queries (run manually after applying) ────────────────────────
-- SELECT COUNT(*) FROM legal_consents; -- should be 0 (no fabricated backfill)
--
-- SELECT user_id, terms_version, privacy_version, acceptance_context, accepted_at
-- FROM legal_consents
-- ORDER BY accepted_at DESC
-- LIMIT 10;
--
-- Test RLS (as authenticated user):
-- SELECT * FROM legal_consents; -- should see only own rows
-- INSERT INTO legal_consents (user_id, terms_version, privacy_version)
--   VALUES (auth.uid(), '1.0', '1.0'); -- should be denied (no INSERT policy)
