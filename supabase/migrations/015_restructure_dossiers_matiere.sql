-- Migration 015: Restructure dossiers sous conteneurs matière + RPC ajouter_matiere_classe
-- Règle : Créer d'abord, migrer ensuite — aucune donnée perdue.

BEGIN;

-- 1. S'assurer que toutes les colonnes requises existent (idempotent)
ALTER TABLE dossiers_systeme
  ADD COLUMN IF NOT EXISTS est_commun BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS matiere    TEXT;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS matieres TEXT[] DEFAULT '{}';

-- 1b. Étendre le CHECK constraint pour autoriser le type 'matiere'
ALTER TABLE dossiers_systeme
  DROP CONSTRAINT IF EXISTS dossiers_systeme_type_check;

ALTER TABLE dossiers_systeme
  ADD CONSTRAINT dossiers_systeme_type_check CHECK (type IN (
    'preparation','curriculum','plan_annuel','plans_lecons',
    'sequence','lecons','lecon','evaluations_sommatives',
    'eleves','ressources','administration','parents',
    'evenements','custom','matiere'
  ));

-- 2. Marquer les dossiers communs (Élèves, Admin, Parents, Événements)
UPDATE dossiers_systeme
SET est_commun = TRUE
WHERE type IN ('eleves', 'administration', 'parents', 'evenements')
  AND (est_commun IS NULL OR est_commun = FALSE);

-- 3. Pour chaque classe, créer le conteneur matière et déplacer les dossiers pédagogiques
DO $$
DECLARE
  rec           RECORD;
  v_matiere_nom TEXT;
  v_matiere_id  UUID;
BEGIN
  FOR rec IN
    SELECT DISTINCT c.id AS classe_id, c.enseignant_id, c.matiere, c.couleur
    FROM classes c
    WHERE EXISTS (
      SELECT 1 FROM dossiers_systeme d
      WHERE d.classe_id = c.id
        AND d.parent_id IS NULL
        AND (d.est_commun IS NULL OR d.est_commun = FALSE)
        AND d.type NOT IN ('matiere', 'eleves', 'administration', 'parents', 'evenements')
    )
  LOOP
    v_matiere_nom := COALESCE(NULLIF(TRIM(rec.matiere), ''), 'Général');

    -- Vérifier si le conteneur matière existe déjà
    SELECT id INTO v_matiere_id
    FROM dossiers_systeme
    WHERE classe_id = rec.classe_id
      AND type = 'matiere'
      AND nom = v_matiere_nom
      AND parent_id IS NULL
    LIMIT 1;

    -- Créer le conteneur matière si absent
    IF v_matiere_id IS NULL THEN
      INSERT INTO dossiers_systeme (
        id, classe_id, enseignant_id, nom, type, icone, couleur, ordre, parent_id, est_commun, matiere
      ) VALUES (
        gen_random_uuid(), rec.classe_id, rec.enseignant_id, v_matiere_nom,
        'matiere', '📚', COALESCE(rec.couleur, '#6C5CE7'), 0, NULL, FALSE, v_matiere_nom
      )
      RETURNING id INTO v_matiere_id;
    END IF;

    -- Déplacer les dossiers pédagogiques racine sous le conteneur matière
    UPDATE dossiers_systeme
    SET parent_id = v_matiere_id,
        matiere   = v_matiere_nom
    WHERE classe_id = rec.classe_id
      AND parent_id IS NULL
      AND (est_commun IS NULL OR est_commun = FALSE)
      AND type NOT IN ('matiere', 'eleves', 'administration', 'parents', 'evenements');
  END LOOP;
END;
$$;

-- 4. Fonction RPC pour ajouter une matière avec tous ses sous-dossiers
CREATE OR REPLACE FUNCTION ajouter_matiere_classe(
  p_classe_id      UUID,
  p_enseignant_id  UUID,
  p_matiere        TEXT,
  p_couleur        TEXT DEFAULT '#6C5CE7'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matiere_id UUID;
  v_prep_id    UUID;
  v_ordre      INT;
BEGIN
  -- Vérifier que la matière n'existe pas déjà pour cette classe
  SELECT id INTO v_matiere_id
  FROM dossiers_systeme
  WHERE classe_id = p_classe_id AND type = 'matiere' AND nom = p_matiere AND parent_id IS NULL
  LIMIT 1;

  IF v_matiere_id IS NOT NULL THEN
    RAISE EXCEPTION 'La matière "%" existe déjà dans cette classe', p_matiere;
  END IF;

  -- Ordre du nouveau conteneur
  SELECT COALESCE(MAX(ordre), -1) + 1 INTO v_ordre
  FROM dossiers_systeme
  WHERE classe_id = p_classe_id AND parent_id IS NULL AND type = 'matiere';

  -- Créer le conteneur matière
  INSERT INTO dossiers_systeme (
    id, classe_id, enseignant_id, nom, type, icone, couleur, ordre, parent_id, est_commun, matiere
  ) VALUES (
    gen_random_uuid(), p_classe_id, p_enseignant_id, p_matiere,
    'matiere', '📚', p_couleur, v_ordre, NULL, FALSE, p_matiere
  )
  RETURNING id INTO v_matiere_id;

  -- Créer Préparation
  INSERT INTO dossiers_systeme (
    id, classe_id, enseignant_id, nom, type, icone, couleur, ordre, parent_id, est_commun, matiere
  ) VALUES (
    gen_random_uuid(), p_classe_id, p_enseignant_id, 'Préparation',
    'preparation', '📝', p_couleur, 1, v_matiere_id, FALSE, p_matiere
  )
  RETURNING id INTO v_prep_id;

  -- Sous-dossiers de Préparation
  INSERT INTO dossiers_systeme (id, classe_id, enseignant_id, nom, type, icone, couleur, ordre, parent_id, est_commun, matiere)
  VALUES
    (gen_random_uuid(), p_classe_id, p_enseignant_id, 'Curriculum',      'curriculum',   '📋', p_couleur, 1, v_prep_id,    FALSE, p_matiere),
    (gen_random_uuid(), p_classe_id, p_enseignant_id, 'Plan annuel',     'plan_annuel',  '📅', p_couleur, 2, v_prep_id,    FALSE, p_matiere),
    (gen_random_uuid(), p_classe_id, p_enseignant_id, 'Plans de leçons', 'plans_lecons', '📄', p_couleur, 3, v_prep_id,    FALSE, p_matiere);

  -- Leçons, Évaluations, Ressources sous la matière
  INSERT INTO dossiers_systeme (id, classe_id, enseignant_id, nom, type, icone, couleur, ordre, parent_id, est_commun, matiere)
  VALUES
    (gen_random_uuid(), p_classe_id, p_enseignant_id, 'Leçons',      'lecons',                '🎓', p_couleur, 2, v_matiere_id, FALSE, p_matiere),
    (gen_random_uuid(), p_classe_id, p_enseignant_id, 'Évaluations', 'evaluations_sommatives', '📊', p_couleur, 3, v_matiere_id, FALSE, p_matiere),
    (gen_random_uuid(), p_classe_id, p_enseignant_id, 'Ressources',  'ressources',             '📚', p_couleur, 4, v_matiere_id, FALSE, p_matiere);

  -- Mettre à jour classes.matieres
  UPDATE classes
  SET matieres = CASE
    WHEN matieres IS NULL THEN ARRAY[p_matiere]
    WHEN p_matiere = ANY(matieres) THEN matieres
    ELSE array_append(matieres, p_matiere)
  END
  WHERE id = p_classe_id;

  RETURN v_matiere_id;
END;
$$;

COMMIT;
