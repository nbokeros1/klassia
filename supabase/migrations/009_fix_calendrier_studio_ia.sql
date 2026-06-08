-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 009 — Fix & replace 008 tables (calendrier + Studio IA)
-- Drops any partial state from failed 008, then recreates cleanly.
-- Uses TEXT for type columns (no ENUM) to match application code.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Clean up partial state from failed 008 ─────────────────────────────────

DROP TABLE IF EXISTS notes_ia              CASCADE;
DROP TABLE IF EXISTS studio_ia_memoire     CASCADE;
DROP TABLE IF EXISTS evenements_calendrier CASCADE;
DROP TABLE IF EXISTS fichiers_dossier      CASCADE;
DROP TABLE IF EXISTS dossiers_systeme      CASCADE;

DROP TYPE IF EXISTS type_dossier_systeme   CASCADE;
DROP TYPE IF EXISTS type_fichier_dossier   CASCADE;
DROP TYPE IF EXISTS statut_fichier_dossier CASCADE;
DROP TYPE IF EXISTS type_evenement_cal     CASCADE;
DROP TYPE IF EXISTS type_memoire_ia        CASCADE;
DROP TYPE IF EXISTS type_note_ia           CASCADE;

DROP FUNCTION IF EXISTS creer_dossiers_classe() CASCADE;
DROP TRIGGER  IF EXISTS trigger_creer_dossiers  ON classes;

-- ── 2. evenements_calendrier ───────────────────────────────────────────────────
-- type values used by app: lecon | evaluation | devoir | reunion_parents |
--                          evenement | rappel | ferie
-- Using TEXT so UI can use any value without ENUM migration.

CREATE TABLE evenements_calendrier (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id UUID        NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  classe_id     UUID        REFERENCES classes(id)   ON DELETE CASCADE,
  titre         TEXT        NOT NULL,
  description   TEXT,
  date_debut    DATE        NOT NULL,
  date_fin      DATE,
  heure_debut   TIME,
  heure_fin     TIME,
  type          TEXT        NOT NULL DEFAULT 'evenement',
  couleur       TEXT        NOT NULL DEFAULT '#60A5FA',
  lecon_id      UUID        REFERENCES lecons(id)    ON DELETE SET NULL,
  note_ia       TEXT,
  rappel        BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. studio_ia_memoire ──────────────────────────────────────────────────────
-- type values used by app: gabarit | style | ressource | lecon_exemple |
--                          instruction | image | lien

CREATE TABLE studio_ia_memoire (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id UUID        NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  classe_id     UUID        REFERENCES classes(id)   ON DELETE CASCADE,
  cle           TEXT        NOT NULL,
  contenu       JSONB       NOT NULL DEFAULT '{}',
  type          TEXT        NOT NULL DEFAULT 'ressource',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. notes_ia ───────────────────────────────────────────────────────────────

CREATE TABLE notes_ia (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id UUID        NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  evenement_id  UUID        REFERENCES evenements_calendrier(id) ON DELETE CASCADE,
  lecon_id      UUID        REFERENCES lecons(id)    ON DELETE SET NULL,
  contenu       TEXT        NOT NULL,
  type          TEXT        NOT NULL DEFAULT 'preparation',
  auto_generee  BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE evenements_calendrier ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_ia_memoire     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes_ia              ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_own_evenements ON evenements_calendrier
  FOR ALL USING (enseignant_id = (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

CREATE POLICY user_own_memoire ON studio_ia_memoire
  FOR ALL USING (enseignant_id = (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

CREATE POLICY user_own_notes_ia ON notes_ia
  FOR ALL USING (enseignant_id = (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

-- ── 6. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX idx_evenements_enseignant_date
  ON evenements_calendrier (enseignant_id, date_debut);

CREATE INDEX idx_memoire_enseignant
  ON studio_ia_memoire (enseignant_id, updated_at DESC);

-- ── 7. Grants ─────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON evenements_calendrier TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON studio_ia_memoire     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notes_ia              TO authenticated;
