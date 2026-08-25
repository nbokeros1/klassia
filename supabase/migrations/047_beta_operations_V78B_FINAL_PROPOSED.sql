-- ─── MIGRATION 047 — Beta Operations V7.8B FINAL ─────────────────────────────
-- STATUS: PROPOSED — DO NOT APPLY without PO approval and Supabase staging test
-- Supersedes: 047_beta_operations_V78B_PROPOSED.sql (SUPERSEDED — do not apply)
-- Author: Eddy Nwaha
-- Date: 2026-08-24
--
-- Covers:
--   1. public.beta_events table — server-write-only, founder-read RLS
--   2. public.utilisateurs schema formalization (est_actif, derniere_connexion)
--   3. public.activity_events founder-read policy (idempotent)
--   4. public.beta_feedback type constraint update
--
-- Security model for beta_events:
--   - INSERT/UPDATE/DELETE: service_role only (via POST /api/beta/events server route)
--   - SELECT: founder / super_admin / admin / is_admin=true only
--   - authenticated clients: REVOKED from INSERT, UPDATE, DELETE
--   - anon: REVOKED from all
--
-- Feedback taxonomy (all three layers — UI, API, DB — agree):
--   bug | blocked | confused | idea | positive | remark | rating*
--   (* rating: retained for backward compatibility with original schema migration 031;
--      not offered in UI but accepted at API/DB level)
-- ──────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. public.beta_events — product analytics event store ─────────────────────

CREATE TABLE IF NOT EXISTS public.beta_events (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id UUID         REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
  event_type     TEXT         NOT NULL,
  feature        TEXT         NOT NULL,
  -- metadata must be a JSON object (not array/scalar); app-layer sanitizer is primary,
  -- this check is defense-in-depth
  metadata       JSONB        NOT NULL DEFAULT '{}'
                              CHECK (jsonb_typeof(metadata) = 'object'),
  session_id     VARCHAR(128),
  page_url       VARCHAR(500),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

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

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS beta_events_utilisateur_idx
  ON public.beta_events (utilisateur_id, created_at DESC);

CREATE INDEX IF NOT EXISTS beta_events_type_idx
  ON public.beta_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS beta_events_feature_idx
  ON public.beta_events (feature, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.beta_events ENABLE ROW LEVEL SECURITY;

-- Defensive: revoke any direct write access from client roles.
-- All writes go through POST /api/beta/events which uses service_role.
-- service_role bypasses RLS and remains the trusted writer by design.
REVOKE ALL ON public.beta_events FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.beta_events FROM authenticated;

-- Drop any policies from a previous (superseded) migration attempt
DROP POLICY IF EXISTS "beta_events_insert_auth"  ON public.beta_events;
DROP POLICY IF EXISTS "beta_events_select_admin" ON public.beta_events;

-- SELECT: founder / super_admin / admin / is_admin only
-- Regular beta teachers and ordinary teachers: denied
-- Explicitly scoped to authenticated role
CREATE POLICY "beta_events_select_admin"
  ON public.beta_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.utilisateurs u
      WHERE u.user_id = auth.uid()
        AND (
          u.role IN ('founder', 'super_admin', 'admin')
          OR u.is_admin = true
        )
    )
  );

-- Grant only SELECT to authenticated (founders use the SELECT policy above)
GRANT SELECT ON public.beta_events TO authenticated;


-- ── 2. public.utilisateurs schema formalization ───────────────────────────────
-- VERIFIED: est_actif and derniere_connexion DO NOT exist in production as of 2026-08-24.
-- This migration creates them.
--
-- IMPORTANT — derniere_connexion is a compatibility/admin convenience field.
-- It will NOT be written by application code (no trigger, no app writer).
-- Do NOT use derniere_connexion as the canonical beta operational activity signal.
-- Canonical activity: beta_events table + business facts (classes, teaching_packs, generations_ia).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'utilisateurs'
      AND column_name = 'est_actif'
  ) THEN
    ALTER TABLE public.utilisateurs ADD COLUMN est_actif BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'utilisateurs'
      AND column_name = 'derniere_connexion'
  ) THEN
    ALTER TABLE public.utilisateurs ADD COLUMN derniere_connexion TIMESTAMPTZ;
  END IF;
END $$;


-- ── 3. public.activity_events founder-read policy ────────────────────────────
-- activity_events has RLS enabled. Existing teacher policy remains untouched.
-- This adds a separate SELECT-only policy for privileged roles.
-- UPDATE and DELETE grants are NOT added.

DROP POLICY IF EXISTS "activity_events_founder_read" ON public.activity_events;

CREATE POLICY "activity_events_founder_read"
  ON public.activity_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.utilisateurs u
      WHERE u.user_id = auth.uid()
        AND (
          u.role IN ('founder', 'super_admin', 'admin')
          OR u.is_admin = true
        )
    )
  );


