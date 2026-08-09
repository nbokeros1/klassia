-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 025 — Workflow Runtime (ME-14)
-- Persistance de l'avancement d'exécution d'un plan de mission.
--
-- Principe :
--   - workflow_instances   : une ligne par exécution d'un ExecutionPlan.
--   - workflow_step_states : une ligne par étape × instance.
--   - plan_snapshot JSONB  : copie immuable du plan public au moment du démarrage.
--     Garantit que le workflow ne change pas si les templates ME-13 évoluent.
--   - Aucune donnée sensible dans le snapshot (garanti par le contrat ME-13.5).
--   - DELETE non autorisé depuis le client (aucune policy DELETE).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. workflow_instances ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_instances (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  enseignant_id       UUID        NOT NULL
    REFERENCES utilisateurs(id) ON DELETE CASCADE,

  -- Référence nullable vers missions_enseignant.id (null si bundle pur)
  mission_id          UUID        NULL
    REFERENCES missions_enseignant(id) ON DELETE SET NULL,

  -- Identifiant textuel déterministe de la mission source
  mission_key         TEXT        NOT NULL,

  -- ID déterministe du plan : "execution:{sourceId}"
  execution_plan_id   TEXT        NOT NULL,

  -- Source : mission individuelle ou bundle
  source_type         TEXT        NOT NULL,

  -- sourceId du plan (missionKey ou bundleId)
  source_id           TEXT        NOT NULL,

  -- Type pédagogique
  mission_type        TEXT        NOT NULL,

  -- Cycle de vie du workflow
  statut              TEXT        NOT NULL DEFAULT 'not_started',

  -- Version du plan utilisée (ex. 'ME-13.5')
  plan_version        TEXT        NOT NULL,

  -- Snapshot immuable du plan public (ExecutionPlan sérialisé)
  plan_snapshot       JSONB       NOT NULL,

  -- Étape courante (step_id déterministe)
  current_step_id     TEXT        NULL,

  -- Progression 0–100
  progress_percent    INTEGER     NOT NULL DEFAULT 0,

  -- Verrouillage optimiste : incrémenté à chaque mutation
  version             INTEGER     NOT NULL DEFAULT 1,

  -- Horodatages de cycle de vie
  started_at          TIMESTAMPTZ NULL,
  paused_at           TIMESTAMPTZ NULL,
  completed_at        TIMESTAMPTZ NULL,
  cancelled_at        TIMESTAMPTZ NULL,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un seul workflow actif par enseignant × plan d'exécution
  CONSTRAINT uq_workflow_plan
    UNIQUE (enseignant_id, execution_plan_id),

  -- Statuts autorisés
  CONSTRAINT chk_workflow_statut
    CHECK (statut IN (
      'not_started',
      'in_progress',
      'paused',
      'completed',
      'cancelled',
      'blocked'
    )),

  -- Source type
  CONSTRAINT chk_workflow_source_type
    CHECK (source_type IN ('mission', 'bundle')),

  -- Progression dans l'intervalle valide
  CONSTRAINT chk_workflow_progress
    CHECK (progress_percent BETWEEN 0 AND 100)
);

-- ── 2. Index workflow_instances ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_workflow_ens
  ON workflow_instances (enseignant_id);

CREATE INDEX IF NOT EXISTS idx_workflow_ens_statut
  ON workflow_instances (enseignant_id, statut);

CREATE INDEX IF NOT EXISTS idx_workflow_plan_id
  ON workflow_instances (execution_plan_id);

CREATE INDEX IF NOT EXISTS idx_workflow_updated
  ON workflow_instances (updated_at);

-- ── 3. Trigger updated_at pour workflow_instances ─────────────────────────

CREATE OR REPLACE FUNCTION update_workflow_instances_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workflow_instances_updated_at
  ON workflow_instances;

CREATE TRIGGER trg_workflow_instances_updated_at
  BEFORE UPDATE ON workflow_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_instances_updated_at();

