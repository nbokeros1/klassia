-- ════════════════════════════════════════════════════════════════════════════
-- SC-03N-RLS — Correction complète des policies Founder / Admin / Beta
-- Migration 035 — Étend et finalise la correction partielle de 034
--
-- Rappel schema utilisateurs :
--   id      = UUID interne de la ligne (clé primaire auto-générée)
--   user_id = auth.users.id = auth.uid()   ← à utiliser dans les policies
--
-- Règle universelle dans ce fichier :
--   EXISTS (SELECT 1 FROM utilisateurs u WHERE u.user_id = auth.uid() AND …)
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 1. AUDIT_TRAIL
-- Lecture : founder, super_admin, admin
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "founder_read_audit" ON audit_trail;

CREATE POLICY "founder_read_audit" ON audit_trail
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
        AND  (u.role IN ('founder', 'super_admin', 'admin') OR u.is_admin = true)
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 2. BETA_INVITATIONS
-- Gestion (ALL) : founder, super_admin, admin, beta_manager
-- WITH CHECK obligatoire pour couvrir INSERT et UPDATE
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "founder_manage_invitations" ON beta_invitations;

CREATE POLICY "founder_manage_invitations" ON beta_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
        AND  (u.role IN ('founder', 'super_admin', 'admin', 'beta_manager') OR u.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
        AND  (u.role IN ('founder', 'super_admin', 'admin', 'beta_manager') OR u.is_admin = true)
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 3. BETA_FEEDBACK
-- Lecture  : founder, super_admin, admin, beta_manager
-- Update   : founder, super_admin, admin, beta_manager  (WITH CHECK)
-- Insert   : tout utilisateur authentifié (le service_role bypasse RLS de toute façon)
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_read_feedback"   ON beta_feedback;
DROP POLICY IF EXISTS "admin_update_feedback" ON beta_feedback;
DROP POLICY IF EXISTS "user_insert_feedback"  ON beta_feedback;

CREATE POLICY "admin_read_feedback" ON beta_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
        AND  (u.role IN ('founder', 'super_admin', 'admin', 'beta_manager') OR u.is_admin = true)
    )
  );

CREATE POLICY "admin_update_feedback" ON beta_feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
        AND  (u.role IN ('founder', 'super_admin', 'admin', 'beta_manager') OR u.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
        AND  (u.role IN ('founder', 'super_admin', 'admin', 'beta_manager') OR u.is_admin = true)
    )
  );

CREATE POLICY "user_insert_feedback" ON beta_feedback
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. BETA_LOGS
-- Lecture : founder, super_admin, admin UNIQUEMENT (pas beta_manager)
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_read_logs" ON beta_logs;

CREATE POLICY "admin_read_logs" ON beta_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
        AND  (u.role IN ('founder', 'super_admin', 'admin') OR u.is_admin = true)
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 5. BUSINESS CENTER — WITH CHECK sur toutes les policies FOR ALL
-- Les policies de 033 utilisaient déjà u.user_id correctement,
-- mais sans WITH CHECK (PostgreSQL utilise USING implicitement,
-- on le rend explicite pour la conformité et la lisibilité).
-- ────────────────────────────────────────────────────────────────────────────

-- 5a. founder_products
DROP POLICY IF EXISTS "bc_products_founder" ON founder_products;

CREATE POLICY "bc_products_founder" ON founder_products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
        AND  (u.role IN ('founder', 'super_admin') OR u.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
        AND  (u.role IN ('founder', 'super_admin') OR u.is_admin = true)
    )
  );

-- 5b. founder_roadmap
DROP POLICY IF EXISTS "bc_roadmap_founder" ON founder_roadmap;

CREATE POLICY "bc_roadmap_founder" ON founder_roadmap
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
        AND  (u.role IN ('founder', 'super_admin') OR u.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
        AND  (u.role IN ('founder', 'super_admin') OR u.is_admin = true)
    )
  );

-- 5c. founder_notifications
DROP POLICY IF EXISTS "bc_notif_founder" ON founder_notifications;

CREATE POLICY "bc_notif_founder" ON founder_notifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
        AND  (u.role IN ('founder', 'super_admin', 'admin') OR u.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
        AND  (u.role IN ('founder', 'super_admin', 'admin') OR u.is_admin = true)
    )
  );

-- 5d. founder_deployments
DROP POLICY IF EXISTS "bc_deploy_founder" ON founder_deployments;

CREATE POLICY "bc_deploy_founder" ON founder_deployments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
        AND  (u.role IN ('founder', 'super_admin') OR u.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
        AND  (u.role IN ('founder', 'super_admin') OR u.is_admin = true)
    )
  );

-- 5e. company_info
DROP POLICY IF EXISTS "bc_company_founder" ON company_info;

CREATE POLICY "bc_company_founder" ON company_info
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
        AND  (u.role IN ('founder', 'super_admin') OR u.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.user_id = auth.uid()
        AND  (u.role IN ('founder', 'super_admin') OR u.is_admin = true)
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- VÉRIFICATION FINALE (à exécuter manuellement pour confirmer)
-- SELECT tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'audit_trail','beta_invitations','beta_feedback',
--     'beta_logs','founder_products','founder_roadmap',
--     'founder_notifications','founder_deployments','company_info'
--   )
-- ORDER BY tablename, policyname;
-- ────────────────────────────────────────────────────────────────────────────
