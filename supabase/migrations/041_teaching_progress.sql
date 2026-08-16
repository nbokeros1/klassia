-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 041 — Teaching Events (MON-ANNEE-V5)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- STATUT : FINALISÉE — À APPLIQUER
--
-- CONTEXTE
-- ─────────────────────────────────────────────────────────────────────────
-- V4 stockait le statut d'enseignement dans programme_annuel.contenu_json
-- (champ JSONB non atomique → BUG-02 race condition, BUG-05 sur-déclaration).
--
-- V5 introduce une table teaching_events :
--   - journal immuable append-only (INSERT uniquement, pas d'UPDATE/DELETE)
--   - ferme BUG-02 : atomic INSERT remplace read→mutate→write
--   - backward compat : anciens packs V4 lisent encore le fallback JSONB
--   - multi-enseignement prévu : L1 enseignée le 14 sept. + reprise 20 sept.
--
-- TYPES D'ÉVÉNEMENTS V5
-- ─────────────────────────────────────────────────────────────────────────
--   lesson_taught           : leçon marquée enseignée
--   lesson_taught_cancelled : annulation (préserve l'historique)
--
-- IDENTITÉ D'UNE LEÇON
-- ─────────────────────────────────────────────────────────────────────────
--   teaching_pack_id + sequence_index (0-based) + lecon_index (0-based)
--   lesson_ref = "packId:sequenceIndex:lessonIndex" (redondant, requêtes rapides)
--
-- ── MIGRATION ─────────────────────────────────────────────────────────────

BEGIN;

CREATE TABLE IF NOT EXISTS teaching_events (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Acteur et contexte
  enseignant_id       UUID        NOT NULL REFERENCES utilisateurs(id)     ON DELETE CASCADE,
  classe_id           UUID        NOT NULL REFERENCES classes(id)          ON DELETE CASCADE,
  teaching_pack_id    UUID        NOT NULL REFERENCES teaching_packs(id)   ON DELETE CASCADE,
  programme_annuel_id UUID        REFERENCES programme_annuel(id)          ON DELETE SET NULL,

  -- Localisation de la leçon dans le plan (indices 0-based dans contenu_json)
  sequence_index      INTEGER     NOT NULL CHECK (sequence_index >= 0),
  lecon_index         INTEGER     NOT NULL CHECK (lecon_index >= 0),

  -- Référence stable dénormalisée : "packId:seqIdx:leconIdx"
  lesson_ref          TEXT,

  -- Type d'événement — liste blanche V5
  event_type          TEXT        NOT NULL CHECK (event_type IN (
    'lesson_taught',
    'lesson_taught_cancelled'
  )),

  -- Données de l'événement
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  note                TEXT        CHECK (note IS NULL OR length(note) <= 2000),

  -- Métadonnées extensibles (réservé V6+)
  metadata_json       JSONB       NOT NULL DEFAULT '{}'::jsonb,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Index de performance ──────────────────────────────────────────────────

-- Requêtes par enseignant (Mon Année global)
CREATE INDEX IF NOT EXISTS idx_te_enseignant
  ON teaching_events(enseignant_id);

-- Requêtes par classe (dashboard classe)
CREATE INDEX IF NOT EXISTS idx_te_classe
  ON teaching_events(classe_id);

-- Requête principale : charger tous les events d'un pack (batch fetch)
CREATE INDEX IF NOT EXISTS idx_te_pack
  ON teaching_events(teaching_pack_id);

-- Requête par programme annuel
CREATE INDEX IF NOT EXISTS idx_te_programme
  ON teaching_events(programme_annuel_id)
  WHERE programme_annuel_id IS NOT NULL;

-- Index composite : pack + leçon (résolution individuelle)
CREATE INDEX IF NOT EXISTS idx_te_pack_lesson
  ON teaching_events(teaching_pack_id, sequence_index, lecon_index);

-- Index chronologique par pack
CREATE INDEX IF NOT EXISTS idx_te_pack_time
  ON teaching_events(teaching_pack_id, occurred_at);

-- Index sur event_type (filtre par type)
CREATE INDEX IF NOT EXISTS idx_te_event_type
  ON teaching_events(event_type);

-- ── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE teaching_events ENABLE ROW LEVEL SECURITY;

-- SELECT : l'enseignant voit uniquement ses propres événements
CREATE POLICY te_select ON teaching_events
  FOR SELECT USING (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

-- INSERT : l'enseignant ne peut créer que ses propres événements
CREATE POLICY te_insert ON teaching_events
  FOR INSERT WITH CHECK (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

-- Pas de UPDATE ni DELETE : append-only par architecture
-- L'annulation se fait via lesson_taught_cancelled (nouvel événement).

-- ── Notify PostgREST ─────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

COMMIT;
