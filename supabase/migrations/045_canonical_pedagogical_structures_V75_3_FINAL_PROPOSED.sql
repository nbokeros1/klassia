-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION 045 — CANONICAL PEDAGOGICAL STRUCTURES (V7.5.3 FINAL)           ║
-- ║  STATUS : PROPOSED — DO NOT EXECUTE WITHOUT PRODUCT OWNER APPROVAL         ║
-- ║  Author  : ScorgIA V7.5.3 / 2026-08-19                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- THIS IS THE ONLY FILE APPROVED FOR FUTURE REMOTE EXECUTION.
-- Supersedes: 044_pedagogical_structures_V75_PROPOSED.sql       (SUPERSEDED)
--             045_pedagogical_structures_V752_HARDENED_PROPOSED.sql (SUPERSEDED)
-- Neither the superseded files nor this file has been remotely applied.
--
-- Applying this migration requires:
--   1. Product Owner GO decision
--   2. DBA review of RLS policies and integrity trigger
--   3. Staged rollout: create tables → shadow-write → compare → enable reads
--   4. PO confirmation: SELECT COUNT(*) FROM unites; = 0 before future DROP
--
-- CHANGES VS SUPERSEDED MIGRATION 045:
--   P0   — Added validate_pedagogical_unit_context() trigger (cross-field consistency)
--   P1   — Status semantics corrected: 'en_cours'/'terminee' → 'brouillon'/'prete'
--            (planning workflow only; teaching progress derived from teaching_events)
--   FIX  — Corrected cardinality verification queries (LEFT JOIN, not HAVING COUNT=0)
--   DOC  — Unit definition no longer implies "1 unit = 1 RAG domain"
--   TEST — Added CTX-A→CTX-I cross-context integrity test matrix
--   FIX  — SQL operator precedence on index verification query (added parentheses)
--
-- SCHEMA RELATIONSHIPS CONFIRMED (migration 036, schema.sql):
--   teaching_packs.enseignant_id → utilisateurs.id    NOT NULL
--   teaching_packs.classe_id     → classes.id          NOT NULL UNIQUE (one pack/class)
--   teaching_packs.programme_annuel_id                 NULLABLE FK
--   programme_annuel.teaching_pack_id                  NULLABLE FK (ON DELETE SET NULL)
--   programme_annuel.classe_id   → classes.id          NOT NULL
--   classes.enseignant_id        → utilisateurs.id     NOT NULL
--
-- DATABASE INVARIANTS (full list: docs/Architecture/SCORGIA_V7_5_3_FINAL_INTEGRITY_CONTRACT.md)
--   INV-01  Every pedagogical_sequence has exactly one parent unit (FK NOT NULL)
--   INV-02  Every pedagogical_lesson has exactly one parent sequence (FK NOT NULL)
--   INV-03  Unit numero is unique within a programme_annuel
--   INV-04  Sequence numero is unique within a unit
--   INV-05  Lesson numero is unique within a sequence
--   INV-06  Deleting planning structure does NOT delete teaching_events
--   INV-07  Deleting planning structure does NOT delete fichiers_dossier
--   INV-08  Teaching history is authoritative in teaching_events (V5 append-only)
--   INV-09  Planning status (brouillon/planifiee/prete/archivee) is NOT derived from teaching
--   INV-10  Cross-field consistency: programme/pack/class/teacher must form one coherent chain

-- ─────────────────────────────────────────────────────────────────────────────
-- § 1  CANONICAL PEDAGOGICAL UNITS
-- ─────────────────────────────────────────────────────────────────────────────
-- A pedagogical unit is a macro instructional grouping derived from one or more
-- related curriculum domains/outcomes. The optional domain_code may reflect a
-- RAG prefix ("A", "B", "C") but is not structurally enforced — one unit may
-- span multiple domains when pedagogically appropriate.
--
-- Anchors ownership: holds teaching_pack_id, programme_annuel_id, enseignant_id,
-- classe_id for query performance. Cross-field consistency enforced by trigger.
-- Sequences and lessons derive ownership through the FK chain.
--
-- SCAFFOLD ID PRESERVATION: TypeScript inserts with stable AYDTE UUID.
-- DEFAULT gen_random_uuid() fires only when no id is supplied.

