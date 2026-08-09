-- ── 021 — Uniformiser le nom 'Évaluations sommatives' ───────────────────────
-- Problème : le RPC ajouter_matiere_classe() créait 'Évaluations' (sans suffixe)
-- alors que le trigger creer_dossiers_classe et le mapping DOSSIER_PAR_TYPE_CONTENU
-- utilisent 'Évaluations sommatives'. Cela causait des échecs silencieux
-- lors de l'auto-sauvegarde depuis Préparer.
--
-- Cette migration :
--   1. Corrige le RPC pour les nouvelles matières
--   2. Backfille les dossiers déjà créés avec le mauvais nom

-- ── 1. RPC corrigé ────────────────────────────────────────────────────────────

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

  -- Leçons, Évaluations sommatives, Ressources sous la matière
  INSERT INTO dossiers_systeme (id, classe_id, enseignant_id, nom, type, icone, couleur, ordre, parent_id, est_commun, matiere)
  VALUES
    (gen_random_uuid(), p_classe_id, p_enseignant_id, 'Leçons',                 'lecons',                '🎓', p_couleur, 2, v_matiere_id, FALSE, p_matiere),
    (gen_random_uuid(), p_classe_id, p_enseignant_id, 'Évaluations sommatives', 'evaluations_sommatives', '📊', p_couleur, 3, v_matiere_id, FALSE, p_matiere),
    (gen_random_uuid(), p_classe_id, p_enseignant_id, 'Ressources',             'ressources',             '📚', p_couleur, 4, v_matiere_id, FALSE, p_matiere);

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

-- ── 2. Backfill — corriger les dossiers existants ─────────────────────────────
-- Cible : tout dossier nommé 'Évaluations' dont le type est 'evaluations_sommatives'.
-- Le type est la source de vérité ; seul le nom affiché est incorrect.

UPDATE dossiers_systeme
SET nom = 'Évaluations sommatives'
WHERE nom = 'Évaluations'
  AND type = 'evaluations_sommatives';
