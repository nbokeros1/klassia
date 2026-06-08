-- ─────────────────────────────────────────────────────────────
-- Migration 008 — Tâches auto-générées + Gabarit personnel
-- BLOC 13 : auto_generee sur taches_enseignant
-- BLOC 14 : gabarit_lecon_url + gabarit_lecon_analyse sur utilisateurs
-- ─────────────────────────────────────────────────────────────

-- BLOC 13 — Colonne auto_generee
ALTER TABLE taches_enseignant
  ADD COLUMN IF NOT EXISTS auto_generee BOOLEAN DEFAULT false;

-- BLOC 14 — Colonnes gabarit dans utilisateurs
ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS gabarit_lecon_url     TEXT,
  ADD COLUMN IF NOT EXISTS gabarit_lecon_analyse TEXT;

-- Index utile pour le dashboard (tâches auto non-complètes)
CREATE INDEX IF NOT EXISTS idx_taches_auto
  ON taches_enseignant (enseignant_id, auto_generee, est_complete);

-- ─────────────────────────────────────────────────────────────
-- Activer l'admin pour enwaha22@gmail.com
-- À exécuter manuellement après avoir vérifié l'UUID de l'user
-- ─────────────────────────────────────────────────────────────
-- UPDATE utilisateurs
--   SET is_admin = true, type_compte = 'admin'
--   WHERE id = (
--     SELECT u.id FROM utilisateurs u
--     JOIN auth.users au ON au.id = u.user_id
--     WHERE au.email = 'enwaha22@gmail.com'
--     LIMIT 1
--   );
