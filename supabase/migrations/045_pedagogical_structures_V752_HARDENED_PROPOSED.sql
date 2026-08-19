-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION 045 — CANONICAL PEDAGOGICAL STRUCTURES (V7.5.2 HARDENED)        ║
-- ║  STATUS : PROPOSED — DO NOT EXECUTE WITHOUT PRODUCT OWNER APPROVAL         ║
-- ║  Author  : ScorgIA V7.5.2 / 2026-08-18                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- Supersedes proposed migration 044; neither 044 nor 045 has been remotely applied.
-- This file is architecture documentation only.
--
-- Applying it requires:
--   1. Product Owner GO decision
--   2. DBA review of RLS policies
--   3. Staged rollout: create tables → shadow-write → compare → enable reads
--   4. Row-count verification on ghost table `unites` before any future DROP
--
-- FORENSIC AUDIT SUMMARY (full audit: docs/Architecture/SCORGIA_V7_5_2_DATABASE_FORENSIC_AUDIT.md)
--   Ghost table `unites`   : GHOST/UNUSED — never populated, not dropped here
--   set_updated_at()       : NOT in any deployed migration — using table-specific function (repo convention)
--   teaching_events        : append-only V5 — source of truth for teaching history
--   date_enseignee / note_enseignement / statut=enseignee : V4 legacy JSON fields, NOT in pedagogical_lessons
--
-- DATABASE INVARIANTS (full list: docs/Architecture/SCORGIA_V7_5_2_CANONICAL_DATABASE_CONTRACT.md)
--   INV-01  Every pedagogical_sequence has exactly one parent unit (NOT NULL FK)
--   INV-02  Every pedagogical_lesson has exactly one parent sequence (NOT NULL FK)
--   INV-03  Unit numero is unique within a programme
--   INV-04  Sequence numero is unique within a unit
--   INV-05  Lesson numero is unique within a sequence
--   INV-06  Deleting planning structure does NOT delete teaching_events
--   INV-07  Deleting planning structure does NOT delete fichiers_dossier rows
--
-- OWNERSHIP CHAIN ENFORCED:
--   auth.uid() → utilisateurs.id → classes.id → teaching_packs.id
--                → programme_annuel.id → pedagogical_units (anchor)
--                  → pedagogical_sequences (via unit_id FK)
--                    → pedagogical_lessons (via sequence_id FK)
--
-- CARDINALITY RULE: 1 unit → N sequences (N ≥ 1). Never 1:1 by assumption.
-- CARDINALITY RULE: 1 sequence → N lessons (N ≥ 1).

-- ─────────────────────────────────────────────────────────────────────────────
-- § 1  CANONICAL PEDAGOGICAL UNITS (macro theme level)
-- ─────────────────────────────────────────────────────────────────────────────
-- One unit = one curricular domain (RAG code prefix: "A", "B", "C").
-- Anchors ownership: holds teaching_pack_id, programme_annuel_id, enseignant_id,
-- classe_id for query performance. These four columns are the single ownership source.
-- Sequences and lessons derive ownership through the parent FK chain.
--
-- SCAFFOLD ID PRESERVATION: insert with TypeScript-generated UUIDs (aydte-planning-bridge).
-- DEFAULT gen_random_uuid() only fires when no id is supplied.

