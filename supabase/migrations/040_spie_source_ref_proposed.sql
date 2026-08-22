-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 040 — SPIE : source_ref pour upsert idempotent (PROPOSÉE)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- STATUT : ⚠ PROPOSÉE — NE PAS EXÉCUTER avant validation Product Owner
--
-- CONTEXTE (MON-ANNEE-V2.1A — Section 19)
-- ─────────────────────────────────────────────────────────────────────────
-- L'implémentation actuelle de la liaison arborescence (class-folder-binding.ts)
-- utilise un pattern read-then-write :
--   1. SELECT existing entries WHERE teaching_pack_id = packId
--   2. Diff avec les entrées souhaitées (clé composite naturelle)
--   3. INSERT uniquement les entrées absentes
--   4. UPDATE dossier_id uniquement si l'entrée est dans le mauvais dossier
--
-- Ce pattern est correct et idempotent en usage séquentiel (un seul build
-- en cours à la fois par classe). Il garantit zéro doublon dans l'usage normal.
--
-- LIMITATION : il n'est PAS atomique. En cas de concurrence (deux appels Build
-- simultanés pour la même classe), un race condition pourrait produire des doublons.
-- La contrainte unique source_ref est nécessaire pour une garantie atomique.
--
-- Cette migration ajoute une colonne source_ref TEXT avec un index unique partiel,
-- ce qui permettrait de passer à un vrai INSERT ... ON CONFLICT DO UPDATE.
--
-- BÉNÉFICE APRÈS MIGRATION
-- ─────────────────────────────────────────────────────────────────────────
-- Avant  : SELECT (N lignes) → diff → INSERT (M lignes)           [2 queries]
-- Après  : upsert({ onConflict: 'source_ref' })                   [1 query]
--
-- CONVENTION source_ref
-- ─────────────────────────────────────────────────────────────────────────
-- Les entrées système SPIE utilisent ces préfixes :
--   spie:curriculum:{packId}
--   spie:syllabus:{packId}
--   spie:plan_annuel:{packId}
--   spie:sequence:{packId}:{seqNum}
--   spie:plan_lecon:{packId}:{seqNum}:{leconNum}
--   spie:lecon_complete:{packId}:{seqNum}:{leconNum}
--
-- Les entrées utilisateur ne remplissent jamais source_ref → NULL → hors index.
--
-- ── MIGRATION ─────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE fichiers_dossier
  ADD COLUMN IF NOT EXISTS source_ref TEXT;

-- Index unique partiel : actif uniquement quand source_ref IS NOT NULL
-- → zéro impact sur les entrées utilisateur (source_ref toujours NULL pour eux)
CREATE UNIQUE INDEX IF NOT EXISTS idx_fichiers_dossier_source_ref
  ON fichiers_dossier(source_ref)
  WHERE source_ref IS NOT NULL;

-- ── Backfill (facultatif après approbation PO) ────────────────────────────
-- Remplir source_ref sur les entrées SPIE déjà existantes en production.
-- À ne décommenter qu'après validation du format de source_ref.
--
-- UPDATE fichiers_dossier
-- SET source_ref = CONCAT(
--   'spie:',
--   CASE
--     WHEN 'spie:curriculum'    = ANY(tags) THEN CONCAT('curriculum:',    teaching_pack_id)
--     WHEN 'spie:syllabus'      = ANY(tags) THEN CONCAT('syllabus:',      teaching_pack_id)
--     WHEN 'spie:plan_annuel'   = ANY(tags) THEN CONCAT('plan_annuel:',   teaching_pack_id)
--     WHEN 'spie:sequence'      = ANY(tags) THEN CONCAT('sequence:',      teaching_pack_id, ':', sequence_index)
--     WHEN 'spie:plan_lecon'    = ANY(tags) THEN CONCAT('plan_lecon:',    teaching_pack_id, ':', sequence_index, ':', lecon_index)
--     WHEN 'spie:lecon_complete'= ANY(tags) THEN CONCAT('lecon_complete:', teaching_pack_id, ':', sequence_index, ':', lecon_index)
--     ELSE NULL
--   END
-- )
-- WHERE teaching_pack_id IS NOT NULL
--   AND 'spie:system' = ANY(tags)
--   AND source_ref IS NULL;

COMMIT;
