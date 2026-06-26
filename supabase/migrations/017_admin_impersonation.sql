-- KlassIA+ — Migration 017 : Rôles admin + Impersonation sécurisée
-- À exécuter BLOC PAR BLOC dans Supabase Dashboard > SQL Editor
-- (un bloc = une exécution séparée pour faciliter le debug)

-- ══ DIAGNOSTIC (à exécuter en premier) ══════════════════════════════════════
-- SELECT table_schema, table_name
-- FROM information_schema.tables
-- WHERE table_name IN ('utilisateurs', 'lecons')
-- ORDER BY table_schema, table_name;
-- ════════════════════════════════════════════════════════════════════════════

-- ── BLOC A — Colonne role_admin + promotion super_admin ───────────────────────

ALTER TABLE public.utilisateurs
  ADD COLUMN IF NOT EXISTS role_admin TEXT
    CHECK (role_admin IN ('super_admin', 'support', 'developpeur') OR role_admin IS NULL);

UPDATE public.utilisateurs
  SET is_admin = true, role_admin = 'super_admin'
  WHERE email = 'enwaha22@gmail.com';

-- ── BLOC B — Table sessions_impersonation (sans FK — intégrité via appli+RLS) ─

CREATE TABLE IF NOT EXISTS public.sessions_impersonation (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID        NOT NULL,      -- référence utilisateurs.id (admin)
  enseignant_id   UUID        NOT NULL,      -- référence utilisateurs.id (cible)
  debut_session   TIMESTAMPTZ NOT NULL DEFAULT now(),
  fin_session     TIMESTAMPTZ,
  raison          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── BLOC C — RLS sur sessions_impersonation ───────────────────────────────────

ALTER TABLE public.sessions_impersonation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_only_select_impersonation"
  ON public.sessions_impersonation FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.utilisateurs u
      WHERE u.user_id = auth.uid() AND u.is_admin = true
    )
  );

CREATE POLICY "admins_only_insert_impersonation"
  ON public.sessions_impersonation FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.utilisateurs u
      WHERE u.user_id = auth.uid() AND u.is_admin = true
    )
  );

CREATE POLICY "admins_only_update_impersonation"
  ON public.sessions_impersonation FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.utilisateurs u
      WHERE u.user_id = auth.uid() AND u.is_admin = true
    )
  );

-- ── BLOC D — Traçabilité impersonation sur lecons ─────────────────────────────

ALTER TABLE public.lecons
  ADD COLUMN IF NOT EXISTS cree_via_impersonation_par UUID;
  -- référence soft vers utilisateurs.id (admin qui a créé pendant impersonation)
