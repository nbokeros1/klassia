-- ============================================================
-- MIGRATION 046 — Legal Consent Fields
-- STATUS : SUPERSEDED — DO NOT APPLY
-- Superseded by: 046_legal_consents_V11_FINAL_PROPOSED.sql
-- Reason: Mutable fields on utilisateurs cannot provide an audit trail.
--         See ADR: docs/Architecture/ADR_LEGAL_CONSENT_STORAGE.md
-- Author  : ScorgIA Legal & Trust Layer V1
-- Date    : 2026-08-21
-- ============================================================
-- PURPOSE
--   Add three columns to `utilisateurs` to record the legal
--   version numbers accepted at signup and the timestamp of
--   acceptance.  These columns are required before the consent
--   flow can be stored server-side (Mission 30 / Mission 41).
--
-- PREREQUISITES
--   - Migration 045 must already be applied.
--   - `src/lib/legal/constants.ts` defines the version strings.
--
-- ROLLBACK
--   ALTER TABLE utilisateurs
--     DROP COLUMN IF EXISTS terms_version,
--     DROP COLUMN IF EXISTS privacy_version,
--     DROP COLUMN IF EXISTS legal_accepted_at;
-- ============================================================

-- DO NOT APPLY UNTIL:
--   1. The legal documents (v1.0) have been reviewed by a
--      Canadian legal professional.
--   2. The self-service account-deletion portal is implemented.
--   3. PO gives explicit GO for this migration.

ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS terms_version   TEXT,
  ADD COLUMN IF NOT EXISTS privacy_version TEXT,
  ADD COLUMN IF NOT EXISTS legal_accepted_at TIMESTAMPTZ;

COMMENT ON COLUMN utilisateurs.terms_version
  IS 'Version of Terms of Use accepted at signup (e.g. "1.0"). Null = accepted before this field was added.';

COMMENT ON COLUMN utilisateurs.privacy_version
  IS 'Version of Privacy Policy accepted at signup (e.g. "1.0"). Null = accepted before this field was added.';

COMMENT ON COLUMN utilisateurs.legal_accepted_at
  IS 'UTC timestamp when the user ticked the legal consent checkbox at signup.';
