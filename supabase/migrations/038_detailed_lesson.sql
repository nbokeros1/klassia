-- ─── Migration 038 — Leçon détaillée SPIE-BETA-03 ───────────────────────────
-- Ajout du support pour stocker la DetailedLesson JSON dans fichiers_dossier
-- et tracking du lien leçon détaillée → leçon Enseigner

BEGIN;

-- ── 1. Colonne contenu_json sur fichiers_dossier ──────────────────────────────
-- Stocke la DetailedLesson en JSONB pour les fichiers de type 'lecon_detaillee'
ALTER TABLE fichiers_dossier
  ADD COLUMN IF NOT EXISTS contenu_json JSONB;

-- ── 2. Tracking leçon détaillée dans teaching_packs ──────────────────────────
ALTER TABLE teaching_packs
  ADD COLUMN IF NOT EXISTS lecon_detaillee_id     UUID REFERENCES fichiers_dossier(id),
  ADD COLUMN IF NOT EXISTS lecon_detaillee_statut TEXT DEFAULT 'non_generee';

-- ── 3. Lien leçon DB → fichier détaillé dans lecons ─────────────────────────
ALTER TABLE lecons
  ADD COLUMN IF NOT EXISTS detailed_lesson_id UUID REFERENCES fichiers_dossier(id),
  ADD COLUMN IF NOT EXISTS source_teaching_pack_id UUID REFERENCES teaching_packs(id);

-- ── 4. Index pour les lookups fréquents ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fichiers_dossier_teaching_pack
  ON fichiers_dossier(teaching_pack_id)
  WHERE teaching_pack_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fichiers_dossier_type_lecon
  ON fichiers_dossier(type_fichier)
  WHERE type_fichier IN ('lecon_detaillee', 'lecon_complete');

-- ── 5. RLS — contenu_json hérite des politiques existantes de fichiers_dossier
-- (aucune politique supplémentaire nécessaire)

-- ── 6. Journalisation SPIE (observabilité) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS spie_access_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,
  teaching_pack_id UUID REFERENCES teaching_packs(id),
  fichier_id      UUID REFERENCES fichiers_dossier(id),
  statut          TEXT NOT NULL DEFAULT 'ok',
  details_json    JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spie_access_log_enseignant
  ON spie_access_log(enseignant_id, created_at DESC);

-- RLS sur spie_access_log
ALTER TABLE spie_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY spie_access_log_own ON spie_access_log
  USING (enseignant_id = auth.uid());

CREATE POLICY spie_access_log_admin ON spie_access_log
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'enwaha22@gmail.com'
  );

COMMIT;
