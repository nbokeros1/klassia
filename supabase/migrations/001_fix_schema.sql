-- KlassIA — Migration 001 : correctifs schema
-- A executer dans Supabase Dashboard > SQL Editor

-- Fix lecons
ALTER TABLE lecons ALTER COLUMN numero SET DEFAULT 0;
ALTER TABLE lecons ADD COLUMN IF NOT EXISTS contenu_json JSONB DEFAULT '{}';
ALTER TABLE lecons ADD COLUMN IF NOT EXISTS type_document TEXT DEFAULT 'plan_lecon'
  CHECK (type_document IN ('plan_sequence','plan_lecon','lecon_complete'));

-- Fix RLS lecons avec WITH CHECK
DROP POLICY IF EXISTS "user_own_lecons" ON lecons;
CREATE POLICY "user_own_lecons" ON lecons FOR ALL
  USING (classe_id IN (
    SELECT c.id FROM classes c
    JOIN utilisateurs u ON u.id = c.enseignant_id
    WHERE u.user_id = auth.uid()
  ))
  WITH CHECK (classe_id IN (
    SELECT c.id FROM classes c
    JOIN utilisateurs u ON u.id = c.enseignant_id
    WHERE u.user_id = auth.uid()
  ));

-- Nouvelle table plans_sequence
CREATE TABLE IF NOT EXISTS plans_sequence (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id                   UUID        REFERENCES classes(id) ON DELETE CASCADE,
  unite_id                    UUID        REFERENCES unites(id)  ON DELETE SET NULL,
  enseignant_id               UUID        REFERENCES utilisateurs(id),
  titre                       TEXT        NOT NULL,
  nb_lecons                   INTEGER     DEFAULT 0,
  fil_conducteur              TEXT,
  semaine_debut               INTEGER,
  semaine_fin                 INTEGER,
  evaluation_sommative_prevue TEXT,
  contenu_json                JSONB       DEFAULT '{}',
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE plans_sequence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_plans_sequence" ON plans_sequence FOR ALL
  USING  (enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid()))
  WITH CHECK (enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid()));

-- Tables Quiz live
CREATE TABLE IF NOT EXISTS quiz (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id UUID        REFERENCES utilisateurs(id),
  classe_id     UUID        REFERENCES classes(id),
  lecon_id      UUID        REFERENCES lecons(id),
  titre         TEXT        NOT NULL,
  statut        TEXT        DEFAULT 'brouillon' CHECK (statut IN ('brouillon','actif','termine')),
  code_session  TEXT        UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions_quiz (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id        UUID        REFERENCES quiz(id) ON DELETE CASCADE,
  ordre          INTEGER     NOT NULL,
  enonce         TEXT        NOT NULL,
  type           TEXT        DEFAULT 'qcm' CHECK (type IN ('qcm','vrai_faux','reponse_courte')),
  options        JSONB       DEFAULT '[]',
  bonne_reponse  TEXT,
  points         INTEGER     DEFAULT 100,
  duree_secondes INTEGER     DEFAULT 20
);

CREATE TABLE IF NOT EXISTS sessions_quiz (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id           UUID        REFERENCES quiz(id),
  question_actuelle INTEGER     DEFAULT 0,
  statut            TEXT        DEFAULT 'attente' CHECK (statut IN ('attente','en_cours','termine')),
  started_at        TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS participants_quiz (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID        REFERENCES sessions_quiz(id) ON DELETE CASCADE,
  pseudo     TEXT        NOT NULL,
  score      INTEGER     DEFAULT 0,
  joined_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reponses_quiz (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID        REFERENCES sessions_quiz(id),
  participant_id   UUID        REFERENCES participants_quiz(id),
  question_id      UUID        REFERENCES questions_quiz(id),
  reponse          TEXT,
  est_correcte     BOOLEAN,
  points_gagnes    INTEGER     DEFAULT 0,
  temps_reponse_ms INTEGER,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE quiz              ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions_quiz    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions_quiz     ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants_quiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE reponses_quiz     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_quiz" ON quiz FOR ALL
  USING  (enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid()))
  WITH CHECK (enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid()));

CREATE POLICY "public_read_sessions"       ON sessions_quiz     FOR SELECT USING (true);
CREATE POLICY "public_insert_participants" ON participants_quiz  FOR INSERT WITH CHECK (true);
CREATE POLICY "public_insert_reponses"     ON reponses_quiz     FOR INSERT WITH CHECK (true);
CREATE POLICY "user_read_reponses"         ON reponses_quiz     FOR SELECT
  USING (session_id IN (
    SELECT s.id FROM sessions_quiz s
    JOIN quiz q ON q.id = s.quiz_id
    JOIN utilisateurs u ON u.id = q.enseignant_id
    WHERE u.user_id = auth.uid()
  ));

-- Storage RLS (bucket ressources)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='user_own_files'
  ) THEN
    CREATE POLICY "user_own_files" ON storage.objects FOR ALL
      USING    (bucket_id='ressources' AND auth.uid()::text=(storage.foldername(name))[1])
      WITH CHECK (bucket_id='ressources' AND auth.uid()::text=(storage.foldername(name))[1]);
  END IF;
END $$;