-- ── 4. RLS workflow_instances ─────────────────────────────────────────────

ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_select_own" ON workflow_instances;
CREATE POLICY "workflow_select_own"
  ON workflow_instances FOR SELECT
  USING (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "workflow_insert_own" ON workflow_instances;
CREATE POLICY "workflow_insert_own"
  ON workflow_instances FOR INSERT
  WITH CHECK (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "workflow_update_own" ON workflow_instances;
CREATE POLICY "workflow_update_own"
  ON workflow_instances FOR UPDATE
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

-- DELETE : non autorisé depuis le client

GRANT SELECT, INSERT, UPDATE ON workflow_instances TO authenticated;

-- ── 5. workflow_step_states ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_step_states (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  workflow_instance_id  UUID        NOT NULL
    REFERENCES workflow_instances(id) ON DELETE CASCADE,

  -- step_id déterministe : "{planId}:step:{code}"
  step_id               TEXT        NOT NULL,

  -- Ordre de l'étape dans le plan (1-based)
  step_order            INTEGER     NOT NULL,

  -- Statut courant de l'étape
  statut                TEXT        NOT NULL DEFAULT 'pending',

  -- Horodatages
  started_at            TIMESTAMPTZ NULL,
  completed_at          TIMESTAMPTZ NULL,
  skipped_at            TIMESTAMPTZ NULL,

  -- Note de complétion assainie (max 500 chars, pas de HTML)
  completion_note       TEXT        NULL,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Une seule ligne par instance × étape
  CONSTRAINT uq_workflow_step
    UNIQUE (workflow_instance_id, step_id),

  -- Statuts autorisés
  CONSTRAINT chk_step_statut
    CHECK (statut IN (
      'pending',
      'available',
      'in_progress',
      'completed',
      'skipped',
      'blocked'
    ))
);

-- ── 6. Index workflow_step_states ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_step_instance
  ON workflow_step_states (workflow_instance_id);

CREATE INDEX IF NOT EXISTS idx_step_instance_statut
  ON workflow_step_states (workflow_instance_id, statut);

-- ── 7. Trigger updated_at pour workflow_step_states ───────────────────────

CREATE OR REPLACE FUNCTION update_workflow_step_states_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workflow_step_states_updated_at
  ON workflow_step_states;

CREATE TRIGGER trg_workflow_step_states_updated_at
  BEFORE UPDATE ON workflow_step_states
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_step_states_updated_at();

-- ── 8. RLS workflow_step_states ────────────────────────────────────────────

ALTER TABLE workflow_step_states ENABLE ROW LEVEL SECURITY;

-- Lecture : seulement si l'instance parent appartient à l'enseignant
DROP POLICY IF EXISTS "workflow_step_select_own" ON workflow_step_states;
CREATE POLICY "workflow_step_select_own"
  ON workflow_step_states FOR SELECT
  USING (
    workflow_instance_id IN (
      SELECT wi.id
        FROM workflow_instances wi
        JOIN utilisateurs u ON u.id = wi.enseignant_id
       WHERE u.user_id = auth.uid()
    )
  );

-- Insertion : seulement dans une instance appartenant à l'enseignant
DROP POLICY IF EXISTS "workflow_step_insert_own" ON workflow_step_states;
CREATE POLICY "workflow_step_insert_own"
  ON workflow_step_states FOR INSERT
  WITH CHECK (
    workflow_instance_id IN (
      SELECT wi.id
        FROM workflow_instances wi
        JOIN utilisateurs u ON u.id = wi.enseignant_id
       WHERE u.user_id = auth.uid()
    )
  );

-- Mise à jour : seulement dans une instance appartenant à l'enseignant
DROP POLICY IF EXISTS "workflow_step_update_own" ON workflow_step_states;
CREATE POLICY "workflow_step_update_own"
  ON workflow_step_states FOR UPDATE
  USING (
    workflow_instance_id IN (
      SELECT wi.id
        FROM workflow_instances wi
        JOIN utilisateurs u ON u.id = wi.enseignant_id
       WHERE u.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workflow_instance_id IN (
      SELECT wi.id
        FROM workflow_instances wi
        JOIN utilisateurs u ON u.id = wi.enseignant_id
       WHERE u.user_id = auth.uid()
    )
  );

-- DELETE : non autorisé depuis le client

GRANT SELECT, INSERT, UPDATE ON workflow_step_states TO authenticated;
