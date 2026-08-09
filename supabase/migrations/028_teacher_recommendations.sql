-- ── Migration 028 — teacher_recommendations (ME-17) ──────────────────────────
-- Recommandations pédagogiques personnalisées issues de l'Insight Engine.
-- Uniquement des suggestions — aucune action automatique.

CREATE TABLE IF NOT EXISTS teacher_recommendations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id        UUID        NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  type              TEXT        NOT NULL CHECK (type IN (
    'planning', 'workflow', 'evaluation', 'preparation',
    'consistency', 'productivity', 'wellbeing'
  )),
  priority          TEXT        NOT NULL CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW', 'INFORMATION')),
  title             TEXT        NOT NULL,
  description       TEXT        NOT NULL,
  reason            TEXT        NOT NULL,
  confidence        INTEGER     NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  based_on_insights JSONB       NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,
  version           TEXT        NOT NULL DEFAULT 'ME-17.0'
);

-- ── Index ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_teacher_recs_teacher_priority
  ON teacher_recommendations (teacher_id, priority, confidence DESC);

CREATE INDEX IF NOT EXISTS idx_teacher_recs_expires
  ON teacher_recommendations (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teacher_recs_type
  ON teacher_recommendations (type);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE teacher_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_recs_own" ON teacher_recommendations
  USING (
    teacher_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

-- ── Grants ────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, DELETE ON teacher_recommendations TO authenticated;
