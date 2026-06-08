-- KlassIA — Migration 005 : Communauté + dossiers classe + Studio IA index
-- À exécuter dans Supabase Dashboard > SQL Editor

-- ── Dossiers personnalisés dans chaque classe ─────────────────────────────────

CREATE TABLE IF NOT EXISTS dossiers_classe (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id     UUID        REFERENCES classes(id)          ON DELETE CASCADE,
  enseignant_id UUID        REFERENCES utilisateurs(id),
  parent_id     UUID        REFERENCES dossiers_classe(id)  ON DELETE CASCADE,
  nom           TEXT        NOT NULL,
  type          TEXT        DEFAULT 'custom'
    CHECK (type IN (
      'curriculum','programme','sequences',
      'plans','lecons','activites','eleves',
      'ressources','salle_classe','custom'
    )),
  ordre         INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Fichiers dans les dossiers ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fichiers_classe (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id        UUID        REFERENCES dossiers_classe(id) ON DELETE CASCADE,
  classe_id         UUID        REFERENCES classes(id)          ON DELETE CASCADE,
  enseignant_id     UUID        REFERENCES utilisateurs(id),
  nom               TEXT        NOT NULL,
  type_fichier      TEXT,
  url               TEXT,
  storage_path      TEXT,
  taille_bytes      INTEGER,
  -- Lien vers les objets KlassIA
  lecon_id          UUID        REFERENCES lecons(id)           ON DELETE SET NULL,
  activite_id       UUID        REFERENCES activites(id)        ON DELETE SET NULL,
  -- Nourrit le Studio IA
  indexe_studio_ia  BOOLEAN     DEFAULT true,
  classe_cible      TEXT        DEFAULT 'specifique'
    CHECK (classe_cible IN ('specifique','generale')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── Studio IA — index de toutes les ressources ────────────────────────────────

CREATE TABLE IF NOT EXISTS studio_ia_ressources (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id   UUID        REFERENCES utilisateurs(id),
  classe_id       UUID        REFERENCES classes(id)  ON DELETE SET NULL,
  source          TEXT        NOT NULL
    CHECK (source IN (
      'upload_personnel','communaute',
      'curriculum_officiel','plan_lecon',
      'lecon_complete','ressource_generale'
    )),
  type_contenu    TEXT,
  titre           TEXT,
  contenu_texte   TEXT,
  storage_path    TEXT,
  url             TEXT,
  est_general     BOOLEAN     DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Groupes communauté ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS groupes_communaute (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         TEXT        NOT NULL,
  description TEXT,
  matiere     TEXT,
  niveau      TEXT,
  province    TEXT,
  type        TEXT        DEFAULT 'automatique'
    CHECK (type IN ('automatique','manuel')),
  nb_membres  INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Membres des groupes ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS membres_groupes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  groupe_id     UUID        REFERENCES groupes_communaute(id) ON DELETE CASCADE,
  enseignant_id UUID        REFERENCES utilisateurs(id)       ON DELETE CASCADE,
  role          TEXT        DEFAULT 'membre'
    CHECK (role IN ('membre','moderateur','admin')),
  joined_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(groupe_id, enseignant_id)
);

-- ── Messages communauté (chat temps réel) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS messages_communaute (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  groupe_id     UUID        REFERENCES groupes_communaute(id) ON DELETE CASCADE,
  enseignant_id UUID        REFERENCES utilisateurs(id),
  contenu       TEXT,
  type          TEXT        DEFAULT 'texte'
    CHECK (type IN ('texte','fichier','plan_lecon','lecon','ressource')),
  fichier_url   TEXT,
  fichier_nom   TEXT,
  fichier_taille INTEGER,
  lecon_id      UUID        REFERENCES lecons(id)  ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Partages publics communauté ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS partages_communaute (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id       UUID        REFERENCES utilisateurs(id),
  type                TEXT        NOT NULL
    CHECK (type IN (
      'plan_lecon','lecon_complete',
      'ressource','progression','activite'
    )),
  titre               TEXT        NOT NULL,
  description         TEXT,
  matiere             TEXT,
  niveau              TEXT,
  province            TEXT,
  curriculum          TEXT,
  contenu_json        JSONB,
  fichier_url         TEXT,
  nb_telechargements  INTEGER     DEFAULT 0,
  note_moyenne        NUMERIC(3,2) DEFAULT 0,
  est_verifie         BOOLEAN     DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ── Notifications ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id UUID        REFERENCES utilisateurs(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL
    CHECK (type IN (
      'message','partage','telechargement',
      'badge','rappel','lecon_prete'
    )),
  titre         TEXT        NOT NULL,
  contenu       TEXT,
  lien          TEXT,
  est_lue       BOOLEAN     DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE dossiers_classe       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichiers_classe       ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_ia_ressources  ENABLE ROW LEVEL SECURITY;
ALTER TABLE groupes_communaute    ENABLE ROW LEVEL SECURITY;
ALTER TABLE membres_groupes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_communaute   ENABLE ROW LEVEL SECURITY;
ALTER TABLE partages_communaute   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;

-- ── Policies ──────────────────────────────────────────────────────────────────

CREATE POLICY "user_own_dossiers" ON dossiers_classe FOR ALL
  USING  (enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid()))
  WITH CHECK (enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid()));

CREATE POLICY "user_own_fichiers" ON fichiers_classe FOR ALL
  USING  (enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid()))
  WITH CHECK (enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid()));

CREATE POLICY "user_own_studio" ON studio_ia_ressources FOR ALL
  USING  (enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid()))
  WITH CHECK (enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid()));

CREATE POLICY "groupes_public_read" ON groupes_communaute
  FOR SELECT USING (true);

CREATE POLICY "membres_own" ON membres_groupes FOR ALL
  USING (enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid()));

CREATE POLICY "messages_groupe_members" ON messages_communaute
  FOR SELECT USING (
    groupe_id IN (
      SELECT groupe_id FROM membres_groupes
      WHERE enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "messages_insert_members" ON messages_communaute
  FOR INSERT WITH CHECK (
    groupe_id IN (
      SELECT groupe_id FROM membres_groupes
      WHERE enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "partages_public_read" ON partages_communaute
  FOR SELECT USING (true);

CREATE POLICY "partages_own_insert" ON partages_communaute
  FOR INSERT WITH CHECK (
    enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  );

CREATE POLICY "notifications_own" ON notifications FOR ALL
  USING (enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid()));
