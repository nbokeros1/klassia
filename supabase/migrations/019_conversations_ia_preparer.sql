-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 019 — Conversations IA · Préparer (arborescence Classe → Type)
-- La table conversations_ia a été créée en 011 (assistant vocal).
-- Cette migration ajoute les colonnes nécessaires à l'arborescence
-- Classe → Type de contenu → Conversations individuelles.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Colonnes manquantes ────────────────────────────────────────────────

ALTER TABLE conversations_ia
  ADD COLUMN IF NOT EXISTS type_contenu       TEXT,
  ADD COLUMN IF NOT EXISTS fichier_dossier_id UUID
    REFERENCES fichiers_dossier(id) ON DELETE SET NULL;

-- Titre par défaut pour les lignes existantes sans titre
UPDATE conversations_ia
  SET titre = 'Conversation sans titre'
  WHERE titre IS NULL;

-- ── 2. Indexes pour l'arborescence ───────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_conversations_ia_enseignant
  ON conversations_ia(enseignant_id);

CREATE INDEX IF NOT EXISTS idx_conversations_ia_classe_type
  ON conversations_ia(classe_id, type_contenu);

CREATE INDEX IF NOT EXISTS idx_conversations_ia_updated
  ON conversations_ia(enseignant_id, updated_at DESC);

-- ── 3. Trigger updated_at automatique ────────────────────────────────────

CREATE OR REPLACE FUNCTION update_conversations_ia_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_conversations_ia ON conversations_ia;
CREATE TRIGGER trg_update_conversations_ia
  BEFORE UPDATE ON conversations_ia
  FOR EACH ROW
  EXECUTE FUNCTION update_conversations_ia_timestamp();
