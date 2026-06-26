-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 011 — Assistant vocal IA + préférences page
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. conversations_ia ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversations_ia (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id   UUID        REFERENCES utilisateurs(id) ON DELETE CASCADE,
  titre           TEXT,
  contexte_page   TEXT,
  classe_id       UUID        REFERENCES classes(id) ON DELETE SET NULL,
  messages        JSONB       DEFAULT '[]',
  est_archivee    BOOLEAN     DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 2. actions_ia ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS actions_ia (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id   UUID        REFERENCES utilisateurs(id) ON DELETE CASCADE,
  conversation_id UUID        REFERENCES conversations_ia(id) ON DELETE SET NULL,
  type_action     TEXT        NOT NULL CHECK (type_action IN (
    'creer_classe','creer_dossier','creer_fichier',
    'modifier_fichier','valider_plan','generer_lecon',
    'remplir_calendrier','generer_plans','chercher',
    'uploader','deplacer','supprimer','personnaliser'
  )),
  payload         JSONB       DEFAULT '{}',
  resultat        JSONB       DEFAULT '{}',
  statut          TEXT        DEFAULT 'succes'
    CHECK (statut IN ('succes','erreur','annule')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 3. preferences_page ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS preferences_page (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id   UUID        REFERENCES utilisateurs(id) ON DELETE CASCADE,
  page            TEXT        NOT NULL,
  preferences     JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(enseignant_id, page)
);

-- ── 4. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE conversations_ia  ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions_ia        ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences_page  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_conversations" ON conversations_ia;
CREATE POLICY "user_own_conversations"
  ON conversations_ia FOR ALL
  USING (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ))
  WITH CHECK (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "user_own_actions" ON actions_ia;
CREATE POLICY "user_own_actions"
  ON actions_ia FOR ALL
  USING (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "user_own_preferences" ON preferences_page;
CREATE POLICY "user_own_preferences"
  ON preferences_page FOR ALL
  USING (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ))
  WITH CHECK (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON conversations_ia TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON actions_ia       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON preferences_page TO authenticated;

-- ── 5. colonne matieres sur classes (si pas encore présente) ─────────────────

ALTER TABLE classes ADD COLUMN IF NOT EXISTS matieres TEXT[] DEFAULT '{}';

UPDATE classes
  SET matieres = ARRAY[matiere]
  WHERE matiere IS NOT NULL
    AND matiere <> ''
    AND (matieres IS NULL OR matieres = '{}');
