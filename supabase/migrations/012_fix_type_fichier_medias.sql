-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 012 — fichiers_dossier.type_fichier doit accepter les médias importés
-- (photo, vidéo, document, pdf, audio) en plus des types de contenu pédagogique.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE fichiers_dossier DROP CONSTRAINT IF EXISTS fichiers_dossier_type_fichier_check;

ALTER TABLE fichiers_dossier ADD CONSTRAINT fichiers_dossier_type_fichier_check CHECK (type_fichier IN (
  'curriculum','plan_annuel','plan_lecon',
  'lecon_complete','activite','devoir','quiz',
  'evaluation_sommative','ressource','communication',
  'courrier','rapport','note','autre',
  'image','video','audio','document','pdf'
));
