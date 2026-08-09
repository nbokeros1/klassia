-- ============================================================
-- Migration 037 — Teaching Pack Versions + métadonnées pack
-- SPIE-BETA-02 : Versionnement, traçabilité, bibliothèque
-- ============================================================

-- 1. Table pack_versions — historique des modifications
-- Chaque modification d'un document du Teaching Pack crée une version.

CREATE TABLE IF NOT EXISTS pack_versions (
  id               UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  teaching_pack_id UUID         NOT NULL REFERENCES teaching_packs(id) ON DELETE CASCADE,
  document_type    TEXT         NOT NULL
                     CHECK (document_type IN ('syllabus','plan_annuel','sequence','plan_lecon','activite','quiz','evaluation')),
  document_id      UUID,                      -- ID du fichier concerné (nullable pour syllabus/plan_annuel)
  version_numero   INTEGER      NOT NULL DEFAULT 1,
  label            TEXT,                      -- ex. 'avant refonte séquence 2'
  contenu_json     JSONB        NOT NULL,
  modifie_par      TEXT         NOT NULL DEFAULT 'ia'
                     CHECK (modifie_par IN ('ia', 'utilisateur')),
  notes            TEXT,
  enseignant_id    UUID         NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pack_versions_pack      ON pack_versions (teaching_pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_versions_doc_type  ON pack_versions (teaching_pack_id, document_type);
CREATE INDEX IF NOT EXISTS idx_pack_versions_enseignant ON pack_versions (enseignant_id);

ALTER TABLE pack_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pack_versions_own"   ON pack_versions;
DROP POLICY IF EXISTS "pack_versions_admin" ON pack_versions;

CREATE POLICY "pack_versions_own" ON pack_versions
  FOR ALL USING (
    enseignant_id = (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "pack_versions_admin" ON pack_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM utilisateurs WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- 2. Extension teaching_packs — métadonnées Alberta + traçabilité source
-- Ajout des colonnes manquantes identifiées dans l'audit SPIE-BETA-02

ALTER TABLE teaching_packs
  ADD COLUMN IF NOT EXISTS pack_template_id  TEXT,            -- ex. 'scorgia-alberta-v1-beta'
  ADD COLUMN IF NOT EXISTS source_meta_json  JSONB,           -- SourceTraceabilite[]
  ADD COLUMN IF NOT EXISTS qualite_json      JSONB,           -- QualityGateResultat (dernier rapport)
  ADD COLUMN IF NOT EXISTS version_numero    INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS derniere_modif_par TEXT            -- 'ia' | 'utilisateur'
                             CHECK (derniere_modif_par IN ('ia', 'utilisateur', NULL));

-- 3. Extension fichiers_dossier — lien Teaching Pack + métadonnées export
-- Permet la recherche dans la Bibliothèque par pack

ALTER TABLE fichiers_dossier
  ADD COLUMN IF NOT EXISTS teaching_pack_id  UUID REFERENCES teaching_packs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sequence_index    INTEGER,          -- 0-based, séquence d'appartenance
  ADD COLUMN IF NOT EXISTS lecon_index       INTEGER,          -- 0-based, leçon dans la séquence
  ADD COLUMN IF NOT EXISTS modifie_par_user  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS version_numero    INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS source_meta_json  JSONB;            -- SourceTraceabilite

CREATE INDEX IF NOT EXISTS idx_fichiers_dossier_teaching_pack
  ON fichiers_dossier (teaching_pack_id)
  WHERE teaching_pack_id IS NOT NULL;

-- 4. Extension programme_annuel — dernière modification
ALTER TABLE programme_annuel
  ADD COLUMN IF NOT EXISTS modifie_par       TEXT CHECK (modifie_par IN ('ia', 'utilisateur', NULL)),
  ADD COLUMN IF NOT EXISTS version_numero    INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS qualite_json      JSONB;

-- 5. Index de recherche Bibliothèque

CREATE INDEX IF NOT EXISTS idx_fichiers_teaching_pack_type
  ON fichiers_dossier (teaching_pack_id, type_fichier)
  WHERE teaching_pack_id IS NOT NULL;
