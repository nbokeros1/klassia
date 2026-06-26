-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 010 — Corrections critiques (post-audit)
-- Recrée dossiers_systeme + fichiers_dossier (droppés par 009)
-- Colonnes manquantes, index unique, trigger classes
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Recréer dossiers_systeme ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dossiers_systeme (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id     UUID        REFERENCES classes(id)        ON DELETE CASCADE,
  enseignant_id UUID        REFERENCES utilisateurs(id),
  parent_id     UUID        REFERENCES dossiers_systeme(id) ON DELETE CASCADE,
  nom           TEXT        NOT NULL,
  type          TEXT        NOT NULL CHECK (type IN (
    'preparation','curriculum','plan_annuel','plans_lecons',
    'sequence','lecons','lecon','evaluations_sommatives',
    'eleves','ressources','administration','parents',
    'evenements','custom'
  )),
  icone         TEXT        DEFAULT '📁',
  couleur       TEXT        DEFAULT '#7F77DD',
  ordre         INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── 2. Recréer fichiers_dossier ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fichiers_dossier (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id         UUID        REFERENCES dossiers_systeme(id) ON DELETE CASCADE,
  classe_id          UUID        REFERENCES classes(id)          ON DELETE CASCADE,
  enseignant_id      UUID        REFERENCES utilisateurs(id),
  nom                TEXT        NOT NULL,
  nom_auto           TEXT,
  type_fichier       TEXT        CHECK (type_fichier IN (
    'curriculum','plan_annuel','plan_lecon',
    'lecon_complete','activite','devoir','quiz',
    'evaluation_sommative','ressource','communication',
    'courrier','rapport','note','autre'
  )),
  contenu_html       TEXT,
  contenu_json       JSONB       DEFAULT '{}',
  statut             TEXT        DEFAULT 'brouillon' CHECK (statut IN (
    'brouillon','valide','enseigne','archive'
  )),
  url_storage        TEXT,
  taille_bytes       INTEGER,
  duree_minutes      INTEGER,
  niveau_difficulte  TEXT        CHECK (niveau_difficulte IN ('facile','moyen','difficile')),
  feedback_note      INTEGER     CHECK (feedback_note BETWEEN 1 AND 5),
  nb_utilisations    INTEGER     DEFAULT 0,
  lecon_id           UUID        REFERENCES lecons(id)           ON DELETE SET NULL,
  sequence_id        UUID        REFERENCES plans_sequence(id)   ON DELETE SET NULL,
  indexe_studio_ia   BOOLEAN     DEFAULT true,
  lien_partage       TEXT        UNIQUE,
  partage_actif      BOOLEAN     DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- ── 3. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE dossiers_systeme ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichiers_dossier ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_dossiers_systeme" ON dossiers_systeme;
CREATE POLICY "user_own_dossiers_systeme"
  ON dossiers_systeme FOR ALL
  USING (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ))
  WITH CHECK (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "user_own_fichiers_dossier" ON fichiers_dossier;
CREATE POLICY "user_own_fichiers_dossier"
  ON fichiers_dossier FOR ALL
  USING (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ))
  WITH CHECK (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON dossiers_systeme TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fichiers_dossier TO authenticated;

-- ── 4. Colonnes manquantes ────────────────────────────────────────────────────

ALTER TABLE cours_semaine
  ADD COLUMN IF NOT EXISTS recurrent BOOLEAN DEFAULT false;

ALTER TABLE lecons
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE quiz
  ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]';

-- ── 5. Index UNIQUE studio_ia_memoire ─────────────────────────────────────────
-- La colonne clé dans studio_ia_memoire est "cle" (pas "titre")

CREATE UNIQUE INDEX IF NOT EXISTS idx_studio_ia_memoire_unique
  ON studio_ia_memoire (enseignant_id, cle, type);

-- ── 6. Colonnes admin utilisateurs ───────────────────────────────────────────

ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS code_admin TEXT UNIQUE;

UPDATE utilisateurs
  SET code_admin = 'KLASSIA_ADMIN_2026',
      forfait    = 'institution',
      is_admin   = true
  WHERE email = 'enwaha22@gmail.com';

-- ── 7. Trigger création dossiers à l'ajout d'une classe ──────────────────────

CREATE OR REPLACE FUNCTION creer_dossiers_classe()
RETURNS TRIGGER AS $$
DECLARE
  v_ens_id UUID;
  d_prep   UUID;
  d_lecons UUID;
BEGIN
  v_ens_id := NEW.enseignant_id;

  INSERT INTO dossiers_systeme
    (classe_id, enseignant_id, nom, type, icone, couleur, ordre)
  VALUES
    (NEW.id, v_ens_id, 'Préparation', 'preparation', '📚', '#7F77DD', 1)
  RETURNING id INTO d_prep;

  INSERT INTO dossiers_systeme
    (classe_id, enseignant_id, parent_id, nom, type, icone, couleur, ordre)
  VALUES
    (NEW.id, v_ens_id, d_prep, 'Curriculum',     'curriculum',    '📄', '#378ADD', 1),
    (NEW.id, v_ens_id, d_prep, 'Plan annuel',    'plan_annuel',   '📅', '#1D9E75', 2),
    (NEW.id, v_ens_id, d_prep, 'Plans de leçons','plans_lecons',  '📝', '#EF9F27', 3);

  INSERT INTO dossiers_systeme
    (classe_id, enseignant_id, nom, type, icone, couleur, ordre)
  VALUES
    (NEW.id, v_ens_id, 'Leçons', 'lecons', '✨', '#A78BFA', 2)
  RETURNING id INTO d_lecons;

  INSERT INTO dossiers_systeme
    (classe_id, enseignant_id, nom, type, icone, couleur, ordre)
  VALUES
    (NEW.id, v_ens_id, 'Évaluations sommatives', 'evaluations_sommatives', '📊', '#F87171', 3),
    (NEW.id, v_ens_id, 'Élèves',                 'eleves',                 '👥', '#34D399', 4),
    (NEW.id, v_ens_id, 'Ressources',              'ressources',             '📚', '#60A5FA', 5),
    (NEW.id, v_ens_id, 'Administration',          'administration',         '🗂️', '#94A3B8', 6),
    (NEW.id, v_ens_id, 'Parents',                 'parents',                '👨‍👩‍👧', '#F472B6', 7),
    (NEW.id, v_ens_id, 'Événements',              'evenements',             '🎉', '#FB923C', 8);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_creer_dossiers ON classes;
CREATE TRIGGER trigger_creer_dossiers
  AFTER INSERT ON classes
  FOR EACH ROW
  EXECUTE FUNCTION creer_dossiers_classe();

-- ── 8. Créer les dossiers pour les classes existantes sans dossiers ───────────

DO $$
DECLARE
  c        RECORD;
  v_ens_id UUID;
  d_prep   UUID;
  d_lecons UUID;
BEGIN
  FOR c IN SELECT * FROM classes LOOP
    IF NOT EXISTS (
      SELECT 1 FROM dossiers_systeme WHERE classe_id = c.id
    ) THEN
      v_ens_id := c.enseignant_id;

      INSERT INTO dossiers_systeme
        (classe_id, enseignant_id, nom, type, icone, couleur, ordre)
      VALUES
        (c.id, v_ens_id, 'Préparation', 'preparation', '📚', '#7F77DD', 1)
      RETURNING id INTO d_prep;

      INSERT INTO dossiers_systeme
        (classe_id, enseignant_id, parent_id, nom, type, icone, couleur, ordre)
      VALUES
        (c.id, v_ens_id, d_prep, 'Curriculum',      'curriculum',   '📄', '#378ADD', 1),
        (c.id, v_ens_id, d_prep, 'Plan annuel',     'plan_annuel',  '📅', '#1D9E75', 2),
        (c.id, v_ens_id, d_prep, 'Plans de leçons', 'plans_lecons', '📝', '#EF9F27', 3);

      INSERT INTO dossiers_systeme
        (classe_id, enseignant_id, nom, type, icone, couleur, ordre)
      VALUES
        (c.id, v_ens_id, 'Leçons', 'lecons', '✨', '#A78BFA', 2)
      RETURNING id INTO d_lecons;

      INSERT INTO dossiers_systeme
        (classe_id, enseignant_id, nom, type, icone, couleur, ordre)
      VALUES
        (c.id, v_ens_id, 'Évaluations sommatives', 'evaluations_sommatives', '📊', '#F87171', 3),
        (c.id, v_ens_id, 'Élèves',                 'eleves',                 '👥', '#34D399', 4),
        (c.id, v_ens_id, 'Ressources',              'ressources',             '📚', '#60A5FA', 5),
        (c.id, v_ens_id, 'Administration',          'administration',         '🗂️', '#94A3B8', 6),
        (c.id, v_ens_id, 'Parents',                 'parents',                '👨‍👩‍👧', '#F472B6', 7),
        (c.id, v_ens_id, 'Événements',              'evenements',             '🎉', '#FB923C', 8);
    END IF;
  END LOOP;
END $$;
