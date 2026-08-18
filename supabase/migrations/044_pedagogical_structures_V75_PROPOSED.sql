-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION 044 — PEDAGOGICAL STRUCTURES V7.5                               ║
-- ║  STATUS : PROPOSED — DO NOT EXECUTE WITHOUT PRODUCT OWNER APPROVAL         ║
-- ║  Author  : ScorgIA V7.5 / 2026-08-18                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- This file is architecture documentation only. Applying it requires:
--   1. Product Owner GO decision
--   2. Staged rollout: shadow writes first, then reads
--   3. Data migration from programme_annuel.contenu_json blobs
--   4. RLS policy review by database admin
--
-- Ghost table 'unites' (created in migration 038, never populated) should be
-- reviewed and either populated or dropped before this migration runs.
-- See docs/Architecture/SCORGIA_V7_5_PRE_IMPLEMENTATION_AUDIT.md §5 for context.

-- ─── 1. Canonical pedagogical_sequences ───────────────────────────────────────
-- Replaces the AYDTE SequenceBlock JSON blob with a first-class DB record.
-- Corresponds to the current "unité" concept (= what JSON calls a "séquence").

CREATE TABLE IF NOT EXISTS pedagogical_sequences (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teaching_pack_id     UUID NOT NULL REFERENCES teaching_packs(id) ON DELETE CASCADE,
  programme_annuel_id  UUID REFERENCES programme_annuel(id) ON DELETE SET NULL,
  enseignant_id        UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  classe_id            UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,

  -- Identity
  numero               INTEGER NOT NULL,          -- 1-based ordering (stable sort key)
  titre                TEXT NOT NULL,
  theme                TEXT,
  schema_version       TEXT NOT NULL DEFAULT 'v3', -- 'v3' for all records in this table

  -- Calendar
  semaine_debut        INTEGER NOT NULL,
  semaine_fin          INTEGER NOT NULL,

  -- Curriculum linkage
  curriculum_outcome_ids   TEXT[] DEFAULT '{}',   -- NormalizedOutcome codes
  grandes_idees            TEXT[] DEFAULT '{}',
  objectifs                TEXT[] DEFAULT '{}',
  concepts_cles            TEXT[] DEFAULT '{}',
  justification_pedagogique TEXT,

  -- Evaluation
  activite_culminante  TEXT,
  evaluation_prevue    TEXT,

  -- AYDTE metadata
  aydte_sequence_id    TEXT,                       -- SequenceBlock.id from AYDTE run
  aydte_pacing_score   INTEGER,                    -- 0–100
  aydte_coverage_pct   INTEGER,                    -- 0–100
  duree_estimee_heures NUMERIC(5,1),

  -- Status
  statut               TEXT NOT NULL DEFAULT 'planifiee'
                         CHECK (statut IN ('planifiee', 'en_cours', 'terminee', 'reportee')),

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ped_seq_pack       ON pedagogical_sequences(teaching_pack_id);
CREATE INDEX IF NOT EXISTS idx_ped_seq_classe      ON pedagogical_sequences(classe_id);
CREATE INDEX IF NOT EXISTS idx_ped_seq_programme   ON pedagogical_sequences(programme_annuel_id);
CREATE INDEX IF NOT EXISTS idx_ped_seq_aydte_id    ON pedagogical_sequences(aydte_sequence_id);

-- ─── 2. Canonical pedagogical_lessons ────────────────────────────────────────
-- Replaces LeconProgramme JSON blobs with a first-class DB record.
-- Corresponds to the current "leçon dans un plan annuel" concept.

CREATE TABLE IF NOT EXISTS pedagogical_lessons (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id             UUID NOT NULL REFERENCES pedagogical_sequences(id) ON DELETE CASCADE,
  teaching_pack_id        UUID NOT NULL REFERENCES teaching_packs(id) ON DELETE CASCADE,
  enseignant_id           UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  classe_id               UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,

  -- Links to existing lecons table (detailed lesson plan)
  lecon_id                UUID REFERENCES lecons(id) ON DELETE SET NULL,

  -- Identity
  numero                  INTEGER NOT NULL,
  titre                   TEXT NOT NULL,
  sujet                   TEXT,
  duree_minutes           INTEGER NOT NULL DEFAULT 60,
  type                    TEXT NOT NULL DEFAULT 'developpement'
                            CHECK (type IN ('introduction', 'developpement', 'evaluation', 'synthese')),
  progression_role        TEXT
                            CHECK (progression_role IN (
                              'introduction', 'acquisition', 'pratique',
                              'approfondissement', 'integration', 'evaluation', 'autre'
                            )),

  -- Curriculum linkage
  curriculum_outcome_ids  TEXT[] DEFAULT '{}',
  objectif_apprentissage  TEXT,
  activite_principale     TEXT,
  preuve_apprentissage    TEXT,
  justification           TEXT,

  -- Teaching tracking (from V4 mark-taught flow)
  statut                  TEXT NOT NULL DEFAULT 'planifiee'
                            CHECK (statut IN (
                              'planifiee', 'preparee', 'en_cours', 'enseignee', 'a_revoir'
                            )),
  date_enseignee          DATE,
  note_enseignement       TEXT,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ped_lesson_seq       ON pedagogical_lessons(sequence_id);
CREATE INDEX IF NOT EXISTS idx_ped_lesson_pack      ON pedagogical_lessons(teaching_pack_id);
CREATE INDEX IF NOT EXISTS idx_ped_lesson_classe    ON pedagogical_lessons(classe_id);
CREATE INDEX IF NOT EXISTS idx_ped_lesson_lecon     ON pedagogical_lessons(lecon_id);

-- ─── 3. Nullable FK additions on existing tables ─────────────────────────────
-- teaching_events and fichiers_dossier gain optional FK to canonical lesson.
-- Nullable = backward-compat; existing rows untouched.

ALTER TABLE teaching_events
  ADD COLUMN IF NOT EXISTS pedagogical_lesson_id UUID
    REFERENCES pedagogical_lessons(id) ON DELETE SET NULL;

ALTER TABLE fichiers_dossier
  ADD COLUMN IF NOT EXISTS pedagogical_sequence_id UUID
    REFERENCES pedagogical_sequences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pedagogical_lesson_id UUID
    REFERENCES pedagogical_lessons(id) ON DELETE SET NULL;

-- ─── 4. Row Level Security ────────────────────────────────────────────────────

ALTER TABLE pedagogical_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedagogical_lessons   ENABLE ROW LEVEL SECURITY;

-- Sequences: teacher owns their class's sequences
CREATE POLICY seq_select ON pedagogical_sequences
  FOR SELECT USING (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

CREATE POLICY seq_insert ON pedagogical_sequences
  FOR INSERT WITH CHECK (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

CREATE POLICY seq_update ON pedagogical_sequences
  FOR UPDATE USING (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

CREATE POLICY seq_delete ON pedagogical_sequences
  FOR DELETE USING (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

-- Lessons: inherit from sequence ownership
CREATE POLICY lesson_select ON pedagogical_lessons
  FOR SELECT USING (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

CREATE POLICY lesson_insert ON pedagogical_lessons
  FOR INSERT WITH CHECK (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

CREATE POLICY lesson_update ON pedagogical_lessons
  FOR UPDATE USING (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

CREATE POLICY lesson_delete ON pedagogical_lessons
  FOR DELETE USING (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

-- ─── 5. Updated_at trigger ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER seq_updated_at
  BEFORE UPDATE ON pedagogical_sequences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER lesson_updated_at
  BEFORE UPDATE ON pedagogical_lessons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Migration notes ──────────────────────────────────────────────────────────
--
-- Data migration (V2 → V3) is NOT included here. Steps when GO decision is made:
--
-- 1. For each programme_annuel with schema_version = 'v2':
--    a. Re-run AYDTE bridge on curriculum_contenu to get SequenceBlock[]
--    b. INSERT INTO pedagogical_sequences one row per unite
--    c. INSERT INTO pedagogical_lessons one row per leçon
--    d. UPDATE contenu_json: set sequence_id on each unite
--    e. UPDATE schema_version = 'v3'
--
-- 2. For each teaching_event:
--    a. Resolve lesson by (sequence_index, lecon_index) → pedagogical_lesson_id
--    b. UPDATE teaching_events SET pedagogical_lesson_id = resolved_id
--
-- 3. Toggle reads: getCanonicalPedagogicalYear() already reads canonical tables
--    first (via pedagogical_sequences), then falls back to JSON — toggle is safe.
--
-- Estimated impact: ~0 existing rows (tables are new). No backfill unless
-- the ghost 'unites' table migration is also triggered simultaneously.
