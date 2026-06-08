-- KlassIA — Migration 003 : Quiz live (tables et colonnes manquantes)
-- A executer dans Supabase Dashboard > SQL Editor

-- ── Nouvelles tables ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS badges_quiz (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id  UUID        REFERENCES utilisateurs(id),
  session_id     UUID        REFERENCES sessions_quiz(id) ON DELETE CASCADE,
  participant_id UUID        REFERENCES participants_quiz(id) ON DELETE CASCADE,
  type           TEXT        NOT NULL CHECK (type IN (
    'champion','finaliste','medaille',
    'eclair','precision','en_feu','genie','participant'
  )),
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recompenses_quiz (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id     UUID        REFERENCES quiz(id) ON DELETE CASCADE,
  type        TEXT        DEFAULT 'texte' CHECK (type IN (
    'bonbon','point_bonus','devoir_annule','jeu_libre','texte'
  )),
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Colonnes manquantes sur quiz ──────────────────────────────────────────────

ALTER TABLE quiz ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'individuel'
  CHECK (mode IN ('individuel','equipes','defi'));
ALTER TABLE quiz ADD COLUMN IF NOT EXISTS nb_equipes              INTEGER DEFAULT 2;
ALTER TABLE quiz ADD COLUMN IF NOT EXISTS mode_revision           BOOLEAN DEFAULT false;
ALTER TABLE quiz ADD COLUMN IF NOT EXISTS afficher_explication    BOOLEAN DEFAULT false;
ALTER TABLE quiz ADD COLUMN IF NOT EXISTS recompense_physique     TEXT;
ALTER TABLE quiz ADD COLUMN IF NOT EXISTS lien_ras                TEXT;
ALTER TABLE quiz ADD COLUMN IF NOT EXISTS lien_rag                TEXT;
ALTER TABLE quiz ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manuel'
  CHECK (source IN ('manuel','ia_lecon','ia_curriculum'));

-- ── Colonnes manquantes sur questions_quiz ────────────────────────────────────

ALTER TABLE questions_quiz ADD COLUMN IF NOT EXISTS explication TEXT;
ALTER TABLE questions_quiz ADD COLUMN IF NOT EXISTS image_url   TEXT;
ALTER TABLE questions_quiz ADD COLUMN IF NOT EXISTS ras_lie     TEXT;

-- ── Colonnes manquantes sur participants_quiz ─────────────────────────────────

ALTER TABLE participants_quiz ADD COLUMN IF NOT EXISTS equipe_id INTEGER;
ALTER TABLE participants_quiz ADD COLUMN IF NOT EXISTS avatar    TEXT DEFAULT '🦁';

-- ── Colonnes manquantes sur sessions_quiz ────────────────────────────────────

ALTER TABLE sessions_quiz ADD COLUMN IF NOT EXISTS mode              TEXT DEFAULT 'individuel';
ALTER TABLE sessions_quiz ADD COLUMN IF NOT EXISTS scores            JSONB DEFAULT '{}';
ALTER TABLE sessions_quiz ADD COLUMN IF NOT EXISTS questions_ratees  JSONB DEFAULT '[]';

-- ── RLS sur nouvelles tables ──────────────────────────────────────────────────

ALTER TABLE badges_quiz      ENABLE ROW LEVEL SECURITY;
ALTER TABLE recompenses_quiz ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_badges" ON badges_quiz FOR ALL
  USING (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

CREATE POLICY "user_own_recompenses" ON recompenses_quiz FOR ALL
  USING (quiz_id IN (
    SELECT id FROM quiz WHERE enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  ));
