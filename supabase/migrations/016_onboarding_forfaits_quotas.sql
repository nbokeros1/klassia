-- Migration 016: Champs onboarding, quotas forfaits, hors_quota
-- Règle : Créer d'abord, migrer ensuite — aucune donnée perdue.

BEGIN;

-- ── Utilisateurs : nouveaux champs ───────────────────────────────────────────
ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS palier_scolaire              TEXT
    CHECK (palier_scolaire IN ('primaire', 'secondaire')),
  ADD COLUMN IF NOT EXISTS pays                         TEXT,
  ADD COLUMN IF NOT EXISTS generations_ia_total_a_vie   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS generations_ia_mois_courant  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS derniere_reinit_quota         TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS onboarding_cascade_complete   BOOLEAN NOT NULL DEFAULT false;

-- ── Leçons : marqueur hors quota ─────────────────────────────────────────────
ALTER TABLE lecons
  ADD COLUMN IF NOT EXISTS hors_quota BOOLEAN NOT NULL DEFAULT false;

-- ── Événements calendrier : marqueur hors quota ───────────────────────────────
ALTER TABLE evenements_calendrier
  ADD COLUMN IF NOT EXISTS hors_quota BOOLEAN NOT NULL DEFAULT false;

COMMIT;
