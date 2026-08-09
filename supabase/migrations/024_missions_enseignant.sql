-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 024 — missions_enseignant
-- Persistance légère de l'état utilisateur sur les missions générées
-- par le Mission Engine (ME-05).
--
-- Principe : la base ne stocke PAS le contenu de la mission.
-- Elle stocke uniquement l'état utilisateur (statut, horodatages)
-- et un snapshot minimal pour les missions "orphelines" (accepted /
-- in_progress dont le détecteur ne génère plus).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Table principale ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS missions_enseignant (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  enseignant_id     UUID        NOT NULL
    REFERENCES utilisateurs(id) ON DELETE CASCADE,

  mission_key       TEXT        NOT NULL,

  type              TEXT        NOT NULL,

  classe_id         UUID        NULL
    REFERENCES classes(id) ON DELETE CASCADE,

  matiere           TEXT        NULL,

  statut            TEXT        NOT NULL DEFAULT 'proposed',

  priority_snapshot INTEGER     NULL,

  title_snapshot    TEXT        NULL,

  metadata          JSONB       NOT NULL DEFAULT '{}'::jsonb,

  accepted_at       TIMESTAMPTZ NULL,
  started_at        TIMESTAMPTZ NULL,
  completed_at      TIMESTAMPTZ NULL,
  dismissed_at      TIMESTAMPTZ NULL,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Contrainte d'unicité : une seule ligne par enseignant × mission_key
  CONSTRAINT uq_missions_enseignant_key
    UNIQUE (enseignant_id, mission_key),

  -- Statuts autorisés
  CONSTRAINT chk_missions_statut
    CHECK (statut IN (
      'proposed',
      'accepted',
      'in_progress',
      'completed',
      'dismissed'
    )),

  -- Priorité dans l'intervalle valide
  CONSTRAINT chk_missions_priority
    CHECK (
      priority_snapshot IS NULL
      OR priority_snapshot BETWEEN 0 AND 100
    )
);

-- ── 2. Index ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_missions_enseignant_ens
  ON missions_enseignant (enseignant_id);

CREATE INDEX IF NOT EXISTS idx_missions_enseignant_ens_statut
  ON missions_enseignant (enseignant_id, statut);

CREATE INDEX IF NOT EXISTS idx_missions_enseignant_ens_classe
  ON missions_enseignant (enseignant_id, classe_id);

CREATE INDEX IF NOT EXISTS idx_missions_enseignant_updated
  ON missions_enseignant (updated_at);

-- ── 3. Trigger updated_at ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_missions_enseignant_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_missions_enseignant_updated_at
  ON missions_enseignant;

CREATE TRIGGER trg_missions_enseignant_updated_at
  BEFORE UPDATE ON missions_enseignant
  FOR EACH ROW
  EXECUTE FUNCTION update_missions_enseignant_updated_at();

-- ── 4. Row Level Security ──────────────────────────────────────────────────

ALTER TABLE missions_enseignant ENABLE ROW LEVEL SECURITY;

-- Lecture : uniquement ses propres missions
DROP POLICY IF EXISTS "missions_select_own" ON missions_enseignant;
CREATE POLICY "missions_select_own"
  ON missions_enseignant FOR SELECT
  USING (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

-- Insertion : uniquement pour son propre profil
DROP POLICY IF EXISTS "missions_insert_own" ON missions_enseignant;
CREATE POLICY "missions_insert_own"
  ON missions_enseignant FOR INSERT
  WITH CHECK (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

-- Mise à jour : uniquement ses propres missions
DROP POLICY IF EXISTS "missions_update_own" ON missions_enseignant;
CREATE POLICY "missions_update_own"
  ON missions_enseignant FOR UPDATE
  USING (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

-- DELETE : non autorisé depuis le client (aucune politique DELETE)

GRANT SELECT, INSERT, UPDATE ON missions_enseignant TO authenticated;
