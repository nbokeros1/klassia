-- ─── MIGRATION 047 — Beta Operations V7.8B ────────────────────────────────────
-- STATUS: SUPERSEDED — DO NOT APPLY
-- Superseded by: 047_beta_operations_V78B_FINAL_PROPOSED.sql
-- Reason: INSERT forgery vulnerability (WITH CHECK(true) on authenticated INSERT),
--         missing REVOKE, no schema qualification, no idempotent DROP POLICY IF EXISTS,
--         incorrect utilisateurs drift documentation, missing DB-level bounds.
-- Author: Eddy Nwaha
-- Date: 2026-08-24
--
-- Covers:
--   1. beta_events table (product event tracking)
--   2. utilisateurs schema drift fix (est_actif, derniere_connexion)
--   3. Founder-read policy on activity_events
--   4. beta_feedback type constraint update (add blocked, confused, positive)
-- ──────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. beta_events — product analytics event store ────────────────────────────

CREATE TABLE IF NOT EXISTS beta_events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id UUID        REFERENCES utilisateurs(id) ON DELETE SET NULL,
  event_type     TEXT        NOT NULL,
  feature        TEXT        NOT NULL,
  metadata       JSONB       NOT NULL DEFAULT '{}',
  session_id     TEXT,
  page_url       TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT beta_events_event_type_check CHECK (event_type IN (
    'dashboard_entered',
    'build_year_started',
    'build_year_completed',
    'class_created',
    'ai_generation_started',
    'ai_generation_completed',
    'mon_annee_opened',
    'prepare_opened',
    'return_visit',
    'feedback_submitted',
    'onboarding_step_completed',
    'onboarding_completed'
  )),

  CONSTRAINT beta_events_feature_check CHECK (feature IN (
    'dashboard',
    'build_year',
    'classes',
    'ai_studio',
    'mon_annee',
    'prepare',
    'onboarding',
    'feedback'
  ))
);

-- Indexes for Command Center queries
CREATE INDEX IF NOT EXISTS beta_events_utilisateur_idx
  ON beta_events (utilisateur_id, created_at DESC);

CREATE INDEX IF NOT EXISTS beta_events_type_idx
  ON beta_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS beta_events_feature_idx
  ON beta_events (feature, created_at DESC);

-- RLS: service_role reads everything; any authenticated user can INSERT via API
ALTER TABLE beta_events ENABLE ROW LEVEL SECURITY;

-- INSERT: authenticated users can only insert their own events (via API route that uses service_role anyway)
CREATE POLICY "beta_events_insert_auth"
  ON beta_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- SELECT: admin/founder read only
CREATE POLICY "beta_events_select_admin"
  ON beta_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.user_id = auth.uid()
        AND (
          u.role IN ('founder', 'super_admin', 'admin')
          OR u.is_admin = true
        )
    )
  );

GRANT SELECT, INSERT ON beta_events TO authenticated;


-- ── 2. utilisateurs schema drift fix ──────────────────────────────────────────
-- est_actif and derniere_connexion exist in production but were never added
-- to migration files. This formalizes them.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'utilisateurs' AND column_name = 'est_actif'
  ) THEN
    ALTER TABLE utilisateurs ADD COLUMN est_actif BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'utilisateurs' AND column_name = 'derniere_connexion'
  ) THEN
    ALTER TABLE utilisateurs ADD COLUMN derniere_connexion TIMESTAMPTZ;
  END IF;
END $$;


-- ── 3. Founder-read policy on activity_events ─────────────────────────────────
-- Previously teacher-scoped only; founders need cross-user read for analytics.

CREATE POLICY "activity_events_founder_read"
  ON activity_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.user_id = auth.uid()
        AND (
          u.role IN ('founder', 'super_admin', 'admin')
          OR u.is_admin = true
        )
    )
  );


-- ── 4. beta_feedback type constraint update ───────────────────────────────────
-- Add 'blocked', 'confused', 'positive' to support the beta taxonomy.

ALTER TABLE beta_feedback
  DROP CONSTRAINT IF EXISTS beta_feedback_type_check;

ALTER TABLE beta_feedback
  ADD CONSTRAINT beta_feedback_type_check
  CHECK (type IN ('bug', 'idea', 'remark', 'rating', 'blocked', 'confused', 'positive'));


COMMIT;

-- ─── END OF MIGRATION 047 ──────────────────────────────────────────────────────
