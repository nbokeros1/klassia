-- ─── 020 — Corriger le trigger creer_dossiers_classe ────────────────────────
-- Le trigger de migration 013 ne créait pas les sous-dossiers de Préparation
-- (Curriculum, Plan annuel, Plans de leçons). Cette migration :
--   1. Corrige le trigger pour les nouvelles classes
--   2. Backfille les classes existantes ayant une Préparation sans sous-dossiers

-- ── 1. Trigger corrigé ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION creer_dossiers_classe()
RETURNS TRIGGER AS $$
DECLARE
  v_ens_id  UUID;
  d_matiere UUID;
  d_prep    UUID;
BEGIN
  v_ens_id := NEW.enseignant_id;

  -- Dossiers COMMUNS (indépendants de la matière)
  INSERT INTO dossiers_systeme
    (classe_id, enseignant_id, nom, type, icone, couleur, ordre, est_commun)
  VALUES
    (NEW.id, v_ens_id, 'Élèves',         'eleves',          '👥',    '#34D399', 10, true),
    (NEW.id, v_ens_id, 'Administration',  'administration',  '🗂️',   '#94A3B8', 11, true),
    (NEW.id, v_ens_id, 'Parents',         'parents',         '👨‍👩‍👧', '#F472B6', 12, true),
    (NEW.id, v_ens_id, 'Événements',      'evenements',      '🎉',    '#FB923C', 13, true);

  -- Dossiers PAR MATIÈRE
  IF NEW.matiere IS NOT NULL THEN

    -- Conteneur matière (racine)
    INSERT INTO dossiers_systeme
      (classe_id, enseignant_id, nom, type, icone, couleur, ordre, matiere)
    VALUES
      (NEW.id, v_ens_id, NEW.matiere, 'matiere', '📚', '#7F77DD', 1, NEW.matiere)
    RETURNING id INTO d_matiere;

    -- Préparation (sous le conteneur matière)
    INSERT INTO dossiers_systeme
      (classe_id, enseignant_id, parent_id, nom, type, icone, couleur, ordre, matiere)
    VALUES
      (NEW.id, v_ens_id, d_matiere, 'Préparation', 'preparation', '📋', '#7F77DD', 1, NEW.matiere)
    RETURNING id INTO d_prep;

    -- Sous-dossiers de Préparation
    INSERT INTO dossiers_systeme
      (classe_id, enseignant_id, parent_id, nom, type, icone, couleur, ordre, matiere)
    VALUES
      (NEW.id, v_ens_id, d_prep, 'Curriculum',      'curriculum',   '📄', '#378ADD', 1, NEW.matiere),
      (NEW.id, v_ens_id, d_prep, 'Plan annuel',      'plan_annuel',  '📅', '#1D9E75', 2, NEW.matiere),
      (NEW.id, v_ens_id, d_prep, 'Plans de leçons',  'plans_lecons', '📝', '#EF9F27', 3, NEW.matiere);

    -- Autres dossiers de la matière (frères de Préparation)
    INSERT INTO dossiers_systeme
      (classe_id, enseignant_id, parent_id, nom, type, icone, couleur, ordre, matiere)
    VALUES
      (NEW.id, v_ens_id, d_matiere, 'Leçons',                 'lecons',                '✨', '#EF9F27', 2, NEW.matiere),
      (NEW.id, v_ens_id, d_matiere, 'Évaluations sommatives', 'evaluations_sommatives', '📊', '#F87171', 3, NEW.matiere),
      (NEW.id, v_ens_id, d_matiere, 'Ressources',             'ressources',             '📚', '#60A5FA', 4, NEW.matiere);

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_creer_dossiers ON classes;
CREATE TRIGGER trigger_creer_dossiers
  AFTER INSERT ON classes
  FOR EACH ROW
  EXECUTE FUNCTION creer_dossiers_classe();

-- ── 2. Backfill : ajouter les sous-dossiers manquants aux Préparation existants ──
-- Cible : tout dossier nom='Préparation' qui n'a pas encore 'Plans de leçons' enfant.

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT d.id       AS prep_id,
           d.classe_id,
           d.enseignant_id,
           d.matiere
    FROM   dossiers_systeme d
    WHERE  d.nom  = 'Préparation'
    AND    d.type = 'preparation'
    AND    NOT EXISTS (
      SELECT 1
      FROM   dossiers_systeme sub
      WHERE  sub.parent_id = d.id
      AND    sub.nom = 'Plans de leçons'
    )
  LOOP
    INSERT INTO dossiers_systeme
      (classe_id, enseignant_id, parent_id, nom, type, icone, couleur, ordre, matiere)
    VALUES
      (rec.classe_id, rec.enseignant_id, rec.prep_id, 'Curriculum',     'curriculum',   '📄', '#378ADD', 1, rec.matiere),
      (rec.classe_id, rec.enseignant_id, rec.prep_id, 'Plan annuel',    'plan_annuel',  '📅', '#1D9E75', 2, rec.matiere),
      (rec.classe_id, rec.enseignant_id, rec.prep_id, 'Plans de leçons','plans_lecons', '📝', '#EF9F27', 3, rec.matiere)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;
