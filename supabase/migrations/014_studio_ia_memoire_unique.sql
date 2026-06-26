-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 014 — studio_ia_memoire : contrainte unique pour upsert
-- Nécessaire car l'upsert onConflict=enseignant_id,cle,type retourne 400
-- si l'index unique n'existe pas encore (migration 010 peut avoir échoué
-- partiellement sur d'autres ALTER TABLE avant d'atteindre ce CREATE INDEX).
-- ══════════════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS idx_studio_ia_memoire_unique
  ON studio_ia_memoire (enseignant_id, cle, type);
