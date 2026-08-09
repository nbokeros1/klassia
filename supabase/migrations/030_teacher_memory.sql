-- ── Migration 030 — teacher_memory (SC-02H) ───────────────────────────────────
-- Mémoire pédagogique persistante de l'enseignant.
-- Stocke des faits structurés appris session après session pour personnaliser
-- la génération de contenu sans intervention explicite de l'enseignant.

CREATE TABLE IF NOT EXISTS teacher_memory (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id        UUID        NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  classe_id            UUID        REFERENCES classes(id) ON DELETE SET NULL,
  matiere              TEXT,
  niveau               TEXT,
  type_memoire         TEXT        NOT NULL CHECK (type_memoire IN (
    'preference', 'methode', 'progression', 'ressource',
    'contrainte', 'style', 'observation'
  )),
  cle                  TEXT        NOT NULL,
  valeur               JSONB       NOT NULL DEFAULT '{}',
  confiance            SMALLINT    NOT NULL DEFAULT 1 CHECK (confiance >= 1 AND confiance <= 5),
  source               TEXT        NOT NULL CHECK (source IN (
    'generation', 'modification', 'feedback', 'explicite'
  )),
  compte_observations  INTEGER     NOT NULL DEFAULT 1,
  actif                BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (enseignant_id, classe_id, matiere, type_memoire, cle)
);

-- ── Index ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_teacher_memory_enseignant_actif
  ON teacher_memory (enseignant_id, actif);

CREATE INDEX IF NOT EXISTS idx_teacher_memory_enseignant_classe_matiere
  ON teacher_memory (enseignant_id, classe_id, matiere);

-- ── Trigger updated_at ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_teacher_memory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_teacher_memory ON teacher_memory;
CREATE TRIGGER trg_update_teacher_memory
  BEFORE UPDATE ON teacher_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_memory_timestamp();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE teacher_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_memory_own" ON teacher_memory
  USING (
    enseignant_id = (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  );

-- ── Grants ────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON teacher_memory TO authenticated;
