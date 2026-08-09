-- ════════════════════════════════════════════════════════════════════════════
-- SC-03N-RLS — Script de vérification des policies Founder / Admin / Beta
-- Lecture seule — ne modifie aucune donnée.
-- À exécuter dans Supabase Dashboard > SQL Editor après la migration 035.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Policies actives sur les tables concernées ────────────────────────────
SELECT
  tablename   AS table_name,
  policyname  AS policy_name,
  cmd         AS commande,
  permissive  AS permissif,
  CASE
    WHEN qual      IS NOT NULL THEN substring(qual::text, 1, 120)
    ELSE '—'
  END AS using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN substring(with_check::text, 1, 120)
    ELSE '—'
  END AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'audit_trail',
    'beta_invitations',
    'beta_feedback',
    'beta_logs',
    'founder_products',
    'founder_roadmap',
    'founder_notifications',
    'founder_deployments',
    'company_info'
  )
ORDER BY tablename, policyname;


-- ── 2. RLS activé sur chaque table ──────────────────────────────────────────
SELECT
  relname          AS table_name,
  relrowsecurity   AS rls_active,
  relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname IN (
  'audit_trail',
  'beta_invitations',
  'beta_feedback',
  'beta_logs',
  'founder_products',
  'founder_roadmap',
  'founder_notifications',
  'founder_deployments',
  'company_info'
)
ORDER BY relname;


-- ── 3. Absence de policies incorrectes (u.id = auth.uid()) ──────────────────
-- Si cette requête retourne des lignes, il reste des policies incorrectes.
SELECT
  tablename,
  policyname,
  'ALERTE : u.id = auth.uid() détecté' AS statut
FROM pg_policies
WHERE schemaname = 'public'
  AND (
       qual::text       ILIKE '%u.id = auth.uid()%'
    OR with_check::text ILIKE '%u.id = auth.uid()%'
    OR qual::text       ILIKE '%utilisateurs.id = auth.uid()%'
    OR with_check::text ILIKE '%utilisateurs.id = auth.uid()%'
  );


-- ── 4. Colonnes clés de la table utilisateurs ───────────────────────────────
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'utilisateurs'
  AND column_name  IN ('id', 'user_id', 'email', 'role', 'is_admin', 'created_at')
ORDER BY ordinal_position;


-- ── 5. Rôles présents dans la table utilisateurs ────────────────────────────
SELECT
  role,
  COUNT(*) AS nb_utilisateurs
FROM utilisateurs
GROUP BY role
ORDER BY nb_utilisateurs DESC;


-- ── 6. Test : le compte founder est bien configuré ───────────────────────────
SELECT
  id,
  user_id,
  email,
  role,
  is_admin,
  created_at
FROM utilisateurs
WHERE email = 'enwaha22@gmail.com';


-- ── 7. Cohérence WITH CHECK sur les policies FOR ALL et FOR UPDATE ───────────
-- Toute policy couvrant INSERT ou UPDATE doit avoir un WITH CHECK.
SELECT
  tablename,
  policyname,
  cmd,
  CASE
    WHEN with_check IS NULL AND cmd IN ('ALL', 'INSERT', 'UPDATE')
    THEN 'MANQUANT'
    ELSE 'OK'
  END AS with_check_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'audit_trail','beta_invitations','beta_feedback','beta_logs',
    'founder_products','founder_roadmap','founder_notifications',
    'founder_deployments','company_info'
  )
ORDER BY tablename, cmd;
