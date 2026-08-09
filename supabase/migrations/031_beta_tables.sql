-- ─── SC-03K — Tables bêta (feedback + logs) ─────────────────────────────────

-- Retours des utilisateurs bêta
CREATE TABLE IF NOT EXISTS beta_feedback (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id UUID        REFERENCES utilisateurs(id) ON DELETE SET NULL,
  type           TEXT        NOT NULL CHECK (type IN ('bug', 'idea', 'remark', 'rating')),
  titre          TEXT,
  description    TEXT        NOT NULL,
  page_url       TEXT,
  feature_note   INTEGER     CHECK (feature_note BETWEEN 1 AND 5),
  statut         TEXT        NOT NULL DEFAULT 'nouveau'
                             CHECK (statut IN ('nouveau', 'en_traitement', 'resolu', 'ferme')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Logs d'erreurs client (capturés côté navigateur)
CREATE TABLE IF NOT EXISTS beta_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  level          TEXT        NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  tag            TEXT        NOT NULL,
  message        TEXT        NOT NULL,
  data           JSONB,
  page_url       TEXT,
  utilisateur_id UUID        REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS : seul le service-role peut écrire (les routes API utilisent la clé service)
ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_logs     ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent lire
CREATE POLICY "admin_read_feedback" ON beta_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );

CREATE POLICY "admin_read_logs" ON beta_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );

-- Index pour les requêtes admin
CREATE INDEX IF NOT EXISTS idx_beta_feedback_created ON beta_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_type    ON beta_feedback(type);
CREATE INDEX IF NOT EXISTS idx_beta_logs_level       ON beta_logs(level);
CREATE INDEX IF NOT EXISTS idx_beta_logs_created     ON beta_logs(created_at DESC);
