-- ============================================================
-- Migration 036 — Teaching Packs + Programme annuel étendu
-- SPIE-BETA-01 : Parcours "Construire mon année scolaire"
-- ============================================================

-- 1. Table teaching_packs
-- Un pack = tout le matériel pédagogique d'une classe pour une année

CREATE TABLE IF NOT EXISTS teaching_packs (
  id                   UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  enseignant_id        UUID         NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  classe_id            UUID         NOT NULL REFERENCES classes(id)      ON DELETE CASCADE,
  nom                  TEXT         NOT NULL,
  statut               TEXT         NOT NULL DEFAULT 'configuration'
                         CHECK (statut IN (
                           'configuration',
                           'curriculum_en_analyse',
                           'pret_a_planifier',
                           'generation_en_cours',
                           'partiellement_genere',
                           'pret',
                           'erreur',
                           'archive'
                         )),
  province             TEXT,
  pays                 TEXT         DEFAULT 'Canada',
  juridiction          TEXT,
  langue               TEXT         DEFAULT 'fr',
  annee_scolaire       TEXT,
  curriculum_source    TEXT         CHECK (curriculum_source IN ('televerse', 'officiel')),
  curriculum_officiel  TEXT,
  curriculum_contenu   TEXT,         -- texte extrait du curriculum téléversé
  programme_annuel_id  UUID,         -- FK ajouté après création (voir fin du fichier)
  calendrier_json      JSONB        DEFAULT '{}',
  gabarits_json        JSONB        DEFAULT '{}',
  contenu_json         JSONB        DEFAULT '{}',
  error_message        TEXT,
  created_at           TIMESTAMPTZ  DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (classe_id)                -- un seul pack actif par classe
);

-- 2. Extension de programme_annuel
-- Ajout des colonnes SPIE manquantes

ALTER TABLE programme_annuel
  ADD COLUMN IF NOT EXISTS teaching_pack_id  UUID  REFERENCES teaching_packs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS calendrier_json   JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS syllabus_json     JSONB DEFAULT '{}';

-- 3. FK différée teaching_packs → programme_annuel (après extension)
-- Note : ADD CONSTRAINT IF NOT EXISTS n'existe pas en PostgreSQL — bloc DO idempotent obligatoire.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE  conname    = 'fk_teaching_packs_programme_annuel'
      AND  conrelid   = 'teaching_packs'::regclass
  ) THEN
    ALTER TABLE teaching_packs
      ADD CONSTRAINT fk_teaching_packs_programme_annuel
      FOREIGN KEY (programme_annuel_id) REFERENCES programme_annuel(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Index pour performance

CREATE INDEX IF NOT EXISTS idx_teaching_packs_enseignant  ON teaching_packs (enseignant_id);
CREATE INDEX IF NOT EXISTS idx_teaching_packs_classe      ON teaching_packs (classe_id);
CREATE INDEX IF NOT EXISTS idx_prog_annuel_teaching_pack  ON programme_annuel (teaching_pack_id);

-- 5. RLS

ALTER TABLE teaching_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teaching_packs_own"   ON teaching_packs;
DROP POLICY IF EXISTS "teaching_packs_admin" ON teaching_packs;

CREATE POLICY "teaching_packs_own" ON teaching_packs
  FOR ALL USING (
    enseignant_id = (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "teaching_packs_admin" ON teaching_packs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM utilisateurs
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- 6. Trigger updated_at

CREATE OR REPLACE FUNCTION update_teaching_pack_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_teaching_packs_updated_at ON teaching_packs;

CREATE TRIGGER trg_teaching_packs_updated_at
  BEFORE UPDATE ON teaching_packs
  FOR EACH ROW EXECUTE FUNCTION update_teaching_pack_updated_at();
