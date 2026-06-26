-- ─── 013 — Multi-matières : dossiers par matière ────────────────────────────

-- Colonnes supplémentaires sur dossiers_systeme
ALTER TABLE dossiers_systeme
  ADD COLUMN IF NOT EXISTS matiere    TEXT;

ALTER TABLE dossiers_systeme
  ADD COLUMN IF NOT EXISTS est_commun BOOLEAN DEFAULT false;

-- ─── Trigger multi-matières ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION creer_dossiers_classe()
RETURNS TRIGGER AS $$
DECLARE
  v_ens_id  UUID;
  d_matiere UUID;
BEGIN
  v_ens_id := NEW.enseignant_id;

  -- Dossiers COMMUNS (une seule fois par classe)
  INSERT INTO dossiers_systeme
    (classe_id, enseignant_id, nom, type, icone, couleur, ordre, est_commun)
  VALUES
    (NEW.id, v_ens_id, 'Élèves',        'eleves',          '👥',    '#34D399', 10, true),
    (NEW.id, v_ens_id, 'Administration', 'administration',  '🗂️',   '#94A3B8', 11, true),
    (NEW.id, v_ens_id, 'Parents',        'parents',         '👨‍👩‍👧', '#F472B6', 12, true),
    (NEW.id, v_ens_id, 'Événements',     'evenements',      '🎉',    '#FB923C', 13, true);

  -- Dossiers PAR MATIÈRE (matière principale)
  IF NEW.matiere IS NOT NULL THEN
    INSERT INTO dossiers_systeme
      (classe_id, enseignant_id, nom, type, icone, couleur, ordre, matiere)
    VALUES
      (NEW.id, v_ens_id, NEW.matiere, 'matiere', '📚', '#7F77DD', 1, NEW.matiere)
    RETURNING id INTO d_matiere;

    INSERT INTO dossiers_systeme
      (classe_id, enseignant_id, parent_id, nom, type, icone, couleur, ordre, matiere)
    VALUES
      (NEW.id, v_ens_id, d_matiere, 'Préparation',              'preparation',            '📋', '#7F77DD', 1, NEW.matiere),
      (NEW.id, v_ens_id, d_matiere, 'Leçons',                   'lecons',                 '✨', '#EF9F27', 2, NEW.matiere),
      (NEW.id, v_ens_id, d_matiere, 'Évaluations sommatives',   'evaluations_sommatives', '📊', '#F87171', 3, NEW.matiere),
      (NEW.id, v_ens_id, d_matiere, 'Ressources',               'ressources',             '📚', '#60A5FA', 4, NEW.matiere);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_creer_dossiers ON classes;
CREATE TRIGGER trigger_creer_dossiers
  AFTER INSERT ON classes
  FOR EACH ROW
  EXECUTE FUNCTION creer_dossiers_classe();

-- ─── Fonction utilitaire : ajouter une matière à une classe existante ─────────

CREATE OR REPLACE FUNCTION ajouter_matiere_classe(
  p_classe_id     UUID,
  p_enseignant_id UUID,
  p_matiere       TEXT,
  p_couleur       TEXT DEFAULT '#7F77DD'
)
RETURNS UUID AS $$
DECLARE
  d_matiere UUID;
BEGIN
  INSERT INTO dossiers_systeme
    (classe_id, enseignant_id, nom, type, icone, couleur, ordre, matiere)
  VALUES
    (p_classe_id, p_enseignant_id, p_matiere, 'matiere', '📚', p_couleur,
     COALESCE((SELECT MAX(ordre) FROM dossiers_systeme
               WHERE classe_id = p_classe_id AND parent_id IS NULL AND NOT est_commun), 0) + 1,
     p_matiere)
  RETURNING id INTO d_matiere;

  INSERT INTO dossiers_systeme
    (classe_id, enseignant_id, parent_id, nom, type, icone, couleur, ordre, matiere)
  VALUES
    (p_classe_id, p_enseignant_id, d_matiere, 'Préparation',            'preparation',            '📋', '#7F77DD', 1, p_matiere),
    (p_classe_id, p_enseignant_id, d_matiere, 'Leçons',                 'lecons',                 '✨', '#EF9F27', 2, p_matiere),
    (p_classe_id, p_enseignant_id, d_matiere, 'Évaluations sommatives', 'evaluations_sommatives', '📊', '#F87171', 3, p_matiere),
    (p_classe_id, p_enseignant_id, d_matiere, 'Ressources',             'ressources',             '📚', '#60A5FA', 4, p_matiere);

  UPDATE classes
  SET matieres = array_append(COALESCE(matieres, ARRAY[]::TEXT[]), p_matiere)
  WHERE id = p_classe_id;

  RETURN d_matiere;
END;
$$ LANGUAGE plpgsql;
