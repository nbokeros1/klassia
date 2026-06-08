-- KlassIA — Migration 004 : restructuration classe (élèves, activités, rappels)
-- À exécuter dans Supabase Dashboard > SQL Editor

-- ── Profils élèves ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eleves (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id         UUID        REFERENCES classes(id)      ON DELETE CASCADE,
  enseignant_id     UUID        REFERENCES utilisateurs(id),
  prenom            TEXT        NOT NULL,
  nom               TEXT        NOT NULL,
  profil_type       TEXT        DEFAULT 'standard'
    CHECK (profil_type IN ('standard','difficulte','avance','pei','autre')),
  besoins           TEXT[],
  notes_enseignant  TEXT,
  contact_parent    TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ── Activités de la classe ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activites (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id           UUID        REFERENCES classes(id)    ON DELETE CASCADE,
  lecon_id            UUID        REFERENCES lecons(id)     ON DELETE SET NULL,
  enseignant_id       UUID        REFERENCES utilisateurs(id),
  titre               TEXT        NOT NULL,
  type                TEXT        DEFAULT 'formative'
    CHECK (type IN (
      'formative','sommative','groupe',
      'quiz','nuage_mots','devoir','autre'
    )),
  contenu_json        JSONB       DEFAULT '{}',
  -- Versions différenciées
  version_normale     TEXT,
  version_difficulte  TEXT,
  version_avance      TEXT,
  version_pei         TEXT,
  -- Lien quiz live
  quiz_id             UUID        REFERENCES quiz(id)       ON DELETE SET NULL,
  diffuse_quiz_live   BOOLEAN     DEFAULT false,
  statut              TEXT        DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon','validee','diffusee','archivee')),
  date_prevue         DATE,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ── Rappels et événements de la classe ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS rappels_classe (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id     UUID        REFERENCES classes(id)    ON DELETE CASCADE,
  enseignant_id UUID        REFERENCES utilisateurs(id),
  eleve_id      UUID        REFERENCES eleves(id)     ON DELETE SET NULL,
  titre         TEXT        NOT NULL,
  description   TEXT,
  type          TEXT        DEFAULT 'note'
    CHECK (type IN ('note','eleve','evaluation','echeance','evenement')),
  date_rappel   DATE,
  est_complete  BOOLEAN     DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE eleves         ENABLE ROW LEVEL SECURITY;
ALTER TABLE activites      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rappels_classe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_eleves" ON eleves FOR ALL
  USING  (enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid()))
  WITH CHECK (enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid()));

CREATE POLICY "user_own_activites" ON activites FOR ALL
  USING  (enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid()))
  WITH CHECK (enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid()));

CREATE POLICY "user_own_rappels" ON rappels_classe FOR ALL
  USING  (enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid()))
  WITH CHECK (enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid()));

-- ── Colonnes manquantes sur lecons ────────────────────────────────────────────

ALTER TABLE lecons
  ADD COLUMN IF NOT EXISTS sequence_id          UUID REFERENCES plans_sequence(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_differenciee TEXT,
  ADD COLUMN IF NOT EXISTS plan_lecon_id        UUID REFERENCES lecons(id)         ON DELETE SET NULL;