-- ── 4. public.beta_feedback type constraint update ────────────────────────────
-- Production table has zero rows (PO confirmed 2026-08-24).
-- No historical-row backward compatibility concern.
--
-- Final approved taxonomy:
--   bug       — technical error report
--   blocked   — teacher cannot proceed (urgent)
--   confused  — unclear UX or flow
--   idea      — feature suggestion
--   positive  — what worked well
--   remark    — general comment
--   rating    — legacy type from migration 031; retained for backward compatibility;
--               not offered in UI but accepted at API/DB level
--
-- All three layers agree:
--   UI  (FeedbackWidget.tsx):  bug | blocked | confused | idea | positive | remark
--   API (/api/beta/feedback):  bug | blocked | confused | idea | positive | remark | rating
--   DB  (this constraint):     bug | blocked | confused | idea | positive | remark | rating

ALTER TABLE public.beta_feedback
  DROP CONSTRAINT IF EXISTS beta_feedback_type_check;

ALTER TABLE public.beta_feedback
  ADD CONSTRAINT beta_feedback_type_check
  CHECK (type IN ('bug', 'idea', 'remark', 'rating', 'blocked', 'confused', 'positive'));


COMMIT;


-- ─── RLS TEST MATRIX ──────────────────────────────────────────────────────────
-- Expected behavior after applying this migration.
-- Run manually via Supabase SQL editor or psql to verify.
--
-- EV-A  anon        SELECT beta_events all rows            → DENY  (no GRANT, no policy for anon)
-- EV-B  anon        INSERT beta_events                     → DENY  (REVOKE ALL + no policy)
-- EV-C  beta user   direct INSERT via PostgREST            → DENY  (REVOKE INSERT from authenticated)
-- EV-D  teacher     direct INSERT via PostgREST            → DENY  (REVOKE INSERT from authenticated)
-- EV-E  beta user   UPDATE beta_events                     → DENY  (REVOKE UPDATE from authenticated)
-- EV-F  beta user   DELETE beta_events                     → DENY  (REVOKE DELETE from authenticated)
-- EV-G  founder     SELECT beta_events                     → ALLOW (SELECT policy + GRANT SELECT)
-- EV-H  teacher     SELECT all events (cross-user)         → DENY  (SELECT policy checks role)
-- EV-I  service_role INSERT (via server route)             → ALLOW (bypasses RLS by design)
-- EV-J  forged utilisateur_id via direct PostgREST INSERT  → DENY  (no INSERT policy, REVOKE applied)


-- ─── POST-APPLY VERIFICATION QUERIES ─────────────────────────────────────────
-- Run these read-only checks after applying to confirm correct state:

-- 1. Table exists:
--    SELECT EXISTS (SELECT 1 FROM information_schema.tables
--      WHERE table_schema='public' AND table_name='beta_events');
--    Expected: true

-- 2. RLS enabled:
--    SELECT relrowsecurity FROM pg_class WHERE relname='beta_events';
--    Expected: true

-- 3. Policies on beta_events:
--    SELECT policyname, cmd, roles FROM pg_policies WHERE tablename='beta_events';
--    Expected: 1 row — beta_events_select_admin | SELECT | {authenticated}

-- 4. Grants on beta_events:
--    SELECT grantee, privilege_type FROM information_schema.role_table_grants
--      WHERE table_name='beta_events' ORDER BY grantee, privilege_type;
--    Expected: authenticated | SELECT only (no INSERT, UPDATE, DELETE)

-- 5. utilisateurs new columns:
--    SELECT column_name, data_type FROM information_schema.columns
--      WHERE table_schema='public' AND table_name='utilisateurs'
--        AND column_name IN ('est_actif','derniere_connexion');
--    Expected: 2 rows

-- 6. beta_feedback constraint:
--    SELECT pg_get_constraintdef(oid) FROM pg_constraint
--      WHERE conname='beta_feedback_type_check';
--    Expected: CHECK includes blocked, confused, positive

-- 7. beta_events row count:
--    SELECT COUNT(*) FROM public.beta_events;
--    Expected: 0

-- 8. No UPDATE/DELETE policy on beta_events:
--    SELECT policyname FROM pg_policies
--      WHERE tablename='beta_events' AND cmd IN ('UPDATE','DELETE','ALL');
--    Expected: 0 rows

-- 9. Indexes present:
--    SELECT indexname FROM pg_indexes WHERE tablename='beta_events';
--    Expected: 3 indexes (utilisateur_idx, type_idx, feature_idx) + primary key

-- ─── END OF MIGRATION 047 FINAL ───────────────────────────────────────────────
