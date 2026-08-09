-- ── Migration 029 — teacher_predictions (ME-18) ──────────────────────────────
-- Prédictions pédagogiques issues du Predictive Engine.
-- Pas d'actions automatiques — prédictions de besoins uniquement.

CREATE TABLE IF NOT EXISTS teacher_predictions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id       UUID        NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL CHECK (type IN (
    'lesson_preparation', 'evaluation_preparation', 'grading_period',
    'holiday_preparation', 'semester_transition', 'exam_period',
    'administrative_deadline'
  )),
  confidence       INTEGER     NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  predicted_date   TIMESTAMPTZ NOT NULL,
  suggested_action TEXT        NOT NULL,
  reason           TEXT        NOT NULL,
  source_insights  JSONB       NOT NULL DEFAULT '[]',
  source_calendar  JSONB       NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version          TEXT        NOT NULL DEFAULT 'ME-18.0'
);

-- ── Index ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_teacher_predictions_teacher_confidence
  ON teacher_predictions (teacher_id, confidence DESC);

CREATE INDEX IF NOT EXISTS idx_teacher_predictions_date
  ON teacher_predictions (teacher_id, predicted_date);

CREATE INDEX IF NOT EXISTS idx_teacher_predictions_type
  ON teacher_predictions (type);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE teacher_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_predictions_own" ON teacher_predictions
  USING (
    teacher_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

-- ── Grants ────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, DELETE ON teacher_predictions TO authenticated;
