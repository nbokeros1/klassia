-- ─── 012 — Table notifications ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id UUID         REFERENCES utilisateurs(id) ON DELETE CASCADE,
  type          TEXT         NOT NULL CHECK (type IN (
                               'message','partage','telechargement',
                               'badge','rappel','lecon_prete','action_ia'
                             )),
  titre         TEXT         NOT NULL,
  contenu       TEXT,
  lien          TEXT,
  est_lue       BOOLEAN      DEFAULT false,
  created_at    TIMESTAMPTZ  DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_notifications" ON notifications;
CREATE POLICY "user_own_notifications"
  ON notifications FOR ALL
  USING (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ))
  WITH CHECK (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_notifications_enseignant
  ON notifications(enseignant_id, est_lue, created_at DESC);
