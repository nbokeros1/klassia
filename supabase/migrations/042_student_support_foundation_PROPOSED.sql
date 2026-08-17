-- ─── Migration 042 — PROPOSED (ne pas exécuter sur la DB distante) ────────────
-- ScorgIA V7.1 — Student Support Foundation
-- Statut : PROPOSÉE — examen PO requis avant exécution
--
-- DÉCISION D'ARCHITECTURE CLÉS :
--   - lesson_plans_v7 REJETÉE — risque de double source de vérité avec lecons.contenu_json
--     (voir docs/Architecture/V7_1_DATABASE_REVIEW.md)
--   - student_support_plans ACCEPTÉE avec révisions majeures
--   - eleves.profil_type (migration 004) : pseudo-diagnostique — déprécié silencieusement
--     (ne pas modifier la colonne existante — rétrocompatibilité)
--   - Pseudonymisation à la couche application (src/lib/pedagogy/privacy/student-ai-context.ts)
--     et non en base de données
--
-- RÈGLES RLS CRITIQUES :
--   enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
--   JAMAIS : enseignant_id = auth.uid()
--   JAMAIS : REFERENCES profiles(id)  — la table profiles n'existe pas
-- ─────────────────────────────────────────────────────────────────────────────

-- ════════════════════════════════════════════════════════════════════════════
-- STUDENT SUPPORT PLANS (V7.1)
-- Remplace et étend student_support_plans_v7 proposée dans une version
-- précédente — FK corrigées, RLS corrigées, structure alignée sur types.ts
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS student_support_plans (
  -- Identification
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id                 UUID NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  classe_id                UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  enseignant_id            UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  annee_scolaire           TEXT NOT NULL,   -- ex. "2026-2027"

  -- Statut du plan
  statut                   TEXT NOT NULL DEFAULT 'brouillon'
                           CHECK (statut IN ('brouillon', 'actif', 'en_revue', 'archive')),

  -- Dates
  date_creation            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_revision            TIMESTAMPTZ,     -- prochaine révision prévue
  date_archive             TIMESTAMPTZ,

  -- Équipe (rôles uniquement, pas de noms)
  equipe_roles             TEXT[],          -- ex. ['enseignant', 'orthopédagogue']

  -- ── Catégorie B — Profil pédagogique ─────────────────────────────────────
  -- JSONB — structure : StudentPedagogicalProfile
  -- Ne contient pas de diagnostics — seulement des observations pédagogiques
  profil_pedagogique       JSONB,

  -- ── Catégorie C — Données de soutien ─────────────────────────────────────
  -- JSONB — structure : StudentSupportData
  -- L'IA ne peut jamais créer ces données
  support_data             JSONB,

  -- ── Baseline ─────────────────────────────────────────────────────────────
  baseline                 TEXT,
  sources_baseline         TEXT[],

  -- ── Objectifs mesurables ─────────────────────────────────────────────────
  -- JSONB — structure : MeasurableGoal[]
  objectifs                JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- ── Interventions ─────────────────────────────────────────────────────────
  -- JSONB — structure : Intervention[]
  -- Chaque intervention lie objectif_id + besoin_id
  interventions            JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- ── Révisions périodiques ─────────────────────────────────────────────────
  -- JSONB — structure : PlanReviewEntry[]
  review_entries           JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- ── Catégorie E — Suggestions IA (TOUJOURS séparées) ────────────────────
  -- JSONB — structure : AISuggestion[]
  -- Statut : pending / accepted / rejected / modified
  -- L'enseignant doit confirmer avant application
  ai_suggestions           JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- ── Confidentialité ───────────────────────────────────────────────────────
  niveau_confidentialite   TEXT NOT NULL DEFAULT 'enseignant'
                           CHECK (niveau_confidentialite IN ('enseignant', 'equipe_ecole', 'direction')),

  -- ── Audit trail ───────────────────────────────────────────────────────────
  -- JSONB — structure : PlanChangeEntry[]
  -- Enregistre toutes les modifications : acteur (TEACHER/SYSTEM/AI/AUTHORIZED_STAFF),
  -- action (created/updated/reviewed/ai_suggested/confirmed/rejected),
  -- champ, valeur avant, valeur après
  changes_log              JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Métadonnées
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Index critiques ───────────────────────────────────────────────────────

-- Accès par élève (le plus fréquent)
CREATE INDEX IF NOT EXISTS idx_student_support_plans_eleve_id
  ON student_support_plans(eleve_id);

-- Accès par classe (pour l'agrégation collective)
CREATE INDEX IF NOT EXISTS idx_student_support_plans_classe_id
  ON student_support_plans(classe_id);

-- Accès par enseignant (liste des plans)
CREATE INDEX IF NOT EXISTS idx_student_support_plans_enseignant_id
  ON student_support_plans(enseignant_id);

-- Plans actifs seulement (requête la plus fréquente en production)
CREATE INDEX IF NOT EXISTS idx_student_support_plans_statut
  ON student_support_plans(statut)
  WHERE statut = 'actif';

-- Année scolaire (pour les archives)
CREATE INDEX IF NOT EXISTS idx_student_support_plans_annee
  ON student_support_plans(annee_scolaire);

-- ── Trigger updated_at ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_student_support_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_student_support_plans_updated_at ON student_support_plans;
CREATE TRIGGER trg_student_support_plans_updated_at
  BEFORE UPDATE ON student_support_plans
  FOR EACH ROW EXECUTE FUNCTION update_student_support_plans_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- Pattern canonique : enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
-- JAMAIS : enseignant_id = auth.uid() (auth.uid() ≠ utilisateurs.id)
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE student_support_plans ENABLE ROW LEVEL SECURITY;

-- Un enseignant voit uniquement ses propres plans
CREATE POLICY "enseignant_select_own_plans"
  ON student_support_plans
  FOR SELECT
  TO authenticated
  USING (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

-- Un enseignant peut créer un plan uniquement pour lui-même
CREATE POLICY "enseignant_insert_own_plans"
  ON student_support_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

-- Un enseignant peut modifier uniquement ses propres plans
CREATE POLICY "enseignant_update_own_plans"
  ON student_support_plans
  FOR UPDATE
  TO authenticated
  USING (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    enseignant_id IN (
      SELECT id FROM utilisateurs WHERE user_id = auth.uid()
    )
  );

-- Archivage seulement — pas de suppression physique des plans de soutien
-- (conformité FOIP : garder la traçabilité)
-- DELETE non autorisé.

-- ════════════════════════════════════════════════════════════════════════════
-- DÉCISION : lesson_plans_v7 — REJETÉE
-- ════════════════════════════════════════════════════════════════════════════
--
-- RAISON DU REJET :
--   La table lesson_plans_v7 créerait une double source de vérité avec :
--     - lecons.contenu_json (contenu structuré existant)
--     - fichiers_dossier (fichiers exportés liés aux leçons)
--   Voir : docs/Architecture/V7_1_DATABASE_REVIEW.md — section DECISION_REJET
--
-- ALTERNATIVE :
--   En V7.2, enrichir lecons.contenu_json avec les champs V7.0 (LessonPlanV7)
--   et ajouter une colonne lecons.quality_score JSONB pour le rapport qualité.
--   Cela évite la migration destructive et maintient une seule source de vérité.
--
-- NE PAS CRÉER lesson_plans_v7.

-- ════════════════════════════════════════════════════════════════════════════
-- NOTE : eleves.profil_type (migration 004)
-- ════════════════════════════════════════════════════════════════════════════
--
-- La colonne eleves.profil_type contient des valeurs pseudo-diagnostiques :
--   ('standard','difficulte','avance','pei','autre')
-- Ces labels ne correspondent pas aux standards pédagogiques V7.1.
--
-- DÉCISION V7.1 :
--   Ne pas modifier la colonne existante (rétrocompatibilité des requêtes actuelles).
--   La colonne est DÉPRÉCIÉE SILENCIEUSEMENT — ne jamais la lire dans le nouveau code.
--   La migration vers profil_pedagogique JSONB se fera progressivement en V7.2.
--
-- NE PAS créer de migration ALTER TABLE pour eleves dans cette migration.

-- ════════════════════════════════════════════════════════════════════════════
-- RÉSUMÉ
-- ════════════════════════════════════════════════════════════════════════════
--
-- Tables créées :
--   - student_support_plans (avec indexes + RLS + trigger updated_at)
--
-- Tables REJETÉES (ne pas créer) :
--   - lesson_plans_v7 (double source de vérité — voir notes ci-dessus)
--
-- Colonnes dépréciées (ne pas modifier) :
--   - eleves.profil_type (V7.2 gérera la migration)
--
-- Avant de fusionner, faire réviser par le PO et l'architecte.
-- ─────────────────────────────────────────────────────────────────────────────
