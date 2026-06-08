-- KlassIA — Migration 002 : RLS sur les nouvelles tables (SECURITE URGENTE)
-- A executer dans Supabase Dashboard > SQL Editor
-- Contexte : les tables creees dans 001 avaient RLS desactive par defaut.

-- Activer RLS sur toutes les nouvelles tables
ALTER TABLE plans_sequence    ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz               ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions_quiz     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions_quiz      ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants_quiz  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reponses_quiz      ENABLE ROW LEVEL SECURITY;

-- Policies plans_sequence
DROP POLICY IF EXISTS "user_own_plans_sequence" ON plans_sequence;
CREATE POLICY "user_own_plans_sequence" ON plans_sequence FOR ALL
  USING (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ))
  WITH CHECK (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

-- Policies quiz
DROP POLICY IF EXISTS "user_own_quiz" ON quiz;
CREATE POLICY "user_own_quiz" ON quiz FOR ALL
  USING (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ))
  WITH CHECK (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

-- Policies questions_quiz (via quiz.enseignant_id)
DROP POLICY IF EXISTS "user_own_questions_quiz" ON questions_quiz;
CREATE POLICY "user_own_questions_quiz" ON questions_quiz FOR ALL
  USING (quiz_id IN (
    SELECT id FROM quiz
    WHERE enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  ))
  WITH CHECK (quiz_id IN (
    SELECT id FROM quiz
    WHERE enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  ));

-- Policies sessions_quiz (via quiz.enseignant_id)
DROP POLICY IF EXISTS "user_own_sessions_quiz" ON sessions_quiz;
CREATE POLICY "user_own_sessions_quiz" ON sessions_quiz FOR ALL
  USING (quiz_id IN (
    SELECT id FROM quiz
    WHERE enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  ));

-- participants_quiz : public peut rejoindre une session, enseignant peut lire ses participants
DROP POLICY IF EXISTS "public_join_quiz"               ON participants_quiz;
DROP POLICY IF EXISTS "enseignant_read_participants"   ON participants_quiz;
CREATE POLICY "public_join_quiz" ON participants_quiz FOR INSERT
  WITH CHECK (true);
CREATE POLICY "enseignant_read_participants" ON participants_quiz FOR SELECT
  USING (session_id IN (
    SELECT s.id FROM sessions_quiz s
    JOIN quiz q ON q.id = s.quiz_id
    JOIN utilisateurs u ON u.id = q.enseignant_id
    WHERE u.user_id = auth.uid()
  ));

-- reponses_quiz : public peut repondre, enseignant peut lire ses reponses
DROP POLICY IF EXISTS "public_insert_reponses_quiz"    ON reponses_quiz;
DROP POLICY IF EXISTS "enseignant_read_reponses_quiz"  ON reponses_quiz;
CREATE POLICY "public_insert_reponses_quiz" ON reponses_quiz FOR INSERT
  WITH CHECK (true);
CREATE POLICY "enseignant_read_reponses_quiz" ON reponses_quiz FOR SELECT
  USING (session_id IN (
    SELECT s.id FROM sessions_quiz s
    JOIN quiz q ON q.id = s.quiz_id
    JOIN utilisateurs u ON u.id = q.enseignant_id
    WHERE u.user_id = auth.uid()
  ));
