-- Migration 011 — Multi-matières par classe
-- Ajoute classes.matieres TEXT[] pour les enseignants pluridisciplinaires

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS matieres TEXT[] DEFAULT '{}';

-- Migrer les données existantes : si matiere est renseigné → peupler matieres
UPDATE classes
  SET matieres = ARRAY[matiere]
  WHERE matiere IS NOT NULL
    AND matiere <> ''
    AND (matieres IS NULL OR matieres = '{}');

COMMENT ON COLUMN classes.matieres IS 'Liste des matières enseignées dans cette classe (ex: {Maths, Français})';

-- Ajoute est_commun et matiere sur dossiers_systeme pour le classement multi-matières
ALTER TABLE dossiers_systeme
  ADD COLUMN IF NOT EXISTS est_commun BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS matiere TEXT;

-- Les dossiers Élèves/Ressources/Administration/Parents/Événements sont communs
UPDATE dossiers_systeme
  SET est_commun = true
  WHERE type IN ('eleves', 'ressources', 'administration', 'parents', 'evenements');

COMMENT ON COLUMN dossiers_systeme.est_commun IS 'true = dossier commun (élèves, ressources...) visible pour toutes matières';
COMMENT ON COLUMN dossiers_systeme.matiere     IS 'Matière à laquelle ce dossier appartient (null = tous)';
