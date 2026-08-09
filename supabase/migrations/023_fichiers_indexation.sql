-- ── 023 — Créer fichiers_indexation (Document Context Engine — Phase 1) ──────
--
-- Cette table est la couche d'extraction brute du Document Context Engine.
-- Elle stocke l'état et le résultat du traitement de chaque fichier (texte
-- extrait, pages, erreurs). Elle ne remplace pas fichiers_dossier, elle
-- l'enrichit avec les données nécessaires à l'injection dans le contexte IA.
--
-- Relation : 1–1 avec fichiers_dossier (UNIQUE sur fichier_id).
-- Cycle de vie : créée lors de l'upload ou de la sauvegarde d'un document IA,
-- mise à jour par le pipeline d'extraction (Phase 2).
--
-- Statuts :
--   en_attente  : ligne créée, extraction pas encore lancée
--   traitement  : extraction en cours
--   indexe      : texte disponible dans texte_extrait
--   echec       : extraction échouée (voir colonne erreur)
--   non_supporte: format non pris en charge par le pipeline

-- ── 1. Table ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fichiers_indexation (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fichier_id         UUID        NOT NULL UNIQUE
                                 REFERENCES fichiers_dossier(id) ON DELETE CASCADE,
  enseignant_id      UUID        NOT NULL
                                 REFERENCES utilisateurs(id) ON DELETE CASCADE,
  mime_type          TEXT,
  statut             TEXT        NOT NULL DEFAULT 'en_attente'
                                 CHECK (statut IN (
                                   'en_attente', 'traitement', 'indexe', 'echec', 'non_supporte'
                                 )),
  texte_extrait      TEXT,
  nb_pages           INTEGER,
  nb_slides          INTEGER,
  nb_feuilles        INTEGER,
  erreur             TEXT,
  version_extracteur TEXT,
  processed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Index ──────────────────────────────────────────────────────────────────

-- Recherche par enseignant (utilisé par les requêtes de contexte dans assistant/route.ts)
CREATE INDEX IF NOT EXISTS idx_fichiers_indexation_enseignant_id
  ON fichiers_indexation (enseignant_id);

-- Recherche par statut (utilisé par le cron d'extraction pour traiter les 'en_attente')
CREATE INDEX IF NOT EXISTS idx_fichiers_indexation_statut
  ON fichiers_indexation (statut);

-- ── 3. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE fichiers_indexation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_fichiers_indexation" ON fichiers_indexation;
CREATE POLICY "user_own_fichiers_indexation"
  ON fichiers_indexation FOR ALL
  USING (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ))
  WITH CHECK (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON fichiers_indexation TO authenticated;

-- ── 4. Trigger updated_at ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_fichiers_indexation_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fichiers_indexation_updated_at ON fichiers_indexation;
CREATE TRIGGER trg_fichiers_indexation_updated_at
  BEFORE UPDATE ON fichiers_indexation
  FOR EACH ROW EXECUTE FUNCTION update_fichiers_indexation_updated_at();

-- ── 5. Backfill — documents générés par KlassIA ────────────────────────────────
--
-- Les documents ayant déjà contenu_html (générés par l'IA) peuvent être
-- immédiatement indexés : le texte est disponible, pas d'extraction nécessaire.
-- On utilise 'html-direct-1.0' comme version_extracteur pour tracer l'origine.
-- ON CONFLICT (fichier_id) DO NOTHING garantit l'idempotence complète.

INSERT INTO fichiers_indexation (
  fichier_id,
  enseignant_id,
  mime_type,
  statut,
  texte_extrait,
  version_extracteur,
  processed_at
)
SELECT
  fd.id,
  fd.enseignant_id,
  'text/markdown',
  'indexe',
  fd.contenu_html,
  'html-direct-1.0',
  now()
FROM fichiers_dossier fd
WHERE fd.contenu_html IS NOT NULL
  AND fd.contenu_html <> ''
ON CONFLICT (fichier_id) DO NOTHING;