-- ── Migration 026 : Activity Engine Event Store (ME-15) ──────────────────────
--
-- Table d'événements métier normalisés.
-- Lecture indexée par teacher_id + occurred_at DESC.

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID        NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL,
  entity_type  TEXT        NOT NULL,
  entity_id    TEXT        NOT NULL,
  class_id     TEXT,                      -- TEXT (pas FK) pour résistance aux suppressions
  subject      TEXT,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata     JSONB       NOT NULL DEFAULT '{}',
  source       TEXT        NOT NULL DEFAULT 'SYSTEM',
  version      TEXT        NOT NULL DEFAULT 'ME-15.0',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT activity_events_type_check CHECK (type IN (
    'lesson_created',         'lesson_updated',          'lesson_deleted',
    'evaluation_created',     'evaluation_updated',      'evaluation_deleted',
    'document_uploaded',      'document_deleted',        'document_moved',
    'calendar_event_created', 'calendar_event_updated',  'calendar_event_deleted',
    'assignment_corrected',   'feedback_added',
    'workflow_started',       'workflow_paused',         'workflow_resumed',
    'workflow_completed',     'workflow_cancelled',
    'workflow_step_started',  'workflow_step_completed', 'workflow_step_skipped',
    'mission_completed',      'mission_restored',
    'ia_conversation_started','ia_document_generated'
  )),

  CONSTRAINT activity_events_source_check CHECK (source IN (
    'USER', 'SYSTEM', 'WORKFLOW', 'API', 'IMPORT'
  ))
);

-- ── Index de lecture (timeline indexée O(log n)) ──────────────────────────────

CREATE INDEX IF NOT EXISTS activity_events_teacher_occurred_idx
  ON activity_events (teacher_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS activity_events_type_idx
  ON activity_events (type);

CREATE INDEX IF NOT EXISTS activity_events_class_id_idx
  ON activity_events (class_id)
  WHERE class_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS activity_events_entity_idx
  ON activity_events (entity_type, entity_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_events_teacher_rls"
  ON activity_events
  FOR ALL
  USING (
    teacher_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

-- ── Droits ────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT ON activity_events TO authenticated;
