-- ─── MIGRATION 048 — Beta Feedback Inbox: Internal Notes + Founder Responses ──
-- STATUS: PROPOSED — DO NOT APPLY without PO approval (V7.8C)
-- Author: Eddy Nwaha
-- Date: 2026-08-28
-- Prerequisite: migration 031 (beta_feedback table), migration 047 (type constraint)
--
-- Adds:
--   1. beta_feedback_notes     — founder-only internal notes (never visible to teachers)
--   2. beta_feedback_responses — founder responses (stored; delivery channel TBD)
--
-- Security model:
--   - Both tables: writes via service_role only (createAdminClient in API routes)
--   - SELECT: founder / super_admin / admin / is_admin=true only
--   - Teachers: denied SELECT, INSERT, UPDATE, DELETE on both tables
--   - No teacher-facing RLS policy is created on either table
--
-- No change to beta_feedback.statut constraint.
-- Existing statut values: nouveau | en_traitement | resolu | ferme
-- UI maps: nouveau→"Nouveau", en_traitement→"En cours", resolu→"Résolu", ferme→"Ignoré"
-- ──────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Founder internal notes ─────────────────────────────────────────────────
-- Never exposed to teachers. Founder-only workflow tool.
CREATE TABLE IF NOT EXISTS public.beta_feedback_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID        NOT NULL REFERENCES public.beta_feedback(id) ON DELETE CASCADE,
  auteur_id   UUID        NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  contenu     TEXT        NOT NULL CHECK (LENGTH(contenu) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS beta_feedback_notes_feedback_idx
  ON public.beta_feedback_notes (feedback_id, created_at);

ALTER TABLE public.beta_feedback_notes ENABLE ROW LEVEL SECURITY;

-- Deny all direct client access; all writes go through service_role API routes
REVOKE ALL PRIVILEGES ON TABLE public.beta_feedback_notes FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.beta_feedback_notes FROM authenticated;

-- SELECT: founder / super_admin / admin / is_admin only
CREATE POLICY "feedback_notes_founder_select"
  ON public.beta_feedback_notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.utilisateurs u
      WHERE u.user_id = auth.uid()
        AND (u.role IN ('founder', 'super_admin', 'admin') OR u.is_admin = true)
    )
  );

GRANT SELECT ON TABLE public.beta_feedback_notes TO authenticated;


-- ── 2. Founder responses ──────────────────────────────────────────────────────
-- Stored when written by Founder. No delivery channel to teachers yet.
-- delivered=false until a future delivery mechanism is implemented.
CREATE TABLE IF NOT EXISTS public.beta_feedback_responses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID        NOT NULL REFERENCES public.beta_feedback(id) ON DELETE CASCADE,
  auteur_id   UUID        NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  contenu     TEXT        NOT NULL CHECK (LENGTH(contenu) BETWEEN 1 AND 3000),
  delivered   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS beta_feedback_responses_feedback_idx
  ON public.beta_feedback_responses (feedback_id, created_at);

ALTER TABLE public.beta_feedback_responses ENABLE ROW LEVEL SECURITY;

-- Deny all direct client access; all writes go through service_role API routes
REVOKE ALL PRIVILEGES ON TABLE public.beta_feedback_responses FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.beta_feedback_responses FROM authenticated;

-- SELECT: founder / super_admin / admin / is_admin only
-- Teachers never see this table. No teacher-facing SELECT policy.
CREATE POLICY "feedback_responses_founder_select"
  ON public.beta_feedback_responses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.utilisateurs u
      WHERE u.user_id = auth.uid()
        AND (u.role IN ('founder', 'super_admin', 'admin') OR u.is_admin = true)
    )
  );

GRANT SELECT ON TABLE public.beta_feedback_responses TO authenticated;

COMMIT;


-- ─── RLS TEST MATRIX ──────────────────────────────────────────────────────────
-- NB-A  anon        SELECT beta_feedback_notes             → DENY
-- NB-B  teacher     SELECT beta_feedback_notes             → DENY  (policy check fails)
-- NB-C  teacher     INSERT beta_feedback_notes             → DENY  (REVOKE ALL)
-- NB-D  founder     SELECT beta_feedback_notes             → ALLOW
-- NB-E  service_role INSERT beta_feedback_notes            → ALLOW (bypasses RLS)
-- RB-A  anon        SELECT beta_feedback_responses         → DENY
-- RB-B  teacher     SELECT beta_feedback_responses         → DENY  (policy check fails)
-- RB-C  teacher     INSERT beta_feedback_responses         → DENY  (REVOKE ALL)
-- RB-D  founder     SELECT beta_feedback_responses         → ALLOW
-- RB-E  service_role INSERT beta_feedback_responses        → ALLOW (bypasses RLS)

-- ─── POST-APPLY VERIFICATION ──────────────────────────────────────────────────
-- 1. Tables exist:
--    SELECT table_name FROM information_schema.tables
--      WHERE table_schema='public' AND table_name IN ('beta_feedback_notes','beta_feedback_responses');
--    Expected: 2 rows

-- 2. RLS enabled on both:
--    SELECT relname, relrowsecurity FROM pg_class
--      WHERE relname IN ('beta_feedback_notes','beta_feedback_responses');
--    Expected: relrowsecurity=true for both

-- 3. Policies:
--    SELECT tablename, policyname, cmd FROM pg_policies
--      WHERE tablename IN ('beta_feedback_notes','beta_feedback_responses');
--    Expected: 2 rows — one SELECT policy per table

-- 4. No authenticated INSERT privilege:
--    SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
--      WHERE table_name IN ('beta_feedback_notes','beta_feedback_responses')
--      AND grantee='authenticated';
--    Expected: SELECT only (no INSERT, UPDATE, DELETE)

-- ─── END OF MIGRATION 048 PROPOSED ───────────────────────────────────────────
