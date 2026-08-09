-- ── Migration 027 — teacher_insights (ME-16) ─────────────────────────────────
-- Table de stockage des insights comportementaux.
-- Les insights sont des observations calculées — aucune donnée nominative.

CREATE TABLE IF NOT EXISTS teacher_insights (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID        NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL CHECK (type IN (
    'planning_pattern',
    'preparation_pattern',
    'evaluation_pattern',
    'workflow_pattern',
    'consistency_pattern',
    'productivity_pattern',
    'interruption_pattern',
    'cadence_pattern'
  )),
  score        INTEGER     NOT NULL CHECK (score >= 0 AND score <= 100),
  confidence   INTEGER     NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  title        TEXT        NOT NULL,
  description  TEXT        NOT NULL,
  evidence     JSONB       NOT NULL DEFAULT '{}',
  period_since TIMESTAMPTZ NOT NULL,
  period_until TIMESTAMPTZ NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  version      TEXT        NOT NULL DEFAULT 'ME-16.0',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Index ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_teacher_insights_teacher_conf
  ON teacher_insights (teacher_id, confidence DESC);

CREATE INDEX IF NOT EXISTS idx_teacher_insights_expires
  ON teacher_insights (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teacher_insights_type
  ON teacher_insights (type);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE teacher_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_insights_own" ON teacher_insights
  USING (
    teacher_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

-- ── Grants ────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, DELETE ON teacher_insights TO authenticated;