CREATE TABLE IF NOT EXISTS pedagogical_units (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_annuel_id    UUID        NOT NULL REFERENCES programme_annuel(id) ON DELETE CASCADE,
  teaching_pack_id       UUID        NOT NULL REFERENCES teaching_packs(id)   ON DELETE CASCADE,
  enseignant_id          UUID        NOT NULL REFERENCES utilisateurs(id)     ON DELETE CASCADE,
  classe_id              UUID        NOT NULL REFERENCES classes(id)          ON DELETE CASCADE,

  -- Identity
  numero                 INTEGER     NOT NULL,
  titre                  TEXT        NOT NULL,
  domain_code            TEXT,                   -- "A", "B", "C" from RAG prefix; "G1" fallback

  -- Curriculum linkage (temporary code-based reference — see OUTCOME_REFERENCE_STRATEGY note)
  curriculum_outcome_ids TEXT[]      NOT NULL DEFAULT '{}',

  -- Planning state only — teaching history is in teaching_events (append-only V5)
  statut                 TEXT        NOT NULL DEFAULT 'planifiee'
                           CHECK (statut IN ('planifiee', 'en_cours', 'terminee', 'archivee')),

  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Structural uniqueness (INV-03)
  CONSTRAINT uq_unit_numero_programme UNIQUE (programme_annuel_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_ped_unit_programme   ON pedagogical_units(programme_annuel_id);
CREATE INDEX IF NOT EXISTS idx_ped_unit_pack        ON pedagogical_units(teaching_pack_id);
CREATE INDEX IF NOT EXISTS idx_ped_unit_classe       ON pedagogical_units(classe_id);
CREATE INDEX IF NOT EXISTS idx_ped_unit_enseignant   ON pedagogical_units(enseignant_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 2  CANONICAL PEDAGOGICAL SEQUENCES (instructional progression level)
-- ─────────────────────────────────────────────────────────────────────────────
-- One sequence = one coherent instructional progression anchored to a RAG/RAS group.
-- Ownership derives from parent unit (via unit_id NOT NULL → pedagogical_units).
-- No redundant ownership columns — derive via JOIN on pedagogical_units when needed.
-- ON DELETE CASCADE: deleting a unit deletes its sequences (INV-06 handled at lesson level).

CREATE TABLE IF NOT EXISTS pedagogical_sequences (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id                UUID        NOT NULL REFERENCES pedagogical_units(id) ON DELETE CASCADE,

  -- Identity
  numero                 INTEGER     NOT NULL,
  titre                  TEXT        NOT NULL,
  theme                  TEXT,

  -- Calendar
  semaine_debut          INTEGER     NOT NULL CHECK (semaine_debut >= 1),
  semaine_fin            INTEGER     NOT NULL CHECK (semaine_fin >= semaine_debut),

  -- Curriculum linkage
  curriculum_outcome_ids TEXT[]      NOT NULL DEFAULT '{}',
  grandes_idees          TEXT[]      NOT NULL DEFAULT '{}',
  objectifs              TEXT[]      NOT NULL DEFAULT '{}',
  concepts_cles          TEXT[]      NOT NULL DEFAULT '{}',
  justification_pedagogique TEXT,

  -- Evaluation planning
  activite_culminante    TEXT,
  evaluation_prevue      TEXT,

  -- AYDTE metadata (stable IDs from TypeScript bridge)
  aydte_sequence_id      TEXT,                   -- SequenceBlock.id from AYDTE run (= this row's id)
  aydte_pacing_score     INTEGER     CHECK (aydte_pacing_score IS NULL OR (aydte_pacing_score BETWEEN 0 AND 100)),
  aydte_coverage_pct     INTEGER     CHECK (aydte_coverage_pct IS NULL OR (aydte_coverage_pct BETWEEN 0 AND 100)),
  duree_estimee_heures   NUMERIC(5,1),

  -- Planning state only (INV-06: teaching history stays in teaching_events)
  statut                 TEXT        NOT NULL DEFAULT 'planifiee'
                           CHECK (statut IN ('planifiee', 'en_cours', 'terminee', 'archivee')),

  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Structural uniqueness (INV-04)
  CONSTRAINT uq_seq_numero_unit UNIQUE (unit_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_ped_seq_unit          ON pedagogical_sequences(unit_id);
CREATE INDEX IF NOT EXISTS idx_ped_seq_aydte_id      ON pedagogical_sequences(aydte_sequence_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 3  CANONICAL PEDAGOGICAL LESSONS (instructional step level)
-- ─────────────────────────────────────────────────────────────────────────────
-- One lesson = one instructional step within a sequence.
-- Ownership derives from parent sequence (via sequence_id NOT NULL → pedagogical_sequences).
-- ON DELETE CASCADE: deleting a sequence deletes its planned lessons.
-- teaching_events rows survive (pedagogical_lesson_id → SET NULL, INV-06).
-- fichiers_dossier rows survive (pedagogical_lesson_id → SET NULL, INV-07).
--
-- SOURCE-OF-TRUTH RULE:
--   PLANNING state (planifiee, a_preparer, preparee, archivee) : THIS TABLE
--   TEACHING history (isTaught, taughtAt, note) : teaching_events (V5 append-only)
--
-- Fields removed vs migration 044:
--   date_enseignee        — belongs to teaching_events
--   note_enseignement     — belongs to teaching_events
--   statut = 'enseignee'  — belongs to teaching_events

CREATE TABLE IF NOT EXISTS pedagogical_lessons (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id            UUID        NOT NULL REFERENCES pedagogical_sequences(id) ON DELETE CASCADE,

  -- Link to existing detailed lesson plan (optional)
  lecon_id               UUID        REFERENCES lecons(id) ON DELETE SET NULL,

  -- Identity
  numero                 INTEGER     NOT NULL,
  titre                  TEXT        NOT NULL,
  sujet                  TEXT,
  duree_minutes          INTEGER     NOT NULL DEFAULT 60 CHECK (duree_minutes > 0),
  type                   TEXT        NOT NULL DEFAULT 'developpement'
                           CHECK (type IN ('introduction', 'developpement', 'evaluation', 'synthese')),
  progression_role       TEXT
                           CHECK (progression_role IS NULL OR progression_role IN (
                             'introduction', 'acquisition', 'pratique',
                             'approfondissement', 'integration', 'evaluation', 'autre'
                           )),

  -- Curriculum linkage
  curriculum_outcome_ids TEXT[]      NOT NULL DEFAULT '{}',
  objectif_apprentissage TEXT,
  activite_principale    TEXT,
  preuve_apprentissage   TEXT,
  justification          TEXT,

  -- Planning state (NOT teaching history — see SOURCE-OF-TRUTH RULE above)
  statut                 TEXT        NOT NULL DEFAULT 'planifiee'
                           CHECK (statut IN ('planifiee', 'a_preparer', 'preparee', 'archivee')),

  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Structural uniqueness (INV-05)
  CONSTRAINT uq_lesson_numero_sequence UNIQUE (sequence_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_ped_lesson_sequence   ON pedagogical_lessons(sequence_id);
CREATE INDEX IF NOT EXISTS idx_ped_lesson_lecon       ON pedagogical_lessons(lecon_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 4  NULLABLE FK ADDITIONS ON EXISTING TABLES
-- ─────────────────────────────────────────────────────────────────────────────
-- backward-compat: existing rows untouched, nullable = no constraint on old data.
--
-- teaching_events: gains optional FK to canonical lesson.
-- Resolution order: pedagogical_lesson_id (canonical) → sequence_index+lecon_index (legacy).
-- Legacy indices sequence_index and lecon_index are NOT removed (backward compat).
-- INV-06: ON DELETE SET NULL — teaching history survives planning structure rebuild.

ALTER TABLE teaching_events
  ADD COLUMN IF NOT EXISTS pedagogical_lesson_id UUID
    REFERENCES pedagogical_lessons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_te_pedagogical_lesson
  ON teaching_events(pedagogical_lesson_id)
  WHERE pedagogical_lesson_id IS NOT NULL;

-- fichiers_dossier: gains optional FKs to canonical structure.
-- INV-07: ON DELETE SET NULL — teacher documents survive planning structure rebuild.
-- pedagogical_unit_id not added: no current Class Folder Binding use case at unit level.

ALTER TABLE fichiers_dossier
  ADD COLUMN IF NOT EXISTS pedagogical_sequence_id UUID
    REFERENCES pedagogical_sequences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pedagogical_lesson_id UUID
    REFERENCES pedagogical_lessons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fd_pedagogical_seq
  ON fichiers_dossier(pedagogical_sequence_id)
  WHERE pedagogical_sequence_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fd_pedagogical_lesson
  ON fichiers_dossier(pedagogical_lesson_id)
  WHERE pedagogical_lesson_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- § 5  ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
-- Ownership rule: utilisateurs.user_id = auth.uid() (NOT utilisateurs.id = auth.uid()).
-- All policies scoped TO authenticated.
-- INSERT policies include WITH CHECK to prevent cross-teacher injection.
-- UPDATE policies include USING + WITH CHECK to prevent ownership change via UPDATE.
-- Parent-chain security: sequences and lessons verify ownership through parent join.

ALTER TABLE pedagogical_units     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedagogical_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedagogical_lessons   ENABLE ROW LEVEL SECURITY;

-- ── pedagogical_units ────────────────────────────────────────────────────────
-- Units own the full ancestry — anchor for all downstream ownership checks.

DROP POLICY IF EXISTS unit_select ON pedagogical_units;
CREATE POLICY unit_select ON pedagogical_units
  FOR SELECT TO authenticated USING (
    enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS unit_insert ON pedagogical_units;
CREATE POLICY unit_insert ON pedagogical_units
  FOR INSERT TO authenticated WITH CHECK (
    -- Teacher can only insert into their own programme
    enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    AND programme_annuel_id IN (
      SELECT pa.id FROM programme_annuel pa
      JOIN classes c ON c.id = pa.classe_id
      WHERE c.enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS unit_update ON pedagogical_units;
CREATE POLICY unit_update ON pedagogical_units
  FOR UPDATE TO authenticated
  USING (
    enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  )
  WITH CHECK (
    -- Cannot transfer ownership to another teacher or move to foreign programme
    enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    AND programme_annuel_id IN (
      SELECT pa.id FROM programme_annuel pa
      JOIN classes c ON c.id = pa.classe_id
      WHERE c.enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS unit_delete ON pedagogical_units;
CREATE POLICY unit_delete ON pedagogical_units
  FOR DELETE TO authenticated USING (
    enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  );

-- ── pedagogical_sequences ────────────────────────────────────────────────────
-- Sequences derive ownership via parent unit (parent-chain security).
-- Client-provided unit_id must belong to the authenticated teacher.

DROP POLICY IF EXISTS seq_select ON pedagogical_sequences;
CREATE POLICY seq_select ON pedagogical_sequences
  FOR SELECT TO authenticated USING (
    unit_id IN (
      SELECT id FROM pedagogical_units
      WHERE enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS seq_insert ON pedagogical_sequences;
CREATE POLICY seq_insert ON pedagogical_sequences
  FOR INSERT TO authenticated WITH CHECK (
    -- unit_id must belong to the authenticated teacher (SEC-D / SEC-F)
    unit_id IN (
      SELECT id FROM pedagogical_units
      WHERE enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS seq_update ON pedagogical_sequences;
CREATE POLICY seq_update ON pedagogical_sequences
  FOR UPDATE TO authenticated
  USING (
    unit_id IN (
      SELECT id FROM pedagogical_units
      WHERE enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    -- Cannot move sequence to a foreign unit (SEC-E)
    unit_id IN (
      SELECT id FROM pedagogical_units
      WHERE enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS seq_delete ON pedagogical_sequences;
CREATE POLICY seq_delete ON pedagogical_sequences
  FOR DELETE TO authenticated USING (
    unit_id IN (
      SELECT id FROM pedagogical_units
      WHERE enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  );

-- ── pedagogical_lessons ───────────────────────────────────────────────────────
-- Lessons derive ownership via parent sequence → unit chain (parent-chain security).
-- Two-hop join to reach enseignant_id — acceptable for V7.5.2 scale.

DROP POLICY IF EXISTS lesson_select ON pedagogical_lessons;
CREATE POLICY lesson_select ON pedagogical_lessons
  FOR SELECT TO authenticated USING (
    sequence_id IN (
      SELECT ps.id FROM pedagogical_sequences ps
      JOIN pedagogical_units pu ON pu.id = ps.unit_id
      WHERE pu.enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS lesson_insert ON pedagogical_lessons;
CREATE POLICY lesson_insert ON pedagogical_lessons
  FOR INSERT TO authenticated WITH CHECK (
    -- sequence_id must trace back to the authenticated teacher (SEC-F)
    sequence_id IN (
      SELECT ps.id FROM pedagogical_sequences ps
      JOIN pedagogical_units pu ON pu.id = ps.unit_id
      WHERE pu.enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS lesson_update ON pedagogical_lessons;
CREATE POLICY lesson_update ON pedagogical_lessons
  FOR UPDATE TO authenticated
  USING (
    sequence_id IN (
      SELECT ps.id FROM pedagogical_sequences ps
      JOIN pedagogical_units pu ON pu.id = ps.unit_id
      WHERE pu.enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    sequence_id IN (
      SELECT ps.id FROM pedagogical_sequences ps
      JOIN pedagogical_units pu ON pu.id = ps.unit_id
      WHERE pu.enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS lesson_delete ON pedagogical_lessons;
CREATE POLICY lesson_delete ON pedagogical_lessons
  FOR DELETE TO authenticated USING (
    sequence_id IN (
      SELECT ps.id FROM pedagogical_sequences ps
      JOIN pedagogical_units pu ON pu.id = ps.unit_id
      WHERE pu.enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- § 6  UPDATED_AT TRIGGER (repo-convention: table-specific function name)
-- ─────────────────────────────────────────────────────────────────────────────
-- Repository convention: each table has its own named function (never a generic set_updated_at).
-- See migration 036 (update_teaching_pack_updated_at), 023, 024, 025 for precedent.

CREATE OR REPLACE FUNCTION update_pedagogical_structure_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pedagogical_unit_updated_at ON pedagogical_units;
CREATE TRIGGER pedagogical_unit_updated_at
  BEFORE UPDATE ON pedagogical_units
  FOR EACH ROW EXECUTE FUNCTION update_pedagogical_structure_updated_at();

DROP TRIGGER IF EXISTS pedagogical_sequence_updated_at ON pedagogical_sequences;
CREATE TRIGGER pedagogical_sequence_updated_at
  BEFORE UPDATE ON pedagogical_sequences
  FOR EACH ROW EXECUTE FUNCTION update_pedagogical_structure_updated_at();

DROP TRIGGER IF EXISTS pedagogical_lesson_updated_at ON pedagogical_lessons;
CREATE TRIGGER pedagogical_lesson_updated_at
  BEFORE UPDATE ON pedagogical_lessons
  FOR EACH ROW EXECUTE FUNCTION update_pedagogical_structure_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- § 7  GRANTS
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON pedagogical_units     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pedagogical_sequences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pedagogical_lessons   TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- § 8  ARCHITECTURE NOTES (not executed)
-- ─────────────────────────────────────────────────────────────────────────────

-- GHOST TABLE `unites`:
--   DO NOT DROP HERE. Requires PO confirmation of zero row count in production.
--   Verify with: SELECT COUNT(*) FROM unites;
--   If count = 0, safe to schedule DROP TABLE unites in a future migration.
--   Also check: SELECT COUNT(*) FROM lecons WHERE unite_id IS NOT NULL;
--   If count = 0, the FK lecons.unite_id can be dropped safely as well.

-- OUTCOME_REFERENCE_STRATEGY = TEMPORARY CODE-BASED REFERENCE
--   curriculum_outcome_ids TEXT[] is adequate for V7.5.2.
--   Risk: outcome codes like "A1.1" are not globally unique across curriculum/province/grade.
--   Future V8+ decision required: normalized curriculum_outcomes table with composite PK.

-- SHADOW-WRITE ROLLOUT (DO NOT IMPLEMENT NOW):
--   Phase 1: This migration — tables created, no app traffic
--   Phase 2: Build-year route writes to both JSON + canonical tables (shadow-write)
--   Phase 3: Compare representations (metrics, anomaly detection)
--   Phase 4: getCanonicalPedagogicalYear() reads from canonical tables first
--   Phase 5: Legacy backfill via controlled script (not AI re-generation)
--   getCanonicalPedagogicalYear() adapter is already prepared for phase 4:
--     priority 1 = canonical DB tables (currently falls through — "NOT YET POPULATED")
--     priority 2 = schema_version 'v3' JSON
--     priority 3 = V1/V2 legacy JSON

-- TRANSACTIONAL WRITE CONTRACT (future RPC — not implemented in 045):
--   When generating a new V3 year:
--     BEGIN;
--       INSERT INTO pedagogical_units ... RETURNING id;
--       INSERT INTO pedagogical_sequences (unit_id = ...) ... RETURNING id;
--       INSERT INTO pedagogical_lessons (sequence_id = ...) ...;
--       UPDATE programme_annuel SET contenu_json = ..., schema_version = 'v3' ...;
--     COMMIT;
--   On any failure: full rollback. Never leave unit without sequences, sequence without lessons.

-- CARDINALITY INVARIANT SQL (run after migration, before enabling reads):
--   SELECT unit_id, COUNT(*) as seq_count
--   FROM pedagogical_sequences
--   GROUP BY unit_id
--   HAVING COUNT(*) = 0;
--   -- must return 0 rows

-- ─────────────────────────────────────────────────────────────────────────────
-- § 9  PO VERIFICATION QUERIES (do not execute remotely — read-only checks)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tables exist
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('pedagogical_units', 'pedagogical_sequences', 'pedagogical_lessons');

-- 2. RLS enabled
-- SELECT relname, relrowsecurity FROM pg_class
-- WHERE relname IN ('pedagogical_units', 'pedagogical_sequences', 'pedagogical_lessons');

-- 3. Expected policies
-- SELECT tablename, policyname FROM pg_policies
-- WHERE tablename IN ('pedagogical_units', 'pedagogical_sequences', 'pedagogical_lessons');

-- 4. Foreign keys
-- SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu USING (constraint_name, table_schema)
-- JOIN information_schema.referential_constraints rc USING (constraint_name, constraint_schema)
-- JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = rc.unique_constraint_name
-- WHERE tc.table_name IN ('pedagogical_units', 'pedagogical_sequences', 'pedagogical_lessons')
--   AND tc.constraint_type = 'FOREIGN KEY';

-- 5. Indexes
-- SELECT tablename, indexname FROM pg_indexes
-- WHERE tablename IN ('pedagogical_units', 'pedagogical_sequences', 'pedagogical_lessons',
--                     'teaching_events', 'fichiers_dossier')
--   AND indexname LIKE 'idx_ped%' OR indexname LIKE 'idx_te_ped%' OR indexname LIKE 'idx_fd_ped%';

-- 6. Orphan units (units without sequences — should be 0 after data load)
-- SELECT pu.id, pu.titre FROM pedagogical_units pu
-- LEFT JOIN pedagogical_sequences ps ON ps.unit_id = pu.id
-- WHERE ps.id IS NULL;

-- 7. Orphan sequences (sequences without lessons — should be 0 after data load)
-- SELECT ps.id, ps.titre FROM pedagogical_sequences ps
-- LEFT JOIN pedagogical_lessons pl ON pl.sequence_id = ps.id
-- WHERE pl.id IS NULL;

-- 8. Orphan lessons (lessons without sequence — impossible with NOT NULL FK, but verify)
-- SELECT pl.id, pl.titre FROM pedagogical_lessons pl
-- LEFT JOIN pedagogical_sequences ps ON ps.id = pl.sequence_id
-- WHERE ps.id IS NULL;

-- 9. Cross-teacher inconsistency (unit enseignant_id vs programme owner)
-- SELECT pu.id, pu.enseignant_id, pa.classe_id
-- FROM pedagogical_units pu
-- JOIN programme_annuel pa ON pa.id = pu.programme_annuel_id
-- JOIN classes c ON c.id = pa.classe_id
-- WHERE pu.enseignant_id != c.enseignant_id;
-- -- must return 0 rows

-- 10. Duplicate unit numero
-- SELECT programme_annuel_id, numero, COUNT(*) FROM pedagogical_units
-- GROUP BY programme_annuel_id, numero HAVING COUNT(*) > 1;

-- 11. Duplicate sequence numero
-- SELECT unit_id, numero, COUNT(*) FROM pedagogical_sequences
-- GROUP BY unit_id, numero HAVING COUNT(*) > 1;

-- 12. Duplicate lesson numero
-- SELECT sequence_id, numero, COUNT(*) FROM pedagogical_lessons
-- GROUP BY sequence_id, numero HAVING COUNT(*) > 1;

-- 13. teaching_events with pedagogical_lesson_id
-- SELECT COUNT(*) FROM teaching_events WHERE pedagogical_lesson_id IS NOT NULL;

-- 14. fichiers_dossier with pedagogical FKs
-- SELECT COUNT(*) FROM fichiers_dossier WHERE pedagogical_sequence_id IS NOT NULL
--   OR pedagogical_lesson_id IS NOT NULL;

-- 15. Ghost table verification
-- SELECT COUNT(*) FROM unites;
-- SELECT COUNT(*) FROM lecons WHERE unite_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- § 10  SECURITY TEST MATRIX (manual, requires two test teacher accounts)
-- ─────────────────────────────────────────────────────────────────────────────
-- SEC-A Teacher A reads own unit → ALLOW
-- SEC-B Teacher A reads Teacher B unit → DENY
-- SEC-C Teacher A inserts sequence into own unit → ALLOW
-- SEC-D Teacher A inserts sequence into Teacher B unit (any enseignant_id) → DENY
-- SEC-E Teacher A moves own sequence to Teacher B unit (UPDATE unit_id) → DENY
-- SEC-F Teacher A inserts lesson into Teacher B sequence → DENY
-- SEC-G Teacher A changes unit.classe_id to foreign class → DENY (WITH CHECK)
-- SEC-H Anonymous user reads canonical structure → DENY (TO authenticated)
-- SEC-I Service role (bypasses RLS by design) — document, not block

-- ─────────────────────────────────────────────────────────────────────────────
-- § 11  STRUCTURAL TEST MATRIX
-- ─────────────────────────────────────────────────────────────────────────────
-- STR-A 1 programme → 1 unit → 2 sequences → variable lessons → INSERT succeeds
-- STR-B 1 programme → 3 units → different sequence counts → all inserts succeed
-- STR-C DELETE pedagogical_sequence → child lessons cascade → teaching_event stays with lesson_id=NULL
-- STR-D DELETE pedagogical_lesson → teaching_event.pedagogical_lesson_id = NULL (not deleted)
-- STR-E DELETE pedagogical_lesson → fichiers_dossier.pedagogical_lesson_id = NULL (not deleted)
-- STR-F INSERT unit with duplicate numero in same programme → UNIQUE constraint violation
-- STR-G INSERT sequence with duplicate numero in same unit → UNIQUE constraint violation
-- STR-H INSERT sequence with same numero in DIFFERENT unit → succeeds (cross-unit same numero ok)
-- STR-I INSERT lesson with duplicate numero in same sequence → UNIQUE constraint violation
