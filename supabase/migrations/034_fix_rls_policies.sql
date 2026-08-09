-- ════════════════════════════════════════════════════════════════════════════
-- SC-03N — Fix RLS policies (migration 032 bug)
-- Les policies 032 utilisaient u.id = auth.uid() au lieu de u.user_id = auth.uid()
-- Dans la table utilisateurs : id = UUID interne, user_id = auth.uid() Supabase
-- ════════════════════════════════════════════════════════════════════════════

-- ── Corriger audit_trail ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "founder_read_audit" ON audit_trail;

CREATE POLICY "founder_read_audit" ON audit_trail
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
      AND    (u.role IN ('founder','super_admin','admin') OR u.is_admin = true)
    )
  );

-- ── Corriger beta_invitations ────────────────────────────────────────────────
DROP POLICY IF EXISTS "founder_manage_invitations" ON beta_invitations;

CREATE POLICY "founder_manage_invitations" ON beta_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
      AND    (u.role IN ('founder','super_admin','admin','beta_manager') OR u.is_admin = true)
    )
  );

-- ── Vérification des policies 031 (beta_feedback, beta_logs) ─────────────────
-- Ces policies utilisaient u.id = auth.uid() également — correction :
DROP POLICY IF EXISTS "admin_read_feedback" ON beta_feedback;
DROP POLICY IF EXISTS "admin_read_logs"     ON beta_logs;

CREATE POLICY "admin_read_feedback" ON beta_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.user_id = auth.uid() AND u.is_admin = true
    )
  );

CREATE POLICY "admin_read_logs" ON beta_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.user_id = auth.uid() AND u.is_admin = true
    )
  );
