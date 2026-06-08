-- KlassIA+ — Migration 007 : Admin · Outils · Onboarding v2
-- À exécuter dans Supabase Dashboard > SQL Editor

-- ── Colonnes additionnelles sur utilisateurs ───────────────────────────────────

ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS is_admin               BOOLEAN   DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_etape       INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_complete_v2 BOOLEAN   DEFAULT false,
  ADD COLUMN IF NOT EXISTS gabarit_lecon_url      TEXT,
  ADD COLUMN IF NOT EXISTS gabarit_lecon_analyse  TEXT,
  ADD COLUMN IF NOT EXISTS menus_debloque         TEXT[]    DEFAULT ARRAY['accueil','classes','preparer','studio'],
  ADD COLUMN IF NOT EXISTS forfait                TEXT      DEFAULT 'gratuit'
    CHECK (forfait IN ('gratuit','pro','pro_plus','institution'));

-- Mettre admin sur le compte principal
UPDATE utilisateurs
  SET is_admin = true
  WHERE email = 'enwaha22@gmail.com';

-- ── Favoris enseignant ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS favoris_enseignant (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id UUID        REFERENCES utilisateurs(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL
    CHECK (type IN ('lecon','plan','dossier','classe','activite','ressource')),
  reference_id  UUID        NOT NULL,
  titre         TEXT        NOT NULL,
  icone         TEXT,
  url           TEXT,
  ordre         INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Tâches / To-Do enseignant ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS taches_enseignant (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id UUID        REFERENCES utilisateurs(id) ON DELETE CASCADE,
  classe_id     UUID        REFERENCES classes(id)      ON DELETE SET NULL,
  lecon_id      UUID        REFERENCES lecons(id)       ON DELETE SET NULL,
  titre         TEXT        NOT NULL,
  type          TEXT        DEFAULT 'manuelle'
    CHECK (type IN (
      'manuelle','imprimer','corriger',
      'contacter_parent','valider_plan',
      'preparer_lecon','rappel'
    )),
  date_echeance DATE,
  est_complete  BOOLEAN     DEFAULT false,
  auto_generee  BOOLEAN     DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Sessions outils ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions_outils (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id UUID        REFERENCES utilisateurs(id),
  classe_id     UUID        REFERENCES classes(id)  ON DELETE SET NULL,
  lecon_id      UUID        REFERENCES lecons(id)   ON DELETE SET NULL,
  type_outil    TEXT        NOT NULL
    CHECK (type_outil IN ('timer','sondage','quiz','tableau','tbi')),
  statut        TEXT        DEFAULT 'actif'
    CHECK (statut IN ('actif','pause','termine')),
  config_json   JSONB       DEFAULT '{}',
  started_at    TIMESTAMPTZ DEFAULT now(),
  ended_at      TIMESTAMPTZ
);

-- ── Statistiques plateforme (admin) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stats_plateforme (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  date                     DATE          NOT NULL UNIQUE,
  nb_inscriptions          INTEGER       DEFAULT 0,
  nb_connexions            INTEGER       DEFAULT 0,
  nb_generations_ia        INTEGER       DEFAULT 0,
  cout_api_usd             NUMERIC(10,4) DEFAULT 0,
  nb_lecons_generees       INTEGER       DEFAULT 0,
  nb_quiz_lances           INTEGER       DEFAULT 0,
  nb_messages_communaute   INTEGER       DEFAULT 0,
  nb_conversions_pro       INTEGER       DEFAULT 0,
  nb_conversions_proplus   INTEGER       DEFAULT 0,
  mrr_usd                  NUMERIC(10,2) DEFAULT 0,
  created_at               TIMESTAMPTZ   DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE favoris_enseignant  ENABLE ROW LEVEL SECURITY;
ALTER TABLE taches_enseignant   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions_outils     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats_plateforme    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_favoris" ON favoris_enseignant FOR ALL
  USING (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ))
  WITH CHECK (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

CREATE POLICY "user_own_taches" ON taches_enseignant FOR ALL
  USING (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ))
  WITH CHECK (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

CREATE POLICY "user_own_sessions_outils" ON sessions_outils FOR ALL
  USING (enseignant_id IN (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

CREATE POLICY "admin_only_stats" ON stats_plateforme FOR ALL
  USING (EXISTS (
    SELECT 1 FROM utilisateurs
    WHERE user_id = auth.uid() AND is_admin = true
  ));