CREATE TABLE IF NOT EXISTS pedagogical_units (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_annuel_id    UUID        NOT NULL REFERENCES programme_annuel(id) ON DELETE CASCADE,
  teaching_pack_id       UUID        NOT NULL REFERENCES teaching_packs(id)   ON DELETE CASCADE,
  enseignant_id          UUID        NOT NULL REFERENCES utilisateurs(id)     ON DELETE CASCADE,
  classe_id              UUID        NOT NULL REFERENCES classes(id)          ON DELETE CASCADE,

  -- Identity
  numero                 INTEGER     NOT NULL,
  titre                  TEXT        NOT NULL,
  domain_code            TEXT,        -- optional metadata; RAG prefix or custom grouping label

  -- Curriculum linkage (OUTCOME_REFERENCE_STRATEGY = TEMPORARY CODE-BASED REFERENCE)
  curriculum_outcome_ids TEXT[]      NOT NULL DEFAULT '{}',

  -- Planning workflow state — NOT a teaching progress indicator.
  -- Teaching progress is derived from child lessons + teaching_events (V5).
  statut                 TEXT        NOT NULL DEFAULT 'planifiee'
                           CHECK (statut IN ('brouillon', 'planifiee', 'prete', 'archivee')),

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
-- § 2  CANONICAL PEDAGOGICAL SEQUENCES
-- ─────────────────────────────────────────────────────────────────────────────
-- One sequence = one coherent instructional progression within a unit.
-- Ownership derives from parent unit (unit_id NOT NULL → pedagogical_units).
-- No redundant ownership columns — derive via JOIN on pedagogical_units when needed.
-- ON DELETE CASCADE: deleting a unit deletes its sequences.

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

  -- AYDTE metadata (stable ID from TypeScript bridge; equals this row's id in canonical writes)
  aydte_sequence_id      TEXT,
  aydte_pacing_score     INTEGER CHECK (aydte_pacing_score IS NULL OR aydte_pacing_score BETWEEN 0 AND 100),
  aydte_coverage_pct     INTEGER CHECK (aydte_coverage_pct IS NULL OR aydte_coverage_pct BETWEEN 0 AND 100),
  duree_estimee_heures   NUMERIC(5,1),

  -- Planning workflow state — NOT a teaching progress indicator (same reasoning as units).
  statut                 TEXT        NOT NULL DEFAULT 'planifiee'
                           CHECK (statut IN ('brouillon', 'planifiee', 'prete', 'archivee')),

  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Structural uniqueness (INV-04)
  CONSTRAINT uq_seq_numero_unit UNIQUE (unit_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_ped_seq_unit        ON pedagogical_sequences(unit_id);
CREATE INDEX IF NOT EXISTS idx_ped_seq_aydte_id    ON pedagogical_sequences(aydte_sequence_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 3  CANONICAL PEDAGOGICAL LESSONS
-- ─────────────────────────────────────────────────────────────────────────────
-- One lesson = one instructional step within a sequence.
-- Ownership via sequence_id NOT NULL → pedagogical_sequences → pedagogical_units.
-- ON DELETE CASCADE: deleting a sequence deletes its planned lessons.
--
-- SOURCE-OF-TRUTH RULE:
--   PLANNING preparation state → THIS TABLE (statut: planifiee/a_preparer/preparee/archivee)
--   ACTUAL TEACHING history    → teaching_events (V5 append-only, NEVER this table)
--
-- Removed vs migration 044 (and not re-added in 045):
--   date_enseignee        — belongs to teaching_events
--   note_enseignement     — belongs to teaching_events
--   statut = 'enseignee'  — belongs to teaching_events

CREATE TABLE IF NOT EXISTS pedagogical_lessons (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id            UUID        NOT NULL REFERENCES pedagogical_sequences(id) ON DELETE CASCADE,

  -- Link to detailed lesson plan in fichiers_dossier / lecons (optional)
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

  -- Preparation planning state only.
  -- Teaching history (taught/not-taught, date, note) → teaching_events.
  statut                 TEXT        NOT NULL DEFAULT 'planifiee'
                           CHECK (statut IN ('planifiee', 'a_preparer', 'preparee', 'archivee')),

  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Structural uniqueness (INV-05)
  CONSTRAINT uq_lesson_numero_sequence UNIQUE (sequence_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_ped_lesson_sequence ON pedagogical_lessons(sequence_id);
CREATE INDEX IF NOT EXISTS idx_ped_lesson_lecon     ON pedagogical_lessons(lecon_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 4  UNIT CONTEXT INTEGRITY TRIGGER (P0)
-- ─────────────────────────────────────────────────────────────────────────────
-- LAYERED SECURITY MODEL:
--   RLS   = user access control (who can read/write their own data)
--   TRIGGER = canonical data consistency (four ownership columns must form one chain)
--
-- This trigger fires on BEFORE INSERT OR UPDATE on pedagogical_units.
-- It validates that programme_annuel_id, teaching_pack_id, enseignant_id, classe_id
-- describe exactly one coherent ownership context — even when RLS is bypassed by
-- service role or a future maintenance script.
--
-- SECURITY INVOKER: runs with the caller's permissions.
--   - Authenticated user: RLS applies to SELECT queries inside the trigger, so
--     Teacher A cannot see Teacher B's programme/class/pack → NOT FOUND → exception.
--     This correctly rejects cross-tenant injections at the DB level.
--   - Service role: bypasses RLS, sees all rows, trigger validates real data integrity.
-- SET search_path = public: deterministic schema resolution, no search-path injection.
-- No SECURITY DEFINER: not required — INVOKER semantics are correct for both callers.
--
-- SCHEMA FACTS used in this trigger (confirmed from migrations 036, schema.sql):
--   programme_annuel.teaching_pack_id NULLABLE FK (teaching packs can pre-exist without prog.)
--   programme_annuel.classe_id        NOT NULL
--   teaching_packs.enseignant_id      NOT NULL
--   teaching_packs.classe_id          NOT NULL (UNIQUE — one pack per class)
--
-- EXCEPTIONS (structured names, no sensitive data exposed):
--   PED_UNIT_PROGRAMME_NOT_FOUND — programme_annuel not found (or not visible via RLS)
--   PED_UNIT_CLASS_MISMATCH      — programme.classe_id ≠ unit.classe_id
--   PED_UNIT_OWNER_MISMATCH      — class or pack does not belong to declared enseignant_id
--   PED_UNIT_PACK_MISMATCH       — pack not found, or pack.enseignant_id/classe_id mismatch
--   PED_UNIT_CONTEXT_MISMATCH    — programme.teaching_pack_id ≠ unit.teaching_pack_id

CREATE OR REPLACE FUNCTION validate_pedagogical_unit_context()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_prog_classe_id UUID;
  v_prog_pack_id   UUID;
  v_class_owner_id UUID;
  v_pack_owner_id  UUID;
  v_pack_class_id  UUID;
BEGIN
  -- A. Retrieve programme_annuel context.
  -- FK on pedagogical_units.programme_annuel_id guarantees row exists for service role.
  -- For authenticated callers, RLS may hide foreign programmes → NOT FOUND = rejection.
  SELECT classe_id, teaching_pack_id
    INTO v_prog_classe_id, v_prog_pack_id
    FROM programme_annuel
   WHERE id = NEW.programme_annuel_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PED_UNIT_PROGRAMME_NOT_FOUND'
      USING HINT = 'programme_annuel referenced by this unit does not exist or is not visible to the caller';
  END IF;

  -- B. programme.classe_id must equal unit.classe_id (same class context)
  IF v_prog_classe_id IS DISTINCT FROM NEW.classe_id THEN
    RAISE EXCEPTION 'PED_UNIT_CLASS_MISMATCH'
      USING HINT = 'programme_annuel.classe_id does not match the declared unit classe_id';
  END IF;

  -- C. unit.classe_id must belong to unit.enseignant_id
  SELECT enseignant_id
    INTO v_class_owner_id
    FROM classes
   WHERE id = NEW.classe_id;

  IF v_class_owner_id IS DISTINCT FROM NEW.enseignant_id THEN
    RAISE EXCEPTION 'PED_UNIT_OWNER_MISMATCH'
      USING HINT = 'declared classe_id does not belong to the declared enseignant_id';
  END IF;

  -- D + E. teaching_pack must belong to same enseignant and same classe.
  SELECT enseignant_id, classe_id
    INTO v_pack_owner_id, v_pack_class_id
    FROM teaching_packs
   WHERE id = NEW.teaching_pack_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PED_UNIT_PACK_MISMATCH'
      USING HINT = 'teaching_pack referenced by this unit does not exist or is not visible to the caller';
  END IF;

  IF v_pack_owner_id IS DISTINCT FROM NEW.enseignant_id THEN
    RAISE EXCEPTION 'PED_UNIT_PACK_MISMATCH'
      USING HINT = 'teaching_pack.enseignant_id does not match the declared enseignant_id';
  END IF;

  IF v_pack_class_id IS DISTINCT FROM NEW.classe_id THEN
    RAISE EXCEPTION 'PED_UNIT_PACK_MISMATCH'
      USING HINT = 'teaching_pack.classe_id does not match the declared classe_id';
  END IF;

  -- F. If programme_annuel already references a teaching_pack, it must be the same one.
  -- (programme_annuel.teaching_pack_id is nullable — no constraint when null)
  IF v_prog_pack_id IS NOT NULL AND v_prog_pack_id IS DISTINCT FROM NEW.teaching_pack_id THEN
    RAISE EXCEPTION 'PED_UNIT_CONTEXT_MISMATCH'
      USING HINT = 'programme_annuel.teaching_pack_id does not match the unit teaching_pack_id';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ped_unit_context ON pedagogical_units;
CREATE TRIGGER trg_validate_ped_unit_context
  BEFORE INSERT OR UPDATE ON pedagogical_units
  FOR EACH ROW EXECUTE FUNCTION validate_pedagogical_unit_context();

-- ─────────────────────────────────────────────────────────────────────────────
-- § 5  NULLABLE FK ADDITIONS ON EXISTING TABLES
-- ─────────────────────────────────────────────────────────────────────────────
-- teaching_events: gains optional FK to canonical lesson.
-- Resolution order: pedagogical_lesson_id (canonical V3+) → sequence_index+lecon_index (legacy V4/V5).
-- Legacy positional columns sequence_index and lecon_index are NOT removed.
-- INV-06: ON DELETE SET NULL — teaching history survives planning structure deletion.

ALTER TABLE teaching_events
  ADD COLUMN IF NOT EXISTS pedagogical_lesson_id UUID
    REFERENCES pedagogical_lessons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_te_pedagogical_lesson
  ON teaching_events(pedagogical_lesson_id)
  WHERE pedagogical_lesson_id IS NOT NULL;

-- fichiers_dossier: gains optional FKs to canonical structure.
-- INV-07: ON DELETE SET NULL — teacher documents survive planning structure deletion.
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
-- § 6  ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
-- TWO SECURITY LAYERS:
--   RLS     = user access control (owns this row?)
--   TRIGGER = canonical data consistency (is the cross-field context coherent?)
--
-- Ownership rule: utilisateurs.user_id = auth.uid() (NOT utilisateurs.id = auth.uid()).
-- All policies scoped TO authenticated.
-- INSERT: WITH CHECK prevents cross-teacher injection.
-- UPDATE: USING + WITH CHECK prevents ownership transfer.
-- Sequences and lessons: parent-chain security (verify via pedagogical_units ownership).
-- Units: RLS covers ownership; integrity trigger covers cross-field consistency.

ALTER TABLE pedagogical_units     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedagogical_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedagogical_lessons   ENABLE ROW LEVEL SECURITY;

-- ── pedagogical_units ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS unit_select ON pedagogical_units;
CREATE POLICY unit_select ON pedagogical_units
  FOR SELECT TO authenticated USING (
    enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  );

-- Note: Cross-field consistency (classe_id, programme_annuel_id, teaching_pack_id)
-- is enforced by the integrity trigger, not by RLS alone.
DROP POLICY IF EXISTS unit_insert ON pedagogical_units;
CREATE POLICY unit_insert ON pedagogical_units
  FOR INSERT TO authenticated WITH CHECK (
    enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS unit_update ON pedagogical_units;
CREATE POLICY unit_update ON pedagogical_units
  FOR UPDATE TO authenticated
  USING (
    enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  )
  WITH CHECK (
    -- Cannot transfer enseignant_id ownership. Cross-field consistency via trigger.
    enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS unit_delete ON pedagogical_units;
CREATE POLICY unit_delete ON pedagogical_units
  FOR DELETE TO authenticated USING (
    enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  );

-- ── pedagogical_sequences ────────────────────────────────────────────────────
-- Parent-chain security: unit_id must belong to the authenticated teacher.

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
    -- Cannot move sequence to a foreign unit (SEC-E / PAR-B)
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
-- Parent-chain security: two-hop join sequence → unit → enseignant.

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
    -- Cannot move lesson to a foreign sequence (PAR-C / PAR-D)
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
-- § 7  UPDATED_AT TRIGGER
-- ─────────────────────────────────────────────────────────────────────────────
-- Follows repository convention: table-specific function name (not a generic set_updated_at).
-- See: update_teaching_pack_updated_at() in migration 036.

CREATE OR REPLACE FUNCTION update_pedagogical_structure_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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
-- § 8  GRANTS
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON pedagogical_units     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pedagogical_sequences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pedagogical_lessons   TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- § 9  STATUS SEMANTICS REFERENCE
-- ─────────────────────────────────────────────────────────────────────────────
-- Unit and sequence planning workflow:
--   brouillon  — being drafted; not yet confirmed in the annual plan
--   planifiee  — confirmed in the plan (default)
--   prete      — all lessons prepared; ready for classroom delivery
--   archivee   — historical; not actively taught this year
--
-- Lesson preparation workflow:
--   planifiee  — in the plan (default)
--   a_preparer — needs preparation before next class
--   preparee   — fully prepared; lesson plan complete
--   archivee   — historical
--
-- WHAT IS NOT STORED HERE:
--   Teaching progress (en_cours, terminee, enseignee, fraction taught/not-taught)
--   → derived from teaching_events (V5 append-only)
--   → never store as static truth on planning tables

-- ─────────────────────────────────────────────────────────────────────────────
-- § 10  CARDINALITY MODEL AND DB ENFORCEMENT LIMITS
-- ─────────────────────────────────────────────────────────────────────────────
-- The DB enforces:
--   child → parent exists           (FK NOT NULL)
--   numero unique within parent     (UNIQUE constraints)
--   cross-field context coherent    (integrity trigger on units)
--
-- The DB does NOT enforce at all transaction moments:
--   parent → at least one child     (unit must have ≥1 sequence)
--   sequence → at least one lesson
--
-- "≥1 child" is enforced by the application transactional writer.
-- Canonical write contract (future RPC):
--   BEGIN;
--     INSERT INTO pedagogical_units ...
--     INSERT INTO pedagogical_sequences (unit_id = ...) ...   -- at least one
--     INSERT INTO pedagogical_lessons (sequence_id = ...) ... -- at least one
--     UPDATE programme_annuel SET contenu_json = ..., schema_version = 'v3' ...;
--   COMMIT;
--   → Any failure = full rollback. Never leave unit with zero sequences.
--
-- Correct post-write orphan verification queries (see § 12 for full PO set):
--
--   Units with zero sequences:
--   SELECT pu.id, pu.titre
--   FROM pedagogical_units pu
--   LEFT JOIN pedagogical_sequences ps ON ps.unit_id = pu.id
--   WHERE ps.id IS NULL;
--
--   Sequences with zero lessons:
--   SELECT ps.id, ps.titre
--   FROM pedagogical_sequences ps
--   LEFT JOIN pedagogical_lessons pl ON pl.sequence_id = ps.id
--   WHERE pl.id IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- § 11  GHOST TABLE `unites` — STATUS AND FUTURE PLAN
-- ─────────────────────────────────────────────────────────────────────────────
-- NOT DROPPED HERE. DO NOT DROP without PO confirmation of row count = 0.
--
-- Ghost `unites` classification: GHOST/UNUSED
--   Created in: schema.sql (initial baseline, no numbered migration)
--   Columns: id, programme_id, classe_id, numero, titre, semaine_debut, semaine_fin,
--            objectifs, created_at — no enseignant_id, no schema_version
--   Production code writes: NONE
--   Production code reads:  NONE (.from('unites') not found in src/)
--   FK references: lecons.unite_id → unites.id (SET NULL, never populated)
--   RLS: enabled, never triggered
--
-- Future decision (requires PO confirmation):
--   If SELECT COUNT(*) FROM unites = 0
--   AND SELECT COUNT(*) FROM lecons WHERE unite_id IS NOT NULL = 0
--   → schedule: migration 046_DEPRECATE_LEGACY_UNITS_PROPOSED.sql (DROP TABLE unites)
--
-- Verification SQL for PO:
--   SELECT COUNT(*) FROM public.unites;
--   SELECT COUNT(*) FROM public.lecons WHERE unite_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- § 12  PO VERIFICATION QUERIES (read-only, do not execute remotely as part of migration)
-- ─────────────────────────────────────────────────────────────────────────────

-- A. Tables created
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('pedagogical_units', 'pedagogical_sequences', 'pedagogical_lessons');

-- B. RLS enabled
-- SELECT relname, relrowsecurity FROM pg_class
-- WHERE relname IN ('pedagogical_units', 'pedagogical_sequences', 'pedagogical_lessons');

-- C. Expected policies (4 per table = 12 total)
-- SELECT tablename, policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('pedagogical_units', 'pedagogical_sequences', 'pedagogical_lessons')
-- ORDER BY tablename, policyname;

-- D. Expected triggers (4 total: validate_context + 3 updated_at)
-- SELECT trigger_name, event_manipulation, event_object_table, action_timing
-- FROM information_schema.triggers
-- WHERE event_object_table IN ('pedagogical_units', 'pedagogical_sequences', 'pedagogical_lessons')
--   AND trigger_schema = 'public'
-- ORDER BY event_object_table, trigger_name;

-- E. Expected foreign keys
-- SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table, rc.delete_rule
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu
--   ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
-- JOIN information_schema.referential_constraints rc
--   ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.constraint_schema
-- JOIN information_schema.constraint_column_usage ccu
--   ON ccu.constraint_name = rc.unique_constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND tc.table_name IN ('pedagogical_units', 'pedagogical_sequences', 'pedagogical_lessons',
--                          'teaching_events', 'fichiers_dossier')
--   AND kcu.column_name LIKE '%pedagogical%'
-- ORDER BY tc.table_name, kcu.column_name;

-- F. Expected unique constraints
-- SELECT tc.table_name, tc.constraint_name
-- FROM information_schema.table_constraints tc
-- WHERE tc.constraint_type = 'UNIQUE'
--   AND tc.table_name IN ('pedagogical_units', 'pedagogical_sequences', 'pedagogical_lessons');

-- G. Expected indexes (fixed operator precedence)
-- SELECT tablename, indexname FROM pg_indexes
-- WHERE tablename IN ('pedagogical_units', 'pedagogical_sequences', 'pedagogical_lessons',
--                     'teaching_events', 'fichiers_dossier')
--   AND (indexname LIKE 'idx_ped%'
--     OR indexname LIKE 'idx_te_ped%'
--     OR indexname LIKE 'idx_fd_ped%');

-- H. Zero rows initially (no canonical data after schema-only migration)
-- SELECT
--   (SELECT COUNT(*) FROM pedagogical_units)     AS units,
--   (SELECT COUNT(*) FROM pedagogical_sequences) AS sequences,
--   (SELECT COUNT(*) FROM pedagogical_lessons)   AS lessons;
-- -- expected: 0, 0, 0

-- I. Orphan units (zero sequences — should be 0 after any write)
-- SELECT pu.id, pu.titre
-- FROM pedagogical_units pu
-- LEFT JOIN pedagogical_sequences ps ON ps.unit_id = pu.id
-- WHERE ps.id IS NULL;

-- J. Orphan sequences (zero lessons)
-- SELECT ps.id, ps.titre
-- FROM pedagogical_sequences ps
-- LEFT JOIN pedagogical_lessons pl ON pl.sequence_id = ps.id
-- WHERE pl.id IS NULL;

-- K. Orphan lessons (impossible with NOT NULL FK — verify FK applied)
-- SELECT pl.id, pl.titre
-- FROM pedagogical_lessons pl
-- LEFT JOIN pedagogical_sequences ps ON ps.id = pl.sequence_id
-- WHERE ps.id IS NULL;

-- L. Cross-context inconsistency — programme class vs unit class (must = 0)
-- SELECT pu.id, pu.programme_annuel_id, pu.classe_id, pa.classe_id AS prog_classe
-- FROM pedagogical_units pu
-- JOIN programme_annuel pa ON pa.id = pu.programme_annuel_id
-- WHERE pu.classe_id IS DISTINCT FROM pa.classe_id;

-- M. Cross-context inconsistency — class owner vs declared enseignant (must = 0)
-- SELECT pu.id, pu.enseignant_id, c.enseignant_id AS class_owner
-- FROM pedagogical_units pu
-- JOIN classes c ON c.id = pu.classe_id
-- WHERE pu.enseignant_id IS DISTINCT FROM c.enseignant_id;

-- N. Cross-context inconsistency — pack class vs unit class (must = 0)
-- SELECT pu.id, pu.classe_id, tp.classe_id AS pack_classe
-- FROM pedagogical_units pu
-- JOIN teaching_packs tp ON tp.id = pu.teaching_pack_id
-- WHERE pu.classe_id IS DISTINCT FROM tp.classe_id;

-- O. teaching_events with canonical lesson refs
-- SELECT COUNT(*) FROM teaching_events WHERE pedagogical_lesson_id IS NOT NULL;

-- P. fichiers_dossier with canonical refs
-- SELECT
--   COUNT(*) FILTER (WHERE pedagogical_sequence_id IS NOT NULL) AS seq_refs,
--   COUNT(*) FILTER (WHERE pedagogical_lesson_id IS NOT NULL)   AS lesson_refs
-- FROM fichiers_dossier;

-- Q. Duplicate unit numero
-- SELECT programme_annuel_id, numero, COUNT(*) FROM pedagogical_units
-- GROUP BY programme_annuel_id, numero HAVING COUNT(*) > 1;

-- R. Duplicate sequence numero in same unit
-- SELECT unit_id, numero, COUNT(*) FROM pedagogical_sequences
-- GROUP BY unit_id, numero HAVING COUNT(*) > 1;

-- S. Duplicate lesson numero in same sequence
-- SELECT sequence_id, numero, COUNT(*) FROM pedagogical_lessons
-- GROUP BY sequence_id, numero HAVING COUNT(*) > 1;

-- O. Ghost table verification
-- SELECT COUNT(*) FROM public.unites;
-- SELECT COUNT(*) FROM public.lecons WHERE unite_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- § 13  SECURITY TEST MATRIX
-- ─────────────────────────────────────────────────────────────────────────────
-- Requires two real test teacher accounts (Teacher A / Teacher B) and their data.

-- SEC-A Teacher A reads own unit                                → ALLOW (unit_select)
-- SEC-B Teacher A reads Teacher B unit                          → DENY  (unit_select RLS)
-- SEC-C Teacher A inserts sequence into own unit                → ALLOW (seq_insert)
-- SEC-D Teacher A inserts sequence into Teacher B unit          → DENY  (seq_insert WITH CHECK)
-- SEC-E Teacher A moves own sequence to Teacher B unit (UPDATE) → DENY  (seq_update WITH CHECK)
-- SEC-F Teacher A inserts lesson into Teacher B sequence        → DENY  (lesson_insert WITH CHECK)
-- SEC-G Teacher A changes unit.classe_id to foreign class       → DENY  (integrity trigger CTX-D)
-- SEC-H Anonymous reads canonical structure                     → DENY  (TO authenticated)
-- SEC-I Service role write with invalid context                 → DENY  (integrity trigger, RLS bypassed)

-- ─────────────────────────────────────────────────────────────────────────────
-- § 14  CROSS-CONTEXT INTEGRITY TEST MATRIX (CTX-A → CTX-I)
-- ─────────────────────────────────────────────────────────────────────────────
-- All enforced by validate_pedagogical_unit_context() — fires even for service role.

-- CTX-A Teacher A programme + Teacher A class + Teacher A pack       → PASS
-- CTX-B Teacher A programme + Teacher B class                        → FAIL (PED_UNIT_CLASS_MISMATCH)
-- CTX-C Teacher A programme + Teacher B teaching_pack                → FAIL (PED_UNIT_PACK_MISMATCH)
-- CTX-D Teacher A class + Teacher B enseignant_id on unit            → FAIL (PED_UNIT_OWNER_MISMATCH)
-- CTX-E programme.classe_id = Class A, but unit.classe_id = Class B  → FAIL (PED_UNIT_CLASS_MISMATCH)
-- CTX-F unit.teaching_pack_id ≠ programme_annuel.teaching_pack_id    → FAIL (PED_UNIT_CONTEXT_MISMATCH)
-- CTX-G valid UPDATE changing titre only                              → PASS (context unchanged)
-- CTX-H UPDATE moves unit to foreign class                           → FAIL (PED_UNIT_CLASS_MISMATCH)
-- CTX-I service-role INSERT with invalid class/pack context           → FAIL (trigger, RLS bypassed)

-- ─────────────────────────────────────────────────────────────────────────────
-- § 15  PARENT-CHAIN SECURITY TEST MATRIX (PAR-A → PAR-D)
-- ─────────────────────────────────────────────────────────────────────────────
-- PAR-A Teacher A INSERT sequence into Teacher B unit (any auth)      → DENY
-- PAR-B Teacher A UPDATE sequence.unit_id to Teacher B unit           → DENY
-- PAR-C Teacher A INSERT lesson into Teacher B sequence               → DENY
-- PAR-D Teacher A UPDATE lesson.sequence_id to Teacher B sequence     → DENY

-- ─────────────────────────────────────────────────────────────────────────────
-- § 16  STRUCTURAL TEST MATRIX (STR-A → STR-I)
-- ─────────────────────────────────────────────────────────────────────────────
-- STR-A 1 programme → 1 unit → 2 sequences → variable lessons → all INSERTs succeed
-- STR-B 1 programme → 3 units → different sequence counts → all INSERTs succeed
-- STR-C DELETE pedagogical_sequence → child lessons CASCADE; teaching_events survive (SET NULL)
-- STR-D DELETE pedagogical_lesson → teaching_events.pedagogical_lesson_id = NULL
-- STR-E DELETE pedagogical_lesson → fichiers_dossier.pedagogical_lesson_id = NULL
-- STR-F INSERT unit with duplicate numero in same programme → UNIQUE violation
-- STR-G INSERT sequence with duplicate numero in same unit  → UNIQUE violation
-- STR-H INSERT sequence with same numero in DIFFERENT unit  → ALLOW (uniqueness is unit-scoped)
-- STR-I INSERT lesson with duplicate numero in same sequence → UNIQUE violation

-- ─────────────────────────────────────────────────────────────────────────────
-- § 17  SHADOW-WRITE ROLLOUT (unchanged from V7.5.2)
-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 1: Apply this migration (schema only, no app traffic to canonical tables)
-- Phase 2: Shadow-write from build-year route to both JSON + canonical tables
-- Phase 3: Compare representations (anomaly detection before enabling reads)
-- Phase 4: Enable canonical reads (getCanonicalPedagogicalYear() already prepared)
-- Phase 5: Controlled legacy backfill (future PO decision; NOT automated AI re-gen)
-- No legacy backfill in this migration. Expected row counts after Phase 1: 0/0/0.
