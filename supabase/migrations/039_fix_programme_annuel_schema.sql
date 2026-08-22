-- ============================================================
-- Migration 039 — Réconciliation contrat DB programme_annuel
-- SPIE-P0.2 : Correction du schéma divergent
-- ============================================================
-- Contexte : la table programme_annuel en production a été créée
-- depuis un script différent de schema.sql. Elle possède déjà les
-- colonnes produites par les migrations 036 et 037 mais elle manque
-- titre, nb_semaines et contenu_json, que tout le pipeline SPIE
-- utilise. Cette migration les ajoute de manière idempotente.
-- ============================================================

ALTER TABLE programme_annuel
  ADD COLUMN IF NOT EXISTS titre         TEXT,
  ADD COLUMN IF NOT EXISTS nb_semaines   INTEGER DEFAULT 36,
  ADD COLUMN IF NOT EXISTS contenu_json  JSONB   DEFAULT '{}';

-- Réaffirmer les GRANTs (les nouvelles colonnes en héritent, mais
-- expliciter protège contre les politiques futures)
GRANT SELECT, INSERT, UPDATE, DELETE ON programme_annuel TO authenticated;
